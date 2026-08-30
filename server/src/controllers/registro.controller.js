/**
 * CONTROLADOR · Registro por QR y alta en operativo
 *   · CU-02 Registro de Usuario
 *   · CU-15 pasos 6-8 (validación de restricciones y confirmación de ingreso)
 *
 * Este es el flujo de campo: el personal llega al Puesto de Comando, escanea el
 * QR y queda operativo. Son DOS pasos separados a propósito, siguiendo el CU-02:
 * primero se crea el perfil global (paso 5) y recién después el agente decide
 * darse de alta en el operativo (paso 6), pudiendo cancelar sin perder la cuenta
 * recién creada (alternativa 6.1).
 */
import bcrypt from 'bcryptjs';
import * as Usuario from '../models/usuario.model.js';
import * as Sesion from '../models/sesion.model.js';
import * as TokenOperativo from '../models/tokenOperativo.model.js';
import * as AgenteOperativo from '../models/agenteOperativo.model.js';
import * as Operativo from '../models/operativo.model.js';
import * as TokenEmail from '../models/tokenEmail.model.js';
import * as Auditoria from '../models/auditoria.model.js';
import { enviarConfirmacion } from '../services/email.service.js';
import { query } from '../config/db.js';

const HORAS_SESION = Number(process.env.SESION_HORAS ?? 12);
/**
 * Base para armar los enlaces que van por correo. No se infiere de la request
 * (el header Origin se puede falsear) — es una variable de entorno explícita,
 * la misma para todos los envíos.
 */
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

/** Abre sesión para el usuario recién registrado, para que pueda dar el alta. */
async function abrirSesion(usuarioId, req) {
  const token = Sesion.generarToken();
  await Sesion.crear({
    usuarioId,
    token,
    dispositivo: req.get('user-agent')?.slice(0, 255) ?? null,
    ip: req.ip?.slice(0, 45) ?? null,
    horas: HORAS_SESION,
  });
  return token;
}

/**
 * POST /api/auth/registro — CU-02
 *
 * PÚBLICO, pero exige un token de QR válido: sin haber escaneado no hay registro.
 * Es la precondición del CU-02 y lo que impide que cualquiera se cree una cuenta
 * desde afuera del operativo.
 *
 * Paso 4: unicidad de DNI y email. Paso 5: se persiste con bcrypt y queda log.
 */
export async function registrar(req, res, next) {
  try {
    const b = req.body ?? {};

    // Precondición del CU-02: haber escaneado el QR del operativo (CU-15).
    const acceso = await TokenOperativo.validar(b.qrToken ?? '');
    if (!acceso) {
      return res.status(410).json({
        error: 'Código de acceso vencido. Solicite el QR actualizado.',
        motivo: 'qr_invalido',
      });
    }

    if (!b.dni || !b.nombre || !b.apellido || !b.email || !b.password) {
      return res.status(400).json({
        error: 'DNI, nombre, apellido, email y contraseña son obligatorios.',
      });
    }
    if (String(b.password).length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    // CU-02 paso 4.1 — si ya está registrado, se bloquea la creación.
    const duplicado = await Usuario.existeDniOEmail(b.dni, b.email);
    if (duplicado.dni || duplicado.email) {
      return res.status(409).json({
        error: duplicado.dni
          ? 'Ya existe un usuario con ese DNI. Si es tuyo, iniciá sesión.'
          : 'Ya existe un usuario con ese email. Si es tuyo, iniciá sesión.',
        campo: duplicado.dni ? 'dni' : 'email',
        motivo: 'ya_registrado',
      });
    }

    // Todo el que se registra por QR es personal de campo.
    const { rows: rolAgente } = await query(
      `SELECT id FROM cat_roles WHERE lower(nombre) = 'agente'`
    );
    if (!rolAgente[0]) return res.status(500).json({ error: 'Falta el rol "agente" en el catálogo.' });

    const creado = await Usuario.crear({
      dni: b.dni,
      nombre: b.nombre,
      apellido: b.apellido,
      email: b.email,
      passwordHash: await bcrypt.hash(b.password, 10),
      rolId: rolAgente[0].id,
      telefono: b.telefono ?? null,
      fechaNacimiento: b.fechaNacimiento || null,
      genero: b.genero ?? null,
      institucionId: b.institucionId || null,
      dotacionId: b.dotacionId || null,
      especialidadId: b.especialidadId || null,
      grupoSanguineo: b.grupoSanguineo || null,
      alergiaIds: b.alergiaIds ?? [],
      // `esCaminante` y `esConductor` NO se aceptan del cliente: son tácticos y
      // los decide el sistema/Coordinador (nota del docx + Decisión C).
    });

    await Auditoria.registrar({
      usuarioId: creado.id,          // se registra a sí mismo
      accion: Auditoria.ACCION.CREAR,
      entidad: 'usuarios',
      registroId: creado.id,
      valoresNuevos: creado,
      ip: req.ip,
    });

    // Se abre sesión para que pueda encadenar el alta (CU-02 paso 6) sin volver
    // a tipear la contraseña que acaba de elegir.
    const token = await abrirSesion(creado.id, req);

    // CU-02 paso 7: correo de confirmación. Deliberadamente SIN await — el
    // registro y el alta son lo urgente en un rescate real; no tiene sentido
    // que el agente espere a que salga un correo para poder seguir.
    TokenEmail.emitir(creado.id, 'CONFIRMACION').then((tokenEmail) => {
      enviarConfirmacion({
        para: creado.email,
        nombre: creado.nombre,
        url: `${FRONTEND_URL}/confirmar-email/${tokenEmail}`,
        operativoNombre: acceso.titulo,
      });
    }).catch((err) => console.error('[registro] no se pudo emitir el token de confirmación:', err.message));

    res.status(201).json({
      token,
      usuario: creado,
      operativo: { id: acceso.operativoId, titulo: acceso.titulo, localidad: acceso.localidad },
    });
  } catch (err) { next(err); }
}

/**
 * POST /api/operativos/:id/alta — CU-15 pasos 6-8 · CU-02 paso 7
 *
 * Requiere sesión: el agente ya se autenticó (CU-01) o acaba de registrarse.
 * Valida las restricciones y lo deja en estado DISPONIBLE.
 *
 * El caso interesante es la Regla de Ubicuidad (paso 6.2): si ya está en otro
 * operativo, NO se decide por él — se le devuelve un 409 con los datos del
 * operativo actual para que el frontend muestre el modal, y sólo si confirma se
 * repite el pedido con `abandonarAnterior: true`.
 */
export async function altaEnOperativo(req, res, next) {
  try {
    const { id: operativoId } = req.params;
    const b = req.body ?? {};

    const acceso = await TokenOperativo.validar(b.qrToken ?? '');
    if (!acceso || acceso.operativoId !== operativoId) {
      return res.status(410).json({
        error: 'Código de acceso vencido. Solicite el QR actualizado.',
        motivo: 'qr_invalido',
      });
    }

    // CU-15 paso 6.1 — cuenta suspendida: se bloquea el acceso.
    // (El middleware ya corta las INACTIVO, pero queda explícito por el CU.)
    if (req.usuario.estado !== 'ACTIVO') {
      return res.status(403).json({
        error: 'Tu cuenta no está activa. Contactá al administrador.',
        motivo: 'cuenta_inactiva',
      });
    }

    const altaPrevia = await AgenteOperativo.altaActivaDe(req.usuario.id);

    if (altaPrevia && altaPrevia.operativoId === operativoId) {
      return res.status(409).json({
        error: 'Ya estás dado de alta en este operativo.',
        motivo: 'ya_en_este_operativo',
        agente: altaPrevia,
      });
    }

    // CU-15 paso 6.2 — Regla de Ubicuidad. La decisión es del agente, no del
    // sistema: se le informa y se espera confirmación explícita.
    if (altaPrevia && !b.abandonarAnterior) {
      return res.status(409).json({
        error: `Ya estás asignado al operativo "${altaPrevia.operativoTitulo}". ¿Deseas darte de baja e ingresar a este?`,
        motivo: 'regla_ubicuidad',
        operativoActual: {
          id: altaPrevia.operativoId,
          titulo: altaPrevia.operativoTitulo,
          localidad: altaPrevia.operativoLocalidad,
        },
      });
    }

    const agente = await AgenteOperativo.darDeAlta({
      usuarioId: req.usuario.id,
      operativoId,
      especialidadId: req.usuario.especialidadId ?? null,
      abandonarAnterior: Boolean(altaPrevia && b.abandonarAnterior),
    });

    await Auditoria.registrar({
      usuarioId: req.usuario.id,
      accion: Auditoria.ACCION.CREAR,
      entidad: 'agentes_operativo',
      registroId: agente.id,
      valoresPrevios: altaPrevia ?? null,
      valoresNuevos: agente,
      ip: req.ip,
    });

    res.status(201).json({ agente, abandonoAnterior: Boolean(altaPrevia && b.abandonarAnterior) });
  } catch (err) { next(err); }
}

/**
 * GET /api/mi-operativo — el propio Portal del Agente (AgenteDashboard.tsx).
 * `null` si no tiene alta activa en ningún operativo ahora mismo.
 */
export async function miOperativoActual(req, res, next) {
  try {
    const alta = await AgenteOperativo.altaActivaDe(req.usuario.id);
    if (!alta) return res.json({ operativo: null });
    res.json({ operativo: await Operativo.buscarPorId(alta.operativoId) });
  } catch (err) { next(err); }
}
