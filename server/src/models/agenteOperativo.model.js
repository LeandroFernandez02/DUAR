/**
 * MODELO · Agente en operativo (Decisión A · Dualidad)
 *
 * `usuarios` es el perfil administrativo global y permanente. `agentes_operativo`
 * es su encarnación TÁCTICA en UN operativo concreto: el estado, el grupo, la
 * especialidad con la que trabaja y si maneja. La misma persona puede ser
 * conductor en un operativo y rastrillar en otro.
 */
import * as Estado from './operativoEstado.model.js';
import { query, withTransaction } from '../config/db.js';
import { ESTADOS_AGENTE, ESTADOS_AGENTE_ELEGIBLES, ETIQUETA_AGENTE } from './estados.js';
import * as Evento from './evento.model.js';
import * as Grupo from './grupo.model.js';
import * as Mando from './mando.model.js';
import { ReglaError } from './reglaError.js';

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
 * Devuelve también el operativo, porque el modal de CU-17 paso 6.2 tiene que
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
 * ¿Esa especialidad es de un recurso especial (K-9, drones, buceo…)? Es un
 * dato del catálogo (`cat_especialidades.es_recurso_critico`), no una lista en
 * el código. Sin especialidad, no: es un agente de rastrillaje.
 *
 * Desde el 29/09 no hay "caminante" que inferir ni sobrescribir: rastrilla todo
 * el que no es conductor, y la especialidad decide a qué clase de grupo entra.
 */
/** ¿Es la especialidad "Conductor"? (migración 035: el conductor es una especialidad). */
export async function esEspecialidadConductor(especialidadId) {
  if (!especialidadId) return false;
  const { rows } = await query(`SELECT es_conductor FROM cat_especialidades WHERE id = $1`, [especialidadId]);
  return rows[0]?.es_conductor ?? false;
}

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
 * @param fuente 'QR' (autoservicio) | 'COORDINADOR' (alta manual, CU-18)
 */
export async function darDeAlta({
  usuarioId, operativoId, especialidadId = null, abandonarAnterior = false,
  fuente = 'QR', registradoPor = null,
}) {
  const autor = registradoPor ?? usuarioId;

  const id = await withTransaction(async (client) => {
    // Regla del 27/10: en un operativo sólo figuran cuentas con rol de agente. Un coordinador que
    // necesita salir a rastrillar pide que otro le cambie el rol a agente; recién ahí se da de alta.
    const { rows: [u] } = await client.query(
      `SELECT u.nombre || ' ' || u.apellido AS nombre, lower(r.nombre) AS rol
         FROM usuarios u JOIN cat_roles r ON r.id = u.rol_id WHERE u.id = $1`, [usuarioId]);
    if (u && u.rol !== 'agente') {
      throw new Grupo.ReglaError(409, 'no_es_agente',
        `${u.nombre} tiene rol de ${u.rol}: en un operativo sólo se dan de alta agentes. `
        + 'Si necesita salir a rastrillar, pedile a un coordinador que le cambie el rol a agente.');
    }

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
        // dejarlo abierto falsearía el informe forense (CU-28).
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
    // Especialidad sincronizada (07/11): si el alta la trae distinta de la del
    // perfil, el perfil queda igual que el operativo.
    await client.query(
      `UPDATE usuarios SET especialidad_id = $2, actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $1 AND especialidad_id IS DISTINCT FROM $2`,
      [usuarioId, especialidadId]
    );
    await actualizarFoto(client, rows[0].id);
    await Evento.registrar(client, {
      operativoId, entidad: 'AGENTE', agenteOperativoId: rows[0].id, accion: 'alta',
      estadoNuevo: 'DISPONIBLE', registradoPor: autor, fuente,
      motivo: fuente === 'QR' ? 'Ingresó escaneando el QR del operativo' : 'Alta manual del coordinador',
    });
    return rows[0].id;
  });

  // Ciclo de estados del operativo (24/10): el primer agente lo pasa a «En planificación»
  // y un ingreso en uno Inactivo por falta de actividad lo reanuda.
  await Estado.despuesDeIngreso(operativoId, autor).catch(err => console.error('[estado] no se pudo actualizar tras el ingreso:', err.message));

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
 * FOTO de la participación (migración 034, 07/11). El informe es un documento
 * legal: tiene que mostrar la especialidad, la institución y la dependencia
 * que la persona tenía EN ESTE operativo, aunque después cambien. Mientras la
 * participación está vigente se mantiene al día; al egresar (o al finalizar el
 * operativo) queda congelada, porque esta sentencia sólo toca filas vigentes.
 */
export async function actualizarFoto(client, agenteOperativoId) {
  await client.query(
    `UPDATE agentes_operativo ao
        SET especialidad_nombre = (SELECT e.nombre FROM cat_especialidades e WHERE e.id = ao.especialidad_id),
            institucion_nombre  = (SELECT i.nombre FROM usuarios u JOIN cat_instituciones i ON i.id = u.institucion_id
                                    WHERE u.id = ao.usuario_id),
            dependencia_nombre  = (SELECT d.nombre FROM usuarios u JOIN cat_dotaciones d ON d.id = u.dotacion_id
                                    WHERE u.id = ao.usuario_id)
      WHERE ao.id = $1 AND ao.fecha_egreso IS NULL`,
    [agenteOperativoId]
  );
}

const nombreEspecialidad = async (client, id) => {
  if (!id) return 'sin especialidad';
  const { rows } = await client.query(`SELECT nombre FROM cat_especialidades WHERE id = $1`, [id]);
  return rows[0]?.nombre ?? 'sin especialidad';
};

/**
 * Cambia la especialidad de una participación vigente y deja el registro en la
 * línea de tiempo (acción 'especialidad', «De K-9 a Caminante»). Lo usan los
 * dos caminos de la sincronización (07/11): desde el operativo (CU-19, que
 * además actualiza el perfil) y desde el perfil (que ya lo guardó).
 * Las reglas de grupo las valida quien llama.
 */
async function registrarCambioDeEspecialidad(client, ao, especialidadId, { autor, fuente }) {
  const antes = await nombreEspecialidad(client, ao.especialidadId);
  const despues = await nombreEspecialidad(client, especialidadId);
  await client.query(`UPDATE agentes_operativo SET especialidad_id = $2 WHERE id = $1`, [ao.id, especialidadId]);
  await Evento.registrar(client, {
    operativoId: ao.operativoId, entidad: 'AGENTE', agenteOperativoId: ao.id, grupoId: ao.grupoId ?? null,
    accion: 'especialidad', registradoPor: autor, fuente,
    motivo: `De ${antes} a ${despues}`,
  });
}

/**
 * Desde el OPERATIVO (CU-19): cambia la especialidad en este operativo y en el
 * perfil de la persona, en la misma transacción (07/11).
 */
export async function cambiarEspecialidadDesdeOperativo(agenteOperativoId, especialidadId, { autor }) {
  await withTransaction(async (client) => {
    const { rows: [ao] } = await client.query(
      `SELECT id, operativo_id AS "operativoId", usuario_id AS "usuarioId", grupo_id AS "grupoId",
              especialidad_id AS "especialidadId"
         FROM agentes_operativo WHERE id = $1 AND fecha_egreso IS NULL FOR UPDATE`,
      [agenteOperativoId]
    );
    if (!ao) throw new ReglaError(404, 'agente_no_encontrado', 'El agente no está activo en el operativo.');
    if ((ao.especialidadId ?? null) === (especialidadId ?? null)) return;
    await registrarCambioDeEspecialidad(client, ao, especialidadId, { autor, fuente: 'COORDINADOR' });
    await client.query(
      `UPDATE usuarios SET especialidad_id = $2, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1`,
      [ao.usuarioId, especialidadId]
    );
    await actualizarFoto(client, ao.id);
  });
  return buscarPorId(agenteOperativoId);
}

/**
 * Desde el PERFIL (Usuarios o «Mis datos»), dentro de la transacción que lo
 * guarda y DESPUÉS de guardarlo: lleva el cambio a su participación vigente.
 *
 *  · Especialidad: mientras integre un grupo (esté rastrillando o no) no se
 *    cambia — ni la propia persona ni un administrador. Sin grupo (Disponible
 *    o No disponible) sí, y queda en la línea de tiempo del operativo.
 *  · Institución y dependencia: siempre se refrescan en la foto.
 *
 * Si la regla rechaza el cambio, lanza ReglaError y el perfil tampoco se guarda.
 */
export async function sincronizarDesdePerfil(client, usuarioId, { cambiaEspecialidad, especialidadId, autor, propio }) {
  const { rows: [ao] } = await client.query(
    `SELECT ao.id, ao.operativo_id AS "operativoId", ao.grupo_id AS "grupoId",
            ao.especialidad_id AS "especialidadId",
            g.nombre AS "grupoNombre", o.titulo AS "operativoTitulo",
            u.nombre || ' ' || u.apellido AS persona
       FROM agentes_operativo ao
       JOIN operativos o ON o.id = ao.operativo_id
       JOIN usuarios u ON u.id = ao.usuario_id
       LEFT JOIN grupos g ON g.id = ao.grupo_id
      WHERE ao.usuario_id = $1 AND ao.fecha_egreso IS NULL
      FOR UPDATE OF ao`,
    [usuarioId]
  );
  if (!ao) return;

  if (cambiaEspecialidad && (ao.especialidadId ?? null) !== (especialidadId ?? null)) {
    if (ao.grupoId) {
      const grupo = /^grupo\b/i.test(ao.grupoNombre ?? '') ? ao.grupoNombre : `grupo ${ao.grupoNombre ?? ''}`.trim();
      throw new ReglaError(409, 'especialidad_en_grupo', propio
        ? `Estás en el ${grupo} del operativo «${ao.operativoTitulo}»: mientras integres un grupo no podés cambiar tu especialidad. Pedile al coordinador que te saque del grupo.`
        : `${ao.persona} está en el ${grupo} del operativo «${ao.operativoTitulo}»: mientras integre un grupo no se puede cambiar su especialidad. Sacalo del grupo primero.`);
    }
    await registrarCambioDeEspecialidad(client, ao, especialidadId,
      { autor, fuente: propio ? 'PORTAL_AGENTE' : 'COORDINADOR' });
  }
  await actualizarFoto(client, ao.id);
}

/**
 * CU-19 · edición de los datos TÁCTICOS (especialidad-override y
 * conductor). Mismo patrón `permitidos` que usuario.model.js: sólo
 * toca columnas presentes en `campos`.
 *
 * El ESTADO no se cambia acá: va por cambiarEstadoSinGrupo(), porque desde el
 * 24/09 sólo se elige el estado de quien no está en un grupo (Regla 1).
 */
export async function actualizar(id, campos) {
  // es_conductor ya no se escribe: lo deriva la base de la especialidad (migración 035).
  const permitidos = {
    especialidadId: 'especialidad_id',
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
 * Estado de alguien SIN grupo: lo elige el coordinador (CU-19) o el propio
 * agente desde su portal. Con grupo no se elige: lo manda el grupo (Regla 1), y
 * la base lo garantiza con el CHECK agente_estado_segun_grupo_chk. El retirado
 * por CU-28 que vuelve (REPLEGADO sin grupo) también sale por acá.
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
 * Baja lógica de la participación (CU-22; no toca al Usuario global — Decisión
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
 * CU-07 (05/10): al eliminar una cuenta, la persona deja todos los operativos
 * en los que estaba y el puesto de comando, en la MISMA transacción que la baja
 * de la cuenta. Antes seguía figurando "Disponible" en un operativo con la
 * cuenta eliminada.
 *  - En un grupo en la base: sale del grupo (se reabre; si era Líder, queda sin Líder).
 *  - En un grupo en el terreno: no se puede (409 grupo_en_terreno): primero tiene
 *    que volver y ser retirado del grupo (CU-28), que deja motivo y sucesión.
 * Devuelve los operativos que dejó, para la auditoría.
 */
export async function egresarPorCuentaEliminadaCon(client, usuarioId, autorId) {
  return dejarOperativosCon(client, usuarioId, autorId, 'Su cuenta fue eliminada del sistema', { porEliminacion: true });
}

/**
 * Cambio de rol confirmado (Testeo punto 44 + regla del 27/10: un coordinador nunca figura como
 * agente): deja sus operativos y el puesto de comando con las mismas reglas que al eliminar la
 * cuenta, en la transacción del cambio. Si está en el terreno con un grupo, el rol no cambia.
 */
export async function egresarPorCambioDeRolCon(client, usuarioId, autorId, rolNuevo) {
  return dejarOperativosCon(client, usuarioId, autorId, `Cambió de rol a ${rolNuevo}`, { porCambioDeRol: true });
}

async function dejarOperativosCon(client, usuarioId, autorId, MOTIVO, { porEliminacion = false, porCambioDeRol = false } = {}) {
  const { rows: altas } = await client.query(
    `SELECT ao.id, ao.operativo_id AS "operativoId", o.titulo
       FROM agentes_operativo ao JOIN operativos o ON o.id = ao.operativo_id
      WHERE ao.usuario_id = $1 AND ao.fecha_egreso IS NULL
      FOR UPDATE OF ao`,
    [usuarioId]
  );
  for (const alta of altas) {
    await Grupo.liberarPorCambioDeOperativo(client, alta.id, autorId, null, { porEliminacion, porCambioDeRol, motivo: MOTIVO });
    const { rows } = await client.query(
      `UPDATE agentes_operativo SET fecha_egreso = CURRENT_TIMESTAMP, grupo_id = NULL
        WHERE id = $1 RETURNING estado::text AS estado`,
      [alta.id]
    );
    await client.query(
      `UPDATE agentes_grupo_historial
          SET fecha_fin = CURRENT_TIMESTAMP, motivo_salida = $2, registrado_por = $3
        WHERE agente_operativo_id = $1 AND fecha_fin IS NULL`,
      [alta.id, MOTIVO, autorId]
    );
    await Evento.registrar(client, {
      operativoId: alta.operativoId, entidad: 'AGENTE', agenteOperativoId: alta.id, accion: 'baja',
      estadoAnterior: rows[0].estado, registradoPor: autorId, fuente: 'SISTEMA', motivo: MOTIVO,
    });
  }
  await Mando.cerrarPresenciaDeCon(client, usuarioId, autorId, MOTIVO);
  return altas.map(a => a.titulo);
}

/**
 * Personal actualmente en el operativo (CU-21). Excluye a quienes ya egresaron.
 * Es lo que consume la grilla del Coordinador, que refresca por polling.
 */
/**
 * Panel del operativo (11/11), «Evolución de despliegue»: TODAS las participaciones, también
 * las cerradas, con la institución de la foto legal (migración 034) o la del perfil si falta.
 */
export async function despliegueDeOperativo(operativoId) {
  const { rows } = await query(
    `SELECT ao.fecha_ingreso AS "fechaIngreso", ao.fecha_egreso AS "fechaEgreso",
            COALESCE(ao.institucion_nombre, i.nombre) AS "institucionNombre"
       FROM agentes_operativo ao
       JOIN usuarios u ON u.id = ao.usuario_id
       LEFT JOIN cat_instituciones i ON i.id = u.institucion_id
      WHERE ao.operativo_id = $1
      ORDER BY ao.fecha_ingreso`,
    [operativoId]
  );
  return rows;
}

export async function listarDeOperativo(operativoId) {
  const { rows } = await query(
    `SELECT ${CAMPOS},
            u.nombre, u.apellido, u.dni, u.telefono,
            u.grupo_sanguineo AS "grupoSanguineo",
            e.nombre AS "especialidadNombre",
            COALESCE(e.es_recurso_critico, false) AS "esRecursoCritico",
            i.nombre AS "institucionNombre",
            dd.nombre AS "dependenciaNombre",
            COALESCE(dd.es_duar, false) AS "esDuar"
       FROM agentes_operativo ao
       JOIN usuarios u ON u.id = ao.usuario_id
       LEFT JOIN cat_especialidades e ON e.id = ao.especialidad_id
       LEFT JOIN cat_instituciones  i ON i.id = u.institucion_id
       LEFT JOIN cat_dotaciones    dd ON dd.id = u.dotacion_id
      WHERE ao.operativo_id = $1 AND ao.fecha_egreso IS NULL
      ORDER BY ao.fecha_ingreso DESC`,
    [operativoId]
  );
  return rows;
}
