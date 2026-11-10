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
 *  3. iPhone con la app instalada en modo translúcido: iOS calcula la ventana más corta que la
 *     pantalla (le resta la zona del reloj) y quedaba una franja vacía debajo del menú. La app
 *     toma el alto real de la pantalla, así el menú queda pegado al borde de abajo.
 */
export function usePaginaFija() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('pagina-fija');
    const quitarGestos = bloquearArrastres();
    const quitarAlto = ajustarAltoIphone();
    return () => { html.classList.remove('pagina-fija'); quitarGestos(); quitarAlto(); };
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

function esIphoneInstalado() {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function zonaRelojArriba() {
  const sonda = document.createElement('div');
  sonda.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top)';
  document.body.appendChild(sonda);
  const v = parseFloat(getComputedStyle(sonda).paddingTop) || 0;
  sonda.remove();
  return v;
}

function ajustarAltoIphone() {
  if (!esIphoneInstalado()) return () => {};
  const html = document.documentElement;
  const aplicar = () => {
    // screen no gira en iOS: el alto de la pantalla es el lado largo en vertical y el corto en horizontal.
    const vertical = window.innerHeight >= window.innerWidth;
    const alto = vertical ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    // Sólo en modo translúcido (la app ocupa la zona del reloj) y si iOS dejó la ventana corta.
    // En el modo de barra blanca la ventana empieza debajo del reloj y su alto ya es el correcto.
    if (zonaRelojArriba() > 0 && window.innerHeight < alto - 1) {
      html.style.setProperty('--alto-app', `${alto}px`);
    } else {
      html.style.removeProperty('--alto-app');
    }
  };
  aplicar();
  const tarde = () => setTimeout(aplicar, 300); // iOS informa el tamaño nuevo un rato después de girar
  window.addEventListener('resize', aplicar);
  window.addEventListener('orientationchange', tarde);
  return () => {
    window.removeEventListener('resize', aplicar);
    window.removeEventListener('orientationchange', tarde);
    html.style.removeProperty('--alto-app');
  };
}
