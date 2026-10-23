import { useSyncExternalStore } from 'react';

/**
 * Puntos de corte del diseño CALÍVAR (23/10):
 *  · compacto (< 1024): barra superior + menú inferior en lugar del menú lateral;
 *  · tablet (700–1023): algunas pantallas (Grupos) usan la disposición de escritorio;
 *  · mobile chico (< 600): ajustes extra (botones sólo con ícono, herramientas del mapa chicas).
 */
function useMedia(consulta: string): boolean {
  return useSyncExternalStore(
    f => { const m = window.matchMedia(consulta); m.addEventListener('change', f); return () => m.removeEventListener('change', f); },
    () => window.matchMedia(consulta).matches,
    () => false,
  );
}

export const useEsCompacto = () => useMedia('(max-width: 1023px)');
export const useEsTablet = () => useMedia('(min-width: 700px) and (max-width: 1023px)');
export const useEsMovilChico = () => useMedia('(max-width: 599px)');
