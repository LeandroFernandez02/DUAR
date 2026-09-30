/**
 * CONTROLADOR · Portal del Agente — lo que el propio agente y el Líder de Grupo
 * hacen desde el celular (modelo de estados del 24/09).
 *
 * Nada de esto pasa por el middleware `gestores`: el Líder tiene rol `agente`.
 * Lo que lo habilita no es un rol sino una fila — ser `grupos.lider_id` de SU
 * alta vigente — y eso lo verifica grupo.model.js#transicionar evento por evento.
 *
 *  · El Líder INFORMA lo que pasó (salimos, llegamos, volvemos, llegamos a la
 *    base). En el terreno casi nunca hay señal: el celular guarda cada evento
 *    con la hora en que se tocó y los manda en orden cuando vuelve la señal.
 *    Por eso los eventos llegan en lote, cada uno con su id (reenviar no
 *    duplica) y su resultado propio.
 *  · El agente sin grupo se marca Disponible o No disponible. Con grupo, su
 *    estado lo define el grupo (Regla 1).
 */
import * as Grupo from '../models/grupo.model.js';
import * as AgenteOperativo from '../models/agenteOperativo.model.js';
import * as Auditoria from '../models/auditoria.model.js';
import { ESTADOS_AGENTE_ELEGIBLES } from '../models/estados.js';

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_EVENTOS_POR_LOTE = 20;

async function altaVigente(req, res) {
  const alta = await AgenteOperativo.altaActivaDe(req.usuario.id);
  if (!alta) {
    res.status(404).json({ error: 'No estás asignado a ningún operativo en curso.', motivo: 'sin_operativo' });
    return null;
  }
  return alta;
}

/** GET /api/mi-grupo — mi estado y mi grupo (o null). */
export async function miGrupo(req, res, next) {
  try {
    const alta = await AgenteOperativo.altaActivaDe(req.usuario.id);
    if (!alta) return res.json({ agente: null, grupo: null });
    res.json({
      agente: {
        id: alta.id,
        operativoId: alta.operativoId,
        estado: alta.estado,
        estadoActualizadoEn: alta.estadoActualizadoEn,
        grupoId: alta.grupoId,
      },
      grupo: await Grupo.grupoDelAgente(alta),
    });
  } catch (err) { next(err); }
}

/**
 * POST /api/mi-grupo/eventos
 * body: { eventos: [{ id, grupoId, accion, ocurridoEn }] }  en el orden en que se tocaron.
 * Respuesta: { resultados: [{ id, resultado, mensaje? }], grupo }
 *   resultado: APLICADO | CONFIRMACION | SUPERADO | RECHAZADO
 *
 * Un evento que no se puede aplicar no corta el lote: queda registrado con su
 * resultado (es parte de la historia) y el celular lo saca de la cola.
 */
export async function eventosMiGrupo(req, res, next) {
  try {
    const eventos = Array.isArray(req.body?.eventos) ? req.body.eventos : null;
    if (!eventos || eventos.length === 0 || eventos.length > MAX_EVENTOS_POR_LOTE) {
      return res.status(400).json({ error: `Enviá entre 1 y ${MAX_EVENTOS_POR_LOTE} eventos.`, motivo: 'datos_invalidos' });
    }
    const alta = await altaVigente(req, res);
    if (!alta) return;

    const resultados = [];
    for (const ev of eventos) {
      if (!RE_UUID.test(ev?.id ?? '') || !RE_UUID.test(ev?.grupoId ?? '')
        || !Grupo.ACCIONES_TERRENO.includes(ev?.accion) || Number.isNaN(new Date(ev?.ocurridoEn).getTime())) {
        resultados.push({ id: ev?.id ?? null, resultado: 'RECHAZADO', mensaje: 'Evento mal formado.' });
        continue;
      }
      try {
        const r = await Grupo.transicionar(alta.operativoId, ev.grupoId, ev.accion, {
          fuente: 'PORTAL_LIDER',
          ocurridoEn: ev.ocurridoEn,
          clienteEventoId: ev.id,
          autorAgenteOperativoId: alta.id,
        }, req.usuario.id);
        if (r.resultado === 'APLICADO') {
          await Auditoria.registrar({
            usuarioId: req.usuario.id, accion: Auditoria.ACCION.MODIFICAR, entidad: 'grupos',
            registroId: ev.grupoId, valoresPrevios: r.antes,
            valoresNuevos: { ...r.despues, accion: ev.accion, origen: 'portal_lider', eventoId: r.eventoId },
            ip: req.ip,
          });
        }
        resultados.push({ id: ev.id, resultado: r.resultado });
      } catch (err) {
        if (!err.status || err.status >= 500) throw err;
        // El grupo ya no existe en este operativo, etc.: no se reintenta.
        resultados.push({ id: ev.id, resultado: 'RECHAZADO', mensaje: err.message });
      }
    }

    const vigente = await AgenteOperativo.altaActivaDe(req.usuario.id);
    res.json({ resultados, grupo: vigente ? await Grupo.grupoDelAgente(vigente) : null });
  } catch (err) { next(err); }
}

/**
 * PUT /api/mi-estado — el agente SIN grupo se marca Disponible o No disponible.
 * body: { estado }
 * Con grupo, su estado lo define el grupo: el portal le dice que avise al
 * Líder o al Coordinador (lo impide también la base, con el CHECK de la 010).
 */
export async function miEstado(req, res, next) {
  try {
    const estado = req.body?.estado;
    if (!ESTADOS_AGENTE_ELEGIBLES.includes(estado)) {
      return res.status(400).json({ error: 'Podés marcarte Disponible o No disponible.', motivo: 'estado_invalido' });
    }
    const alta = await altaVigente(req, res);
    if (!alta) return;

    const agente = await AgenteOperativo.cambiarEstadoSinGrupo(alta.id, estado, {
      fuente: 'PORTAL_AGENTE', usuarioId: req.usuario.id,
    });
    await Auditoria.registrar({
      usuarioId: req.usuario.id, accion: Auditoria.ACCION.MODIFICAR, entidad: 'agentes_operativo',
      registroId: alta.id, valoresPrevios: alta,
      valoresNuevos: { ...agente, origen: 'portal_agente' }, ip: req.ip,
    });
    res.json({
      agente: {
        id: agente.id, operativoId: agente.operativoId, estado: agente.estado,
        estadoActualizadoEn: agente.estadoActualizadoEn, grupoId: agente.grupoId,
      },
    });
  } catch (err) { next(err); }
}
