/**
 * MODELO · Ciclo de estados del operativo (decisiones del 24/10)
 *
 *   Nuevo ──entrar al panel──▶ Iniciado ──primer agente──▶ En planificación ──grupo en el terreno──▶ En proceso
 *                                  └────────── pausa manual o 48 h sin actividad ─────────▶ Inactivo ──▶ (el de antes)
 *   Iniciado / En planificación / En proceso / Inactivo ──finalizar (CU-10)──▶ Finalizado
 *
 *  · Los estados «En planificación» y «En proceso» se alcanzan solos; En proceso no vuelve atrás.
 *  · Inactivo es una pausa: manual (con motivo, sólo se reanuda a mano) o automática a las 48 h
 *    sin actividad (se reanuda sola con la próxima actividad). El sistema no tiene procesos
 *    programados: el Inactivo automático se revisa cuando alguien consulta el operativo o la lista.
 *  · Cada cambio queda en logs_auditoria con su motivo (es lo que cuenta la cronología del informe).
 *    Los cambios automáticos NO tocan `actualizado_en`: no cuentan como actividad.
 *
 * Todas las funciones aceptan un `client` de transacción (si los cambios vienen de otra operación) o
 * usan el pool.
 */
import { query } from '../config/db.js';
import * as Auditoria from './auditoria.model.js';

// «Iniciado» se llamaba 'ACTIVO' hasta la migración 027 (24/10), que renombró el valor del ENUM.
export const INICIADO = 'INICIADO';
export const EN_CURSO = [INICIADO, 'EN_PLANIFICACION', 'EN_PROCESO'];
export const HORAS_SIN_ACTIVIDAD = 48;
/** Un grupo en alguno de estos estados está trabajando fuera del puesto de comando. */
export const GRUPO_EN_TERRENO = ['DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO'];

const ejecutar = (client) => (client ? client.query.bind(client) : query);

/**
 * Cambia el estado si el actual está entre `desde`, y lo deja auditado. Devuelve
 * `{ previo, nuevo }` o null si no correspondía (otro ya lo cambió, o no estaba en `desde`).
 */
async function cambiar({ client = null, id, desde, hacia, motivo, usuarioId = null, pausaManual = false, previoPausa = null, esActividad = false }) {
  const q = ejecutar(client);
  const { rows } = await q(
    `WITH previo AS (SELECT id, estado FROM operativos WHERE id = $1 AND eliminado_en IS NULL FOR UPDATE)
     UPDATE operativos o
        SET estado = $3::estado_operativo, estado_actualizado_en = CURRENT_TIMESTAMP, estado_motivo = $4,
            pausa_manual = $5, estado_previo_pausa = $6::estado_operativo
            ${esActividad ? ', actualizado_en = CURRENT_TIMESTAMP' : ''}
       FROM previo
      WHERE o.id = previo.id AND previo.estado = ANY($2::estado_operativo[])
      RETURNING previo.estado::text AS previo, o.estado::text AS nuevo`,
    [id, desde, hacia, motivo, pausaManual, previoPausa]
  );
  if (!rows[0]) return null;
  await Auditoria.registrar({
    usuarioId, accion: Auditoria.ACCION.MODIFICAR, entidad: 'operativos', registroId: id,
    valoresPrevios: { estado: rows[0].previo },
    valoresNuevos: { estado: rows[0].nuevo, motivo, ...(pausaManual ? { pausa: 'manual' } : {}) },
  });
  return rows[0];
}

/** Nuevo → Iniciado: se entró al panel por primera vez (CU-08 paso 8). */
export const entrar = (id, usuarioId = null) =>
  cambiar({ id, desde: ['NUEVO'], hacia: INICIADO, motivo: 'Se entró al panel del operativo por primera vez', usuarioId, esActividad: true });

/** Iniciado → En planificación: ingresó el primer agente (QR o alta manual). */
export const porIngresoDeAgente = (id, { client = null, usuarioId = null } = {}) =>
  cambiar({ client, id, desde: [INICIADO], hacia: 'EN_PLANIFICACION', motivo: 'Ingresó el primer agente', usuarioId });

/** Iniciado / En planificación → En proceso: hay un grupo trabajando en el terreno. No vuelve atrás. */
export const porGrupoEnTerreno = (id, { client = null, usuarioId = null } = {}) =>
  cambiar({ client, id, desde: [INICIADO, 'EN_PLANIFICACION'], hacia: 'EN_PROCESO', motivo: 'Hay grupos en el terreno', usuarioId });

/** Pausa manual: un coordinador lo deja Inactivo, con motivo. Sólo se reanuda a mano. */
export async function pausar(id, motivo, usuarioId) {
  const { rows } = await query(`SELECT estado::text AS estado FROM operativos WHERE id = $1 AND eliminado_en IS NULL`, [id]);
  if (!rows[0] || !EN_CURSO.includes(rows[0].estado)) return null;
  return cambiar({
    id, desde: EN_CURSO, hacia: 'INACTIVO', motivo, usuarioId, pausaManual: true, previoPausa: rows[0].estado,
  });
}

/** Reanudar: vuelve al estado que tenía. Es una acción de una persona, así que cuenta como actividad. */
export async function reanudar(id, usuarioId) {
  const { rows } = await query(`SELECT estado_previo_pausa::text AS previo FROM operativos WHERE id = $1 AND eliminado_en IS NULL AND estado = 'INACTIVO'`, [id]);
  if (!rows[0]) return null;
  return cambiar({
    id, desde: ['INACTIVO'], hacia: rows[0].previo && EN_CURSO.includes(rows[0].previo) ? rows[0].previo : INICIADO,
    motivo: 'Operativo reanudado', usuarioId, esActividad: true,
  });
}

/**
 * Inactivo automático y su reanudación, calculados con la última actividad registrada.
 * Se llama antes de leer un operativo o la lista; sin `id` revisa todos. Barato: un UPDATE por sentido.
 */
export async function sincronizar(id = null, { client = null } = {}) {
  const q = ejecutar(client);
  const horas = HORAS_SIN_ACTIVIDAD;

  const inactivar = await q(
    `UPDATE operativos o
        SET estado_previo_pausa = o.estado, estado = 'INACTIVO', pausa_manual = false,
            estado_actualizado_en = CURRENT_TIMESTAMP, estado_motivo = 'Sin actividad durante ' || ($1::int)::text || ' horas'
      WHERE o.eliminado_en IS NULL AND o.estado = ANY($3::estado_operativo[]) AND ($2::uuid IS NULL OR o.id = $2::uuid)
        AND ultima_actividad_operativo(o.id) < CURRENT_TIMESTAMP - make_interval(hours => $1::int)
      RETURNING o.id, o.estado_previo_pausa::text AS previo`,
    [horas, id, EN_CURSO]
  );
  for (const r of inactivar.rows) {
    await Auditoria.registrar({
      accion: Auditoria.ACCION.MODIFICAR, entidad: 'operativos', registroId: r.id,
      valoresPrevios: { estado: r.previo }, valoresNuevos: { estado: 'INACTIVO', motivo: `Sin actividad durante ${HORAS_SIN_ACTIVIDAD} horas`, pausa: 'automática' },
    });
  }

  const reactivar = await q(
    `UPDATE operativos o
        SET estado = CASE WHEN o.estado_previo_pausa::text = ANY($3::text[]) THEN o.estado_previo_pausa ELSE $4::estado_operativo END,
            pausa_manual = false, estado_actualizado_en = CURRENT_TIMESTAMP, estado_motivo = 'Volvió la actividad'
      WHERE o.eliminado_en IS NULL AND o.estado = 'INACTIVO' AND NOT o.pausa_manual AND ($2::uuid IS NULL OR o.id = $2::uuid)
        AND ultima_actividad_operativo(o.id) >= CURRENT_TIMESTAMP - make_interval(hours => $1::int)
      RETURNING o.id, o.estado::text AS nuevo`,
    [horas, id, EN_CURSO, INICIADO]
  );
  for (const r of reactivar.rows) {
    await Auditoria.registrar({
      accion: Auditoria.ACCION.MODIFICAR, entidad: 'operativos', registroId: r.id,
      valoresPrevios: { estado: 'INACTIVO' }, valoresNuevos: { estado: r.nuevo, motivo: 'Volvió la actividad' },
    });
  }
  return { inactivados: inactivar.rows.length, reactivados: reactivar.rows.length };
}

/**
 * Después de que alguien ingresa al operativo: si estaba Inactivo por falta de actividad se
 * reanuda, y si era el primero pasa a En planificación. Fuera de la transacción del alta.
 */
export async function despuesDeIngreso(operativoId, usuarioId = null) {
  await sincronizar(operativoId);
  await porIngresoDeAgente(operativoId, { usuarioId });
}
