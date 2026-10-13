/**
 * CONTROLADOR · Polígonos del Mapa Operacional (Módulo 5)
 *   · CU-29 Dibujar · CU-30 Asignar a grupo · CU-37 Modificar
 *   · CU-38 Eliminar · CU-39 Consultar (CU-40 la cobertura la calcula el modelo)
 *
 * Valida la FORMA del pedido (nombre, notas, GeoJSON) y audita en
 * logs_auditoria. Las reglas de negocio viven en poligono.model.js con las
 * filas bloqueadas; si una no se cumple, el modelo lanza un ReglaError.
 */
import * as Poligono from '../models/poligono.model.js';
import * as Operativo from '../models/operativo.model.js';
import * as Auditoria from '../models/auditoria.model.js';

const ENTIDAD = 'poligonos';
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOMBRE_MIN = 3;
const NOMBRE_MAX = 120;
const NOTAS_MAX = 2000;
const VERTICES_MAX = 2000;

const esUuid = (v) => typeof v === 'string' && RE_UUID.test(v);
const invalido = (res, error, motivo = 'datos_invalidos') => res.status(400).json({ error, motivo });

/** Igual que en grupos: se puede mirar un operativo cerrado, no cambiar su mapa. */
async function operativoEditable(req, res, { soloLectura = false } = {}) {
  const operativo = await Operativo.buscarPorId(req.params.id);
  if (!operativo) {
    res.status(404).json({ error: 'Operativo no encontrado.' });
    return null;
  }
  if (!soloLectura && Operativo.ESTADOS_SOLO_LECTURA.includes(operativo.estado)) {
    res.status(409).json({
      error: `El operativo está ${operativo.estado.toLowerCase()}: su mapa es de sólo lectura.`,
      motivo: 'operativo_cerrado',
    });
    return null;
  }
  return operativo;
}

function leerNombre(v) {
  if (typeof v !== 'string') return { error: 'El nombre del polígono es obligatorio.' };
  const nombre = v.trim().replace(/\s+/g, ' ');
  if (nombre.length < NOMBRE_MIN || nombre.length > NOMBRE_MAX) {
    return { error: `Ingresá un nombre para el polígono (${NOMBRE_MIN} a ${NOMBRE_MAX} caracteres).` };
  }
  return { nombre };
}

function leerNotas(v) {
  if (v === null || v === undefined) return { notas: null };
  if (typeof v !== 'string') return { error: 'Las notas tienen que ser texto.' };
  const notas = v.trim();
  if (notas.length > NOTAS_MAX) return { error: `Las notas pueden tener hasta ${NOTAS_MAX} caracteres.` };
  return { notas: notas || null };
}

/**
 * GeoJSON Polygon de un solo anillo (sin huecos), en [longitud, latitud]. Si
 * el anillo no viene cerrado se cierra. Los bordes cruzados los rechaza la base
 * (CHECK ST_IsValid), que es quien mejor lo sabe.
 */
function leerGeometria(g) {
  const malo = { error: 'La forma del polígono no es válida.' };
  if (!g || g.type !== 'Polygon' || !Array.isArray(g.coordinates) || g.coordinates.length !== 1) return malo;
  const anillo = g.coordinates[0];
  if (!Array.isArray(anillo) || anillo.length > VERTICES_MAX + 1) return malo;
  for (const p of anillo) {
    if (!Array.isArray(p) || p.length < 2) return malo;
    const [lng, lat] = p;
    if (typeof lng !== 'number' || typeof lat !== 'number' || !Number.isFinite(lng) || !Number.isFinite(lat)
        || lng < -180 || lng > 180 || lat < -90 || lat > 90) return malo;
  }
  const puntos = anillo.map(([lng, lat]) => [lng, lat]);
  const [x0, y0] = puntos[0] ?? [];
  const [xn, yn] = puntos[puntos.length - 1] ?? [];
  if (puntos.length && (x0 !== xn || y0 !== yn)) puntos.push([x0, y0]);
  const distintos = new Set(puntos.slice(0, -1).map(p => p.join(','))).size;
  if (distintos < 3) return { error: 'El polígono necesita al menos 3 vértices.' };
  return { geojson: JSON.stringify({ type: 'Polygon', coordinates: [puntos] }) };
}

/** GET /api/operativos/:id/poligonos — los polígonos vigentes (CU-33 / CU-39). */
export async function listar(req, res, next) {
  try {
    if (!(await operativoEditable(req, res, { soloLectura: true }))) return;
    res.json({ poligonos: await Poligono.listar(req.params.id) });
  } catch (err) { next(err); }
}

/** GET /api/operativos/:id/poligonos/:poligonoId — CU-39 Consultar Polígono. */
export async function obtener(req, res, next) {
  try {
    if (!esUuid(req.params.poligonoId)) return invalido(res, 'Polígono inválido.', 'valor_invalido');
    if (!(await operativoEditable(req, res, { soloLectura: true }))) return;
    const poligono = await Poligono.detalle(req.params.id, req.params.poligonoId);
    if (!poligono) return res.status(404).json({ error: 'El polígono no existe en este operativo.', motivo: 'poligono_no_encontrado' });
    res.json({ poligono });
  } catch (err) { next(err); }
}

/** POST /api/operativos/:id/poligonos — CU-29 Dibujar Polígono. */
export async function crear(req, res, next) {
  try {
    const b = req.body ?? {};
    const n = leerNombre(b.nombre);
    if (n.error) return invalido(res, n.error, 'nombre_invalido');
    const g = leerGeometria(b.geometria);
    if (g.error) return invalido(res, g.error, 'geometria_invalida');
    const no = leerNotas(b.notas);
    if (no.error) return invalido(res, no.error);
    if (b.grupoId !== undefined && b.grupoId !== null && !esUuid(b.grupoId)) return invalido(res, 'Grupo inválido.', 'valor_invalido');
    if (!(await operativoEditable(req, res))) return;

    const poligono = await Poligono.crear(req.params.id,
      { nombre: n.nombre, geojson: g.geojson, notas: no.notas, grupoId: b.grupoId ?? null }, req.usuario.id);
    await Auditoria.registrar({
      usuarioId: req.usuario.id, accion: Auditoria.ACCION.CREAR, entidad: ENTIDAD,
      registroId: poligono.id, valoresNuevos: sinGeometria(poligono), ip: req.ip,
    });
    res.status(201).json({ poligono });
  } catch (err) { next(err); }
}

/** PUT /api/operativos/:id/poligonos/:poligonoId — CU-37 (nombre, notas y/o forma). */
export async function actualizar(req, res, next) {
  try {
    if (!esUuid(req.params.poligonoId)) return invalido(res, 'Polígono inválido.', 'valor_invalido');
    const b = req.body ?? {};
    const cambios = {};
    if (b.nombre !== undefined) {
      const n = leerNombre(b.nombre);
      if (n.error) return invalido(res, n.error, 'nombre_invalido');
      cambios.nombre = n.nombre;
    }
    if (b.notas !== undefined) {
      const no = leerNotas(b.notas);
      if (no.error) return invalido(res, no.error);
      cambios.notas = no.notas;
    }
    if (b.geometria !== undefined) {
      const g = leerGeometria(b.geometria);
      if (g.error) return invalido(res, g.error, 'geometria_invalida');
      cambios.geojson = g.geojson;
    }
    if (!Object.keys(cambios).length) return invalido(res, 'No hay nada para cambiar.', 'sin_cambios');
    if (!(await operativoEditable(req, res))) return;

    const previo = await Poligono.detalle(req.params.id, req.params.poligonoId);
    if (!previo) return res.status(404).json({ error: 'El polígono no existe en este operativo.', motivo: 'poligono_no_encontrado' });
    const poligono = await Poligono.actualizar(req.params.id, req.params.poligonoId, cambios, req.usuario.id);
    await Auditoria.registrar({
      usuarioId: req.usuario.id, accion: Auditoria.ACCION.MODIFICAR, entidad: ENTIDAD,
      registroId: poligono.id, valoresPrevios: conGeometria(previo), valoresNuevos: conGeometria(poligono), ip: req.ip,
    });
    res.json({ poligono });
  } catch (err) { next(err); }
}

/** DELETE /api/operativos/:id/poligonos/:poligonoId — CU-38 (baja con registro). */
export async function eliminar(req, res, next) {
  try {
    if (!esUuid(req.params.poligonoId)) return invalido(res, 'Polígono inválido.', 'valor_invalido');
    if (!(await operativoEditable(req, res))) return;
    const previo = await Poligono.detalle(req.params.id, req.params.poligonoId);
    const r = await Poligono.eliminar(req.params.id, req.params.poligonoId, req.usuario.id);
    await Auditoria.registrar({
      usuarioId: req.usuario.id, accion: Auditoria.ACCION.ELIMINAR, entidad: ENTIDAD,
      registroId: req.params.poligonoId, valoresPrevios: previo ? conGeometria(previo) : null,
      valoresNuevos: { eliminado: true, gruposLiberados: r.gruposLiberados, tracksFueraDePoligono: r.tracksFueraDePoligono },
      ip: req.ip,
    });
    res.status(204).end();
  } catch (err) { next(err); }
}

/** POST /api/operativos/:id/poligonos/:poligonoId/grupos — CU-30 asignar { grupoId }. */
export async function asignarGrupo(req, res, next) {
  try {
    const { grupoId } = req.body ?? {};
    if (!esUuid(req.params.poligonoId) || !esUuid(grupoId)) return invalido(res, 'Polígono o grupo inválido.', 'valor_invalido');
    if (!(await operativoEditable(req, res))) return;
    const poligono = await Poligono.asignarGrupo(req.params.id, req.params.poligonoId, grupoId, req.usuario.id);
    await auditarGrupos(req, 'asignar', { grupoId });
    res.json({ poligono });
  } catch (err) { next(err); }
}

/** POST .../poligonos/:poligonoId/grupos/:grupoId/quitar — CU-30 { confirmar? } (en el terreno pide confirmación). */
export async function quitarGrupo(req, res, next) {
  try {
    const { poligonoId, grupoId } = req.params;
    if (!esUuid(poligonoId) || !esUuid(grupoId)) return invalido(res, 'Polígono o grupo inválido.', 'valor_invalido');
    if (!(await operativoEditable(req, res))) return;
    const confirmar = req.body?.confirmar === true;
    const poligono = await Poligono.quitarGrupo(req.params.id, poligonoId, grupoId, { confirmar }, req.usuario.id);
    await auditarGrupos(req, 'quitar', { grupoId, confirmar });
    res.json({ poligono });
  } catch (err) { next(err); }
}

/** POST .../poligonos/:poligonoId/grupos/:grupoId/cambiar — CU-30 { nuevoGrupoId } (sólo si el actual está Asignado). */
export async function cambiarGrupo(req, res, next) {
  try {
    const { poligonoId, grupoId } = req.params;
    const { nuevoGrupoId } = req.body ?? {};
    if (!esUuid(poligonoId) || !esUuid(grupoId) || !esUuid(nuevoGrupoId)) return invalido(res, 'Polígono o grupo inválido.', 'valor_invalido');
    if (!(await operativoEditable(req, res))) return;
    const poligono = await Poligono.cambiarGrupo(req.params.id, poligonoId, grupoId, nuevoGrupoId, req.usuario.id);
    await auditarGrupos(req, 'cambiar', { grupoId, nuevoGrupoId });
    res.json({ poligono });
  } catch (err) { next(err); }
}

async function auditarGrupos(req, accion, datos) {
  await Auditoria.registrar({
    usuarioId: req.usuario.id, accion: Auditoria.ACCION.MODIFICAR, entidad: ENTIDAD,
    registroId: req.params.poligonoId, valoresNuevos: { grupos: accion, ...datos }, ip: req.ip,
  });
}

/** Para la auditoría: la forma como texto GeoJSON (sirve para reconstruirla) sin las brechas. */
function conGeometria({ brechas, asistieron, listaTracks, historial, ...resto }) { return resto; }
function sinGeometria({ geometria, brechas, asistieron, listaTracks, historial, ...resto }) { return resto; }
