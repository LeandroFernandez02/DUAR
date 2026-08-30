/**
 * CONTROLADOR · QR de operativo (CU-15 Generar QR de Operativo)
 *
 * Dos caras del mismo flujo:
 *  · El Coordinador genera y exhibe el QR (requiere sesión y rol).
 *  · El Agente escanea y consulta a qué operativo da acceso (SIN sesión: todavía
 *    puede no tener cuenta — CU-15 paso 5.1 deriva a CU-01 o CU-02).
 */
import * as Operativo from '../models/operativo.model.js';
import * as TokenOperativo from '../models/tokenOperativo.model.js';
import * as AgenteOperativo from '../models/agenteOperativo.model.js';
import * as Auditoria from '../models/auditoria.model.js';

const ENTIDAD = 'tokens_operativo';

/**
 * GET /api/operativos/:id/qr — CU-15 pasos 1-2
 * Devuelve el token vigente; si venció (24 h) emite uno nuevo automáticamente.
 */
export async function obtener(req, res, next) {
  try {
    const operativo = await Operativo.buscarPorId(req.params.id);
    if (!operativo) return res.status(404).json({ error: 'Operativo no encontrado.' });

    if (!Operativo.admiteIngresos(operativo)) {
      return res.status(409).json({
        error: `No se puede generar un QR: el operativo está ${operativo.estado.toLowerCase()}.`,
        motivo: 'operativo_cerrado',
      });
    }

    const token = await TokenOperativo.obtenerOEmitir(operativo.id, req.usuario.id);
    res.json({ qr: token, operativo: { id: operativo.id, titulo: operativo.titulo } });
  } catch (err) { next(err); }
}

/**
 * POST /api/operativos/:id/qr/refrescar — CU-15 Observaciones ("Control de Puerta")
 *
 * Invalida el QR anterior y emite uno nuevo. Es la herramienta del Coordinador
 * cuando sospecha que el código se filtró (ej. lo mandaron por WhatsApp para dar
 * el presente sin estar físicamente en el Puesto de Comando).
 */
export async function refrescar(req, res, next) {
  try {
    const operativo = await Operativo.buscarPorId(req.params.id);
    if (!operativo) return res.status(404).json({ error: 'Operativo no encontrado.' });

    if (!Operativo.admiteIngresos(operativo)) {
      return res.status(409).json({
        error: `No se puede generar un QR: el operativo está ${operativo.estado.toLowerCase()}.`,
        motivo: 'operativo_cerrado',
      });
    }

    const token = await TokenOperativo.emitirNuevo(operativo.id, req.usuario.id);

    // Revocar un QR es una decisión de seguridad táctica: queda registrada.
    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.MODIFICAR,
      entidad: ENTIDAD,
      registroId: token.id,
      valoresNuevos: { operativoId: operativo.id, motivo: 'Refresco manual del QR' },
      ip: req.ip,
    });

    res.json({ qr: token, operativo: { id: operativo.id, titulo: operativo.titulo } });
  } catch (err) { next(err); }
}

/**
 * GET /api/qr/:token — CU-15 pasos 4-5. PÚBLICO, sin sesión.
 *
 * El agente acaba de escanear y todavía puede no tener cuenta. Devuelve los datos
 * del operativo para armar la pantalla de bienvenida ("Ya tengo cuenta" / "Soy
 * nuevo", CU-02 paso 2).
 *
 * Sólo expone información no sensible del operativo: quien tenga el código ya
 * está, por diseño, autorizado a ver a qué operativo se está sumando.
 */
export async function validar(req, res, next) {
  try {
    const acceso = await TokenOperativo.validar(req.params.token);
    if (!acceso) {
      // Mensaje textual del CU-15 paso 4.1.
      return res.status(410).json({
        error: 'Código de acceso vencido. Solicite el QR actualizado.',
        motivo: 'qr_invalido',
      });
    }

    res.json({
      operativo: {
        id: acceso.operativoId,
        titulo: acceso.titulo,
        localidad: acceso.localidad,
        estado: acceso.estadoOperativo,
        fechaHoraInicio: acceso.fechaHoraInicio,
      },
      expiraEn: acceso.expiraEn,
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/operativos/:id/personal — CU-19
 * La grilla del Coordinador. Se consulta por polling: el CU-15 paso 9 pedía
 * WebSockets, pero el sistema corre en Vercel serverless, que no los soporta.
 */
export async function personal(req, res, next) {
  try {
    res.json({ personal: await AgenteOperativo.listarDeOperativo(req.params.id) });
  } catch (err) { next(err); }
}
