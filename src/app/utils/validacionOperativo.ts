/**
 * Reglas del formulario de Operativos (CU-08 Crear · CU-09 Modificar · CU-10
 * Finalizar). Espejo de `validarDatosOperativo` en server/src/utils/validaciones.js
 * — el backend es la última palabra; esto sólo guía antes de mandar el request.
 * Los topes salen del tamaño real de las columnas de `operativos`.
 */
export const RE_FISCAL = /^[A-Za-zÀ-ÖØ-öø-ÿ.'\- ]{2,100}$/;
export const TITULO_MAX = 150;
export const FISCAL_MAX = 100;
export const DESCRIPCION_MAX = 2000;
export const NOTA_FINAL_MAX = 1000;

export function validarTitulo(v: string): string | null {
  const t = v.trim();
  if (t.length < 3) return 'El título debe tener al menos 3 caracteres.';
  if (t.length > TITULO_MAX) return `El título puede tener hasta ${TITULO_MAX} caracteres.`;
  return null;
}

export function validarFiscal(v: string): string | null {
  if (!RE_FISCAL.test(v.trim())) return 'Entre 2 y 100 letras (se permiten puntos, guiones y apóstrofes).';
  return null;
}

/** Deja sólo lo que el campo Fiscal acepta, con su tope. */
export function filtrarFiscal(v: string): string {
  return v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ.'\- ]/g, '').slice(0, FISCAL_MAX);
}
