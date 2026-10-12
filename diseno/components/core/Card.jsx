import React from 'react';

export function Card({ children, padding = 20, elevated = true, dashed, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--card)', color: 'var(--card-foreground)', borderRadius: 'var(--radius-card)',
      boxShadow: elevated && !dashed ? 'var(--elevation-sm)' : 'none', border: dashed ? '1px dashed var(--border)' : '1px solid transparent',
      padding, fontFamily: 'var(--font-family-primary)', ...style,
    }}>{children}</div>
  );
}
