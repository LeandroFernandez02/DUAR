/**
 * CONTROLADOR · Punto Cero y radios (Módulo 5 · CU-34)
 *
 * Mover el Punto Cero desde el mapa (con historial y, en curso, motivo) y los
 * radios del operativo, que se dibujan siempre centrados en el Punto Cero
 * vigente. Desde «Editar operativo» (CU-09) el Punto Cero se mueve con las
 * mismas reglas, en operativo.model.js#actualizar.
 */
import * as PuntoCero from '../models/puntoCero.model.js';
import * as Radio from '../models/radio.model.js';
import * as Operativo from '../models/operativo.model.js';
import * as Auditoria from '../models/auditoria.model.js';

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RE_COLOR = /^#[0-9A-Fa-f]{6}$/;
const MOTIVO_MAX = 500;
const RADIO_MIN_M = 50;
const RADIO_MAX_M = 100000;

const invalido = (res, error, motivo = 'datos_invalidos') => res.status(400).json({ error, motivo });
const radioNoEncontrado = (res) => res.status(404).json({ error: 'El radio no existe en este operativo.', motivo: 'radio_no_encontrado' });

async function operativoEditable(operativoId, res, { soloLectura = false } = {}) {
  const operativo = await Operativo.buscarPorId(operativoId);
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

/** GET /api/operativos/:id/punto-cero — el punto vigente y su historial. */
export async function obtener(req, res, next) {
  try {
    if (!(await operativoEditable(req.params.id, res, { soloLectura: true }))) return;
    const [puntoCero, historial] = await Promise.all([PuntoCero.vigente(req.params.id), PuntoCero.historial(req.params.id)]);
    res.json({ puntoCero, historial });
  } catch (err) { next(err); }
}

/** PUT /api/operativos/:id/punto-cero — CU-34: { lat, lng, motivo } */
export async function mover(req, res, next) {
  try {
    const b = req.body ?? {};
    const lat = Number(b.lat);
    const lng = Number(b.lng);
    if (b.lat == null || b.lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return invalido(res, 'Ingresá coordenadas válidas en grados decimales (latitud entre −90 y 90, longitud entre −180 y 180).', 'coordenadas_invalidas');
    }
    if (b.motivo != null && (typeof b.motivo !== 'string' || b.motivo.trim().length > MOTIVO_MAX)) {
      return invalido(res, `El motivo puede tener hasta ${MOTIVO_MAX} caracteres.`);
    }
    const motivo = typeof b.motivo === 'string' ? b.motivo.trim() || null : null;
    const previo = await operativoEditable(req.params.id, res);
    if (!previo) return;

    const mov = await PuntoCero.mover(req.params.id, { lat, lng, motivo }, req.usuario.id);
    if (!mov) return invalido(res, 'El Punto Cero ya está en ese lugar.', 'sin_cambios');

    const [puntoCero, historial] = await Promise.all([PuntoCero.vigente(req.params.id), PuntoCero.historial(req.params.id)]);
    await Auditoria.registrar({
      usuarioId: req.usuario.id, accion: Auditoria.ACCION.MODIFICAR, entidad: 'operativos', registroId: req.params.id,
      valoresPrevios: { puntoCeroLat: previo.puntoCeroLat, puntoCeroLng: previo.puntoCeroLng },
      valoresNuevos: { puntoCeroLat: puntoCero.lat, puntoCeroLng: puntoCero.lng, motivo }, ip: req.ip,
    });
    res.json({ puntoCero, historial });
  } catch (err) { next(err); }
}

/* ── Radios (R1 a R3) ───────────────────────────────────────────────────── */

function leerRadio(b, { parcial = false } = {}) {
  const datos = {};
  if (b.radioM !== undefined || !parcial) {
    const m = Number(b.radioM);
    if (!Number.isInteger(m) || m < RADIO_MIN_M || m > RADIO_MAX_M) {
      return { error: 'El radio tiene que ser de 50 m a 100 km.', motivo: 'radio_invalido' };
    }
    datos.radioM = m;
  }
  if (b.color !== undefined || !parcial) {
    if (typeof b.color !== 'string' || !RE_COLOR.test(b.color)) {
      return { error: 'El color tiene que ser un código como #E54B4B.', motivo: 'color_invalido' };
    }
    datos.color = b.color.toUpperCase();
  }
  return { datos };
}

const auditarRadio = (req, accion, id, previos, nuevos) => Auditoria.registrar({
  usuarioId: req.usuario.id, accion, entidad: 'radios_operativo', registroId: id,
  valoresPrevios: previos, valoresNuevos: nuevos, ip: req.ip,
});

/** GET /api/operativos/:id/radios */
export async function listarRadios(req, res, next) {
  try {
    if (!(await operativoEditable(req.params.id, res, { soloLectura: true }))) return;
    res.json({ radios: await Radio.listar(req.params.id) });
  } catch (err) { next(err); }
}

/** POST /api/operativos/:id/radios — R1: { radioM, color } */
export async function crearRadio(req, res, next) {
  try {
    const r = leerRadio(req.body ?? {});
    if (r.error) return invalido(res, r.error, r.motivo);
    if (!(await operativoEditable(req.params.id, res))) return;
    const radio = await Radio.crear(req.params.id, r.datos, req.usuario.id);
    await auditarRadio(req, Auditoria.ACCION.CREAR, radio.id, null, radio);
    res.status(201).json({ radio });
  } catch (err) { next(err); }
}

/** PUT /api/operativos/:id/radios/:radioId — R2: cambiar los km o el color */
export async function actualizarRadio(req, res, next) {
  try {
    if (!RE_UUID.test(req.params.radioId)) return radioNoEncontrado(res);
    const r = leerRadio(req.body ?? {}, { parcial: true });
    if (r.error) return invalido(res, r.error, r.motivo);
    if (!Object.keys(r.datos).length) return invalido(res, 'No hay nada para cambiar.', 'sin_cambios');
    if (!(await operativoEditable(req.params.id, res))) return;
    const { previo, radio } = await Radio.actualizar(req.params.id, req.params.radioId, r.datos);
    await auditarRadio(req, Auditoria.ACCION.MODIFICAR, radio.id, previo, radio);
    res.json({ radio });
  } catch (err) { next(err); }
}

/** DELETE /api/operativos/:id/radios/:radioId — R2: quitarlo (baja con registro) */
export async function eliminarRadio(req, res, next) {
  try {
    if (!RE_UUID.test(req.params.radioId)) return radioNoEncontrado(res);
    if (!(await operativoEditable(req.params.id, res))) return;
    const previo = await Radio.eliminar(req.params.id, req.params.radioId, req.usuario.id);
    await auditarRadio(req, Auditoria.ACCION.ELIMINAR, previo.id, previo, { eliminado: true });
    res.status(204).end();
  } catch (err) { next(err); }
}
