/**
 * MODELO · Agente en operativo (Decisión A · Dualidad)
 *
 * `usuarios` es el perfil administrativo global y permanente. `agentes_operativo`
 * es su encarnación TÁCTICA en UN operativo concreto: el estado, el grupo, la
 * especialidad con la que trabaja y si maneja. La misma persona puede ser
 * conductor en un operativo y rastrillar en otro.
 */
import { query, withTransaction } from '../config/db.js';
import { ESTADOS_AGENTE, ESTADOS_AGENTE_ELEGIBLES, ETIQUETA_AGENTE } from './estados.js';
import * as Evento from './evento.model.js';
import * as Grupo from './grupo.model.js';

/**
 * Los 7 valores del enum `estado_agente` (migración 010). El catálogo y sus
 * reglas viven en estados.js; se reexporta para los controladores.
 */
export const ESTADOS = ESTADOS_AGENTE;

const CAMPOS = `
  ao.id,
  ao.usuario_id     AS "usuarioId",
  ao.operativo_id   AS "operativoId",
  ao.estado::text   AS estado,
  ao.estado_actualizado_en AS "estadoActualizadoEn",
  ao.grupo_id       AS "grupoId",
  ao.es_conductor   AS "esConductor",
  ao.especialidad_id AS "especialidadId",
  ao.fecha_ingreso  AS "fechaIngreso",
  ao.fecha_egreso   AS "fechaEgreso"
`;

/**
 * Alta ACTIVA del usuario, si tiene una. Es el corazón de la Regla de Ubicuidad
 * (Decisión B): un efectivo no puede estar operando en dos lugares a la vez.
 * Devuelve también el operativo, porque el modal de CU-15 paso 6.2 tiene que
 * nombrarlo ("Ya estás asignado al operativo [Nombre]").
 */
export async function altaActivaDe(usuarioId) {
  const { rows } = await query(
    `SELECT ${CAMPOS}, o.titulo AS "operativoTitulo", o.localidad AS "operativoLocalidad"
       FROM agentes_operativo ao
       JOIN operativos o ON o.id = ao.operativo_id
      WHERE ao.usuario_id = $1 AND ao.fecha_egreso IS NULL`,
    [usuarioId]
  );
  return rows[0] ?? null;
}

/**
 * ¿Esa especialidad es de un recurso especial (dron, canes, paramédico…)? Es un
 * dato del catálogo (`cat_especialidades.es_recurso_critico`), no una lista en
 * el código. Sin especialidad, no: es un agente de rastrillaje.
 *
 * Desde el 29/09 no hay "caminante" que inferir ni sobrescribir: rastrilla todo
 * el que no es conductor, y la especialidad decide a qué clase de grupo entra.
 */
export async function esRecursoCritico(especialidadId) {
  if (!especialidadId) return false;
  const { rows } = await query(
    `SELECT es_recurso_critico FROM cat_especialidades WHERE id = $1`,
    [especialidadId]
  );
  return rows[0]?.es_recurso_critico ?? false;
}

/**
 * Da de alta al usuario en el operativo, en estado DISPONIBLE (CU-02 paso 7),
 * y deja el primer evento de su línea de tiempo: cuándo llegó.
 *
 * Si `abandonarAnterior` es true y el agente ya estaba en otro operativo, se le
 * cierra esa participación en la MISMA transacción. Tiene que ser atómico por el
 * índice `agente_unico_activo_idx`: si se insertara la nueva alta antes de cerrar
 * la vieja, PostgreSQL rechazaría el INSERT. Ese índice es la Regla de Ubicuidad
 * hecha constraint — no depende de que la aplicación se acuerde de verificarla.
 *
 * Si en el operativo que deja estaba en un grupo, rigen las reglas de grupo
 * (grupo.model.js#liberarPorCambioDeOperativo): no se puede ir estando en el
 * terreno, y si el grupo ya estaba confirmado, se reabre.
 *
 * @param fuente 'QR' (autoservicio) | 'COORDINADOR' (alta manual, CU-16)
 */
export async function darDeAlta({
  usuarioId, operativoId, especialidadId = null, abandonarAnterior = false,
  fuente = 'QR', registradoPor = null,
}) {
  const autor = registradoPor ?? usuarioId;

  const id = await withTransaction(async (client) => {
    if (abandonarAnterior) {
      const { rows: previas } = await client.query(
        `SELECT ao.id, ao.operativo_id AS "operativoId", ao.estado::text AS estado,
                (SELECT titulo FROM operativos WHERE id = $2) AS destino
           FROM agentes_operativo ao
          WHERE ao.usuario_id = $1 AND ao.fecha_egreso IS NULL
          FOR UPDATE`,
        [usuarioId, operativoId]
      );
      for (const previa of previas) {
        await Grupo.liberarPorCambioDeOperativo(client, previa.id, autor, previa.destino);
        await client.query(
          `UPDATE agentes_operativo SET fecha_egreso = CURRENT_TIMESTAMP, grupo_id = NULL WHERE id = $1`,
          [previa.id]
        );
        // Si venía de un grupo, ese período del historial también se cierra:
        // dejarlo abierto falsearía el informe forense (CU-26).
        await client.query(
          `UPDATE agentes_grupo_historial
              SET fecha_fin = CURRENT_TIMESTAMP, motivo_salida = 'Cambio de operativo'
            WHERE agente_operativo_id = $1 AND fecha_fin IS NULL`,
          [previa.id]
        );
        await Evento.registrar(client, {
          operativoId: previa.operativoId, entidad: 'AGENTE', agenteOperativoId: previa.id,
          accion: 'baja', estadoAnterior: previa.estado, registradoPor: autor, fuente,
          motivo: `Pasó al operativo ${previa.destino}`,
        });
      }
    }

    const { rows } = await client.query(
      `INSERT INTO agentes_operativo
         (usuario_id, operativo_id, estado, especialidad_id)
       VALUES ($1, $2, 'DISPONIBLE', $3)
       RETURNING id`,
      [usuarioId, operativoId, especialidadId]
    );
    await Evento.registrar(client, {
      operativoId, entidad: 'AGENTE', agenteOperativoId: rows[0].id, accion: 'alta',
      estadoNuevo: 'DISPONIBLE', registradoPor: autor, fuente,
      motivo: fuente === 'QR' ? 'Ingresó escaneando el QR del operativo' : 'Alta manual del coordinador',
    });
    return rows[0].id;
  });

  return buscarPorId(id);
}

export async function buscarPorId(id) {
  const { rows } = await query(
    `SELECT ${CAMPOS} FROM agentes_operativo ao WHERE ao.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

/** El registro TÁCTICO vigente (sin egreso) de un usuario en un operativo puntual. */
export async function buscarActivoDeOperativo(operativoId, usuarioId) {
  const { rows } = await query(
    `SELECT ${CAMPOS} FROM agentes_operativo ao
      WHERE ao.operativo_id = $1 AND ao.usuario_id = $2 AND ao.fecha_egreso IS NULL`,
    [operativoId, usuarioId]
  );
  return rows[0] ?? null;
}

/**
 * CU-17 · edición de los datos TÁCTICOS (especialidad-override y
 * conductor). Mismo patrón `permitidos` que usuario.model.js: sólo
 * toca columnas presentes en `campos`.
 *
 * El ESTADO no se cambia acá: va por cambiarEstadoSinGrupo(), porque desde el
 * 24/09 sólo se elige el estado de quien no está en un grupo (Regla 1).
 */
export async function actualizar(id, campos) {
  const permitidos = {
    especialidadId: 'especialidad_id',
    esConductor: 'es_conductor',
  };

  const sets = [];
  const valores = [];
  for (const [clave, columna] of Object.entries(permitidos)) {
    if (campos[clave] !== undefined) {
      valores.push(campos[clave]);
      sets.push(`${columna} = $${valores.length}`);
    }
  }

  if (sets.length === 0) return buscarPorId(id);

  valores.push(id);
  await query(
    `UPDATE agentes_operativo SET ${sets.join(', ')} WHERE id = $${valores.length}`,
    valores
  );
  return buscarPorId(id);
}

/**
 * Estado de alguien SIN grupo: lo elige el coordinador (CU-17) o el propio
 * agente desde su portal. Con grupo no se elige: lo manda el grupo (Regla 1), y
 * la base lo garantiza con el CHECK agente_estado_segun_grupo_chk. El retirado
 * por CU-26 que vuelve (REPLEGADO sin grupo) también sale por acá.
 *
 * La marca de tiempo sólo se mueve si el estado REALMENTE cambia: reabrir la
 * ficha y guardar sin tocarlo no vuelve a cero un "no disponible hace 3 h".
 */
export async function cambiarEstadoSinGrupo(id, estado, { fuente, usuarioId, motivo = null }) {
  if (!ESTADOS_AGENTE_ELEGIBLES.includes(estado)) {
    throw new Grupo.ReglaError(400, 'estado_invalido',
      'Sin grupo, el estado es Disponible o No disponible. Los demás los pone el grupo.');
  }
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, operativo_id AS "operativoId", grupo_id AS "grupoId", estado::text AS estado
         FROM agentes_operativo WHERE id = $1 AND fecha_egreso IS NULL FOR UPDATE`,
      [id]
    );
    const agente = rows[0];
    if (!agente) throw new Grupo.ReglaError(404, 'agente_no_encontrado', 'El agente no está activo en el operativo.');
    if (agente.grupoId) {
      const grupo = await Grupo.estadoDeGrupo(agente.grupoId);
      throw new Grupo.ReglaError(409, 'agente_en_grupo',
        `Está en el ${grupo?.nombre ?? 'grupo'} y su estado lo define el grupo. Para cambiarlo, cambiá el estado del grupo o sacalo del grupo.`);
    }
    if (agente.estado === estado) return;

    await client.query(
      `UPDATE agentes_operativo SET estado = $2::estado_agente, estado_actualizado_en = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, estado]
    );
    await Evento.registrar(client, {
      operativoId: agente.operativoId, entidad: 'AGENTE', agenteOperativoId: id, accion: 'marcar_estado',
      estadoAnterior: agente.estado, estadoNuevo: estado, registradoPor: usuarioId, fuente,
      motivo: motivo ?? `${ETIQUETA_AGENTE[agente.estado]} → ${ETIQUETA_AGENTE[estado]}`,
    });
  });
  return buscarPorId(id);
}

/**
 * Baja lógica de la participación (CU-20; no toca al Usuario global — Decisión
 * A). Desde el 24/09 sólo para quien no está en un grupo: lo exige el
 * controlador, para que la baja no se saltee las reglas del grupo.
 */
export async function egresar(id, usuarioId = null) {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT operativo_id AS "operativoId", estado::text AS estado FROM agentes_operativo WHERE id = $1`,
      [id]
    );
    await client.query(
      `UPDATE agentes_operativo SET fecha_egreso = CURRENT_TIMESTAMP, grupo_id = NULL
        WHERE id = $1`,
      [id]
    );
    await Evento.registrar(client, {
      operativoId: rows[0].operativoId, entidad: 'AGENTE', agenteOperativoId: id, accion: 'baja',
      estadoAnterior: rows[0].estado, registradoPor: usuarioId, fuente: 'COORDINADOR',
      motivo: 'Baja del operativo',
    });
    // Si estaba en un grupo en operación, su período se sella acá: dejarlo
    // abierto diría que sigue trabajando en el grupo después de irse.
    await client.query(
      `UPDATE agentes_grupo_historial
          SET fecha_fin = CURRENT_TIMESTAMP, motivo_salida = 'Baja del operativo', registrado_por = $2
        WHERE agente_operativo_id = $1 AND fecha_fin IS NULL`,
      [id, usuarioId]
    );
  });
}

/**
 * Personal actualmente en el operativo (CU-19). Excluye a quienes ya egresaron.
 * Es lo que consume la grilla del Coordinador, que refresca por polling.
 */
export async function listarDeOperativo(operativoId) {
  const { rows } = await query(
    `SELECT ${CAMPOS},
            u.nombre, u.apellido, u.dni, u.telefono,
            u.grupo_sanguineo AS "grupoSanguineo",
            e.nombre AS "especialidadNombre",
            COALESCE(e.es_recurso_critico, false) AS "esRecursoCritico",
            i.nombre AS "institucionNombre",
            i.es_duar AS "esDuar"
       FROM agentes_operativo ao
       JOIN usuarios u ON u.id = ao.usuario_id
       LEFT JOIN cat_especialidades e ON e.id = ao.especialidad_id
       LEFT JOIN cat_instituciones  i ON i.id = u.institucion_id
      WHERE ao.operativo_id = $1 AND ao.fecha_egreso IS NULL
      ORDER BY ao.fecha_ingreso DESC`,
    [operativoId]
  );
  return rows;
}
