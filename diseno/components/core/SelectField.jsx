import React from 'react';

export function SelectField({ label, value, onChange, options = [], required, overline, disabled, style }) {
  const lab = overline
    ? { color: 'var(--muted-foreground)', fontSize: 11, fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }
    : { color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' };
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-family-primary)', ...style }}>
      {label && <span style={{ ...lab, lineHeight: 1.5 }}>{label}{required ? ' *' : ''}</span>}
      <select value={value} disabled={disabled} onChange={e => onChange && onChange(e.target.value)} style={{
        width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 'var(--radius-input)', outline: 'none',
        background: 'var(--input-background)', border: '1px solid var(--border)', color: 'var(--foreground)',
        fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', lineHeight: 1.5, opacity: disabled ? 0.55 : 1,
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
