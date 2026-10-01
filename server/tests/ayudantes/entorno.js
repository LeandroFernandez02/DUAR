/**
 * Entorno de las pruebas de API (paso 3 de la auditoría del 30/09).
 *
 * No hay una base aparte (decisión del usuario): las pruebas corren sobre la
 * base compartida, pero SÓLO sobre lo suyo:
 *   · 9 usuarios propios, auto.<nombre>@prueba.duar (7 agentes y 2 coordinadores);
 *   · un operativo propio, "PRUEBAS AUTOMÁTICAS - no tocar".
 *
 * Cada archivo de pruebas arranca con preparar(), que deja ese operativo en un
 * punto de partida conocido usando la propia API (no SQL): disuelve los grupos
 * que hayan quedado de una corrida anterior, vacía el puesto de comando y
 * devuelve a cada agente a Disponible, con su especialidad y su rol de
 * conductor de base.
 *
 * Antes de escribir nada verifica el aislamiento: si en el operativo de pruebas
 * hay alguien que no es de las pruebas (como agente o en el puesto de comando),
 * o un usuario de prueba está en otro operativo, se detiene sin tocar nada.
 *
 * Credenciales: server/.env (TEST_*), que no se sube al repositorio.
 */
import { query, pool } from '../../src/config/db.js';

const API = process.env.TEST_API_URL ?? 'http://localhost:3001/api';
export const TITULO_OPERATIVO = 'PRUEBAS AUTOMÁTICAS - no tocar';
const PATRON_EMAIL = 'auto.%@prueba.duar';
const MOTIVO_REINICIO = 'Reinicio de las pruebas automáticas';

/**
 * Los usuarios de prueba. La institución es global (perfil del usuario); la
 * especialidad y el conductor son tácticos y se fijan en cada preparación.
 *   · alfa, bravo, charlie → del DUAR, rastrillan: pueden liderar uno de rastrillaje.
 *   · delta, eco           → agentes de rastrillaje que no son del DUAR.
 *   · foxtrot              → del DUAR, recurso especial (Dron).
 *   · golf                 → conductor (no rastrilla, entra a cualquier grupo).
 *   · hotel, india         → coordinadores: van al puesto de comando, no al tablero.
 */
export const USUARIOS = [
  { clave: 'alfa',    institucion: 'DUAR',                 especialidad: 'Bombero' },
  { clave: 'bravo',   institucion: 'DUAR',                 especialidad: 'Bombero' },
  { clave: 'charlie', institucion: 'DUAR',                 especialidad: 'Bombero Voluntario' },
  { clave: 'delta',   institucion: 'Bomberos Voluntarios', especialidad: 'Bombero Voluntario' },
  { clave: 'eco',     institucion: 'Policía de Córdoba',   especialidad: 'Policía' },
  { clave: 'foxtrot', institucion: 'DUAR',                 especialidad: 'Dron' },
  { clave: 'golf',    institucion: 'Bomberos Voluntarios', especialidad: 'Bombero', conductor: true },
  { clave: 'hotel',   institucion: 'DUAR',                 rol: 'coordinador' },
  { clave: 'india',   institucion: 'DUAR',                 rol: 'coordinador' },
];
export const AGENTES = USUARIOS.filter(u => !u.rol).map(u => u.clave);

const esperar = ms => new Promise(r => setTimeout(r, ms));
export { esperar };

function requerido(nombre) {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta ${nombre} en server/.env: las pruebas de API no pueden correr.`);
  return v;
}

/** Pedido a la API. Reintenta si el servidor local se reinicia (OneDrive + node --watch). */
export async function api(metodo, ruta, body, token) {
  for (let intento = 0; ; intento++) {
    try {
      const r = await fetch(API + ruta, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const texto = await r.text();
      let json = null;
      try { json = texto ? JSON.parse(texto) : null; } catch { json = texto; }
      return { status: r.status, json };
    } catch (err) {
      if (intento >= 5) throw new Error(`La API no responde en ${API}: ¿está levantado el servidor? (${err.message})`);
      await esperar(1500);
    }
  }
}

async function login(email, password) {
  const r = await api('POST', '/auth/login', { email, password });
  return r.status === 200 ? r.json.token : null;
}

const email = clave => `auto.${clave}@prueba.duar`;
const nombre = clave => clave[0].toUpperCase() + clave.slice(1);

async function catalogos() {
  const { rows: inst } = await query(`SELECT id, nombre FROM cat_instituciones`);
  const { rows: esp } = await query(`SELECT id, nombre, es_recurso_critico FROM cat_especialidades`);
  const { rows: dot } = await query(
    `SELECT d.id FROM cat_dotaciones d JOIN cat_instituciones i ON i.id = d.institucion_id
      WHERE i.es_duar AND d.nombre = 'DUAR Capital (Cuartel Central)'`
  );
  const por = (filas, n) => {
    const f = filas.find(x => x.nombre === n);
    if (!f) throw new Error(`No existe "${n}" en el catálogo.`);
    return f.id;
  };
  return { institucion: n => por(inst, n), especialidad: n => por(esp, n), dotacionDuar: dot[0]?.id ?? null };
}

/** Crea los usuarios de prueba que falten y deja a todos activos, con su rol y su clave. */
async function asegurarUsuarios(admin, cat) {
  const password = requerido('TEST_USUARIOS_PASSWORD');
  const lista = (await api('GET', '/usuarios', undefined, admin)).json.usuarios;
  const usuarios = {};
  for (const [i, u] of USUARIOS.entries()) {
    let fila = lista.find(x => x.email.toLowerCase() === email(u.clave));
    const rol = u.rol ?? 'agente';
    if (!fila) {
      const r = await api('POST', '/usuarios', {
        dni: String(98000001 + i), nombre: nombre(u.clave), apellido: 'Prueba Automatica',
        email: email(u.clave), password, rol,
        institucionId: cat.institucion(u.institucion),
        dotacionId: u.institucion === 'DUAR' ? cat.dotacionDuar : null,
        especialidadId: u.especialidad ? cat.especialidad(u.especialidad) : null,
      }, admin);
      if (r.status !== 201) throw new Error(`No se pudo crear ${email(u.clave)}: ${r.status} ${JSON.stringify(r.json)}`);
      fila = r.json.usuario;
    }
    // Creado por un administrador queda PENDIENTE (sin mail confirmado): lo activa el administrador.
    const cambios = {};
    if (fila.estado !== 'ACTIVO') cambios.estado = 'ACTIVO';
    if (fila.rol.toLowerCase() !== rol) cambios.rol = rol;
    if (Object.keys(cambios).length) {
      const r = await api('PUT', `/usuarios/${fila.id}`, cambios, admin);
      if (r.status !== 200) throw new Error(`No se pudo activar ${email(u.clave)}: ${JSON.stringify(r.json)}`);
    }
    let token = await login(email(u.clave), password);
    if (!token) {
      await api('PUT', `/usuarios/${fila.id}`, { password }, admin);
      token = await login(email(u.clave), password);
    }
    if (!token) throw new Error(`No se pudo iniciar sesión como ${email(u.clave)}.`);
    usuarios[u.clave] = { ...u, uid: fila.id, email: email(u.clave), token };
  }
  return usuarios;
}

async function asegurarOperativo(admin) {
  const { rows } = await query(
    `SELECT id, estado::text AS estado FROM operativos
      WHERE titulo = $1 AND estado NOT IN ('FINALIZADO', 'ELIMINADO')
      ORDER BY creado_en DESC LIMIT 1`,
    [TITULO_OPERATIVO]
  );
  let op = rows[0];
  if (!op) {
    const r = await api('POST', '/operativos', {
      titulo: TITULO_OPERATIVO, localidad: 'Córdoba', fiscalInstruccion: 'Pruebas automatizadas',
      descripcion: 'Operativo de las pruebas automatizadas del sistema (server/tests). No usar.',
      puntoCeroLat: -31.4201, puntoCeroLng: -64.1888, fechaHoraInicio: new Date().toISOString(),
    }, admin);
    if (r.status !== 201) throw new Error(`No se pudo crear el operativo de pruebas: ${JSON.stringify(r.json)}`);
    op = r.json.operativo;
  }
  if (op.estado !== 'ACTIVO') {
    const r = await api('POST', `/operativos/${op.id}/activar`, {}, admin);
    if (r.status !== 200) throw new Error(`No se pudo activar el operativo de pruebas: ${JSON.stringify(r.json)}`);
  }
  return op.id;
}

/** Nada de esto se toca si el operativo o los usuarios de prueba están mezclados con datos reales. */
async function verificarAislamiento(op) {
  const { rows } = await query(
    `SELECT u.email, ao.operativo_id AS op
       FROM agentes_operativo ao JOIN usuarios u ON u.id = ao.usuario_id
      WHERE ao.fecha_egreso IS NULL AND (ao.operativo_id = $1 OR u.email ILIKE $2)`,
    [op, PATRON_EMAIL]
  );
  const ajenos = rows.filter(f => f.op === op && !/^auto\.[a-z]+@prueba\.duar$/i.test(f.email));
  if (ajenos.length) {
    throw new Error(`El operativo "${TITULO_OPERATIVO}" tiene personal que no es de las pruebas `
      + `(${ajenos.map(f => f.email).join(', ')}). No se toca nada.`);
  }
  const fuera = rows.filter(f => f.op !== op);
  if (fuera.length) {
    throw new Error(`Usuarios de prueba activos en otro operativo (${fuera.map(f => f.email).join(', ')}). No se toca nada.`);
  }
  const { rows: mando } = await query(
    `SELECT u.email, p.operativo_id AS op
       FROM presencias_mando p JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.egreso_en IS NULL AND (p.operativo_id = $1 OR u.email ILIKE $2)`,
    [op, PATRON_EMAIL]
  );
  const raros = mando.filter(f => (f.op === op) !== /^auto\.[a-z]+@prueba\.duar$/i.test(f.email));
  if (raros.length) {
    throw new Error(`El puesto de comando de las pruebas está mezclado con datos reales (${raros.map(f => f.email).join(', ')}). No se toca nada.`);
  }
}

/** Vacía el puesto de comando: primero los presentes que no están a cargo, al final el que está a cargo (ya solo). */
async function limpiarMando(admin, op) {
  const { presentes } = (await api('GET', `/operativos/${op}/mando`, undefined, admin)).json;
  const orden = [...presentes.filter(p => !p.aCargo), ...presentes.filter(p => p.aCargo)];
  for (const p of orden) {
    const r = await api('POST', `/operativos/${op}/mando/retiro`, { usuarioId: p.usuarioId, motivo: MOTIVO_REINICIO }, admin);
    if (r.status !== 200) throw new Error(`No se pudo vaciar el puesto de comando: ${JSON.stringify(r.json)}`);
  }
}

/** Saca de la lista de agentes a quien no es agente de las pruebas (un coordinador que una prueba registró como agente). */
async function quitarSobrantes(admin, op, usuarios) {
  const { rows } = await query(
    `SELECT usuario_id FROM agentes_operativo WHERE operativo_id = $1 AND fecha_egreso IS NULL`, [op]);
  const agentes = new Set(AGENTES.map(k => usuarios[k].uid));
  for (const { usuario_id } of rows) {
    if (agentes.has(usuario_id)) continue;
    const r = await api('DELETE', `/operativos/${op}/agentes/${usuario_id}`, undefined, admin);
    if (r.status >= 300) throw new Error(`No se pudo sacar a un agente sobrante: ${JSON.stringify(r.json)}`);
  }
}

/** Disuelve lo que haya quedado de una corrida anterior (los del terreno se corrigen a En espera primero). */
async function limpiarGrupos(admin, op) {
  const grupos = (await api('GET', `/operativos/${op}/grupos`, undefined, admin)).json.grupos;
  for (const g of grupos) {
    if (['DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO'].includes(g.estado)) {
      await api('POST', `/operativos/${op}/grupos/${g.id}/acciones`,
        { accion: 'corregir', estadoDestino: 'EN_ESPERA', motivo: MOTIVO_REINICIO }, admin);
    }
    const r = await api('DELETE', `/operativos/${op}/grupos/${g.id}`, undefined, admin);
    if (r.status !== 204) throw new Error(`No se pudo disolver ${g.nombre}: ${JSON.stringify(r.json)}`);
  }
}

/** Todos los agentes en el operativo, Disponibles, con la especialidad y el conductor de base. */
async function asegurarAgentes(admin, op, usuarios, cat) {
  const { rows } = await query(
    `SELECT usuario_id FROM agentes_operativo WHERE operativo_id = $1 AND fecha_egreso IS NULL`, [op]);
  const presentes = new Set(rows.map(r => r.usuario_id));
  for (const clave of AGENTES) {
    const u = usuarios[clave];
    if (!presentes.has(u.uid)) {
      const r = await api('POST', `/operativos/${op}/agentes`, { usuarioId: u.uid }, admin);
      if (r.status !== 201) throw new Error(`No se pudo sumar a ${u.email}: ${JSON.stringify(r.json)}`);
    }
    const r = await api('PUT', `/operativos/${op}/agentes/${u.uid}`, {
      estado: 'DISPONIBLE', especialidadId: cat.especialidad(u.especialidad), esConductor: !!u.conductor,
    }, admin);
    if (r.status !== 200) throw new Error(`No se pudo reiniciar a ${u.email}: ${JSON.stringify(r.json)}`);
  }
}

/**
 * Deja el entorno listo y devuelve el contexto de las pruebas: tokens, ids y
 * atajos a la API y a la base (la base sólo se LEE para verificar).
 */
export async function preparar() {
  const admin = await login(requerido('TEST_ADMIN_EMAIL'), requerido('TEST_ADMIN_PASSWORD'));
  if (!admin) throw new Error('No se pudo iniciar sesión con TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD.');
  const cat = await catalogos();
  const usuarios = await asegurarUsuarios(admin, cat);
  const op = await asegurarOperativo(admin);
  await verificarAislamiento(op);
  await limpiarGrupos(admin, op);
  await limpiarMando(admin, op);
  await quitarSobrantes(admin, op, usuarios);
  await asegurarAgentes(admin, op, usuarios, cat);

  const ctx = {
    admin, op, usuarios, cat,
    coordinador: usuarios.hotel.token,
    coordinador2: usuarios.india.token,
    /** Estado del puesto de comando del operativo de pruebas. */
    mando: async () => (await api('GET', `/operativos/${op}/mando`, undefined, admin)).json,
    api: (m, ruta, body, token = admin) => api(m, ruta, body, token),
    /** Acción de estado sobre un grupo (como coordinador). */
    accion: (grupoId, body) => api('POST', `/operativos/${op}/grupos/${grupoId}/acciones`, body, admin),
    crearGrupo: (nombreGrupo, lider, clase = 'RASTRILLAJE') =>
      api('POST', `/operativos/${op}/grupos`, { nombre: nombreGrupo, liderId: ctx.agentes[lider].id, clase }, admin),
    mover: (clave, destinoGrupoId) =>
      api('POST', `/operativos/${op}/grupos/mover`, { agenteOperativoId: ctx.agentes[clave].id, destinoGrupoId }, admin),
    disolver: grupoId => api('DELETE', `/operativos/${op}/grupos/${grupoId}`, undefined, admin),
    cu17: (clave, body) => api('PUT', `/operativos/${op}/agentes/${usuarios[clave].uid}`, body, admin),
    /** Estado de cada agente de prueba en el operativo, leído de la base. */
    agentes: {},
    async refrescar() {
      const { rows } = await query(
        `SELECT u.email, ao.id, ao.estado::text AS estado, ao.grupo_id AS "grupoId",
                ao.es_conductor AS "esConductor", ao.estado_actualizado_en AS desde
           FROM agentes_operativo ao JOIN usuarios u ON u.id = ao.usuario_id
          WHERE ao.operativo_id = $1 AND ao.fecha_egreso IS NULL`, [op]);
      ctx.agentes = Object.fromEntries(rows.map(r => [r.email.split('.')[1].split('@')[0], r]));
      return ctx.agentes;
    },
    grupoDb: async id => (await query(
      `SELECT estado::text AS estado, estado_actualizado_en AS desde, lider_id AS "liderId", eliminado_en
         FROM grupos WHERE id = $1`, [id])).rows[0],
    periodosAbiertos: async grupoId => (await query(
      `SELECT count(*)::int AS n FROM agentes_grupo_historial WHERE grupo_id = $1 AND fecha_fin IS NULL`, [grupoId])).rows[0].n,
    ultimoEventoGrupo: async grupoId => (await query(
      `SELECT id, resultado, fuente, estado_nuevo, hora_confiable FROM eventos_estado
        WHERE grupo_id = $1 AND entidad = 'GRUPO' ORDER BY registrado_en DESC LIMIT 1`, [grupoId])).rows[0],
    query,
  };
  await ctx.refrescar();
  return ctx;
}

/** Cierra las conexiones a la base para que el proceso de pruebas termine. */
export async function terminar() {
  await pool.end();
}
