/**
 * CONTROLADOR · Usuarios (CU-04 Consultar, CU-05 Crear, CU-06 Modificar, CU-07 Eliminar)
 *
 * Acá viven las reglas del Módulo 2. El Modelo sólo hace SQL; las validaciones
 * de negocio (unicidad, autobloqueo, invalidación de sesiones) son de esta capa.
 */
import bcrypt from 'bcryptjs';
import * as Usuario from '../models/usuario.model.js';
import * as Sesion from '../models/sesion.model.js';
import * as Auditoria from '../models/auditoria.model.js';
import { query } from '../config/db.js';

const ENTIDAD = 'usuarios';

/** Traduce el nombre del rol a su UUID; el frontend trabaja con nombres. */
async function resolverRolId({ rolId, rol }) {
  if (rolId) return rolId;
  if (!rol) return null;
  const { rows } = await query(`SELECT id FROM cat_roles WHERE lower(nombre) = lower($1)`, [rol]);
  return rows[0]?.id ?? null;
}

/** GET /api/usuarios — CU-04 Consultar Usuarios */
export async function listar(req, res, next) {
  try {
    // Los ELIMINADOS quedan fuera: son tombstones para auditoría, no recursos.
    res.json({ usuarios: await Usuario.listar() });
  } catch (err) { next(err); }
}

/** GET /api/usuarios/:id */
export async function obtener(req, res, next) {
  try {
    const usuario = await Usuario.buscarPorId(req.params.id);
    if (!usuario || usuario.estado === 'ELIMINADO') {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
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

    const duplicado = await Usuario.existeDniOEmail(b.dni, b.email);
    if (duplicado.dni || duplicado.email) {
      return res.status(409).json({
        error: 'El usuario ya se encuentra registrado.',
        campo: duplicado.dni ? 'dni' : 'email',
      });
    }

    const rolId = await resolverRolId(b);
    if (!rolId) return res.status(400).json({ error: 'Rol inválido.' });

    const creado = await Usuario.crear({
      ...b,
      rolId,
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
    if (!previo) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const b = req.body ?? {};

    if (b.email && b.email.toLowerCase() !== previo.email.toLowerCase()) {
      const { rows } = await query(
        `SELECT id FROM usuarios WHERE lower(email) = lower($1) AND id <> $2`,
        [b.email, id]
      );
      if (rows.length) return res.status(409).json({ error: 'Ese email ya está en uso.', campo: 'email' });
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

    if (b.rol || b.rolId) campos.rolId = await resolverRolId(b);

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
    if (!previo || previo.estado === 'ELIMINADO') {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (previo.rol === 'administrador') {
      const { rows } = await query(
        `SELECT count(*)::int AS n
           FROM usuarios u JOIN cat_roles r ON r.id = u.rol_id
          WHERE lower(r.nombre) = 'administrador' AND u.estado = 'ACTIVO'`
      );
      if (rows[0].n <= 1) {
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
    res.json({ eventos: await Auditoria.porRegistro(ENTIDAD, req.params.id) });
  } catch (err) { next(err); }
}
