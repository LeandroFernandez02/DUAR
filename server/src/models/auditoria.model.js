/**
 * MODELO · Auditoría forense (Decisión D)
 *
 * Una única tabla polimórfica para TODO el sistema, en vez de una tabla de
 * historial por entidad. `entidad_afectada` dice a qué tabla pertenece el
 * registro y los JSONB guardan el antes y el después del cambio.
 *
 * Esto es lo que sostiene el requisito legal: ante un peritaje hay que poder
 * responder quién cambió qué, cuándo y desde qué IP.
 */
import { query } from '../config/db.js';

/** Acciones normalizadas; se usan como valores de `accion`. */
export const ACCION = {
  CREAR: 'CREAR',
  MODIFICAR: 'MODIFICAR',
  ELIMINAR: 'ELIMINAR',
  LOGIN: 'LOGIN',
};

/**
 * Registra un evento. Nunca lanza: una falla de auditoría no debe tumbar la
 * operación de negocio, pero sí queda en el log del servidor para investigarla.
 *
 * @param {object}  p
 * @param {string?} p.usuarioId       quién ejecutó la acción
 * @param {string}  p.accion          ACCION.*
 * @param {string}  p.entidad         nombre de la tabla afectada
 * @param {string}  p.registroId      id de la fila afectada
 * @param {object?} p.valoresPrevios  estado anterior
 * @param {object?} p.valoresNuevos   estado posterior
 * @param {string?} p.ip
 */
export async function registrar({
  usuarioId = null, accion, entidad, registroId,
  valoresPrevios = null, valoresNuevos = null, ip = null,
}) {
  try {
    await query(
      `INSERT INTO logs_auditoria
         (usuario_id, accion, entidad_afectada, registro_id, valores_previos, valores_nuevos, ip_origen)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        usuarioId, accion, entidad, registroId,
        valoresPrevios ? JSON.stringify(valoresPrevios) : null,
        valoresNuevos ? JSON.stringify(valoresNuevos) : null,
        ip?.slice(0, 45) ?? null,
      ]
    );
  } catch (err) {
    console.error('[auditoria] no se pudo registrar el evento:', err.message);
  }
}

/** Historial de una entidad concreta, del más reciente al más viejo. */
export async function porRegistro(entidad, registroId) {
  const { rows } = await query(
    `SELECT l.id, l.accion, l.valores_previos AS "valoresPrevios",
            l.valores_nuevos AS "valoresNuevos", l.ip_origen AS "ip",
            l.creado_en AS "creadoEn",
            u.nombre || ' ' || u.apellido AS "responsable"
       FROM logs_auditoria l
       LEFT JOIN usuarios u ON u.id = l.usuario_id
      WHERE l.entidad_afectada = $1 AND l.registro_id = $2
      ORDER BY l.creado_en DESC`,
    [entidad, registroId]
  );
  return rows;
}
