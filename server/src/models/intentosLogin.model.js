/**
 * MODELO · Intentos de login fallidos (02/10, migración 017)
 *
 * Frena la prueba de contraseñas: 5 fallos en 15 minutos sobre un mismo correo
 * lo bloquean 15 minutos, y 30 fallos desde una misma IP bloquean esa IP. Se
 * cuentan también los correos inexistentes (misma respuesta: no se revela qué
 * cuentas existen). En una tabla y no en memoria porque en Vercel cada pedido
 * puede caer en una instancia distinta.
 */
import { query } from '../config/db.js';

export const MAX_POR_CORREO = 5;
export const MAX_POR_IP = 30;
export const VENTANA_MIN = 15;
export const BLOQUEO_MIN = 15;

const claves = (correo, ip) => [
  { clave: `email:${correo}`, max: MAX_POR_CORREO },
  ...(ip ? [{ clave: `ip:${ip}`, max: MAX_POR_IP }] : []),
];

/** Segundos que faltan para que se levante el bloqueo del correo o de la IP (0 = no está bloqueado). */
export async function segundosBloqueado(correo, ip) {
  const { rows } = await query(
    `SELECT COALESCE(CEIL(MAX(EXTRACT(EPOCH FROM (bloqueado_hasta - now())))), 0)::int AS segundos
       FROM intentos_login
      WHERE clave = ANY($1::text[]) AND bloqueado_hasta > now()`,
    [claves(correo, ip).map(c => c.clave)]
  );
  return rows[0].segundos;
}

/** Anota un fallo y devuelve cuántos segundos quedó bloqueado (0 si todavía no llegó al límite). */
export async function registrarFallo(correo, ip) {
  // Lo vencido se borra acá mismo: la tabla no necesita un proceso que la limpie.
  await query(`DELETE FROM intentos_login WHERE ultimo_intento_en < now() - interval '1 day'`);
  let segundos = 0;
  for (const { clave, max } of claves(correo, ip)) {
    const { rows } = await query(
      `INSERT INTO intentos_login AS i (clave, intentos, ultimo_intento_en, bloqueado_hasta)
            VALUES ($1, 1, now(), CASE WHEN $2::int <= 1 THEN now() + make_interval(mins => $3::int) END)
       ON CONFLICT (clave) DO UPDATE SET
              intentos = CASE WHEN i.ultimo_intento_en < now() - make_interval(mins => $4::int) THEN 1 ELSE i.intentos + 1 END,
              ultimo_intento_en = now(),
              bloqueado_hasta = CASE
                WHEN (CASE WHEN i.ultimo_intento_en < now() - make_interval(mins => $4::int) THEN 1 ELSE i.intentos + 1 END) >= $2::int
                THEN now() + make_interval(mins => $3::int) END
       RETURNING CEIL(GREATEST(EXTRACT(EPOCH FROM (bloqueado_hasta - now())), 0))::int AS segundos`,
      [clave, max, BLOQUEO_MIN, VENTANA_MIN]
    );
    segundos = Math.max(segundos, rows[0].segundos ?? 0);
  }
  return segundos;
}

/** Un login correcto borra el contador de ese correo (el de la IP se va solo con la ventana). */
export async function limpiar(correo) {
  await query(`DELETE FROM intentos_login WHERE clave = $1`, [`email:${correo}`]);
}
