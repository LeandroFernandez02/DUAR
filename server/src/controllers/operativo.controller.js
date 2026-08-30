/**
 * CONTROLADOR · Operativos
 *   · CU-08 Crear · CU-09 Modificar · CU-10 Finalizar · CU-11 Consultar
 */
import * as Operativo from '../models/operativo.model.js';
import * as Auditoria from '../models/auditoria.model.js';

const ENTIDAD = 'operativos';

/** GET /api/operativos — CU-11, con ?busqueda= y ?estado= */
export async function listar(req, res, next) {
  try {
    const { busqueda, estado } = req.query;
    res.json({ operativos: await Operativo.listar({ busqueda, estado }) });
  } catch (err) { next(err); }
}

/** GET /api/operativos/:id */
export async function obtener(req, res, next) {
  try {
    const operativo = await Operativo.buscarPorId(req.params.id);
    if (!operativo) return res.status(404).json({ error: 'Operativo no encontrado.' });
    res.json({ operativo });
  } catch (err) { next(err); }
}

/**
 * POST /api/operativos — CU-08
 * Paso 5: campos obligatorios. Observaciones: bloquea carátulas duplicadas
 * dentro de las últimas 24 h.
 */
export async function crear(req, res, next) {
  try {
    const b = req.body ?? {};
    const faltantes = ['titulo', 'localidad', 'fiscalInstruccion', 'fechaHoraInicio']
      .filter(campo => !String(b[campo] ?? '').trim());
    if (faltantes.length || b.puntoCeroLat === undefined || b.puntoCeroLng === undefined) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.', campos: faltantes });
    }

    const lat = Number(b.puntoCeroLat);
    const lng = Number(b.puntoCeroLng);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ error: 'Latitud inválida (–90 a 90).' });
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Longitud inválida (–180 a 180).' });
    }

    if (await Operativo.existeTituloDuplicadoReciente(b.titulo)) {
      return res.status(409).json({
        error: 'Ya existe un operativo con ese título creado en las últimas 24 horas.',
        motivo: 'titulo_duplicado',
      });
    }

    const creado = await Operativo.crear({
      titulo: b.titulo.trim(),
      localidad: b.localidad.trim(),
      fiscalInstruccion: b.fiscalInstruccion.trim(),
      descripcion: b.descripcion || null,
      puntoCeroLat: lat,
      puntoCeroLng: lng,
      fechaHoraInicio: b.fechaHoraInicio,
      coordinadorId: req.usuario.id,
    });

    // CU-08 Observaciones: "Auditoría y Trazabilidad" — Coordinador, IP y
    // timestamp exacto, pensado para peritajes legales posteriores.
    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.CREAR,
      entidad: ENTIDAD,
      registroId: creado.id,
      valoresNuevos: creado,
      ip: req.ip,
    });

    res.status(201).json({ operativo: creado });
  } catch (err) { next(err); }
}

/**
 * PUT /api/operativos/:id — CU-09
 * Precondición: no se puede modificar un operativo FINALIZADO/ELIMINADO
 * (Observaciones: "solo lectura" por validez legal).
 */
export async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const previo = await Operativo.buscarPorId(id);
    if (!previo) return res.status(404).json({ error: 'Operativo no encontrado.' });

    if (Operativo.ESTADOS_SOLO_LECTURA.includes(previo.estado)) {
      return res.status(409).json({
        error: `No se puede modificar: el operativo está ${previo.estado.toLowerCase()} (sólo lectura).`,
        motivo: 'solo_lectura',
      });
    }

    const b = req.body ?? {};
    if (b.puntoCeroLat !== undefined || b.puntoCeroLng !== undefined) {
      const lat = Number(b.puntoCeroLat);
      const lng = Number(b.puntoCeroLng);
      if (Number.isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ error: 'Latitud inválida (–90 a 90).' });
      }
      if (Number.isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Longitud inválida (–180 a 180).' });
      }
    }

    const actualizado = await Operativo.actualizar(id, b);

    // Paso 6: valores previos y nuevos, para poder reconstruir la evolución
    // de la carátula o el Fiscal ante un requerimiento judicial.
    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.MODIFICAR,
      entidad: ENTIDAD,
      registroId: id,
      valoresPrevios: previo,
      valoresNuevos: actualizado,
      ip: req.ip,
    });

    res.json({ operativo: actualizado });
  } catch (err) { next(err); }
}

/**
 * POST /api/operativos/:id/activar — CU-08 paso 8 (transición automática)
 * Se llama al entrar por primera vez al operativo. Idempotente.
 */
export async function activar(req, res, next) {
  try {
    const operativo = await Operativo.activarSiEsNuevo(req.params.id);
    if (!operativo) return res.status(404).json({ error: 'Operativo no encontrado.' });
    res.json({ operativo });
  } catch (err) { next(err); }
}

/**
 * POST /api/operativos/:id/finalizar — CU-10
 * Precondición: ACTIVO, EN_PLANIFICACION o EN_PROCESO.
 */
export async function finalizar(req, res, next) {
  try {
    const { id } = req.params;
    const previo = await Operativo.buscarPorId(id);
    if (!previo) return res.status(404).json({ error: 'Operativo no encontrado.' });

    if (!['ACTIVO', 'EN_PLANIFICACION', 'EN_PROCESO'].includes(previo.estado)) {
      return res.status(409).json({
        error: `No se puede finalizar: el operativo está ${previo.estado.toLowerCase()}.`,
        motivo: 'estado_invalido',
      });
    }

    const finalizado = await Operativo.finalizar(id, { notaFinal: req.body?.notaFinal ?? null });

    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.MODIFICAR,
      entidad: ENTIDAD,
      registroId: id,
      valoresPrevios: previo,
      valoresNuevos: { ...finalizado, motivo: 'Finalización de operativo (CU-10)' },
      ip: req.ip,
    });

    res.json({ operativo: finalizado });
  } catch (err) { next(err); }
}

/** DELETE /api/operativos/:id — baja lógica, sólo si sigue en NUEVO. */
export async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const previo = await Operativo.buscarPorId(id);
    if (!previo) return res.status(404).json({ error: 'Operativo no encontrado.' });

    if (previo.estado !== 'NUEVO') {
      return res.status(409).json({
        error: 'Sólo se puede eliminar un operativo recién creado (NUEVO). Uno en curso se cierra con "Finalizar".',
        motivo: 'no_es_nuevo',
      });
    }

    await Operativo.eliminar(id);

    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.ELIMINAR,
      entidad: ENTIDAD,
      registroId: id,
      valoresPrevios: previo,
      valoresNuevos: { ...previo, estado: 'ELIMINADO' },
      ip: req.ip,
    });

    res.status(204).end();
  } catch (err) { next(err); }
}
