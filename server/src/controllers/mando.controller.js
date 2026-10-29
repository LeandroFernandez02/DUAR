/**
 * CONTROLADOR · Puesto de comando (CU-15; 01/10, migración 016; puestos desde el 29/10, migración 029)
 *
 *   GET  /api/operativos/:id/mando                → de turno (con su puesto) e historial
 *   POST /api/operativos/:id/mando/ingreso        { usuarioId?, puesto, trasladar? }
 *   POST /api/operativos/:id/mando/retiro         { usuarioId?, motivo }
 *   POST /api/operativos/:id/mando/cambiar-puesto { usuarioId?, puesto }
 *
 * Puestos: JEFE_OPERATIVO (rol jefe_operativo), COORDINADOR y ENCARGADO (rol
 * coordinador). Lo consultan los `lectores` (también el Jefe de operativo) y lo
 * registran los `gestores`. Sin `usuarioId`, el coordinador opera sobre sí
 * mismo; un administrador no ocupa puestos: tiene que indicar a quién registra.
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

const auditar = (req, accion, valoresNuevos) => Auditoria.registrar({
  usuarioId: req.usuario.id,
  accion: Auditoria.ACCION.MODIFICAR,
  entidad: 'presencias_mando',
  registroId: req.params.id,          // el operativo: el turno es parte de su registro
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
    if (!usuarioId) return invalido(res, 'Elegí quién ingresa al puesto de comando.', 'usuario_requerido');
    const puesto = String(req.body?.puesto ?? '').toUpperCase();
    const r = await Mando.ingresar({
      operativoId: req.params.id, usuarioId, puesto, autorId: req.usuario.id, trasladar: req.body?.trasladar === true,
    });
    await auditar(req, 'ingreso', { usuarioId, puesto });
    res.status(201).json({ ...r, mando: await Mando.estado(req.params.id) });
  } catch (err) { next(err); }
}

export async function retiro(req, res, next) {
  try {
    const usuarioId = destinatario(req);
    if (!usuarioId) return invalido(res, 'Elegí quién egresa del puesto de comando.', 'usuario_requerido');
    const motivo = String(req.body?.motivo ?? '').trim();
    if (motivo.length < 3) return invalido(res, 'Indicá el motivo del egreso.', 'motivo_requerido');
    await Mando.retirar({ operativoId: req.params.id, usuarioId, autorId: req.usuario.id, motivo });
    await auditar(req, 'retiro', { usuarioId, motivo });
    res.json({ mando: await Mando.estado(req.params.id) });
  } catch (err) { next(err); }
}

export async function cambiarPuesto(req, res, next) {
  try {
    const usuarioId = destinatario(req);
    if (!usuarioId) return invalido(res, 'Elegí a quién le cambiás el puesto.', 'usuario_requerido');
    const puesto = String(req.body?.puesto ?? '').toUpperCase();
    const r = await Mando.cambiarPuesto({ operativoId: req.params.id, usuarioId, puesto, autorId: req.usuario.id });
    await auditar(req, 'cambio_puesto', { usuarioId, puesto });
    res.json({ ...r, mando: await Mando.estado(req.params.id) });
  } catch (err) { next(err); }
}
