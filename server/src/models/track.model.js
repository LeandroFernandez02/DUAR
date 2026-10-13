/**
 * MODELO · Tracks GPX (Módulo 5)
 *   · CU-29 Cargar Traza GPX (el agente desde su portal, o el coordinador en su nombre)
 *   · CU-30 Modificar Datos de Traza (sólo el polígono y las notas)
 *   · CU-36 Eliminar (baja con registro) · CU-38 Cobertura (al cargar, mover o eliminar)
 *
 * El recorrido, las horas y la elevación salen del archivo y no se editan: son
 * la prueba de por dónde pasó cada persona. El .gpx original queda guardado en
 * un bucket privado. El polígono se detecta por coordenadas: el que contiene
 * más puntos del recorrido, si llega al 30 %.
 */
import { query, withTransaction } from '../config/db.js';
import { ReglaError } from './reglaError.js';
import * as Asig from './poligonoAsignacion.js';
import { recalcularCoberturaCon } from './poligono.model.js';
import * as Storage from '../services/storage.service.js';
import { leerGpx, resumirGpx, lineaWkt } from '../utils/gpx.js';

/** CU-29 paso 4: un polígono "es" el del track si contiene al menos este porcentaje de sus puntos. */
export const UMBRAL_DETECCION_PCT = 30;
const MAX_PUNTOS = 100000;

const ejecutar = (db, texto, params) => (db ? db.query(texto, params) : query(texto, params));

const SELECT_TRACK = `
  SELECT t.id,
         t.operativo_id          AS "operativoId",
         t.poligono_id           AS "poligonoId",
         p.nombre                AS "poligonoNombre",
         t.agente_operativo_id   AS "agenteOperativoId",
         ua.nombre || ' ' || ua.apellido AS agente,
         t.grupo_id              AS "grupoId",
         g.nombre                AS "grupoNombre",
         g.color,
         uc.nombre || ' ' || uc.apellido AS "cargadoPor",
         t.cargado_en            AS "cargadoEn",
         t.archivo_nombre        AS "archivoNombre",
         t.inicio, t.fin,
         EXTRACT(EPOCH FROM (t.fin - t.inicio))::int AS "duracionS",
         round(t.distancia_m)::int AS "distanciaM",
         t.con_elevacion         AS "conElevacion",
         round(t.desnivel_positivo_m)::int AS "desnivelPositivoM",
         round(t.desnivel_negativo_m)::int AS "desnivelNegativoM",
         t.deteccion_pct::float  AS "deteccionPct",
         t.notas,
         ST_AsGeoJSON(ST_Force2D(t.geom))::json AS geometria
    FROM tracks_gpx t
    JOIN agentes_operativo ao ON ao.id = t.agente_operativo_id
    JOIN usuarios ua ON ua.id = ao.usuario_id
    JOIN usuarios uc ON uc.id = t.cargado_por
    LEFT JOIN poligonos p ON p.id = t.poligono_id
    LEFT JOIN grupos g ON g.id = t.grupo_id
`;

/** Lee el archivo y valida que sea un recorrido. Lanza ReglaError con lo que dice el CU-29. */
function interpretar(buffer) {
  const { puntos, nombre } = leerGpx(buffer.toString('utf8'));
  if (puntos.length < 2) {
    throw new ReglaError(400, 'gpx_sin_puntos', 'No se encontraron puntos de recorrido en el archivo.');
  }
  if (puntos.length > MAX_PUNTOS) {
    throw new ReglaError(400, 'gpx_demasiado_grande', `El recorrido tiene más de ${MAX_PUNTOS.toLocaleString('es-AR')} puntos.`);
  }
  return { puntos, nombre, ...resumirGpx(puntos) };
}

/** Distancia (geografía exacta) y polígono detectado por coordenadas (CU-29 paso 4). */
async function medir(db, operativoId, puntos) {
  const { rows: [m] } = await ejecutar(db,
    `WITH linea AS (SELECT ST_SetSRID(ST_GeomFromText($1), 4326) AS g),
          pts AS (SELECT (ST_DumpPoints(ST_Force2D(g))).geom AS p FROM linea),
          candidato AS (
            SELECT pol.id, pol.nombre, count(*)::int AS n
              FROM poligonos pol JOIN pts ON ST_Contains(pol.geom, pts.p)
             WHERE pol.operativo_id = $2 AND pol.eliminado_en IS NULL
             GROUP BY pol.id, pol.nombre ORDER BY n DESC LIMIT 1)
     SELECT ST_Length(ST_Force2D(linea.g)::geography) AS "distanciaM",
            (SELECT count(*) FROM pts)::int AS total,
            c.id, c.nombre, c.n
       FROM linea LEFT JOIN candidato c ON true`,
    [lineaWkt(puntos), operativoId]
  );
  const pct = m.id ? Math.round((m.n / m.total) * 10000) / 100 : 0;
  return {
    distanciaM: Math.round(m.distanciaM),
    poligono: m.id && pct >= UMBRAL_DETECCION_PCT ? { id: m.id, nombre: m.nombre } : null,
    deteccionPct: pct,
  };
}

/**
 * CU-29 pasos 3-5: lo que el agente o el coordinador ven ANTES de confirmar
 * (puntos, distancia, horas, desnivel y polígono detectado). No guarda nada.
 */
export async function analizar(operativoId, buffer) {
  const g = interpretar(buffer);
  const m = await medir(null, operativoId, g.puntos);
  return {
    nombre: g.nombre, puntos: g.puntos.length, distanciaM: m.distanciaM,
    inicio: g.inicio, fin: g.fin, duracionS: g.duracionS,
    conElevacion: g.conElevacion, desnivelPositivoM: g.desnivelPositivoM, desnivelNegativoM: g.desnivelNegativoM,
    poligono: m.poligono, deteccionPct: m.deteccionPct,
  };
}

/**
 * CU-29: guarda el track. `agenteOperativoId` = de quién es el recorrido (el
 * alta en ESTE operativo, vigente o ya egresada); `cargadoPor` = quién lo
 * subió (él mismo o el coordinador). El grupo es el que tenía el agente a la
 * hora de inicio del recorrido, no el de ahora.
 */
export async function crear(operativoId, { agenteOperativoId, buffer, archivoNombre, notas = null }, cargadoPor) {
  const g = interpretar(buffer);
  try {
    const id = await withTransaction(async (client) => {
      const { rows: [agente] } = await client.query(
        `SELECT ao.id, ao.grupo_id AS "grupoId" FROM agentes_operativo ao
          WHERE ao.id = $1 AND ao.operativo_id = $2`,
        [agenteOperativoId, operativoId]
      );
      if (!agente) throw new ReglaError(404, 'agente_no_encontrado', 'Ese agente no estuvo en este operativo.');

      const m = await medir(client, operativoId, g.puntos);
      let grupoId = agente.grupoId;
      if (g.inicio) {
        const { rows } = await client.query(
          `SELECT grupo_id FROM agentes_grupo_historial
            WHERE agente_operativo_id = $1 AND fecha_inicio <= $2 AND (fecha_fin IS NULL OR fecha_fin > $2)
            ORDER BY fecha_inicio DESC LIMIT 1`,
          [agenteOperativoId, g.inicio]
        );
        if (rows[0]) grupoId = rows[0].grupo_id;
      }

      const { rows: [nuevo] } = await client.query(
        `INSERT INTO tracks_gpx
           (operativo_id, poligono_id, agente_operativo_id, grupo_id, cargado_por, archivo_nombre, geom,
            con_elevacion, inicio, fin, distancia_m, desnivel_positivo_m, desnivel_negativo_m, deteccion_pct, notas)
         VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_GeomFromText($7), 4326), $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING id`,
        [operativoId, m.poligono?.id ?? null, agenteOperativoId, grupoId, cargadoPor, archivoNombre,
         lineaWkt(g.puntos), g.conElevacion, g.inicio, g.fin, m.distanciaM,
         g.desnivelPositivoM, g.desnivelNegativoM, m.deteccionPct, notas]
      );

      // El original va al bucket privado dentro de la transacción: si no se
      // puede guardar, no queda un track sin su prueba.
      const ruta = await Storage.subirGpx(operativoId, nuevo.id, buffer);
      await client.query(`UPDATE tracks_gpx SET archivo_ruta = $2 WHERE id = $1`, [nuevo.id, ruta]);

      if (m.poligono) {
        await Asig.registrarEvento(client, {
          poligonoId: m.poligono.id, operativoId, tipo: 'TRACK_CARGADO', trackId: nuevo.id,
          detalle: { deteccionPct: m.deteccionPct, distanciaM: m.distanciaM }, usuarioId: cargadoPor,
        });
        await recalcularCoberturaCon(client, m.poligono.id);
      }
      return nuevo.id;
    });
    return detalle(operativoId, id);
  } catch (err) {
    if (err.code === '23505' && String(err.constraint ?? '').includes('track_unico')) {
      throw new ReglaError(409, 'track_duplicado', 'Este recorrido ya fue cargado (mismo agente, misma hora de inicio y de fin).');
    }
    throw err;
  }
}

/** Tracks vigentes del operativo (CU-31: se dibujan en el mapa con el color de su grupo). */
export async function listar(operativoId) {
  const { rows } = await query(
    `${SELECT_TRACK} WHERE t.operativo_id = $1 AND t.eliminado_en IS NULL ORDER BY t.inicio NULLS LAST, t.cargado_en`,
    [operativoId]
  );
  return rows;
}

/** Un track con un enlace temporal para descargar el .gpx original. */
export async function detalle(operativoId, trackId) {
  const { rows } = await query(
    `${SELECT_TRACK} WHERE t.id = $1 AND t.operativo_id = $2 AND t.eliminado_en IS NULL`,
    [trackId, operativoId]
  );
  const track = rows[0];
  if (!track) return null;
  const { rows: [r] } = await query(`SELECT archivo_ruta AS ruta FROM tracks_gpx WHERE id = $1`, [trackId]);
  return { ...track, archivoUrl: await Storage.urlFirmadaGpx(r?.ruta) };
}

/** Los tracks de un agente en su operativo (lo que ve en su portal). */
export async function listarDeAgente(agenteOperativoId) {
  const { rows } = await query(
    `${SELECT_TRACK} WHERE t.agente_operativo_id = $1 AND t.eliminado_en IS NULL ORDER BY t.inicio NULLS LAST, t.cargado_en`,
    [agenteOperativoId]
  );
  return rows.map(({ geometria, ...r }) => r);
}

async function bloquearTrack(client, operativoId, trackId) {
  const { rows } = await client.query(
    `SELECT id, poligono_id AS "poligonoId", notas FROM tracks_gpx
      WHERE id = $1 AND operativo_id = $2 AND eliminado_en IS NULL FOR UPDATE`,
    [trackId, operativoId]
  );
  if (!rows[0]) throw new ReglaError(404, 'track_no_encontrado', 'El track no existe en este operativo.');
  return rows[0];
}

/**
 * CU-30: sólo se corrigen el polígono (cuando la detección falló) y las notas.
 * `poligonoId` null = «Fuera de polígono». Recalcula la cobertura de los dos.
 */
export async function actualizar(operativoId, trackId, { poligonoId, notas }, usuarioId) {
  await withTransaction(async (client) => {
    const previo = await bloquearTrack(client, operativoId, trackId);
    if (poligonoId !== undefined && poligonoId !== previo.poligonoId) {
      const nuevo = poligonoId ? await Asig.bloquearPoligono(client, operativoId, poligonoId) : null;
      const { rows: [anterior] } = await client.query(`SELECT nombre FROM poligonos WHERE id = $1`, [previo.poligonoId]);
      await client.query(`UPDATE tracks_gpx SET poligono_id = $2 WHERE id = $1`, [trackId, poligonoId]);
      if (previo.poligonoId) {
        await Asig.registrarEvento(client, {
          poligonoId: previo.poligonoId, operativoId, tipo: 'TRACK_REASIGNADO', trackId,
          detalle: { hacia: nuevo?.nombre ?? 'Fuera de polígono' }, usuarioId,
        });
        await recalcularCoberturaCon(client, previo.poligonoId);
      }
      if (nuevo) {
        await Asig.registrarEvento(client, {
          poligonoId: nuevo.id, operativoId, tipo: 'TRACK_REASIGNADO', trackId,
          detalle: { desde: anterior?.nombre ?? 'Fuera de polígono' }, usuarioId,
        });
        await recalcularCoberturaCon(client, nuevo.id);
      }
    }
    if (notas !== undefined && (notas ?? '') !== (previo.notas ?? '')) {
      await client.query(`UPDATE tracks_gpx SET notas = $2 WHERE id = $1`, [trackId, notas]);
    }
  });
  return detalle(operativoId, trackId);
}

/** CU-36: baja con registro; deja de sumar cobertura. */
export async function eliminar(operativoId, trackId, usuarioId) {
  await withTransaction(async (client) => {
    const previo = await bloquearTrack(client, operativoId, trackId);
    await client.query(
      `UPDATE tracks_gpx SET eliminado_en = CURRENT_TIMESTAMP, eliminado_por = $2 WHERE id = $1`,
      [trackId, usuarioId]
    );
    if (previo.poligonoId) {
      await Asig.registrarEvento(client, {
        poligonoId: previo.poligonoId, operativoId, tipo: 'TRACK_ELIMINADO', trackId, usuarioId,
      });
      await recalcularCoberturaCon(client, previo.poligonoId);
    }
  });
}
