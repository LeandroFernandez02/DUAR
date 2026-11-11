/**
 * MODELO · Paneles de control (11/11)
 *
 * Una sola consulta por panel, con lo justo para las cifras (sin geometrías ni fotos):
 *  · panelOperativo(id): todo el Panel del operativo de una vez (antes eran 7 pedidos y dos de
 *    ellos traían la forma de cada polígono y el trazado de cada GPX, que el panel no usa).
 *  · panelGeneral(): los operativos (no eliminados) con lo que muestra el Panel general. El
 *    período lo filtra la pantalla (utils/panelGeneral.ts).
 * Las consultas de cada panel corren en paralelo.
 */
import { query } from '../config/db.js';
import * as Estado from './operativoEstado.model.js';
import * as AgenteOperativo from './agenteOperativo.model.js';
import * as Grupo from './grupo.model.js';
import * as Poligono from './poligono.model.js';

/* ── Panel del operativo ────────────────────────────────────────────────── */

export async function panelOperativo(operativoId) {
  const [personal, grupos, { rows: poligonos }, { rows: marcadores }, { rows: radios }, { rows: tracks }, participaciones, cobertura] = await Promise.all([
    AgenteOperativo.listarDeOperativo(operativoId),
    Grupo.listarDeOperativo(operativoId),
    query(
      `SELECT p.id, p.nombre, p.cobertura_pct::float AS "coberturaPct", p.creado_en AS "creadoEn",
              COALESCE((
                SELECT json_agg(json_build_object('id', g.id, 'nombre', g.nombre, 'clase', g.clase::text,
                                                  'estado', g.estado::text, 'color', g.color) ORDER BY pg.asignado_en)
                  FROM poligono_grupos pg JOIN grupos g ON g.id = pg.grupo_id
                 WHERE pg.poligono_id = p.id AND pg.salida_en IS NULL), '[]') AS grupos
         FROM poligonos p
        WHERE p.operativo_id = $1 AND p.eliminado_en IS NULL
        ORDER BY p.creado_en`,
      [operativoId]
    ),
    query(
      `SELECT clase::text AS clase, count(*)::int AS n FROM marcadores
        WHERE operativo_id = $1 AND eliminado_en IS NULL GROUP BY clase`,
      [operativoId]
    ),
    query(`SELECT radio_m::float AS "radioM" FROM radios_operativo WHERE operativo_id = $1 AND eliminado_en IS NULL`, [operativoId]),
    query(
      `SELECT poligono_id AS "poligonoId", distancia_m::float AS "distanciaM", fin, cargado_en AS "cargadoEn"
         FROM tracks_gpx WHERE operativo_id = $1 AND eliminado_en IS NULL`,
      [operativoId]
    ),
    AgenteOperativo.despliegueDeOperativo(operativoId),
    Poligono.historialCobertura(operativoId),
  ]);
  const cuenta = c => marcadores.find(m => m.clase === c)?.n ?? 0;
  return {
    personal,
    grupos,
    poligonos,
    marcadores: { poi: cuenta('POI'), hallazgos: cuenta('HALLAZGO') },
    radios: radios.map(r => r.radioM),
    tracks,
    participaciones,
    cobertura,
  };
}

/* ── Panel general ──────────────────────────────────────────────────────── */

export async function panelGeneral() {
  // Igual que el listado de Operativos: primero se pone al día el Inactivo automático (48 h).
  await Estado.sincronizar().catch(err => console.error('[estado] no se pudo sincronizar:', err.message));
  const [{ rows: ops }, { rows: part }, { rows: cob }, { rows: km }, { rows: grupos }] = await Promise.all([
    query(
      `SELECT o.id, o.titulo, o.localidad, o.estado::text AS estado,
              o.fecha_hora_inicio AS inicio, o.fecha_hora_fin AS fin, o.resultado::text AS resultado,
              extensions.ST_Y(o.punto_cero) AS lat, extensions.ST_X(o.punto_cero) AS lng,
              (SELECT u.nombre || ' ' || u.apellido FROM jefes_operativo j JOIN usuarios u ON u.id = j.usuario_id
                WHERE j.operativo_id = o.id AND j.hasta IS NULL LIMIT 1) AS jefe
         FROM operativos o
        WHERE o.eliminado_en IS NULL
        ORDER BY o.fecha_hora_inicio`
    ),
    // Cada persona una vez por operativo (su última participación), con la foto legal (034) o su perfil.
    query(
      `SELECT x.operativo_id AS "operativoId", x.institucion, x.dependencia, x.especialidad,
              count(*)::int AS total,
              count(*) FILTER (WHERE x.vigente)::int AS vigentes,
              count(*) FILTER (WHERE x.vigente AND x.estado IN ('DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO'))::int AS terreno,
              count(*) FILTER (WHERE x.vigente AND x.estado = 'NO_DISPONIBLE')::int AS "noDisponible"
         FROM (
           SELECT DISTINCT ON (ao.operativo_id, ao.usuario_id)
                  ao.operativo_id, ao.estado::text AS estado, ao.fecha_egreso IS NULL AS vigente,
                  COALESCE(ao.institucion_nombre, i.nombre) AS institucion,
                  COALESCE(ao.dependencia_nombre, d.nombre) AS dependencia,
                  COALESCE(ao.especialidad_nombre, e.nombre) AS especialidad
             FROM agentes_operativo ao
             JOIN usuarios u ON u.id = ao.usuario_id
             LEFT JOIN cat_instituciones i ON i.id = u.institucion_id
             LEFT JOIN cat_dotaciones d ON d.id = u.dotacion_id
             LEFT JOIN cat_especialidades e ON e.id = ao.especialidad_id
            ORDER BY ao.operativo_id, ao.usuario_id, ao.fecha_ingreso DESC
         ) x
        GROUP BY 1, 2, 3, 4`
    ),
    query(
      `SELECT operativo_id AS "operativoId", sum(area_m2 * cobertura_pct / 100)::float / 10000 AS ha
         FROM poligonos WHERE eliminado_en IS NULL GROUP BY 1`
    ),
    query(
      `SELECT operativo_id AS "operativoId", sum(distancia_m)::float / 1000 AS km
         FROM tracks_gpx WHERE eliminado_en IS NULL GROUP BY 1`
    ),
    query(
      `SELECT operativo_id AS "operativoId", count(*)::int AS total,
              count(*) FILTER (WHERE estado IN ('DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO'))::int AS "enTerreno"
         FROM grupos WHERE eliminado_en IS NULL AND estado <> 'DISUELTO' GROUP BY 1`
    ),
  ]);

  const porOp = new Map(ops.map(o => [o.id, {
    id: o.id, titulo: o.titulo, localidad: o.localidad, estado: o.estado, inicio: o.inicio, fin: o.fin, resultado: o.resultado,
    puntoCero: [o.lat, o.lng], coordinador: o.jefe, conCoordinador: !!o.jefe, objetivo: null, areas: [],
    agentes: { terreno: 0, base: 0, noDisponible: 0 }, agentesAsignados: 0,
    instituciones: [], especialidades: [], aporte: {}, aporteDependencias: {}, porEspecialidad: {},
    coberturaHa: 0, tracksKm: 0, grupos: { total: 0, enTerreno: 0 }, recursosCriticos: {},
  }]));
  const sumar = (m, k, n) => { if (k) m[k] = (m[k] ?? 0) + n; };
  for (const p of part) {
    const o = porOp.get(p.operativoId);
    if (!o) continue;
    sumar(o.aporte, p.institucion, p.total);
    if (p.institucion && p.dependencia) sumar(o.aporteDependencias[p.institucion] ??= {}, p.dependencia, p.total);
    sumar(o.porEspecialidad, p.especialidad, p.total);
    o.agentesAsignados += p.vigentes;
    o.agentes.terreno += p.terreno;
    o.agentes.noDisponible += p.noDisponible;
    o.agentes.base += p.vigentes - p.terreno - p.noDisponible;
  }
  for (const c of cob) { const o = porOp.get(c.operativoId); if (o) o.coberturaHa = Math.round(c.ha); }
  for (const k of km) { const o = porOp.get(k.operativoId); if (o) o.tracksKm = Math.round(k.km); }
  for (const g of grupos) { const o = porOp.get(g.operativoId); if (o) o.grupos = { total: g.total, enTerreno: g.enTerreno }; }
  for (const o of porOp.values()) {
    o.instituciones = Object.keys(o.aporte);
    o.especialidades = Object.keys(o.porEspecialidad);
  }
  return [...porOp.values()];
}

