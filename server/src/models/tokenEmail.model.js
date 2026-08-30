/**
 * MODELO · Tokens de confirmación de cuenta y recuperación de contraseña
 *   · CU-02 paso 7 (CONFIRMACION, 24 h)
 *   · CU-03 Recuperar Contraseña (RECUPERACION, 60 min — CU-03 paso 6.1)
 *
 * Comparten la tabla `tokens_recuperacion`: misma forma (token hasheado,
 * vencimiento, un solo uso), sólo cambia el `tipo` y cuánto dura cada uno.
 */
import { query } from '../config/db.js';
import { generarToken, hashToken } from './sesion.model.js';

const HORAS_CONFIRMACION = 24;
const MINUTOS_RECUPERACION = 60; // CU-03 paso 6.1: "+60 min"

/** Emite un token nuevo del tipo pedido y devuelve el valor EN CLARO (para el email). */
export async function emitir(usuarioId, tipo) {
  const token = generarToken();
  const intervalo = tipo === 'CONFIRMACION'
    ? `${HORAS_CONFIRMACION} hours`
    : `${MINUTOS_RECUPERACION} minutes`;

  await query(
    `INSERT INTO tokens_recuperacion (usuario_id, token_hash, tipo, expira_en)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP + $4::interval)`,
    [usuarioId, hashToken(token), tipo, intervalo]
  );
  return token;
}

/**
 * Valida un token sin consumirlo. Sirve para chequear la vigencia ANTES de
 * mostrar el formulario (CU-03 paso 6 → 6.1: si venció, el aviso aparece al
 * hacer clic en el enlace, no recién al enviar el formulario).
 */
export async function validar(token, tipo) {
  const { rows } = await query(
    `SELECT id, usuario_id AS "usuarioId", usado
       FROM tokens_recuperacion
      WHERE token_hash = $1 AND tipo = $2 AND expira_en > CURRENT_TIMESTAMP`,
    [hashToken(token), tipo]
  );
  return rows[0] ?? null;
}

/** Marca el token como usado. Un token de un solo uso, aunque no haya vencido. */
export async function marcarUsado(id) {
  await query(`UPDATE tokens_recuperacion SET usado = true WHERE id = $1`, [id]);
}
