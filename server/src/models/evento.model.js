/**
 * MODELO · Línea de tiempo del terreno (`eventos_estado`, migración 010)
 *
 * Cada cambio de estado de un grupo o de un agente queda acá con DOS horas:
 *   · ocurrido_en   → cuándo pasó (el celular del Líder, o la hora que carga el
 *                     coordinador al registrar un aviso de radio),
 *   · registrado_en → cuándo llegó al servidor.
 * Sin señal en el terreno pueden diferir horas, y la línea de tiempo se ordena
 * por la primera. También quedan los avisos que no cambiaron nada (el mismo
 * hecho informado dos veces, uno viejo que llegó tarde): son parte de la
 * historia aunque el tablero no se haya movido.
 *
 * No reemplaza a logs_auditoria (Decisión D), que sigue respondiendo quién
 * modificó la base. Ésta responde qué pasó en el terreno y cuándo.
 */
import { query } from '../config/db.js';

/**
 * Registra un evento dentro de la transacción del cambio que lo produce.
 * Devuelve el id (lo necesitan los eventos de cascada para apuntar a su origen).
 */
export async function registrar(client, e) {
  const { rows } = await client.query(
    `INSERT INTO eventos_estado
       (operativo_id, entidad, grupo_id, agente_operativo_id, accion,
        estado_anterior, estado_nuevo, ocurrido_en, registrado_por, fuente,
        resultado, evento_origen_id, confirma_evento_id, motivo, nota,
        hora_confiable, cliente_evento_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8, CURRENT_TIMESTAMP),$9,$10,
             COALESCE($11,'APLICADO'),$12,$13,$14,$15,COALESCE($16,true),$17)
     RETURNING id`,
    [
      e.operativoId, e.entidad, e.grupoId ?? null, e.agenteOperativoId ?? null, e.accion,
      e.estadoAnterior ?? null, e.estadoNuevo ?? null, e.ocurridoEn ?? null, e.registradoPor ?? null, e.fuente,
      e.resultado ?? null, e.eventoOrigenId ?? null, e.confirmaEventoId ?? null,
      e.motivo ? String(e.motivo).slice(0, 200) : null, e.nota ? String(e.nota).slice(0, 200) : null,
      e.horaConfiable ?? null, e.clienteEventoId ?? null,
    ]
  );
  return rows[0].id;
}

/** El evento que ya produjo esa id de cliente (reenvío de la cola sin señal). */
export async function porIdCliente(client, clienteEventoId) {
  if (!clienteEventoId) return null;
  const { rows } = await client.query(
    `SELECT id, resultado, estado_nuevo AS "estadoNuevo" FROM eventos_estado WHERE cliente_evento_id = $1`,
    [clienteEventoId]
  );
  return rows[0] ?? null;
}

/**
 * Eventos de ESTADO de un grupo que efectivamente lo cambiaron (sin contar
 * confirmaciones, superados, rechazados ni cambios de Líder, que no mueven el
 * estado). Es la columna vertebral de la resolución de eventos tardíos.
 */
export async function primerCambioDeGrupoPosterior(client, grupoId, instante) {
  const { rows } = await client.query(
    `SELECT id, estado_nuevo AS "estadoNuevo", ocurrido_en AS "ocurridoEn"
       FROM eventos_estado
      WHERE entidad = 'GRUPO' AND grupo_id = $1 AND resultado = 'APLICADO'
        AND estado_nuevo IS DISTINCT FROM estado_anterior
        AND ocurrido_en > $2
      ORDER BY ocurrido_en, registrado_en
      LIMIT 1`,
    [grupoId, instante]
  );
  return rows[0] ?? null;
}

/** El último evento que llevó al grupo a su estado actual. */
export async function ultimoCambioDeGrupo(client, grupoId) {
  const { rows } = await client.query(
    `SELECT id, estado_nuevo AS "estadoNuevo", ocurrido_en AS "ocurridoEn"
       FROM eventos_estado
      WHERE entidad = 'GRUPO' AND grupo_id = $1 AND resultado = 'APLICADO'
        AND estado_nuevo IS DISTINCT FROM estado_anterior
      ORDER BY ocurrido_en DESC, registrado_en DESC
      LIMIT 1`,
    [grupoId]
  );
  return rows[0] ?? null;
}

const CAMPOS = `
  e.id, e.entidad, e.accion,
  e.estado_anterior   AS "estadoAnterior",
  e.estado_nuevo      AS "estadoNuevo",
  e.ocurrido_en       AS "ocurridoEn",
  e.registrado_en     AS "registradoEn",
  e.fuente, e.resultado, e.motivo, e.nota,
  e.hora_confiable    AS "horaConfiable",
  e.grupo_id          AS "grupoId",
  g.nombre            AS "grupoNombre",
  e.agente_operativo_id AS "agenteOperativoId",
  ua.nombre || ' ' || ua.apellido AS "agenteNombre",
  ur.nombre || ' ' || ur.apellido AS "registradoPorNombre",
  e.evento_origen_id  AS "eventoOrigenId",
  o.accion            AS "origenAccion",
  o.fuente            AS "origenFuente",
  e.confirma_evento_id AS "confirmaEventoId",
  -- ¿Quien lo registró estaba en el puesto de comando a esa hora? (migración 016)
  -- true = presente · false = a distancia · null = no aplica (lo informó el Líder,
  -- fue una cascada o el sistema) o el operativo todavía no llevaba registro del
  -- puesto de comando (sin eso, todo lo anterior al 01/10 saldría "a distancia").
  CASE WHEN e.fuente IN ('COORDINADOR', 'RADIO') AND EXISTS (
         SELECT 1 FROM presencias_mando p0
          WHERE p0.operativo_id = e.operativo_id AND p0.ingreso_en <= e.registrado_en)
       THEN EXISTS (
         SELECT 1 FROM presencias_mando p
          WHERE p.operativo_id = e.operativo_id AND p.usuario_id = e.registrado_por
            AND p.ingreso_en <= e.registrado_en
            AND (p.egreso_en IS NULL OR e.registrado_en <= p.egreso_en))
  END AS "enPuesto",
  -- Otras vías por las que llegó el MISMO hecho (radio + celular del Líder).
  -- En un evento de cascada se miran las del evento del grupo que lo causó.
  COALESCE((
    SELECT json_agg(json_build_object(
             'fuente', c.fuente, 'ocurridoEn', c.ocurrido_en, 'registradoEn', c.registrado_en,
             'horaConfiable', c.hora_confiable,
             'registradoPorNombre', uc.nombre || ' ' || uc.apellido
           ) ORDER BY c.ocurrido_en)
      FROM eventos_estado c
      LEFT JOIN usuarios uc ON uc.id = c.registrado_por
     WHERE c.confirma_evento_id = COALESCE(e.evento_origen_id, e.id)
  ), '[]') AS confirmaciones
`;

// Empate (eventos de una misma transacción anteriores a la migración 011):
// el del grupo va antes que la cascada a sus integrantes.
const ORDEN = `e.ocurrido_en, e.registrado_en, (e.entidad <> 'GRUPO')`;

const JOINS = `
  FROM eventos_estado e
  LEFT JOIN grupos g            ON g.id = e.grupo_id
  LEFT JOIN agentes_operativo a ON a.id = e.agente_operativo_id
  LEFT JOIN usuarios ua         ON ua.id = a.usuario_id
  LEFT JOIN usuarios ur         ON ur.id = e.registrado_por
  LEFT JOIN eventos_estado o    ON o.id = e.evento_origen_id
`;

/** El día de una persona en el operativo: su alta, cada cambio y quién lo causó. */
export async function lineaDeTiempoAgente(operativoId, agenteOperativoId) {
  const { rows } = await query(
    `SELECT ${CAMPOS} ${JOINS}
      WHERE e.operativo_id = $1 AND e.entidad = 'AGENTE' AND e.agente_operativo_id = $2
      ORDER BY ${ORDEN}`,
    [operativoId, agenteOperativoId]
  );
  return rows;
}

/**
 * La historia de un grupo: sus cambios de estado (también los superados y
 * rechazados, que son información) y quién entró o salió de él. Las cascadas
 * a cada integrante no se repiten acá: están en la línea de tiempo de cada uno.
 */
export async function lineaDeTiempoGrupo(operativoId, grupoId) {
  const { rows } = await query(
    `SELECT ${CAMPOS} ${JOINS}
      WHERE e.operativo_id = $1 AND e.grupo_id = $2
        AND e.confirma_evento_id IS NULL
        AND (e.entidad = 'GRUPO' OR e.accion IN ('agrupar', 'desagrupar', 'retiro', 'baja', 'cambio_operativo'))
      ORDER BY ${ORDEN}`,
    [operativoId, grupoId]
  );
  return rows;
}
