/**
 * Una regla de negocio rechazada. Lleva el status HTTP y un `motivo` estable
 * que el frontend usa para decidir qué mostrar; app.js lo convierte en respuesta.
 *
 * Vive en su propio archivo para que cualquier modelo lo use sin importar otro
 * modelo entero (antes estaba en grupo.model.js, que lo sigue re-exportando).
 */
export class ReglaError extends Error {
  constructor(status, motivo, mensaje, datos = {}) {
    super(mensaje);
    this.status = status;
    this.motivo = motivo;
    this.datos = datos;
  }
}
