/**
 * MODELO · Punto Cero (Módulo 5 · CU-36, y CU-08 / CU-09)
 *
 * `operativos.punto_cero` es el punto vigente; `punto_cero_historial` guarda
 * cada movimiento (desde, hasta, cuántos metros, quién, cuándo y por qué). Es
 * un dato forense: muestra cómo fue cambiando la hipótesis de dónde estaba la
 * persona buscada (lo usa el Informe, CU-41).
 *
 * El motivo es obligatorio con el operativo en curso, es decir, en cualquier
 * estado que no sea NUEVO (nadie entró todavía: se está terminando de cargar).
 * Los radios del operativo no guardan centro: siempre se dibujan en el Punto
 * Cero vigente, así que lo siguen solos.
 */
import { query, withTransaction } from '../config/db.js';
import { ReglaError } from './reglaError.js';

/** Menos que esto es el mismo lugar (redondeos del mapa), no un movimiento. */
const MOVIMIENTO_MINIMO_M = 0.5;

const ESTADOS_SOLO_LECTURA = ['FINALIZADO', 'ELIMINADO'];

/** CU-08: la definición inicial, en la misma transacción que crea el operativo. */
export async function registrarInicial(client, operativoId, usuarioId) {
  await client.query(
    `INSERT INTO punto_cero_historial (operativo_id, desde, hasta, distancia_m, motivo, registrado_por)
     SELECT id, NULL, punto_cero, NULL, NULL, $2 FROM operativos WHERE id = $1`,
    [operativoId, usuarioId]
  );
}

/**
 * CU-36 / CU-09: mueve el Punto Cero dentro de una transacción ya abierta.
 * Devuelve el movimiento registrado, o null si el punto no cambió.
 */
export async function moverCon(client, operativoId, { lat, lng, motivo = null }, usuarioId) {
  const { rows: [op] } = await client.query(
    `SELECT estado::text AS estado,
            ST_Distance(punto_cero::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) AS distancia
       FROM operativos WHERE id = $1 AND eliminado_en IS NULL FOR UPDATE`,
    [operativoId, lng, lat]
  );
  if (!op) throw new ReglaError(404, 'operativo_no_encontrado', 'Operativo no encontrado.');
  if (ESTADOS_SOLO_LECTURA.includes(op.estado)) {
    throw new ReglaError(409, 'operativo_cerrado', `El operativo está ${op.estado.toLowerCase()}: el Punto Cero ya no se mueve.`);
  }
  if (op.distancia !== null && op.distancia < MOVIMIENTO_MINIMO_M) return null;
  if (op.estado !== 'NUEVO' && !motivo) {
    throw new ReglaError(400, 'motivo_requerido',
      'Escribí por qué se mueve el Punto Cero: con el operativo en curso, el motivo queda en el historial.');
  }

  const { rows: [mov] } = await client.query(
    `WITH previo AS (SELECT punto_cero AS p FROM operativos WHERE id = $1),
          upd AS (
            UPDATE operativos SET punto_cero = ST_SetSRID(ST_MakePoint($2, $3), 4326), actualizado_en = CURRENT_TIMESTAMP
             WHERE id = $1 RETURNING punto_cero)
     INSERT INTO punto_cero_historial (operativo_id, desde, hasta, distancia_m, motivo, registrado_por)
     SELECT $1, previo.p, upd.punto_cero, $4, $5, $6 FROM previo, upd
     RETURNING id`,
    [operativoId, lng, lat, op.distancia === null ? null : Math.round(op.distancia * 10) / 10, motivo, usuarioId]
  );
  return mov;
}

/** CU-36 desde el mapa: en su propia transacción. null = ya estaba ahí. */
export async function mover(operativoId, datos, usuarioId) {
  return withTransaction(client => moverCon(client, operativoId, datos, usuarioId));
}

/** El punto vigente (lat/lng). */
export async function vigente(operativoId) {
  const { rows } = await query(
    `SELECT ST_Y(punto_cero) AS lat, ST_X(punto_cero) AS lng FROM operativos WHERE id = $1`, [operativoId]);
  return rows[0] ?? null;
}

/** El historial del Punto Cero, del más nuevo al más viejo (CU-36, CU-41). */
export async function historial(operativoId) {
  const { rows } = await query(
    `SELECT h.id,
            ST_Y(h.desde) AS "desdeLat", ST_X(h.desde) AS "desdeLng",
            ST_Y(h.hasta) AS "hastaLat", ST_X(h.hasta) AS "hastaLng",
            round(h.distancia_m)::int AS "distanciaM",
            h.motivo,
            h.registrado_en AS "registradoEn",
            u.nombre || ' ' || u.apellido AS "registradoPor"
       FROM punto_cero_historial h
       LEFT JOIN usuarios u ON u.id = h.registrado_por
      WHERE h.operativo_id = $1
      ORDER BY h.registrado_en DESC, h.id`,
    [operativoId]
  );
  return rows;
}
