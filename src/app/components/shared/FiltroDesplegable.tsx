/**
 * Filtro desplegable de selección múltiple (02/10), compartido por Agentes y
 * Operativos. Cerrado es una sola píldora ("Estado ▾", o "Estado: Disponible,
 * Agrupado" si hay elegidos); abierto, las opciones son píldoras que se marcan
 * de a varias. Dentro de un filtro se suma (A O B); entre filtros se cruza (Y).
 *
 * `atajos` son píldoras que marcan un grupo de opciones de una vez (ej.
 * "Vigentes" = nuevo + en planificación + en proceso + activo). Un atajo se ve
 * marcado cuando la selección es exactamente ese grupo, y entonces el resumen
 * de la píldora cerrada usa su nombre.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface OpcionFiltro<T extends string> {
  value: T;
  label: string;
  count: number;
  dot?: string | null;
}

export interface AtajoFiltro<T extends string> {
  label: string;
  valores: T[];
  count: number;
}

const igual = <T extends string>(a: T[], b: T[]) => a.length === b.length && a.every(x => b.includes(x));

export default function FiltroDesplegable<T extends string>({ titulo, opciones, seleccion, onCambiar, atajos = [] }: {
  titulo: string;
  opciones: OpcionFiltro<T>[];
  seleccion: T[];
  onCambiar: (v: T[]) => void;
  atajos?: AtajoFiltro<T>[];
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);

  const alternar = (v: T) => onCambiar(seleccion.includes(v) ? seleccion.filter(x => x !== v) : [...seleccion, v]);
  const elegidas = opciones.filter(o => seleccion.includes(o.value));
  const atajoActivo = atajos.find(a => igual(a.valores, seleccion));
  const resumen = elegidas.length === 0 ? ''
    : atajoActivo ? atajoActivo.label
    : elegidas.length <= 2 ? elegidas.map(o => o.label).join(', ')
    : `${elegidas.length} seleccionados`;
  const activo = elegidas.length > 0;

  const pildora = (sel: boolean) => ({
    border: sel ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
    background: sel ? 'rgba(229,75,75,0.08)' : 'transparent',
    color: sel ? 'var(--primary)' : 'var(--muted-foreground)',
    fontSize: 'var(--text-label)',
    fontWeight: sel ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
    cursor: 'pointer', transition: 'all 0.13s',
  } as const);
  const contador = (sel: boolean) => ({
    background: sel ? 'rgba(229,75,75,0.15)' : 'var(--muted)',
    color: sel ? 'var(--primary)' : 'var(--muted-foreground)',
    fontSize: '10px',
  } as const);

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        aria-haspopup="true"
        aria-expanded={abierto}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full"
        style={{ ...pildora(activo), border: activo || abierto ? '1.5px solid var(--primary)' : '1.5px solid var(--border)', maxWidth: '100%' }}
      >
        <span className="truncate">{titulo}{resumen ? `: ${resumen}` : ''}</span>
        <ChevronDown size={13} style={{ flexShrink: 0, transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {abierto && (
        <div
          className="absolute left-0 z-30 mt-2 p-3 rounded-[var(--radius-card)]"
          style={{ top: '100%', width: 'min(440px, calc(100vw - 56px))', background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)' }}
        >
          {atajos.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-3 mb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              {atajos.map(a => {
                const sel = igual(a.valores, seleccion);
                return (
                  <button key={a.label} type="button" aria-pressed={sel}
                    onClick={() => onCambiar(sel ? [] : a.valores)}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full" style={pildora(sel)}>
                    {sel && <Check size={11} className="shrink-0" />}
                    {a.label}
                    <span className="px-1.5 rounded" style={contador(sel)}>{a.count}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {opciones.map(f => {
              const sel = seleccion.includes(f.value);
              return (
                <button key={f.value} type="button" onClick={() => alternar(f.value)} aria-pressed={sel}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full" style={pildora(sel)}>
                  {sel ? <Check size={11} className="shrink-0" /> : f.dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.dot }} />}
                  {f.label}
                  <span className="px-1.5 rounded" style={contador(sel)}>{f.count}</span>
                </button>
              );
            })}
          </div>
          {activo && (
            <button type="button" onClick={() => onCambiar([])} className="mt-3"
              style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 'var(--font-weight-semibold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Quitar {titulo.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
