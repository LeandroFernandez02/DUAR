/**
 * CONTROLADOR · Usuarios (CU-04 Consultar, CU-05 Crear, CU-06 Modificar, CU-07 Eliminar)
 *
 * Acá viven las reglas del Módulo 2. El Modelo sólo hace SQL; las validaciones
 * de negocio (unicidad, autobloqueo, invalidación de sesiones) son de esta capa.
 *
 * Permisos por rol (auditoría del 30/09): el coordinador crea y edita
 * coordinadores y agentes, pero para él los ADMINISTRADORES NO EXISTEN: no se
 * listan, no se pueden abrir, editar ni eliminar (responden 404, como un id
 * que no existe) y no puede crear ni ascender a nadie a administrador. Además,
 * nadie cambia su propio rol ni se desactiva a sí mismo, y el último
 * administrador activo no se puede desactivar, degradar ni eliminar.
 */
import bcrypt from 'bcryptjs';
import * as Usuario from '../models/usuario.model.js';
import * as Sesion from '../models/sesion.model.js';
import * as Auditoria from '../models/auditoria.model.js';
import * as TokenEmail from '../models/tokenEmail.model.js';
import { enviarConfirmacion } from '../services/email.service.js';
import { validarDatosPersonales } from '../utils/validaciones.js';
import { query } from '../config/db.js';

const ENTIDAD = 'usuarios';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

const ADMIN = 'administrador';

/** Rol del catálogo (id y nombre en minúsculas) a partir del nombre o del id; null si no existe. */
async function resolverRol({ rolId, rol }) {
  if (!rolId && !rol) return null;
  const { rows } = await query(
    rolId
      ? `SELECT id, lower(nombre) AS nombre FROM cat_roles WHERE id = $1`
      : `SELECT id, lower(nombre) AS nombre FROM cat_roles WHERE lower(nombre) = lower($1)`,
    [rolId ?? rol]
  );
  return rows[0] ?? null;
}

const esAdmin = req => (req.usuario?.rol ?? '').toLowerCase() === ADMIN;

/** Para quien no es administrador, un administrador no existe. */
const visiblePara = (req, usuario) => esAdmin(req) || (usuario?.rol ?? '').toLowerCase() !== ADMIN;

const noEncontrado = res => res.status(404).json({ error: 'Usuario no encontrado.' });

/** ¿Queda algún otro administrador activo además de `id`? */
async function hayOtroAdminActivo(id) {
  const { rows } = await query(
    `SELECT count(*)::int AS n
       FROM usuarios u JOIN cat_roles r ON r.id = u.rol_id
      WHERE lower(r.nombre) = 'administrador' AND u.estado = 'ACTIVO' AND u.id <> $1`,
    [id]
  );
  return rows[0].n > 0;
}

/** GET /api/usuarios — CU-04 Consultar Usuarios */
export async function listar(req, res, next) {
  try {
    // Los ELIMINADOS quedan fuera: son tombstones para auditoría, no recursos.
    // Y al coordinador no se le muestran los administradores.
    const usuarios = await Usuario.listar();
    res.json({ usuarios: usuarios.filter(u => visiblePara(req, u)) });
  } catch (err) { next(err); }
}

/** GET /api/usuarios/:id */
export async function obtener(req, res, next) {
  try {
    const usuario = await Usuario.buscarPorId(req.params.id);
    if (!usuario || usuario.estado === 'ELIMINADO' || !visiblePara(req, usuario)) return noEncontrado(res);
    res.json({ usuario });
  } catch (err) { next(err); }
}

/**
 * POST /api/usuarios — CU-05 Crear Usuarios
 *
 * Paso 3: validación de unicidad de DNI/Email ANTES de intentar el INSERT, para
 * poder devolver un mensaje claro. La constraint UNIQUE de PostgreSQL queda
 * igual como última línea de defensa (lo dice la Observación del CU).
 * Paso 4: la contraseña se guarda con bcrypt, nunca en claro.
 */
export async function crear(req, res, next) {
  try {
    const b = req.body ?? {};
    if (!b.dni || !b.nombre || !b.apellido || !b.email || !b.password) {
      return res.status(400).json({ error: 'DNI, nombre, apellido, email y contraseña son obligatorios.' });
    }

    const errores = validarDatosPersonales(b);
    if (Object.keys(errores).length) {
      return res.status(400).json({ error: 'Datos inválidos.', errores });
    }

    const duplicado = await Usuario.existeDniOEmail(b.dni, b.email);
    if (duplicado.dni || duplicado.email) {
      return res.status(409).json({
        error: 'El usuario ya se encuentra registrado.',
        campo: duplicado.dni ? 'dni' : 'email',
      });
    }

    const rol = await resolverRol(b);
    if (!rol) return res.status(400).json({ error: 'Rol inválido.' });
    if (rol.nombre === ADMIN && !esAdmin(req)) {
      return res.status(403).json({ error: 'Sólo un administrador puede crear administradores.', motivo: 'rol_no_permitido' });
    }

    const creado = await Usuario.crear({
      ...b,
      rolId: rol.id,
      passwordHash: await bcrypt.hash(b.password, 10),
    });

    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.CREAR,
      entidad: ENTIDAD,
      registroId: creado.id,
      valoresNuevos: creado,
      ip: req.ip,
    });

    res.status(201).json({ usuario: creado });
  } catch (err) { next(err); }
}

/**
 * PUT /api/usuarios/:id — CU-06 Modificar Usuarios
 *
 * Paso 5: la contraseña sólo se sobrescribe, nunca se puede leer.
 * Paso 6: el nuevo DNI/email no puede colisionar con OTRO registro.
 */
export async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const previo = await Usuario.buscarPorId(id);
    if (!previo || !visiblePara(req, previo)) return noEncontrado(res);

    const b = req.body ?? {};
    const propio = id === req.usuario.id;

    const errores = validarDatosPersonales(b);
    if (Object.keys(errores).length) {
      return res.status(400).json({ error: 'Datos inválidos.', errores });
    }

    // Sólo cuentan los usuarios no eliminados: el DNI/correo de un eliminado se reutiliza (CU-07, migración 018).
    if (b.email && b.email.toLowerCase() !== previo.email.toLowerCase()) {
      const { rows } = await query(
        `SELECT id FROM usuarios WHERE lower(email) = lower($1) AND id <> $2 AND eliminado_en IS NULL`,
        [b.email, id]
      );
      if (rows.length) return res.status(409).json({ error: 'Ese email ya está en uso.', campo: 'email' });
    }

    if (b.dni && b.dni !== previo.dni) {
      const { rows } = await query(
        `SELECT id FROM usuarios WHERE dni = $1 AND id <> $2 AND eliminado_en IS NULL`,
        [b.dni, id]
      );
      if (rows.length) return res.status(409).json({ error: 'Ese DNI ya está en uso.', campo: 'dni' });
    }

    const campos = { ...b };

    // Este PUT genérico NO es la vía para dar de baja a alguien: eso es CU-07
    // (DELETE), que valida autobloqueo y último administrador. Si se dejara
    // pasar 'ELIMINADO' acá, esas dos protecciones quedarían esquivables.
    if (campos.estado !== undefined) {
      const estado = String(campos.estado).toUpperCase();
      if (estado === 'ELIMINADO') {
        return res.status(400).json({
          error: 'Para dar de baja a un usuario usá la acción "Eliminar usuario" (CU-07), no la edición.',
        });
      }
      if (!['ACTIVO', 'INACTIVO'].includes(estado)) {
        return res.status(400).json({ error: `Estado inválido: "${campos.estado}".` });
      }
      campos.estado = estado;
    }
    const desactiva = campos.estado === 'INACTIVO' && previo.estado !== 'INACTIVO';
    if (desactiva && propio) {
      return res.status(409).json({ error: 'No podés desactivar tu propia cuenta.', motivo: 'autobloqueo' });
    }

    let rolNuevo = null;
    if (b.rol || b.rolId) {
      rolNuevo = await resolverRol(b);
      if (!rolNuevo) return res.status(400).json({ error: 'Rol inválido.' });
    }
    const cambiaRol = !!rolNuevo && rolNuevo.nombre !== (previo.rol ?? '').toLowerCase();
    if (cambiaRol && propio) {
      return res.status(409).json({ error: 'No podés cambiar tu propio rol.', motivo: 'propio_rol' });
    }
    if (cambiaRol && rolNuevo.nombre === ADMIN && !esAdmin(req)) {
      return res.status(403).json({ error: 'Sólo un administrador puede asignar el rol de administrador.', motivo: 'rol_no_permitido' });
    }
    // El sistema nunca se queda sin un administrador activo.
    if ((previo.rol ?? '').toLowerCase() === ADMIN && previo.estado === 'ACTIVO' && (cambiaRol || desactiva)
        && !(await hayOtroAdminActivo(id))) {
      return res.status(409).json({
        error: 'Es el único administrador activo del sistema: no se lo puede desactivar ni quitarle el rol.',
        motivo: 'ultimo_admin',
      });
    }
    if (rolNuevo) campos.rolId = rolNuevo.id;

    let actualizado = await Usuario.actualizar(id, campos);

    // Cambio de contraseña: se hashea aparte, nunca viaja ni se devuelve.
    if (b.password) {
      await query(
        `UPDATE usuarios SET password_hash = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2`,
        [await bcrypt.hash(b.password, 10), id]
      );
      // Cambiar la clave invalida las sesiones abiertas: si alguien tenía el
      // acceso comprometido, el token viejo deja de servir.
      await Sesion.revocarTodasDe(id);
      actualizado = await Usuario.buscarPorId(id);
    }

    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.MODIFICAR,
      entidad: ENTIDAD,
      registroId: id,
      valoresPrevios: previo,
      valoresNuevos: actualizado,
      ip: req.ip,
    });

    res.json({ usuario: actualizado });
  } catch (err) { next(err); }
}

/**
 * DELETE /api/usuarios/:id — CU-07 Eliminar Usuarios (baja lógica)
 *
 * Paso 4.1 · Prevención de autobloqueo: nadie puede desactivarse a sí mismo.
 * Observación del CU: tampoco se puede eliminar al ÚLTIMO administrador, o el
 * sistema quedaría sin nadie que pueda administrarlo.
 * Paso 5 · Soft delete: NUNCA DELETE, el historial operativo debe sobrevivir.
 * Paso 6 · Invalidación inmediata de sesiones (Decisión E).
 * Paso 7 · Registro en logs_auditoria.
 */
export async function eliminar(req, res, next) {
  try {
    const { id } = req.params;

    if (id === req.usuario.id) {
      return res.status(409).json({
        error: 'Error Crítico: No se permite la autodesactivación del perfil administrativo.',
        motivo: 'autobloqueo',
      });
    }

    const previo = await Usuario.buscarPorId(id);
    if (!previo || previo.estado === 'ELIMINADO' || !visiblePara(req, previo)) return noEncontrado(res);

    if ((previo.rol ?? '').toLowerCase() === ADMIN) {
      if (!(await hayOtroAdminActivo(id))) {
        return res.status(409).json({
          error: 'No se puede eliminar al único administrador activo del sistema.',
          motivo: 'ultimo_admin',
        });
      }
    }

    await Usuario.eliminarLogico(id);
    await Sesion.revocarTodasDe(id);   // expulsión inmediata

    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.ELIMINAR,
      entidad: ENTIDAD,
      registroId: id,
      valoresPrevios: previo,
      valoresNuevos: { ...previo, estado: 'ELIMINADO' },
      ip: req.ip,
    });

    res.status(204).end();
  } catch (err) { next(err); }
}

/** GET /api/usuarios/:id/auditoria — historial forense del registro */
export async function auditoria(req, res, next) {
  try {
    const usuario = await Usuario.buscarPorId(req.params.id);
    if (!usuario || !visiblePara(req, usuario)) return noEncontrado(res);
    res.json({ eventos: await Auditoria.porRegistro(ENTIDAD, req.params.id) });
  } catch (err) { next(err); }
}

/**
 * POST /api/usuarios/:id/reenviar-confirmacion — a pedido de un
 * administrador o coordinador, para el agente que dice no haber recibido el
 * correo. Comparte cooldown con el reenvío self-service (mismo reloj, no
 * importa quién lo dispare).
 */
export async function reenviarConfirmacion(req, res, next) {
  try {
    const usuario = await Usuario.buscarPorId(req.params.id);
    if (!usuario || usuario.estado === 'ELIMINADO' || !visiblePara(req, usuario)) return noEncontrado(res);
    if (usuario.estado !== 'PENDIENTE') {
      return res.status(400).json({ error: 'Este usuario ya confirmó su correo.', motivo: 'ya_confirmado' });
    }

    const restantes = await TokenEmail.segundosParaReenviar(usuario.id, 'CONFIRMACION');
    if (restantes > 0) {
      return res.status(429).json({
        error: `Esperá ${restantes}s antes de volver a reenviar.`,
        motivo: 'cooldown',
        segundos: restantes,
      });
    }

    const tokenEmail = await TokenEmail.emitir(usuario.id, 'CONFIRMACION');
    await enviarConfirmacion({
      para: usuario.email,
      nombre: usuario.nombre,
      url: `${FRONTEND_URL}/confirmar-email/${tokenEmail}`,
    });

    res.json({ mensaje: 'Correo de confirmación reenviado.' });
  } catch (err) { next(err); }
}
