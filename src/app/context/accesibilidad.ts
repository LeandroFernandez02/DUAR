import { useSyncExternalStore } from 'react';

/**
 * Accesibilidad (WCAG 2.1 AA, diseño CALÍVAR del 23/10): tamaño de texto, alto contraste y
 * foco visible. Se guarda en localStorage junto al tema y se aplica como atributos de <html>,
 * que theme.css traduce a variables (`--escala-texto`, colores reforzados, doble anillo de foco):
 *  · data-texto = grande | muy-grande (sin atributo = normal) → escala 1,15 / 1,3.
 *  · data-contraste = alto.
 *  · data-foco = on | off. Encendido por defecto.
 * Lo usan el panel Accesibilidad del menú (escritorio) y la hoja de Perfil (mobile).
 */
export type TamanoTexto = 'normal' | 'grande' | 'muy-grande';
export interface Accesibilidad { texto: TamanoTexto; contraste: boolean; foco: boolean }

const CLAVE = 'duar-acc';
const INICIAL: Accesibilidad = { texto: 'normal', contraste: false, foco: true };

function leer(): Accesibilidad {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    return { ...INICIAL, ...(g && typeof g === 'object' ? g : {}) };
  } catch { return INICIAL; }
}

let actual = leer();
const oyentes = new Set<() => void>();

function aplicar(a: Accesibilidad) {
  const root = document.documentElement;
  if (a.texto === 'normal') root.removeAttribute('data-texto'); else root.setAttribute('data-texto', a.texto);
  if (a.contraste) root.setAttribute('data-contraste', 'alto'); else root.removeAttribute('data-contraste');
  root.setAttribute('data-foco', a.foco ? 'on' : 'off');
}

/** Se llama una vez al arrancar (main.tsx), antes de pintar, para que no haya un salto de tamaños. */
export function aplicarAccesibilidadGuardada() { aplicar(actual); }

export function cambiarAccesibilidad(cambios: Partial<Accesibilidad>) {
  actual = { ...actual, ...cambios };
  aplicar(actual);
  try { localStorage.setItem(CLAVE, JSON.stringify(actual)); } catch { /* sin almacenamiento: vale para esta pestaña */ }
  oyentes.forEach(f => f());
}

export function useAccesibilidad(): [Accesibilidad, (c: Partial<Accesibilidad>) => void] {
  const a = useSyncExternalStore(f => { oyentes.add(f); return () => oyentes.delete(f); }, () => actual);
  return [a, cambiarAccesibilidad];
}
