/**
 * MODELO · Agente en operativo (Decisión A · Dualidad)
 *
 * `usuarios` es el perfil administrativo global y permanente. `agentes_operativo`
 * es su encarnación TÁCTICA en UN operativo concreto: el estado, el grupo, si
 * camina el polígono, si maneja. La misma persona puede ser caminante en un
 * operativo y quedarse en el Punto Cero en otro.
 */
import { query, withTransaction } from '../config/db.js';

const CAMPOS = `
  ao.id,
  ao.usuario_id     AS "usuarioId",
  ao.operativo_id   AS "operativoId",
  ao.estado::text   AS estado,
  ao.grupo_id       AS "grupoId",
  ao.es_caminante   AS "esCaminante",
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
 * ¿Camina el polígono? Se infiere de la especialidad y NO la elige el agente
 * (nota del docx: "El usuario no debe poder elegir esta opción en su registro").
 *
 * La regla es `es_caminante = NOT es_recurso_critico`: un paramédico o un piloto
 * de dron son recursos críticos y se pierden si salen a caminar — deben quedarse
 * en el Punto Cero, con su equipo. El Coordinador puede sobrescribirlo después
 * por operativo (CU-17), con advertencia.
 */
async function inferirCaminante(especialidadId) {
  if (!especialidadId) return true;   // sin especialidad declarada, camina
  const { rows } = await query(
    `SELECT es_recurso_critico FROM cat_especialidades WHERE id = $1`,
    [especialidadId]
  );
  return !(rows[0]?.es_recurso_critico ?? false);
}

/**
 * Da de alta al usuario en el operativo, en estado DISPONIBLE (CU-02 paso 7).
 *
 * Si `abandonarAnterior` es true y el agente ya estaba en otro operativo, se le
 * cierra esa participación en la MISMA transacción. Tiene que ser atómico por el
 * índice `agente_unico_activo_idx`: si se insertara la nueva alta antes de cerrar
 * la vieja, PostgreSQL rechazaría el INSERT. Ese índice es la Regla de Ubicuidad
 * hecha constraint — no depende de que la aplicación se acuerde de verificarla.
 */
export async function darDeAlta({ usuarioId, operativoId, especialidadId = null, abandonarAnterior = false }) {
  const esCaminante = await inferirCaminante(especialidadId);

  const id = await withTransaction(async (client) => {
    if (abandonarAnterior) {
      await client.query(
        `UPDATE agentes_operativo
            SET fecha_egreso = CURRENT_TIMESTAMP, grupo_id = NULL
          WHERE usuario_id = $1 AND fecha_egreso IS NULL`,
        [usuarioId]
      );
      // Si venía de un grupo, ese período del historial también se cierra:
      // dejarlo abierto falsearía el informe forense (CU-26).
      await client.query(
        `UPDATE agentes_grupo_historial h
            SET fecha_fin = CURRENT_TIMESTAMP, motivo_salida = 'Cambio de operativo'
           FROM agentes_operativo ao
          WHERE h.agente_operativo_id = ao.id
            AND ao.usuario_id = $1
            AND h.fecha_fin IS NULL`,
        [usuarioId]
      );
    }

    const { rows } = await client.query(
      `INSERT INTO agentes_operativo
         (usuario_id, operativo_id, estado, especialidad_id, es_caminante)
       VALUES ($1, $2, 'DISPONIBLE', $3, $4)
       RETURNING id`,
      [usuarioId, operativoId, especialidadId, esCaminante]
    );
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
 * CU-17 · edición de los datos TÁCTICOS (estado, especialidad-override,
 * caminante/conductor). Mismo patrón `permitidos` que usuario.model.js: sólo
 * toca columnas presentes en `campos`, y un `null` explícito SÍ se escribe
 * (ej. `estado: null` vacía el estado — "sin estado" es NULL real, no un
 * string vacío; ver columna `estado` de `agentes_operativo`, nullable).
 */
export async function actualizar(id, campos) {
  const permitidos = {
    estado: 'estado',
    especialidadId: 'especialidad_id',
    esCaminante: 'es_caminante',
    esConductor: 'es_conductor',
  };

  const sets = [];
  const valores = [];
  for (const [clave, columna] of Object.entries(permitidos)) {
    if (campos[clave] !== undefined) {
      valores.push(campos[clave]);
      const cast = clave === 'estado' ? '::estado_agente' : '';
      sets.push(`${columna} = $${valores.length}${cast}`);
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
 * Baja lógica de la participación (no del Usuario global — Decisión A). Cierra
 * también cualquier pertenencia a grupo, igual patrón que CU-10 (finalizar) y
 * el traslado de la Regla de Ubicuidad.
 */
export async function egresar(id) {
  await query(
    `UPDATE agentes_operativo SET fecha_egreso = CURRENT_TIMESTAMP, grupo_id = NULL
      WHERE id = $1`,
    [id]
  );
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
