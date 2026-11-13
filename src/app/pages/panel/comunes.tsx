import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Info, Footprints, Car, Dog, Bike, Shield, Droplets, Search, Navigation, Mountain, Waves, HelpCircle, type LucideIcon } from 'lucide-react';

/**
 * Piezas compartidas del Panel general y del Panel del operativo (diseño CALÍVAR v2, 11/11,
 * «handoff-dashboards»). Todo usa los tokens del tema; los únicos colores fijos son los de
 * estado/acento (iguales en claro y oscuro) y el fondo de los globos de ayuda (#1E293B).
 */

export const ACENTO = {
  verde: '#10B981', celeste: '#38BDF8', celesteFuerte: '#0EA5E9', ambar: '#FBBF24', naranja: '#F97316',
  rojo: '#EF4444', rojoFuerte: '#DC2626', violeta: '#8B5CF6', gris: '#64748B', grisClaro: '#94A3B8', azul: '#2563EB',
} as const;

export const chico = 'calc(12px * var(--escala-texto, 1))';
export const tinte = (c: string, pct = 14) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

export const tarjeta: CSSProperties = {
  background: 'var(--card)', boxShadow: 'var(--elevation-sm)', borderRadius: 'var(--radius-card)',
  border: '1px solid var(--card-border, transparent)', minWidth: 0, boxSizing: 'border-box',
};

/** Globo de ayuda estándar: fondo #1E293B, aparece al segundo y se va al salir. */
export const globo: CSSProperties = {
  position: 'absolute', zIndex: 30, width: 'max-content', maxWidth: 260, padding: '8px 12px', borderRadius: 6,
  background: '#1E293B', color: '#fff', boxShadow: '0 6px 18px rgba(11,30,45,.28)', fontSize: chico, fontWeight: 400,
  lineHeight: 1.35, textAlign: 'left', whiteSpace: 'normal', pointerEvents: 'none',
};

/** Muestra algo recién después de 1 s con el mouse encima; al salir se va enseguida. */
export function useDemora(ms = 1000) {
  const [ver, setVer] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  return {
    ver,
    entrar: () => { clearTimeout(t.current); t.current = setTimeout(() => setVer(true), ms); },
    salir: () => { clearTimeout(t.current); setVer(false); },
  };
}

/** Envuelve cualquier cosa con un globo de ayuda demorado (abajo, alineado a la derecha o centrado). */
export function TipDemora({ texto, children, style, centro = false }: { texto: ReactNode; children: ReactNode; style?: CSSProperties; centro?: boolean }) {
  const d = useDemora();
  return (
    <div onMouseEnter={d.entrar} onMouseLeave={d.salir} style={{ position: 'relative', ...style }}>
      {children}
      {d.ver && <div role="tooltip" style={{ ...globo, top: 'calc(100% + 6px)', ...(centro ? { left: '50%', transform: 'translateX(-50%)' } : { right: 0 }) }}>{texto}</div>}
    </div>
  );
}

export function InfoTip({ texto }: { texto: string }) {
  const d = useDemora();
  return (
    <span onMouseEnter={d.entrar} onMouseLeave={d.salir} tabIndex={0} aria-label={texto} onFocus={d.entrar} onBlur={d.salir}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0, cursor: 'help' }}>
      <Info size={16} color={ACENTO.grisClaro} />
      {d.ver && <span role="tooltip" style={{ ...globo, maxWidth: 220, left: '50%', top: 'calc(100% + 6px)', transform: 'translateX(-50%)' }}>{texto}</span>}
    </span>
  );
}

export function CajaIcono({ icono: I, color, lado = 40, tam = 18 }: { icono: LucideIcon; color: string; lado?: number; tam?: number }) {
  return (
    <div style={{ width: lado, height: lado, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: tinte(color) }}>
      <I size={tam} color={color} />
    </div>
  );
}

/** Indicador con cifra: número grande (+ unidad), etiqueta y el ícono tintado a la derecha. */
export function Kpi({ icono, color, valor, unidad, etiqueta, tip, destacado, extra }: {
  icono?: LucideIcon; color: string; valor: ReactNode; unidad?: string; etiqueta: string; tip?: ReactNode; destacado?: boolean; extra?: ReactNode;
}) {
  const d = useDemora();
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => { setHov(true); d.entrar(); }} onMouseLeave={() => { setHov(false); d.salir(); }}
      style={{ ...tarjeta, minHeight: 120, height: '100%', position: 'relative', cursor: tip ? 'pointer' : 'default', padding: '20px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, transition: 'transform .15s ease, box-shadow .15s ease',
        ...(hov ? { transform: 'translateY(-2px)', boxShadow: 'var(--elevation-md)' } : {}), ...(destacado ? { border: `1.5px solid ${color}` } : {}) }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 6, color: 'var(--foreground)' }}>
          <span style={{ fontSize: 'calc(28px * var(--escala-texto, 1))', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{valor}</span>
          {unidad && <span style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>{unidad}</span>}
        </p>
        <p style={{ margin: 0, fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--foreground)' }}>{etiqueta}</p>
      </div>
      {extra ?? (icono && <CajaIcono icono={icono} color={color} />)}
      {d.ver && tip && <div role="tooltip" style={{ ...globo, left: '50%', top: 'calc(100% + 10px)', transform: 'translateX(-50%)' }}>{tip}</div>}
    </div>
  );
}

/** Título de tarjeta: ícono tintado 38 px, título, ayuda opcional y algo a la derecha. Línea abajo. */
export function Tit({ icono, color = ACENTO.verde, children, sub, info, der }: {
  icono: LucideIcon; color?: string; children: ReactNode; sub?: string; info?: string; der?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, marginBottom: 16, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
      <CajaIcono icono={icono} color={color} lado={38} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-h4)', fontWeight: 700, color: 'var(--foreground)' }}>{children}</h2>
          {info && <InfoTip texto={info} />}
        </div>
        {sub && <p style={{ margin: 0, fontSize: chico, color: 'var(--muted-foreground)' }}>{sub}</p>}
      </div>
      {der && <div style={{ marginLeft: 'auto' }}>{der}</div>}
    </div>
  );
}

/** Encabezado de sección del panel del operativo: ícono + título en mayúsculas, gris. */
export function Seccion({ icono: I, color, children }: { icono: LucideIcon; color: string; children: ReactNode }) {
  return (
    <p style={{ margin: '4px 0 -4px', display: 'flex', alignItems: 'center', gap: 8, fontSize: chico, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
      <I size={14} color={color} />{children}
    </p>
  );
}

/** Encabezado de sección del panel general: ícono + título en mayúsculas y una línea que llena el resto. */
export function Marco({ icono: I, titulo, children }: { icono: LucideIcon; titulo: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <I size={15} color="var(--primary)" />
        <h2 style={{ margin: 0, fontSize: chico, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{titulo}</h2>
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      {children}
    </div>
  );
}

/** Botón píldora de las tarjetas («Ver detalle», «Ver completados»). */
export function BotonPildora({ abierto, onClick, children }: { abierto: boolean; onClick: () => void; children: ReactNode }) {
  const I = abierto ? ChevronUp : ChevronDown;
  return (
    <button type="button" onClick={onClick} aria-expanded={abierto}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--muted)',
        color: 'var(--foreground)', cursor: 'pointer', fontFamily: 'var(--font-family-primary)', fontSize: chico, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {children}<I size={14} />
    </button>
  );
}

/** Selector segmentado (píldoras sobre fondo gris; la activa con fondo de tarjeta). */
export function Segmentado<T extends string | boolean>({ opciones, valor, onCambiar, etiqueta, redondo = false }: {
  opciones: [T, string][]; valor: T; onCambiar: (v: T) => void; etiqueta: string; redondo?: boolean;
}) {
  const radio = redondo ? 999 : 'var(--radius-button)';
  return (
    <div role="tablist" aria-label={etiqueta} style={{ display: 'inline-flex', flexShrink: 0, padding: redondo ? 2 : 3, borderRadius: radio, background: 'var(--muted)', whiteSpace: 'nowrap', ...(redondo ? { border: '1px solid var(--border)' } : {}) }}>
      {opciones.map(([v, t]) => (
        <button key={String(v)} type="button" role="tab" aria-selected={valor === v} onClick={() => onCambiar(v)}
          style={{ padding: redondo ? '2px 10px' : '4px 12px', borderRadius: radio, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-primary)',
            fontSize: redondo ? 'calc(11px * var(--escala-texto, 1))' : chico, fontWeight: 600,
            background: valor === v ? 'var(--card)' : 'transparent', boxShadow: valor === v ? 'var(--elevation-sm)' : 'none',
            color: valor === v ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{t}</button>
      ))}
    </div>
  );
}

/** Lista con scroll interno sin barra y un degradado abajo mientras queda contenido. */
export function ScrollFade({ children, minHeight = 0 }: { children: ReactNode; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mas, setMas] = useState(false);
  const medir = () => { const el = ref.current; if (el) setMas(el.scrollHeight - el.scrollTop - el.clientHeight > 4); };
  useLayoutEffect(() => {
    medir();
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(medir); ro.observe(el);
    for (const h of Array.from(el.children)) ro.observe(h);
    return () => ro.disconnect();
  });
  return (
    <div style={{ position: 'relative', flex: 1, minHeight }}>
      {/* 12 px a la derecha, fuera del contenido: ahí se dibuja la barra de scroll superpuesta (utils/scrollSuave.ts),
          que si no tapaba el borde de lo que hay en la lista, como los medidores de cobertura (QA 13/11, QA-06). */}
      <div ref={ref} className="sin-barra" onScroll={medir} style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', padding: '0 12px 8px 4px', margin: '0 -12px 0 -4px' }}>{children}</div>
      {mas && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 32, pointerEvents: 'none', background: 'linear-gradient(to bottom, transparent, var(--card))' }} />}
    </div>
  );
}

/** Ancho y alto de un elemento, al día (ResizeObserver). */
export function useMedida<T extends HTMLElement>(minW = 0, minH = 0) {
  const ref = useRef<T>(null);
  const [m, setM] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const medir = () => setM(p => {
      const w = Math.max(minW, el.clientWidth), h = Math.max(minH, el.clientHeight);
      return p.w === w && p.h === h ? p : { w, h };
    });
    medir();
    const ro = new ResizeObserver(medir); ro.observe(el);
    return () => ro.disconnect();
  }, [minW, minH]);
  return [ref, m] as const;
}

/** Fecha local AAAA-MM-DD (nunca UTC: a la noche cambiaría de día). */
export const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 3.8 → «3,8» (es-AR). */
export const num = (n: number, dec = 1) => n.toLocaleString('es-AR', { maximumFractionDigits: dec });

/* ── Especialidades e instituciones (catálogo real, colores del diseño) ─────────────────── */

/** Las especialidades de cat_especialidades, en el orden del diseño, con su color e ícono. */
export const ESPECIALIDADES_PANEL: { nombre: string; color: string; icono: LucideIcon }[] = [
  { nombre: 'Caminante', color: '#10B981', icono: Footprints },
  { nombre: 'Conductor', color: '#3B82F6', icono: Car },
  { nombre: 'Buceo', color: '#8B5CF6', icono: Waves },
  { nombre: 'Caballería', color: '#F59E0B', icono: Shield },
  { nombre: 'Motos', color: '#EF4444', icono: Bike },
  { nombre: 'Investigación', color: '#6366F1', icono: Search },
  { nombre: 'Drones', color: '#F97316', icono: Navigation },
  { nombre: 'Altura', color: '#0EA5E9', icono: Mountain },
  { nombre: 'K-9', color: '#14B8A6', icono: Dog },
  { nombre: 'Acuático', color: '#06B6D4', icono: Droplets },
];
/**
 * Los recuadros «Especialidades críticas» (Panel general) y «Recursos Críticos» (Panel del operativo)
 * muestran sólo los recursos especiales: Caminante y Conductor son `es_recurso_critico = false` en el
 * catálogo (migraciones 033 y 035), así que no van (QA 13/11, QA-04).
 */
const NO_CRITICAS = new Set(['Caminante', 'Conductor']);
export const ESPECIALIDADES_CRITICAS = ESPECIALIDADES_PANEL.filter(e => !NO_CRITICAS.has(e.nombre));
export const estiloEspecialidad = (nombre: string) =>
  ESPECIALIDADES_PANEL.find(e => e.nombre === nombre) ?? { nombre, color: ACENTO.grisClaro, icono: HelpCircle };

/** Colores de institución: los cuatro primeros del diseño y después una paleta fija (sin «Otras»). */
const COLORES_INST = ['#10B981', '#3B82F6', '#38BDF8', '#6366F1', '#F59E0B', '#EC4899', '#14B8A6', '#A855F7', '#F97316', '#84CC16', '#0EA5E9', '#E11D48'];
export const colorInstitucion = (i: number) => COLORES_INST[i % COLORES_INST.length];
/** «Bomberos Voluntarios» → «BV»; «Policía» → «PO». */
export const sigla = (nom: string) => {
  const p = nom.split(/\s+/).filter(w => w.length > 2);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : nom.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').slice(0, 2).toUpperCase();
};
