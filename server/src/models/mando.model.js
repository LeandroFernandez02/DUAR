/**
 * MODELO · Presencia de mando (01/10, migración 016)
 *
 * Qué coordinadores están en el puesto de comando de un operativo y quién está
 * a cargo. El coordinador NO es un agente: no tiene estados tácticos, grupo ni
 * aparece en el tablero; tiene sus propios períodos de presencia.
 *
 * Reglas (decididas con el usuario el 01/10):
 *   · Sólo se registra la presencia de COORDINADORES activos, en operativos en
 *     planificación o activos. Un administrador puede hacer todo (registrar a
 *     otros, pasar el mando), pero no figura él mismo como presente.
 *   · Un coordinador está presente en un solo operativo a la vez (índice único).
 *   · El primero que llega queda a cargo; uno solo a cargo por operativo.
 *   · Cualquier gestor registra el ingreso o el retiro de otro; queda quién.
 *   · El mando lo pasa quien está a cargo (o un administrador). Si nadie está a
 *     cargo, cualquier gestor designa a un presente (o se lo toma él).
 *   · Si el que está a cargo se retira y quedan otros, tiene que elegir sucesor
 *     (como la sucesión del Líder en el CU-26). Si estaba solo, el operativo
 *     queda sin coordinador a cargo.
 *   · No puede figurar a la vez como agente: si se registra como agente se
 *     cierra su presencia, y quien figura como agente no entra al puesto.
 *   · La presencia no limita permisos (mando compartido): es trazabilidad.
 *
 * Cada cambio corre en una transacción con la fila del operativo bloqueada:
 * dos coordinadores operando a la vez no pueden dejar dos a cargo ni un a
 * cargo ausente.
 */
import { query, withTransaction } from '../config/db.js';
import { ReglaError } from './grupo.model.js';

const ADMITE_PRESENCIA = ['ACTIVO', 'EN_PLANIFICACION'];

const nombre = u => `${u.nombre} ${u.apellido}`;

async function bloquearOperativo(client, operativoId) {
  const { rows } = await client.query(
    `SELECT id, titulo, estado::text AS estado FROM operativos WHERE id = $1 FOR UPDATE`, [operativoId]);
  if (!rows[0]) throw new ReglaError(404, 'operativo_no_encontrado', 'El operativo no existe.');
  return rows[0];
}

/** Una sola hora para todo lo que pasa en un mismo cambio (retiro + sucesión quedan pegados). */
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
    `SELECT p.id, p.operativo_id AS "operativoId", o.titulo AS "operativoTitulo"
       FROM presencias_mando p JOIN operativos o ON o.id = p.operativo_id
      WHERE p.usuario_id = $1 AND p.egreso_en IS NULL
      FOR UPDATE OF p`, [usuarioId]);
  return rows[0] ?? null;
}

async function mandoActivo(client, operativoId) {
  const { rows } = await client.query(
    `SELECT id, usuario_id AS "usuarioId" FROM mando_operativo
      WHERE operativo_id = $1 AND hasta IS NULL FOR UPDATE`, [operativoId]);
  return rows[0] ?? null;
}

async function presentes(client, operativoId) {
  const { rows } = await client.query(
    `SELECT p.id, p.usuario_id AS "usuarioId", u.nombre, u.apellido
       FROM presencias_mando p JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.operativo_id = $1 AND p.egreso_en IS NULL
      ORDER BY p.ingreso_en`, [operativoId]);
  return rows;
}

const cerrarPresencia = (client, presenciaId, t, autorId, motivo) => client.query(
  `UPDATE presencias_mando SET egreso_en = $2, egreso_por = $3, motivo_egreso = $4 WHERE id = $1`,
  [presenciaId, t, autorId, motivo]);

const cerrarMando = (client, mandoId, t, autorId, motivo) => client.query(
  `UPDATE mando_operativo SET hasta = $2, cerrado_por = $3, motivo_fin = $4 WHERE id = $1`,
  [mandoId, t, autorId, motivo]);

const abrirMando = (client, operativoId, usuarioId, t, autorId) => client.query(
  `INSERT INTO mando_operativo (operativo_id, usuario_id, desde, asignado_por) VALUES ($1, $2, $3, $4)`,
  [operativoId, usuarioId, t, autorId]);

/* ── Lectura ───────────────────────────────────────────────────────────── */

/** Quién está a cargo, quiénes están presentes y el historial completo (para el puesto de comando y el Informe). */
export async function estado(operativoId) {
  const [presencias, mandos] = await Promise.all([
    query(
      `SELECT p.id, p.usuario_id AS "usuarioId", u.nombre, u.apellido,
              p.ingreso_en AS "desde", p.egreso_en AS "hasta", p.motivo_egreso AS "motivo",
              p.ingreso_por AS "ingresoPor", ui.nombre || ' ' || ui.apellido AS "ingresoPorNombre",
              ue.nombre || ' ' || ue.apellido AS "egresoPorNombre"
         FROM presencias_mando p
         JOIN usuarios u  ON u.id  = p.usuario_id
         JOIN usuarios ui ON ui.id = p.ingreso_por
         LEFT JOIN usuarios ue ON ue.id = p.egreso_por
        WHERE p.operativo_id = $1
        ORDER BY p.ingreso_en DESC`, [operativoId]),
    query(
      `SELECT m.id, m.usuario_id AS "usuarioId", u.nombre, u.apellido,
              m.desde, m.hasta, m.motivo_fin AS "motivo",
              ua.nombre || ' ' || ua.apellido AS "asignadoPorNombre"
         FROM mando_operativo m
         JOIN usuarios u  ON u.id  = m.usuario_id
         JOIN usuarios ua ON ua.id = m.asignado_por
        WHERE m.operativo_id = $1
        ORDER BY m.desde DESC`, [operativoId]),
  ]);
  const aCargo = mandos.rows.find(m => !m.hasta) ?? null;
  const vigentes = presencias.rows.filter(p => !p.hasta).reverse();
  return {
    aCargo,
    presentes: vigentes.map(p => ({ ...p, aCargo: p.usuarioId === aCargo?.usuarioId })),
    historialPresencias: presencias.rows,
    historialMando: mandos.rows,
  };
}

/* ── Cambios (cada uno con su versión "Con(client)" para componer transacciones y probar) ── */

/**
 * Ingreso al puesto de comando. Si estaba presente en otro operativo, sólo se
 * traslada con `trasladar` (mismo patrón que la Regla de Ubicuidad del agente).
 * Devuelve si quedó a cargo (el primero que llega).
 */
export async function ingresarCon(client, { operativoId, usuarioId, autorId, trasladar = false }) {
  const op = await bloquearOperativo(client, operativoId);
  if (!ADMITE_PRESENCIA.includes(op.estado)) {
    throw new ReglaError(409, 'operativo_cerrado',
      `El operativo está ${op.estado.toLowerCase().replace('_', ' ')}: no se registran presencias.`);
  }
  const u = await usuario(client, usuarioId);
  if (!u) throw new ReglaError(404, 'usuario_no_encontrado', 'Usuario no encontrado.');
  if (u.rol !== 'coordinador') {
    throw new ReglaError(409, 'no_es_coordinador', 'En el puesto de comando se registra sólo a coordinadores.');
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
    throw new ReglaError(409, 'ya_presente', `${nombre(u)} ya está presente en el puesto de comando.`);
  }
  if (previa) {
    if (!trasladar) {
      throw new ReglaError(409, 'presente_en_otro_operativo',
        `${nombre(u)} está presente en el operativo "${previa.operativoTitulo}". ¿Lo retirás de allá y lo registrás acá?`,
        { operativoActual: { id: previa.operativoId, titulo: previa.operativoTitulo } });
    }
    await retirarCon(client, {
      operativoId: previa.operativoId, usuarioId, autorId,
      motivo: `Se presentó en el operativo "${op.titulo}"`, porTraslado: true,
    });
  }

  const t = await ahora(client);
  const { rows } = await client.query(
    `INSERT INTO presencias_mando (operativo_id, usuario_id, ingreso_en, ingreso_por)
     VALUES ($1, $2, $3, $4) RETURNING id`, [operativoId, usuarioId, t, autorId]);
  let quedoACargo = false;
  if (!(await mandoActivo(client, operativoId))) {
    await abrirMando(client, operativoId, usuarioId, t, autorId);
    quedoACargo = true;
  }
  return { presenciaId: rows[0].id, quedoACargo };
}

/**
 * Retiro del puesto de comando. Si se retira el que está a cargo y quedan
 * otros presentes, tiene que dejar sucesor; si estaba solo, el operativo queda
 * sin coordinador a cargo.
 */
export async function retirarCon(client, { operativoId, usuarioId, autorId, motivo, sucesorId = null, porTraslado = false }) {
  await bloquearOperativo(client, operativoId);
  const { rows } = await client.query(
    `SELECT p.id, u.nombre, u.apellido FROM presencias_mando p JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.operativo_id = $1 AND p.usuario_id = $2 AND p.egreso_en IS NULL FOR UPDATE OF p`,
    [operativoId, usuarioId]);
  const p = rows[0];
  if (!p) throw new ReglaError(409, 'no_presente', 'Ese coordinador no está presente en el puesto de comando de este operativo.');

  const mando = await mandoActivo(client, operativoId);
  const estaACargo = mando?.usuarioId === usuarioId;
  const otros = (await presentes(client, operativoId)).filter(x => x.usuarioId !== usuarioId);
  let sucesor = null;
  if (estaACargo && otros.length) {
    if (!sucesorId) {
      throw new ReglaError(409, porTraslado ? 'a_cargo_en_otro_operativo' : 'sucesion_requerida',
        porTraslado
          ? `${nombre(p)} está a cargo de otro operativo donde hay más coordinadores: primero tiene que pasar el mando allá.`
          : `${nombre(p)} está a cargo del operativo: elegí a quién le deja el mando.`,
        { presentes: otros.map(o => ({ usuarioId: o.usuarioId, nombre: o.nombre, apellido: o.apellido })) });
    }
    sucesor = otros.find(o => o.usuarioId === sucesorId);
    if (!sucesor) throw new ReglaError(409, 'sucesor_no_presente', 'El nuevo a cargo tiene que estar presente en el puesto de comando.');
  }

  const t = await ahora(client);
  await cerrarPresencia(client, p.id, t, autorId, motivo);
  if (estaACargo) {
    await cerrarMando(client, mando.id, t, autorId,
      sucesor ? `Se retiró y dejó a cargo a ${nombre(sucesor)}` : 'Se retiró sin otro coordinador en el puesto');
    if (sucesor) await abrirMando(client, operativoId, sucesor.usuarioId, t, autorId);
  }
  return { quedaSinMando: estaACargo && !sucesor };
}

/**
 * Traspaso del mando (o designación, si nadie está a cargo). Lo pasa quien está
 * a cargo o un administrador; si nadie está a cargo, cualquier gestor designa
 * a un presente (o se lo toma él).
 */
export async function asignarMandoCon(client, { operativoId, usuarioId, autorId, autorEsAdmin = false }) {
  await bloquearOperativo(client, operativoId);
  const { rows } = await client.query(
    `SELECT u.nombre, u.apellido FROM presencias_mando p JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.operativo_id = $1 AND p.usuario_id = $2 AND p.egreso_en IS NULL`, [operativoId, usuarioId]);
  const nuevo = rows[0];
  if (!nuevo) throw new ReglaError(409, 'no_presente', 'Sólo puede quedar a cargo un coordinador presente en el puesto de comando.');

  const mando = await mandoActivo(client, operativoId);
  if (mando?.usuarioId === usuarioId) throw new ReglaError(409, 'ya_a_cargo', `${nombre(nuevo)} ya está a cargo.`);
  if (mando && mando.usuarioId !== autorId && !autorEsAdmin) {
    throw new ReglaError(403, 'solo_a_cargo', 'Sólo el coordinador a cargo (o un administrador) puede pasar el mando.');
  }
  const t = await ahora(client);
  if (mando) await cerrarMando(client, mando.id, t, autorId, `Pasó el mando a ${nombre(nuevo)}`);
  await abrirMando(client, operativoId, usuarioId, t, autorId);
}

export const ingresar = args => withTransaction(c => ingresarCon(c, args));
export const retirar = args => withTransaction(c => retirarCon(c, args));
export const asignarMando = args => withTransaction(c => asignarMandoCon(c, args));

/* ── Cierres automáticos (dentro de la transacción de quien los provoca) ── */

/** CU-10: al finalizar el operativo se cierran todas las presencias y el mando, con esa hora. */
export async function cerrarTodoCon(client, operativoId, autorId, motivo) {
  const t = await ahora(client);
  await client.query(
    `UPDATE presencias_mando SET egreso_en = $2, egreso_por = COALESCE($3, usuario_id), motivo_egreso = $4
      WHERE operativo_id = $1 AND egreso_en IS NULL`, [operativoId, t, autorId, motivo]);
  await client.query(
    `UPDATE mando_operativo SET hasta = $2, cerrado_por = COALESCE($3, usuario_id), motivo_fin = $4
      WHERE operativo_id = $1 AND hasta IS NULL`, [operativoId, t, autorId, motivo]);
}

/**
 * Un coordinador que se registra como agente (QR o alta manual) deja el puesto
 * de comando. Si estaba a cargo, el operativo queda sin coordinador a cargo: en
 * ese flujo nadie puede elegir sucesor, y el puesto lo muestra en ámbar.
 */
export async function cerrarPorAltaComoAgenteCon(client, usuarioId, autorId, operativoTitulo) {
  const previa = await presenciaActiva(client, usuarioId);
  if (!previa) return;
  const t = await ahora(client);
  const motivo = `Pasó a rastrillar como agente en "${operativoTitulo}"`;
  await cerrarPresencia(client, previa.id, t, autorId, motivo);
  const mando = await mandoActivo(client, previa.operativoId);
  if (mando?.usuarioId === usuarioId) await cerrarMando(client, mando.id, t, autorId, motivo);
}
