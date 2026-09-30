/**
 * CONTROLADOR · Grupos de Trabajo (Módulo 4 · CU-21 a CU-26), lado Coordinador.
 *
 * Valida la FORMA del pedido y audita en logs_auditoria (Decisión D). Las
 * reglas de negocio viven en grupo.model.js y estados.js, dentro de la
 * transacción que escribe: cuando una no se cumple, el modelo lanza un
 * ReglaError y app.js lo devuelve con su `motivo`.
 *
 * Desde el 24/09 el coordinador no ELIGE estados de un selector: hace
 * ACCIONES (confirmar, asignar, reabrir, registrar lo que avisan por radio) y,
 * si algo quedó mal registrado, CORRIGE con motivo. Así la línea de tiempo
 * dice qué pasó, no sólo en qué estado quedó.
 *
 * El lado del Líder y del propio agente está en portal.controller.js.
 */
import * as Grupo from '../models/grupo.model.js';
import * as Operativo from '../models/operativo.model.js';
import * as Evento from '../models/evento.model.js';
import * as Auditoria from '../models/auditoria.model.js';

const ENTIDAD = 'grupos';
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RE_NOMBRE = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 .'\-]{2,50}$/;
const MOTIVO_MAX = 100;
const TEXTO_MAX = 200;
const TAMANO_MIN = 2;   // binomio mínimo
const TAMANO_MAX = 50;

/** Acciones que el coordinador pide por POST .../acciones (disolver va por DELETE). */
const ACCIONES_COORDINADOR = ['confirmar', 'asignar', 'reabrir', 'salir', 'llegar_poligono', 'volver', 'llegar_base', 'corregir'];

const esUuid = (v) => typeof v === 'string' && RE_UUID.test(v);
const invalido = (res, error, motivo = 'datos_invalidos') => res.status(400).json({ error, motivo });

/**
 * El operativo tiene que existir y, para escribir, no estar cerrado. Mismo
 * criterio que el Objetivo Buscado (Operativo.ESTADOS_SOLO_LECTURA): se puede
 * mirar un operativo finalizado, no reorganizarlo.
 */
async function operativoEditable(req, res, { soloLectura = false } = {}) {
  const operativo = await Operativo.buscarPorId(req.params.id);
  if (!operativo) {
    res.status(404).json({ error: 'Operativo no encontrado.' });
    return null;
  }
  if (!soloLectura && Operativo.ESTADOS_SOLO_LECTURA.includes(operativo.estado)) {
    res.status(409).json({
      error: `El operativo está ${operativo.estado.toLowerCase()}: sus grupos ya no se pueden modificar.`,
      motivo: 'operativo_cerrado',
    });
    return null;
  }
  return operativo;
}

function validarNombre(nombre) {
  if (typeof nombre !== 'string' || !RE_NOMBRE.test(nombre.trim())) {
    return 'El nombre del grupo debe tener entre 2 y 50 caracteres: letras, números, espacios, puntos o guiones.';
  }
  return null;
}

/** GET /api/operativos/:id/grupos — CU-23 */
export async function listar(req, res, next) {
  try {
    if (!(await operativoEditable(req, res, { soloLectura: true }))) return;
    res.json({ grupos: await Grupo.listarDeOperativo(req.params.id) });
  } catch (err) { next(err); }
}

/** POST /api/operativos/:id/grupos — CU-21. body: { nombre, liderId, clase: 'RASTRILLAJE' | 'ESPECIAL' } */
export async function crear(req, res, next) {
  try {
    const b = req.body ?? {};
    const errNombre = validarNombre(b.nombre);
    if (errNombre) return invalido(res, errNombre);
    if (!esUuid(b.liderId)) return invalido(res, 'Seleccioná al Líder del grupo.', 'lider_requerido');
    if (!Grupo.CLASES.includes(b.clase)) {
      return invalido(res, 'Elegí si es un grupo de rastrillaje o un grupo especial.', 'clase_requerida');
    }
    if (!(await operativoEditable(req, res))) return;

    const grupo = await Grupo.crear(req.params.id, {
      nombre: b.nombre, liderId: b.liderId, clase: b.clase,
    }, req.usuario.id);

    await Auditoria.registrar({
      usuarioId: req.usuario.id, accion: Auditoria.ACCION.CREAR, entidad: ENTIDAD,
      registroId: grupo.id, valoresNuevos: grupo, ip: req.ip,
    });
    res.status(201).json({ grupo });
  } catch (err) { next(err); }
}

/**
 * PUT /api/operativos/:id/grupos/:grupoId — CU-24, sólo nombre y Líder.
 * body: { nombre?, liderId? }. La clase no se edita.
 */
export async function actualizar(req, res, next) {
  try {
    const b = req.body ?? {};
    if (b.estado !== undefined) {
      return invalido(res, 'El estado de un grupo no se elige: se cambia con sus acciones (confirmar, asignar, registrar la salida…).', 'usar_acciones');
    }
    if (b.clase !== undefined) {
      return invalido(res, 'La clase del grupo se elige al crearlo y no cambia.', 'clase_fija');
    }
    const cambios = {};
    if (b.nombre !== undefined) {
      const errNombre = validarNombre(b.nombre);
      if (errNombre) return invalido(res, errNombre);
      cambios.nombre = b.nombre;
    }
    if (b.liderId !== undefined) {
      if (!esUuid(b.liderId)) return invalido(res, 'Líder inválido.', 'lider_requerido');
      cambios.liderId = b.liderId;
    }
    if (Object.keys(cambios).length === 0) return invalido(res, 'No hay cambios para guardar.');
    if (!(await operativoEditable(req, res))) return;

    const { antes, despues } = await Grupo.actualizar(req.params.id, req.params.grupoId, cambios, req.usuario.id);

    // Si cambió el Líder, `liderId` aparece distinto en el antes y el después
    // (CU-24, principio de no repudio).
    await Auditoria.registrar({
      usuarioId: req.usuario.id, accion: Auditoria.ACCION.MODIFICAR, entidad: ENTIDAD,
      registroId: despues.id, valoresPrevios: antes, valoresNuevos: despues, ip: req.ip,
    });
    res.json({ grupo: despues });
  } catch (err) { next(err); }
}

/**
 * POST /api/operativos/:id/grupos/:grupoId/acciones
 * body: { accion, ocurridoEn?, zona?, motivo?, estadoDestino? }
 *
 *  · confirmar / reabrir                      → acciones de armado.
 *  · asignar { zona }                         → hasta el CU-28 (Módulo 5), la zona es un texto.
 *  · salir / llegar_poligono / volver /       → lo que avisa el Líder por radio. `ocurridoEn`
 *    llegar_base { ocurridoEn? }                opcional: la hora en que pasó, si el aviso llegó tarde.
 *  · corregir { estadoDestino, motivo }       → arreglar lo que quedó mal registrado.
 */
export async function accion(req, res, next) {
  try {
    const b = req.body ?? {};
    if (!ACCIONES_COORDINADOR.includes(b.accion)) return invalido(res, 'Acción de grupo inválida.', 'accion_invalida');

    const terreno = Grupo.ACCIONES_TERRENO.includes(b.accion);
    if (b.ocurridoEn !== undefined && b.ocurridoEn !== null) {
      if (!terreno) return invalido(res, 'La hora sólo se carga al registrar lo que avisan del terreno.');
      if (Number.isNaN(new Date(b.ocurridoEn).getTime())) return invalido(res, 'La hora no es válida.', 'hora_invalida');
    }
    const zona = typeof b.zona === 'string' ? b.zona.trim() : '';
    if (b.accion === 'asignar' && (zona.length < 2 || zona.length > TEXTO_MAX)) {
      return invalido(res, `Describí la zona asignada (2 a ${TEXTO_MAX} caracteres).`, 'zona_requerida');
    }
    const motivo = typeof b.motivo === 'string' ? b.motivo.trim() : '';
    if (b.accion === 'corregir') {
      if (motivo.length < 3 || motivo.length > TEXTO_MAX) {
        return invalido(res, `Una corrección necesita el motivo (3 a ${TEXTO_MAX} caracteres).`, 'motivo_requerido');
      }
      if (!Grupo.ESTADOS_CORREGIBLES.includes(b.estadoDestino)) {
        return invalido(res, 'Estado de destino inválido para una corrección.', 'estado_invalido');
      }
    }
    if (!(await operativoEditable(req, res))) return;

    const r = await Grupo.transicionar(req.params.id, req.params.grupoId, b.accion, {
      fuente: terreno ? 'RADIO' : 'COORDINADOR',
      ocurridoEn: terreno ? (b.ocurridoEn ?? null) : null,
      nota: b.accion === 'asignar' ? zona : null,
      motivo: b.accion === 'corregir' ? motivo : null,
      estadoDestino: b.accion === 'corregir' ? b.estadoDestino : null,
    }, req.usuario.id);

    if (r.resultado === 'APLICADO') {
      await Auditoria.registrar({
        usuarioId: req.usuario.id, accion: Auditoria.ACCION.MODIFICAR, entidad: ENTIDAD,
        registroId: req.params.grupoId, valoresPrevios: r.antes,
        valoresNuevos: { ...r.despues, accion: b.accion, eventoId: r.eventoId }, ip: req.ip,
      });
    }
    res.json({ grupo: r.despues, resultado: r.resultado });
  } catch (err) { next(err); }
}

/**
 * POST /api/operativos/:id/grupos/mover — CU-21 paso 6 / CU-24 (Drag & Drop).
 * body: { agenteOperativoId, destinoGrupoId: uuid | null }  (null = "Sin grupo")
 */
export async function mover(req, res, next) {
  try {
    const b = req.body ?? {};
    if (!esUuid(b.agenteOperativoId)) return invalido(res, 'Falta el agente a mover.');
    if (b.destinoGrupoId !== null && !esUuid(b.destinoGrupoId)) return invalido(res, 'Grupo de destino inválido.');
    if (!(await operativoEditable(req, res))) return;

    const { antes, despues } = await Grupo.moverAgente(
      req.params.id,
      { agenteOperativoId: b.agenteOperativoId, destinoGrupoId: b.destinoGrupoId },
      req.usuario.id
    );

    // La asignación se audita sobre el AGENTE (su grupo_id es lo que cambia, CU-21 paso 8).
    await Auditoria.registrar({
      usuarioId: req.usuario.id, accion: Auditoria.ACCION.MODIFICAR, entidad: 'agentes_operativo',
      registroId: despues.id, valoresPrevios: antes, valoresNuevos: despues, ip: req.ip,
    });
    res.json({ agente: despues });
  } catch (err) { next(err); }
}

/**
 * POST /api/operativos/:id/grupos/:grupoId/extraer — CU-26.
 * body: { agenteOperativoId, motivo, nuevoLiderId?, riesgoAceptado? }
 * El retirado queda siempre REPLEGADO y sin grupo (decisión 21/09 y 24/09).
 */
export async function extraer(req, res, next) {
  try {
    const b = req.body ?? {};
    if (!esUuid(b.agenteOperativoId)) return invalido(res, 'Falta el agente a retirar.');
    const motivo = typeof b.motivo === 'string' ? b.motivo.trim() : '';
    if (!motivo) return invalido(res, 'Indicá el motivo de la baja.', 'motivo_requerido');
    if (motivo.length > MOTIVO_MAX) return invalido(res, `El motivo admite hasta ${MOTIVO_MAX} caracteres.`);
    if (b.nuevoLiderId != null && !esUuid(b.nuevoLiderId)) return invalido(res, 'Nuevo líder inválido.');
    if (!(await operativoEditable(req, res))) return;

    const resultado = await Grupo.extraerAgente(req.params.id, req.params.grupoId, {
      agenteOperativoId: b.agenteOperativoId,
      motivo,
      nuevoLiderId: b.nuevoLiderId ?? null,
      riesgoAceptado: b.riesgoAceptado === true,
    }, req.usuario.id);

    // Paso 9: la baja parcial y su motivo.
    await Auditoria.registrar({
      usuarioId: req.usuario.id, accion: Auditoria.ACCION.MODIFICAR, entidad: ENTIDAD,
      registroId: req.params.grupoId,
      valoresPrevios: resultado.antes,
      valoresNuevos: {
        ...resultado.despues,
        retiro: { agenteOperativoId: b.agenteOperativoId, motivo, alertaBinomio: resultado.alertaBinomio },
      },
      ip: req.ip,
    });
    res.json({ grupo: resultado.despues, alertaBinomio: resultado.alertaBinomio });
  } catch (err) { next(err); }
}

/** DELETE /api/operativos/:id/grupos/:grupoId — CU-25 (baja lógica, sólo desde la base). */
export async function disolver(req, res, next) {
  try {
    if (!(await operativoEditable(req, res))) return;
    const { antes } = await Grupo.disolver(req.params.id, req.params.grupoId, req.usuario.id);

    await Auditoria.registrar({
      usuarioId: req.usuario.id, accion: Auditoria.ACCION.ELIMINAR, entidad: ENTIDAD,
      registroId: req.params.grupoId, valoresPrevios: antes,
      valoresNuevos: { ...antes, estado: 'DISUELTO', eliminadoEn: new Date().toISOString() },
      ip: req.ip,
    });
    res.status(204).end();
  } catch (err) { next(err); }
}

/** POST /api/operativos/:id/grupos/automatico — CU-22. body: { tamano } */
export async function armadoAutomatico(req, res, next) {
  try {
    const tamano = Number(req.body?.tamano);
    if (!Number.isInteger(tamano) || tamano < TAMANO_MIN || tamano > TAMANO_MAX) {
      return invalido(res, `El tamaño máximo por grupo tiene que ser un número entre ${TAMANO_MIN} y ${TAMANO_MAX}.`);
    }
    if (!(await operativoEditable(req, res))) return;

    const resultado = await Grupo.armadoAutomatico(req.params.id, { tamano }, req.usuario.id);

    // Paso 8: un registro por grupo creado, todos marcados con la misma
    // ejecución del algoritmo.
    const ejecucion = {
      tamanoMaximo: tamano,
      gruposCreados: resultado.creados.length,
      asignados: resultado.asignados,
      sinAsignar: resultado.sinAsignar.length,
      limitadoPorLideres: resultado.limitadoPorLideres,
    };
    for (const g of resultado.creados) {
      await Auditoria.registrar({
        usuarioId: req.usuario.id, accion: Auditoria.ACCION.CREAR, entidad: ENTIDAD,
        registroId: g.id, valoresNuevos: { ...g, armadoAutomatico: ejecucion }, ip: req.ip,
      });
    }
    res.status(201).json(resultado);
  } catch (err) { next(err); }
}

/** GET /api/operativos/:id/grupos/:grupoId/linea-tiempo — la historia del grupo. */
export async function lineaTiempoGrupo(req, res, next) {
  try {
    if (!(await operativoEditable(req, res, { soloLectura: true }))) return;
    if (!esUuid(req.params.grupoId)) return invalido(res, 'Grupo inválido.');
    res.json({ eventos: await Evento.lineaDeTiempoGrupo(req.params.id, req.params.grupoId) });
  } catch (err) { next(err); }
}

/** GET /api/operativos/:id/agentes/:agenteOperativoId/linea-tiempo — el día de una persona. */
export async function lineaTiempoAgente(req, res, next) {
  try {
    if (!(await operativoEditable(req, res, { soloLectura: true }))) return;
    if (!esUuid(req.params.agenteOperativoId)) return invalido(res, 'Agente inválido.');
    res.json({ eventos: await Evento.lineaDeTiempoAgente(req.params.id, req.params.agenteOperativoId) });
  } catch (err) { next(err); }
}
