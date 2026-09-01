/**
 * CONTROLADOR · Agentes de un Operativo (CU-17 Editar Agentes de Operativo)
 *
 * El alta por QR (auto-servicio) vive en registro.controller.js#altaEnOperativo.
 * Acá está el camino del Coordinador: agregar a alguien que ya tiene cuenta,
 * editar su encarnación táctica (Decisión A) y darlo de baja del operativo
 * (baja lógica — nunca toca `usuarios`).
 */
import * as AgenteOperativo from '../models/agenteOperativo.model.js';
import * as Operativo from '../models/operativo.model.js';
import * as Usuario from '../models/usuario.model.js';
import * as Auditoria from '../models/auditoria.model.js';

const ENTIDAD = 'agentes_operativo';

/**
 * POST /api/operativos/:id/agentes
 * body: { usuarioId, especialidadId?, abandonarAnterior? }
 */
export async function agregar(req, res, next) {
  try {
    const { id: operativoId } = req.params;
    const b = req.body ?? {};

    if (!b.usuarioId) {
      return res.status(400).json({ error: 'Falta el usuario a agregar.' });
    }

    const operativo = await Operativo.buscarPorId(operativoId);
    if (!operativo) return res.status(404).json({ error: 'Operativo no encontrado.' });
    if (!Operativo.admiteIngresos(operativo)) {
      return res.status(409).json({
        error: `No se pueden agregar agentes: el operativo está ${operativo.estado.toLowerCase()}.`,
        motivo: 'operativo_cerrado',
      });
    }

    const usuario = await Usuario.buscarPorId(b.usuarioId);
    if (!usuario || usuario.estado === 'ELIMINADO') {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const altaPrevia = await AgenteOperativo.altaActivaDe(b.usuarioId);

    if (altaPrevia && altaPrevia.operativoId === operativoId) {
      return res.status(409).json({
        error: 'Ese agente ya está en este operativo.',
        motivo: 'ya_en_este_operativo',
      });
    }

    // Regla de Ubicuidad (Decisión B): mismo patrón que CU-15 paso 6.2 — se
    // informa y se espera confirmación explícita, esta vez del Coordinador.
    if (altaPrevia && !b.abandonarAnterior) {
      return res.status(409).json({
        error: `Ya está asignado al operativo "${altaPrevia.operativoTitulo}". ¿Confirma el traslado a este?`,
        motivo: 'regla_ubicuidad',
        operativoActual: {
          id: altaPrevia.operativoId,
          titulo: altaPrevia.operativoTitulo,
          localidad: altaPrevia.operativoLocalidad,
        },
      });
    }

    const agente = await AgenteOperativo.darDeAlta({
      usuarioId: b.usuarioId,
      operativoId,
      especialidadId: b.especialidadId ?? usuario.especialidadId ?? null,
      abandonarAnterior: Boolean(altaPrevia && b.abandonarAnterior),
    });

    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.CREAR,
      entidad: ENTIDAD,
      registroId: agente.id,
      valoresPrevios: altaPrevia ?? null,
      valoresNuevos: agente,
      ip: req.ip,
    });

    res.status(201).json({ agente });
  } catch (err) { next(err); }
}

/**
 * PUT /api/operativos/:id/agentes/:usuarioId
 * body: { estado?, especialidadId?, esCaminante?, esConductor? }
 */
export async function actualizar(req, res, next) {
  try {
    const { id: operativoId, usuarioId } = req.params;

    const previo = await AgenteOperativo.buscarActivoDeOperativo(operativoId, usuarioId);
    if (!previo) return res.status(404).json({ error: 'El agente no está activo en este operativo.' });

    const b = req.body ?? {};
    const agente = await AgenteOperativo.actualizar(previo.id, {
      estado: b.estado === '' ? null : b.estado,
      especialidadId: b.especialidadId === '' ? null : b.especialidadId,
      esCaminante: b.esCaminante,
      esConductor: b.esConductor,
    });

    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.MODIFICAR,
      entidad: ENTIDAD,
      registroId: agente.id,
      valoresPrevios: previo,
      valoresNuevos: agente,
      ip: req.ip,
    });

    res.json({ agente });
  } catch (err) { next(err); }
}

/** DELETE /api/operativos/:id/agentes/:usuarioId — baja lógica (no toca Usuario). */
export async function quitar(req, res, next) {
  try {
    const { id: operativoId, usuarioId } = req.params;

    const previo = await AgenteOperativo.buscarActivoDeOperativo(operativoId, usuarioId);
    if (!previo) return res.status(404).json({ error: 'El agente no está activo en este operativo.' });

    await AgenteOperativo.egresar(previo.id);

    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.ELIMINAR,
      entidad: ENTIDAD,
      registroId: previo.id,
      valoresPrevios: previo,
      valoresNuevos: { ...previo, fechaEgreso: new Date().toISOString(), motivo: 'Baja del operativo' },
      ip: req.ip,
    });

    res.status(204).end();
  } catch (err) { next(err); }
}
