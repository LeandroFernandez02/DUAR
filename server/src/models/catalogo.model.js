/**
 * MODELO · Catálogos
 *
 * Estos datos hoy están hardcodeados en `mockData.ts` (catInstituciones,
 * catDotaciones, catEspecialidades) con los UUID reales de la base. Este modelo
 * es su reemplazo: el frontend pasa a leerlos de acá y deja de duplicarlos.
 */
import { query } from '../config/db.js';

export async function roles() {
  const { rows } = await query(`SELECT id, nombre FROM cat_roles ORDER BY nombre`);
  return rows;
}

export async function instituciones() {
  const { rows } = await query(
    `SELECT id, nombre, es_duar AS "esDuar" FROM cat_instituciones ORDER BY es_duar DESC, nombre`
  );
  return rows;
}

export async function dotaciones() {
  const { rows } = await query(
    `SELECT id, nombre, institucion_id AS "institucionId" FROM cat_dotaciones ORDER BY nombre`
  );
  return rows;
}

export async function especialidades() {
  const { rows } = await query(
    `SELECT id, nombre, es_recurso_critico AS "esRecursoCritico"
       FROM cat_especialidades ORDER BY nombre`
  );
  return rows;
}

export async function alergias() {
  const { rows } = await query(`SELECT id, nombre FROM cat_alergias ORDER BY nombre`);
  return rows;
}
