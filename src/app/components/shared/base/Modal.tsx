/**
 * Ventana del sistema (diseño CALÍVAR, 23/10): radio 14, sombra de ventana, fondo oscurecido al .65.
 * Cabecera con ícono turquesa, título y subtítulo, y la X; cuerpo con scroll; pie con las acciones a
 * la derecha («Cancelar» + la principal). Esc y tocar afuera la cierran.
 */
import { useEffect, type ReactNode } from 'react';
import { X, type LucideIcon } from 'lucide-react';

export default function Modal({ title, subtitle, icon: I, onClose, children, footer, width = 520, open = true }: {
  title: string; subtitle?: string; icon?: LucideIcon; onClose?: () => void;
  children?: ReactNode; footer?: ReactNode; width?: number; open?: boolean;
}) {
  useEffect(() => {
    if (!open || !onClose) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
      className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999, background: 'var(--scrim-modal)' }}>
      <div role="dialog" aria-modal="true" aria-label={title} style={{
        width: `min(92vw, ${width}px)`, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--card)', color: 'var(--card-foreground)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)',
        boxShadow: 'var(--elevation-modal)', fontFamily: 'var(--font-family-primary)',
      }}>
        <div className="flex items-start justify-between gap-3" style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-2.5 items-start min-w-0">
            {I && <span style={{ color: 'var(--primary)', marginTop: 2 }}><I size={16} /></span>}
            <div className="min-w-0">
              <p style={{ margin: 0, fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 1.4 }}>{title}</p>
              {subtitle && <p style={{ margin: '2px 0 0', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>{subtitle}</p>}
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Cerrar" className="flex"
              style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--muted-foreground)' }}>
              <X size={18} />
            </button>
          )}
        </div>
        <div style={{ padding: 20, overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>{children}</div>
        {footer && <div className="flex justify-end items-center gap-2" style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>{footer}</div>}
      </div>
    </div>
  );
}
