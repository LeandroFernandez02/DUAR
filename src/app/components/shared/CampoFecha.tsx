import { useRef, CSSProperties } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  fechaParaMostrar, fechaDesdeTexto, digitosAntesDelCursor, reponerCursor, FECHA_NACIMIENTO_MIN,
} from '../../utils/validacionUsuario';

/** «AAAA-MM-DD» de hoy en la hora de la computadora (no UTC: a la noche toISOString ya da mañana). */
function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  id?: string;
  /** «AAAA-MM-DD» si la fecha está completa y existe; si no, los dígitos escritos (ver `fechaDesdeTexto`). */
  value: string;
  onChange: (valor: string) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Fecha de nacimiento que se escribe sólo con números (DD/MM/AAAA, las barras las pone el
 * campo) y, si se prefiere, se elige en el calendario del navegador con el ícono.
 *
 * Reemplaza al <input type="date">: en el celular su cuadro de texto dejaba escribir letras
 * y símbolos, y la fecha inexistente (31/02) pasaba como si no se hubiera cargado
 * (Testeo 15/10, puntos 15 y 28). Acá lo que no es un número no entra, y qué falta o qué está
 * mal lo dice `validarFechaNacimiento`, con el mismo mensaje en todas las pantallas.
 */
export default function CampoFecha({ id, value, onChange, className = '', style }: Props) {
  const calendario = useRef<HTMLInputElement>(null);
  const iso = /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '';

  const abrirCalendario = () => {
    const el = calendario.current;
    if (!el) return;
    try { el.showPicker(); } catch { el.focus(); el.click(); }
  };

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD/MM/AAAA"
        maxLength={10}
        value={fechaParaMostrar(value)}
        onChange={e => {
          const el = e.target;
          const digitos = digitosAntesDelCursor(el);
          onChange(fechaDesdeTexto(el.value));
          reponerCursor(el, digitos);
        }}
        className={`${className} pr-10`}
        style={style}
      />
      <button
        type="button"
        onClick={abrirCalendario}
        aria-label="Elegir la fecha en el calendario"
        title="Elegir en el calendario"
        className="absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
      >
        <CalendarDays size={16} />
      </button>
      {/* El calendario del navegador llega hasta hoy (Testeo 25/10, punto 35: ofrecía años
          futuros). No se topea en la edad mínima: si elige a un menor, el error lo dice el
          formulario («La edad mínima…») y no el cartel «Fuera de rango» del navegador. */}
      <input
        ref={calendario}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        min={FECHA_NACIMIENTO_MIN}
        max={hoyLocal()}
        value={iso}
        onChange={e => { if (e.target.value) onChange(e.target.value); }}
        style={{ position: 'absolute', right: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}
