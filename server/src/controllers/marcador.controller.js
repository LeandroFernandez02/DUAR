/**
 * CONTROLADOR · Marcadores del mapa (Módulo 5)
 *   · CU-35 Marcar Punto de Interés, Hallazgo o Instalación SCI
 *   · CU-36 Modificar (y reubicar una instalación) · CU-39 Eliminar
 *   · El Líder de Grupo, desde el portal, en su polígono (03/11)
 *
 * Valida la forma del pedido según la clase y audita. Las reglas del hallazgo
 * (no se elimina, no cambia de clase, sus fotos no se quitan) las aplica
 * marcador.model.js con la fila bloqueada.
 */
import * as Marcador from '../models/marcador.model.js';
import * as Operativo from '../models/operativo.model.js';
import * as AgenteOperativo from '../models/agenteOperativo.model.js';
import * as Grupo from '../models/grupo.model.js';
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

/** POST /api/operativos/:id/marcadores — CU-35 */
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
    // CU-35 3.1 / 4.1: sin nombre no se guarda (la instalación lo toma de su tipo).
    if (b.clase !== 'INSTALACION' && !r.datos.nombre) return invalido(res, 'Ingresá un nombre.', 'nombre_requerido');
    if (!(await operativoEditable(req.params.id, res))) return;

    const marcador = await Marcador.crear(req.params.id, { clase: b.clase, ...r.datos, lat: c.lat, lng: c.lng }, req.usuario.id);
    await auditar(req, Auditoria.ACCION.CREAR, ENTIDAD, marcador.id, null, marcador);
    res.status(201).json({ marcador });
  } catch (err) { next(err); }
}

/** PUT /api/operativos/:id/marcadores/:marcadorId — CU-36 (datos, clase POI→Hallazgo y reubicar una instalación) */
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
    // CU-36 3.2 (nombre vacío): no se puede guardar.
    if (r.datos.nombre === null) return invalido(res, 'El nombre no puede quedar vacío.', 'nombre_requerido');

    await Marcador.actualizar(req.params.id, req.params.marcadorId, {
      ...r.datos, ...(b.clase !== undefined ? { clase: b.clase } : {}), ...(c.lat !== undefined ? c : {}),
    });
    const marcador = await Marcador.detalle(req.params.id, req.params.marcadorId);
    // Si se reubicó, la auditoría guarda las coordenadas anteriores (CU-36 2.4).
    await auditar(req, Auditoria.ACCION.MODIFICAR, ENTIDAD, marcador.id, previo, marcador);
    res.json({ marcador });
  } catch (err) { next(err); }
}

/** DELETE /api/operativos/:id/marcadores/:marcadorId — CU-39 (un hallazgo no se elimina) */
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

/** POST /api/operativos/:id/marcadores/:marcadorId/fotos — CU-35/35 (puntos de interés y hallazgos) */
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

/* ── Portal: el Líder de Grupo marca en su polígono (pedido del 03/11, migración 032) ────────────
 * Sólo el Líder (grupos.lider_id = su alta vigente) y sólo en el polígono asignado a su grupo; el
 * resto del grupo no carga ni ve. Sin señal, el celular guarda el punto con la hora en que se marcó
 * y lo manda después: el id del celular (`clienteId`) hace que reenviar no duplique, y vale si el
 * polígono era del grupo a esa hora. Fuera del polígono se guarda igual (el celular ya avisó) con
 * los metros hasta el borde, para que el coordinador lo vea.
 */
const ADELANTO_MAX_MS = 5 * 60 * 1000;   // reloj del celular adelantado: tolerancia

/** El Líder con polígono, o null (y la respuesta ya enviada). */
async function liderConPoligono(req, res) {
  const alta = await AgenteOperativo.altaActivaDe(req.usuario.id);
  if (!alta) {
    res.status(404).json({ error: 'No estás asignado a ningún operativo en curso.', motivo: 'sin_operativo' });
    return null;
  }
  const grupo = await Grupo.grupoDelAgente(alta);
  if (!grupo?.soyLider) {
    res.status(403).json({ error: 'Sólo el Líder del grupo carga puntos de interés y hallazgos.', motivo: 'no_es_lider' });
    return null;
  }
  return { alta, grupo };
}

/** GET /api/mi-sector/marcadores — lo que hay en el polígono de mi grupo (sólo el Líder). */
export async function listarDelLider(req, res, next) {
  try {
    const ctx = await liderConPoligono(req, res);
    if (!ctx) return;
    if (!ctx.grupo.poligonoId) return res.json({ marcadores: [] });
    res.json({ marcadores: await Marcador.listarDelPoligono(ctx.alta.operativoId, ctx.grupo.poligonoId) });
  } catch (err) { next(err); }
}

/**
 * POST /api/mi-sector/marcadores
 * body: { clienteId, poligonoId, clase: POI|HALLAZGO, nombre, descripcion?, detalle?, lat, lng, precisionM?, ocurridoEn? }
 */
export async function crearDelLider(req, res, next) {
  try {
    const b = req.body ?? {};
    if (!esUuid(b.clienteId)) return invalido(res, 'Falta el identificador del envío.', 'cliente_id_invalido');

    // Reenvío de algo que ya llegó (se cortó la señal antes de la respuesta): se devuelve lo guardado.
    const previo = await Marcador.buscarPorCliente(b.clienteId);
    if (previo) {
      if (previo.creadoPor !== req.usuario.id) return invalido(res, 'Identificador de envío repetido.', 'cliente_id_invalido');
      return res.json({ marcador: await Marcador.detalle(previo.operativoId, previo.id), repetido: true });
    }

    if (b.clase !== 'POI' && b.clase !== 'HALLAZGO') {
      return invalido(res, 'Elegí qué marcás: punto de interés o hallazgo.', 'clase_invalida');
    }
    const c = leerCoordenadas(b);
    if (c.error || c.lat === undefined) return invalido(res, COORDENADAS_INVALIDAS, 'coordenadas_invalidas');
    const r = leerCampos({ nombre: b.nombre, descripcion: b.descripcion, detalle: b.detalle }, b.clase);
    if (r.error) return invalido(res, r.error, r.motivo);
    if (!r.datos.nombre) return invalido(res, 'Ingresá un nombre.', 'nombre_requerido');

    let precisionM = null;
    if (b.precisionM !== undefined && b.precisionM !== null) {
      const p = Number(b.precisionM);
      if (!Number.isFinite(p) || p < 0 || p > 100000) return invalido(res, 'La precisión del GPS no es válida.', 'precision_invalida');
      precisionM = Math.round(p);
    }
    const ahora = Date.now();
    const ocurrido = b.ocurridoEn === undefined || b.ocurridoEn === null ? new Date(ahora) : new Date(b.ocurridoEn);
    if (Number.isNaN(ocurrido.getTime()) || ocurrido.getTime() > ahora + ADELANTO_MAX_MS) {
      return invalido(res, 'La hora en que se marcó no es válida.', 'hora_invalida');
    }

    const ctx = await liderConPoligono(req, res);
    if (!ctx) return;
    const { alta, grupo } = ctx;
    const operativo = await operativoEditable(alta.operativoId, res);
    if (!operativo) return;
    if (ocurrido < new Date(operativo.fechaHoraInicio)) {
      return invalido(res, 'La hora en que se marcó es anterior al inicio del operativo.', 'hora_invalida');
    }

    // El polígono: el que el grupo tiene ahora o, si se marcó sin señal, el que tenía a esa hora.
    const poligonoId = esUuid(b.poligonoId) ? b.poligonoId : grupo.poligonoId;
    if (!poligonoId) {
      return res.status(409).json({ error: 'Tu grupo no tiene un polígono asignado.', motivo: 'sin_poligono' });
    }
    if (poligonoId !== grupo.poligonoId && !(await Marcador.grupoTeniaPoligono(grupo.id, poligonoId, ocurrido))) {
      return res.status(409).json({ error: 'Ese polígono no era de tu grupo cuando marcaste el punto.', motivo: 'poligono_ajeno' });
    }

    const marcador = await Marcador.crearDelLider(alta.operativoId, {
      clase: b.clase, ...r.datos, lat: c.lat, lng: c.lng, grupoId: grupo.id, poligonoId,
      ocurridoEn: ocurrido.toISOString(), precisionM, clienteId: b.clienteId,
    }, req.usuario.id);
    await auditar(req, Auditoria.ACCION.CREAR, ENTIDAD, marcador.id, null, marcador);
    res.status(201).json({ marcador });
  } catch (err) {
    // Dos reenvíos simultáneos del mismo punto: el segundo choca con el índice único.
    if (err.code === '23505' && esUuid(req.body?.clienteId)) {
      const previo = await Marcador.buscarPorCliente(req.body.clienteId).catch(() => null);
      if (previo) return res.json({ marcador: await Marcador.detalle(previo.operativoId, previo.id), repetido: true });
    }
    next(err);
  }
}

/**
 * POST /api/mi-sector/marcadores/:marcadorId/fotos — de a una, en el campo `fotos`, con `clienteId`.
 * Sólo a un punto que cargó uno mismo en el operativo en el que está (puede llegar después de
 * volver a la base, por eso no se exige seguir siendo Líder ni tener el polígono).
 */
export async function subirFotoDelLider(req, res, next) {
  try {
    if (!esUuid(req.params.marcadorId)) return noEncontrado(res);
    if (!esUuid(req.body?.clienteId)) return invalido(res, 'Falta el identificador del envío.', 'cliente_id_invalido');
    if (!Storage.estaConfigurado()) {
      return res.status(503).json({ error: 'El almacenamiento de fotos no está configurado en el servidor.' });
    }
    const alta = await AgenteOperativo.altaActivaDe(req.usuario.id);
    if (!alta) return res.status(404).json({ error: 'No estás asignado a ningún operativo en curso.', motivo: 'sin_operativo' });
    const marcador = await Marcador.detalle(alta.operativoId, req.params.marcadorId);
    if (!marcador || !marcador.grupoId) return noEncontrado(res);
    if (marcador.creadoPorId !== req.usuario.id) {
      return res.status(403).json({ error: 'Sólo podés sumar fotos a los puntos que cargaste vos.', motivo: 'marcador_ajeno' });
    }
    if (await Marcador.fotoYaSubida(req.body.clienteId)) {
      return res.json({ marcador, repetida: true });
    }
    const archivos = req.files ?? [];
    if (archivos.length !== 1) return invalido(res, 'Se sube una foto por vez.', 'fotos_requeridas');
    if (!(await operativoEditable(alta.operativoId, res))) return;
    if ((await Marcador.lugarParaFotos(alta.operativoId, marcador.id)) < 1) {
      return res.status(409).json({ error: `Un punto puede tener hasta ${Marcador.FOTOS_MAX} fotos.`, motivo: 'demasiadas_fotos' });
    }
    const [archivo] = archivos;
    const extension = (archivo.originalname.split('.').pop() || 'jpg').toLowerCase();
    const path = await Storage.subir(`${alta.operativoId}/marcadores/${marcador.id}`, archivo.buffer, extension, archivo.mimetype);
    await Marcador.agregarFotoDelLider(marcador.id, path, req.usuario.id, req.body.clienteId);
    await auditar(req, Auditoria.ACCION.CREAR, ENTIDAD_FOTOS, marcador.id, null, { cantidad: 1, paths: [path] });
    res.status(201).json({ marcador: await Marcador.detalle(alta.operativoId, marcador.id) });
  } catch (err) { next(err); }
}

/** GET /api/operativos/:id/marcadores/novedades?desde=ISO — aviso al coordinador de lo que cargaron los Líderes. */
export async function novedades(req, res, next) {
  try {
    const desde = new Date(req.query.desde ?? '');
    if (Number.isNaN(desde.getTime())) return invalido(res, 'Falta la hora desde la que se consulta.', 'desde_invalido');
    if (!(await operativoEditable(req.params.id, res, { soloLectura: true }))) return;
    res.json({ novedades: await Marcador.novedadesDeLideres(req.params.id, desde.toISOString()), hasta: new Date().toISOString() });
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
