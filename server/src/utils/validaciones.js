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
export const EDAD_MINIMA = 16;
export const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const EMAIL_MAX = 150;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
/** Nacidos antes de esto es un error de tipeo (un año con ceros), no una persona (Testeo 13/10, punto 10). */
export const ANIO_NACIMIENTO_MIN = 1900;

/**
 * Contraseña (Testeo 13/10, punto 2): de 8 a 64 caracteres, con al menos una
 * letra, un número y un carácter especial (cualquier cosa que no sea letra,
 * número ni espacio). Sólo se exige al elegir una contraseña nueva: el login
 * no la revisa, así las cuentas que ya existen siguen entrando.
 */
export function validarPassword(valor) {
  const v = String(valor ?? '');
  if (v.length < PASSWORD_MIN || v.length > PASSWORD_MAX
      || !/\p{L}/u.test(v) || !/\p{N}/u.test(v) || !/[^\p{L}\p{N}\s]/u.test(v)) {
    return `La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres, con al menos una letra, un número y un carácter especial (por ejemplo ! ? # $ % . -).`;
  }
  return null;
}

/**
 * Limpia lo que se escribe a mano (Testeo 13/10, punto 14): sin espacios al
 * principio ni al final, y en nombre y apellido un solo espacio entre
 * palabras. Devuelve una copia; los campos ausentes siguen ausentes.
 */
export function normalizarDatosPersonales(datos = {}) {
  const limpio = { ...datos };
  for (const clave of ['nombre', 'apellido']) {
    if (typeof limpio[clave] === 'string') limpio[clave] = limpio[clave].trim().replace(/\s+/g, ' ');
  }
  for (const clave of ['email', 'dni', 'telefono']) {
    if (typeof limpio[clave] === 'string') limpio[clave] = limpio[clave].trim();
  }
  return limpio;
}

/** Años cumplidos a día de hoy, dada una fecha de nacimiento ISO (YYYY-MM-DD). */
function edadDesde(fechaIso) {
  // Al mediodía local: «YYYY-MM-DD» solo se lee como UTC y en Argentina caería el día anterior.
  const nacimiento = new Date(`${String(fechaIso).slice(0, 10)}T12:00:00`);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumplio =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumplio) edad--;
  return edad;
}

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

  if (datos.email !== undefined) {
    const v = String(datos.email).trim();
    if (v.length > EMAIL_MAX) errores.email = `El correo puede tener hasta ${EMAIL_MAX} caracteres.`;
    else if (!RE_EMAIL.test(v)) errores.email = 'Ingresá un correo válido (ej: nombre@dominio.com).';
  }

  // Vacía = "no cambiar" en la edición de usuarios (CU-06): sólo se valida si viene algo.
  if (datos.password !== undefined && datos.password !== null && datos.password !== '') {
    const error = validarPassword(datos.password);
    if (error) errores.password = error;
  }

  if (datos.fechaNacimiento !== undefined && datos.fechaNacimiento !== null && datos.fechaNacimiento !== '') {
    const texto = String(datos.fechaNacimiento).slice(0, 10);
    const fecha = new Date(`${texto}T12:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || Number.isNaN(fecha.getTime())
        || Number(texto.slice(0, 4)) < ANIO_NACIMIENTO_MIN) {
      errores.fechaNacimiento = 'Fecha de nacimiento inválida.';
    } else if (edadDesde(texto) < EDAD_MINIMA) {
      errores.fechaNacimiento = `El agente debe tener al menos ${EDAD_MINIMA} años.`;
    }
  }

  return errores;
}

/* ── Operativos (CU-08 / CU-09 / CU-10) ─────────────────────────────────── */

export const RE_FISCAL = /^[A-Za-zÀ-ÖØ-öø-ÿ.'\- ]{2,100}$/;
export const TITULO_MAX = 150;      // operativos.titulo es varchar(255); 150 alcanza para una carátula
export const LOCALIDAD_MAX = 200;   // operativos.localidad es varchar(200)
export const DESCRIPCION_MAX = 2000;
export const NOTA_FINAL_MAX = 1000;

/**
 * Igual criterio que validarDatosPersonales: sólo valida los campos presentes
 * (undefined = "no se está tocando"). Devuelve `{ campo: mensaje }`.
 */
export function validarDatosOperativo(datos) {
  const errores = {};

  if (datos.titulo !== undefined) {
    const v = String(datos.titulo).trim();
    if (v.length < 3) errores.titulo = 'El título debe tener al menos 3 caracteres.';
    else if (v.length > TITULO_MAX) errores.titulo = `El título puede tener hasta ${TITULO_MAX} caracteres.`;
  }

  if (datos.localidad !== undefined) {
    const v = String(datos.localidad).trim();
    if (v.length < 2) errores.localidad = 'Indicá la localidad.';
    else if (v.length > LOCALIDAD_MAX) errores.localidad = `La localidad puede tener hasta ${LOCALIDAD_MAX} caracteres.`;
  }

  if (datos.fiscalInstruccion !== undefined) {
    if (!RE_FISCAL.test(String(datos.fiscalInstruccion).trim())) {
      errores.fiscalInstruccion = 'El fiscal debe tener entre 2 y 100 letras (se permiten puntos, guiones y apóstrofes).';
    }
  }

  if (typeof datos.descripcion === 'string' && datos.descripcion.length > DESCRIPCION_MAX) {
    errores.descripcion = `La descripción puede tener hasta ${DESCRIPCION_MAX} caracteres.`;
  }

  if (typeof datos.notaFinal === 'string' && datos.notaFinal.length > NOTA_FINAL_MAX) {
    errores.notaFinal = `La reseña puede tener hasta ${NOTA_FINAL_MAX} caracteres.`;
  }

  return errores;
}
