/**
 * Piezas de las pantallas de acceso (diseño CALÍVAR, 23/10): iniciar sesión, recuperar
 * contraseña, alta por QR, confirmar correo y nueva contraseña. Todas van en `MarcoAcceso`:
 * logo vertical arriba y una tarjeta centrada de 420 px.
 */
import { useState, type ReactNode, type InputHTMLAttributes } from 'react';
import { AlertCircle, ChevronDown, Eye, EyeOff, Lock, type LucideIcon } from 'lucide-react';
import Logo from '../layout/Logo';
import CampoFecha from '../shared/CampoFecha';

const campoBase = (borde: string, foco: boolean, error: boolean, conIcono: boolean, derecha: boolean) => ({
  width: '100%', boxSizing: 'border-box', height: 46, padding: `0 ${derecha ? 42 : 12}px 0 ${conIcono ? 38 : 12}px`,
  borderRadius: 'var(--radius-input)', outline: 'none', background: 'var(--input-background)', border: `1px solid ${borde}`,
  boxShadow: foco || error ? `0 0 0 3px color-mix(in srgb, ${error ? 'var(--destructive)' : 'var(--primary)'} 16%, transparent)` : 'none',
  color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', transition: 'border-color .15s, box-shadow .15s',
} as const);

function Rotulo({ texto, requerido }: { texto: string; requerido?: boolean }) {
  return <span style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--foreground)' }}>{texto}{requerido && ' *'}</span>;
}
function PieCampo({ error, ayuda }: { error?: string; ayuda?: string }) {
  if (error) return <span role="alert" className="flex items-center gap-1.5" style={{ fontSize: 'var(--text-label)', color: 'var(--destructive)' }}><AlertCircle size={13} />{error}</span>;
  if (ayuda) return <span style={{ fontSize: 'var(--text-small)', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>{ayuda}</span>;
  return null;
}

type PropsCampo = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  label: string; icono?: LucideIcon; value: string; onChange: (v: string, el: HTMLInputElement) => void;
  requerido?: boolean; error?: string; ayuda?: string; derecha?: ReactNode;
};

/** Campo de texto de acceso: rótulo arriba, ícono a la izquierda, anillo turquesa al enfocar (rojo con error). */
export function CampoAcceso({ label, icono: I, value, onChange, requerido, error, ayuda, derecha, onFocus, onBlur, ...resto }: PropsCampo) {
  const [foco, setFoco] = useState(false);
  const borde = error ? 'var(--destructive)' : foco ? 'var(--primary)' : 'var(--border)';
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <Rotulo texto={label} requerido={requerido} />
      <span className="relative block">
        {I && <span className="absolute flex pointer-events-none" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: error ? 'var(--destructive)' : 'var(--muted-foreground)' }}><I size={16} /></span>}
        <input {...resto} value={value} aria-invalid={!!error} onChange={e => onChange(e.target.value, e.target)}
          onFocus={e => { setFoco(true); onFocus?.(e); }} onBlur={e => { setFoco(false); onBlur?.(e); }}
          style={campoBase(borde, foco, !!error, !!I, !!derecha)} />
        {derecha}
      </span>
      <PieCampo error={error} ayuda={ayuda} />
    </label>
  );
}

/** Contraseña con candado a la izquierda; el ojito para verla aparece recién al escribir (Testeo 15/10, puntos 21 y 26). */
export function CampoContrasenaAcceso({ icono = Lock, ...props }: Omit<PropsCampo, 'type' | 'derecha'> & { icono?: LucideIcon }) {
  const [ver, setVer] = useState(false);
  const hayTexto = props.value.length > 0;
  return (
    <CampoAcceso {...props} icono={icono} type={ver && hayTexto ? 'text' : 'password'}
      derecha={hayTexto ? (
        <button type="button" onClick={() => setVer(v => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute flex items-center justify-center"
          style={{ right: 6, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', borderRadius: 8 }}>
          {ver ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      ) : undefined} />
  );
}

/** Fecha de nacimiento (CampoFecha: sólo números, DD/MM/AAAA) con el estilo de acceso. */
export function CampoFechaAcceso({ label, value, onChange, requerido, error, ayuda }: { label: string; value: string; onChange: (v: string) => void; requerido?: boolean; error?: string; ayuda?: string }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <Rotulo texto={label} requerido={requerido} />
      <CampoFecha value={value} onChange={onChange} style={campoBase(error ? 'var(--destructive)' : 'var(--border)', false, !!error, false, true)} />
      <PieCampo error={error} ayuda={ayuda} />
    </div>
  );
}

/** <select> nativo con el estilo de acceso y la flecha propia. */
export function SelectAcceso({ label, value, onChange, opciones, requerido, error, placeholder = 'Seleccioná una opción' }: {
  label: string; value: string; onChange: (v: string) => void; opciones: { value: string; label: string }[];
  requerido?: boolean; error?: string; placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <Rotulo texto={label} requerido={requerido} />
      <span className="relative block">
        <select value={value} onChange={e => onChange(e.target.value)} aria-invalid={!!error}
          style={{ ...campoBase(error ? 'var(--destructive)' : 'var(--border)', false, !!error, false, true), padding: '0 36px 0 12px', appearance: 'none', color: value ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
          <option value="">{placeholder}</option>
          {opciones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="absolute flex pointer-events-none" style={{ right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}><ChevronDown size={16} /></span>
      </span>
      <PieCampo error={error} />
    </label>
  );
}

/** Aviso de acceso: error (rojo), aviso (amarillo) o información (turquesa). */
export function AlertaAcceso({ tono = 'error', icono: I = AlertCircle, titulo, children }: { tono?: 'error' | 'aviso' | 'info'; icono?: LucideIcon; titulo?: string; children?: ReactNode }) {
  const c = tono === 'aviso' ? '#ca8a04' : tono === 'info' ? 'var(--primary)' : 'var(--destructive)';
  return (
    <div role="alert" className="flex items-start gap-2.5"
      style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${c} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 30%, transparent)`,
        color: tono === 'info' ? 'var(--foreground)' : tono === 'aviso' ? 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #854d0e)' : c, fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
      <I size={16} style={{ marginTop: 1, flexShrink: 0 }} />
      <span>{titulo && <strong className="block" style={{ color: 'var(--foreground)' }}>{titulo}</strong>}{children}</span>
    </div>
  );
}

/** Botón de ancho completo, 46 px: primario (turquesa) o secundario (tarjeta con borde). */
export function BotonAcceso({ children, onClick, type = 'button', tono = 'primario', cargando, deshabilitado, icono: I }: {
  children: ReactNode; onClick?: () => void; type?: 'button' | 'submit'; tono?: 'primario' | 'secundario'; cargando?: boolean; deshabilitado?: boolean; icono?: LucideIcon;
}) {
  const p = tono === 'primario';
  const off = cargando || deshabilitado;
  return (
    <button type={type} onClick={onClick} disabled={off} className="flex items-center justify-center gap-2 w-full"
      style={{ height: 46, border: p ? 'none' : '1px solid var(--border)', borderRadius: 'var(--radius-button)', background: p ? 'var(--primary)' : 'var(--card)',
        color: p ? 'var(--primary-foreground)' : deshabilitado ? 'var(--muted-foreground)' : 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', fontWeight: 600,
        cursor: cargando ? 'wait' : deshabilitado ? 'not-allowed' : 'pointer', opacity: off ? 0.7 : 1 }}>
      {I && <I size={16} />}{children}
    </button>
  );
}

/** Enlace de texto subrayado en turquesa («¿Olvidó su contraseña?», «Volver»). */
export function EnlaceAcceso({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="self-center"
      style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: 'var(--primary)' }}>
      {children}
    </button>
  );
}

/** Layout de todas las pantallas de acceso: logo vertical y tarjeta centrada; `arriba` va entre los dos (p. ej. el operativo del QR). */
export function MarcoAcceso({ children, pie, arriba }: { children: ReactNode; pie?: ReactNode; arriba?: ReactNode }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '100dvh', padding: '32px 20px', background: 'var(--background)', fontFamily: 'var(--font-family-primary)', color: 'var(--foreground)' }}>
      <div className="w-full flex flex-col items-center gap-6" style={{ maxWidth: 420 }}>
        <div className="flex flex-col items-center" style={{ gap: 8 }}>
          <Logo variante="vertical" tono="auto" ancho={160} alto={100} />
          {/* «DUAR» es texto, no parte de la imagen. El padding-left iguala al letter-spacing para que quede centrado. */}
          <span style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', fontWeight: 500, letterSpacing: '0.6em', paddingLeft: '0.6em', color: 'var(--muted-foreground)' }}>DUAR</span>
        </div>
        {arriba}
        <div className="w-full flex flex-col gap-4" style={{ background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-sm)', padding: 28 }}>
          {children}
        </div>
        {pie && <p className="text-center" style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>{pie}</p>}
      </div>
    </div>
  );
}

/** Título de la tarjeta: ícono opcional en un cuadrado turquesa, título y texto. */
export function TituloAcceso({ icono: I, titulo, texto, colorIcono }: { icono?: LucideIcon; titulo: string; texto?: ReactNode; colorIcono?: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      {I && (
        <span className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 14, marginBottom: 16,
          background: `color-mix(in srgb, ${colorIcono ?? 'var(--primary)'} 14%, transparent)`, color: colorIcono ?? 'var(--foreground)' }}>
          <I size={22} />
        </span>
      )}
      <h1 style={{ margin: '0 0 4px', fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--foreground)' }}>{titulo}</h1>
      {texto && <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>{texto}</p>}
    </div>
  );
}

/** Separador «o» entre dos opciones. */
export function SeparadorO() {
  return (
    <div aria-hidden="true" className="flex items-center gap-2.5" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-small)' }}>
      <span className="flex-1" style={{ height: 1, background: 'var(--border)' }} />o<span className="flex-1" style={{ height: 1, background: 'var(--border)' }} />
    </div>
  );
}
