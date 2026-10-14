/**
 * validacionUsuario.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Reglas de validación y formateo de los datos personales, compartidas por
 * los tres formularios que los cargan: registro por QR (Registro.tsx), el
 * modal de Usuarios (admin/coordinador) y la autoedición del agente
 * (AgenteDashboard.tsx). Espejo de `server/src/utils/validaciones.js` — el
 * backend es la última palabra, esto es sólo para guiar al usuario ANTES de
 * mandar el request.
 */

export const RE_NOMBRE = /^[A-Za-zÀ-ÖØ-öø-ÿ ]{2,35}$/;
export const RE_APELLIDO = /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]{2,35}$/;
export const RE_DNI = /^\d{7,8}$/;
export const RE_TELEFONO = /^\d{10}$/;
export const EDAD_MINIMA = 16;
export const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const EMAIL_MAX = 150;      // usuarios.email es varchar(150)
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;    // bcrypt sólo usa los primeros 72 bytes: más largo no suma seguridad
/** Nacidos antes de esto es un año mal tipeado, no una persona (Testeo 13/10, punto 10). */
export const FECHA_NACIMIENTO_MIN = '1900-01-01';

/** Leyendas que acompañan a los campos (Testeo 13/10, puntos 1 y 2). */
export const AYUDA_PASSWORD = 'Entre 8 y 64 caracteres, con al menos una letra, un número y un carácter especial (por ejemplo ! ? # $ % . -).';
export const AYUDA_TELEFONO = '10 números: el código de área sin el 0 y el número sin el 15.';
export const PLACEHOLDER_TELEFONO = 'Ej: 351-228-3143';

export function validarNombre(v: string): string | null {
  const t = v.trim();
  if (!RE_NOMBRE.test(t)) return 'Entre 2 y 35 letras, sin números ni símbolos.';
  if (t.split(/\s+/).length > 3) return 'Máximo 3 nombres.';
  return null;
}

export function validarApellido(v: string): string | null {
  if (!RE_APELLIDO.test(v.trim())) return 'Entre 2 y 35 letras (espacios, guiones y apóstrofes permitidos).';
  return null;
}

export function validarDni(v: string): string | null {
  if (!RE_DNI.test(soloDigitos(v))) return 'El DNI debe tener 7 u 8 números.';
  return null;
}

/** El teléfono es opcional: sólo se valida si el usuario cargó algo. */
export function validarTelefono(v: string): string | null {
  if (!v) return null;
  if (!RE_TELEFONO.test(soloDigitos(v))) return '10 números: código de área sin 0 + número sin 15 (ej: 3512283143).';
  return null;
}

export function validarEmail(v: string): string | null {
  const t = v.trim();
  if (t.length > EMAIL_MAX) return `El correo puede tener hasta ${EMAIL_MAX} caracteres.`;
  if (!RE_EMAIL.test(t)) return 'Ingresá un correo válido (ej: nombre@dominio.com).';
  return null;
}

/** Misma regla que `validarPassword` del backend: largo, una letra, un número y un carácter especial. */
export function validarPassword(v: string): string | null {
  if (v.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (v.length > PASSWORD_MAX) return `La contraseña puede tener hasta ${PASSWORD_MAX} caracteres.`;
  if (!/\p{L}/u.test(v)) return 'La contraseña tiene que tener al menos una letra.';
  if (!/\p{N}/u.test(v)) return 'La contraseña tiene que tener al menos un número.';
  if (!/[^\p{L}\p{N}\s]/u.test(v)) return 'La contraseña tiene que tener al menos un carácter especial (por ejemplo ! ? # $ % . -).';
  return null;
}

/** Sin espacios al principio ni al final y uno solo entre palabras (Testeo 13/10, punto 14). Para el `onBlur` y antes de guardar. */
export function limpiarTexto(v: string): string {
  return v.trim().replace(/\s+/g, ' ');
}

/** Sin espacios (ni pegados) y con el tope de la columna — para el `onChange` de campos de correo. */
export function filtrarEmail(v: string): string {
  return v.replace(/\s/g, '').slice(0, EMAIL_MAX);
}

/** La fecha de nacimiento es opcional: sólo se valida si el usuario cargó algo. */
export function validarFechaNacimiento(v: string): string | null {
  if (!v) return null;
  // Al mediodía local: «YYYY-MM-DD» solo se lee como UTC y en Argentina caería el día anterior.
  const nacimiento = new Date(`${v.slice(0, 10)}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.slice(0, 10)) || Number.isNaN(nacimiento.getTime()) || v.slice(0, 10) < FECHA_NACIMIENTO_MIN) {
    return 'Fecha inválida.';
  }
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  if (
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())
  ) edad--;
  if (edad < EDAD_MINIMA) return `El agente debe tener al menos ${EDAD_MINIMA} años.`;
  return null;
}

/** Fecha máxima seleccionable en un input de nacimiento (hoy menos EDAD_MINIMA años), para el atributo `max`. */
export function fechaMaximaNacimiento(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - EDAD_MINIMA);
  return d.toISOString().slice(0, 10);
}

/** Saca todo lo que no sea dígito — es lo que efectivamente se guarda/envía. */
export function soloDigitos(v: string): string {
  return v.replace(/\D/g, '');
}

/**
 * Formatea un DNI para mostrarlo (45080924 → "45.080.924"). Puramente
 * visual: lo que viaja al backend siempre es `soloDigitos()`.
 */
export function formatearDni(v: string | null | undefined): string {
  const d = soloDigitos(v ?? '');
  if (!d) return '';
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Formatea un teléfono celular para mostrarlo (3512283143 → "351-228-3143").
 * Asume código de área de 3 dígitos (el caso de Córdoba capital e interior
 * que maneja el sistema); si algún día hace falta un área de 2 o 4 dígitos,
 * este es el único lugar a tocar.
 */
export function formatearTelefono(v: string | null | undefined): string {
  const d = soloDigitos(v ?? '');
  if (d.length !== 10) return d;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}
