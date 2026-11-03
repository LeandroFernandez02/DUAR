/**
 * MODELO · Puesto de comando (CU-15; 01/10, migración 016; rehecho el 02/11, migración 030)
 *
 * Dos cosas por operativo:
 *   · El TURNO: quiénes están en el puesto de comando y en qué puesto —«Coordinador» u
 *     «Operador Mesa Coordinadora»—, con su ingreso y su egreso. Los dos puestos los
 *     ocupan usuarios con rol coordinador. No son agentes: no tienen estados tácticos.
 *   · El JEFE DE OPERATIVO (02/11): uno por operativo, opcional, con rol «jefe de
 *     operativo». Es omnipresente: no marca ingreso ni egreso y puede ser Jefe de varios
 *     operativos a la vez. Reemplaza al «coordinador a cargo» de la 016 (mando_operativo
 *     ya no se escribe: queda para los informes viejos).
 *
 * Reglas:
 *   · En el turno se registra sólo a COORDINADORES activos, en operativos no cerrados.
 *     Un administrador registra a otros, pero no figura él mismo.
 *   · Un coordinador está en el turno de un solo operativo a la vez (índice único).
 *   · Cualquier gestor registra el ingreso o el egreso de otro; queda quién.
 *   · No puede figurar a la vez como agente (desde el 27/10 en un operativo sólo se da de
 *     alta a cuentas con rol de agente). Al cambiarle el rol, deja el turno.
 *   · Al Jefe lo asigna, lo cambia o lo quita un coordinador, un administrador o un jefe
 *     de operativo (también él mismo). Cada cambio cierra el período anterior.
 *
 * Cada cambio corre en una transacción con la fila del operativo bloqueada.
 */
import { query, withTransaction } from '../config/db.js';
import { ReglaError } from './reglaError.js';

const ADMITE_PRESENCIA = ['INICIADO', 'EN_PLANIFICACION', 'EN_PROCESO'];
const CERRADOS = ['FINALIZADO', 'ELIMINADO'];

/** Puestos del turno (030) y cómo se dicen en la pantalla y el informe. */
export const PUESTOS = { COORDINADOR: 'Coordinador', OPERADOR_MESA: 'Operador Mesa Coordinadora' };
export const ROL_JEFE = 'jefe de operativo';

const nombre = u => `${u.nombre} ${u.apellido}`;

async function bloquearOperativo(client, operativoId) {
  const { rows } = await client.query(
    `SELECT id, titulo, estado::text AS estado FROM operativos WHERE id = $1 FOR UPDATE`, [operativoId]);
  if (!rows[0]) throw new ReglaError(404, 'operativo_no_encontrado', 'El operativo no existe.');
  return rows[0];
}

/** Una sola hora para todo lo que pasa en un mismo cambio (retiro + sucesión quedan pegados). */
async function ahora(client) {
  return (await client.query('SELECT clock_timestamp() AS t')).rows[0].t;
}

async function usuario(client, usuarioId) {
  const { rows } = await client.query(
    `SELECT u.id, u.nombre, u.apellido, u.estado::text AS estado, lower(r.nombre) AS rol
       FROM usuarios u JOIN cat_roles r ON r.id = u.rol_id WHERE u.id = $1`, [usuarioId]);
  return rows[0] ?? null;
}

async function presenciaActiva(client, usuarioId) {
  const { rows } = await client.query(
    `SELECT p.id, p.operativo_id AS "operativoId", o.titulo AS "operativoTitulo"
       FROM presencias_mando p JOIN operativos o ON o.id = p.operativo_id
      WHERE p.usuario_id = $1 AND p.egreso_en IS NULL
      FOR UPDATE OF p`, [usuarioId]);
  return rows[0] ?? null;
}

const cerrarPresencia = (client, presenciaId, t, autorId, motivo) => client.query(
  `UPDATE presencias_mando SET egreso_en = $2, egreso_por = $3, motivo_egreso = $4 WHERE id = $1`,
  [presenciaId, t, autorId, motivo]);

async function jefeActivo(client, operativoId) {
  const { rows } = await client.query(
    `SELECT j.id, j.usuario_id AS "usuarioId", u.nombre, u.apellido FROM jefes_operativo j JOIN usuarios u ON u.id = j.usuario_id
      WHERE j.operativo_id = $1 AND j.hasta IS NULL FOR UPDATE OF j`, [operativoId]);
  return rows[0] ?? null;
}

const cerrarJefe = (client, jefeId, t, autorId, motivo) => client.query(
  `UPDATE jefes_operativo SET hasta = $2, cerrado_por = $3, motivo_fin = $4 WHERE id = $1`,
  [jefeId, t, autorId, motivo]);

/* ── Lectura ───────────────────────────────────────────────────────────── */

/** El Jefe de Operativo, quiénes están en el turno (con su puesto) y los historiales (puesto de comando e Informe). */
export async function estado(operativoId) {
  const [presencias, jefes] = await Promise.all([
    query(
      `SELECT p.id, p.usuario_id AS "usuarioId", u.nombre, u.apellido, p.puesto,
              p.ingreso_en AS "desde", p.egreso_en AS "hasta", p.motivo_egreso AS "motivo",
              p.ingreso_por AS "ingresoPor", ui.nombre || ' ' || ui.apellido AS "ingresoPorNombre",
              ue.nombre || ' ' || ue.apellido AS "egresoPorNombre"
         FROM presencias_mando p
         JOIN usuarios u  ON u.id  = p.usuario_id
         JOIN usuarios ui ON ui.id = p.ingreso_por
         LEFT JOIN usuarios ue ON ue.id = p.egreso_por
        WHERE p.operativo_id = $1
        ORDER BY p.ingreso_en DESC`, [operativoId]),
    query(
      `SELECT j.id, j.usuario_id AS "usuarioId", u.nombre, u.apellido,
              j.desde, j.hasta, j.motivo_fin AS "motivo",
              ua.nombre || ' ' || ua.apellido AS "asignadoPorNombre",
              uc.nombre || ' ' || uc.apellido AS "cerradoPorNombre"
         FROM jefes_operativo j
         JOIN usuarios u  ON u.id  = j.usuario_id
         JOIN usuarios ua ON ua.id = j.asignado_por
         LEFT JOIN usuarios uc ON uc.id = j.cerrado_por
        WHERE j.operativo_id = $1
        ORDER BY j.desde DESC`, [operativoId]),
  ]);
  return {
    jefe: jefes.rows.find(j => !j.hasta) ?? null,
    presentes: presencias.rows.filter(p => !p.hasta).reverse(),
    historialPresencias: presencias.rows,
    historialJefes: jefes.rows,
  };
}

/* ── Cambios (cada uno con su versión "Con(client)" para componer transacciones y probar) ── */

/**
 * Ingreso al turno del puesto de comando, en un puesto («Coordinador» u «Operador Mesa
 * Coordinadora»). Si estaba en el turno de otro operativo, sólo se traslada con
 * `trasladar` (mismo patrón que la Regla de Ubicuidad del agente).
 */
export async function ingresarCon(client, { operativoId, usuarioId, autorId, puesto = 'COORDINADOR', trasladar = false }) {
  if (!Object.hasOwn(PUESTOS, puesto)) {
    throw new ReglaError(400, 'puesto_invalido', 'Elegí el puesto: «Coordinador» u «Operador Mesa Coordinadora».');
  }
  const op = await bloquearOperativo(client, operativoId);
  if (!ADMITE_PRESENCIA.includes(op.estado)) {
    throw new ReglaError(409, 'operativo_cerrado',
      `El operativo está ${op.estado.toLowerCase().replace('_', ' ')}: no se registran presencias.`);
  }
  const u = await usuario(client, usuarioId);
  if (!u) throw new ReglaError(404, 'usuario_no_encontrado', 'Usuario no encontrado.');
  if (u.rol !== 'coordinador') {
    throw new ReglaError(409, 'no_es_coordinador', 'En el turno del puesto de comando se registra sólo a usuarios con rol coordinador.');
  }
  if (u.estado !== 'ACTIVO') {
    throw new ReglaError(409, 'usuario_no_activo', `${nombre(u)} no tiene la cuenta activa.`);
  }
  const { rows: comoAgente } = await client.query(
    `SELECT o.titulo FROM agentes_operativo ao JOIN operativos o ON o.id = ao.operativo_id
      WHERE ao.usuario_id = $1 AND ao.fecha_egreso IS NULL`, [usuarioId]);
  if (comoAgente[0]) {
    throw new ReglaError(409, 'es_agente',
      `${nombre(u)} figura como agente en el operativo "${comoAgente[0].titulo}". `
      + 'Para registrarlo en el puesto de comando, primero hay que sacarlo de la lista de agentes.');
  }

  const previa = await presenciaActiva(client, usuarioId);
  if (previa?.operativoId === operativoId) {
    throw new ReglaError(409, 'ya_presente', `${nombre(u)} ya está en el turno del puesto de comando.`);
  }
  if (previa) {
    if (!trasladar) {
      throw new ReglaError(409, 'presente_en_otro_operativo',
        `${nombre(u)} está en el turno del operativo "${previa.operativoTitulo}". ¿Registrás su egreso allá y su ingreso acá?`,
        { operativoActual: { id: previa.operativoId, titulo: previa.operativoTitulo } });
    }
    await retirarCon(client, {
      operativoId: previa.operativoId, usuarioId, autorId,
      motivo: `Se presentó en el operativo "${op.titulo}"`,
    });
  }

  const t = await ahora(client);
  const { rows } = await client.query(
    `INSERT INTO presencias_mando (operativo_id, usuario_id, ingreso_en, ingreso_por, puesto)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`, [operativoId, usuarioId, t, autorId, puesto]);
  return { presenciaId: rows[0].id };
}

/** Egreso del turno del puesto de comando. */
export async function retirarCon(client, { operativoId, usuarioId, autorId, motivo }) {
  await bloquearOperativo(client, operativoId);
  const { rows } = await client.query(
    `SELECT p.id FROM presencias_mando p
      WHERE p.operativo_id = $1 AND p.usuario_id = $2 AND p.egreso_en IS NULL FOR UPDATE OF p`,
    [operativoId, usuarioId]);
  if (!rows[0]) throw new ReglaError(409, 'no_presente', 'Ese coordinador no está en el turno del puesto de comando de este operativo.');
  await cerrarPresencia(client, rows[0].id, await ahora(client), autorId, motivo);
}

/**
 * Asigna, cambia o quita (usuarioId = null) al Jefe de Operativo. Cierra el período anterior
 * y abre el nuevo con la misma hora. No pide presencia: el Jefe es omnipresente.
 */
export async function asignarJefeCon(client, { operativoId, usuarioId, autorId }) {
  const op = await bloquearOperativo(client, operativoId);
  if (CERRADOS.includes(op.estado)) {
    throw new ReglaError(409, 'operativo_cerrado', `El operativo está ${op.estado.toLowerCase()}: su Jefe ya no se cambia.`);
  }
  let nuevo = null;
  if (usuarioId) {
    nuevo = await usuario(client, usuarioId);
    if (!nuevo) throw new ReglaError(404, 'usuario_no_encontrado', 'Usuario no encontrado.');
    if (nuevo.rol !== ROL_JEFE) {
      throw new ReglaError(409, 'no_es_jefe', `${nombre(nuevo)} no tiene el rol «Jefe de Operativo».`);
    }
    if (nuevo.estado !== 'ACTIVO') throw new ReglaError(409, 'usuario_no_activo', `${nombre(nuevo)} no tiene la cuenta activa.`);
  }
  const actual = await jefeActivo(client, operativoId);
  if (actual && actual.usuarioId === usuarioId) throw new ReglaError(409, 'ya_es_jefe', `${nombre(nuevo)} ya es el Jefe de este operativo.`);
  if (!actual && !usuarioId) throw new ReglaError(409, 'sin_jefe', 'El operativo no tiene Jefe asignado.');

  const t = await ahora(client);
  if (actual) await cerrarJefe(client, actual.id, t, autorId, nuevo ? `Lo reemplaza ${nombre(nuevo)}` : 'Quitado del operativo');
  if (nuevo) {
    await client.query(
      `INSERT INTO jefes_operativo (operativo_id, usuario_id, desde, asignado_por) VALUES ($1, $2, $3, $4)`,
      [operativoId, usuarioId, t, autorId]);
  }
  return { anterior: actual, nuevo };
}

export const ingresar = args => withTransaction(c => ingresarCon(c, args));
export const retirar = args => withTransaction(c => retirarCon(c, args));
export const asignarJefe = args => withTransaction(c => asignarJefeCon(c, args));

/* ── Cierres automáticos (dentro de la transacción de quien los provoca) ── */

/** CU-10: al finalizar el operativo se cierran el turno y el período del Jefe, con esa hora. */
export async function cerrarTodoCon(client, operativoId, autorId, motivo) {
  const t = await ahora(client);
  await client.query(
    `UPDATE presencias_mando SET egreso_en = $2, egreso_por = COALESCE($3, usuario_id), motivo_egreso = $4
      WHERE operativo_id = $1 AND egreso_en IS NULL`, [operativoId, t, autorId, motivo]);
  await client.query(
    `UPDATE jefes_operativo SET hasta = $2, cerrado_por = COALESCE($3, usuario_id), motivo_fin = $4
      WHERE operativo_id = $1 AND hasta IS NULL`, [operativoId, t, autorId, motivo]);
}

/**
 * Cuando se le cambia el rol o se elimina su cuenta (CU-07): deja el turno en el que esté
 * y deja de ser Jefe de los operativos en los que lo sea, sin preguntar nada más.
 */
export async function cerrarPresenciaDeCon(client, usuarioId, autorId, motivo) {
  const t = await ahora(client);
  const previa = await presenciaActiva(client, usuarioId);
  if (previa) await cerrarPresencia(client, previa.id, t, autorId, motivo);
  await client.query(
    `UPDATE jefes_operativo SET hasta = $2, cerrado_por = $3, motivo_fin = $4 WHERE usuario_id = $1 AND hasta IS NULL`,
    [usuarioId, t, autorId, motivo]);
}

/** Operativos (no cerrados) de los que es Jefe: para avisar antes de cambiarle el rol. */
export async function jefaturasDe(usuarioId) {
  const { rows } = await query(
    `SELECT o.id, o.titulo FROM jefes_operativo j JOIN operativos o ON o.id = j.operativo_id
      WHERE j.usuario_id = $1 AND j.hasta IS NULL AND o.estado::text NOT IN ('FINALIZADO', 'ELIMINADO')
      ORDER BY j.desde`, [usuarioId]);
  return rows;
}
