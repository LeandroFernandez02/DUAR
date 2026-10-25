/**
 * Piezas visuales del mapa operacional, traducidas del prototipo de Claude
 * Design (diseno/components/core y diseno/components/map): botón, modal,
 * campos, marcadores, árbol, barra de herramientas, leyenda, barra de
 * cobertura, perfil de elevación, globo y panel de detalle.
 */
import { useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Crosshair, MapPin, TriangleAlert, Flag, X, Plus, Minus, ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react';
import type { TipoInstalacionApi } from '../../../services/api';

/* ── Botón ── */
const VARIANTES: Record<string, { bg: string; fg: string; bd: string; hover: CSSProperties }> = {
  primary: { bg: 'var(--primary)', fg: 'var(--primary-foreground)', bd: 'var(--primary)', hover: { opacity: 0.88 } },
  muted:   { bg: 'var(--muted)', fg: 'var(--foreground)', bd: 'var(--border)', hover: { background: 'var(--border)' } },
  outline: { bg: 'var(--card)', fg: 'var(--foreground)', bd: 'var(--border)', hover: { borderColor: 'var(--foreground)' } },
  ghost:   { bg: 'transparent', fg: 'var(--muted-foreground)', bd: 'transparent', hover: { color: 'var(--foreground)', background: 'var(--muted)' } },
  danger:  { bg: '#dc2626', fg: '#fff', bd: '#dc2626', hover: { opacity: 0.88 } },
};

export function Boton({ variante = 'primary', tam = 'sm', icono: I, children, disabled, onClick, title, style, full }: {
  variante?: keyof typeof VARIANTES; tam?: 'sm' | 'md'; icono?: LucideIcon; children?: ReactNode; disabled?: boolean;
  onClick?: () => void; title?: string; style?: CSSProperties; full?: boolean;
}) {
  const [h, setH] = useState(false);
  const v = VARIANTES[variante];
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: tam === 'md' ? '8px 16px' : '6px 12px', borderRadius: 'var(--radius-button)',
        border: `1.5px solid ${disabled ? 'var(--border)' : v.bd}`,
        background: disabled ? 'var(--muted)' : v.bg, color: disabled ? 'var(--muted-foreground)' : v.fg,
        fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: 600, lineHeight: 1.5,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, transition: 'all .15s ease',
        width: full ? '100%' : undefined, whiteSpace: 'nowrap',
        ...(h && !disabled ? v.hover : null), ...style,
      }}>
      {I && <I size={13} />}
      {children}
    </button>
  );
}

/* ── Modal ── */
/**
 * Se dibuja en `document.body`: el mapa es una capa aislada (`isolation: isolate`, para que sus
 * z-index de Leaflet no tapen la hoja de Perfil en mobile, Testeo 25/10 punto 45) y un modal
 * dentro de esa capa quedaría debajo del menú inferior.
 */
export function Modal({ titulo, subtitulo, icono: I, onClose, children, pie, ancho = 520 }: {
  titulo: string; subtitulo?: ReactNode; icono?: LucideIcon; onClose: () => void; children: ReactNode; pie?: ReactNode; ancho?: number;
}) {
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={titulo}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{
        width: `min(92vw, ${ancho}px)`, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--card)', color: 'var(--card-foreground)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)', fontFamily: 'var(--font-family-primary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
            {I && <span style={{ color: 'var(--primary)', marginTop: 2 }}><I size={16} /></span>}
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 'var(--text-h3)', fontWeight: 600, lineHeight: 1.4 }}>{titulo}</p>
              {subtitulo && <p style={{ margin: '2px 0 0', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>{subtitulo}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>{children}</div>
        {pie && <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--border)' }}>{pie}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ── Campos ── */
export const rotulo: CSSProperties = {
  color: 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0,
};
const caja = (multi?: boolean, error?: boolean): CSSProperties => ({
  width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 'var(--radius-input)', outline: 'none',
  background: 'var(--input-background)', border: `1px solid ${error ? 'var(--destructive)' : 'var(--border)'}`, color: 'var(--foreground)',
  fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', lineHeight: multi ? 1.55 : 1.5, resize: 'none',
});

export function Campo({ etiqueta, valor, onChange, placeholder, multilinea, filas = 4, requerido, overline, maxLength, error, onKeyDown, autoFocus, inputMode }: {
  etiqueta?: string; valor: string; onChange: (v: string) => void; placeholder?: string; multilinea?: boolean; filas?: number;
  requerido?: boolean; overline?: boolean; maxLength?: number; error?: boolean; autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void; inputMode?: 'decimal' | 'text';
}) {
  const lab: CSSProperties = overline ? rotulo : { color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 600 };
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-family-primary)' }}>
      {etiqueta && <span style={{ ...lab, lineHeight: 1.5 }}>{etiqueta}{requerido ? ' *' : ''}</span>}
      {multilinea
        ? <textarea rows={filas} value={valor} maxLength={maxLength} onChange={e => onChange(e.target.value)} placeholder={placeholder} onKeyDown={onKeyDown} autoFocus={autoFocus} style={caja(true, error)} />
        : <input value={valor} maxLength={maxLength} onChange={e => onChange(e.target.value)} placeholder={placeholder} onKeyDown={onKeyDown} autoFocus={autoFocus} inputMode={inputMode} style={caja(false, error)} />}
    </label>
  );
}

export function Selector({ etiqueta, valor, onChange, opciones, overline, disabled }: {
  etiqueta?: string; valor: string; onChange: (v: string) => void;
  opciones: { value: string; label: string; disabled?: boolean }[]; overline?: boolean; disabled?: boolean;
}) {
  const lab: CSSProperties = overline ? rotulo : { color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 600 };
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-family-primary)', flex: 1, minWidth: 0 }}>
      {etiqueta && <span style={{ ...lab, lineHeight: 1.5 }}>{etiqueta}</span>}
      <select value={valor} disabled={disabled} onChange={e => onChange(e.target.value)} style={{ ...caja(), padding: '8px 10px', opacity: disabled ? 0.55 : 1 }}>
        {opciones.map(o => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function ErrorTexto({ children }: { children: ReactNode }) {
  return <p role="alert" style={{ margin: 0, fontSize: 'calc(12px * var(--escala-texto))', color: '#dc2626', lineHeight: 1.5 }}>{children}</p>;
}

/* ── Marcadores (símbolos tácticos) ── */
export type TipoSimbolo = 'puntoCero' | 'POI' | 'HALLAZGO' | TipoInstalacionApi;

interface Simbolo { color: string; bg: string; label: string; icono?: LucideIcon; glifo?: string; sci?: boolean; svg?: string }
const SCI = { color: '#2563eb', bg: '#dbeafe', sci: true };
// Trazos de lucide para los marcadores que se dibujan como HTML dentro de Leaflet.
const SVG = {
  crosshair: '<circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/>',
  mapPin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  alerta: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  bandera: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
};
export const SIMBOLOS: Record<TipoSimbolo, Simbolo> = {
  puntoCero: { color: 'var(--primary)', bg: 'color-mix(in srgb, var(--primary) 12%, transparent)', label: 'Punto Cero', icono: Crosshair, svg: SVG.crosshair },
  POI: { color: '#ca8a04', bg: '#fef9c3', label: 'Punto de interés', icono: MapPin, svg: SVG.mapPin },
  HALLAZGO: { color: '#16a34a', bg: '#dcfce7', label: 'Hallazgo', icono: TriangleAlert, svg: SVG.alerta },
  PUESTO_COMANDO: { ...SCI, label: 'Puesto de Comando', icono: Flag, svg: SVG.bandera, glifo: 'PC' },
  BASE: { ...SCI, label: 'Base', glifo: 'B' },
  CAMPAMENTO: { ...SCI, label: 'Campamento', glifo: 'C' },
  HELIPUNTO: { ...SCI, label: 'Helipunto', glifo: 'H' },
  AREA_ESPERA: { ...SCI, label: 'Área de Espera', glifo: 'E' },
  AREA_CONCENTRACION_VICTIMAS: { ...SCI, label: 'Área de Concentración de Víctimas', glifo: 'ACV' },
};

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** El pin del mapa como HTML (Leaflet divIcon). */
export function pinHtml(tipo: TipoSimbolo, etiqueta: string | null, seleccionado: boolean): { html: string; alto: number } {
  const c = SIMBOLOS[tipo];
  const s = tipo === 'puntoCero' ? 34 : c.sci ? 30 : 28;
  const icono = tipo === 'puntoCero' ? 16 : 13;
  const glifo = c.svg && (!c.sci || c.glifo === 'PC')
    ? `<svg width="${icono}" height="${icono}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${c.svg}</svg>`
    : `<span style="font-size:${(c.glifo!.length > 2 ? 0.3 : c.glifo!.length > 1 ? 0.36 : 0.44) * s}px;font-weight:800;line-height:1">${c.glifo}</span>`;
  const sombra = seleccionado ? `0 0 0 3px color-mix(in srgb, ${c.color} 35%, transparent), 0 4px 12px rgba(0,0,0,.3)` : '0 2px 8px rgba(0,0,0,.3)';
  const halo = tipo === 'puntoCero'
    ? `<span style="position:absolute;top:-6px;left:50%;width:${s + 12}px;height:${s + 12}px;margin-left:${-(s + 12) / 2}px;border-radius:50%;border:2px solid ${c.color};opacity:.35"></span>` : '';
  const rot = etiqueta
    ? `<span style="margin-top:3px;padding:1px 6px;border-radius:4px;background:rgba(0,0,0,.6);color:#fff;font-size:10px;font-weight:600;white-space:nowrap">${esc(etiqueta)}</span>` : '';
  return {
    alto: tipo === 'puntoCero' ? 40 : c.sci ? 36 : 34,
    html: `<div style="width:140px;display:flex;justify-content:center"><div style="position:relative;display:inline-flex;flex-direction:column;align-items:center;font-family:var(--font-family-primary)">${halo}`
      + `<span style="width:${s}px;height:${s}px;border-radius:${c.sci ? '7px' : '50%'};background:${c.color};color:#fff;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:${sombra};box-sizing:border-box">${glifo}</span>`
      + `<span style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${c.color};margin-top:-1px"></span>${rot}</div></div>`,
  };
}

/** Versión chica para el árbol y los encabezados (chip = fondo suave, mini = sólido). */
export function Simbolo({ tipo, variante = 'mini' }: { tipo: TipoSimbolo; variante?: 'mini' | 'chip' }) {
  const c = SIMBOLOS[tipo];
  const s = variante === 'mini' ? 16 : 32;
  const solido = variante === 'mini';
  const I = c.icono;
  return (
    <span title={c.label} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: s, height: s, flexShrink: 0,
      borderRadius: c.sci ? (solido ? 4 : 8) : (solido ? '50%' : 8),
      background: solido ? c.color : c.bg, color: solido ? '#fff' : c.color, fontFamily: 'var(--font-family-primary)',
    }}>
      {I && (!c.sci || c.glifo === 'PC') ? <I size={solido ? 9 : 13} strokeWidth={2.4} />
        : <span style={{ fontSize: (c.glifo!.length > 2 ? 0.3 : c.glifo!.length > 1 ? 0.36 : 0.44) * s, fontWeight: 800, lineHeight: 1 }}>{c.glifo}</span>}
    </span>
  );
}

/* ── Árbol de la izquierda ── */
const chk: CSSProperties = { accentColor: 'var(--primary)', margin: 0, width: 14, height: 14, flexShrink: 0, cursor: 'pointer' };

export function SeccionArbol({ titulo, icono: I, insignia, abierta, onToggle, marcada, onMarcar, children }: {
  titulo: string; icono: LucideIcon; insignia?: ReactNode; abierta: boolean; onToggle: (v: boolean) => void;
  marcada?: boolean; onMarcar?: (v: boolean) => void; children: ReactNode;
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-family-primary)' }}>
      <div onClick={() => onToggle(!abierta)} role="button" aria-expanded={abierta}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', cursor: 'pointer', background: abierta ? 'var(--muted)' : 'transparent', userSelect: 'none' }}>
        <span style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', flexShrink: 0, boxSizing: 'border-box' }}>
          {abierta ? <Minus size={10} strokeWidth={2.8} /> : <Plus size={10} strokeWidth={2.8} />}
        </span>
        {onMarcar && <input type="checkbox" checked={!!marcada} aria-label={`Mostrar ${titulo}`} onClick={e => e.stopPropagation()} onChange={e => onMarcar(e.target.checked)} style={chk} />}
        <I size={14} color={abierta ? 'var(--primary)' : 'var(--muted-foreground)'} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 'calc(11px * var(--escala-texto))', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo}</span>
        {insignia != null && <span style={{ fontSize: 'calc(10px * var(--escala-texto))', fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: abierta ? 'var(--card)' : 'var(--muted)', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{insignia}</span>}
      </div>
      {abierta && <div style={{ padding: '6px 8px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>{children}</div>}
    </div>
  );
}

export function FilaArbol({ etiqueta, meta, muestra, marcada, onMarcar, seleccionada, onClick, sangria = 0, fuerte }: {
  etiqueta: ReactNode; meta?: ReactNode; muestra?: ReactNode; marcada?: boolean; onMarcar?: (v: boolean) => void;
  seleccionada?: boolean; onClick?: () => void; sangria?: number; fuerte?: boolean;
}) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', paddingLeft: 8 + sangria * 18, borderRadius: 'var(--radius-sm)',
      cursor: onClick ? 'pointer' : 'default', opacity: marcada === false ? 0.55 : 1,
      background: seleccionada ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : h && onClick ? 'var(--muted)' : 'transparent',
    }}>
      {onMarcar && <input type="checkbox" checked={!!marcada} aria-label="Mostrar en el mapa" onClick={e => e.stopPropagation()} onChange={e => onMarcar(e.target.checked)} style={chk} />}
      {muestra}
      <span style={{
        flex: 1, minWidth: 0, fontSize: fuerte ? 11 : 12.5, fontWeight: fuerte ? 700 : seleccionada ? 600 : 500,
        textTransform: fuerte ? 'uppercase' : 'none', letterSpacing: fuerte ? '0.04em' : 0,
        color: seleccionada ? 'var(--primary)' : fuerte ? 'var(--muted-foreground)' : 'var(--foreground)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{etiqueta}</span>
      {meta != null && <span style={{ fontSize: 'calc(10.5px * var(--escala-texto))', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>{meta}</span>}
    </div>
  );
}

/* ── Barra de herramientas ── */
export type Herramienta = { id: string; icono: LucideIcon; etiqueta: string; disabled?: boolean } | { sep: true };

function BotonHerramienta({ t, activa, onSelect, chico }: { t: Extract<Herramienta, { id: string }>; activa: boolean; onSelect: (id: string) => void; chico?: boolean }) {
  const [h, setH] = useState(false);
  const I = t.icono;
  return (
    <button type="button" title={t.etiqueta} aria-label={t.etiqueta} aria-pressed={activa} disabled={t.disabled} onClick={() => onSelect(t.id)}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', height: chico ? 30 : 36, width: chico ? 30 : 36, padding: 0,
        borderRadius: 'var(--radius-md)', border: 'none', cursor: t.disabled ? 'not-allowed' : 'pointer', opacity: t.disabled ? 0.4 : 1,
        background: activa ? 'var(--primary)' : h ? 'var(--muted)' : 'transparent', color: activa ? 'var(--primary-foreground)' : 'var(--foreground)', transition: 'background .15s',
      }}>
      <I size={chico ? 14 : 16} />
    </button>
  );
}

/** `chico` = mobile (< 600 px, diseño CALÍVAR 04 §4.3): botones de 30 px, íconos de 14, barra más ajustada. */
export function BarraHerramientas({ herramientas, activa, onSelect, chico }: { herramientas: Herramienta[]; activa: string | null; onSelect: (id: string) => void; chico?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: chico ? 1 : 2, padding: chico ? 3 : 4, background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--elevation-md)', border: '1px solid var(--border)' }}>
      {herramientas.map((t, i) => 'sep' in t
        ? <div key={`s${i}`} style={{ height: 1, margin: '3px 4px', background: 'var(--border)' }} />
        : <BotonHerramienta key={t.id} t={t} activa={activa === t.id} onSelect={onSelect} chico={chico} />)}
    </div>
  );
}

/* ── Leyenda ── */
export type ItemLeyenda =
  | { tipo: 'linea' | 'area' | 'areaPunteada' | 'anillo'; color: string; etiqueta: string }
  | { tipo: 'brecha'; etiqueta: string }
  | { tipo: 'marcador'; simbolo: TipoSimbolo; etiqueta: string };

function Muestra({ it }: { it: ItemLeyenda }) {
  const b: CSSProperties = { flexShrink: 0, boxSizing: 'border-box' };
  switch (it.tipo) {
    case 'linea': return <span style={{ ...b, width: 18, height: 3, borderRadius: 2, background: it.color }} />;
    case 'area': return <span style={{ ...b, width: 16, height: 11, borderRadius: 3, background: `${it.color}40`, border: `1.5px solid ${it.color}` }} />;
    case 'areaPunteada': return <span style={{ ...b, width: 16, height: 11, borderRadius: 3, background: `${it.color}22`, border: `1.5px dashed ${it.color}` }} />;
    case 'anillo': return <span style={{ ...b, width: 14, height: 14, borderRadius: '50%', background: `${it.color}1a`, border: `1.5px solid ${it.color}` }} />;
    case 'brecha': return <span style={{ ...b, width: 16, height: 11, borderRadius: 2, background: 'rgba(220,38,38,0.38)' }} />;
    case 'marcador': return <Simbolo tipo={it.simbolo} />;
  }
}

export function Leyenda({ items, abiertaInicial }: { items: ItemLeyenda[]; abiertaInicial: boolean }) {
  const [o, setO] = useState(abiertaInicial);
  return (
    <div style={{ width: 220, background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)', fontFamily: 'var(--font-family-primary)', overflow: 'hidden' }}>
      <button type="button" onClick={() => setO(!o)} aria-expanded={o} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-primary)' }}>
        <span style={{ fontSize: 'calc(10.5px * var(--escala-texto))', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>Simbología táctica</span>
        {o ? <ChevronDown size={14} color="var(--muted-foreground)" /> : <ChevronUp size={14} color="var(--muted-foreground)" />}
      </button>
      {o && <div style={{ padding: '2px 12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 'calc(11.5px * var(--escala-texto))', color: 'var(--foreground)' }}>
            <span style={{ width: 18, display: 'flex', justifyContent: 'center' }}><Muestra it={it} /></span>{it.etiqueta}
          </div>
        ))}
      </div>}
    </div>
  );
}

/* ── Cobertura y perfil ── */
export function BarraCobertura({ valor }: { valor: number }) {
  const v = Math.max(0, Math.min(100, valor));
  const c = v >= 75 ? '#16a34a' : v >= 40 ? '#ca8a04' : '#dc2626';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <span style={{ fontSize: 'var(--text-h3)', fontWeight: 700, color: 'var(--foreground)' }}>{v.toLocaleString('es-AR', { maximumFractionDigits: v < 10 ? 1 : 0 })} %</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--muted)', overflow: 'hidden' }}>
        <div style={{ width: `${v}%`, height: '100%', borderRadius: 999, background: c, transition: 'width .6s ease' }} />
      </div>
    </div>
  );
}

export function PerfilElevacion({ valores, distancias, color }: { valores: number[]; distancias: number[]; color: string }) {
  if (valores.length < 2) return null;
  const ancho = 272, alto = 64;
  const min = Math.min(...valores), max = Math.max(...valores), rango = max - min || 1;
  const dmax = distancias[distancias.length - 1] || 1;
  const x = (i: number) => (distancias[i] / dmax) * ancho;
  const y = (v: number) => 6 + (1 - (v - min) / rango) * (alto - 12);
  const linea = valores.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" style={{ display: 'block', height: alto, borderRadius: 'var(--radius-md)', background: 'var(--muted)' }} aria-label="Perfil de elevación">
        <path d={`${linea}L${ancho},${alto}L0,${alto}Z`} fill={color} fillOpacity="0.18" />
        <path d={linea} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 'calc(10px * var(--escala-texto))', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono, monospace)' }}>
        <span>0 km</span><span>{Math.round(min).toLocaleString('es-AR')}–{Math.round(max).toLocaleString('es-AR')} m</span>
        <span>{(dmax / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km</span>
      </div>
    </div>
  );
}

/* ── Globo (popup) y panel de detalle ── */
export function Globo({ chip, color, rotuloSup, titulo, subtitulo, onClose, children, acciones, centrado }: {
  chip?: ReactNode; color: string; rotuloSup: string; titulo?: ReactNode; subtitulo?: ReactNode; onClose: () => void;
  children?: ReactNode; acciones?: ReactNode; centrado?: boolean;
}) {
  return (
    <div style={{ width: 300, fontFamily: 'var(--font-family-primary)', color: 'var(--foreground)' }}>
      <div style={{ display: 'flex', gap: 10, padding: '14px 14px 10px', alignItems: centrado ? 'center' : 'flex-start' }}>
        {chip}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 'calc(10.5px * var(--escala-texto))', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color }}>{rotuloSup}</p>
          {titulo && <p style={{ margin: '1px 0 0', fontSize: 'calc(14px * var(--escala-texto))', fontWeight: 600, lineHeight: 1.3 }}>{titulo}</p>}
          {subtitulo && <p style={{ margin: '2px 0 0', fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{subtitulo}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><X size={15} /></button>
      </div>
      {children && <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>}
      {acciones && <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderTop: '1px solid var(--border)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>{acciones}</div>}
    </div>
  );
}

export function PanelDetalle({ chip, titulo, insignia, onClose, sub, children, pie }: {
  chip: ReactNode; titulo: ReactNode; insignia?: ReactNode; onClose: () => void; sub?: ReactNode; children: ReactNode; pie?: ReactNode;
}) {
  return (
    <aside aria-label="Detalle" className="mapa-detalle" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 340, maxWidth: '100%', zIndex: 800, display: 'flex', flexDirection: 'column', background: 'var(--card)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--elevation-md)', fontFamily: 'var(--font-family-primary)' }}>
      {/* Título y cerrar centrados verticalmente con el ícono del elemento (04 §4.4) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 16, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{ display: 'flex', flexShrink: 0 }}>{chip}</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 'calc(14px * var(--escala-texto))', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.25, wordBreak: 'break-word' }}>{titulo}</p>
            {insignia && <div style={{ marginTop: 5 }}>{insignia}</div>}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><X size={16} /></button>
      </div>
      {sub && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--muted)', borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono, monospace)', fontSize: 'calc(11px * var(--escala-texto))' }}><Crosshair size={12} />{sub}</div>}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
      {pie && <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>{pie}</div>}
    </aside>
  );
}

export const chipIcono = (I: LucideIcon, color: string) => (
  <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${color} 12%, transparent)`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I size={14} /></span>
);
export const pastilla = (txt: string, color: string) => (
  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: `color-mix(in srgb, ${color} 12%, transparent)`, color, fontSize: 'calc(10px * var(--escala-texto))', fontWeight: 600 }}>{txt}</span>
);
export const dato = (l: string, v: ReactNode) => (
  <div><p style={{ margin: 0, fontSize: 'calc(10px * var(--escala-texto))', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>{l}</p><p style={{ margin: '2px 0 0', fontSize: 'calc(13px * var(--escala-texto))', fontWeight: 700, color: 'var(--foreground)' }}>{v}</p></div>
);
