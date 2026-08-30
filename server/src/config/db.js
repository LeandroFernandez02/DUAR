/**
 * Pool de conexiones a PostgreSQL.
 *
 * Único punto de acceso a la base: los Modelos lo importan de acá y nadie más
 * abre conexiones por su cuenta. Eso permite, más adelante, envolver todo en
 * transacciones o cambiar de motor sin tocar los Controladores.
 */
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

/**
 * Dos formas de configurar la conexión, en este orden de prioridad:
 *
 *  1. `DATABASE_URL` — una sola cadena. Es el formato que entregan Supabase y
 *     Vercel, y el único práctico en un deploy (la plataforma la inyecta como
 *     variable de entorno).
 *
 *     Usar el host del POOLER (`...pooler.supabase.com`, usuario
 *     `postgres.<project-ref>`), no el host directo (`db.<ref>.supabase.co`).
 *     El directo es IPv6-only y, medido, algunos ISP argentinos no lo rutean
 *     bien hacia sa-east-1 (conecta pero nunca responde — "connection
 *     timeout"). El pooler resuelve IPv4 y usa una red distinta (Supavisor).
 *  2. `PGHOST`/`PGPORT`/... — variables sueltas. Se mantiene para no romper el
 *     entorno local contra `duar-test` en la PC.
 *
 * SSL: Supabase sólo acepta conexiones cifradas. `rejectUnauthorized: false`
 * porque la cadena de certificados de Supabase no viene en el store de Node;
 * el tráfico igual va cifrado. En local (sin DATABASE_URL) se deja SSL apagado,
 * que es como escucha PostgreSQL en la máquina.
 */
const usaCadena = Boolean(process.env.DATABASE_URL);

/**
 * ¿Corremos como función serverless en Vercel? La plataforma define VERCEL=1.
 * Importa para el tamaño del pool: en un servidor de vida larga hay UN pool para
 * todo el tráfico, pero en serverless cada instancia levanta el suyo, y Vercel
 * puede tener muchas instancias vivas a la vez. Un `max` grande ahí multiplica
 * conexiones y agota el límite de PostgreSQL.
 *
 * En Vercel hay que apuntar `DATABASE_URL` al **Transaction pooler** de Supabase
 * (puerto 6543), no al Session pooler (5432): el de transacción devuelve la
 * conexión al pool apenas termina cada transacción, que es justo el patrón de
 * una función que se invoca y muere. `withTransaction` (BEGIN/COMMIT sobre un
 * cliente dedicado) funciona igual en ese modo.
 */
const esServerless = Boolean(process.env.VERCEL);

export const pool = new Pool(
  usaCadena
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: Number(process.env.PGPOOL_MAX ?? (esServerless ? 2 : 10)),
        // Abrir una conexión nueva contra la nube es CARO: TCP + handshake TLS +
        // autenticación, varias idas y vueltas. Medido, la primera request que
        // estrenaba conexiones tardaba ~2,7 s contra ~0,24 s de las siguientes.
        // Por eso se las mantiene vivas en vez de reciclarlas cada 30 s.
        idleTimeoutMillis: 300_000,   // 5 min: sobreviven a los ratos de inactividad
        keepAlive: true,              // evita que un NAT/firewall corte la conexión ociosa
        connectionTimeoutMillis: 15_000,
      }
    : {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT),
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
      }
);

/**
 * Atajo para consultas sueltas.
 * @param {string} text  SQL parametrizado ($1, $2…) — NUNCA concatenar valores.
 * @param {any[]} params
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Ejecuta varias operaciones dentro de UNA transacción.
 * Necesario para los CU que exigen atomicidad (CU-25 disolución, CU-26 extracción).
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Verifica que la base responda; se llama al arrancar el servidor.
 * Devuelve también el host: con dos entornos posibles (local y Supabase) el
 * nombre de la base no alcanza para saber contra cuál se está trabajando —
 * en Supabase siempre se llama `postgres`.
 */
/**
 * Abre y deja listas unas conexiones al arrancar, para que el primer usuario que
 * entre no pague el costo del handshake. Se llama al levantar el servidor y no
 * corta el arranque si falla: sin esto el sistema anda igual, sólo más lento la
 * primera vez.
 */
export async function calentarPool(cantidad = 3) {
  const clientes = await Promise.all(
    Array.from({ length: cantidad }, () => pool.connect().catch(() => null))
  );
  clientes.forEach(c => c?.release());
  return clientes.filter(Boolean).length;
}

/**
 * Igual que `verificarConexion` pero reintentando. Contra una base en la nube el
 * primer intento falla a veces por timeout de handshake (medido: pasa en el
 * arranque) y sería un error espurio hacer caer el servidor por eso. Espera
 * incremental entre intentos para no golpear una base que todavía no despertó.
 */
export async function verificarConexionConReintentos(intentos = 4) {
  let ultimoError;
  for (let i = 1; i <= intentos; i++) {
    try {
      return await verificarConexion();
    } catch (err) {
      ultimoError = err;
      if (i < intentos) {
        console.warn(`Conexión a la base falló (intento ${i}/${intentos}): ${err.message}. Reintentando…`);
        await new Promise(r => setTimeout(r, i * 1000));
      }
    }
  }
  throw ultimoError;
}

export async function verificarConexion() {
  const { rows } = await pool.query('SELECT current_database() AS db, version() AS v');
  const host = usaCadena
    ? new URL(process.env.DATABASE_URL).hostname
    : process.env.PGHOST;
  return { ...rows[0], host };
}
