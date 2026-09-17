/**
 * MODELO · Objetivo Buscado
 *   · CU-12 Registrar · CU-13 Actualizar · CU-14 Consultar
 *
 * Una ficha por operativo (`objetivo_buscado.operativo_id` es UNIQUE). Toda
 * lectura pasa por `buscarPorOperativo` — nunca existe un `buscarPorId(id)`
 * suelto sin el filtro de operativo: es lo que garantiza en el código el
 * "Aislamiento de Información" que exige el CU-12 (la ficha no se puede ver
 * desde otro operativo).
 */
import { query, withTransaction } from '../config/db.js';

const CAMPOS = `
  ob.id,
  ob.operativo_id       AS "operativoId",
  ob.tipo::text         AS tipo,
  ob.nombre,
  ob.apellido,
  ob.dni,
  ob.nacionalidad,
  ob.edad,
  ob.estatura,
  ob.genero::text       AS genero,
  ob.complexion_fisica  AS "complexionFisica",
  ob.color_piel         AS "colorPiel",
  ob.color_ojos         AS "colorOjos",
  ob.color_pelo         AS "colorPelo",
  ob.vestimenta,
  ob.detalles_adicionales AS "detallesAdicionales",
  ob.tipo_objeto        AS "tipoObjeto",
  ob.color,
  ob.marca,
  ob.modelo,
  ob.dimension_alto     AS "dimensionAlto",
  ob.dimension_ancho    AS "dimensionAncho",
  ob.dimension_largo    AS "dimensionLargo",
  ob.creado_en          AS "creadoEn",
  ob.actualizado_en     AS "actualizadoEn",
  COALESCE(
    (SELECT json_agg(json_build_object('id', f.id, 'path', f.url_foto) ORDER BY f.creado_en)
       FROM fotos_objetivo f
      WHERE f.objetivo_id = ob.id AND f.eliminado_en IS NULL),
    '[]'::json
  ) AS fotos
`;

/** CU-14: único punto de lectura, siempre acotado al operativo. */
export async function buscarPorOperativo(operativoId) {
  const { rows } = await query(
    `SELECT ${CAMPOS} FROM objetivo_buscado ob WHERE ob.operativo_id = $1`,
    [operativoId]
  );
  return rows[0] ?? null;
}

/** CU-12 paso 7: INSERT vinculado al operativo_id. */
export async function crear(operativoId, campos) {
  const {
    tipo, nombre = null, apellido = null, dni = null, nacionalidad = null,
    edad = null, estatura = null, genero = null, complexionFisica = null,
    colorPiel = null, colorOjos = null, colorPelo = null, vestimenta = null,
    detallesAdicionales = null, tipoObjeto = null, color = null, marca = null,
    modelo = null, dimensionAlto = null, dimensionAncho = null, dimensionLargo = null,
  } = campos;

  await query(
    `INSERT INTO objetivo_buscado
       (operativo_id, tipo, nombre, apellido, dni, nacionalidad, edad, estatura,
        genero, complexion_fisica, color_piel, color_ojos, color_pelo, vestimenta,
        detalles_adicionales, tipo_objeto, color, marca, modelo,
        dimension_alto, dimension_ancho, dimension_largo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
    [operativoId, tipo, nombre, apellido, dni, nacionalidad, edad, estatura,
     genero, complexionFisica, colorPiel, colorOjos, colorPelo, vestimenta,
     detallesAdicionales, tipoObjeto, color, marca, modelo,
     dimensionAlto, dimensionAncho, dimensionLargo]
  );
  // operativo_id es UNIQUE: tras el INSERT hay exactamente una ficha para
  // este operativo, así que buscarPorOperativo ya la trae completa.
  return buscarPorOperativo(operativoId);
}

/** CU-13 · UPDATE parcial, mismo patrón `permitidos` que usuario.model.js. */
export async function actualizar(id, campos) {
  const permitidos = {
    tipo: 'tipo', nombre: 'nombre', apellido: 'apellido', dni: 'dni',
    nacionalidad: 'nacionalidad', edad: 'edad', estatura: 'estatura', genero: 'genero',
    complexionFisica: 'complexion_fisica', colorPiel: 'color_piel', colorOjos: 'color_ojos',
    colorPelo: 'color_pelo', vestimenta: 'vestimenta', detallesAdicionales: 'detalles_adicionales',
    tipoObjeto: 'tipo_objeto', color: 'color', marca: 'marca', modelo: 'modelo',
    dimensionAlto: 'dimension_alto', dimensionAncho: 'dimension_ancho', dimensionLargo: 'dimension_largo',
  };

  const sets = [];
  const valores = [];
  for (const [clave, columna] of Object.entries(permitidos)) {
    if (campos[clave] !== undefined) {
      valores.push(campos[clave]);
      const cast = clave === 'tipo' ? '::tipo_objetivo' : clave === 'genero' ? '::genero' : '';
      sets.push(`${columna} = $${valores.length}${cast}`);
    }
  }

  const { rows: previos } = await query(`SELECT operativo_id AS "operativoId" FROM objetivo_buscado WHERE id = $1`, [id]);
  const operativoId = previos[0]?.operativoId;
  if (!operativoId) return null;
  if (sets.length === 0) return buscarPorOperativo(operativoId);

  valores.push(id);
  await query(
    `UPDATE objetivo_buscado SET ${sets.join(', ')}, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $${valores.length}`,
    valores
  );
  return buscarPorOperativo(operativoId);
}

/** CU-12/13: agrega fotos ya subidas a Storage (aditivo, no reemplaza). */
export async function agregarFotos(objetivoId, paths) {
  if (!paths || paths.length === 0) return;
  const valores = paths.map((_, i) => `($1, $${i + 2})`).join(', ');
  await query(
    `INSERT INTO fotos_objetivo (objetivo_id, url_foto) VALUES ${valores}`,
    [objetivoId, ...paths]
  );
}

/**
 * Busca una foto ACOTADA al operativo (el JOIN por operativo_id es lo que
 * impide borrar una foto de la ficha de otro operativo, aunque alguien
 * adivine el fotoId — mismo criterio de aislamiento que buscarPorOperativo).
 */
export async function buscarFoto(operativoId, fotoId) {
  const { rows } = await query(
    `SELECT f.id, f.objetivo_id AS "objetivoId", f.url_foto AS path
       FROM fotos_objetivo f
       JOIN objetivo_buscado ob ON ob.id = f.objetivo_id
      WHERE ob.operativo_id = $1 AND f.id = $2 AND f.eliminado_en IS NULL`,
    [operativoId, fotoId]
  );
  return rows[0] ?? null;
}

/** Baja lógica de una foto — nunca se borra el objeto de Storage (valor forense). */
export async function eliminarFotoLogico(fotoId) {
  await query(
    `UPDATE fotos_objetivo SET eliminado_en = CURRENT_TIMESTAMP WHERE id = $1`,
    [fotoId]
  );
}
