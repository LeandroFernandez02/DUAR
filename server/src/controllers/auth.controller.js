/**
 * CONTROLADOR · Autenticación (CU-01 Iniciar Sesión)
 *
 * Acá viven las reglas de negocio del login. El Modelo sólo trae datos; este
 * controlador decide qué significa cada caso y qué se le responde al cliente.
 */
import bcrypt from 'bcryptjs';
import * as Usuario from '../models/usuario.model.js';
import * as Sesion from '../models/sesion.model.js';
import * as TokenEmail from '../models/tokenEmail.model.js';
import * as Auditoria from '../models/auditoria.model.js';
import { enviarRecuperacion } from '../services/email.service.js';
import { query } from '../config/db.js';

const HORAS_SESION = Number(process.env.SESION_HORAS ?? 12);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

/** Nunca devolver el hash hacia afuera, aunque el modelo lo haya traído. */
function sinHash(usuario) {
  const { passwordHash, ...resto } = usuario;
  return resto;
}

/**
 * POST /api/auth/login
 *
 * Paso 5 del CU-01: valida credenciales contra PostgreSQL.
 * Paso 4.2: si la cuenta está inactiva o eliminada, informa el estado.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }

    const usuario = await Usuario.buscarPorEmailConHash(email);

    // Un usuario ELIMINADO se trata como inexistente: no se revela que la
    // cuenta existió alguna vez (evita enumerar usuarios dados de baja).
    if (!usuario || usuario.estado === 'ELIMINADO') {
      return res.status(401).json({ error: 'Credenciales incorrectas.', motivo: 'credentials' });
    }

    const coincide = await bcrypt.compare(password, usuario.passwordHash);
    if (!coincide) {
      return res.status(401).json({ error: 'Credenciales incorrectas.', motivo: 'credentials' });
    }

    // CU-01 paso 4.2 — la cuenta existe y la clave es correcta, pero está suspendida
    if (usuario.estado === 'INACTIVO') {
      return res.status(403).json({
        error: 'La cuenta se encuentra inactiva. Contactá al administrador.',
        motivo: 'inactive',
      });
    }

    const token = Sesion.generarToken();
    await Sesion.crear({
      usuarioId: usuario.id,
      token,
      dispositivo: req.get('user-agent')?.slice(0, 255) ?? null,
      ip: req.ip?.slice(0, 45) ?? null,
      horas: HORAS_SESION,
    });

    res.json({ token, usuario: sinHash(usuario) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/logout — revoca únicamente la sesión en curso. */
export async function logout(req, res, next) {
  try {
    if (req.token) await Sesion.revocar(req.token);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

/** GET /api/auth/me — devuelve el usuario de la sesión vigente. */
export async function yo(req, res, next) {
  try {
    res.json({ usuario: req.usuario });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/confirmar-email/:token — CU-02 paso 7
 * Público: el agente todavía puede no tener sesión abierta cuando hace clic.
 */
export async function confirmarEmail(req, res, next) {
  try {
    const acceso = await TokenEmail.validar(req.params.token, 'CONFIRMACION');

    if (!acceso) {
      return res.status(410).json({ error: 'Enlace inválido o vencido.', motivo: 'token_invalido' });
    }
    if (acceso.usado) {
      return res.json({ estado: 'ya_confirmado' });
    }

    await query(`UPDATE usuarios SET email_confirmado = true WHERE id = $1`, [acceso.usuarioId]);
    await TokenEmail.marcarUsado(acceso.id);

    await Auditoria.registrar({
      usuarioId: acceso.usuarioId,
      accion: Auditoria.ACCION.MODIFICAR,
      entidad: 'usuarios',
      registroId: acceso.usuarioId,
      valoresNuevos: { emailConfirmado: true },
      ip: req.ip,
    });

    res.json({ estado: 'ok' });
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/recuperar-contrasena — CU-03 pasos 3-5
 *
 * Paso 4.1 · "Invisibilidad de datos": SIEMPRE se devuelve el mismo mensaje,
 * exista o no ese email. Si se respondiera distinto según el caso, cualquiera
 * podría usar este endpoint para averiguar qué correos están registrados.
 */
export async function solicitarRecuperacion(req, res, next) {
  const MENSAJE = 'Si el correo está registrado, recibirás un enlace en breve.';
  try {
    const { email } = req.body ?? {};
    if (!email) return res.status(400).json({ error: 'El email es obligatorio.' });

    const usuario = await Usuario.buscarPorEmailConHash(email);
    if (usuario && usuario.estado === 'ACTIVO') {
      const token = await TokenEmail.emitir(usuario.id, 'RECUPERACION');
      enviarRecuperacion({
        para: usuario.email,
        nombre: usuario.nombre,
        url: `${FRONTEND_URL}/recuperar-contrasena/${token}`,
      }).catch((err) => console.error('[auth] no se pudo enviar la recuperación:', err.message));
    }
    // Se responde igual en todos los casos: no existe, está INACTIVO, o se
    // mandó bien. La diferencia sólo la ve quien tiene acceso al correo real.

    res.json({ mensaje: MENSAJE });
  } catch (err) { next(err); }
}

/**
 * GET /api/auth/recuperar-contrasena/:token — chequeo de vigencia SIN consumir
 * el token. Existe para poder avisar "enlace vencido" apenas se abre el link
 * (CU-03 paso 6.1), en vez de recién al enviar el formulario.
 */
export async function chequearTokenRecuperacion(req, res, next) {
  try {
    const acceso = await TokenEmail.validar(req.params.token, 'RECUPERACION');
    if (!acceso || acceso.usado) {
      return res.status(410).json({ error: 'Enlace inválido o vencido.', motivo: 'token_invalido' });
    }
    res.json({ valido: true });
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/restablecer-contrasena — CU-03 pasos 8-9
 * Cambiar la clave revoca las sesiones abiertas — mismo criterio que CU-06.
 */
export async function restablecerContrasena(req, res, next) {
  try {
    const { token, password } = req.body ?? {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Faltan datos.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const acceso = await TokenEmail.validar(token, 'RECUPERACION');
    if (!acceso || acceso.usado) {
      return res.status(410).json({ error: 'Enlace inválido o vencido.', motivo: 'token_invalido' });
    }

    await query(
      `UPDATE usuarios SET password_hash = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2`,
      [await bcrypt.hash(password, 10), acceso.usuarioId]
    );
    await TokenEmail.marcarUsado(acceso.id);
    await Sesion.revocarTodasDe(acceso.usuarioId);

    await Auditoria.registrar({
      usuarioId: acceso.usuarioId,
      accion: Auditoria.ACCION.MODIFICAR,
      entidad: 'usuarios',
      registroId: acceso.usuarioId,
      valoresNuevos: { motivo: 'Recuperación de contraseña (CU-03)' },
      ip: req.ip,
    });

    res.json({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (err) { next(err); }
}
