/**
 * Filtro desplegable de selección múltiple (02/10; diseño CALÍVAR del 23/10), compartido por
 * Agentes y Operativos. Cerrado es una sola píldora ("Estado ▾", o "Estado: Disponible" /
 * "Estado: 3 elegidos" si hay elegidos); abierto, una lista con casillas que se marcan de a
 * varias. Selección vacía = todos. Dentro de un filtro se suma (A O B); entre filtros se cruza (Y).
 * Se usa dentro de una fila con "Filtrar por:" y, si hay algo elegido, "Limpiar".
 *
 * `atajos` marcan un grupo de opciones de una vez (ej. "Vigentes" = nuevo + en planificación +
 * en proceso + activo). Un atajo se ve marcado cuando la selección es exactamente ese grupo, y
 * entonces el resumen de la píldora cerrada usa su nombre.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface OpcionFiltro<T extends string> {
  value: T;
  label: string;
  count?: number;
  dot?: string | null;
}

export interface AtajoFiltro<T extends string> {
  label: string;
  valores: T[];
  count?: number;
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

  const n = seleccion.length;
  const alternar = (v: T) => onCambiar(seleccion.includes(v) ? seleccion.filter(x => x !== v) : [...seleccion, v]);
  const atajoActivo = atajos.find(a => igual(a.valores, seleccion));
  const resumen = n === 0 ? null
    : atajoActivo ? atajoActivo.label
    : n === 1 ? opciones.find(o => o.value === seleccion[0])?.label
    : `${n} elegidos`;
  const activo = n > 0;

  const fila = {
    display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-sm)',
    border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-family-primary)',
    fontSize: 'calc(12.5px * var(--escala-texto))', color: 'var(--popover-foreground)',
  } as const;
  const casilla = (sel: boolean) => ({
    width: 15, height: 15, borderRadius: 4, flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: sel ? '1.5px solid var(--primary)' : '1.5px solid var(--border)', background: sel ? 'var(--primary)' : 'transparent', color: 'var(--primary-foreground)',
  } as const);
  const cantidad = (c?: number) => c != null && <span style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{c}</span>;
  const separador = <div style={{ height: 1, background: 'var(--border)', margin: '4px 6px' }} />;

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        aria-haspopup="true"
        aria-expanded={abierto}
        className="inline-flex items-center gap-1.5 rounded-full"
        style={{
          padding: '5px 10px', lineHeight: 1.4, whiteSpace: 'nowrap', maxWidth: '100%', cursor: 'pointer',
          fontFamily: 'var(--font-family-primary)', fontSize: 'calc(12px * var(--escala-texto))',
          border: activo ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
          background: activo ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'var(--card)',
          color: activo ? 'var(--primary)' : 'var(--foreground)', fontWeight: activo ? 600 : 500,
        }}
      >
        <span className="truncate">{titulo}{resumen && <span style={{ fontWeight: 600 }}>: {resumen}</span>}</span>
        <ChevronDown size={13} style={{ flexShrink: 0, transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {abierto && (
        <div
          className="absolute left-0 z-30"
          style={{ top: 'calc(100% + 6px)', minWidth: 230, maxWidth: 'calc(100vw - 32px)', padding: 6, background: 'var(--popover)',
            borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)' }}
        >
          {atajos.map(a => {
            const sel = igual(a.valores, seleccion);
            return (
              <button key={a.label} type="button" role="menuitemcheckbox" aria-checked={sel} style={fila} onClick={() => onCambiar(a.valores)}>
                <span style={casilla(sel)}>{sel && <Check size={10} strokeWidth={3} />}</span>
                <span style={{ flex: 1, fontWeight: 600 }}>{a.label}</span>{cantidad(a.count)}
              </button>
            );
          })}
          {atajos.length > 0 && separador}
          {opciones.map(o => {
            const sel = seleccion.includes(o.value);
            return (
              <button key={o.value} type="button" role="menuitemcheckbox" aria-checked={sel} style={fila} onClick={() => alternar(o.value)}>
                <span style={casilla(sel)}>{sel && <Check size={10} strokeWidth={3} />}</span>
                {o.dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: o.dot, flexShrink: 0 }} />}
                <span style={{ flex: 1 }}>{o.label}</span>{cantidad(o.count)}
              </button>
            );
          })}
          {separador}
          <button type="button" style={{ ...fila, color: 'var(--muted-foreground)', fontSize: 'calc(12px * var(--escala-texto))' }} onClick={() => onCambiar([])}>
            Mostrar todos
          </button>
        </div>
      )}
    </div>
  );
}
