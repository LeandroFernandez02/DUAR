/**
 * CONTROLADOR · Tracks GPX (Módulo 5)
 *   · CU-32 Cargar Traza GPX — el coordinador en nombre de un agente (acá) o el
 *     propio agente desde su portal (misTracks*, al final).
 *   · CU-33 Modificar (sólo polígono y notas) · CU-39 Eliminar (baja con registro)
 *
 * Valida la forma del pedido y audita. El análisis del archivo, el polígono
 * detectado y la cobertura los resuelve track.model.js.
 */
import * as Track from '../models/track.model.js';
import * as Operativo from '../models/operativo.model.js';
import * as AgenteOperativo from '../models/agenteOperativo.model.js';
import * as Auditoria from '../models/auditoria.model.js';
import * as Grupo from '../models/grupo.model.js';

const ENTIDAD = 'tracks_gpx';
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOTAS_MAX = 2000;
const NO_EDITABLES = ['inicio', 'fin', 'geometria', 'agenteOperativoId', 'grupoId', 'distanciaM'];

const esUuid = (v) => typeof v === 'string' && RE_UUID.test(v);
const invalido = (res, error, motivo = 'datos_invalidos') => res.status(400).json({ error, motivo });
const noEncontrado = (res) => res.status(404).json({ error: 'El track no existe en este operativo.', motivo: 'track_no_encontrado' });

/** Se pueden mirar los recorridos de un operativo cerrado; no cargarlos ni corregirlos (CU-32, 12/10). */
async function operativoEditable(operativoId, res, { soloLectura = false } = {}) {
  const operativo = await Operativo.buscarPorId(operativoId);
  if (!operativo) {
    res.status(404).json({ error: 'Operativo no encontrado.' });
    return null;
  }
  if (!soloLectura && Operativo.ESTADOS_SOLO_LECTURA.includes(operativo.estado)) {
    res.status(409).json({
      error: `El operativo está ${operativo.estado.toLowerCase()}: ya no se cargan ni se corrigen recorridos.`,
      motivo: 'operativo_cerrado',
    });
    return null;
  }
  return operativo;
}

/** undefined = no se tocan; '' o null = se borran. */
function leerNotas(v) {
  if (v === undefined) return { notas: undefined };
  if (v === null || v === '') return { notas: null };
  if (typeof v !== 'string') return { error: 'Las notas tienen que ser texto.' };
  const notas = v.trim();
  if (notas.length > NOTAS_MAX) return { error: `Las notas pueden tener hasta ${NOTAS_MAX} caracteres.` };
  return { notas: notas || null };
}

function faltaArchivo(req, res) {
  if (req.file) return false;
  invalido(res, 'Elegí el archivo .gpx del recorrido.', 'archivo_requerido');
  return true;
}

const nombreArchivo = (req) => String(req.file.originalname).slice(0, 255);

/** POST /api/operativos/:id/tracks/analizar — CU-32 pasos 3 a 5: el resumen, antes de confirmar. */
export async function analizar(req, res, next) {
  try {
    if (faltaArchivo(req, res)) return;
    if (!(await operativoEditable(req.params.id, res))) return;
    res.json({ analisis: await Track.analizar(req.params.id, req.file.buffer) });
  } catch (err) { next(err); }
}

/** POST /api/operativos/:id/tracks — CU-32 flujo alternativo: el coordinador carga en nombre de un agente. */
export async function crear(req, res, next) {
  try {
    if (faltaArchivo(req, res)) return;
    const { agenteOperativoId } = req.body ?? {};
    if (!esUuid(agenteOperativoId)) return invalido(res, 'Elegí de quién es el recorrido.', 'agente_requerido');
    const no = leerNotas(req.body?.notas);
    if (no.error) return invalido(res, no.error);
    if (!(await operativoEditable(req.params.id, res))) return;

    const track = await Track.crear(req.params.id, {
      agenteOperativoId, buffer: req.file.buffer, archivoNombre: nombreArchivo(req), notas: no.notas ?? null,
    }, req.usuario.id);
    await auditar(req, Auditoria.ACCION.CREAR, track.id, null, track);
    res.status(201).json({ track });
  } catch (err) { next(err); }
}

/** GET /api/operativos/:id/tracks */
export async function listar(req, res, next) {
  try {
    if (!(await operativoEditable(req.params.id, res, { soloLectura: true }))) return;
    res.json({ tracks: await Track.listar(req.params.id) });
  } catch (err) { next(err); }
}

/** GET /api/operativos/:id/tracks/:trackId — con enlace temporal al .gpx original. */
export async function obtener(req, res, next) {
  try {
    if (!esUuid(req.params.trackId)) return noEncontrado(res);
    if (!(await operativoEditable(req.params.id, res, { soloLectura: true }))) return;
    const track = await Track.detalle(req.params.id, req.params.trackId);
    if (!track) return noEncontrado(res);
    res.json({ track });
  } catch (err) { next(err); }
}

/** PUT /api/operativos/:id/tracks/:trackId — CU-33: { poligonoId (null = fuera de polígono), notas }. */
export async function actualizar(req, res, next) {
  try {
    if (!esUuid(req.params.trackId)) return noEncontrado(res);
    const b = req.body ?? {};
    if (NO_EDITABLES.some(k => b[k] !== undefined)) {
      return invalido(res, 'El recorrido, sus horas y su agente salen del archivo y no se editan.', 'dato_no_editable');
    }
    const cambios = {};
    if (b.poligonoId !== undefined) {
      if (b.poligonoId !== null && !esUuid(b.poligonoId)) return invalido(res, 'Polígono inválido.', 'valor_invalido');
      cambios.poligonoId = b.poligonoId;
    }
    const no = leerNotas(b.notas);
    if (no.error) return invalido(res, no.error);
    if (no.notas !== undefined) cambios.notas = no.notas;
    if (!Object.keys(cambios).length) return invalido(res, 'No hay nada para cambiar.', 'sin_cambios');
    if (!(await operativoEditable(req.params.id, res))) return;

    const previo = await Track.detalle(req.params.id, req.params.trackId);
    if (!previo) return noEncontrado(res);
    const track = await Track.actualizar(req.params.id, req.params.trackId, cambios, req.usuario.id);
    await auditar(req, Auditoria.ACCION.MODIFICAR, track.id, previo, track);
    res.json({ track });
  } catch (err) { next(err); }
}

/** DELETE /api/operativos/:id/tracks/:trackId — CU-39: baja con registro, deja de sumar cobertura. */
export async function eliminar(req, res, next) {
  try {
    if (!esUuid(req.params.trackId)) return noEncontrado(res);
    if (!(await operativoEditable(req.params.id, res))) return;
    const previo = await Track.detalle(req.params.id, req.params.trackId);
    if (!previo) return noEncontrado(res);
    await Track.eliminar(req.params.id, req.params.trackId, req.usuario.id);
    await auditar(req, Auditoria.ACCION.ELIMINAR, req.params.trackId, previo, { eliminado: true });
    res.status(204).end();
  } catch (err) { next(err); }
}

/* ── Portal del agente: su propio recorrido (CU-32 flujo principal) ─────── */

async function miAlta(req, res) {
  const alta = await AgenteOperativo.altaActivaDe(req.usuario.id);
  if (!alta) {
    res.status(404).json({ error: 'No estás asignado a ningún operativo en curso.', motivo: 'sin_operativo' });
    return null;
  }
  return alta;
}

const sinGeometria = ({ geometria, ...t }) => t;

/**
 * Decisión del 14/11: un integrante carga su .gpx sólo mientras está en el terreno (Desplegado,
 * Rastrillando o Replegado); en cualquier otro estado se lo pasa al Líder, que carga en cualquier estado.
 */
export const ESTADOS_CARGA_GPX = ['DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO'];
async function puedeCargarPropio(alta, res) {
  if (ESTADOS_CARGA_GPX.includes(alta.estado)) return true;
  const grupo = await Grupo.grupoDelAgente(alta);
  if (grupo?.soyLider) return true;
  res.status(409).json({
    error: grupo
      ? 'Tu recorrido lo podés cargar sólo mientras tu grupo está en el terreno (desplegado, rastrillando o volviendo). Pasale el archivo .gpx al Líder de tu grupo para que lo cargue por vos.'
      : 'Sólo podés cargar tu recorrido mientras estás en el terreno con un grupo. Pasale el archivo .gpx al coordinador.',
    motivo: 'fuera_del_terreno',
  });
  return false;
}

/** POST /api/mis-tracks/analizar */
export async function misTracksAnalizar(req, res, next) {
  try {
    if (faltaArchivo(req, res)) return;
    const alta = await miAlta(req, res);
    if (!alta || !(await operativoEditable(alta.operativoId, res))) return;
    if (!(await puedeCargarPropio(alta, res))) return;
    res.json({ analisis: await Track.analizar(alta.operativoId, req.file.buffer) });
  } catch (err) { next(err); }
}

/**
 * POST /api/mis-tracks — queda «recorrido de» y «cargado por» él mismo.
 * Con `agenteOperativoId` (13/11): el Líder carga el recorrido de un integrante de SU grupo
 * (por ejemplo el conductor, o alguien sin batería). Queda «recorrido de» el integrante y
 * «cargado por» el Líder. Si el integrante cambió de grupo, se lo carga el Líder del grupo actual.
 */
export async function misTracksCrear(req, res, next) {
  try {
    if (faltaArchivo(req, res)) return;
    const no = leerNotas(req.body?.notas);
    if (no.error) return invalido(res, no.error);
    const otro = req.body?.agenteOperativoId;
    if (otro !== undefined && otro !== '' && !esUuid(otro)) return invalido(res, 'Elegí de quién es el recorrido.', 'agente_requerido');
    const alta = await miAlta(req, res);
    if (!alta || !(await operativoEditable(alta.operativoId, res))) return;
    let deQuien = alta.id;
    if (!otro || otro === alta.id) {
      if (!(await puedeCargarPropio(alta, res))) return;
    } else {
      const grupo = await Grupo.grupoDelAgente(alta);
      if (!grupo?.soyLider) {
        return res.status(403).json({ error: 'Sólo el Líder del grupo carga recorridos de otros integrantes.', motivo: 'no_es_lider' });
      }
      if (!grupo.integrantes.some(i => i.id === otro)) {
        return res.status(403).json({ error: 'Esa persona no está en tu grupo.', motivo: 'no_es_del_grupo' });
      }
      deQuien = otro;
    }
    const track = await Track.crear(alta.operativoId, {
      agenteOperativoId: deQuien, buffer: req.file.buffer, archivoNombre: nombreArchivo(req), notas: no.notas ?? null,
    }, req.usuario.id);
    await auditar(req, Auditoria.ACCION.CREAR, track.id, null, track);
    res.status(201).json({ track: sinGeometria(track) });
  } catch (err) { next(err); }
}

/** GET /api/mis-tracks — los recorridos suyos y los que cargó él (el Líder, por otros) en el operativo en el que está. */
export async function misTracksListar(req, res, next) {
  try {
    const alta = await AgenteOperativo.altaActivaDe(req.usuario.id);
    res.json({ tracks: alta ? await Track.listarDelPortal(alta, req.usuario.id) : [] });
  } catch (err) { next(err); }
}

/** En la auditoría no va la línea entera ni el enlace temporal: el original queda en el bucket. */
async function auditar(req, accion, registroId, previos, nuevos) {
  const resumen = (t) => (t ? (({ geometria, archivoUrl, ...r }) => r)(t) : null);
  await Auditoria.registrar({
    usuarioId: req.usuario.id, accion, entidad: ENTIDAD, registroId,
    valoresPrevios: resumen(previos), valoresNuevos: resumen(nuevos), ip: req.ip,
  });
}
