/**
 * App instalable (PWA, 10/11): de qué celular se entra, si ya está instalada y el
 * aviso de instalación de Android/Chrome, que llega una sola vez al cargar la página
 * y hay que guardarlo para ofrecer el botón «Instalar» más tarde (en /instalar).
 */

export type Plataforma = 'android' | 'ios' | 'otro';

interface AvisoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let aviso: AvisoInstalacion | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach(f => f());

/** Se llama una vez al arrancar (main.tsx), antes de que cargue cualquier pantalla. */
export function capturarInstalacion() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();             // el botón lo ofrece la guía, no la barra automática de Chrome
    aviso = e as AvisoInstalacion;
    avisar();
  });
  window.addEventListener('appinstalled', () => { aviso = null; avisar(); });
}

export function plataforma(): Plataforma {
  if (typeof navigator === 'undefined') return 'otro';
  const ua = navigator.userAgent;
  // El iPad nuevo se presenta como Mac: se lo reconoce por la pantalla táctil.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'otro';
}

/** ¿Se está usando la app instalada (abierta desde el ícono)? */
export function esInstalada(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export const puedeInstalarDirecto = () => aviso !== null;

/** Abre el diálogo de instalación de Chrome. Devuelve true si la persona aceptó. */
export async function instalarDirecto(): Promise<boolean> {
  if (!aviso) return false;
  const a = aviso;
  await a.prompt();
  const { outcome } = await a.userChoice;
  aviso = null; avisar();
  return outcome === 'accepted';
}

export function alCambiarInstalacion(f: () => void) {
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}
