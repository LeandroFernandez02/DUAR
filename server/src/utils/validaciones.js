/**
 * UTILIDADES · Validación de datos personales
 *
 * Reglas de negocio compartidas por los tres puntos donde se cargan estos
 * campos: registro por QR (CU-02), alta/edición desde el panel de Usuarios
 * (CU-05/06), y la autoedición del agente. Centralizarlas acá evita que las
 * tres rutas terminen validando distinto.
 */

export const RE_NOMBRE = /^[A-Za-zÀ-ÖØ-öø-ÿ ]{2,35}$/;
export const RE_APELLIDO = /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]{2,35}$/;
export const RE_DNI = /^\d{7,8}$/;
export const RE_TELEFONO = /^\d{10}$/;

/**
 * Valida sólo los campos presentes en `datos` (undefined = "no se está
 * tocando ese campo", distinto de "" que sí se valida y falla). Devuelve un
 * objeto `{ campo: mensaje }` — vacío si todo está bien.
 */
export function validarDatosPersonales(datos) {
  const errores = {};

  if (datos.nombre !== undefined) {
    const v = String(datos.nombre).trim();
    if (!RE_NOMBRE.test(v)) {
      errores.nombre = 'El nombre debe tener entre 2 y 35 letras, sin números ni símbolos.';
    } else if (v.split(/\s+/).length > 3) {
      errores.nombre = 'Máximo 3 nombres.';
    }
  }

  if (datos.apellido !== undefined) {
    const v = String(datos.apellido).trim();
    if (!RE_APELLIDO.test(v)) {
      errores.apellido = 'El apellido debe tener entre 2 y 35 letras (se permiten espacios, guiones y apóstrofes).';
    }
  }

  if (datos.dni !== undefined) {
    if (!RE_DNI.test(String(datos.dni))) {
      errores.dni = 'El DNI debe tener 7 u 8 números, sin puntos ni espacios.';
    }
  }

  if (datos.telefono !== undefined && datos.telefono !== null && datos.telefono !== '') {
    if (!RE_TELEFONO.test(String(datos.telefono))) {
      errores.telefono = 'El teléfono debe tener 10 números: código de área sin 0 + número sin 15 (ej: 3512283143).';
    }
  }

  return errores;
}
