/**
 * MODELO · Marcadores del mapa (Módulo 5)
 *   · CU-32 Marcar Punto de Interés, Hallazgo o Instalación SCI
 *   · CU-33 Modificar (las instalaciones, además, se reubican)
 *   · CU-36 Eliminar (baja con registro; un hallazgo NO se elimina)
 *
 * Un hallazgo es evidencia del caso: queda con hora y autor, no se elimina, no
 * pasa a ser otra clase de marcador y sus fotos no se quitan. La base lo
 * garantiza también (CHECK hallazgo_no_se_elimina y trigger marcador_hallazgo_fijo).
 */
import { query, withTransaction } from '../config/db.js';
import { ReglaError } from './reglaError.js';
import * as Storage from '../services/storage.service.js';

export const CLASES = ['POI', 'HALLAZGO', 'INSTALACION'];

/** Los tipos de instalación del Sistema de Comando de Incidentes, con el nombre que se propone. */
export const TIPOS_INSTALACION = {
  PUESTO_COMANDO: 'Puesto de Comando',
  BASE: 'Base',
  CAMPAMENTO: 'Campamento',
  HELIPUNTO: 'Helipunto',
  AREA_ESPERA: 'Área de Espera',
  AREA_CONCENTRACION_VICTIMAS: 'Área de Concentración de Víctimas',
};

export const FOTOS_MAX = 8;

const CAMPOS = `
  m.id,
  m.operativo_id        AS "operativoId",
  m.clase,
  m.tipo_instalacion    AS "tipoInstalacion",
  m.nombre, m.descripcion, m.detalle, m.responsable, m.notas,
  ST_Y(m.geom)          AS lat,
  ST_X(m.geom)          AS lng,
  u.nombre || ' ' || u.apellido AS "creadoPor",
  m.creado_en           AS "creadoEn",
  m.actualizado_en      AS "actualizadoEn",
  COALESCE((SELECT json_agg(json_build_object('id', f.id, 'path', f.url_foto) ORDER BY f.creado_en)
              FROM marcador_fotos f WHERE f.marcador_id = m.id AND f.eliminado_en IS NULL), '[]'::json) AS fotos
`;

const DESDE = `FROM marcadores m LEFT JOIN usuarios u ON u.id = m.creado_por`;

/** Las fotos salen con URL firmada (bucket privado), nunca con la ruta. */
async function conUrls(m) {
  if (!m) return null;
  const fotos = await Promise.all(m.fotos.map(async f => ({ id: f.id, url: await Storage.generarUrlFirmada(f.path) })));
  return { ...m, fotos };
}

/** Marcadores vigentes del operativo (CU-31: se dibujan con su símbolo). */
export async function listar(operativoId) {
  const { rows } = await query(
    `SELECT ${CAMPOS} ${DESDE} WHERE m.operativo_id = $1 AND m.eliminado_en IS NULL ORDER BY m.creado_en`,
    [operativoId]
  );
  return Promise.all(rows.map(conUrls));
}

export async function detalle(operativoId, marcadorId) {
  const { rows } = await query(
    `SELECT ${CAMPOS} ${DESDE} WHERE m.id = $1 AND m.operativo_id = $2 AND m.eliminado_en IS NULL`,
    [marcadorId, operativoId]
  );
  return conUrls(rows[0]);
}

async function bloquear(client, operativoId, marcadorId) {
  const { rows } = await client.query(
    `SELECT id, clase, tipo_instalacion AS "tipoInstalacion", nombre, descripcion, detalle, responsable, notas,
            ST_Y(geom) AS lat, ST_X(geom) AS lng
       FROM marcadores WHERE id = $1 AND operativo_id = $2 AND eliminado_en IS NULL FOR UPDATE`,
    [marcadorId, operativoId]
  );
  if (!rows[0]) throw new ReglaError(404, 'marcador_no_encontrado', 'El marcador no existe en este operativo.');
  return rows[0];
}

/** CU-32: `datos` ya validado por el controlador (campos según la clase). */
export async function crear(operativoId, datos, usuarioId) {
  const nombre = datos.nombre ?? (datos.clase === 'INSTALACION' ? TIPOS_INSTALACION[datos.tipoInstalacion] : null);
  const { rows } = await query(
    `INSERT INTO marcadores (operativo_id, clase, tipo_instalacion, nombre, descripcion, detalle, responsable, notas, geom, creado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($9, $10), 4326), $11)
     RETURNING id`,
    [operativoId, datos.clase, datos.tipoInstalacion ?? null, nombre, datos.descripcion ?? null, datos.detalle ?? null,
     datos.responsable ?? null, datos.notas ?? null, datos.lng, datos.lat, usuarioId]
  );
  return detalle(operativoId, rows[0].id);
}

const EDITABLES = {
  nombre: 'nombre', descripcion: 'descripcion', detalle: 'detalle', responsable: 'responsable',
  notas: 'notas', tipoInstalacion: 'tipo_instalacion', clase: 'clase',
};

/**
 * CU-33: corrige datos y, si es una instalación, la reubica (lat/lng).
 * Reglas: un hallazgo no cambia de clase; un punto de interés puede pasar a
 * hallazgo (resultó ser evidencia); una instalación sigue siendo instalación;
 * los puntos de interés y los hallazgos quedan donde se marcaron.
 */
export async function actualizar(operativoId, marcadorId, cambios) {
  return withTransaction(async (client) => {
    const previo = await bloquear(client, operativoId, marcadorId);

    if (cambios.clase !== undefined && cambios.clase !== previo.clase) {
      if (previo.clase === 'HALLAZGO') {
        throw new ReglaError(409, 'hallazgo_fijo', 'Un hallazgo es evidencia: no puede pasar a ser otra clase de marcador.');
      }
      if (!(previo.clase === 'POI' && cambios.clase === 'HALLAZGO')) {
        throw new ReglaError(409, 'clase_no_cambia', 'Una instalación no pasa a ser punto de interés ni hallazgo (ni al revés): eliminala y marcá la nueva.');
      }
    }
    const clase = cambios.clase ?? previo.clase;
    if (clase !== 'INSTALACION' && (cambios.tipoInstalacion !== undefined || cambios.responsable !== undefined)) {
      throw new ReglaError(400, 'campo_no_corresponde', 'El tipo y el responsable son datos de una instalación.');
    }
    if (clase === 'INSTALACION' && (cambios.descripcion !== undefined || cambios.detalle !== undefined)) {
      throw new ReglaError(400, 'campo_no_corresponde', 'Una instalación lleva responsable y notas, no descripción ni detalle.');
    }
    const reubica = cambios.lat !== undefined && (cambios.lat !== previo.lat || cambios.lng !== previo.lng);
    if (reubica && previo.clase !== 'INSTALACION') {
      throw new ReglaError(409, 'no_se_reubica',
        'Sólo las instalaciones se reubican. Si un punto de interés quedó mal marcado, eliminalo y marcalo de nuevo; un hallazgo queda donde se encontró.');
    }

    const sets = [];
    const valores = [];
    for (const [clave, columna] of Object.entries(EDITABLES)) {
      if (cambios[clave] !== undefined && (cambios[clave] ?? null) !== (previo[clave] ?? null)) {
        valores.push(cambios[clave]);
        sets.push(`${columna} = $${valores.length}`);
      }
    }
    if (reubica) {
      valores.push(cambios.lng, cambios.lat);
      sets.push(`geom = ST_SetSRID(ST_MakePoint($${valores.length - 1}, $${valores.length}), 4326)`);
    }
    if (!sets.length) throw new ReglaError(400, 'sin_cambios', 'No hay nada para cambiar.');

    valores.push(marcadorId);
    await client.query(
      `UPDATE marcadores SET ${sets.join(', ')}, actualizado_en = CURRENT_TIMESTAMP WHERE id = $${valores.length}`,
      valores
    );
    return previo;
  });
}

/** CU-36: baja con registro. Un hallazgo no se elimina. */
export async function eliminar(operativoId, marcadorId, usuarioId) {
  return withTransaction(async (client) => {
    const previo = await bloquear(client, operativoId, marcadorId);
    if (previo.clase === 'HALLAZGO') {
      throw new ReglaError(409, 'hallazgo_no_se_elimina', 'Un hallazgo es evidencia: no se elimina, sólo se corrigen sus datos.');
    }
    await client.query(
      `UPDATE marcadores SET eliminado_en = CURRENT_TIMESTAMP, eliminado_por = $2 WHERE id = $1`,
      [marcadorId, usuarioId]
    );
    return previo;
  });
}

/** Fotos de un punto de interés o un hallazgo (CU-32/33): cuántas puede sumar todavía. */
export async function lugarParaFotos(operativoId, marcadorId) {
  const { rows: [m] } = await query(
    `SELECT m.clase, (SELECT count(*)::int FROM marcador_fotos f WHERE f.marcador_id = m.id AND f.eliminado_en IS NULL) AS n
       FROM marcadores m WHERE m.id = $1 AND m.operativo_id = $2 AND m.eliminado_en IS NULL`,
    [marcadorId, operativoId]
  );
  if (!m) throw new ReglaError(404, 'marcador_no_encontrado', 'El marcador no existe en este operativo.');
  if (m.clase === 'INSTALACION') throw new ReglaError(409, 'sin_fotos', 'Las instalaciones no llevan fotos.');
  return FOTOS_MAX - m.n;
}

export async function agregarFotos(marcadorId, paths, usuarioId) {
  await query(
    `INSERT INTO marcador_fotos (marcador_id, url_foto, subido_por)
     SELECT $1, p, $3 FROM unnest($2::text[]) AS p`,
    [marcadorId, paths, usuarioId]
  );
}

/** Se quita una foto de un punto de interés; las de un hallazgo son evidencia. */
export async function eliminarFoto(operativoId, marcadorId, fotoId) {
  const { rows: [f] } = await query(
    `SELECT m.clase FROM marcador_fotos f JOIN marcadores m ON m.id = f.marcador_id
      WHERE f.id = $1 AND m.id = $2 AND m.operativo_id = $3 AND f.eliminado_en IS NULL AND m.eliminado_en IS NULL`,
    [fotoId, marcadorId, operativoId]
  );
  if (!f) throw new ReglaError(404, 'foto_no_encontrada', 'La foto no existe en este marcador.');
  if (f.clase === 'HALLAZGO') throw new ReglaError(409, 'foto_de_hallazgo', 'Las fotos de un hallazgo son evidencia: no se quitan.');
  await query(`UPDATE marcador_fotos SET eliminado_en = CURRENT_TIMESTAMP WHERE id = $1`, [fotoId]);
}
