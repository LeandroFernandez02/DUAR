/**
 * CONTROLADOR · Marcadores del mapa (Módulo 5)
 *   · CU-34 Marcar Punto de Interés, Hallazgo o Instalación SCI
 *   · CU-35 Modificar (y reubicar una instalación) · CU-38 Eliminar
 *
 * Valida la forma del pedido según la clase y audita. Las reglas del hallazgo
 * (no se elimina, no cambia de clase, sus fotos no se quitan) las aplica
 * marcador.model.js con la fila bloqueada.
 */
import * as Marcador from '../models/marcador.model.js';
import * as Operativo from '../models/operativo.model.js';
import * as Auditoria from '../models/auditoria.model.js';
import * as Storage from '../services/storage.service.js';

const ENTIDAD = 'marcadores';
const ENTIDAD_FOTOS = 'marcador_fotos';
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LARGOS = { nombre: 120, descripcion: 300, detalle: 4000, responsable: 120, notas: 2000 };
const COORDENADAS_INVALIDAS = 'Ingresá coordenadas válidas en grados decimales (latitud entre −90 y 90, longitud entre −180 y 180).';

const esUuid = (v) => typeof v === 'string' && RE_UUID.test(v);
const invalido = (res, error, motivo = 'datos_invalidos') => res.status(400).json({ error, motivo });
const noEncontrado = (res) => res.status(404).json({ error: 'El marcador no existe en este operativo.', motivo: 'marcador_no_encontrado' });

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

/** undefined = no viene; '' o null = vacío. */
function leerTexto(v, campo) {
  if (v === undefined) return { valor: undefined };
  if (v === null) return { valor: null };
  if (typeof v !== 'string') return { error: `El campo ${campo} tiene que ser texto.` };
  const valor = v.trim();
  if (valor.length > LARGOS[campo]) return { error: `El campo ${campo} puede tener hasta ${LARGOS[campo]} caracteres.` };
  return { valor: valor || null };
}

function leerCoordenadas(b) {
  if (b.lat === undefined && b.lng === undefined) return {};
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (b.lat === null || b.lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)
      || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { error: COORDENADAS_INVALIDAS };
  }
  return { lat, lng };
}

/**
 * Lee los campos de texto y el tipo. Devuelve { datos } o { error, motivo }.
 * `clase` es la clase con la que queda el marcador (para saber qué campos lleva).
 */
function leerCampos(b, clase) {
  const datos = {};
  for (const campo of Object.keys(LARGOS)) {
    const r = leerTexto(b[campo], campo);
    if (r.error) return { error: r.error };
    if (r.valor !== undefined) datos[campo] = r.valor;
  }
  if (b.tipoInstalacion !== undefined) {
    if (!Object.hasOwn(Marcador.TIPOS_INSTALACION, b.tipoInstalacion)) {
      return { error: 'Elegí un tipo de instalación de la lista.', motivo: 'tipo_invalido' };
    }
    datos.tipoInstalacion = b.tipoInstalacion;
  }
  if (clase === 'INSTALACION' && (datos.descripcion !== undefined || datos.detalle !== undefined)) {
    return { error: 'Una instalación lleva responsable y notas, no descripción ni detalle.', motivo: 'campo_no_corresponde' };
  }
  if (clase !== 'INSTALACION' && (datos.tipoInstalacion !== undefined || datos.responsable !== undefined)) {
    return { error: 'El tipo y el responsable son datos de una instalación.', motivo: 'campo_no_corresponde' };
  }
  return { datos };
}

/** GET /api/operativos/:id/marcadores */
export async function listar(req, res, next) {
  try {
    if (!(await operativoEditable(req.params.id, res, { soloLectura: true }))) return;
    res.json({ marcadores: await Marcador.listar(req.params.id) });
  } catch (err) { next(err); }
}

/** GET /api/operativos/:id/marcadores/:marcadorId */
export async function obtener(req, res, next) {
  try {
    if (!esUuid(req.params.marcadorId)) return noEncontrado(res);
    if (!(await operativoEditable(req.params.id, res, { soloLectura: true }))) return;
    const marcador = await Marcador.detalle(req.params.id, req.params.marcadorId);
    if (!marcador) return noEncontrado(res);
    res.json({ marcador });
  } catch (err) { next(err); }
}

/** POST /api/operativos/:id/marcadores — CU-34 */
export async function crear(req, res, next) {
  try {
    const b = req.body ?? {};
    if (!Marcador.CLASES.includes(b.clase)) {
      return invalido(res, 'Elegí qué marcás: punto de interés, hallazgo o instalación.', 'clase_invalida');
    }
    const c = leerCoordenadas(b);
    if (c.error || c.lat === undefined) return invalido(res, COORDENADAS_INVALIDAS, 'coordenadas_invalidas');
    const r = leerCampos(b, b.clase);
    if (r.error) return invalido(res, r.error, r.motivo);
    if (b.clase === 'INSTALACION' && !r.datos.tipoInstalacion) {
      return invalido(res, 'Elegí el tipo de instalación.', 'tipo_invalido');
    }
    // CU-34 3.1 / 4.1: sin nombre no se guarda (la instalación lo toma de su tipo).
    if (b.clase !== 'INSTALACION' && !r.datos.nombre) return invalido(res, 'Ingresá un nombre.', 'nombre_requerido');
    if (!(await operativoEditable(req.params.id, res))) return;

    const marcador = await Marcador.crear(req.params.id, { clase: b.clase, ...r.datos, lat: c.lat, lng: c.lng }, req.usuario.id);
    await auditar(req, Auditoria.ACCION.CREAR, ENTIDAD, marcador.id, null, marcador);
    res.status(201).json({ marcador });
  } catch (err) { next(err); }
}

/** PUT /api/operativos/:id/marcadores/:marcadorId — CU-35 (datos, clase POI→Hallazgo y reubicar una instalación) */
export async function actualizar(req, res, next) {
  try {
    if (!esUuid(req.params.marcadorId)) return noEncontrado(res);
    const b = req.body ?? {};
    if (b.clase !== undefined && !Marcador.CLASES.includes(b.clase)) {
      return invalido(res, 'Clase de marcador inválida.', 'clase_invalida');
    }
    const c = leerCoordenadas(b);
    if (c.error) return invalido(res, c.error, 'coordenadas_invalidas');
    if (!(await operativoEditable(req.params.id, res))) return;

    const previo = await Marcador.detalle(req.params.id, req.params.marcadorId);
    if (!previo) return noEncontrado(res);
    const r = leerCampos(b, b.clase ?? previo.clase);
    if (r.error) return invalido(res, r.error, r.motivo);
    // CU-35 3.2 (nombre vacío): no se puede guardar.
    if (r.datos.nombre === null) return invalido(res, 'El nombre no puede quedar vacío.', 'nombre_requerido');

    await Marcador.actualizar(req.params.id, req.params.marcadorId, {
      ...r.datos, ...(b.clase !== undefined ? { clase: b.clase } : {}), ...(c.lat !== undefined ? c : {}),
    });
    const marcador = await Marcador.detalle(req.params.id, req.params.marcadorId);
    // Si se reubicó, la auditoría guarda las coordenadas anteriores (CU-35 2.4).
    await auditar(req, Auditoria.ACCION.MODIFICAR, ENTIDAD, marcador.id, previo, marcador);
    res.json({ marcador });
  } catch (err) { next(err); }
}

/** DELETE /api/operativos/:id/marcadores/:marcadorId — CU-38 (un hallazgo no se elimina) */
export async function eliminar(req, res, next) {
  try {
    if (!esUuid(req.params.marcadorId)) return noEncontrado(res);
    if (!(await operativoEditable(req.params.id, res))) return;
    const previo = await Marcador.detalle(req.params.id, req.params.marcadorId);
    if (!previo) return noEncontrado(res);
    await Marcador.eliminar(req.params.id, req.params.marcadorId, req.usuario.id);
    await auditar(req, Auditoria.ACCION.ELIMINAR, ENTIDAD, previo.id, previo, { eliminado: true });
    res.status(204).end();
  } catch (err) { next(err); }
}

/** POST /api/operativos/:id/marcadores/:marcadorId/fotos — CU-34/35 (puntos de interés y hallazgos) */
export async function subirFotos(req, res, next) {
  try {
    if (!esUuid(req.params.marcadorId)) return noEncontrado(res);
    if (!Storage.estaConfigurado()) {
      return res.status(503).json({ error: 'El almacenamiento de fotos no está configurado en el servidor.' });
    }
    const archivos = req.files ?? [];
    if (!archivos.length) return invalido(res, 'No se recibió ninguna foto.', 'fotos_requeridas');
    if (!(await operativoEditable(req.params.id, res))) return;

    const lugar = await Marcador.lugarParaFotos(req.params.id, req.params.marcadorId);
    if (archivos.length > lugar) {
      return res.status(409).json({
        error: `Un marcador puede tener hasta ${Marcador.FOTOS_MAX} fotos${lugar > 0 ? `: podés sumar ${lugar} más` : ''}.`,
        motivo: 'demasiadas_fotos',
      });
    }
    // Misma carpeta privada del operativo que las fotos del objetivo (aislamiento por incidente).
    const carpeta = `${req.params.id}/marcadores/${req.params.marcadorId}`;
    const paths = [];
    for (const archivo of archivos) {
      const extension = (archivo.originalname.split('.').pop() || 'jpg').toLowerCase();
      paths.push(await Storage.subir(carpeta, archivo.buffer, extension, archivo.mimetype));
    }
    await Marcador.agregarFotos(req.params.marcadorId, paths, req.usuario.id);
    await auditar(req, Auditoria.ACCION.CREAR, ENTIDAD_FOTOS, req.params.marcadorId, null, { cantidad: paths.length, paths });
    res.status(201).json({ marcador: await Marcador.detalle(req.params.id, req.params.marcadorId) });
  } catch (err) { next(err); }
}

/** DELETE /api/operativos/:id/marcadores/:marcadorId/fotos/:fotoId — sólo de un punto de interés */
export async function eliminarFoto(req, res, next) {
  try {
    if (!esUuid(req.params.marcadorId) || !esUuid(req.params.fotoId)) {
      return res.status(404).json({ error: 'La foto no existe en este marcador.', motivo: 'foto_no_encontrada' });
    }
    if (!(await operativoEditable(req.params.id, res))) return;
    await Marcador.eliminarFoto(req.params.id, req.params.marcadorId, req.params.fotoId);
    await auditar(req, Auditoria.ACCION.ELIMINAR, ENTIDAD_FOTOS, req.params.fotoId, { marcadorId: req.params.marcadorId }, null);
    res.status(204).end();
  } catch (err) { next(err); }
}

/** En la auditoría van los datos, no las URLs firmadas (vencen). */
async function auditar(req, accion, entidad, registroId, previos, nuevos) {
  const sinUrls = (m) => (m && Array.isArray(m.fotos) ? { ...m, fotos: m.fotos.map(f => f.id) } : m);
  await Auditoria.registrar({
    usuarioId: req.usuario.id, accion, entidad, registroId,
    valoresPrevios: sinUrls(previos), valoresNuevos: sinUrls(nuevos), ip: req.ip,
  });
}
