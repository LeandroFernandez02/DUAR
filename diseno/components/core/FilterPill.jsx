import React from 'react';

export function FilterPill({ children, count, selected, onClick, dot }) {
  return (
    <button type="button" role="radio" aria-checked={!!selected} onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999,
      border: selected ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
      background: selected ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent',
      color: selected ? 'var(--primary)' : 'var(--muted-foreground)',
      fontSize: 11, fontFamily: 'var(--font-family-primary)', cursor: 'pointer',
      fontWeight: selected ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)', lineHeight: 1.5,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />}
      {children}
      {count != null && <span style={{ fontSize: 10, padding: '0 5px', borderRadius: 999, background: selected ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'var(--muted)' }}>{count}</span>}
    </button>
  );
}
