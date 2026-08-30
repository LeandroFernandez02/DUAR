/**
 * MODELO · Operativos
 *   · CU-08 Crear · CU-09 Modificar · CU-10 Finalizar · CU-11 Consultar
 *
 * `punto_cero` es `geometry(Point,4326)` de PostGIS y no se puede devolver
 * crudo: sale como lat/lng con ST_X/ST_Y para que el frontend lo consuma
 * directo, y entra igual con ST_SetSRID(ST_MakePoint(lng, lat), 4326).
 */
import { query, withTransaction } from '../config/db.js';

const CAMPOS = `
  o.id,
  o.titulo,
  o.localidad,
  o.fiscal_instruccion  AS "fiscalInstruccion",
  o.descripcion,
  o.estado::text        AS estado,
  o.fecha_hora_inicio   AS "fechaHoraInicio",
  o.fecha_hora_fin      AS "fechaHoraFin",
  o.coordinador_id      AS "coordinadorId",
  extensions.ST_Y(o.punto_cero) AS "puntoCeroLat",
  extensions.ST_X(o.punto_cero) AS "puntoCeroLng",
  o.creado_en           AS "creadoEn",
  (SELECT count(*)::int FROM agentes_operativo ao
    WHERE ao.operativo_id = o.id AND ao.fecha_egreso IS NULL) AS "cantidadAgentes"
`;

/** Estados desde los que YA NO se puede modificar ni finalizar (CU-09 obs). */
const ESTADOS_SOLO_LECTURA = ['FINALIZADO', 'ELIMINADO'];

export async function buscarPorId(id) {
  const { rows } = await query(
    `SELECT ${CAMPOS} FROM operativos o WHERE o.id = $1 AND o.eliminado_en IS NULL`,
    [id]
  );
  return rows[0] ?? null;
}

/** ¿Admite que entre personal? Precondición de CU-15: ACTIVO o EN_PLANIFICACION. */
export function admiteIngresos(operativo) {
  return ['ACTIVO', 'EN_PLANIFICACION'].includes(operativo?.estado);
}

/**
 * CU-11 · listado con búsqueda por título y filtro por estado.
 * `vigentes` (el filtro por defecto de la pantalla) no es un valor del ENUM:
 * es ACTIVO + EN_PROCESO juntos, así que se resuelve acá, no en el frontend.
 */
export async function listar({ busqueda = '', estado = '' } = {}) {
  const condiciones = [`o.eliminado_en IS NULL`];
  const valores = [];

  if (busqueda.trim()) {
    valores.push(`%${busqueda.trim()}%`);
    condiciones.push(`o.titulo ILIKE $${valores.length}`);
  }
  if (estado === 'vigentes') {
    // "Vigente" = todavía no se cerró: NUEVO/EN_PLANIFICACION también cuentan,
    // no sólo lo que ya está en curso.
    condiciones.push(`o.estado IN ('NUEVO', 'EN_PLANIFICACION', 'EN_PROCESO', 'ACTIVO')`);
  } else if (estado && estado !== 'all') {
    valores.push(estado.toUpperCase());
    condiciones.push(`o.estado = $${valores.length}::estado_operativo`);
  }

  const { rows } = await query(
    `SELECT ${CAMPOS} FROM operativos o
      WHERE ${condiciones.join(' AND ')}
      ORDER BY o.fecha_hora_inicio DESC`,
    valores
  );
  return rows;
}

/**
 * CU-08 Observaciones · "Restricción de Integridad": no se puede abrir el
 * mismo incidente dos veces por error. Compara título (sin mayúsc./espacios)
 * contra lo creado en las últimas 24 h.
 */
export async function existeTituloDuplicadoReciente(titulo) {
  const { rows } = await query(
    `SELECT id FROM operativos
      WHERE eliminado_en IS NULL
        AND lower(trim(titulo)) = lower(trim($1))
        AND creado_en > CURRENT_TIMESTAMP - interval '24 hours'`,
    [titulo]
  );
  return rows.length > 0;
}

/** CU-08 paso 6: nace en estado NUEVO, nunca ACTIVO directamente. */
export async function crear({
  titulo, localidad, fiscalInstruccion, descripcion = null,
  puntoCeroLat, puntoCeroLng, fechaHoraInicio, coordinadorId,
}) {
  const { rows } = await query(
    `INSERT INTO operativos
       (titulo, localidad, fiscal_instruccion, descripcion, punto_cero,
        fecha_hora_inicio, coordinador_id, estado)
     VALUES ($1,$2,$3,$4, extensions.ST_SetSRID(extensions.ST_MakePoint($5,$6),4326),
             $7,$8,'NUEVO')
     RETURNING id`,
    [titulo, localidad, fiscalInstruccion, descripcion,
     puntoCeroLng, puntoCeroLat, fechaHoraInicio, coordinadorId]
  );
  return buscarPorId(rows[0].id);
}

/**
 * CU-09 · UPDATE parcial, igual patrón que usuario.model.js: sólo toca las
 * columnas presentes en `campos`. El UUID nunca cambia (Observaciones del CU).
 */
export async function actualizar(id, campos) {
  const permitidos = {
    titulo: 'titulo',
    localidad: 'localidad',
    fiscalInstruccion: 'fiscal_instruccion',
    descripcion: 'descripcion',
    fechaHoraInicio: 'fecha_hora_inicio',
  };

  const sets = [];
  const valores = [];
  for (const [clave, columna] of Object.entries(permitidos)) {
    if (campos[clave] !== undefined) {
      valores.push(campos[clave]);
      sets.push(`${columna} = $${valores.length}`);
    }
  }
  // Punto Cero va aparte: es una expresión PostGIS, no un valor simple.
  if (campos.puntoCeroLat !== undefined && campos.puntoCeroLng !== undefined) {
    valores.push(campos.puntoCeroLng, campos.puntoCeroLat);
    sets.push(`punto_cero = extensions.ST_SetSRID(extensions.ST_MakePoint($${valores.length - 1},$${valores.length}),4326)`);
  }

  if (sets.length === 0) return buscarPorId(id);

  valores.push(id);
  await query(
    `UPDATE operativos SET ${sets.join(', ')}, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $${valores.length}`,
    valores
  );
  return buscarPorId(id);
}

/**
 * CU-08 paso 8 (Transición Automática): NUEVO → ACTIVO al entrar por primera
 * vez. Idempotente — si ya no está en NUEVO, no hace nada.
 */
export async function activarSiEsNuevo(id) {
  await query(
    `UPDATE operativos SET estado = 'ACTIVO', actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $1 AND estado = 'NUEVO'`,
    [id]
  );
  return buscarPorId(id);
}

/**
 * CU-10 · pasos 6-7: cierra el operativo Y libera a todo el personal en la
 * MISMA transacción. La liberación (paso 7) es la razón por la que esto no
 * puede ser un UPDATE suelto de `estado` — hay que cerrar también todas las
 * participaciones activas en `agentes_operativo`, igual patrón que el
 * traslado de la Regla de Ubicuidad en `agenteOperativo.model.js`.
 */
export async function finalizar(id, { notaFinal = null } = {}) {
  return withTransaction(async (client) => {
    await client.query(
      `UPDATE operativos
          SET estado = 'FINALIZADO', fecha_hora_fin = CURRENT_TIMESTAMP,
              descripcion = COALESCE($2, descripcion), actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [id, notaFinal]
    );
    // Libera al personal: vuelven a estar "Disponibles" globalmente, sin
    // operativo activo, para que otro incidente los pueda absorber ya mismo.
    await client.query(
      `UPDATE agentes_operativo SET fecha_egreso = CURRENT_TIMESTAMP, grupo_id = NULL
        WHERE operativo_id = $1 AND fecha_egreso IS NULL`,
      [id]
    );
    await client.query(
      `UPDATE agentes_grupo_historial h
          SET fecha_fin = CURRENT_TIMESTAMP, motivo_salida = 'Operativo finalizado'
         FROM agentes_operativo ao
        WHERE h.agente_operativo_id = ao.id AND ao.operativo_id = $1 AND h.fecha_fin IS NULL`,
      [id]
    );
  }).then(() => buscarPorId(id));
}

/**
 * Baja lógica. No hay un CU formal "Eliminar Operativo" — se restringe a
 * NUEVO a propósito: es deshacer una alta por error, antes de que exista
 * cualquier cosa real vinculada (agentes, grupos). Un operativo que ya se usó
 * se cierra con Finalizar (CU-10), nunca se borra.
 */
export async function eliminar(id) {
  await query(
    `UPDATE operativos SET estado = 'ELIMINADO', eliminado_en = CURRENT_TIMESTAMP
      WHERE id = $1 AND estado = 'NUEVO'`,
    [id]
  );
}

export { ESTADOS_SOLO_LECTURA };
