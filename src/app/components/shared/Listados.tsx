/**
 * Piezas compartidas de las pantallas de listados (Operativos, Usuarios, Agentes), diseño CALÍVAR
 * del 23/10: buscador, selector Tarjetas/Lista, barra «Filtrar por:», estado vacío, botón de ícono,
 * dato rotulado y las listas con los títulos de columna fijos al scrollear.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type UIEvent } from 'react';
import { LayoutGrid, List, Search, X, type LucideIcon } from 'lucide-react';

export const tarjetaBase: CSSProperties = { background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-sm)', border: '1px solid var(--card-border)' };

export function Buscador({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [foco, setFoco] = useState(false);
  return (
    <div className="relative flex-1 min-w-0" style={{ minWidth: 120 }}>
      <span className="absolute flex pointer-events-none" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}><Search size={15} /></span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        onFocus={() => setFoco(true)} onBlur={() => setFoco(false)}
        style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '8px 36px', borderRadius: 'var(--radius-input)', outline: 'none', background: 'var(--input-background)',
          border: `1px solid ${foco ? 'var(--primary)' : 'var(--border)'}`, color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', transition: 'border-color .15s' }} />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Limpiar búsqueda" className="absolute flex"
          style={{ right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--muted-foreground)' }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export type VistaListado = 'card' | 'list';

/** Tarjetas / Lista. En < 600 px queda sólo con los íconos. */
export function SelectorVista({ value, onChange }: { value: VistaListado; onChange: (v: VistaListado) => void }) {
  return (
    <div className="flex items-center shrink-0" role="group" aria-label="Vista" style={{ padding: 2, borderRadius: 'var(--radius-input)', background: 'var(--muted)', border: '1px solid var(--border)' }}>
      {([['card', LayoutGrid, 'Tarjetas'], ['list', List, 'Lista']] as const).map(([m, I, l]) => {
        const on = value === m;
        return (
          <button key={m} type="button" title={l} aria-label={l} aria-pressed={on} onClick={() => onChange(m)} className="flex items-center gap-1.5"
            style={{ padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', background: on ? 'var(--card)' : 'transparent', color: on ? 'var(--primary)' : 'var(--muted-foreground)',
              boxShadow: on ? 'var(--elevation-sm)' : 'none', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: on ? 600 : 500, transition: 'all .15s' }}>
            <I size={15} /><span className="hidden sm:inline">{l}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Fila «Filtrar por:» + filtros, separada con borde superior dentro de la tarjeta del buscador. */
export function BarraFiltros({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
      <span className="shrink-0" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Filtrar por:</span>{children}
    </div>
  );
}

/** Botón de texto turquesa al lado de los filtros («Limpiar filtros», «Ver sólo vigentes»). */
export function BotonTextoFiltro({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ fontSize: 'var(--text-label)', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontFamily: 'var(--font-family-primary)' }}>
      {children}
    </button>
  );
}

/** Estado vacío: ícono en turquesa suave, título, texto y una acción. */
export function Vacio({ icono: I, titulo, texto, accion }: { icono: LucideIcon; titulo: string; texto?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-1.5" style={{ ...tarjetaBase, padding: '56px 24px' }}>
      <div className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: 16, background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)', marginBottom: 10 }}><I size={22} /></div>
      <p style={{ margin: 0, fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--foreground)' }}>{titulo}</p>
      {texto && <p style={{ margin: '0 0 14px', fontSize: 'var(--text-base)', color: 'var(--muted-foreground)', maxWidth: 420 }}>{texto}</p>}
      {accion}
    </div>
  );
}

/** Botón de ícono de las acciones de cada fila. `aviso` = ámbar (Finalizar); `peligro` = rojo al pasar (Eliminar). */
export function BotonIcono({ icono: I, title, onClick, tono, disabled }: { icono: LucideIcon; title: string; onClick: () => void; tono?: 'aviso' | 'peligro'; disabled?: boolean }) {
  const [h, setH] = useState(false);
  const peligro = tono === 'peligro', aviso = tono === 'aviso';
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} className="flex disabled:opacity-40"
      style={{ padding: 6, borderRadius: 'var(--radius-md)', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        color: aviso ? 'color-mix(in srgb, #fbbf24 var(--tinte-oscuro, 0%), #b45309)' : peligro && h ? 'color-mix(in srgb, #fca5a5 var(--tinte-oscuro, 0%), #dc2626)' : h ? 'var(--primary)' : 'var(--muted-foreground)',
        background: !h || disabled ? 'transparent' : aviso ? 'color-mix(in srgb, rgba(217,119,6,0.18) var(--tinte-oscuro, 0%), #fef3c7)' : peligro ? 'color-mix(in srgb, rgba(220,38,38,0.18) var(--tinte-oscuro, 0%), #fee2e2)' : 'color-mix(in srgb, var(--primary) 8%, transparent)' }}>
      <I size={14} />
    </button>
  );
}

/** Dato rotulado de las tarjetas (DNI, Dotación, Especialidad…). */
export function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p style={{ margin: 0, fontSize: 'calc(9.5px * var(--escala-texto))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tracking-overline)', color: 'var(--muted-foreground)' }}>{titulo}</p>
      <div className="truncate" style={{ margin: '2px 0 0', fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--foreground)' }}>{children}</div>
    </div>
  );
}

/* ── Listas con encabezado fijo ───────────────────────────────────────────────────
   Al scrollear, los títulos de las columnas quedan pegados arriba del contenedor de scroll
   (.scroll-contenido). Mientras están fijos se agrega `lista-fija` a <html>: una franja de 12 px
   con el color de fondo tapa lo que pasa por arriba (theme.css), así el listado nunca roza la barra. */
function useFijo() {
  const ref = useRef<HTMLDivElement>(null);
  const [fijo, setFijo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.IntersectionObserver) return;
    const root = el.closest('.scroll-contenido');
    const io = new IntersectionObserver(([e]) => setFijo(!e.isIntersecting && (!e.rootBounds || e.boundingClientRect.top < e.rootBounds.top + 1)), { root, rootMargin: '-13px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('lista-fija', fijo);
    return () => document.documentElement.classList.remove('lista-fija');
  }, [fijo]);
  return [ref, fijo] as const;
}

/** Esquinas externas del encabezado fijo: tapan con el fondo el hueco del redondeado, así el listado sigue la curva. */
function Orejas({ fijo }: { fijo: boolean }) {
  const o: CSSProperties = { position: 'absolute', top: 0, width: 'calc(var(--radius-card) + 17px)', height: 'var(--radius-card)', opacity: fijo ? 1 : 0, transition: 'opacity .15s' };
  return (
    <div aria-hidden="true" style={{ position: 'sticky', top: 12, zIndex: 5, height: 0, pointerEvents: 'none' }}>
      <span style={{ ...o, left: -17, background: 'radial-gradient(circle var(--radius-card) at 100% 100%, transparent calc(var(--radius-card) - 1.5px), var(--background) calc(var(--radius-card) - 0.5px))' }} />
      <span style={{ ...o, right: -17, background: 'radial-gradient(circle var(--radius-card) at 0 100%, transparent calc(var(--radius-card) - 1.5px), var(--background) calc(var(--radius-card) - 0.5px))' }} />
    </div>
  );
}
const FONDO_FIJO = 'linear-gradient(var(--muted), var(--muted)), var(--card)';
export const estiloTitulosColumna: CSSProperties = {
  color: 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tracking-overline)', whiteSpace: 'nowrap',
};

/** Tarjeta de lista (filas en grilla) con la fila de títulos fija. `encabezado` se dibuja con `estiloEncabezado`. */
export function ListaFija({ encabezado, estiloEncabezado, children }: { encabezado: ReactNode; estiloEncabezado?: CSSProperties; children: ReactNode }) {
  const [ref, fijo] = useFijo();
  return (
    <div style={{ ...tarjetaBase, overflow: 'clip', overflowClipMargin: 17 }}>
      <div ref={ref} style={{ height: 1, marginBottom: -1 }} />
      <Orejas fijo={fijo} />
      <div style={{ position: 'sticky', top: 12, zIndex: 4, background: FONDO_FIJO, borderBottom: '1px solid var(--border)', borderRadius: 'var(--radius-card) var(--radius-card) 0 0' }}>
        <div style={estiloEncabezado}>{encabezado}</div>
      </div>
      {children}
    </div>
  );
}

/** Tabla con columnas de ancho fijo, encabezado fijo y scroll horizontal sincronizado (en pantallas angostas). */
export function TablaFija({ cols, children }: { cols: { l: string; w: number }[]; children: ReactNode }) {
  const [ref, fijo] = useFijo();
  const cab = useRef<HTMLDivElement>(null);
  const total = cols.reduce((s, c) => s + c.w, 0);
  const sync = (e: UIEvent<HTMLDivElement>) => { if (cab.current) cab.current.style.transform = `translateX(${-e.currentTarget.scrollLeft}px)`; };
  const tabla: CSSProperties = { width: '100%', minWidth: total, tableLayout: 'fixed', borderCollapse: 'collapse', fontFamily: 'var(--font-family-primary)' };
  const grupo = <colgroup>{cols.map((k, i) => <col key={i} style={{ width: k.w }} />)}</colgroup>;
  return (
    <div style={{ ...tarjetaBase, overflow: 'clip', overflowClipMargin: 17 }}>
      <div ref={ref} style={{ height: 1, marginBottom: -1 }} />
      <Orejas fijo={fijo} />
      <div style={{ position: 'sticky', top: 12, zIndex: 4, overflow: 'hidden', background: FONDO_FIJO, borderBottom: '1px solid var(--border)', borderRadius: 'var(--radius-card) var(--radius-card) 0 0' }}>
        <div ref={cab} style={{ willChange: 'transform' }}>
          <table style={tabla}>{grupo}<thead><tr>{cols.map((k, i) => <th key={i} style={{ ...estiloTitulosColumna, textAlign: 'left', padding: '12px 16px' }}>{k.l}</th>)}</tr></thead></table>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }} onScroll={sync}><table style={tabla}>{grupo}{children}</table></div>
    </div>
  );
}
