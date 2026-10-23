/**
 * Tarjeta del sistema (diseño CALÍVAR, 23/10): fondo de tarjeta, radio 14, sombra suave.
 * `dashed` = caja punteada sin sombra (estados vacíos, «Soltar para sumar al grupo»).
 */
import type { CSSProperties, ReactNode } from 'react';

export default function Card({ children, padding = 20, elevated = true, dashed, style, onClick }: {
  children?: ReactNode; padding?: number | string; elevated?: boolean; dashed?: boolean; style?: CSSProperties; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--card)', color: 'var(--card-foreground)', borderRadius: 'var(--radius-card)',
      boxShadow: elevated && !dashed ? 'var(--elevation-sm)' : 'none',
      border: dashed ? '1px dashed var(--border)' : '1px solid var(--card-border)',
      padding, fontFamily: 'var(--font-family-primary)', ...style,
    }}>{children}</div>
  );
}
