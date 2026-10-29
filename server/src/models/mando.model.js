/**
 * MODELO · Puesto de comando (CU-15 Registrar Presencia de Mando; 01/10, migración 016;
 * puestos desde el 29/10, migración 029)
 *
 * Quién está de turno en el puesto de comando de un operativo y en qué puesto:
 *   · JEFE_OPERATIVO → usuarios con rol jefe_operativo.
 *   · COORDINADOR    → usuarios con rol coordinador.
 *   · ENCARGADO      → usuarios con rol coordinador (es el que está en el campo).
 * Ninguno es un agente: no tiene estados tácticos, grupo ni aparece en el tablero.
 *
 * Reglas (relevamiento del 29/10):
 *   · Ingreso y egreso al turno los registran coordinadores y administradores
 *     (las rutas exigen `gestores`). Sin `usuarioId`, un coordinador se registra
 *     a sí mismo; el Jefe de operativo no registra nada (es de solo lectura).
 *   · Ya no hay un «coordinador a cargo»: sólo quién está en cada puesto.
 *     `mando_operativo` quedó como historia (la 029 cerró sus períodos).
 *   · Una persona está en un solo puesto de un solo operativo a la vez (índice
 *     único de la 016). Pasar de Coordinador a Encargado (o al revés) es
 *     «cambiar puesto»: cierra el turno y abre otro con la misma hora.
 *   · Sólo en operativos en curso (Iniciado, En planificación, En proceso).
 *   · No puede figurar a la vez como agente: si se registra como agente se
 *     cierra su turno, y quien figura como agente no entra al puesto.
 *
 * Cada cambio corre en una transacción con la fila del operativo bloqueada.
 */
import { query, withTransaction } from '../config/db.js';
import { ReglaError } from './reglaError.js';

const ADMITE_PRESENCIA = ['INICIADO', 'EN_PLANIFICACION', 'EN_PROCESO'];

/** Puestos del puesto de comando y el rol que exige cada uno. */
export const PUESTOS = {
  JEFE_OPERATIVO: { etiqueta: 'Jefe de operativo', rol: 'jefe_operativo' },
  COORDINADOR:    { etiqueta: 'Coordinador',       rol: 'coordinador' },
  ENCARGADO:      { etiqueta: 'Encargado',         rol: 'coordinador' },
};

const nombre = u => `${u.nombre} ${u.apellido}`;

function puestoValido(puesto) {
  const p = PUESTOS[puesto];
  if (!p) throw new ReglaError(400, 'puesto_invalido', 'Elegí el puesto: Jefe de operativo, Coordinador o Encargado.');
  return p;
}

async function bloquearOperativo(client, operativoId) {
  const { rows } = await client.query(
    `SELECT id, titulo, estado::text AS estado FROM operativos WHERE id = $1 FOR UPDATE`, [operativoId]);
  if (!rows[0]) throw new ReglaError(404, 'operativo_no_encontrado', 'El operativo no existe.');
  return rows[0];
}

/** Una sola hora para todo lo que pasa en un mismo cambio (cambio de puesto, traslado). */
async function ahora(client) {
  return (await client.query('SELECT clock_timestamp() AS t')).rows[0].t;
}

async function usuario(client, usuarioId) {
  const { rows } = await client.query(
    `SELECT u.id, u.nombre, u.apellido, u.estado::text AS estado, lower(r.nombre) AS rol
       FROM usuarios u JOIN cat_roles r ON r.id = u.rol_id WHERE u.id = $1`, [usuarioId]);
  return rows[0] ?? null;
}

async function presenciaActiva(client, usuarioId) {
  const { rows } = await client.query(
    `SELECT p.id, p.operativo_id AS "operativoId", p.puesto::text AS puesto, o.titulo AS "operativoTitulo"
       FROM presencias_mando p JOIN operativos o ON o.id = p.operativo_id
      WHERE p.usuario_id = $1 AND p.egreso_en IS NULL
      FOR UPDATE OF p`, [usuarioId]);
  return rows[0] ?? null;
}

const cerrarPresencia = (client, presenciaId, t, autorId, motivo) => client.query(
  `UPDATE presencias_mando SET egreso_en = $2, egreso_por = $3, motivo_egreso = $4 WHERE id = $1`,
  [presenciaId, t, autorId, motivo]);

const abrirPresencia = async (client, { operativoId, usuarioId, puesto, t, autorId }) => (await client.query(
  `INSERT INTO presencias_mando (operativo_id, usuario_id, puesto, ingreso_en, ingreso_por)
   VALUES ($1, $2, $3::puesto_mando, $4, $5) RETURNING id`, [operativoId, usuarioId, puesto, t, autorId])).rows[0].id;

/* ── Lectura ───────────────────────────────────────────────────────────── */

/** Quiénes están de turno (con su puesto) y el historial completo (para el puesto de comando y el Informe). */
export async function estado(operativoId) {
  const { rows } = await query(
    `SELECT p.id, p.usuario_id AS "usuarioId", u.nombre, u.apellido, p.puesto::text AS puesto,
            p.ingreso_en AS "desde", p.egreso_en AS "hasta", p.motivo_egreso AS "motivo",
            p.ingreso_por AS "ingresoPor", ui.nombre || ' ' || ui.apellido AS "ingresoPorNombre",
            ue.nombre || ' ' || ue.apellido AS "egresoPorNombre"
       FROM presencias_mando p
       JOIN usuarios u  ON u.id  = p.usuario_id
       JOIN usuarios ui ON ui.id = p.ingreso_por
       LEFT JOIN usuarios ue ON ue.id = p.egreso_por
      WHERE p.operativo_id = $1
      ORDER BY p.ingreso_en DESC`, [operativoId]);
  return {
    presentes: rows.filter(p => !p.hasta).reverse(),
    historialPresencias: rows,
  };
}

/* ── Cambios (cada uno con su versión "Con(client)" para componer transacciones y probar) ── */

/**
 * Ingreso al turno en un puesto. El puesto exige un rol (Jefe de operativo →
 * jefe_operativo; Coordinador y Encargado → coordinador). Si estaba de turno en
 * otro operativo, sólo se traslada con `trasladar` (mismo patrón que la Regla de
 * Ubicuidad del agente).
 */
export async function ingresarCon(client, { operativoId, usuarioId, puesto, autorId, trasladar = false }) {
  const defPuesto = puestoValido(puesto);
  const op = await bloquearOperativo(client, operativoId);
  if (!ADMITE_PRESENCIA.includes(op.estado)) {
    throw new ReglaError(409, 'operativo_cerrado',
      `El operativo está ${op.estado.toLowerCase().replace('_', ' ')}: no se registran turnos en el puesto de comando.`);
  }
  const u = await usuario(client, usuarioId);
  if (!u) throw new ReglaError(404, 'usuario_no_encontrado', 'Usuario no encontrado.');
  if (u.rol !== defPuesto.rol) {
    throw new ReglaError(409, 'rol_no_corresponde',
      defPuesto.rol === 'jefe_operativo'
        ? `${nombre(u)} no tiene el rol Jefe de operativo: no puede ocupar ese puesto.`
        : `El puesto ${defPuesto.etiqueta} es para usuarios con rol Coordinador; ${nombre(u)} no lo tiene.`);
  }
  if (u.estado !== 'ACTIVO') {
    throw new ReglaError(409, 'usuario_no_activo', `${nombre(u)} no tiene la cuenta activa.`);
  }
  const { rows: comoAgente } = await client.query(
    `SELECT o.titulo FROM agentes_operativo ao JOIN operativos o ON o.id = ao.operativo_id
      WHERE ao.usuario_id = $1 AND ao.fecha_egreso IS NULL`, [usuarioId]);
  if (comoAgente[0]) {
    throw new ReglaError(409, 'es_agente',
      `${nombre(u)} figura como agente en el operativo "${comoAgente[0].titulo}". `
      + 'Para registrarlo en el puesto de comando, primero hay que sacarlo de la lista de agentes.');
  }

  const previa = await presenciaActiva(client, usuarioId);
  if (previa?.operativoId === operativoId) {
    throw new ReglaError(409, 'ya_presente',
      `${nombre(u)} ya está de turno como ${PUESTOS[previa.puesto]?.etiqueta ?? previa.puesto}. Para pasarlo a otro puesto usá «Cambiar puesto».`);
  }
  if (previa) {
    if (!trasladar) {
      throw new ReglaError(409, 'presente_en_otro_operativo',
        `${nombre(u)} está de turno en el operativo "${previa.operativoTitulo}". ¿Lo retirás de allá y lo registrás acá?`,
        { operativoActual: { id: previa.operativoId, titulo: previa.operativoTitulo } });
    }
    await retirarCon(client, {
      operativoId: previa.operativoId, usuarioId, autorId, motivo: `Se presentó en el operativo "${op.titulo}"`,
    });
  }

  const t = await ahora(client);
  const presenciaId = await abrirPresencia(client, { operativoId, usuarioId, puesto, t, autorId });
  return { presenciaId };
}

/** Egreso del turno. */
export async function retirarCon(client, { operativoId, usuarioId, autorId, motivo }) {
  await bloquearOperativo(client, operativoId);
  const { rows } = await client.query(
    `SELECT p.id FROM presencias_mando p
      WHERE p.operativo_id = $1 AND p.usuario_id = $2 AND p.egreso_en IS NULL FOR UPDATE OF p`,
    [operativoId, usuarioId]);
  if (!rows[0]) throw new ReglaError(409, 'no_presente', 'No está de turno en el puesto de comando de este operativo.');
  await cerrarPresencia(client, rows[0].id, await ahora(client), autorId, motivo);
}

/**
 * Cambio de puesto (Coordinador ↔ Encargado): cierra el turno en el puesto
 * actual y abre el nuevo con la misma hora, así no queda un hueco ni un solape.
 */
export async function cambiarPuestoCon(client, { operativoId, usuarioId, puesto, autorId }) {
  const defPuesto = puestoValido(puesto);
  await bloquearOperativo(client, operativoId);
  const actual = await presenciaActiva(client, usuarioId);
  if (!actual || actual.operativoId !== operativoId) {
    throw new ReglaError(409, 'no_presente', 'No está de turno en el puesto de comando de este operativo.');
  }
  if (actual.puesto === puesto) {
    throw new ReglaError(409, 'mismo_puesto', `Ya está de turno como ${defPuesto.etiqueta}.`);
  }
  const u = await usuario(client, usuarioId);
  if (u.rol !== defPuesto.rol) {
    throw new ReglaError(409, 'rol_no_corresponde',
      `${nombre(u)} no puede pasar al puesto ${defPuesto.etiqueta}: ese puesto exige otro rol.`);
  }
  const t = await ahora(client);
  await cerrarPresencia(client, actual.id, t, autorId, `Pasó al puesto ${defPuesto.etiqueta}`);
  const presenciaId = await abrirPresencia(client, { operativoId, usuarioId, puesto, t, autorId });
  return { presenciaId };
}

export const ingresar = args => withTransaction(c => ingresarCon(c, args));
export const retirar = args => withTransaction(c => retirarCon(c, args));
export const cambiarPuesto = args => withTransaction(c => cambiarPuestoCon(c, args));

/* ── Cierres automáticos (dentro de la transacción de quien los provoca) ── */

/** CU-10: al finalizar el operativo se cierran todos los turnos, con esa hora. */
export async function cerrarTodoCon(client, operativoId, autorId, motivo) {
  const t = await ahora(client);
  await client.query(
    `UPDATE presencias_mando SET egreso_en = $2, egreso_por = COALESCE($3, usuario_id), motivo_egreso = $4
      WHERE operativo_id = $1 AND egreso_en IS NULL`, [operativoId, t, autorId, motivo]);
}

/** Un coordinador que se registra como agente (QR o alta manual) deja el puesto de comando. */
export async function cerrarPorAltaComoAgenteCon(client, usuarioId, autorId, operativoTitulo) {
  await cerrarPresenciaDeCon(client, usuarioId, autorId, `Pasó a rastrillar como agente en "${operativoTitulo}"`);
}

/**
 * Cierra el turno vigente de una persona, esté donde esté: lo usan pasar a
 * rastrillar como agente, que se elimine su cuenta (CU-07) o que le cambien el rol.
 */
export async function cerrarPresenciaDeCon(client, usuarioId, autorId, motivo) {
  const previa = await presenciaActiva(client, usuarioId);
  if (!previa) return;
  await cerrarPresencia(client, previa.id, await ahora(client), autorId, motivo);
}
