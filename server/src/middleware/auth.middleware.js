/**
 * MIDDLEWARE · Sesión y autorización
 *
 * Valida el token contra `sesiones_activas` en CADA request. Es más costoso que
 * verificar la firma de un JWT, pero es lo que hace posible la revocación
 * instantánea que exige la Decisión E.
 */
import * as Sesion from '../models/sesion.model.js';

/** Exige sesión válida. Deja `req.usuario` y `req.token` para los controladores. */
export async function requiereSesion(req, res, next) {
  try {
    const header = req.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Falta el token de sesión.' });

    // Una sola consulta: valida la sesión y trae el usuario completo. Antes eran
    // dos viajes a la base en cada request autenticada.
    const fila = await Sesion.validar(token);
    if (!fila) return res.status(401).json({ error: 'Sesión inválida o expirada.' });

    const { sesionId, ...usuario } = fila;

    // El usuario pudo ser dado de baja o suspendido DESPUÉS de iniciar sesión:
    // se corta acá. PENDIENTE (mail sin confirmar) SÍ puede seguir usando su
    // sesión — sólo queda restringido en acciones puntuales (como el alta en
    // un operativo), no en el acceso general al sistema.
    if (usuario.estado === 'INACTIVO' || usuario.estado === 'ELIMINADO') {
      await Sesion.revocarTodasDe(usuario.id);
      return res.status(403).json({ error: 'La cuenta ya no está activa.' });
    }

    req.usuario = usuario;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

/** Roles del sistema (cat_roles.nombre). */
export const ROL = {
  ADMINISTRADOR: 'administrador',
  COORDINADOR: 'coordinador',
  JEFE_OPERATIVO: 'jefe_operativo',
  AGENTE: 'agente',
};

/**
 * Exige uno de los roles indicados.
 * Uso: router.post('/', requiereSesion, requiereRol('administrador'), ctrl.crear)
 */
export function requiereRol(...rolesPermitidos) {
  const permitidos = rolesPermitidos.map(r => r.toLowerCase());
  return (req, res, next) => {
    const rol = (req.usuario?.rol ?? '').toLowerCase();
    if (!permitidos.includes(rol)) {
      return res.status(403).json({ error: 'No tenés permisos para esta acción.' });
    }
    next();
  };
}

/** Quienes gestionan operativos y usuarios: crean, modifican y operan. */
export const gestores = requiereRol(ROL.ADMINISTRADOR, ROL.COORDINADOR);

/**
 * Quienes pueden VER todo el sistema: los gestores y el Jefe de operativo
 * (relevamiento del 29/10: sólo visualización y extraer informes).
 */
export const lectores = requiereRol(ROL.ADMINISTRADOR, ROL.COORDINADOR, ROL.JEFE_OPERATIVO);
