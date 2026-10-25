/**
 * MODELO · Informe por operativo (CU-41)
 *
 * Dos partes:
 *   · El registro de informes emitidos (`informes_operativo`, migración 021):
 *     código, tipo, hora de corte, autor y huella SHA-256 del PDF guardado.
 *     La base no deja modificarlos ni borrarlos.
 *   · `reunirDatos`: todo lo que va en el PDF, leído de una vez. Las horas
 *     son las del hecho (`ocurrido_en`), no las de carga; cuando difieren,
 *     el informe lo aclara.
 *
 * El informe usa lo vigente al momento de generarlo: un parcial tiene como
 * corte "ahora" y el final la hora de fin del operativo, cuando ya nada
 * puede cambiar (CU-10, inmutabilidad).
 */
import { RESULTADOS_OPERATIVO } from '../utils/validaciones.js';
import { query } from '../config/db.js';
import { ETIQUETA_GRUPO, EN_OPERACION } from './estados.js';

/* ── Registro de informes emitidos ─────────────────────────────────────── */

const CAMPOS = `
  i.id, i.codigo, i.operativo_id AS "operativoId", i.numero_en_operativo AS "numeroEnOperativo",
  i.tipo, i.corte_en AS "corteEn", i.generado_en AS "generadoEn",
  i.sha256, i.tamano_bytes AS "tamanoBytes", i.archivo_ruta AS "archivoRuta",
  u.nombre || ' ' || u.apellido AS "generadoPor"
`;

/** Informes emitidos de un operativo, del más nuevo al más viejo. */
export async function listar(operativoId) {
  const { rows } = await query(
    `SELECT ${CAMPOS} FROM informes_operativo i JOIN usuarios u ON u.id = i.generado_por
      WHERE i.operativo_id = $1 ORDER BY i.numero_en_operativo DESC`, [operativoId]);
  return rows;
}

export async function buscar(operativoId, informeId) {
  const { rows } = await query(
    `SELECT ${CAMPOS} FROM informes_operativo i JOIN usuarios u ON u.id = i.generado_por
      WHERE i.operativo_id = $1 AND i.id = $2`, [operativoId, informeId]);
  return rows[0] ?? null;
}

export async function finalDe(operativoId) {
  const { rows } = await query(
    `SELECT ${CAMPOS} FROM informes_operativo i JOIN usuarios u ON u.id = i.generado_por
      WHERE i.operativo_id = $1 AND i.tipo = 'FINAL'`, [operativoId]);
  return rows[0] ?? null;
}

/**
 * Lo que muestra la página pública de verificación (CU-41 N1): nada personal
 * ni del contenido. Sólo el código, el tipo, las fechas, el operativo por su
 * código corto y la huella guardada.
 */
export async function paraVerificar(codigo) {
  const { rows } = await query(
    `SELECT i.codigo, i.tipo, i.corte_en AS "corteEn", i.generado_en AS "generadoEn",
            i.sha256, i.tamano_bytes AS "tamanoBytes", i.operativo_id AS "operativoId"
       FROM informes_operativo i WHERE upper(i.codigo) = upper($1)`, [String(codigo).trim()]);
  if (!rows[0]) return null;
  const { operativoId, ...r } = rows[0];
  return { ...r, operativoCodigo: codigoOperativo(operativoId) };
}

/**
 * Reserva código y número antes de armar el PDF (los dos van impresos en él).
 * Si después falla el guardado, ese número del año queda sin informe: el
 * correlativo puede tener huecos, nunca repetidos.
 */
export async function reservarCodigo(operativoId) {
  const { rows: [r] } = await query(
    `SELECT nextval('informes_numero_seq') AS seq,
            (SELECT COALESCE(max(numero_en_operativo), 0) + 1 FROM informes_operativo WHERE operativo_id = $1) AS numero,
            to_char(now() AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY') AS anio`, [operativoId]);
  return {
    codigo: `INF-${r.anio}-${String(r.seq).padStart(4, '0')}`,
    numeroEnOperativo: Number(r.numero),
  };
}

export async function registrar({ codigo, operativoId, numeroEnOperativo, tipo, corteEn, generadoPor, sha256, tamanoBytes, archivoRuta }) {
  const { rows } = await query(
    `INSERT INTO informes_operativo
       (codigo, operativo_id, numero_en_operativo, tipo, corte_en, generado_por, sha256, tamano_bytes, archivo_ruta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [codigo, operativoId, numeroEnOperativo, tipo, corteEn, generadoPor, sha256, tamanoBytes, archivoRuta]);
  return rows[0].id;
}

/** Código corto y legible del operativo (su id es un UUID): OP-7F3A2C1B. */
export function codigoOperativo(operativoId) {
  return `OP-${String(operativoId).replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

/* ── Datos del PDF ─────────────────────────────────────────────────────── */

const nombre = alias => `${alias}.nombre || ' ' || ${alias}.apellido`;

/** Todo lo que va en el informe. `corteEn` es la hora hasta la que cubre. */
export async function reunirDatos(operativoId, corteEn) {
  const q = (sql, p = [operativoId]) => query(sql, p).then(r => r.rows);

  const [operativo] = await q(
    `SELECT o.id, o.titulo, o.localidad, o.fiscal_instruccion AS "fiscalInstruccion", o.descripcion, o.nota_final AS "notaFinal", o.resultado::text AS resultado,
            o.estado::text AS estado, o.fecha_hora_inicio AS "fechaHoraInicio", o.fecha_hora_fin AS "fechaHoraFin",
            o.creado_en AS "creadoEn", ST_Y(o.punto_cero) AS "puntoCeroLat", ST_X(o.punto_cero) AS "puntoCeroLng",
            ${nombre('u')} AS "creadoPor"
       FROM operativos o LEFT JOIN usuarios u ON u.id = o.coordinador_id
      WHERE o.id = $1`);
  if (!operativo) return null;

  const [
    objetivo, hallazgos, poligonos, tracks, marcadores, radios, puntoCero,
    grupos, eventosGrupo, eventosAgente, personal, mandos, presencias,
    eventosPoligono, auditoriaOperativo, informesPrevios,
  ] = await Promise.all([
    q(`SELECT ob.*, ob.tipo::text AS tipo, ob.genero::text AS genero,
              COALESCE((SELECT json_agg(f.url_foto ORDER BY f.creado_en) FROM fotos_objetivo f
                         WHERE f.objetivo_id = ob.id AND f.eliminado_en IS NULL), '[]') AS fotos   -- Testeo 25/10, punto 38
         FROM objetivo_buscado ob WHERE ob.operativo_id = $1`),
    q(`SELECT m.id, m.nombre, m.descripcion, m.detalle, m.creado_en AS "creadoEn",
              ST_Y(m.geom) AS lat, ST_X(m.geom) AS lng, ${nombre('u')} AS "registradoPor",
              (SELECT p.nombre FROM poligonos p WHERE p.operativo_id = m.operativo_id AND p.eliminado_en IS NULL
                  AND ST_Contains(p.geom, m.geom) ORDER BY p.creado_en LIMIT 1) AS poligono,
              COALESCE((SELECT json_agg(f.url_foto ORDER BY f.creado_en) FROM marcador_fotos f
                         WHERE f.marcador_id = m.id AND f.eliminado_en IS NULL), '[]') AS fotos
         FROM marcadores m LEFT JOIN usuarios u ON u.id = m.creado_por
        WHERE m.operativo_id = $1 AND m.clase = 'HALLAZGO'
        ORDER BY m.creado_en`),
    q(`SELECT p.id, p.nombre, p.area_m2 AS "areaM2", p.cobertura_pct::float AS "coberturaPct",
              p.cobertura_km::float AS "coberturaKm", p.creado_en AS "creadoEn",
              ST_AsGeoJSON(p.geom, 6)::json AS geom,
              (SELECT count(*)::int FROM tracks_gpx t WHERE t.poligono_id = p.id AND t.eliminado_en IS NULL) AS tracks,
              COALESCE((SELECT json_agg(x.nombre ORDER BY x.desde) FROM (
                  SELECT g.nombre, min(pg.asignado_en) AS desde FROM poligono_grupos pg JOIN grupos g ON g.id = pg.grupo_id
                   WHERE pg.poligono_id = p.id GROUP BY g.nombre) x), '[]') AS grupos,
              COALESCE(p.color, (SELECT g.color FROM poligono_grupos pg JOIN grupos g ON g.id = pg.grupo_id
                WHERE pg.poligono_id = p.id AND g.clase = 'RASTRILLAJE' ORDER BY pg.asignado_en DESC LIMIT 1)) AS color
         FROM poligonos p WHERE p.operativo_id = $1 AND p.eliminado_en IS NULL
        ORDER BY p.creado_en`),
    q(`SELECT t.id, t.archivo_nombre AS "archivoNombre", g.color, t.grupo_id AS "grupoId",
              ST_AsGeoJSON(ST_SimplifyPreserveTopology(ST_Force2D(t.geom), 0.00002), 6)::json AS geom
         FROM tracks_gpx t LEFT JOIN grupos g ON g.id = t.grupo_id
        WHERE t.operativo_id = $1 AND t.eliminado_en IS NULL`),
    q(`SELECT m.clase, m.tipo_instalacion AS "tipoInstalacion", m.nombre, ST_Y(m.geom) AS lat, ST_X(m.geom) AS lng
         FROM marcadores m WHERE m.operativo_id = $1 AND m.eliminado_en IS NULL`),
    q(`SELECT radio_m AS "radioM", color FROM radios_operativo WHERE operativo_id = $1 AND eliminado_en IS NULL ORDER BY radio_m`),
    q(`SELECT ST_Y(h.desde) AS "desdeLat", ST_X(h.desde) AS "desdeLng", ST_Y(h.hasta) AS "hastaLat", ST_X(h.hasta) AS "hastaLng",
              round(h.distancia_m)::int AS "distanciaM", h.motivo, h.registrado_en AS "registradoEn", ${nombre('u')} AS "registradoPor"
         FROM punto_cero_historial h LEFT JOIN usuarios u ON u.id = h.registrado_por
        WHERE h.operativo_id = $1 ORDER BY h.registrado_en, h.id`),
    q(`SELECT g.id, g.nombre, g.clase::text AS clase, g.color, g.estado::text AS estado, g.creado_en AS "creadoEn",
              g.eliminado_en AS "eliminadoEn", ${nombre('ul')} AS lider,
              -- grupos no guarda quién lo creó: lo dice el alta en la auditoría (recorrido del 19/10).
              (SELECT ${nombre('uc')} FROM logs_auditoria la JOIN usuarios uc ON uc.id = la.usuario_id
                WHERE la.entidad_afectada = 'grupos' AND la.registro_id = g.id AND la.accion = 'CREAR'
                ORDER BY la.creado_en LIMIT 1) AS "creadoPor",
              (SELECT count(DISTINCT x.id)::int FROM (
                  SELECT e.agente_operativo_id AS id FROM eventos_estado e
                   WHERE e.grupo_id = g.id AND e.entidad = 'AGENTE' AND e.agente_operativo_id IS NOT NULL
                  UNION SELECT ao.id FROM agentes_operativo ao WHERE ao.grupo_id = g.id) x) AS integrantes,
              (SELECT count(*)::int FROM eventos_estado e WHERE e.grupo_id = g.id AND e.accion = 'retiro') AS retiros,
              COALESCE((SELECT json_agg(DISTINCT p.nombre) FROM poligono_grupos pg JOIN poligonos p ON p.id = pg.poligono_id
                         WHERE pg.grupo_id = g.id), '[]') AS poligonos
         FROM grupos g
         LEFT JOIN agentes_operativo al ON al.id = g.lider_id
         LEFT JOIN usuarios ul ON ul.id = al.usuario_id
        WHERE g.operativo_id = $1 ORDER BY g.creado_en`),
    q(`SELECT e.grupo_id AS "grupoId", g.nombre AS grupo, e.accion, e.estado_anterior AS "estadoAnterior",
              e.estado_nuevo AS "estadoNuevo", e.ocurrido_en AS "ocurridoEn", e.registrado_en AS "registradoEn",
              e.fuente, e.motivo, e.nota, e.hora_confiable AS "horaConfiable", ${nombre('u')} AS "registradoPor",
              (SELECT min(c.ocurrido_en) FROM eventos_estado c WHERE c.confirma_evento_id = e.id) AS "confirmadoEn"
         FROM eventos_estado e JOIN grupos g ON g.id = e.grupo_id LEFT JOIN usuarios u ON u.id = e.registrado_por
        WHERE e.operativo_id = $1 AND e.entidad = 'GRUPO' AND e.resultado = 'APLICADO' AND e.confirma_evento_id IS NULL
        ORDER BY e.ocurrido_en, e.registrado_en`),
    q(`SELECT e.accion, e.ocurrido_en AS "ocurridoEn", e.fuente, e.motivo, g.nombre AS grupo,
              ${nombre('ua')} AS agente, ${nombre('u')} AS "registradoPor"
         FROM eventos_estado e
         JOIN agentes_operativo ao ON ao.id = e.agente_operativo_id JOIN usuarios ua ON ua.id = ao.usuario_id
         LEFT JOIN grupos g ON g.id = e.grupo_id LEFT JOIN usuarios u ON u.id = e.registrado_por
        WHERE e.operativo_id = $1 AND e.entidad = 'AGENTE' AND e.accion IN ('alta', 'retiro', 'baja')
        ORDER BY e.ocurrido_en, e.registrado_en`),
    q(`SELECT u.apellido, u.nombre, u.dni, i.nombre AS institucion, e.nombre AS especialidad, ao.es_conductor AS "esConductor",
              ao.fecha_ingreso AS "ingreso", ao.fecha_egreso AS "egreso",
              EXISTS (SELECT 1 FROM grupos gl WHERE gl.lider_id = ao.id) AS "fueLider",
              COALESCE((SELECT json_agg(DISTINCT g.nombre) FROM grupos g WHERE g.id = ao.grupo_id OR g.id IN (
                  SELECT ev.grupo_id FROM eventos_estado ev WHERE ev.agente_operativo_id = ao.id AND ev.grupo_id IS NOT NULL)), '[]') AS grupos
         FROM agentes_operativo ao
         JOIN usuarios u ON u.id = ao.usuario_id
         LEFT JOIN cat_instituciones i ON i.id = u.institucion_id
         LEFT JOIN cat_especialidades e ON e.id = ao.especialidad_id
        WHERE ao.operativo_id = $1
        ORDER BY u.apellido, u.nombre, ao.fecha_ingreso`),
    q(`SELECT ${nombre('u')} AS nombre, m.desde, m.hasta, m.motivo_fin AS motivo, ${nombre('ua')} AS "asignadoPor"
         FROM mando_operativo m JOIN usuarios u ON u.id = m.usuario_id LEFT JOIN usuarios ua ON ua.id = m.asignado_por
        WHERE m.operativo_id = $1 ORDER BY m.desde`),
    q(`SELECT ${nombre('u')} AS nombre, p.ingreso_en AS desde, p.egreso_en AS hasta, p.motivo_egreso AS motivo,
              ${nombre('ui')} AS "ingresoPor", ${nombre('ue')} AS "egresoPor"
         FROM presencias_mando p JOIN usuarios u ON u.id = p.usuario_id
         LEFT JOIN usuarios ui ON ui.id = p.ingreso_por LEFT JOIN usuarios ue ON ue.id = p.egreso_por
        WHERE p.operativo_id = $1 ORDER BY p.ingreso_en`),
    q(`SELECT pe.tipo, pe.detalle, pe.registrado_en AS "registradoEn", p.nombre AS poligono, g.nombre AS grupo,
              t.archivo_nombre AS track, ${nombre('u')} AS "registradoPor"
         FROM poligono_eventos pe
         JOIN poligonos p ON p.id = pe.poligono_id
         LEFT JOIN grupos g ON g.id = pe.grupo_id
         LEFT JOIN tracks_gpx t ON t.id = pe.track_id
         LEFT JOIN usuarios u ON u.id = pe.registrado_por
        WHERE pe.operativo_id = $1 ORDER BY pe.registrado_en`),
    q(`SELECT a.creado_en AS "creadoEn", a.accion, a.valores_previos->>'estado' AS "estadoPrevio",
              a.valores_nuevos->>'estado' AS "estadoNuevo", a.valores_nuevos->>'motivo' AS motivo,
              CASE WHEN a.usuario_id IS NULL THEN 'Sistema' ELSE ${nombre('u')} END AS "registradoPor"
         FROM logs_auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
        WHERE a.entidad_afectada = 'operativos' AND a.registro_id = $1 AND a.accion = 'MODIFICAR'
          AND a.valores_previos->>'estado' IS DISTINCT FROM a.valores_nuevos->>'estado'
        ORDER BY a.creado_en`),
    q(`SELECT i.codigo, i.tipo, i.generado_en AS "generadoEn", ${nombre('u')} AS "generadoPor"
         FROM informes_operativo i JOIN usuarios u ON u.id = i.generado_por
        WHERE i.operativo_id = $1 ORDER BY i.generado_en`),
  ]);

  const [bajas, otrosMarcadores, cambiosCaratula] = await Promise.all([
    q(`SELECT 'Track' AS clase, t.archivo_nombre AS nombre, t.eliminado_en AS "eliminadoEn", ${nombre('u')} AS "eliminadoPor", t.notas AS motivo
         FROM tracks_gpx t LEFT JOIN usuarios u ON u.id = t.eliminado_por WHERE t.operativo_id = $1 AND t.eliminado_en IS NOT NULL
       UNION ALL
       SELECT 'Polígono', p.nombre, p.eliminado_en, ${nombre('u')}, NULL
         FROM poligonos p LEFT JOIN usuarios u ON u.id = p.eliminado_por WHERE p.operativo_id = $1 AND p.eliminado_en IS NOT NULL
       UNION ALL
       SELECT CASE m.clase WHEN 'POI' THEN 'Punto de interés' ELSE 'Instalación' END, m.nombre, m.eliminado_en, ${nombre('u')}, NULL
         FROM marcadores m LEFT JOIN usuarios u ON u.id = m.eliminado_por WHERE m.operativo_id = $1 AND m.eliminado_en IS NOT NULL
       ORDER BY 3`),
    q(`SELECT m.clase, m.tipo_instalacion AS "tipoInstalacion", m.nombre, m.creado_en AS "creadoEn", ${nombre('u')} AS "registradoPor"
         FROM marcadores m LEFT JOIN usuarios u ON u.id = m.creado_por
        WHERE m.operativo_id = $1 AND m.clase <> 'HALLAZGO' ORDER BY m.creado_en`),
    // CU-09 paso 6 (Testeo 25/10, punto 33): cambios de la carátula. El controlador audita el
    // operativo completo antes y después; acá se toma sólo lo que cambió.
    q(`SELECT a.creado_en AS "creadoEn",
              a.valores_previos->>'titulo' AS "tituloPrevio", a.valores_nuevos->>'titulo' AS "tituloNuevo",
              a.valores_previos->>'fiscalInstruccion' AS "fiscalPrevio", a.valores_nuevos->>'fiscalInstruccion' AS "fiscalNuevo",
              a.valores_previos->>'localidad' AS "localidadPrevia", a.valores_nuevos->>'localidad' AS "localidadNueva",
              (a.valores_previos->>'descripcion') IS DISTINCT FROM (a.valores_nuevos->>'descripcion') AS "cambiaDescripcion",
              ${nombre('u')} AS "registradoPor"
         FROM logs_auditoria a JOIN usuarios u ON u.id = a.usuario_id
        WHERE a.entidad_afectada = 'operativos' AND a.registro_id = $1 AND a.accion = 'MODIFICAR'
          AND a.valores_nuevos ? 'titulo'
        ORDER BY a.creado_en`),
  ]);

  return {
    operativo, corteEn: new Date(corteEn),
    objetivo: objetivo[0] ?? null,
    hallazgos, poligonos, tracks, marcadores, radios, puntoCero,
    grupos: grupos.map(g => ({ ...g, periodos: periodosEnTerreno(eventosGrupo.filter(e => e.grupoId === g.id)) })),
    personal, mandos, presencias, bajas,
    retiros: eventosAgente.filter(e => e.accion === 'retiro'),
    // «Baja de personal» (15/10): los retiros del grupo y quienes dejaron el operativo antes del cierre.
    bajasPersonal: eventosAgente.filter(e => e.accion === 'retiro' || (e.accion === 'baja' && e.motivo !== 'Operativo finalizado')),
    cronologia: armarCronologia({
      operativo, objetivo: objetivo[0], hallazgos, puntoCero, grupos, eventosGrupo, eventosAgente,
      mandos, presencias, eventosPoligono, otrosMarcadores, bajas, auditoriaOperativo, informesPrevios, cambiosCaratula,
    }),
  };
}

/**
 * Períodos en el terreno de un grupo: de que pasa a un estado de operación
 * (Desplegado, Rastrillando, Replegado) hasta que sale de ellos (vuelve a la
 * base o se disuelve). Con la hora del hecho.
 */
export function periodosEnTerreno(eventos) {
  const periodos = [];
  let abierto = null;
  for (const e of eventos) {
    const dentro = EN_OPERACION.includes(e.estadoNuevo);
    if (dentro && !abierto) abierto = { desde: e.ocurridoEn, hasta: null };
    if (!dentro && abierto) { abierto.hasta = e.ocurridoEn; periodos.push(abierto); abierto = null; }
  }
  if (abierto) periodos.push(abierto);
  return periodos;
}

/* ── Cronología ────────────────────────────────────────────────────────── */

/**
 * «el grupo Alfa» / «el Grupo Alfa»: si el nombre ya empieza con la palabra, no se repite
 * (recorrido del 19/10: salía «Se forma el grupo Grupo Alfa», «el polígono Polígono 1»).
 */
function elDe(palabra, nombre) {
  const n = String(nombre ?? '').trim();
  const sinTilde = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return sinTilde(n).startsWith(`${sinTilde(palabra)} `) ? `el ${n}` : `el ${palabra} ${n}`;
}

const mayuscula = s => s.charAt(0).toUpperCase() + s.slice(1);

const TEXTO_ACCION_GRUPO = {
  confirmar: g => `Se confirma ${elDe('grupo', g)}.`,
  reabrir: g => `Se reabre ${elDe('grupo', g)} para cambiar su composición.`,
  salir: g => `${g} sale hacia su polígono.`,
  llegar_poligono: g => `${g} llega al polígono y empieza a rastrillar.`,
  volver: g => `${g} emprende el regreso.`,
  llegar_base: g => `${g} vuelve a la base.`,
  disolver: g => `Se disuelve ${elDe('grupo', g)}.`,
  corregir: (g, e) => `Se corrige el estado de ${g} a «${ETIQUETA_GRUPO[e.estadoNuevo] ?? e.estadoNuevo}».`,
};

const MEDIO = {
  RADIO: 'Informado por radio',
  PORTAL_LIDER: 'Informado por el Líder desde su celular',
  PORTAL_AGENTE: 'Informado desde el celular del agente',
};

const ESTADO_OPERATIVO = {
  NUEVO: 'Nuevo', INICIADO: 'Iniciado', ACTIVO: 'Iniciado', EN_PLANIFICACION: 'En planificación', EN_PROCESO: 'En proceso',
  INACTIVO: 'Inactivo', FINALIZADO: 'Finalizado', ELIMINADO: 'Eliminado',
};

const hhmm = d => new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Cordoba' });

/** Cómo llegó un dato del terreno, si no fue en el momento. */
function notaDeOrigen(e) {
  const partes = [];
  if (MEDIO[e.fuente]) partes.push(MEDIO[e.fuente]);
  const demora = (new Date(e.registradoEn) - new Date(e.ocurridoEn)) / 60000;
  if (demora >= 2) partes.push(`registrado a las ${hhmm(e.registradoEn)}`);
  if (e.confirmadoEn) partes.push('confirmado por otra vía');
  if (e.horaConfiable === false) partes.push('la hora informada no era válida: se tomó la de registro');
  return partes.length ? partes.join('; ') + '.' : null;
}

/**
 * La historia del operativo en una sola lista, de lo más viejo a lo más nuevo.
 * Cada entrada: { en, tipo, texto, quien, nota?, clave? } (clave = hallazgos y
 * Punto Cero, que se resaltan). Las altas por QR se agrupan por hora para no
 * llenar páginas con una línea por persona (el detalle está en Personal).
 */
export function armarCronologia(d) {
  const lista = [];
  const add = (en, tipo, texto, quien, extra = {}) => en && lista.push({ en: new Date(en), tipo, texto, quien: quien ?? '—', ...extra });

  add(d.operativo.creadoEn, 'Operativo', `Se crea el operativo «${d.operativo.titulo}».`, d.operativo.creadoPor);
  for (const a of d.auditoriaOperativo) {
    if (a.estadoNuevo === 'FINALIZADO') continue;
    add(a.creadoEn, 'Operativo', `El operativo pasa a «${ESTADO_OPERATIVO[a.estadoNuevo] ?? a.estadoNuevo}»${a.motivo ? `: ${a.motivo}` : ''}.`, a.registradoPor);
  }
  if (d.operativo.fechaHoraFin) {
    const fin = d.auditoriaOperativo.find(a => a.estadoNuevo === 'FINALIZADO');
    add(d.operativo.fechaHoraFin, 'Operativo', 'Se finaliza el operativo: se libera al personal y se disuelven los grupos.', fin?.registradoPor,
      d.operativo.resultado ? { nota: `Resultado: ${RESULTADOS_OPERATIVO[d.operativo.resultado] ?? d.operativo.resultado}.` } : {});
  }
  for (const c of d.cambiosCaratula ?? []) {
    const cambios = [];
    if (c.tituloPrevio !== c.tituloNuevo) cambios.push(`Se cambia el título de «${c.tituloPrevio}» a «${c.tituloNuevo}».`);
    const fp = c.fiscalPrevio ?? null, fn = c.fiscalNuevo ?? null;
    if (fp !== fn) {
      cambios.push(!fp ? `Se asigna el fiscal de instrucción ${fn}.`
        : !fn ? `Se quita el fiscal de instrucción ${fp}.`
        : `Se cambia el fiscal de instrucción de ${fp} a ${fn}.`);
    }
    if (c.localidadPrevia !== c.localidadNueva) cambios.push(`Se cambia la localidad de ${c.localidadPrevia} a ${c.localidadNueva}.`);
    if (c.cambiaDescripcion) cambios.push('Se modifica la descripción.');
    if (cambios.length) add(c.creadoEn, 'Operativo', cambios.join(' '), c.registradoPor);
  }
  if (d.objetivo) add(d.objetivo.creado_en, 'Operativo', `Se carga la ficha ${d.objetivo.tipo === 'OBJETO' ? 'del objeto' : 'de la persona'} buscada.`, null);

  for (const m of d.mandos) add(m.desde, 'Mando', `${m.nombre} queda a cargo del puesto de comando.`, m.asignadoPor);
  for (const p of d.presencias) {
    add(p.desde, 'Mando', `${p.nombre} ingresa al puesto de comando.`, p.ingresoPor);
    if (p.hasta) add(p.hasta, 'Mando', `${p.nombre} se retira del puesto de comando.`, p.egresoPor, p.motivo ? { nota: `Motivo: ${p.motivo}` } : {});
  }

  // Altas: agrupadas por hora y fuente.
  const altas = new Map();
  for (const e of d.eventosAgente.filter(x => x.accion === 'alta')) {
    const k = `${new Date(e.ocurridoEn).toISOString().slice(0, 13)}|${e.fuente}`;
    const a = altas.get(k) ?? { desde: e.ocurridoEn, hasta: e.ocurridoEn, n: 0, fuente: e.fuente, quien: e.registradoPor };
    a.hasta = e.ocurridoEn; a.n++; altas.set(k, a);
  }
  for (const a of altas.values()) {
    const como = a.fuente === 'QR' ? ' por QR' : '';
    const rango = a.n > 1 ? ` entre las ${hhmm(a.desde)} y las ${hhmm(a.hasta)}` : '';
    add(a.desde, 'Personal', `${a.n === 1 ? 'Ingresa 1 agente' : `Ingresan ${a.n} agentes`}${como}${rango} (detalle en «Personal interviniente»).`, a.fuente === 'QR' ? 'QR' : a.quien);
  }
  for (const e of d.eventosAgente.filter(x => x.accion === 'retiro')) {
    add(e.ocurridoEn, 'Personal', `${e.agente} se retira ${e.grupo ? `d${elDe('grupo', e.grupo)}` : 'de su grupo'} y vuelve a la base.`, e.registradoPor, e.motivo ? { nota: `Motivo: ${e.motivo}` } : {});
  }
  for (const e of d.eventosAgente.filter(x => x.accion === 'baja' && x.motivo !== 'Operativo finalizado')) {
    add(e.ocurridoEn, 'Personal', `${e.agente} deja el operativo.`, e.registradoPor, e.motivo ? { nota: `Motivo: ${e.motivo}` } : {});
  }

  for (const g of d.grupos) add(g.creadoEn, 'Grupos', `Se forma ${elDe('grupo', g.nombre)}${g.clase === 'ESPECIAL' ? ' (especial)' : ''}.`, g.creadoPor);
  for (const e of d.eventosGrupo) {
    const texto = TEXTO_ACCION_GRUPO[e.accion];
    if (!texto) continue;   // asignar/desasignar: los cuenta el historial del polígono
    if (e.accion === 'disolver' && e.motivo === 'Operativo finalizado') continue;
    const nota = [notaDeOrigen(e), e.accion === 'corregir' && e.motivo ? `Motivo: ${e.motivo}` : null].filter(Boolean).join(' ');
    add(e.ocurridoEn, 'Grupos', texto(e.grupo, e), e.registradoPor, nota ? { nota } : {});
  }

  for (const h of d.hallazgos) {
    add(h.creadoEn, 'Hallazgo', `${h.nombre}${h.poligono ? `, en ${h.poligono}` : ''}.`, h.registradoPor, { clave: true });
  }
  d.puntoCero.forEach(h => {
    if (h.desdeLat == null) return;   // la definición inicial va con la creación del operativo
    add(h.registradoEn, 'Punto Cero', `El Punto Cero se mueve ${h.distanciaM != null ? `${fmtDistancia(h.distanciaM)} ` : ''}a ${coord(h.hastaLat)} ${coord(h.hastaLng)}.`,
      h.registradoPor, { clave: true, ...(h.motivo ? { nota: `Motivo: ${h.motivo}` } : {}) });
  });

  const TEXTO_POLIGONO = {
    CREADO: e => `Se dibuja ${elDe('polígono', e.poligono)}.`,
    GEOMETRIA: e => `Se modifica la forma d${elDe('polígono', e.poligono)}.`,
    ELIMINADO: e => `Se da de baja ${elDe('polígono', e.poligono)}.`,
    GRUPO_ASIGNADO: e => `Se asigna ${elDe('grupo', e.grupo ?? e.detalle?.grupo)} a${elDe('polígono', e.poligono).slice(1)}.`,
    TRACK_CARGADO: e => `Se carga el track «${e.track}» en ${e.poligono}.`,
    TRACK_ELIMINADO: e => `Se da de baja el track «${e.track}» de ${e.poligono}.`,
  };
  for (const e of d.eventosPoligono) {
    const t = TEXTO_POLIGONO[e.tipo] ?? (e.tipo.startsWith('GRUPO_') && e.tipo !== 'GRUPO_ASIGNADO'
      ? (x => `${mayuscula(elDe('grupo', x.grupo ?? x.detalle?.grupo))} deja ${elDe('polígono', x.poligono)}.`) : null);
    if (t) add(e.registradoEn, 'Mapa', t(e), e.registradoPor);
  }
  for (const m of d.otrosMarcadores) {
    add(m.creadoEn, 'Mapa', m.clase === 'POI' ? `Se marca el punto de interés «${m.nombre}».` : `Se marca la instalación «${m.nombre}».`, m.registradoPor);
  }
  for (const b of d.bajas.filter(x => x.clase !== 'Track' && x.clase !== 'Polígono')) {
    add(b.eliminadoEn, 'Mapa', `Se da de baja ${b.clase === 'Punto de interés' ? 'el punto de interés' : 'la instalación'} «${b.nombre}».`, b.eliminadoPor);
  }
  for (const i of d.informesPrevios) {
    add(i.generadoEn, 'Informe', `Se emite el informe ${i.tipo === 'FINAL' ? 'final' : 'parcial'} ${i.codigo}.`, i.generadoPor);
  }

  return lista.sort((a, b) => a.en - b.en);
}

export const coord = v => (v == null ? '' : Number(v).toFixed(5).replace('-', '−').replace('.', ','));
export const fmtDistancia = m => (m >= 1000 ? `${(m / 1000).toFixed(2).replace('.', ',')} km` : `${Math.round(m)} m`);
