import { ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';
import { NOMBRE_MES, type Periodo } from '../../utils/panelGeneral';

/**
 * Filtro de fechas del panel general (22/10): una línea de tiempo con los 12 meses del año
 * elegido y flechas para ir pasando de año en año hasta el actual. Cada mes muestra una
 * barrita con cuántos operativos se iniciaron, así se ve el registro de todo el año de un
 * vistazo. Tocar el año (o «Todo el año») mira el año entero; tocar un mes, sólo ese mes;
 * «Hoy» vuelve a la situación de ahora, que es lo que el panel muestra al entrar.
 */
export default function LineaTiempo({ periodo, onCambiar, anioMin, iniciadosPorMes }: {
  periodo: Periodo;
  onCambiar: (p: Periodo) => void;
  anioMin: number;
  /** Operativos iniciados en cada mes (12 valores) del año que se muestra en la línea. */
  iniciadosPorMes: (anio: number) => number[];
}) {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const anio = periodo.tipo === 'hoy' ? anioActual : periodo.anio;
  const conteo = iniciadosPorMes(anio);
  const max = Math.max(1, ...conteo);
  const boton = (activo: boolean) => ({
    background: activo ? 'var(--primary)' : 'var(--muted)', color: activo ? 'var(--primary-foreground)' : 'var(--foreground)',
    border: 'none', cursor: 'pointer', fontSize: 'var(--text-label)', fontWeight: 600,
  });

  return (
    <div className="flex flex-col gap-2 w-full lg:w-auto lg:min-w-[520px]">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => onCambiar({ tipo: 'hoy' })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)]"
          style={boton(periodo.tipo === 'hoy')} title="Ver la situación de ahora">
          <CalendarClock size={14} /> Hoy
        </button>
        <div className="inline-flex items-center rounded-[var(--radius-button)]" style={{ background: 'var(--muted)' }}>
          <button aria-label="Año anterior" disabled={anio <= anioMin} onClick={() => onCambiar({ tipo: 'anio', anio: anio - 1 })}
            className="p-1.5 disabled:opacity-30" style={{ background: 'none', border: 'none', cursor: anio <= anioMin ? 'default' : 'pointer', color: 'var(--foreground)' }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => onCambiar({ tipo: 'anio', anio })} title="Ver el año entero"
            className="px-2.5 py-1 rounded-md tabular-nums"
            style={{ ...boton(periodo.tipo === 'anio'), background: periodo.tipo === 'anio' ? 'var(--primary)' : 'transparent', fontSize: 'var(--text-base)' }}>
            {anio}
          </button>
          <button aria-label="Año siguiente" disabled={anio >= anioActual} onClick={() => onCambiar({ tipo: 'anio', anio: anio + 1 })}
            className="p-1.5 disabled:opacity-30" style={{ background: 'none', border: 'none', cursor: anio >= anioActual ? 'default' : 'pointer', color: 'var(--foreground)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
        <span className="ml-auto" style={{ fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
          {periodo.tipo === 'hoy' ? 'Mostrando: ahora' : periodo.tipo === 'anio' ? `Mostrando: todo ${anio}` : `Mostrando: ${NOMBRE_MES[periodo.mes]} ${anio}`}
        </span>
      </div>

      {/* La línea: un tramo por mes, con la cantidad de operativos iniciados */}
      <div className="grid grid-cols-12 gap-1" role="group" aria-label={`Meses de ${anio}`}>
        {NOMBRE_MES.map((m, i) => {
          const futuro = anio === anioActual && i > hoy.getMonth();
          const elegido = periodo.tipo === 'mes' && periodo.anio === anio && periodo.mes === i;
          const esHoy = periodo.tipo === 'hoy' && i === hoy.getMonth();
          const n = conteo[i];
          return (
            <button key={m} disabled={futuro} onClick={() => onCambiar({ tipo: 'mes', anio, mes: i })}
              title={futuro ? `${m} ${anio}: todavía no` : `${m} ${anio}: ${n} ${n === 1 ? 'operativo iniciado' : 'operativos iniciados'}`}
              className="flex flex-col items-center gap-1 pt-1 pb-0.5 rounded-md disabled:cursor-default"
              style={{ background: elegido ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'transparent', border: 'none', cursor: futuro ? 'default' : 'pointer', opacity: futuro ? 0.35 : 1 }}>
              <div className="w-full flex items-end justify-center" style={{ height: 22 }}>
                <div style={{ width: '55%', height: n ? `${Math.max(14, (n / max) * 100)}%` : 2, borderRadius: 2,
                  background: elegido || esHoy ? 'var(--primary)' : 'var(--muted-foreground)', opacity: elegido || esHoy ? 1 : 0.45 }} />
              </div>
              <span style={{ fontSize: 'calc(10px * var(--escala-texto))', color: elegido || esHoy ? 'var(--primary)' : 'var(--muted-foreground)', fontWeight: elegido || esHoy ? 700 : 500 }}>
                {m.slice(0, 3)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
