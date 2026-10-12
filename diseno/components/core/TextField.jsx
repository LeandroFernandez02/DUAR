import React from 'react';

export function TextField({ label, value, onChange, placeholder, multiline, rows = 4, required, overline, type = 'text', readOnly, style }) {
  const box = {
    width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 'var(--radius-input)', outline: 'none',
    background: 'var(--input-background)', border: '1px solid var(--border)', color: 'var(--foreground)',
    fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', lineHeight: multiline ? 1.55 : 1.5, resize: 'none',
  };
  const lab = overline
    ? { color: 'var(--muted-foreground)', fontSize: 11, fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }
    : { color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' };
  const h = e => onChange && onChange(e.target.value);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-family-primary)', ...style }}>
      {label && <span style={{ ...lab, lineHeight: 1.5 }}>{label}{required ? ' *' : ''}</span>}
      {multiline
        ? <textarea rows={rows} value={value} onChange={h} placeholder={placeholder} readOnly={readOnly} style={box} />
        : <input type={type} value={value} onChange={h} placeholder={placeholder} readOnly={readOnly} style={box} />}
    </label>
  );
}
