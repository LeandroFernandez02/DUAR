/**
 * MODELO · Tokens de QR de operativo (CU-15)
 *
 * El Coordinador exhibe un QR y el personal lo escanea para darse de alta. El
 * token que viaja en ese QR vive acá, no en el navegador: el agente escanea con
 * su propio celular, así que Coordinador y Agente necesitan una fuente común.
 *
 * Reglas del CU-15:
 *  · Vigencia de 24 h (paso 2.1 y nota "Cambiar duración de QR a 24hs").
 *  · Un solo token vigente por operativo: refrescar revoca el anterior. Es el
 *    "Control de Puerta" de las Observaciones — si el QR se filtró por WhatsApp,
 *    el Coordinador lo invalida y obliga a escanear el nuevo presencialmente.
 */
import crypto from 'crypto';
import { query, withTransaction } from '../config/db.js';

/** Horas de vigencia. Definido por el CU; no es configurable por el usuario. */
const HORAS_VIGENCIA = 24;

/** Token opaco de 128 bits. Va en la URL del QR, así que se usa hex (URL-safe). */
function generarToken() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Token vigente del operativo, o null si no hay o venció.
 * No crea nada: sólo consulta.
 */
export async function vigenteDe(operativoId) {
  const { rows } = await query(
    `SELECT id, token, creado_en AS "creadoEn", expira_en AS "expiraEn"
       FROM tokens_operativo
      WHERE operativo_id = $1
        AND revocado = false
        AND expira_en > CURRENT_TIMESTAMP`,
    [operativoId]
  );
  return rows[0] ?? null;
}

/**
 * Revoca el token vigente (si hay) y emite uno nuevo, en una sola transacción.
 *
 * El DELETE-lógico y el INSERT tienen que ser atómicos por el índice parcial
 * `tokens_operativo_uno_vigente_idx`: si el INSERT ocurriera antes de revocar el
 * anterior, la base rechazaría el segundo token vigente.
 */
export async function emitirNuevo(operativoId, generadoPor = null) {
  return withTransaction(async (client) => {
    await client.query(
      `UPDATE tokens_operativo SET revocado = true
        WHERE operativo_id = $1 AND revocado = false`,
      [operativoId]
    );
    const { rows } = await client.query(
      `INSERT INTO tokens_operativo (operativo_id, token, generado_por, expira_en)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP + ($4 || ' hours')::interval)
       RETURNING id, token, creado_en AS "creadoEn", expira_en AS "expiraEn"`,
      [operativoId, generarToken(), generadoPor, String(HORAS_VIGENCIA)]
    );
    return rows[0];
  });
}

/**
 * Devuelve el token vigente; si no hay o ya venció, emite uno.
 * Es lo que consume el Coordinador al abrir el modal del QR (CU-15 paso 2):
 * mientras siga vigente ve SIEMPRE el mismo código, y sólo se renueva solo
 * cuando pasaron las 24 h (paso 2.1).
 */
export async function obtenerOEmitir(operativoId, generadoPor = null) {
  return (await vigenteDe(operativoId)) ?? emitirNuevo(operativoId, generadoPor);
}

/**
 * Valida un token escaneado y devuelve el operativo al que da acceso.
 * Null si no existe, fue revocado, venció, o el operativo ya no admite ingresos.
 *
 * La condición sobre el estado del operativo es la precondición del CU-15: sólo
 * se puede entrar a uno ACTIVO o EN_PLANIFICACION. Un QR viejo de un operativo
 * ya finalizado no debe dejar entrar a nadie.
 */
export async function validar(token) {
  const { rows } = await query(
    `SELECT t.id            AS "tokenId",
            t.expira_en     AS "expiraEn",
            o.id            AS "operativoId",
            o.titulo,
            o.localidad,
            o.estado::text  AS "estadoOperativo",
            o.fecha_hora_inicio AS "fechaHoraInicio"
       FROM tokens_operativo t
       JOIN operativos o ON o.id = t.operativo_id
      WHERE t.token = $1
        AND t.revocado = false
        AND t.expira_en > CURRENT_TIMESTAMP
        AND o.eliminado_en IS NULL
        AND o.estado IN ('ACTIVO', 'EN_PLANIFICACION')`,
    [token]
  );
  return rows[0] ?? null;
}

/** Revoca el token vigente sin emitir reemplazo (cierre de puerta). */
export async function revocarDe(operativoId) {
  await query(
    `UPDATE tokens_operativo SET revocado = true
      WHERE operativo_id = $1 AND revocado = false`,
    [operativoId]
  );
}
