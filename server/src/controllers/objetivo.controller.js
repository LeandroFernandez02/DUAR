/**
 * CONTROLADOR · Objetivo Buscado
 *   · CU-12 Registrar · CU-13 Actualizar · CU-14 Consultar
 *
 * Precondición de CU-12/13 (no de CU-14): el operativo no puede estar
 * FINALIZADO/ELIMINADO — mismo guard que ya usa CU-09 para modificar el
 * propio operativo (`Operativo.ESTADOS_SOLO_LECTURA`), NO `admiteIngresos`
 * (esa función es más angosta: sólo ACTIVO/EN_PLANIFICACION, pensada para el
 * alta de personal por QR — CU-12 permite además NUEVO y EN_PROCESO).
 * CU-14 (consulta) no tiene esa restricción: debe poder verse aunque el
 * operativo ya haya finalizado.
 */
import * as Objetivo from '../models/objetivo.model.js';
import * as Operativo from '../models/operativo.model.js';
import * as Auditoria from '../models/auditoria.model.js';
import * as Storage from '../services/storage.service.js';

const ENTIDAD = 'objetivo_buscado';
const ENTIDAD_FOTOS = 'fotos_objetivo';

/** Adjunta la URL firmada de cada foto (nunca se persiste, se genera en caliente). */
async function conUrlsFirmadas(objetivo) {
  if (!objetivo) return objetivo;
  const fotos = await Promise.all(
    (objetivo.fotos ?? []).map(async (f) => ({
      id: f.id,
      url: await Storage.generarUrlFirmada(f.path),
    }))
  );
  return { ...objetivo, fotos };
}

function estadoCerrado(operativo) {
  return Operativo.ESTADOS_SOLO_LECTURA.includes(operativo.estado);
}

/** GET /api/operativos/:id/objetivo — CU-14 */
export async function obtener(req, res, next) {
  try {
    const { id: operativoId } = req.params;
    const operativo = await Operativo.buscarPorId(operativoId);
    if (!operativo) return res.status(404).json({ error: 'Operativo no encontrado.' });

    const objetivo = await Objetivo.buscarPorOperativo(operativoId);
    if (!objetivo) {
      return res.status(404).json({ error: 'Todavía no se cargó el objetivo buscado de este operativo.', motivo: 'sin_objetivo' });
    }

    res.json({ objetivo: await conUrlsFirmadas(objetivo) });
  } catch (err) { next(err); }
}

/** POST /api/operativos/:id/objetivo — CU-12 */
export async function crear(req, res, next) {
  try {
    const { id: operativoId } = req.params;
    const b = req.body ?? {};

    if (b.tipo !== 'PERSONA' && b.tipo !== 'OBJETO') {
      return res.status(400).json({ error: 'Falta indicar el tipo de objetivo (PERSONA u OBJETO).' });
    }

    const operativo = await Operativo.buscarPorId(operativoId);
    if (!operativo) return res.status(404).json({ error: 'Operativo no encontrado.' });
    if (estadoCerrado(operativo)) {
      return res.status(409).json({
        error: `No se puede cargar el objetivo: el operativo está ${operativo.estado.toLowerCase()}.`,
        motivo: 'operativo_cerrado',
      });
    }

    const existente = await Objetivo.buscarPorOperativo(operativoId);
    if (existente) {
      return res.status(409).json({
        error: 'Ya existe una ficha de objetivo para este operativo. Usá "Editar Datos" para modificarla.',
        motivo: 'ya_existe',
      });
    }

    const objetivo = await Objetivo.crear(operativoId, b);

    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.CREAR,
      entidad: ENTIDAD,
      registroId: objetivo.id,
      valoresNuevos: objetivo,
      ip: req.ip,
    });

    res.status(201).json({ objetivo: await conUrlsFirmadas(objetivo) });
  } catch (err) { next(err); }
}

/** PUT /api/operativos/:id/objetivo — CU-13 */
export async function actualizar(req, res, next) {
  try {
    const { id: operativoId } = req.params;

    const operativo = await Operativo.buscarPorId(operativoId);
    if (!operativo) return res.status(404).json({ error: 'Operativo no encontrado.' });
    if (estadoCerrado(operativo)) {
      return res.status(409).json({
        error: `No se puede editar el objetivo: el operativo está ${operativo.estado.toLowerCase()}.`,
        motivo: 'operativo_cerrado',
      });
    }

    const previo = await Objetivo.buscarPorOperativo(operativoId);
    if (!previo) return res.status(404).json({ error: 'Todavía no se cargó el objetivo buscado de este operativo.' });

    const objetivo = await Objetivo.actualizar(previo.id, req.body ?? {});

    // CU-13 paso 9: "el sistema registra la modificación en el historial de
    // cambios del incidente" — Decisión D, sin tabla nueva.
    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.MODIFICAR,
      entidad: ENTIDAD,
      registroId: objetivo.id,
      valoresPrevios: previo,
      valoresNuevos: objetivo,
      ip: req.ip,
    });

    res.json({ objetivo: await conUrlsFirmadas(objetivo) });
  } catch (err) { next(err); }
}

/** POST /api/operativos/:id/objetivo/fotos — CU-12/13 */
export async function subirFotos(req, res, next) {
  try {
    const { id: operativoId } = req.params;

    if (!Storage.estaConfigurado()) {
      return res.status(503).json({ error: 'El almacenamiento de fotos no está configurado en el servidor.' });
    }

    const operativo = await Operativo.buscarPorId(operativoId);
    if (!operativo) return res.status(404).json({ error: 'Operativo no encontrado.' });
    if (estadoCerrado(operativo)) {
      return res.status(409).json({
        error: `No se pueden agregar fotos: el operativo está ${operativo.estado.toLowerCase()}.`,
        motivo: 'operativo_cerrado',
      });
    }

    const objetivo = await Objetivo.buscarPorOperativo(operativoId);
    if (!objetivo) return res.status(404).json({ error: 'Cargá primero los datos del objetivo antes de subir fotos.' });

    const archivos = req.files ?? [];
    if (archivos.length === 0) return res.status(400).json({ error: 'No se recibió ninguna foto.' });

    const paths = [];
    for (const archivo of archivos) {
      const extension = (archivo.originalname.split('.').pop() || 'jpg').toLowerCase();
      const path = await Storage.subir(operativoId, archivo.buffer, extension, archivo.mimetype);
      paths.push(path);
    }
    await Objetivo.agregarFotos(objetivo.id, paths);

    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.CREAR,
      entidad: ENTIDAD_FOTOS,
      registroId: objetivo.id,
      valoresNuevos: { cantidad: paths.length, paths },
      ip: req.ip,
    });

    const actualizado = await Objetivo.buscarPorOperativo(operativoId);
    res.status(201).json({ objetivo: await conUrlsFirmadas(actualizado) });
  } catch (err) { next(err); }
}

/** DELETE /api/operativos/:id/objetivo/fotos/:fotoId — CU-12/13 */
export async function eliminarFoto(req, res, next) {
  try {
    const { id: operativoId, fotoId } = req.params;

    const operativo = await Operativo.buscarPorId(operativoId);
    if (!operativo) return res.status(404).json({ error: 'Operativo no encontrado.' });
    if (estadoCerrado(operativo)) {
      return res.status(409).json({
        error: `No se pueden quitar fotos: el operativo está ${operativo.estado.toLowerCase()}.`,
        motivo: 'operativo_cerrado',
      });
    }

    // El JOIN por operativo_id dentro de buscarFoto es lo que impide borrar
    // una foto de la ficha de OTRO operativo, aunque se adivine el fotoId.
    const foto = await Objetivo.buscarFoto(operativoId, fotoId);
    if (!foto) return res.status(404).json({ error: 'La foto no existe en este operativo.' });

    await Objetivo.eliminarFotoLogico(fotoId);

    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.ELIMINAR,
      entidad: ENTIDAD_FOTOS,
      registroId: foto.id,
      valoresPrevios: foto,
      ip: req.ip,
    });

    res.status(204).end();
  } catch (err) { next(err); }
}
