/**
 * CONTROLADOR · Catálogos
 * Se sirven todos juntos: el frontend los necesita al arrancar y así evita
 * cinco requests separadas.
 */
import * as Catalogo from '../models/catalogo.model.js';

export async function todos(req, res, next) {
  try {
    const [roles, instituciones, dependencias, especialidades, alergias] = await Promise.all([
      Catalogo.roles(),
      Catalogo.instituciones(),
      Catalogo.dependencias(),
      Catalogo.especialidades(),
      Catalogo.alergias(),
    ]);
    // `dotaciones`: alias TRANSITORIO (17/11, migración 038) para las pantallas viejas que todavía lo leen.
    res.json({ roles, instituciones, dependencias, dotaciones: dependencias, especialidades, alergias });
  } catch (err) {
    next(err);
  }
}
