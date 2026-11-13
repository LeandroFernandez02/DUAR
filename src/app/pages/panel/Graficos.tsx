import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Mes } from '../../utils/panelGeneral';
import { useMedida } from './comunes';

/**
 * «Operativos por mes» del panel general (diseño v2, 11/11), en SVG propio: barras = iniciados en
 * el mes (con su valor encima); línea suave con puntos = máximo de operativos abiertos a la vez.
 * Arrastrar sobre las barras elige un rango de meses (`onSeleccion`), que el panel aplica al filtro.
 */

const tinta = { fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' } as const;

function Globo({ x, y, children, fin }: { x: string; y: string; children: ReactNode; fin?: boolean }) {
  return (
    <div style={{ position: 'absolute', pointerEvents: 'none', padding: '6px 10px', borderRadius: 'var(--radius-md)', whiteSpace: 'nowrap', left: x, top: y,
      transform: fin ? 'translate(-88%, calc(-100% - 10px))' : 'translate(-50%, calc(-100% - 10px))', background: 'var(--popover)', color: 'var(--foreground)',
      border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)', fontSize: 'calc(12px * var(--escala-texto, 1))', zIndex: 5 }}>
      {children}
    </div>
  );
}

export function OperativosPorMes({ meses, colorBarras, colorLinea, tope: topeFijo, paso: pasoFijo, fijo, seleccion, onSeleccion }: {
  meses: Mes[]; colorBarras: string; colorLinea: string; tope?: number; paso?: number;
  /** Mes destacado con su globo cuando no hay mouse encima. */
  fijo?: number;
  seleccion?: { a: number; b: number } | null;
  onSeleccion?: (a: number, b: number) => void;
}) {
  const [sobre, setSobre] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ a: number; b: number } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  useEffect(() => {
    if (!drag) return;
    const fin = () => { const d = dragRef.current; setDrag(null); if (d && onSeleccion) onSeleccion(Math.min(d.a, d.b), Math.max(d.a, d.b)); };
    window.addEventListener('pointerup', fin);
    return () => window.removeEventListener('pointerup', fin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);
  const [ref, { w: W, h: H }] = useMedida<HTMLDivElement>(320, 120);
  if (!meses.length) return <p style={{ ...tinta, margin: 0 }}>Sin datos para el período elegido.</p>;

  const rango = drag ? { lo: Math.min(drag.a, drag.b), hi: Math.max(drag.a, drag.b) } : seleccion ? { lo: seleccion.a, hi: seleccion.b } : null;
  const M = { l: 30, r: 12, t: 22, b: 24 };
  const max = Math.max(1, ...meses.flatMap(m => [m.iniciados, m.maxSimultaneos]));
  const tope = Math.max(topeFijo ?? 0, Math.ceil(max / 5) * 5), paso = pasoFijo ?? (tope > 10 ? 5 : tope > 4 ? 2 : 1);
  // Angosto (celular): el globo fijo taparía la leyenda y los meses van salteados.
  const angosto = W < 600;
  const act = sobre ?? (fijo === undefined || angosto ? null : fijo);
  const conEtiqueta = (i: number) => !angosto || (meses.length - 1 - i) % 2 === 0;
  const ancho = (W - M.l - M.r) / meses.length;
  const y = (v: number) => M.t + (H - M.t - M.b) * (1 - v / tope);
  const xc = (i: number) => M.l + ancho * i + ancho / 2;
  const bar = Math.min(34, ancho * 0.5), rad = bar / 2;
  const marcas = Array.from({ length: Math.floor(tope / paso) + 1 }, (_, k) => k * paso);
  const pts = meses.map((m, i) => [xc(i), y(m.maxSimultaneos)] as const);
  // Curva suave (Catmull-Rom → Bézier).
  const linea = pts.map((p, i) => {
    if (!i) return `M ${p[0]} ${p[1]}`;
    const p0 = pts[i - 2] ?? pts[i - 1], p1 = pts[i - 1], p3 = pts[i + 1] ?? p;
    // Los puntos de control no bajan del 0: la curva no se dibuja por debajo del eje.
    const piso = (v: number) => Math.min(y(0), v);
    return `C ${p1[0] + (p[0] - p0[0]) / 6} ${piso(p1[1] + (p[1] - p0[1]) / 6)} ${p[0] - (p3[0] - p1[0]) / 6} ${piso(p[1] - (p3[1] - p1[1]) / 6)} ${p[0]} ${p[1]}`;
  }).join(' ');
  const ff = { fontSize: 'calc(11px * var(--escala-texto, 1))', fill: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ ...tinta, display: 'flex', gap: 16, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: colorBarras }} />Operativos iniciados en el mes</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 3, borderRadius: 2, background: colorLinea }} />Máximo abiertos a la vez</span>
      </div>
      <div ref={ref} style={{ position: 'relative', width: '100%', flex: 1, minHeight: 0 }}>
        {/* Hasta que el contenedor tiene tamaño (W = 0 en el primer cuadro) los anchos darían negativos (QA 13/11, QA-05). */}
        {W > M.l + M.r && H > M.t + M.b && <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block', position: 'absolute', inset: 0 }} role="img"
          aria-label={`Operativos por mes: ${meses.map(m => `${m.etiqueta} ${m.iniciados}`).join(', ')}`} onMouseLeave={() => setSobre(null)}>
          {rango && <rect x={M.l + ancho * rango.lo} y={M.t - 6} width={ancho * (rango.hi - rango.lo + 1)} height={H - M.t - M.b + 6} rx={8} fill={colorBarras} opacity={0.12} />}
          {marcas.map(v => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} strokeDasharray={v === 0 ? undefined : '3 4'} opacity={v === 0 ? 1 : 0.8} />
              <text x={M.l - 8} y={y(v) + 4} textAnchor="end" style={{ ...ff, fill: '#94A3B8' }}>{v}</text>
            </g>
          ))}
          {meses.map((m, i) => {
            const top = y(m.iniciados), base = H - M.b;
            const on = rango ? i >= rango.lo && i <= rango.hi : act === null || act === i;
            return (
              <g key={m.clave}>
                {m.iniciados > 0 && <rect x={xc(i) - bar / 2} y={top} width={bar} height={base - top} rx={Math.min(rad, (base - top) / 2)} fill={colorBarras} opacity={on ? 1 : 0.3} style={{ transition: 'opacity .15s' }} />}
                {m.iniciados > 0 && <text x={xc(i)} y={top - 6} textAnchor="middle" style={{ ...ff, fill: 'var(--foreground)', fontWeight: 700 }}>{m.iniciados}</text>}
                {(conEtiqueta(i) || act === i) && <text x={xc(i)} y={H - 6} textAnchor="middle" style={{ ...ff, fill: act === i ? 'var(--foreground)' : 'var(--muted-foreground)', fontWeight: act === i ? 700 : 400 }}>{m.etiqueta}</text>}
              </g>
            );
          })}
          <path d={linea} fill="none" stroke={colorLinea} strokeWidth={2.5} strokeLinecap="round" />
          {meses.map((m, i) => <circle key={m.clave} cx={xc(i)} cy={y(m.maxSimultaneos)} r={act === i ? 6 : 4.5} fill="var(--card)" stroke={colorLinea} strokeWidth={2.5} />)}
          {meses.map((m, i) => (
            <rect key={'h' + m.clave} x={M.l + ancho * i} y={0} width={ancho} height={H} fill="transparent"
              style={{ cursor: onSeleccion ? 'crosshair' : 'default', touchAction: 'none' }}
              onPointerDown={onSeleccion ? e => { e.preventDefault(); setDrag({ a: i, b: i }); } : undefined}
              onPointerEnter={() => { setSobre(i); if (dragRef.current) setDrag(d => d && { ...d, b: i }); }} />
          ))}
        </svg>}
        {act !== null && meses[act] && W > 0 && (
          <Globo fin={act >= meses.length - 2} x={`${(xc(act) / W) * 100}%`} y={`${((y(Math.max(meses[act].iniciados, meses[act].maxSimultaneos)) - 16) / H) * 100}%`}>
            <strong>{meses[act].etiqueta}</strong><br />Iniciados: {meses[act].iniciados} · Máximo a la vez: {meses[act].maxSimultaneos}
          </Globo>
        )}
      </div>
    </div>
  );
}
