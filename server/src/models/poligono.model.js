/**
 * MODELO · Polígonos del Mapa Operacional (Módulo 5)
 *   · CU-29 Dibujar Polígono · CU-30 Asignar Polígono a Grupo
 *   · CU-37 Modificar Polígono · CU-38 Eliminar (baja con registro)
 *   · CU-39 Consultar Polígono · CU-40 Calcular Cobertura
 *
 * Decisiones del 12/10: el polígono NO tiene estado (lo describe su cobertura);
 * admite a lo sumo un grupo de rastrillaje más los especiales; sólo se asignan
 * grupos Confirmados; eliminar es dar de baja con registro y no se puede con un
 * grupo trabajando en el terreno. Siempre «polígono», nunca «sector».
 *
 * Geometrías en GeoJSON hacia afuera (lo que dibuja Leaflet) y en PostGIS
 * (SRID 4326) adentro; área, perímetro y cobertura los calcula la base.
 */
import { query, withTransaction } from '../config/db.js';
import { ReglaError } from './reglaError.js';
import * as Asig from './poligonoAsignacion.js';
import * as Grupo from './grupo.model.js';
import * as Evento from './evento.model.js';

/** CU-40: lo que ve una persona a cada lado de su recorrido (decisión del 12/10: 2 m, 4 m en total). */
export const ANCHO_BARRIDO_M = 2;

const EN_TERRENO = ['DESPLEGADO', 'RASTRILLANDO'];

const CAMPOS = `
  p.id,
  p.operativo_id            AS "operativoId",
  p.nombre,
  p.notas,
  p.color,
  ST_AsGeoJSON(p.geom)::json AS geometria,
  round(p.area_m2)::int      AS "areaM2",
  round(p.perimetro_m)::int  AS "perimetroM",
  p.cobertura_pct::float     AS "coberturaPct",
  p.cobertura_km::float      AS "coberturaKm",
  p.cobertura_calculada_en   AS "coberturaCalculadaEn",
  p.creado_en                AS "creadoEn",
  (SELECT count(*)::int FROM tracks_gpx t WHERE t.poligono_id = p.id AND t.eliminado_en IS NULL) AS tracks,
  COALESCE((
    SELECT json_agg(json_build_object(
             'id', g.id, 'nombre', g.nombre, 'clase', g.clase::text, 'estado', g.estado::text,
             'color', g.color, 'asignadoEn', pg.asignado_en,
             'liderNombre', u.nombre || ' ' || u.apellido)
           ORDER BY (g.clase = 'RASTRILLAJE') DESC, pg.asignado_en)
      FROM poligono_grupos pg
      JOIN grupos g ON g.id = pg.grupo_id
      LEFT JOIN agentes_operativo ao ON ao.id = g.lider_id
      LEFT JOIN usuarios u ON u.id = ao.usuario_id
     WHERE pg.poligono_id = p.id AND pg.salida_en IS NULL), '[]'::json) AS grupos
`;

/** Polígonos vigentes del operativo (lo que dibuja el mapa y lista el panel). */
export async function listar(operativoId) {
  // Con las brechas: el mapa las dibuja todas juntas (CU-33, «Análisis de brechas»).
  const { rows } = await query(
    `SELECT ${CAMPOS}, ST_AsGeoJSON(p.brechas)::json AS brechas FROM poligonos p
      WHERE p.operativo_id = $1 AND p.eliminado_en IS NULL
      ORDER BY p.creado_en, p.nombre`,
    [operativoId]
  );
  return rows;
}

/** CU-39: el polígono con sus grupos, cobertura y brechas, tracks e historial. */
export async function detalle(operativoId, poligonoId) {
  const { rows } = await query(
    `SELECT ${CAMPOS}, ST_AsGeoJSON(p.brechas)::json AS brechas
       FROM poligonos p
      WHERE p.id = $1 AND p.operativo_id = $2 AND p.eliminado_en IS NULL`,
    [poligonoId, operativoId]
  );
  const poligono = rows[0];
  if (!poligono) return null;

  const [asistieron, tracks, historial] = await Promise.all([
    query(
      `SELECT g.id, g.nombre, g.color, g.clase::text AS clase, min(pg.asignado_en) AS "primeraVez"
         FROM poligono_grupos pg JOIN grupos g ON g.id = pg.grupo_id
        WHERE pg.poligono_id = $1
        GROUP BY g.id ORDER BY min(pg.asignado_en)`,
      [poligonoId]),
    query(
      `SELECT t.id, u.nombre || ' ' || u.apellido AS agente, t.inicio, t.fin, t.cargado_en AS "cargadoEn",
              round(t.distancia_m)::int AS "distanciaM", g.color
         FROM tracks_gpx t
         JOIN agentes_operativo ao ON ao.id = t.agente_operativo_id
         JOIN usuarios u ON u.id = ao.usuario_id
         LEFT JOIN grupos g ON g.id = t.grupo_id
        WHERE t.poligono_id = $1 AND t.eliminado_en IS NULL
        ORDER BY t.inicio NULLS LAST, t.cargado_en`,
      [poligonoId]),
    query(
      `SELECT e.id, e.tipo, e.registrado_en AS "registradoEn", e.detalle,
              e.grupo_id AS "grupoId", g.nombre AS "grupoNombre", g.color AS "grupoColor",
              e.track_id AS "trackId",
              u.nombre || ' ' || u.apellido AS "registradoPor"
         FROM poligono_eventos e
         LEFT JOIN grupos g ON g.id = e.grupo_id
         LEFT JOIN usuarios u ON u.id = e.registrado_por
        WHERE e.poligono_id = $1
        ORDER BY e.registrado_en DESC, e.id`,
      [poligonoId]),
  ]);
  return { ...poligono, asistieron: asistieron.rows, listaTracks: tracks.rows, historial: historial.rows };
}

/** Errores de la base traducidos a lo que dicen los CU (27 4.2 y 2.3). */
function comoErrorDePoligono(err) {
  if (err.code === '23505' && String(err.constraint ?? '').includes('poligono_nombre_unico')) {
    return new ReglaError(409, 'nombre_duplicado', 'Ya existe un polígono con ese nombre en este operativo.');
  }
  if (err.code === '23514' && String(err.constraint ?? '').includes('poligono_geom_valida')) {
    return new ReglaError(400, 'geometria_invalida', 'Los bordes del polígono no pueden cruzarse.');
  }
  if (err.code === 'XX000' && /GeoJSON|geometry/i.test(err.message)) {
    return new ReglaError(400, 'geometria_invalida', 'La forma del polígono no es válida.');
  }
  return err;
}

/* ── CU-40 · Cobertura ─────────────────────────────────────────────────── */

/**
 * Cobertura = parte del polígono que quedó a menos de ANCHO_BARRIDO_M de algún
 * track vigente asociado a él (de cualquier grupo y fecha), con área exacta.
 * Guarda también los km recorridos dentro y las brechas (lo no revisado).
 */
export async function recalcularCoberturaCon(client, poligonoId) {
  await client.query(
    `WITH p AS (SELECT id, geom, area_m2 FROM poligonos WHERE id = $1),
          trazas AS (SELECT ST_Force2D(geom) AS g FROM tracks_gpx WHERE poligono_id = $1 AND eliminado_en IS NULL),
          franjas AS (SELECT ST_Union(ST_Buffer(g::geography, $2)::geometry) AS g FROM trazas),
          cubierto AS (
            SELECT CASE WHEN f.g IS NULL THEN NULL ELSE ST_Intersection(p.geom, f.g) END AS g
              FROM p, franjas f),
          recorrido AS (
            SELECT COALESCE(sum(ST_Length(ST_Intersection(p.geom, t.g)::geography)), 0) AS m
              FROM p, trazas t)
     UPDATE poligonos pol
        SET cobertura_pct = LEAST(100, round((COALESCE(ST_Area(c.g::geography), 0) / NULLIF(p.area_m2, 0) * 100)::numeric, 2)),
            cobertura_km  = round((r.m / 1000)::numeric, 3),
            brechas       = CASE WHEN c.g IS NULL THEN NULL ELSE ST_Difference(p.geom, c.g) END,
            cobertura_calculada_en = CURRENT_TIMESTAMP
       FROM p, cubierto c, recorrido r
      WHERE pol.id = p.id`,
    [poligonoId, ANCHO_BARRIDO_M]
  );
}

/* ── CU-29 · Dibujar ───────────────────────────────────────────────────── */

/**
 * @param geojson  texto GeoJSON de un Polygon ya validado por el controlador
 * @param grupoId  opcional: asignarlo en el mismo paso (reglas del CU-30)
 */
export async function crear(operativoId, { nombre, geojson, notas = null, grupoId = null }, usuarioId) {
  try {
    const id = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO poligonos (operativo_id, nombre, geom, notas, creado_por)
         VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5)
         RETURNING id, round(area_m2)::int AS "areaM2"`,
        [operativoId, nombre, geojson, notas, usuarioId]
      );
      const { id: nuevoId, areaM2 } = rows[0];
      await Asig.registrarEvento(client, {
        poligonoId: nuevoId, operativoId, tipo: 'CREADO', detalle: { nombre, areaM2 }, usuarioId,
      });
      if (grupoId) {
        await Grupo.accionCoordinadorCon(client, operativoId, grupoId, 'asignar', { poligonoId: nuevoId }, usuarioId);
      }
      return nuevoId;
    });
    return detalle(operativoId, id);
  } catch (err) { throw comoErrorDePoligono(err); }
}

/* ── CU-37 · Modificar (forma, nombre, notas) ──────────────────────────── */

export async function actualizar(operativoId, poligonoId, { nombre, notas, geojson, color }, usuarioId) {
  try {
    await withTransaction(async (client) => {
      const previo = await Asig.bloquearPoligono(client, operativoId, poligonoId);
      const { rows: [actual] } = await client.query(
        `SELECT notas, color, round(area_m2)::int AS "areaM2" FROM poligonos WHERE id = $1`, [poligonoId]);

      if (nombre !== undefined && nombre !== previo.nombre) {
        await client.query(`UPDATE poligonos SET nombre = $2, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1`, [poligonoId, nombre]);
        await Asig.registrarEvento(client, {
          poligonoId, operativoId, tipo: 'NOMBRE', detalle: { anterior: previo.nombre, nuevo: nombre }, usuarioId,
        });
      }
      if (notas !== undefined && (notas ?? '') !== (actual.notas ?? '')) {
        await client.query(`UPDATE poligonos SET notas = $2, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1`, [poligonoId, notas]);
        await Asig.registrarEvento(client, {
          poligonoId, operativoId, tipo: 'NOTAS', detalle: { anterior: actual.notas, nueva: notas }, usuarioId,
        });
      }
      // Color propio (028): null lo devuelve al de su grupo. Queda en el historial del polígono.
      if (color !== undefined && (color ?? null) !== (actual.color ?? null)) {
        await client.query(`UPDATE poligonos SET color = $2, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1`, [poligonoId, color]);
        await Asig.registrarEvento(client, {
          poligonoId, operativoId, tipo: 'COLOR', detalle: { anterior: actual.color, nuevo: color }, usuarioId,
        });
      }
      if (geojson !== undefined) {
        const { rows } = await client.query(
          `UPDATE poligonos SET geom = ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), actualizado_en = CURRENT_TIMESTAMP
            WHERE id = $1 RETURNING round(area_m2)::int AS "areaM2"`,
          [poligonoId, geojson]
        );
        await Asig.registrarEvento(client, {
          poligonoId, operativoId, tipo: 'GEOMETRIA',
          detalle: { areaAnteriorM2: actual.areaM2, areaNuevaM2: rows[0].areaM2 }, usuarioId,
        });
        // La cobertura sólo cuenta lo recorrido dentro de la forma nueva.
        await recalcularCoberturaCon(client, poligonoId);
      }
    });
    return detalle(operativoId, poligonoId);
  } catch (err) { throw comoErrorDePoligono(err); }
}

/* ── CU-38 · Eliminar (baja con registro) ──────────────────────────────── */

/**
 * No se puede con un grupo trabajando en el polígono. Los grupos Asignados
 * (que todavía no salieron) vuelven a Confirmado; los tracks quedan «fuera de
 * polígono». Todo queda en el historial y se recupera a pedido.
 */
export async function eliminar(operativoId, poligonoId, usuarioId) {
  return withTransaction(async (client) => {
    const poligono = await Asig.bloquearPoligono(client, operativoId, poligonoId);
    const grupos = await Asig.gruposVigentes(client, poligonoId);
    const enTerreno = grupos.find(g => EN_TERRENO.includes(g.estado));
    if (enTerreno) {
      throw new ReglaError(409, 'grupo_en_terreno',
        `No se puede eliminar: ${enTerreno.nombre} está trabajando en este polígono.`);
    }
    const t = new Date();
    for (const g of grupos) {
      await Asig.cerrarAsignacionDeGrupo(client, g, { motivo: 'POLIGONO_ELIMINADO', usuarioId, t });
      if (g.estado === 'ASIGNADO') {
        await Grupo.accionCoordinadorCon(client, operativoId, g.id, 'desasignar',
          { motivo: `Se eliminó ${poligono.nombre}` }, usuarioId);
      }
    }
    const { rowCount: tracksSueltos } = await client.query(
      `UPDATE tracks_gpx SET poligono_id = NULL WHERE poligono_id = $1 AND eliminado_en IS NULL`, [poligonoId]);
    await client.query(
      `UPDATE poligonos SET eliminado_en = CURRENT_TIMESTAMP, eliminado_por = $2, actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [poligonoId, usuarioId]
    );
    await Asig.registrarEvento(client, {
      poligonoId, operativoId, tipo: 'ELIMINADO',
      detalle: { nombre: poligono.nombre, gruposLiberados: grupos.map(g => g.nombre), tracksFueraDePoligono: tracksSueltos },
      usuarioId, t,
    });
    return { poligono, gruposLiberados: grupos.length, tracksFueraDePoligono: tracksSueltos };
  });
}

/* ── CU-30 · Grupos en el polígono ─────────────────────────────────────── */

/** Asignar un grupo Confirmado: pasa a Asignado (reglas en grupo.model y poligonoAsignacion). */
export async function asignarGrupo(operativoId, poligonoId, grupoId, usuarioId) {
  await withTransaction(async (client) => {
    await Grupo.accionCoordinadorCon(client, operativoId, grupoId, 'asignar', { poligonoId }, usuarioId);
  });
  return detalle(operativoId, poligonoId);
}

/**
 * Quitar un grupo del polígono.
 *   · Asignado (todavía no salió) → vuelve a Confirmado, libre para otro polígono.
 *   · En el terreno → sólo con `confirmar`: el polígono queda sin ese grupo
 *     mientras el personal sigue afuera; el grupo conserva su estado.
 */
export async function quitarGrupo(operativoId, poligonoId, grupoId, { confirmar = false } = {}, usuarioId) {
  await withTransaction(async (client) => {
    const poligono = await Asig.bloquearPoligono(client, operativoId, poligonoId);
    const grupo = (await Asig.gruposVigentes(client, poligonoId)).find(g => g.id === grupoId);
    if (!grupo) throw new ReglaError(404, 'grupo_no_asignado', 'Ese grupo no está en este polígono.');

    if (grupo.estado === 'ASIGNADO') {
      await Grupo.accionCoordinadorCon(client, operativoId, grupoId, 'desasignar',
        { motivo: `Quitado de ${poligono.nombre}` }, usuarioId);
      return;
    }
    if (!confirmar) {
      throw new ReglaError(409, 'requiere_confirmacion',
        `${grupo.nombre} está en el terreno. Si lo quitás, el polígono queda sin ese grupo mientras el personal sigue afuera.`);
    }
    const t = new Date();
    await Asig.cerrarAsignacionDeGrupo(client, grupo, { motivo: 'QUITADO', usuarioId, t });
    // La línea de tiempo del grupo también lo cuenta (el estado no cambia).
    await Evento.registrar(client, {
      operativoId, entidad: 'GRUPO', grupoId, accion: 'quitar_poligono',
      estadoAnterior: grupo.estado, estadoNuevo: grupo.estado, ocurridoEn: t,
      registradoPor: usuarioId, fuente: 'COORDINADOR', motivo: `Quitado de ${poligono.nombre} estando en el terreno`,
    });
  });
  return detalle(operativoId, poligonoId);
}

/** Cambiar el grupo de un polígono: sólo si el actual todavía no salió (Asignado). */
export async function cambiarGrupo(operativoId, poligonoId, grupoId, nuevoGrupoId, usuarioId) {
  if (grupoId === nuevoGrupoId) throw new ReglaError(400, 'mismo_grupo', 'Elegí un grupo distinto del actual.');
  await withTransaction(async (client) => {
    const poligono = await Asig.bloquearPoligono(client, operativoId, poligonoId);
    const actual = (await Asig.gruposVigentes(client, poligonoId)).find(g => g.id === grupoId);
    if (!actual) throw new ReglaError(404, 'grupo_no_asignado', 'Ese grupo no está en este polígono.');
    if (actual.estado !== 'ASIGNADO') {
      throw new ReglaError(409, 'cambio_no_permitido',
        `${actual.nombre} ya salió al terreno: no se puede cambiar. Se puede quitar, o esperar a que se repliegue.`);
    }
    await Asig.cerrarAsignacionDeGrupo(client, actual, { motivo: 'CAMBIADO', usuarioId, t: new Date() });
    await Grupo.accionCoordinadorCon(client, operativoId, grupoId, 'desasignar',
      { motivo: `Reemplazado en ${poligono.nombre}` }, usuarioId);
    await Grupo.accionCoordinadorCon(client, operativoId, nuevoGrupoId, 'asignar', { poligonoId }, usuarioId);
  });
  return detalle(operativoId, poligonoId);
}

/**
 * Portal del agente («Mi sector», diseño CALÍVAR del 23/10): sólo lo que el agente necesita para
 * ubicarse — nombre, forma, área, perímetro, notas y cobertura —, sin el historial ni los tracks ajenos.
 */
export async function paraAgente(operativoId, poligonoId) {
  const { rows } = await query(
    `SELECT p.id, p.nombre, p.notas,
            ST_AsGeoJSON(p.geom)::json AS geometria,
            round(p.area_m2)::int      AS "areaM2",
            round(p.perimetro_m)::int  AS "perimetroM",
            p.cobertura_pct::float     AS "coberturaPct"
       FROM poligonos p
      WHERE p.id = $1 AND p.operativo_id = $2 AND p.eliminado_en IS NULL`,
    [poligonoId, operativoId]
  );
  return rows[0] ?? null;
}
