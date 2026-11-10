import { useEffect } from 'react';

/**
 * Pantallas de la app (con menú inferior): la página en sí NO se mueve, sólo el contenido que
 * tiene su propio scroll. En el iPhone, arrastrar con el dedo una zona que no se desplaza (como
 * el menú de abajo) levantaba toda la app como un elástico y dejaba un hueco blanco (prueba en
 * iPhone, 10/11). No se usa en login, registro y guías: ahí la página es la que se desplaza.
 *
 * Tres seguros, porque el CSS solo no alcanzó en el iPhone real:
 *  1. La página queda fija (clase `pagina-fija`, ver theme.css).
 *  2. Todo arrastre que no desplaza una lista/panel con scroll se cancela: así el menú inferior,
 *     los encabezados y los bordes de cada lista nunca arrastran la app entera.
 *  3. App instalada en el iPhone: la pantalla mide 100lvh y no usa posición fija, así el menú
 *     llega al borde de abajo (ver theme.css).
 */
export function usePaginaFija() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('pagina-fija');
    const quitarGestos = bloquearArrastres();
    return () => { html.classList.remove('pagina-fija'); quitarGestos(); };
  }, []);
}

/** ¿Este elemento (o un padre) tiene scroll que todavía puede moverse en esa dirección? */
function puedeDesplazar(desde: EventTarget | null, dx: number, dy: number): boolean {
  let el = desde instanceof Element ? desde : null;
  const vertical = Math.abs(dy) >= Math.abs(dx);
  while (el && el !== document.body && el !== document.documentElement) {
    // Mapas, deslizadores y campos de texto manejan su propio gesto.
    if (el.matches('.leaflet-container, input[type="range"], textarea, [data-gesto-libre]')) return true;
    const st = getComputedStyle(el);
    if (vertical) {
      const scroll = /(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 1;
      if (scroll) {
        if (dy > 0 && el.scrollTop > 0) return true;                                      // hacia arriba
        if (dy < 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;  // hacia abajo
      }
    } else {
      const scroll = /(auto|scroll)/.test(st.overflowX) && el.scrollWidth > el.clientWidth + 1;
      if (scroll) {
        if (dx > 0 && el.scrollLeft > 0) return true;
        if (dx < 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

function bloquearArrastres() {
  let x = 0, y = 0;
  const inicio = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    x = e.touches[0].clientX; y = e.touches[0].clientY;
  };
  const mover = (e: TouchEvent) => {
    if (e.touches.length !== 1 || !e.cancelable) return; // dos dedos: zoom, se respeta
    const t = e.touches[0];
    const dx = t.clientX - x, dy = t.clientY - y;
    x = t.clientX; y = t.clientY;
    if (dx === 0 && dy === 0) return;
    if (!puedeDesplazar(e.target, dx, dy)) e.preventDefault();
  };
  document.addEventListener('touchstart', inicio, { passive: true });
  document.addEventListener('touchmove', mover, { passive: false });
  return () => {
    document.removeEventListener('touchstart', inicio);
    document.removeEventListener('touchmove', mover);
  };
}
