/**
 * MODELO · Usuario
 *
 * Sólo acceso a datos: nada de reglas de negocio ni de HTTP. Devuelve filas ya
 * mapeadas a camelCase, que es lo que consume el frontend.
 *
 * Decisión A (Dualidad): esta tabla es el registro ADMINISTRATIVO global. Lo
 * táctico (estado en el operativo, caminante, conductor) vive en agentes_operativo.
 */
import { query, withTransaction } from '../config/db.js';

/**
 * Columnas expuestas hacia afuera. `password_hash` NUNCA se selecciona acá.
 *
 * `alergias` es una relación N:M real (usuarios_alergias ↔ cat_alergias, un
 * usuario puede tener más de una). Se trae con una subconsulta agregada en vez
 * de un JOIN + GROUP BY: así cada fila de usuario sigue siendo una fila, sin
 * duplicarse por cada alergia, y sin necesidad de una query aparte por usuario.
 *
 * Se exporta junto con JOINS para que `sesion.model.js` arme el usuario completo
 * en la MISMA consulta que valida el token. Con la base en la nube cada ida y
 * vuelta cuesta decenas de milisegundos, así que ahorrar una por request importa;
 * y duplicar esta lista de columnas allá sería garantía de que se desincronicen.
 */
export const CAMPOS = `
  u.id,
  u.dni,
  u.nombre,
  u.apellido,
  u.email,
  u.telefono,
  u.genero,
  u.fecha_nacimiento   AS "fechaNacimiento",
  u.rol_id             AS "rolId",
  r.nombre             AS "rol",
  u.institucion_id     AS "institucionId",
  i.nombre             AS "institucionNombre",
  i.es_duar            AS "esDuar",
  u.dotacion_id        AS "dotacionId",
  d.nombre             AS "dotacionNombre",
  u.especialidad_id    AS "especialidadId",
  e.nombre             AS "especialidadNombre",
  u.grupo_sanguineo    AS "grupoSanguineo",
  u.estado,
  u.email_confirmado   AS "emailConfirmado",
  u.creado_en          AS "creadoEn",
  COALESCE(
    (SELECT json_agg(json_build_object('id', ca.id, 'nombre', ca.nombre) ORDER BY ca.nombre)
       FROM usuarios_alergias ua
       JOIN cat_alergias ca ON ca.id = ua.alergia_id
      WHERE ua.usuario_id = u.id),
    '[]'::json
  ) AS alergias
`;

export const JOINS = `
  FROM usuarios u
  JOIN      cat_roles          r ON r.id = u.rol_id
  LEFT JOIN cat_instituciones  i ON i.id = u.institucion_id
  LEFT JOIN cat_dotaciones     d ON d.id = u.dotacion_id
  LEFT JOIN cat_especialidades e ON e.id = u.especialidad_id
`;

/**
 * Reemplaza el conjunto de alergias de un usuario por el que llega en
 * `alergiaIds` (borra todo y vuelve a insertar). Recibe el `client` de una
 * transacción en curso: nunca se usa el pool directo acá, para que el DELETE
 * y los INSERT sean atómicos junto con el resto del alta/edición.
 */
async function sincronizarAlergias(client, usuarioId, alergiaIds) {
  await client.query(`DELETE FROM usuarios_alergias WHERE usuario_id = $1`, [usuarioId]);
  if (!alergiaIds || alergiaIds.length === 0) return;

  const valores = alergiaIds.map((_, i) => `($1, $${i + 2})`).join(', ');
  await client.query(
    `INSERT INTO usuarios_alergias (usuario_id, alergia_id) VALUES ${valores}`,
    [usuarioId, ...alergiaIds]
  );
}

/** Lista usuarios visibles. El borrado es lógico: ELIMINADO no se muestra nunca. */
export async function listar({ incluirEliminados = false } = {}) {
  const filtro = incluirEliminados ? '' : `WHERE u.estado <> 'ELIMINADO'`;
  const { rows } = await query(`SELECT ${CAMPOS} ${JOINS} ${filtro} ORDER BY u.apellido, u.nombre`);
  return rows;
}

export async function buscarPorId(id) {
  const { rows } = await query(`SELECT ${CAMPOS} ${JOINS} WHERE u.id = $1`, [id]);
  return rows[0] ?? null;
}

/**
 * Trae al usuario CON su hash, para verificar la contraseña en el login (CU-01).
 * Es la única función que expone `passwordHash`; se usa sólo desde el controlador
 * de autenticación y el valor nunca sale en una respuesta HTTP.
 */
export async function buscarPorEmailConHash(email) {
  const { rows } = await query(
    `SELECT ${CAMPOS}, u.password_hash AS "passwordHash" ${JOINS} WHERE lower(u.email) = lower($1)`,
    [email]
  );
  return rows[0] ?? null;
}

export async function existeDniOEmail(dni, email) {
  const { rows } = await query(
    `SELECT dni, email FROM usuarios WHERE dni = $1 OR lower(email) = lower($2)`,
    [dni, email]
  );
  return {
    dni:   rows.some(r => r.dni === dni),
    email: rows.some(r => r.email.toLowerCase() === email.toLowerCase()),
  };
}

export async function crear({
  dni, nombre, apellido, email, passwordHash, rolId,
  telefono = null, fechaNacimiento = null, genero = null,
  institucionId = null, dotacionId = null, especialidadId = null,
  grupoSanguineo = null, alergiaIds = [],
}) {
  // El alta y la carga de alergias son UNA operación: si algo falla a mitad
  // de camino (ej. un alergiaId inexistente viola la FK), no debe quedar un
  // usuario creado sin sus alergias — o peor, ninguno de los dos.
  const id = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO usuarios
         (dni, nombre, apellido, email, password_hash, rol_id, telefono,
          fecha_nacimiento, genero, institucion_id, dotacion_id, especialidad_id, grupo_sanguineo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, COALESCE($13,'DESCONOCIDO')::tipo_sangre)
       RETURNING id`,
      [dni, nombre, apellido, email, passwordHash, rolId, telefono,
       fechaNacimiento, genero, institucionId, dotacionId, especialidadId, grupoSanguineo]
    );
    const nuevoId = rows[0].id;
    await sincronizarAlergias(client, nuevoId, alergiaIds);
    return nuevoId;
  });
  // Recién ACÁ, después del COMMIT: buscarPorId usa el pool (otra conexión),
  // que no vería filas todavía no confirmadas si se llamara dentro de la transacción.
  return buscarPorId(id);
}

export async function actualizar(id, campos) {
  // alergiaIds se maneja aparte: no es una columna de `usuarios`, es la
  // relación N:M. `undefined` = "no tocar alergias"; `[]` = "vaciarlas
  // deliberadamente" (el usuario destildó todo en el formulario).
  const { alergiaIds, ...camposEscalares } = campos;

  // Mapeo explícito: evita que un campo inesperado del body llegue al SQL.
  const permitidos = {
    dni: 'dni', nombre: 'nombre', apellido: 'apellido', email: 'email', telefono: 'telefono',
    fechaNacimiento: 'fecha_nacimiento', genero: 'genero', rolId: 'rol_id',
    institucionId: 'institucion_id', dotacionId: 'dotacion_id',
    especialidadId: 'especialidad_id', grupoSanguineo: 'grupo_sanguineo',
    estado: 'estado',
  };

  const sets = [];
  const valores = [];
  for (const [clave, columna] of Object.entries(permitidos)) {
    if (camposEscalares[clave] !== undefined) {
      valores.push(camposEscalares[clave]);
      sets.push(`${columna} = $${valores.length}`);
    }
  }

  if (sets.length === 0 && alergiaIds === undefined) return buscarPorId(id);

  await withTransaction(async (client) => {
    if (sets.length > 0) {
      const setsConFecha = [...sets, `actualizado_en = CURRENT_TIMESTAMP`];
      await client.query(
        `UPDATE usuarios SET ${setsConFecha.join(', ')} WHERE id = $${valores.length + 1}`,
        [...valores, id]
      );
    }
    if (alergiaIds !== undefined) {
      await sincronizarAlergias(client, id, alergiaIds);
    }
  });
  return buscarPorId(id);
}

/**
 * Borrado LÓGICO puro (Decisión A). Nunca se hace DELETE: el historial operativo
 * del usuario debe permanecer disponible para los informes.
 */
export async function eliminarLogico(id) {
  await query(
    `UPDATE usuarios
        SET estado = 'ELIMINADO', eliminado_en = CURRENT_TIMESTAMP, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $1`,
    [id]
  );
}
