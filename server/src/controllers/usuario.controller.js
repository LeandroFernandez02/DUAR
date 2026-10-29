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
 *
 * Jefe de operativo (29/10): sólo consulta (listar, ver, auditoría) — lo
 * aplican las rutas. Como el de administrador, ese rol lo crea y lo asigna
 * sólo un administrador. Para el jefe, igual que para el coordinador, los
 * administradores no existen.
 */
import bcrypt from 'bcryptjs';
import * as Usuario from '../models/usuario.model.js';
import * as Sesion from '../models/sesion.model.js';
import * as Auditoria from '../models/auditoria.model.js';
import * as AgenteOperativo from '../models/agenteOperativo.model.js';
import * as TokenEmail from '../models/tokenEmail.model.js';
import * as Mando from '../models/mando.model.js';
import { enviarConfirmacion } from '../services/email.service.js';
import { validarDatosPersonales, normalizarDatosPersonales, exigirFechaNacimiento } from '../utils/validaciones.js';
import { dominioDelCorreoExiste, MENSAJE_DOMINIO_INEXISTENTE } from '../utils/dominioCorreo.js';
import { query, withTransaction } from '../config/db.js';

const ENTIDAD = 'usuarios';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

const ADMIN = 'administrador';
/** Roles que sólo un administrador crea o asigna. */
const ROLES_SOLO_ADMIN = { administrador: 'administradores', jefe_operativo: 'jefes de operativo' };

const ETIQUETA_ESTADO_AGENTE = {
  EN_ESPERA: 'En espera', DISPONIBLE: 'Disponible', NO_DISPONIBLE: 'No disponible', AGRUPADO: 'Agrupado',
  DESPLEGADO: 'Desplegado', RASTRILLANDO: 'Rastrillando', REPLEGADO: 'Replegado',
};

/**
 * ¿Dónde está afectada hoy esta persona? Su alta vigente como agente o su presencia en el
 * puesto de comando de un operativo no finalizado. Null si no está en ninguno.
 */
async function afectacionEnOperativo(usuarioId) {
  const alta = await AgenteOperativo.altaActivaDe(usuarioId);
  if (alta) {
    return { id: alta.operativoId, titulo: alta.operativoTitulo, como: `agente (${ETIQUETA_ESTADO_AGENTE[alta.estado] ?? alta.estado})` };
  }
  const { rows } = await query(
    `SELECT o.id, o.titulo FROM presencias_mando p JOIN operativos o ON o.id = p.operativo_id
      WHERE p.usuario_id = $1 AND p.egreso_en IS NULL AND o.eliminado_en IS NULL AND o.estado NOT IN ('FINALIZADO', 'ELIMINADO')
      LIMIT 1`, [usuarioId]);
  return rows[0] ? { ...rows[0], como: 'parte del puesto de comando' } : null;
}

/** Mensajes de duplicado (Testeo 13/10, punto 7): iguales al crear y al editar. */
const DUPLICADO = {
  dni: 'Ya existe un usuario registrado con el DNI ingresado. Verificá los datos e intentá nuevamente.',
  email: 'Ya existe un usuario registrado con el correo ingresado. Verificá los datos e intentá nuevamente.',
};

/**
 * Emite el enlace de confirmación y manda el correo. Se espera el envío antes
 * de responder: en Vercel, lo que queda corriendo después de la respuesta se
 * corta (así se perdían los correos). `enviarConfirmacion` nunca lanza.
 */
async function mandarConfirmacion(usuario) {
  const tokenEmail = await TokenEmail.emitir(usuario.id, 'CONFIRMACION');
  const { enviado } = await enviarConfirmacion({
    para: usuario.email,
    nombre: usuario.nombre,
    url: `${FRONTEND_URL}/confirmar-email/${tokenEmail}`,
  });
  return enviado;
}

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
 * Reactivación (05/10): el DNI de una cuenta eliminada la recupera (ver Usuario.reactivar).
 */
export async function crear(req, res, next) {
  try {
    const b = normalizarDatosPersonales(req.body ?? {});
    if (!b.dni || !b.nombre || !b.apellido || !b.email || !b.password) {
      return res.status(400).json({ error: 'DNI, nombre, apellido, email y contraseña son obligatorios.' });
    }

    // La fecha de nacimiento es obligatoria al crear (Testeo 15/10, punto 24) y el dominio del correo tiene que existir (punto 23).
    const errores = { ...validarDatosPersonales(b), ...exigirFechaNacimiento(b) };
    if (!errores.email && !(await dominioDelCorreoExiste(b.email))) errores.email = MENSAJE_DOMINIO_INEXISTENTE;
    if (Object.keys(errores).length) {
      return res.status(400).json({ error: Object.values(errores)[0], errores });
    }

    const duplicado = await Usuario.existeDniOEmail(b.dni, b.email);
    if (duplicado.dni || duplicado.email) {
      const campo = duplicado.dni ? 'dni' : 'email';
      return res.status(409).json({ error: DUPLICADO[campo], campo, errores: { [campo]: DUPLICADO[campo] } });
    }

    const rol = await resolverRol(b);
    if (!rol) return res.status(400).json({ error: 'Rol inválido.' });
    if (ROLES_SOLO_ADMIN[rol.nombre] && !esAdmin(req)) {
      return res.status(403).json({ error: `Sólo un administrador puede crear ${ROLES_SOLO_ADMIN[rol.nombre]}.`, motivo: 'rol_no_permitido' });
    }

    const datosAlta = { ...b, rolId: rol.id, passwordHash: await bcrypt.hash(b.password, 10) };

    // CU-07 (05/10): si el DNI es de una cuenta eliminada, se reactiva esa misma
    // cuenta (mismo id, historial unido) en vez de crear una segunda.
    const eliminado = await Usuario.buscarEliminadoPorDni(b.dni);
    const creado = eliminado
      ? await Usuario.reactivar(eliminado.id, datosAlta)
      : await Usuario.crear(datosAlta);

    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: eliminado ? Auditoria.ACCION.REACTIVAR : Auditoria.ACCION.CREAR,
      entidad: ENTIDAD,
      registroId: creado.id,
      valoresPrevios: eliminado ?? undefined,
      valoresNuevos: creado,
      ip: req.ip,
    });

    // CU-05 paso 5: la cuenta nace Pendiente y recibe el correo de confirmación
    // (Testeo 13/10, punto 5: antes sólo salía con el botón de reenviar).
    const correoEnviado = creado.estado === 'PENDIENTE' ? await mandarConfirmacion(creado) : false;

    res.status(201).json({ usuario: creado, reactivado: !!eliminado, correoEnviado });
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

    const b = normalizarDatosPersonales(req.body ?? {});
    const propio = id === req.usuario.id;

    const errores = validarDatosPersonales(b);
    if (Object.keys(errores).length) {
      return res.status(400).json({ error: 'Datos inválidos.', errores });
    }

    // El correo choca sólo con cuentas vigentes: el de una eliminada queda libre (CU-07, 18/10).
    // El DNI cuenta también las eliminadas: es de esa persona, que lo recupera reactivando su cuenta.
    const cambiaEmail = !!b.email && b.email.toLowerCase() !== previo.email.toLowerCase();
    if (cambiaEmail) {
      if (!(await dominioDelCorreoExiste(b.email))) {
        return res.status(400).json({ error: MENSAJE_DOMINIO_INEXISTENTE, errores: { email: MENSAJE_DOMINIO_INEXISTENTE } });
      }
      const { rows } = await query(
        `SELECT id FROM usuarios WHERE lower(email) = lower($1) AND id <> $2 AND eliminado_en IS NULL`,
        [b.email, id]
      );
      if (rows.length) return res.status(409).json({ error: DUPLICADO.email, campo: 'email', errores: { email: DUPLICADO.email } });
    }

    if (b.dni && b.dni !== previo.dni) {
      const { rows } = await query(
        `SELECT id FROM usuarios WHERE dni = $1 AND id <> $2`,
        [b.dni, id]
      );
      if (rows.length) return res.status(409).json({ error: DUPLICADO.dni, campo: 'dni', errores: { dni: DUPLICADO.dni } });
    }

    const campos = { ...b };
    delete campos.emailConfirmado;   // sólo lo cambia el sistema (confirmación o cambio de correo)
    delete campos.confirmarCambioRol;

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
      // Una cuenta Pendiente pasa a Activo sólo cuando la persona confirma su
      // correo (Testeo 13/10, puntos 3 y 4): su estado no se elige a mano, pero
      // el resto de sus datos sí se edita.
      if (previo.estado === 'PENDIENTE' || estado === 'PENDIENTE') {
        if (estado !== previo.estado) {
          return res.status(409).json({
            error: previo.estado === 'PENDIENTE'
              ? 'La cuenta está pendiente: pasa a Activo cuando la persona confirma su correo. Mientras tanto su estado no se cambia a mano.'
              : 'Una cuenta queda Pendiente sólo al crearse o al cambiar su correo.',
            motivo: 'estado_pendiente',
          });
        }
        delete campos.estado;
      } else if (!['ACTIVO', 'INACTIVO'].includes(estado)) {
        return res.status(400).json({ error: `Estado inválido: "${campos.estado}".` });
      } else {
        campos.estado = estado;
      }
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
    if (cambiaRol && ROLES_SOLO_ADMIN[rolNuevo.nombre] && !esAdmin(req)) {
      return res.status(403).json({ error: `Sólo un administrador puede asignar ese rol (${ROLES_SOLO_ADMIN[rolNuevo.nombre]}).`, motivo: 'rol_no_permitido' });
    }
    if (cambiaRol && ROLES_SOLO_ADMIN[(previo.rol ?? '').toLowerCase()] && !esAdmin(req)) {
      return res.status(403).json({ error: 'Sólo un administrador puede cambiarle el rol a un jefe de operativo.', motivo: 'rol_no_permitido' });
    }
    // El sistema nunca se queda sin un administrador activo.
    if ((previo.rol ?? '').toLowerCase() === ADMIN && previo.estado === 'ACTIVO' && (cambiaRol || desactiva)
        && !(await hayOtroAdminActivo(id))) {
      return res.status(409).json({
        error: 'Es el único administrador activo del sistema: no se lo puede desactivar ni quitarle el rol.',
        motivo: 'ultimo_admin',
      });
    }
    // Testeo 25/10, punto 44: si está afectado a un operativo (como agente o en un puesto de
    // comando), se avisa dónde y en qué estado, y el cambio sigue sólo si se confirma.
    if (cambiaRol && !b.confirmarCambioRol) {
      const afectacion = await afectacionEnOperativo(id);
      if (afectacion) {
        return res.status(409).json({
          error: `${previo.nombre} ${previo.apellido} está en el operativo «${afectacion.titulo}» como ${afectacion.como}. ¿Cambiar el rol igual?`,
          motivo: 'cambio_rol_en_operativo',
          operativoActual: afectacion,
        });
      }
    }
    if (rolNuevo) campos.rolId = rolNuevo.id;

    // Correo nuevo = correo sin confirmar (Testeo 13/10, punto 8): la cuenta
    // vuelve a Pendiente y la confirmación va a la dirección nueva. Una cuenta
    // Inactiva sigue Inactiva (confirmar el correo no la reactiva).
    if (cambiaEmail) {
      campos.emailConfirmado = false;
      if (previo.estado !== 'INACTIVO' && campos.estado !== 'INACTIVO') campos.estado = 'PENDIENTE';
    }

    let actualizado = await Usuario.actualizar(id, campos);

    // Con otro rol ya no corresponde a su puesto de comando (29/10: cada puesto exige
    // un rol): si estaba de turno en alguno, se cierra ese turno.
    if (cambiaRol) {
      await withTransaction(c => Mando.cerrarPresenciaDeCon(c, id, req.usuario.id, 'Cambió su rol en el sistema'));
    }

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

    let correoEnviado = false;
    if (cambiaEmail) {
      await TokenEmail.anularPendientes(id, 'CONFIRMACION');
      correoEnviado = await mandarConfirmacion(actualizado);
    }

    res.json({ usuario: actualizado, cambioEmail: cambiaEmail, correoEnviado });
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
 * Además (05/10): deja los operativos y el puesto de comando en los que estaba
 * (AgenteOperativo.egresarPorCuentaEliminadaCon).
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

    // Todo junto: si la persona está en el terreno con un grupo, no se elimina
    // nada (409 grupo_en_terreno) en vez de dejar la cuenta borrada a medias.
    const operativosDejados = await withTransaction(async (client) => {
      const dejados = await AgenteOperativo.egresarPorCuentaEliminadaCon(client, id, req.usuario.id);
      await Usuario.eliminarLogico(id, client);
      return dejados;
    });
    await Sesion.revocarTodasDe(id);   // expulsión inmediata

    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.ELIMINAR,
      entidad: ENTIDAD,
      registroId: id,
      valoresPrevios: previo,
      valoresNuevos: { ...previo, estado: 'ELIMINADO', operativosDejados },
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
