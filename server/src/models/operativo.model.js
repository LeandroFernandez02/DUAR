/**
 * MODELO · Operativos
 *   · CU-08 Crear · CU-09 Modificar · CU-10 Finalizar · CU-11 Consultar
 *
 * `punto_cero` es `geometry(Point,4326)` de PostGIS y no se puede devolver
 * crudo: sale como lat/lng con ST_X/ST_Y para que el frontend lo consuma
 * directo, y entra igual con ST_SetSRID(ST_MakePoint(lng, lat), 4326).
 */
import { query, withTransaction } from '../config/db.js';
import * as Mando from './mando.model.js';
import * as Asig from './poligonoAsignacion.js';
import * as PuntoCero from './puntoCero.model.js';
import * as Estado from './operativoEstado.model.js';

const CAMPOS = `
  o.id,
  o.titulo,
  o.localidad,
  o.fiscal_instruccion  AS "fiscalInstruccion",
  o.descripcion,
  o.nota_final          AS "notaFinal",
  o.resultado::text     AS resultado,
  o.estado::text        AS estado,
  o.estado_motivo       AS "estadoMotivo",
  o.estado_actualizado_en AS "estadoActualizadoEn",
  o.pausa_manual        AS "pausaManual",
  o.fecha_hora_inicio   AS "fechaHoraInicio",
  o.fecha_hora_fin      AS "fechaHoraFin",
  o.coordinador_id      AS "coordinadorId",
  extensions.ST_Y(o.punto_cero) AS "puntoCeroLat",
  extensions.ST_X(o.punto_cero) AS "puntoCeroLng",
  o.creado_en           AS "creadoEn",
  (SELECT count(*)::int FROM agentes_operativo ao
    WHERE ao.operativo_id = o.id AND ao.fecha_egreso IS NULL) AS "cantidadAgentes",
  EXISTS(SELECT 1 FROM objetivo_buscado ob WHERE ob.operativo_id = o.id) AS "tieneObjetivo"
`;

/**
 * Vista previa liviana del objetivo para el listado (CU-11): sin fotos ni
 * URLs firmadas — sólo lo necesario para el badge "Persona/Objeto buscado"
 * de las cards. El detalle completo vive en objetivo.model.js (CU-12..14).
 */
const CAMPOS_CON_OBJETIVO = `
  ${CAMPOS},
  ob2.tipo::text AS "objetivoTipo",
  ob2.nombre     AS "objetivoNombre",
  ob2.apellido   AS "objetivoApellido"
`;

/** Estados desde los que YA NO se puede modificar ni finalizar (CU-09 obs). */
const ESTADOS_SOLO_LECTURA = ['FINALIZADO', 'ELIMINADO'];

export async function buscarPorId(id) {
  // Antes de leerlo se revisa si pasó a Inactivo (48 h sin actividad) o si volvió la actividad.
  if (id) await Estado.sincronizar(id).catch(err => console.error('[estado] no se pudo sincronizar:', err.message));
  const { rows } = await query(
    `SELECT ${CAMPOS} FROM operativos o WHERE o.id = $1 AND o.eliminado_en IS NULL`,
    [id]
  );
  return rows[0] ?? null;
}

/**
 * ¿Admite que entre personal? Precondición de CU-16: Iniciado, En planificación o En proceso. Un
 * operativo Inactivo por falta de actividad también: el ingreso lo reanuda. Uno pausado a mano no.
 */
export function admiteIngresos(operativo) {
  if (!operativo) return false;
  return Estado.EN_CURSO.includes(operativo.estado) || (operativo.estado === 'INACTIVO' && !operativo.pausaManual);
}

/**
 * CU-11 · listado con búsqueda por título y filtro por estado.
 * `vigentes` (el filtro por defecto de la pantalla) no es un valor del ENUM:
 * son todos los estados que todavía no se cerraron juntos, así que se resuelve acá, no en el frontend.
 */
export async function listar({ busqueda = '', estado = '' } = {}) {
  await Estado.sincronizar().catch(err => console.error('[estado] no se pudo sincronizar:', err.message));
  const condiciones = [`o.eliminado_en IS NULL`];
  const valores = [];

  if (busqueda.trim()) {
    valores.push(`%${busqueda.trim()}%`);
    condiciones.push(`o.titulo ILIKE $${valores.length}`);
  }
  if (estado === 'vigentes') {
    // "Vigente" = todavía no se cerró: Nuevo, Inactivo (pausado) y los que están en curso.
    condiciones.push(`o.estado IN ('NUEVO', 'EN_PLANIFICACION', 'EN_PROCESO', '${Estado.INICIADO}', 'INACTIVO')`);
  } else if (estado && estado !== 'all') {
    valores.push(estado.toUpperCase());
    condiciones.push(`o.estado = $${valores.length}::estado_operativo`);
  }

  // Quién está a cargo (presencia de mando, 01/10): el último período de mando.
  // Con `hasta` vacío está a cargo ahora; si no, es el último que estuvo.
  const { rows } = await query(
    `SELECT ${CAMPOS_CON_OBJETIVO},
            mc.nombre AS "mandoNombre", mc.apellido AS "mandoApellido", mc.hasta AS "mandoHasta"
       FROM operativos o
       LEFT JOIN objetivo_buscado ob2 ON ob2.operativo_id = o.id
       LEFT JOIN LATERAL (
         SELECT u.nombre, u.apellido, m.hasta
           FROM mando_operativo m JOIN usuarios u ON u.id = m.usuario_id
          WHERE m.operativo_id = o.id
          ORDER BY m.desde DESC LIMIT 1
       ) mc ON true
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

/** CU-08 paso 6: nace en estado NUEVO, nunca Iniciado directamente. */
export async function crear({
  titulo, localidad, fiscalInstruccion, descripcion = null,
  puntoCeroLat, puntoCeroLng, fechaHoraInicio, coordinadorId,
}) {
  const id = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO operativos
         (titulo, localidad, fiscal_instruccion, descripcion, punto_cero,
          fecha_hora_inicio, coordinador_id, estado)
       VALUES ($1,$2,$3,$4, extensions.ST_SetSRID(extensions.ST_MakePoint($5,$6),4326),
               $7,$8,'NUEVO')
       RETURNING id`,
      [titulo, localidad, fiscalInstruccion, descripcion,
       puntoCeroLng, puntoCeroLat, fechaHoraInicio, coordinadorId]
    );
    // CU-36: el historial del Punto Cero arranca con su definición.
    await PuntoCero.registrarInicial(client, rows[0].id, coordinadorId);
    return rows[0].id;
  });
  return buscarPorId(id);
}

/**
 * CU-09 · UPDATE parcial, igual patrón que usuario.model.js: sólo toca las
 * columnas presentes en `campos`. El UUID nunca cambia (Observaciones del CU).
 * Si cambia el Punto Cero, rigen las reglas del CU-36 (historial y motivo
 * obligatorio con el operativo en curso), en la misma transacción.
 */
export async function actualizar(id, campos, { usuarioId = null, motivoPuntoCero = null } = {}) {
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
  const mueve = campos.puntoCeroLat !== undefined && campos.puntoCeroLng !== undefined;
  if (sets.length === 0 && !mueve) return buscarPorId(id);

  await withTransaction(async (client) => {
    if (sets.length) {
      valores.push(id);
      await client.query(
        `UPDATE operativos SET ${sets.join(', ')}, actualizado_en = CURRENT_TIMESTAMP
          WHERE id = $${valores.length}`,
        valores
      );
    }
    // Punto Cero va aparte: tiene historial y, en curso, motivo (CU-36).
    if (mueve) {
      await PuntoCero.moverCon(client, id,
        { lat: campos.puntoCeroLat, lng: campos.puntoCeroLng, motivo: motivoPuntoCero }, usuarioId);
    }
  });
  return buscarPorId(id);
}

/**
 * CU-08 paso 8 (Transición Automática): NUEVO → Iniciado al entrar por primera
 * vez. Idempotente — si ya no está en NUEVO, no hace nada. Queda auditado.
 */
export async function activarSiEsNuevo(id, usuarioId = null) {
  await Estado.entrar(id, usuarioId);
  return buscarPorId(id);
}

/**
 * CU-10 · pasos 6-7: cierra el operativo Y libera a todo el personal en la
 * MISMA transacción. La liberación (paso 7) es la razón por la que esto no
 * puede ser un UPDATE suelto de `estado` — hay que cerrar también todas las
 * participaciones activas en `agentes_operativo`, igual patrón que el
 * traslado de la Regla de Ubicuidad en `agenteOperativo.model.js`.
 */
/** Estados de un agente que no impiden cerrar el operativo: ya volvió a la base o no está disponible. */
const ESTADOS_AGENTE_QUE_NO_IMPIDEN_CERRAR = ['EN_ESPERA', 'DISPONIBLE', 'NO_DISPONIBLE'];

/**
 * CU-10 paso 5.1 (Testeo 15/10, punto 17): qué conviene revisar antes de finalizar. Devuelve cuántos
 * tracks GPX hay cargados y qué agentes siguen en actividad (cualquier estado que no sea En espera,
 * Disponible o No disponible). No bloquea nada: el coordinador decide si espera o fuerza el cierre.
 */
export async function revisionAntesDeFinalizar(id) {
  const { rows: [t] } = await query(
    `SELECT count(*)::int AS n FROM tracks_gpx WHERE operativo_id = $1 AND eliminado_en IS NULL`, [id]);
  const { rows: agentes } = await query(
    `SELECT u.nombre, u.apellido, ao.estado::text AS estado
       FROM agentes_operativo ao JOIN usuarios u ON u.id = ao.usuario_id
      WHERE ao.operativo_id = $1 AND ao.fecha_egreso IS NULL AND NOT (ao.estado::text = ANY($2::text[]))
      ORDER BY u.apellido, u.nombre`, [id, ESTADOS_AGENTE_QUE_NO_IMPIDEN_CERRAR]);
  return { tracksCargados: t.n, agentesEnActividad: agentes };
}

export async function finalizar(id, { notaFinal = null, resultado = null, usuarioId = null } = {}) {
  return withTransaction(async (client) => {
    await client.query(
      `UPDATE operativos
          SET estado = 'FINALIZADO', pausa_manual = false, estado_actualizado_en = CURRENT_TIMESTAMP, estado_motivo = 'Operativo finalizado',
              fecha_hora_fin = CURRENT_TIMESTAMP,
              nota_final = $2, resultado = $3::resultado_operativo, actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [id, notaFinal, resultado]
    );
    // Línea de tiempo (eventos_estado, migración 010): cada grupo que se
    // disuelve y cada persona que queda liberada, con su último estado. Va
    // antes de los UPDATE para registrar el estado que tenían.
    await client.query(
      `INSERT INTO eventos_estado
         (operativo_id, entidad, grupo_id, accion, estado_anterior, estado_nuevo, ocurrido_en, registrado_por, fuente, motivo)
       SELECT operativo_id, 'GRUPO', id, 'disolver', estado::text, 'DISUELTO', CURRENT_TIMESTAMP, $2, 'SISTEMA', 'Operativo finalizado'
         FROM grupos WHERE operativo_id = $1 AND eliminado_en IS NULL`,
      [id, usuarioId]
    );
    await client.query(
      `INSERT INTO eventos_estado
         (operativo_id, entidad, grupo_id, agente_operativo_id, accion, estado_anterior, ocurrido_en, registrado_por, fuente, motivo)
       SELECT operativo_id, 'AGENTE', grupo_id, id, 'baja', estado::text, CURRENT_TIMESTAMP, $2, 'SISTEMA', 'Operativo finalizado'
         FROM agentes_operativo WHERE operativo_id = $1 AND fecha_egreso IS NULL`,
      [id, usuarioId]
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
    // El puesto de comando también se cierra (presencia de mando, migración 016).
    await Mando.cerrarTodoCon(client, id, usuarioId, 'Operativo finalizado');
    // Los grupos salen de sus polígonos (CU-30), con el motivo en el historial de cada uno.
    await Asig.cerrarTodasDelOperativo(client, id, usuarioId);
    // Los grupos vigentes se disuelven con la misma baja lógica del CU-26
    // (estado DISUELTO + eliminado_en). Sin esto quedaban grupos "rastrillando"
    // en un operativo cerrado, sin integrantes. lider_id no se toca: es parte
    // del registro histórico del grupo.
    await client.query(
      `UPDATE grupos
          SET estado = 'DISUELTO', eliminado_en = CURRENT_TIMESTAMP,
              estado_actualizado_en = CURRENT_TIMESTAMP, actualizado_en = CURRENT_TIMESTAMP
        WHERE operativo_id = $1 AND eliminado_en IS NULL`,
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
