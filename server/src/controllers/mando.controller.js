/**
 * CONTROLADOR · Puesto de comando: presencia de mando (01/10, migración 016)
 *
 *   GET  /api/operativos/:id/mando           → a cargo, presentes e historial
 *   POST /api/operativos/:id/mando/ingreso   { usuarioId?, trasladar? }
 *   POST /api/operativos/:id/mando/retiro    { usuarioId?, motivo?, sucesorId? }
 *   POST /api/operativos/:id/mando/a-cargo   { usuarioId }
 *
 * Sin `usuarioId`, el coordinador opera sobre sí mismo. Un administrador puede
 * hacer todo, pero no figura él mismo como presente: tiene que indicar a qué
 * coordinador registra. Registrar el retiro de OTRO exige motivo.
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
  registroId: req.params.id,          // el operativo: la presencia es parte de su registro
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
    if (!usuarioId) return invalido(res, 'Elegí qué coordinador ingresa al puesto de comando.', 'usuario_requerido');
    const r = await Mando.ingresar({
      operativoId: req.params.id, usuarioId, autorId: req.usuario.id, trasladar: req.body?.trasladar === true,
    });
    await auditar(req, 'ingreso', { usuarioId, quedoACargo: r.quedoACargo });
    res.status(201).json({ ...r, mando: await Mando.estado(req.params.id) });
  } catch (err) { next(err); }
}

export async function retiro(req, res, next) {
  try {
    const usuarioId = destinatario(req);
    if (!usuarioId) return invalido(res, 'Elegí qué coordinador se retira.', 'usuario_requerido');
    const propio = usuarioId === req.usuario.id;
    const motivo = String(req.body?.motivo ?? '').trim();
    if (!propio && motivo.length < 3) {
      return invalido(res, 'Registrar el retiro de otro coordinador requiere un motivo.', 'motivo_requerido');
    }
    const r = await Mando.retirar({
      operativoId: req.params.id, usuarioId, autorId: req.usuario.id,
      motivo: motivo || 'Se retiró del puesto de comando', sucesorId: req.body?.sucesorId ?? null,
    });
    await auditar(req, 'retiro', { usuarioId, motivo: motivo || null, sucesorId: req.body?.sucesorId ?? null });
    res.json({ ...r, mando: await Mando.estado(req.params.id) });
  } catch (err) { next(err); }
}

export async function aCargo(req, res, next) {
  try {
    const usuarioId = req.body?.usuarioId;
    if (!usuarioId) return invalido(res, 'Elegí qué coordinador queda a cargo.', 'usuario_requerido');
    await Mando.asignarMando({
      operativoId: req.params.id, usuarioId, autorId: req.usuario.id, autorEsAdmin: esAdmin(req),
    });
    await auditar(req, 'a_cargo', { usuarioId });
    res.json({ mando: await Mando.estado(req.params.id) });
  } catch (err) { next(err); }
}
