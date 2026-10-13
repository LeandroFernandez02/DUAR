/**
 * MODELO · Radios desde el Punto Cero (Módulo 5 · CU-34 R1-R3)
 *
 * Son del operativo: todos los coordinadores ven los mismos. No guardan
 * centro: se dibujan siempre en el Punto Cero vigente, así que lo siguen
 * solos. Ocultar un radio es de cada pantalla (no pasa por acá).
 */
import { query } from '../config/db.js';
import { ReglaError } from './reglaError.js';

const CAMPOS = `id, radio_m AS "radioM", color, creado_en AS "creadoEn"`;

const distancia = (m) => (m >= 1000 ? `${(m / 1000).toLocaleString('es-AR')} km` : `${m} m`);

function comoErrorDeRadio(err, radioM) {
  if (err.code === '23505') return new ReglaError(409, 'radio_duplicado', `Ya existe un radio de ${distancia(radioM)}.`);
  return err;
}

export async function listar(operativoId) {
  const { rows } = await query(
    `SELECT ${CAMPOS} FROM radios_operativo WHERE operativo_id = $1 AND eliminado_en IS NULL ORDER BY radio_m`,
    [operativoId]
  );
  return rows;
}

export async function crear(operativoId, { radioM, color }, usuarioId) {
  try {
    const { rows } = await query(
      `INSERT INTO radios_operativo (operativo_id, radio_m, color, creado_por) VALUES ($1, $2, $3, $4) RETURNING ${CAMPOS}`,
      [operativoId, radioM, color, usuarioId]
    );
    return rows[0];
  } catch (err) { throw comoErrorDeRadio(err, radioM); }
}

/** R2: cambiar los km o el color. Devuelve { previo, radio }. */
export async function actualizar(operativoId, radioId, { radioM, color }) {
  const { rows: [previo] } = await query(
    `SELECT ${CAMPOS} FROM radios_operativo WHERE id = $1 AND operativo_id = $2 AND eliminado_en IS NULL`,
    [radioId, operativoId]
  );
  if (!previo) throw new ReglaError(404, 'radio_no_encontrado', 'El radio no existe en este operativo.');
  if ((radioM ?? previo.radioM) === previo.radioM && (color ?? previo.color).toLowerCase() === previo.color.toLowerCase()) {
    throw new ReglaError(400, 'sin_cambios', 'No hay nada para cambiar.');
  }
  try {
    const { rows } = await query(
      `UPDATE radios_operativo SET radio_m = COALESCE($2, radio_m), color = COALESCE($3, color) WHERE id = $1 RETURNING ${CAMPOS}`,
      [radioId, radioM ?? null, color ?? null]
    );
    return { previo, radio: rows[0] };
  } catch (err) { throw comoErrorDeRadio(err, radioM); }
}

/** R2: quitarlo (baja con registro). */
export async function eliminar(operativoId, radioId, usuarioId) {
  const { rows } = await query(
    `UPDATE radios_operativo SET eliminado_en = CURRENT_TIMESTAMP, eliminado_por = $3
      WHERE id = $1 AND operativo_id = $2 AND eliminado_en IS NULL RETURNING ${CAMPOS}`,
    [radioId, operativoId, usuarioId]
  );
  if (!rows[0]) throw new ReglaError(404, 'radio_no_encontrado', 'El radio no existe en este operativo.');
  return rows[0];
}
