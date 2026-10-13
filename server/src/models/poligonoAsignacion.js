/**
 * MODELO · Grupos en los polígonos (CU-28) — las piezas que comparten
 * grupo.model.js (que las llama al cambiar el estado de un grupo) y
 * poligono.model.js (asignar, quitar, cambiar, eliminar un polígono).
 *
 * Todo recibe el `client` de una transacción en curso: una asignación nunca se
 * escribe sin el cambio de estado del grupo que la acompaña.
 *
 * Reglas (decisiones del 12/10):
 *   · Un grupo está en un solo polígono a la vez (índice único de la 019).
 *   · A lo sumo UN grupo de rastrillaje por polígono, más los especiales que
 *     haga falta. Se controla acá con el polígono bloqueado.
 *   · El polígono no tiene estado: su historia es poligono_eventos.
 */
import { ReglaError } from './reglaError.js';

/** Mientras el grupo está en uno de estos estados, sigue en su polígono. */
export const ESTADOS_EN_POLIGONO = ['ASIGNADO', 'DESPLEGADO', 'RASTRILLANDO'];

/** Polígono vigente del operativo, bloqueado (o 404). */
export async function bloquearPoligono(client, operativoId, poligonoId) {
  const { rows } = await client.query(
    `SELECT id, operativo_id AS "operativoId", nombre
       FROM poligonos
      WHERE id = $1 AND operativo_id = $2 AND eliminado_en IS NULL
      FOR UPDATE`,
    [poligonoId, operativoId]
  );
  if (!rows[0]) throw new ReglaError(404, 'poligono_no_encontrado', 'El polígono no existe en este operativo.');
  return rows[0];
}

/** Grupos que están hoy en el polígono, con lo que hace falta para las reglas. */
export async function gruposVigentes(client, poligonoId) {
  const { rows } = await client.query(
    `SELECT pg.id AS "asignacionId", g.id, g.nombre, g.clase::text AS clase, g.estado::text AS estado
       FROM poligono_grupos pg JOIN grupos g ON g.id = pg.grupo_id
      WHERE pg.poligono_id = $1 AND pg.salida_en IS NULL`,
    [poligonoId]
  );
  return rows;
}

export async function registrarEvento(client, { poligonoId, operativoId, tipo, grupoId = null, trackId = null, detalle = null, usuarioId = null, t = null }) {
  await client.query(
    `INSERT INTO poligono_eventos (poligono_id, operativo_id, tipo, grupo_id, track_id, detalle, registrado_por, registrado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, CURRENT_TIMESTAMP))`,
    [poligonoId, operativoId, tipo, grupoId, trackId, detalle ? JSON.stringify(detalle) : null, usuarioId, t]
  );
}

/**
 * El grupo entra al polígono. Lo llama grupo.model#aplicar al pasar a ASIGNADO,
 * en la misma transacción. El polígono ya viene bloqueado.
 */
export async function abrirAsignacion(client, { poligono, grupo, usuarioId, t }) {
  if (grupo.clase === 'RASTRILLAJE') {
    const otro = (await gruposVigentes(client, poligono.id))
      .find(g => g.clase === 'RASTRILLAJE' && g.id !== grupo.id);
    if (otro) {
      throw new ReglaError(409, 'poligono_con_rastrillaje',
        `Este polígono ya tiene un grupo de rastrillaje (${otro.nombre}). Los grupos especiales sí se pueden sumar.`);
    }
  }
  await client.query(
    `INSERT INTO poligono_grupos (poligono_id, grupo_id, asignado_en, asignado_por) VALUES ($1, $2, $3, $4)`,
    [poligono.id, grupo.id, t, usuarioId]
  );
  await registrarEvento(client, {
    poligonoId: poligono.id, operativoId: poligono.operativoId, tipo: 'GRUPO_ASIGNADO',
    grupoId: grupo.id, detalle: { grupo: grupo.nombre }, usuarioId, t,
  });
}

const TIPO_POR_MOTIVO = {
  QUITADO: 'GRUPO_QUITADO',
  CAMBIADO: 'GRUPO_CAMBIADO',
  REPLEGADO: 'GRUPO_REPLEGADO',
  DISUELTO: 'GRUPO_SALIO',
  POLIGONO_ELIMINADO: 'GRUPO_SALIO',
  OPERATIVO_FINALIZADO: 'GRUPO_SALIO',
};

/**
 * El grupo sale del polígono en el que esté (si está en alguno). Devuelve el
 * polígono que dejó, o null. `motivo` es uno de poligono_grupos.motivo_salida.
 */
export async function cerrarAsignacionDeGrupo(client, grupo, { motivo, usuarioId, t }) {
  const { rows } = await client.query(
    `UPDATE poligono_grupos pg
        SET salida_en = GREATEST($2::timestamptz, pg.asignado_en), salida_por = $3, motivo_salida = $4
       FROM poligonos p
      WHERE pg.grupo_id = $1 AND pg.salida_en IS NULL AND p.id = pg.poligono_id
      RETURNING p.id, p.operativo_id AS "operativoId", p.nombre`,
    [grupo.id, t, usuarioId, motivo]
  );
  const poligono = rows[0] ?? null;
  if (poligono) {
    await registrarEvento(client, {
      poligonoId: poligono.id, operativoId: poligono.operativoId, tipo: TIPO_POR_MOTIVO[motivo],
      grupoId: grupo.id, detalle: { grupo: grupo.nombre, motivo }, usuarioId, t,
    });
  }
  return poligono;
}

/** CU-10: al finalizar el operativo, todos los grupos salen de sus polígonos. */
export async function cerrarTodasDelOperativo(client, operativoId, usuarioId) {
  const { rows } = await client.query(
    `SELECT g.id, g.nombre FROM poligono_grupos pg
       JOIN grupos g ON g.id = pg.grupo_id
      WHERE g.operativo_id = $1 AND pg.salida_en IS NULL`,
    [operativoId]
  );
  for (const g of rows) {
    await cerrarAsignacionDeGrupo(client, g, { motivo: 'OPERATIVO_FINALIZADO', usuarioId, t: new Date() });
  }
}
