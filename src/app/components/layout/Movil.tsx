/**
 * Layout de mobile y tablet (< 1024 px, diseño CALÍVAR del 23/10): barra superior con el título
 * de la sección, menú inferior azul noche con Perfil a la derecha y la hoja de Perfil (modo
 * oscuro, accesibilidad, Mis datos, cerrar sesión). En escritorio lo reemplaza el Sidebar.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight, LogOut, Moon, Sun } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import AccesibilidadPanel from './AccesibilidadPanel';
import type { NavItem } from './Sidebar';

const sombra = { background: 'var(--cabecera-movil)', borderRadius: '0 0 20px 20px', boxShadow: 'var(--cabecera-movil-sombra)' } as const;

/** Lugar del botón de acción de la pantalla (Nuevo Operativo / Nuevo Usuario) dentro de la barra superior. */
export const ID_ACCION_CABECERA = 'cabecera-accion';

/**
 * Pone su contenido en la barra superior cuando la pantalla es compacta; si no hay barra
 * (escritorio), lo deja donde está. En < 600 px el botón queda sólo con el ícono (theme.css).
 */
export function AccionCabecera({ children }: { children: ReactNode }) {
  const [destino, setDestino] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const buscar = () => setDestino(document.getElementById(ID_ACCION_CABECERA));
    buscar();
    const mo = new MutationObserver(buscar);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return destino ? createPortal(children, destino) : <>{children}</>;
}

/** Barra superior. Fuera de un operativo: título + leyenda + acción. Dentro: volver + encabezado del operativo. */
export function CabeceraMovil({ titulo, subtitulo, onVolver, children }: { titulo?: string; subtitulo?: string; onVolver?: () => void; children?: ReactNode }) {
  const volver = onVolver && (
    <button type="button" onClick={onVolver} aria-label="Volver a Operativos" className="flex items-center justify-center shrink-0"
      style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--muted)', color: 'var(--foreground)', cursor: 'pointer', marginTop: children ? 10 : 0 }}>
      <ChevronLeft size={18} />
    </button>
  );
  if (children) return (
    <header className="flex items-start gap-1 shrink-0 relative" style={{ ...sombra, zIndex: 5, padding: 'calc(env(safe-area-inset-top) + 10px) 12px 6px 8px' }}>
      {volver}
      <div className="cabecera-op flex-1 min-w-0">{children}</div>
    </header>
  );
  return (
    <header className="flex flex-col shrink-0 relative" style={{ ...sombra, zIndex: 5, padding: 'calc(env(safe-area-inset-top) + 20px) 16px 0' }}>
      <div className="flex items-center gap-2 min-w-0" style={{ paddingBottom: 20 }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {volver}
          <div className="min-w-0">
            <h2 style={{ margin: 0, fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.2 }}>{titulo}</h2>
            {subtitulo && <p className="truncate" style={{ margin: '2px 0 0', fontSize: 'var(--text-label)', color: 'var(--cabecera-movil-sub, var(--muted-foreground))' }}>{subtitulo}</p>}
          </div>
        </div>
        <div id={ID_ACCION_CABECERA} className="flex items-center shrink-0" style={{ height: 0, overflow: 'visible' }} />
      </div>
    </header>
  );
}

/** Menú inferior: secciones del contexto y Perfil a la derecha. Celdas de 56 px; la activa con píldora turquesa. */
export function BarraInferior({ items, activo, perfilAbierto, onPerfil, onNavegar }: {
  items: NavItem[]; activo: (path: string) => boolean; perfilAbierto: boolean; onPerfil: () => void; onNavegar: () => void;
}) {
  const { usuario } = useApp();
  const ini = usuario ? `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase() : '??';
  const celda = {
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 56,
    border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-primary)', fontSize: 'calc(11px * var(--escala-texto))',
    fontWeight: 600, padding: '6px 2px', color: 'var(--sidebar-foreground)', textDecoration: 'none',
  } as const;
  return (
    <nav aria-label="Secciones" className="flex items-stretch shrink-0 relative"
      style={{ zIndex: 60, background: 'var(--sidebar)', borderTop: '1px solid var(--sidebar-border)', padding: '0 6px env(safe-area-inset-bottom)' }}>
      {items.map(it => {
        const on = activo(it.path);
        return (
          <Link key={it.path} to={it.path} onClick={onNavegar} aria-current={on ? 'page' : undefined} style={{ ...celda, opacity: on ? 1 : 'var(--sidebar-dim)' }}>
            <span className="flex items-center justify-center" style={{ width: 52, height: 28, borderRadius: 999, background: on ? 'var(--sidebar-activo)' : 'transparent', color: on ? 'var(--primary-foreground)' : 'inherit', transition: 'background .15s' }}>
              <it.icono size={20} />
            </span>
            <span className="truncate" style={{ maxWidth: '100%' }}>{it.label}</span>
          </Link>
        );
      })}
      <button type="button" onClick={onPerfil} aria-label="Perfil" aria-expanded={perfilAbierto} style={{ ...celda, opacity: perfilAbierto ? 1 : 'var(--sidebar-dim)' }}>
        <span className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'var(--primary-foreground)', fontSize: 'calc(10.5px * var(--escala-texto))', fontWeight: 700, boxShadow: perfilAbierto ? '0 0 0 2px var(--sidebar), 0 0 0 4px var(--primary)' : 'none' }}>{ini}</span>
        Perfil
      </button>
    </nav>
  );
}

function Interruptor({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className="flex shrink-0" style={{ width: 40, height: 24, borderRadius: 999, padding: 2, boxSizing: 'border-box', background: on ? 'var(--primary)' : 'var(--muted)', border: '1px solid var(--border)', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'all .15s' }}>
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
    </span>
  );
}

/** Hoja de Perfil: sube desde abajo sobre el menú. Cabecera con la cuenta (abre Mis datos) y cerrar sesión. */
export function HojaPerfil({ onCerrar, onVerDatos, onSalir, sinFoco = false }: { onCerrar: () => void; onVerDatos: () => void; onSalir: () => void; sinFoco?: boolean }) {
  const { usuario, isDark, toggleDark } = useApp();
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onCerrar]);
  if (!usuario) return null;
  const ini = `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase();
  const fila = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 52, padding: '0 14px', border: 'none', borderRadius: 'var(--radius-md)',
    background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', color: 'var(--popover-foreground)',
  } as const;
  return (
    <>
      <div onClick={onCerrar} className="fixed inset-0" style={{ zIndex: 55, background: 'var(--scrim-hoja)' }} aria-hidden="true" />
      <div role="dialog" aria-label="Perfil" className="fixed left-0 right-0 overflow-y-auto"
        style={{ zIndex: 56, bottom: 'calc(57px + env(safe-area-inset-bottom))', background: 'var(--popover)', color: 'var(--popover-foreground)', borderRadius: '20px 20px 0 0', boxShadow: 'var(--elevation-md)', padding: '8px 12px 12px', maxHeight: '88%', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border)', margin: '2px auto 14px' }} />
        <div className="flex items-center gap-3" style={{ padding: '0 14px 14px', borderBottom: '1px solid var(--border)' }}>
          <button type="button" onClick={onVerDatos} aria-label="Ver mis datos" className="flex-1 min-w-0 flex items-center gap-3 text-left"
            style={{ padding: 6, margin: -6, borderRadius: 14, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-family-primary)', color: 'inherit' }}>
            <span className="flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--sidebar)', color: 'var(--sidebar-foreground)', fontSize: 'calc(15px * var(--escala-texto))', fontWeight: 700 }}>{ini}</span>
            <div className="min-w-0 flex-1">
              <p style={{ margin: 0, fontSize: 'var(--text-h4)', fontWeight: 600 }}>{usuario.nombre} {usuario.apellido}</p>
              <p className="truncate" style={{ margin: '1px 0 0', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>{usuario.email}</p>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--muted-foreground)' }} />
          </button>
          <button type="button" onClick={onSalir} aria-label="Cerrar sesión" title="Cerrar sesión" className="flex items-center justify-center shrink-0"
            style={{ width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'color-mix(in srgb, var(--destructive) 10%, transparent)', color: 'var(--destructive)' }}>
            <LogOut size={19} />
          </button>
        </div>
        <div className="flex flex-col gap-0.5" style={{ paddingTop: 8 }}>
          <button type="button" role="switch" aria-checked={isDark} onClick={toggleDark} style={fila}>
            {isDark ? <Sun size={18} style={{ color: 'var(--muted-foreground)' }} /> : <Moon size={18} style={{ color: 'var(--muted-foreground)' }} />}
            <span className="flex-1">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
            <Interruptor on={isDark} />
          </button>
          <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0 4px', paddingTop: 10 }}>
            <p style={{ margin: '0 14px 4px', fontSize: 'var(--text-micro)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Accesibilidad</p>
            <AccesibilidadPanel tactil sinFoco={sinFoco} />
          </div>
        </div>
      </div>
    </>
  );
}
