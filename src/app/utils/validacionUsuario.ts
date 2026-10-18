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
/**
 * Correo con forma de correo (Testeo 15/10, punto 23): parte local de letras, números y . _ % + -,
 * dominio con etiquetas válidas y una terminación de sólo letras (no «.45» ni «.9a»).
 * El servidor además comprueba que el dominio exista.
 */
export const RE_EMAIL = /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;
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
  if (!RE_EMAIL.test(t) || t.includes('..')) return 'Ingresá un correo válido (ej: nombre@dominio.com).';
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

const RE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fecha de nacimiento (Testeo 15/10, puntos 15, 24, 27 y 28). El valor del formulario es
 * «AAAA-MM-DD» cuando la fecha está completa y existe; si no, son los dígitos que se llevan
 * escritos, para que el campo los siga mostrando y esta validación diga qué falta.
 * Es obligatoria al crear una cuenta; al modificar una que nunca la tuvo, no.
 */
export function validarFechaNacimiento(v: string, obligatoria = false): string | null {
  if (!v) return obligatoria ? 'Ingresá la fecha de nacimiento.' : null;
  const iso = v.slice(0, 10);
  if (!RE_ISO.test(iso)) {
    return soloDigitos(v).length === 8
      ? 'Esa fecha no existe: revisá el día y el mes.'
      : 'Escribí la fecha completa: día, mes y año (DD/MM/AAAA).';
  }
  // Al mediodía local: «YYYY-MM-DD» solo se lee como UTC y en Argentina caería el día anterior.
  const nacimiento = new Date(`${iso}T12:00:00`);
  const existe = !Number.isNaN(nacimiento.getTime())
    && nacimiento.getMonth() + 1 === Number(iso.slice(5, 7)) && nacimiento.getDate() === Number(iso.slice(8, 10));
  if (!existe) return 'Esa fecha no existe: revisá el día y el mes.';
  if (iso < FECHA_NACIMIENTO_MIN) return 'Ingresá una fecha de nacimiento válida.';
  const hoy = new Date();
  if (nacimiento > hoy) return 'La fecha de nacimiento no puede ser futura.';
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  if (
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())
  ) edad--;
  if (edad < EDAD_MINIMA) return `La edad mínima para registrarse es de ${EDAD_MINIMA} años.`;
  return null;
}

/** «27102010» → «27/10/2010». Se escribe sólo con números; las barras las pone el campo. */
export function formatearFechaTexto(v: string): string {
  const d = soloDigitos(v).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Valor del formulario → lo que se ve en el campo de fecha. */
export function fechaParaMostrar(v: string): string {
  const iso = v.slice(0, 10);
  if (RE_ISO.test(iso)) return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  return formatearFechaTexto(v);
}

/** Lo escrito en el campo → valor del formulario: «AAAA-MM-DD» si son 8 dígitos y la fecha existe; si no, los dígitos. */
export function fechaDesdeTexto(texto: string): string {
  const d = soloDigitos(texto).slice(0, 8);
  if (d.length === 8) {
    const dia = Number(d.slice(0, 2)), mes = Number(d.slice(2, 4)), anio = Number(d.slice(4));
    const f = new Date(anio, mes - 1, dia, 12);
    if (f.getFullYear() === anio && f.getMonth() === mes - 1 && f.getDate() === dia) return `${d.slice(4)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
  }
  return d;
}

/**
 * Cuántos dígitos hay antes del cursor. Los campos que reformatean mientras se escribe (DNI con
 * puntos, teléfono con guiones, fecha con barras) mandan el cursor al final y no dejan corregir
 * en el medio (Testeo 15/10, punto 22): se cuenta antes de reformatear y se repone después.
 */
export function digitosAntesDelCursor(el: HTMLInputElement): number {
  return soloDigitos(el.value.slice(0, el.selectionStart ?? el.value.length)).length;
}

/** Vuelve a poner el cursor después del mismo dígito, ya con el texto reformateado. */
export function reponerCursor(el: HTMLInputElement, digitos: number) {
  requestAnimationFrame(() => {
    if (document.activeElement !== el) return;
    let cuenta = 0;
    let pos = 0;
    while (pos < el.value.length && cuenta < digitos) {
      if (/\d/.test(el.value[pos])) cuenta++;
      pos++;
    }
    el.setSelectionRange(pos, pos);
  });
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
