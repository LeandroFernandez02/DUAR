import { useState } from 'react';
import type { Mes, Porcion } from '../../utils/panelGeneral';

/**
 * Gráficos del panel general, en SVG propio (el proyecto no usa librería de gráficos).
 * Colores: paleta categórica validada (orden fijo, nunca rotado; claro y oscuro con sus
 * propios tonos, chequeados contra --card). Los tonos claros 3–5 no llegan a 3:1 sobre
 * blanco: por eso cada porción lleva su valor escrito en la leyenda.
 */
export const SERIES_CLARO = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
export const SERIES_OSCURO = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'];

const tinta = { fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' } as const;

function Globo({ x, y, children }: { x: number | string; y: number | string; children: React.ReactNode }) {
  return (
    <div className="absolute pointer-events-none px-2.5 py-1.5 rounded-lg whitespace-nowrap"
      style={{ left: x, top: y, transform: 'translate(-50%, calc(-100% - 10px))', background: 'var(--card)', color: 'var(--foreground)',
        border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)', fontSize: 12, zIndex: 5 }}>
      {children}
    </div>
  );
}

/** Torta (anillo) con leyenda a la derecha: nombre, valor y porcentaje de cada porción. */
export function Torta({ datos, colores, unidad }: { datos: Porcion[]; colores: string[]; unidad: string }) {
  const [sobre, setSobre] = useState<number | null>(null);
  const total = datos.reduce((s, d) => s + d.valor, 0);
  if (!total) return <p style={tinta}>Sin datos para los filtros elegidos.</p>;
  const R = 70, r = 44, C = 80;
  let ang = -Math.PI / 2;
  const arcos = datos.map((d, i) => {
    const a0 = ang, a1 = ang + (d.valor / total) * Math.PI * 2;
    ang = a1;
    // 2 px de separación entre porciones (en radianes, sobre el radio exterior).
    const gap = datos.length > 1 ? 1 / R : 0;
    const p = (a: number, rad: number) => `${C + rad * Math.cos(a)} ${C + rad * Math.sin(a)}`;
    const s = a0 + gap, e = Math.max(s, a1 - gap);
    const largo = e - s > Math.PI ? 1 : 0;
    const d0 = datos.length === 1
      ? `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C - 0.01} ${C - R} L ${C - 0.01} ${C - r} A ${r} ${r} 0 1 0 ${C} ${C - r} Z`
      : `M ${p(s, R)} A ${R} ${R} 0 ${largo} 1 ${p(e, R)} L ${p(e, r)} A ${r} ${r} 0 ${largo} 0 ${p(s, r)} Z`;
    const mid = (a0 + a1) / 2;
    return { d: d0, color: colores[i % colores.length], i, cx: C + R * Math.cos(mid), cy: C + R * Math.sin(mid) };
  });
  const pct = (v: number) => `${Math.round((v / total) * 100)} %`;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
        <svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label={datos.map(d => `${d.nombre}: ${d.valor}`).join(', ')}>
          {arcos.map(a => (
            <path key={a.i} d={a.d} fill={a.color} opacity={sobre === null || sobre === a.i ? 1 : 0.35}
              onMouseEnter={() => setSobre(a.i)} onMouseLeave={() => setSobre(null)} style={{ cursor: 'default', transition: 'opacity .15s' }} />
          ))}
          <text x="80" y="78" textAnchor="middle" style={{ fontSize: 22, fontWeight: 700, fill: 'var(--foreground)' }}>{total}</text>
          <text x="80" y="96" textAnchor="middle" style={{ fontSize: 10, fill: 'var(--muted-foreground)' }}>{unidad}</text>
        </svg>
        {sobre !== null && (
          <Globo x={arcos[sobre].cx} y={arcos[sobre].cy}>
            <strong>{datos[sobre].nombre}</strong> · {datos[sobre].valor} ({pct(datos[sobre].valor)})
          </Globo>
        )}
      </div>
      <ul className="flex flex-col gap-1.5 w-full min-w-0">
        {datos.map((d, i) => (
          <li key={d.nombre} className="flex items-center gap-2 px-1.5 py-0.5 rounded"
            onMouseEnter={() => setSobre(i)} onMouseLeave={() => setSobre(null)}
            style={{ background: sobre === i ? 'var(--muted)' : 'transparent', fontSize: 'var(--text-label)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: colores[i % colores.length], flexShrink: 0 }} />
            <span className="truncate" style={{ color: 'var(--foreground)' }}>{d.nombre}</span>
            <span className="ml-auto tabular-nums" style={{ color: 'var(--foreground)', fontWeight: 600 }}>{d.valor}</span>
            <span className="tabular-nums w-10 text-right" style={{ color: 'var(--muted-foreground)' }}>{pct(d.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barras horizontales de una sola medida (un solo color: las categorías no se distinguen por color). */
export function BarrasHorizontales({ datos, color }: { datos: { nombre: string; valor: number }[]; color: string }) {
  const max = Math.max(1, ...datos.map(d => d.valor));
  return (
    <ul className="flex flex-col gap-2.5">
      {datos.map(d => (
        <li key={d.nombre} title={`${d.nombre}: ${d.valor}`}>
          <div className="flex justify-between mb-1" style={{ fontSize: 'var(--text-label)' }}>
            <span style={{ color: 'var(--foreground)' }}>{d.nombre}</span>
            <span className="tabular-nums" style={{ color: 'var(--foreground)', fontWeight: 600 }}>{d.valor}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--muted)' }}>
            <div style={{ width: `${(d.valor / max) * 100}%`, height: '100%', borderRadius: 4, background: color, minWidth: d.valor ? 4 : 0 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Operativos por mes: barras = iniciados en el mes; puntos unidos = máximo de operativos
 * abiertos a la vez ese mes. Las dos son «cantidad de operativos»: comparten el único eje.
 */
export function OperativosPorMes({ meses, colorBarras, colorLinea }: { meses: Mes[]; colorBarras: string; colorLinea: string }) {
  const [sobre, setSobre] = useState<number | null>(null);
  if (!meses.length) return <p style={tinta}>Sin datos para los filtros elegidos.</p>;
  const W = 720, H = 240, M = { l: 28, r: 8, t: 12, b: 26 };
  const max = Math.max(1, ...meses.flatMap(m => [m.iniciados, m.maxSimultaneos]));
  const tope = Math.ceil(max / 2) * 2;
  const ancho = (W - M.l - M.r) / meses.length;
  const y = (v: number) => M.t + (H - M.t - M.b) * (1 - v / tope);
  const xc = (i: number) => M.l + ancho * i + ancho / 2;
  const bar = Math.min(20, ancho * 0.42);
  const marcas = Array.from({ length: tope / (tope > 8 ? 2 : 1) + 1 }, (_, k) => k * (tope > 8 ? 2 : 1));
  const linea = meses.map((m, i) => `${i ? 'L' : 'M'} ${xc(i)} ${y(m.maxSimultaneos)}`).join(' ');

  return (
    <div>
      <div className="flex gap-4 mb-2 flex-wrap" style={tinta}>
        <span className="inline-flex items-center gap-1.5"><span style={{ width: 10, height: 10, borderRadius: 3, background: colorBarras }} />Operativos iniciados en el mes</span>
        <span className="inline-flex items-center gap-1.5"><span style={{ width: 14, height: 2, background: colorLinea }} />Máximo abiertos a la vez</span>
      </div>
      <div className="relative w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Operativos por mes">
          {marcas.map(v => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
              <text x={M.l - 6} y={y(v) + 3.5} textAnchor="end" style={{ fontSize: 10, fill: 'var(--muted-foreground)' }}>{v}</text>
            </g>
          ))}
          {meses.map((m, i) => {
            const h = H - M.b - y(m.iniciados);
            return (
              <g key={m.clave}>
                {sobre === i && <rect x={M.l + ancho * i} y={M.t} width={ancho} height={H - M.t - M.b} fill="var(--muted)" opacity={0.6} />}
                {m.iniciados > 0 && (
                  <path d={`M ${xc(i) - bar / 2} ${H - M.b} V ${y(m.iniciados) + Math.min(4, h)} Q ${xc(i) - bar / 2} ${y(m.iniciados)} ${xc(i) - bar / 2 + Math.min(4, h)} ${y(m.iniciados)} H ${xc(i) + bar / 2 - Math.min(4, h)} Q ${xc(i) + bar / 2} ${y(m.iniciados)} ${xc(i) + bar / 2} ${y(m.iniciados) + Math.min(4, h)} V ${H - M.b} Z`}
                    fill={colorBarras} />
                )}
                {(meses.length <= 14 || i % 2 === 0) && (
                  <text x={xc(i)} y={H - 8} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--muted-foreground)' }}>{m.etiqueta}</text>
                )}
              </g>
            );
          })}
          <path d={linea} fill="none" stroke={colorLinea} strokeWidth={2} strokeLinejoin="round" />
          {meses.map((m, i) => (
            <circle key={m.clave} cx={xc(i)} cy={y(m.maxSimultaneos)} r={4} fill={colorLinea} stroke="var(--card)" strokeWidth={2} />
          ))}
          {/* Zonas de hover más grandes que las marcas: una por mes. */}
          {meses.map((m, i) => (
            <rect key={`h-${m.clave}`} x={M.l + ancho * i} y={M.t} width={ancho} height={H - M.t - M.b} fill="transparent"
              onMouseEnter={() => setSobre(i)} onMouseLeave={() => setSobre(null)} />
          ))}
        </svg>
        {sobre !== null && (
          <Globo x={`${(xc(sobre) / W) * 100}%` } y={`${(y(Math.max(meses[sobre].iniciados, meses[sobre].maxSimultaneos)) / H) * 100}%` }>
            <strong>{meses[sobre].etiqueta}</strong><br />
            Iniciados: {meses[sobre].iniciados} · Máximo a la vez: {meses[sobre].maxSimultaneos}
          </Globo>
        )}
      </div>
      <details className="mt-2" style={tinta}>
        <summary style={{ cursor: 'pointer' }}>Ver los datos en tabla</summary>
        <table className="mt-2 w-full" style={{ fontSize: 12, color: 'var(--foreground)' }}>
          <thead><tr style={{ color: 'var(--muted-foreground)' }}><th className="text-left font-normal">Mes</th><th className="text-right font-normal">Iniciados</th><th className="text-right font-normal">Máximo a la vez</th></tr></thead>
          <tbody>{meses.map(m => <tr key={m.clave}><td>{m.etiqueta}</td><td className="text-right tabular-nums">{m.iniciados}</td><td className="text-right tabular-nums">{m.maxSimultaneos}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}
