/**
 * MODELO · Sesiones activas
 *
 * Decisión E: las sesiones viven en PostgreSQL, no en un JWT autocontenido.
 * El motivo es operativo — hay que poder EXPULSAR a alguien al instante (por
 * ejemplo si se le da de baja durante un operativo). Con un JWT firmado habría
 * que esperar a que expire; con una fila en la base, se marca `revocado` y en
 * la request siguiente ya no entra.
 *
 * En la base se guarda el HASH del token, nunca el token en claro: si alguien
 * lee la tabla, no puede hacerse pasar por un usuario conectado.
 */
import crypto from 'crypto';
import { query } from '../config/db.js';
import { CAMPOS, JOINS } from './usuario.model.js';

/** Token opaco de 256 bits que viaja al cliente. */
export function generarToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Sólo el hash se persiste. SHA-256 alcanza: el token ya es aleatorio y largo. */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function crear({ usuarioId, token, dispositivo = null, ip = null, horas = 12 }) {
  const { rows } = await query(
    `INSERT INTO sesiones_activas (usuario_id, token_hash, dispositivo, ip_conexion, expira_en)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + ($5 || ' hours')::interval)
     RETURNING id, expira_en AS "expiraEn"`,
    [usuarioId, hashToken(token), dispositivo, ip, String(horas)]
  );
  return rows[0];
}

/**
 * Valida un token: debe existir, no estar revocado y no haber expirado.
 * Devuelve el usuario COMPLETO (mismas columnas que el modelo de Usuario) más
 * `sesionId`, o null si el token no vale.
 *
 * Trae el usuario entero a propósito: el middleware lo necesita en cada request
 * y antes lo pedía en una segunda consulta. Como esto corre en TODAS las
 * requests autenticadas, unificarlo elimina una ida y vuelta a la base por cada
 * llamada a la API.
 */
export async function validar(token) {
  const { rows } = await query(
    `SELECT ${CAMPOS}, s.id AS "sesionId"
     ${JOINS}
       JOIN sesiones_activas s ON s.usuario_id = u.id
      WHERE s.token_hash = $1
        AND s.revocado = false
        AND s.expira_en > CURRENT_TIMESTAMP`,
    [hashToken(token)]
  );
  return rows[0] ?? null;
}

/** Cierre de sesión: revoca sólo ESTE token. */
export async function revocar(token) {
  await query(`UPDATE sesiones_activas SET revocado = true WHERE token_hash = $1`, [hashToken(token)]);
}

/**
 * Revoca TODAS las sesiones de un usuario. Es el mecanismo de expulsión
 * inmediata que justifica esta tabla: al dar de baja a alguien (CU-07),
 * el controlador llama acá y el usuario queda afuera en la request siguiente.
 */
export async function revocarTodasDe(usuarioId) {
  await query(`UPDATE sesiones_activas SET revocado = true WHERE usuario_id = $1 AND revocado = false`, [usuarioId]);
}
