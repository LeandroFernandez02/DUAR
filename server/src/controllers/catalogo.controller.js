/**
 * CONTROLADOR · Catálogos
 * Se sirven todos juntos: el frontend los necesita al arrancar y así evita
 * cinco requests separadas.
 */
import * as Catalogo from '../models/catalogo.model.js';

export async function todos(req, res, next) {
  try {
    const [roles, instituciones, dotaciones, especialidades, alergias] = await Promise.all([
      Catalogo.roles(),
      Catalogo.instituciones(),
      Catalogo.dotaciones(),
      Catalogo.especialidades(),
      Catalogo.alergias(),
    ]);
    res.json({ roles, instituciones, dotaciones, especialidades, alergias });
  } catch (err) {
    next(err);
  }
}
