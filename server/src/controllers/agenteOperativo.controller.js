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
import * as Grupo from '../models/grupo.model.js';
import { ESTADOS_AGENTE_ELEGIBLES } from '../models/estados.js';

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
      fuente: 'COORDINADOR',
      registradoPor: req.usuario.id,
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
 * body: { estado?, especialidadId?, esConductor? }
 */
export async function actualizar(req, res, next) {
  try {
    const { id: operativoId, usuarioId } = req.params;

    const previo = await AgenteOperativo.buscarActivoDeOperativo(operativoId, usuarioId);
    if (!previo) return res.status(404).json({ error: 'El agente no está activo en este operativo.' });

    const b = req.body ?? {};

    // El estado se elige sólo SIN grupo (Regla 1, 24/09): con grupo lo manda el
    // grupo. Si no cambia, no se toca (el formulario lo manda siempre).
    if (b.estado !== undefined && b.estado !== previo.estado) {
      if (previo.grupoId) {
        const grupo = await Grupo.estadoDeGrupo(previo.grupoId);
        return res.status(409).json({
          error: `Está en el ${grupo?.nombre ?? 'grupo'} y su estado lo define el grupo. Para cambiarlo, cambiá el estado del grupo o sacalo del grupo.`,
          motivo: 'agente_en_grupo',
        });
      }
      if (!ESTADOS_AGENTE_ELEGIBLES.includes(b.estado)) {
        return res.status(400).json({
          error: 'Sin grupo, el estado es Disponible o No disponible. Los demás los pone el grupo.',
          motivo: 'estado_invalido',
          estadosValidos: ESTADOS_AGENTE_ELEGIBLES,
        });
      }
      await AgenteOperativo.cambiarEstadoSinGrupo(previo.id, b.estado, {
        fuente: 'COORDINADOR', usuarioId: req.usuario.id,
      });
    }

    // Un grupo de rastrillaje no lleva recursos especiales (26/09), salvo de
    // conductor (29/09). Si con la especialidad o el conductor nuevos dejaría de
    // poder estar en su grupo, primero hay que sacarlo.
    const especialidadNueva = b.especialidadId === '' ? null : b.especialidadId;
    const conductorNuevo = typeof b.esConductor === 'boolean' ? b.esConductor : previo.esConductor;
    if (previo.grupoId
        && ((especialidadNueva !== undefined && especialidadNueva !== previo.especialidadId)
            || conductorNuevo !== previo.esConductor)) {
      const grupo = await Grupo.estadoDeGrupo(previo.grupoId);
      const critico = await AgenteOperativo.esRecursoCritico(
        especialidadNueva !== undefined ? especialidadNueva : previo.especialidadId);
      if (grupo?.clase === 'RASTRILLAJE' && !Grupo.entraARastrillaje({ esRecursoCritico: critico, esConductor: conductorNuevo })) {
        return res.status(409).json({
          error: `Está en el ${grupo.nombre}, que es de rastrillaje: así sería un recurso especial que no va de conductor. Sacalo del grupo primero.`,
          motivo: 'recurso_especial_en_rastrillaje',
        });
      }
    }

    // El Líder de un grupo de rastrillaje camina con su grupo: no puede ser conductor (29/09).
    if (previo.grupoId && conductorNuevo && !previo.esConductor) {
      const grupo = await Grupo.estadoDeGrupo(previo.grupoId);
      if (grupo?.clase === 'RASTRILLAJE' && grupo.liderId === previo.id) {
        return res.status(409).json({
          error: `Es el Líder del ${grupo.nombre}, que es de rastrillaje: el Líder camina con su grupo y no puede ser el conductor. Cambiá el Líder primero.`,
          motivo: 'lider_conductor',
        });
      }
    }

    const agente = await AgenteOperativo.actualizar(previo.id, {
      especialidadId: especialidadNueva,
      esConductor: b.esConductor,
    });

    // Cambiar el conductor de alguien que está en un grupo puede cambiar el
    // estado que le corresponde (Regla 1): se recalcula.
    if (previo.grupoId && b.esConductor !== undefined) {
      await Grupo.recalcularIntegrante(previo.id, req.usuario.id);
    }

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

    // La baja del operativo no se saltea las reglas de grupo (24/09): sólo se da
    // de baja a quien no está en un grupo. En la base se lo saca arrastrando
    // (reabriendo el grupo si ya estaba confirmado); en el terreno, con
    // "Retirar del grupo" (CU-26), que deja el motivo y cuida la sucesión.
    if (previo.grupoId) {
      const grupo = await Grupo.estadoDeGrupo(previo.grupoId);
      return res.status(409).json({
        error: `Integra el ${grupo?.nombre ?? 'grupo'}. Sacalo del grupo primero y después dalo de baja del operativo.`,
        motivo: 'en_grupo',
      });
    }

    await AgenteOperativo.egresar(previo.id, req.usuario.id);

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
