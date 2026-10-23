/**
 * Botón del sistema (diseño CALÍVAR, 23/10): acciones del encabezado, pies de ventanas y paneles.
 *  · primary = acción principal (turquesa, texto azul noche) · soft = tinte turquesa (p. ej. «Objetivo» cargado)
 *  · muted = acciones grises del encabezado (QR, Informe) · outline = «Cancelar» de una ventana
 *  · ghost = sólo ícono o texto · danger = confirmar algo que no se deshace.
 * Radio 8, borde 1,5 px. Al pasar el mouse el primario baja a .88 de opacidad; sin «achicarse» al presionar.
 */
import { useState, type CSSProperties, type ReactNode, type MouseEvent } from 'react';
import type { LucideIcon } from 'lucide-react';

type Variante = 'primary' | 'soft' | 'muted' | 'outline' | 'ghost' | 'danger';

const V: Record<Variante, { bg: string; fg: string; bd: string; hover: CSSProperties }> = {
  primary: { bg: 'var(--primary)', fg: 'var(--primary-foreground)', bd: 'var(--primary)', hover: { opacity: 0.88 } },
  soft:    { bg: 'color-mix(in srgb, var(--primary) 10%, transparent)', fg: 'var(--primary)', bd: 'color-mix(in srgb, var(--primary) 35%, transparent)', hover: { background: 'color-mix(in srgb, var(--primary) 18%, transparent)' } },
  muted:   { bg: 'var(--muted)', fg: 'var(--foreground)', bd: 'var(--border)', hover: { background: 'var(--border)', borderColor: 'var(--muted-foreground)' } },
  outline: { bg: 'var(--card)', fg: 'var(--foreground)', bd: 'var(--border)', hover: { borderColor: 'var(--foreground)' } },
  ghost:   { bg: 'transparent', fg: 'var(--muted-foreground)', bd: 'transparent', hover: { color: 'var(--foreground)', background: 'var(--muted)' } },
  danger:  { bg: 'var(--destructive)', fg: 'var(--destructive-foreground)', bd: 'var(--destructive)', hover: { opacity: 0.88 } },
};

export interface ButtonProps {
  variant?: Variante;
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  children?: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  type?: 'button' | 'submit';
  style?: CSSProperties;
  'aria-label'?: string;
}

export default function Button({ variant = 'primary', size = 'sm', icon: I, iconRight: D, children, disabled, fullWidth, onClick, title, type = 'button', style, ...resto }: ButtonProps) {
  const [h, setH] = useState(false);
  const v = V[variant];
  const off = !!disabled;
  return (
    <button type={type} title={title} disabled={off} onClick={onClick} aria-label={resto['aria-label']}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: size === 'md' ? '8px 16px' : size === 'lg' ? '10px 16px' : '6px 12px',
        borderRadius: 'var(--radius-button)', border: `1.5px solid ${off ? 'var(--border)' : v.bd}`,
        background: off ? 'var(--muted)' : v.bg, color: off ? 'var(--muted-foreground)' : v.fg,
        fontFamily: 'var(--font-family-primary)', fontSize: size === 'lg' ? 'var(--text-base)' : 'var(--text-label)',
        fontWeight: 'var(--font-weight-semibold)', lineHeight: 1.5,
        cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.55 : 1, transition: 'all .15s ease',
        width: fullWidth ? '100%' : undefined, whiteSpace: 'nowrap',
        ...(h && !off ? v.hover : null), ...style,
      }}>
      {I && <I size={13} />}
      {children}
      {D && <D size={13} />}
    </button>
  );
}
