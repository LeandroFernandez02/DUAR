/**
 * CONTROLADOR · Puesto de comando (CU-16; 01/10, migración 016; rehecho el 02/11, migración 030)
 *
 *   GET  /api/operativos/:id/mando           → Jefe de Operativo, turno e historiales
 *   POST /api/operativos/:id/mando/ingreso   { usuarioId?, puesto, trasladar? }
 *   POST /api/operativos/:id/mando/retiro    { usuarioId?, motivo }
 *   PUT  /api/operativos/:id/mando/jefe      { usuarioId | null }   (null = «No asignado»)
 *
 * Turno: sin `usuarioId`, el coordinador opera sobre sí mismo. Un administrador registra a
 * otros, pero no figura él mismo. Registrar un egreso exige motivo, también el propio (decisión del 14/11).
 * Jefe: lo asignan, cambian o quitan coordinadores, administradores y jefes de operativo.
 * Las reglas viven en mando.model.js; acá la forma del pedido y la auditoría.
 */
import * as Mando from '../models/mando.model.js';
import * as Auditoria from '../models/auditoria.model.js';

const esAdmin = req => (req.usuario?.rol ?? '').toLowerCase() === 'administrador';
const invalido = (res, error, motivo) => res.status(400).json({ error, motivo });

/** A quién se refiere el pedido: el indicado o, para un coordinador, él mismo. */
function destinatario(req) {
  const id = req.body?.usuarioId;
  if (id) return id;
  return esAdmin(req) ? null : req.usuario.id;
}

const auditar = (req, accion, valoresNuevos, entidad = 'presencias_mando') => Auditoria.registrar({
  usuarioId: req.usuario.id,
  accion: Auditoria.ACCION.MODIFICAR,
  entidad,
  registroId: req.params.id,          // el operativo: el puesto de comando es parte de su registro
  valoresNuevos: { accion, ...valoresNuevos },
  ip: req.ip,
});

export async function estado(req, res, next) {
  try {
    res.json(await Mando.estado(req.params.id));
  } catch (err) { next(err); }
}

export async function ingreso(req, res, next) {
  try {
    const usuarioId = destinatario(req);
    if (!usuarioId) return invalido(res, 'Elegí qué coordinador ingresa al turno.', 'usuario_requerido');
    const puesto = req.body?.puesto;
    if (!puesto) return invalido(res, 'Elegí el puesto: «Coordinador» u «Operador Mesa Coordinadora».', 'puesto_invalido');
    const r = await Mando.ingresar({
      operativoId: req.params.id, usuarioId, autorId: req.usuario.id, puesto, trasladar: req.body?.trasladar === true,
    });
    await auditar(req, 'ingreso', { usuarioId, puesto });
    res.status(201).json({ ...r, mando: await Mando.estado(req.params.id) });
  } catch (err) { next(err); }
}

export async function retiro(req, res, next) {
  try {
    const usuarioId = destinatario(req);
    if (!usuarioId) return invalido(res, 'Elegí qué coordinador egresa del turno.', 'usuario_requerido');
    const propio = usuarioId === req.usuario.id;
    const motivo = String(req.body?.motivo ?? '').trim();
    if (motivo.length < 3) {
      return invalido(res, propio ? 'Elegí el motivo de tu egreso.' : 'Registrar el egreso de otro coordinador requiere un motivo.', 'motivo_requerido');
    }
    await Mando.retirar({
      operativoId: req.params.id, usuarioId, autorId: req.usuario.id, motivo,
    });
    await auditar(req, 'retiro', { usuarioId, motivo });
    res.json({ mando: await Mando.estado(req.params.id) });
  } catch (err) { next(err); }
}

/** Asigna, cambia o quita al Jefe de Operativo (02/11). */
export async function jefe(req, res, next) {
  try {
    const b = req.body ?? {};
    if (!Object.hasOwn(b, 'usuarioId')) return invalido(res, 'Elegí al Jefe de Operativo o «No asignado».', 'usuario_requerido');
    if (b.usuarioId && !/^[0-9a-f-]{36}$/i.test(b.usuarioId)) return invalido(res, 'Elegí un Jefe de Operativo de la lista.', 'jefe_invalido');
    const r = await Mando.asignarJefe({ operativoId: req.params.id, usuarioId: b.usuarioId || null, autorId: req.usuario.id });
    await auditar(req, b.usuarioId ? 'jefe_asignado' : 'jefe_quitado',
      { usuarioId: b.usuarioId || null, anteriorId: r.anterior?.usuarioId ?? null }, 'jefes_operativo');
    res.json({ mando: await Mando.estado(req.params.id) });
  } catch (err) { next(err); }
}
