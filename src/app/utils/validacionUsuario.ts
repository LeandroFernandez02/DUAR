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

/** La fecha de nacimiento es opcional: sólo se valida si el usuario cargó algo. */
export function validarFechaNacimiento(v: string): string | null {
  if (!v) return null;
  const nacimiento = new Date(v);
  if (Number.isNaN(nacimiento.getTime())) return 'Fecha inválida.';
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
