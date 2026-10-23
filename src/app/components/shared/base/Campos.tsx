/**
 * Campos de formulario del sistema (diseño CALÍVAR, 23/10): TextField (una línea o varias) y
 * SelectField (<select> nativo con el mismo estilo de input). El rótulo va arriba: normal
 * (12 px, 600) o `overline` (11 px en mayúsculas, gris), como en los paneles del mapa.
 */
import type { CSSProperties } from 'react';

const caja: CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 'var(--radius-input)', outline: 'none',
  background: 'var(--input-background)', border: '1px solid var(--border)', color: 'var(--foreground)',
  fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', lineHeight: 1.5, resize: 'none',
};

function Rotulo({ texto, requerido, overline }: { texto: string; requerido?: boolean; overline?: boolean }) {
  const st: CSSProperties = overline
    ? { color: 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto))', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-overline)' }
    : { color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' };
  return <span style={{ ...st, lineHeight: 1.5 }}>{texto}{requerido ? ' *' : ''}</span>;
}

const contenedor = (style?: CSSProperties): CSSProperties => ({ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-family-primary)', ...style });

export function TextField({ label, value, onChange, placeholder, multiline, rows = 4, required, overline, type = 'text', readOnly, style }: {
  label?: string; value: string; onChange?: (v: string) => void; placeholder?: string; multiline?: boolean; rows?: number;
  required?: boolean; overline?: boolean; type?: string; readOnly?: boolean; style?: CSSProperties;
}) {
  const h = (e: { target: { value: string } }) => onChange?.(e.target.value);
  return (
    <label style={contenedor(style)}>
      {label && <Rotulo texto={label} requerido={required} overline={overline} />}
      {multiline
        ? <textarea rows={rows} value={value} onChange={h} placeholder={placeholder} readOnly={readOnly} style={{ ...caja, lineHeight: 1.55 }} />
        : <input type={type} value={value} onChange={h} placeholder={placeholder} readOnly={readOnly} style={caja} />}
    </label>
  );
}

export function SelectField({ label, value, onChange, options, required, overline, disabled, style }: {
  label?: string; value: string; onChange?: (v: string) => void; options: { value: string; label: string }[];
  required?: boolean; overline?: boolean; disabled?: boolean; style?: CSSProperties;
}) {
  return (
    <label style={contenedor(style)}>
      {label && <Rotulo texto={label} requerido={required} overline={overline} />}
      <select value={value} disabled={disabled} onChange={e => onChange?.(e.target.value)} style={{ ...caja, padding: '8px 10px', opacity: disabled ? 0.55 : 1 }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
