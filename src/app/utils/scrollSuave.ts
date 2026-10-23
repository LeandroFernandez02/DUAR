/**
 * Barra de scroll superpuesta (diseño CALÍVAR): la nativa está oculta en theme.css y acá se dibuja
 * un indicador gris suave, sin flechas, encima del contenido (no ocupa lugar ni mueve nada). Se ve
 * tenue cuando hay más contenido, se marca al desplazar y se puede arrastrar. Port de
 * ui_kits/scroll-suave.js de la referencia; busca también los contenedores con clases de Tailwind.
 */
const ANCHO = 5, MARGEN = 3, MIN = 28;
const SELECTOR = '[style*="overflow"], .overflow-auto, .overflow-y-auto, .overflow-x-auto, .overflow-scroll, .overflow-y-scroll';

type Eje = 'x' | 'y';
interface Barra { b: HTMLDivElement; el: HTMLElement; eje: Eje; activo: number }

export function iniciarScrollSuave() {
  const w = window as unknown as { __scrollSuave?: boolean };
  if (w.__scrollSuave) return;
  w.__scrollSuave = true;

  const barras = new Map<string, Barra>();
  const ids = new WeakMap<HTMLElement, string>();
  let raf = 0;
  let espera: ReturnType<typeof setTimeout> | undefined;

  const color = (fuerte: boolean) => document.documentElement.classList.contains('dark')
    ? `rgba(230, 233, 238, ${fuerte ? 0.5 : 0.24})`
    : `rgba(91, 107, 122, ${fuerte ? 0.55 : 0.28})`;

  function crear(el: HTMLElement, eje: Eje): Barra {
    const b = document.createElement('div');
    b.setAttribute('aria-hidden', 'true');
    b.style.cssText = 'position:fixed;z-index:2147483000;border-radius:999px;transition:background .25s,opacity .25s;touch-action:none;cursor:default';
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); b.setPointerCapture(e.pointerId);
      const ini = eje === 'y' ? e.clientY : e.clientX, pos = eje === 'y' ? el.scrollTop : el.scrollLeft;
      const r = el.getBoundingClientRect(), total = eje === 'y' ? el.scrollHeight : el.scrollWidth, vista = eje === 'y' ? r.height : r.width;
      const mover = (ev: PointerEvent) => {
        const d = (eje === 'y' ? ev.clientY : ev.clientX) - ini, k = total / vista;
        if (eje === 'y') el.scrollTop = pos + d * k; else el.scrollLeft = pos + d * k;
      };
      const soltar = () => { b.removeEventListener('pointermove', mover); b.removeEventListener('pointerup', soltar); b.removeEventListener('pointercancel', soltar); };
      b.addEventListener('pointermove', mover); b.addEventListener('pointerup', soltar); b.addEventListener('pointercancel', soltar);
    });
    document.body.appendChild(b);
    return { b, el, eje, activo: 0 };
  }

  function desplazable(el: HTMLElement, eje: Eje) {
    const cs = getComputedStyle(el), ov = eje === 'y' ? cs.overflowY : cs.overflowX;
    if (ov !== 'auto' && ov !== 'scroll') return false;
    return eje === 'y' ? el.scrollHeight > el.clientHeight + 2 : el.scrollWidth > el.clientWidth + 2;
  }
  const visibleEn = (el: HTMLElement, x: number, y: number) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t)); };

  function pintar() {
    raf = 0;
    const ahora = Date.now();
    barras.forEach((o, clave) => {
      const el = o.el, r = el.getBoundingClientRect();
      if (!el.isConnected || !desplazable(el, o.eje) || r.width < 20 || r.height < 20) {
        o.b.style.display = 'none';
        if (!el.isConnected) { o.b.remove(); barras.delete(clave); }
        return;
      }
      const y = o.eje === 'y', total = y ? el.scrollHeight : el.scrollWidth, vista = y ? el.clientHeight : el.clientWidth, pos = y ? el.scrollTop : el.scrollLeft;
      const largo = y ? r.height : r.width, tam = Math.max(MIN, vista / total * largo - MARGEN * 2), recorrido = largo - tam - MARGEN * 2;
      const desde = MARGEN + (total > vista ? pos / (total - vista) : 0) * recorrido;
      const cx = y ? r.right - MARGEN - ANCHO / 2 : r.left + desde + tam / 2, cy = y ? r.top + desde + tam / 2 : r.bottom - MARGEN - ANCHO / 2;
      if (!visibleEn(el, y ? r.right - 14 : cx, y ? cy : r.bottom - 14)) { o.b.style.display = 'none'; return; }
      const s = o.b.style; s.display = 'block';
      if (y) { s.left = `${r.right - MARGEN - ANCHO}px`; s.top = `${r.top + desde}px`; s.width = `${ANCHO}px`; s.height = `${tam}px`; }
      else { s.left = `${r.left + desde}px`; s.top = `${r.bottom - MARGEN - ANCHO}px`; s.width = `${tam}px`; s.height = `${ANCHO}px`; }
      s.background = color(ahora - o.activo < 900);
    });
  }
  const pedir = () => { if (!raf) raf = requestAnimationFrame(pintar); };

  function registrar(el: HTMLElement) {
    let id = ids.get(el);
    if (!id) { id = Math.random().toString(36).slice(2); ids.set(el, id); }
    (['y', 'x'] as const).forEach(eje => {
      const k = id + eje;
      if (!barras.has(k) && desplazable(el, eje)) barras.set(k, crear(el, eje));
    });
  }
  function buscar() {
    document.querySelectorAll<HTMLElement>(SELECTOR).forEach(registrar);
    pedir();
  }

  document.addEventListener('scroll', e => {
    const el = e.target as HTMLElement | Document | null;
    if (!el || el === document || !(el instanceof HTMLElement)) return;
    registrar(el);
    barras.forEach(o => { if (o.el === el) o.activo = Date.now(); });
    pedir(); clearTimeout(espera); espera = setTimeout(pedir, 950);
  }, true);
  window.addEventListener('resize', pedir);
  new MutationObserver(pedir).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  const iniciar = () => { buscar(); setInterval(buscar, 800); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
}
