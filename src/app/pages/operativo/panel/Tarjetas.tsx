import { useEffect, useState } from 'react';
import { UsersRound, ShieldAlert, TrendingUp, MapPin, Pentagon, ChartColumn, ChevronDown } from 'lucide-react';
import type { EventoCoberturaApi, GrupoApi, PersonalOperativoApi, PoligonoApi, TrackApi } from '../../../services/api';
import { ACENTO, chico, globo, tarjeta, tinte, Tit, InfoTip, BotonPildora, TipDemora, ScrollFade, Segmentado, useMedida, useDemora, CajaIcono, colorInstitucion } from '../../panel/comunes';
import { gruposPorEstado, recursos, curvaAvance, despliegue, ejeLindo, type Participacion, type VistaDespliegue } from './datosPanel';

/* ── Reloj táctico ──────────────────────────────────────────────────────── */

/** Tiempo desde el inicio del operativo, en vivo. Finalizado: la duración total, quieta. */
export function RelojTactico({ inicio, fin }: { inicio: string; fin?: string }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => { if (fin) return; const id = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(id); }, [fin]);
  const seg = Math.max(0, Math.floor(((fin ? new Date(fin).getTime() : ahora) - new Date(inicio).getTime()) / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  const txt = `${p(Math.floor(seg / 3600))}:${p(Math.floor((seg % 3600) / 60))}:${p(seg % 60)}`;
  return (
    <div title={fin ? 'Duración total del operativo' : 'Tiempo de despliegue desde el inicio del operativo'}
      style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 12, padding: '8px 20px', borderRadius: 999, background: '#1E293B', boxShadow: '0 4px 12px rgba(11,30,45,.25)' }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: fin ? ACENTO.grisClaro : ACENTO.verde, animation: fin ? 'none' : 'reloj-ping 1.6s ease-out infinite' }} />
      <span style={{ fontSize: chico, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{fin ? 'Duración' : 'Tiempo activo'}</span>
      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 'calc(20px * var(--escala-texto, 1))', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{txt}</span>
    </div>
  );
}

/** Mini radar del indicador «Radio de búsqueda». */
export function MiniRadio() {
  return (
    <svg viewBox="0 0 44 44" width="48" height="48" role="img" aria-label="Radio de búsqueda" style={{ flexShrink: 0 }}>
      <circle cx="22" cy="22" r="20" fill="none" stroke={ACENTO.violeta} strokeWidth="1.5" opacity="0.4" />
      <circle cx="22" cy="22" r="13" fill="none" stroke={ACENTO.violeta} strokeWidth="1.5" strokeDasharray="3 2" />
      <circle cx="22" cy="22" r="3" fill={ACENTO.rojo} />
      <line x1="22" y1="22" x2="40" y2="12" stroke={ACENTO.violeta} strokeWidth="1.5" />
    </svg>
  );
}

/* ── Grupos activos ─────────────────────────────────────────────────────── */

export function GruposActivos({ grupos }: { grupos: GrupoApi[] }) {
  const porEstado = gruposPorEstado(grupos).filter(e => e.clave !== 'base' || e.grupos.length);
  const total = grupos.length;
  const todos = porEstado.flatMap(e => e.grupos.map(g => ({ g, e })));
  const MAX = 15, cab = todos.length > MAX ? todos.slice(0, MAX - 1) : todos;
  const enTerreno = grupos.filter(g => g.zonaAsignada && ['ASIGNADO', 'DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO'].includes(g.estado));
  const detalle = enTerreno.length ? enTerreno.map(g => `${g.nombre} (${g.zonaAsignada})`).join(' · ') : 'Ningún grupo tiene sector asignado';
  const d = useDemora();
  return (
    <section className="grupos-fila" style={{ ...tarjeta, flex: '1 1 auto', width: '100%', minHeight: 188, padding: '16px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '24px 32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, flex: '1 1 240px', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <CajaIcono icono={UsersRound} color={ACENTO.celeste} lado={32} tam={16} />
          <h2 style={{ margin: 0, fontSize: 'calc(14px * var(--escala-texto, 1))', fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>Grupos Activos</h2>
          <InfoTip texto="Estado de despliegue de los grupos" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 32, rowGap: 16, marginTop: 16 }}>
          {porEstado.map(e => (
            <div key={e.clave} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 'calc(14px * var(--escala-texto, 1))', lineHeight: 1.3 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{e.nombre}</span>
              <strong style={{ color: 'var(--foreground)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginLeft: 'auto' }}>{e.grupos.length}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="waffle" onMouseEnter={d.entrar} onMouseLeave={d.salir}
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto', marginRight: 'clamp(0px, 4vw, 80px)',
          background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 24px', minWidth: 170, boxSizing: 'border-box', boxShadow: '0 1px 2px rgba(15,23,42,0.06)' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total grupos</span>
        <span style={{ fontSize: 'calc(44px * var(--escala-texto, 1))', fontWeight: 700, lineHeight: 1, color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{total}</span>
        {total > 0 && (
          <div role="img" aria-label="Grupos por estado" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(5, todos.length)}, 28px)`, gap: 8, justifyContent: 'center' }}>
            {cab.map(({ g, e }) => <span key={g.id} title={`${g.nombre} · ${e.nombre}`} style={{ width: 28, height: 28, borderRadius: 7, background: e.color, boxShadow: '0 1px 2px rgba(15,23,42,0.18)' }} />)}
            {todos.length > MAX && <span title={`${todos.length - cab.length} grupos más`} style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--border)', color: 'var(--muted-foreground)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+{todos.length - cab.length}</span>}
          </div>
        )}
        {d.ver && <div role="tooltip" style={{ ...globo, right: 0, top: 'calc(100% + 6px)' }}>{detalle}</div>}
      </div>
    </section>
  );
}

/* ── Recursos críticos ──────────────────────────────────────────────────── */

type Recurso = ReturnType<typeof recursos>[number];

function Radar({ datos }: { datos: Recurso[] }) {
  const N = datos.length, CX = 150, CY = 130, R = 82, max = Math.max(...datos.map(r => r.base));
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const pt = (i: number, k: number) => [CX + Math.cos(ang(i)) * R * k, CY + Math.sin(ang(i)) * R * k];
  const poly = (k: number) => datos.map((_, i) => pt(i, k).join(',')).join(' ');
  return (
    <svg viewBox="-50 4 400 252" width="100%" height="100%" role="img" aria-label={`Disponibles en base: ${datos.map(r => `${r.nombre} ${r.base}`).join(', ')}`}
      style={{ maxWidth: 420, display: 'block', margin: '0 auto', fontFamily: 'var(--font-family-primary)' }}>
      {[0.25, 0.5, 0.75, 1].map(k => <polygon key={k} points={poly(k)} fill="none" stroke="var(--border)" strokeWidth="1" opacity={k === 1 ? 1 : 0.7} />)}
      {datos.map((_, i) => <line key={i} x1={CX} y1={CY} x2={pt(i, 1)[0]} y2={pt(i, 1)[1]} stroke="var(--border)" strokeWidth="1" opacity="0.7" />)}
      <polygon points={datos.map((r, i) => pt(i, r.base / max).join(',')).join(' ')} fill="rgba(59,130,246,0.2)" stroke={ACENTO.azul} strokeWidth="2" strokeLinejoin="round" />
      {datos.map((r, i) => <circle key={r.nombre} cx={pt(i, r.base / max)[0]} cy={pt(i, r.base / max)[1]} r="3" fill={ACENTO.azul} />)}
      {datos.map((r, i) => {
        const [x, y] = pt(i, 1.32), c = Math.cos(ang(i));
        return <text key={r.nombre} x={x} y={y + 3} textAnchor={Math.abs(c) < 0.2 ? 'middle' : c > 0 ? 'start' : 'end'}
          style={{ fontSize: 12, fontWeight: 600, fill: 'var(--foreground)' }}>{r.nombre}</text>;
      })}
    </svg>
  );
}

function PildoraRecurso({ r }: { r: Recurso }) {
  const hay = r.base > 0;
  const I = r.icono;
  return (
    <TipDemora texto={`Total asignado al operativo: ${r.total} | En terreno: ${r.terreno} | Listos en base: ${r.base}`} style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px 4px 10px', borderRadius: 999, minWidth: 0, opacity: hay ? 1 : 0.4,
        background: hay ? tinte(r.color) : 'var(--muted)', border: `1px solid ${hay ? tinte(r.color, 45) : 'var(--border)'}` }}>
        <I size={14} color={hay ? r.color : 'var(--muted-foreground)'} />
        <span style={{ flex: 1, minWidth: 0, fontSize: chico, fontWeight: 600, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</span>
        <span style={{ minWidth: 20, height: 20, padding: '0 5px', boxSizing: 'border-box', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: hay ? 'var(--foreground)' : 'var(--muted-foreground)', color: 'var(--card)', fontSize: 'calc(11px * var(--escala-texto, 1))', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.base}</span>
      </div>
    </TipDemora>
  );
}

export function RecursosCriticos({ personal }: { personal: PersonalOperativoApi[] }) {
  const [abierto, setAbierto] = useState(false);
  const lista = recursos(personal);
  const conBase = lista.filter(r => r.base > 0);
  return (
    <section style={{ ...tarjeta, padding: 20, display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 330 }}>
      <Tit icono={ShieldAlert} color={ACENTO.naranja} info="Unidades en base listas para asignación"
        der={<BotonPildora abierto={abierto} onClick={() => setAbierto(v => !v)}>{abierto ? 'Ocultar detalle' : `Ver detalle (${conBase.length} disponibles)`}</BotonPildora>}>
        Recursos Críticos
      </Tit>
      <div className="rc-fila" style={{ display: 'flex', flexWrap: 'nowrap', gap: 16, alignItems: 'center', justifyContent: 'center', height: 265, flexShrink: 0, margin: 'auto 0' }}>
        <div style={{ flex: '1 1 0', height: '100%', maxWidth: abierto ? 'none' : 440, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {conBase.length >= 3
            ? <Radar datos={conBase} />
            : <p style={{ margin: 0, textAlign: 'center', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                {conBase.length ? `En base: ${conBase.map(r => `${r.nombre} (${r.base})`).join(' · ')}` : 'No hay recursos listos en base.'}
                <br />{!abierto && 'Abrí el detalle para ver cada especialidad.'}
              </p>}
        </div>
        {abierto && (
          <div style={{ flex: '1 1 0', minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, alignContent: 'center' }}>
            {lista.map(r => <PildoraRecurso key={r.nombre} r={r} />)}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Avance del rastrillaje ─────────────────────────────────────────────── */

const fmtHora = (t: number, conDia: boolean) => {
  const d = new Date(t);
  const hora = `${String(d.getHours()).padStart(2, '0')}h`;
  return conDia ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hora}` : hora;
};

export function Avance({ poligonos, tracks, eventos, inicioOp, actual }: { poligonos: PoligonoApi[]; tracks: TrackApi[]; eventos: EventoCoberturaApi[] | null; inicioOp: string; actual: number }) {
  const [ref, { w: W, h: H }] = useMedida<HTMLDivElement>(220, 150);
  const [hv, setHv] = useState<number | null>(null);
  const { pts, estimados, total } = curvaAvance(eventos, poligonos, tracks, inicioOp);
  const km = tracks.reduce((s, t) => s + t.distanciaM, 0) / 1000;
  const t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, t0 + 3_600_000);
  const conDia = t1 - t0 > 36 * 3_600_000;
  const L = 36, R = 8, T = 10, B = 22;
  const x = (t: number) => L + ((t - t0) / (t1 - t0)) * (W - L - R);
  const y = (v: number) => T + ((100 - v) / 100) * (H - T - B);
  // En escalones: la cobertura cambia de golpe en cada recálculo (al cargar un recorrido), no de a poco.
  const linea = pts.map((p, i) => (i ? `H${x(p.t)} V${y(p.v)}` : `M${x(p.t)} ${y(p.v)}`)).join(' ');
  const ult = pts[pts.length - 1];
  const marcas = Array.from({ length: 6 }, (_, i) => t0 + ((t1 - t0) * i) / 5);
  const cerca = (px: number) => pts.reduce((m, p, i) => (Math.abs(x(p.t) - px) < Math.abs(x(pts[m].t) - px) ? i : m), 0);
  return (
    <section style={{ ...tarjeta, flex: '1 1 auto', width: '100%', minHeight: 209, padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <CajaIcono icono={TrendingUp} color={ACENTO.verde} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h2 style={{ margin: 0, fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>Avance del rastrillaje</h2>
            <InfoTip texto={`Cobertura media de los polígonos en cada momento.${estimados ? ` ${estimados} de ${total} polígono${total === 1 ? '' : 's'} tiene${estimados === 1 ? '' : 'n'} recorridos cargados antes del 11/11: su tramo de la curva es estimado.` : ''}`} />
          </div>
          <p style={{ margin: '4px 0 0', display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'calc(28px * var(--escala-texto, 1))', fontWeight: 700, lineHeight: 1, color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{actual}%</span>
            <span style={{ fontSize: chico, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
              {poligonos.length ? `${poligonos.length} polígono${poligonos.length === 1 ? '' : 's'} · ${km.toLocaleString('es-AR', { maximumFractionDigits: 1 })} km de tracks` : 'Todavía no hay polígonos'}
            </span>
          </p>
        </div>
      </div>
      <div ref={ref} style={{ position: 'relative', flex: '1 1 0', minWidth: 0, minHeight: 150, width: '100%' }}>
        {W > 0 && (
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Avance de cobertura: ${actual}%`}
            style={{ display: 'block', fontFamily: 'var(--font-family-primary)' }}
            onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setHv(cerca(e.clientX - r.left)); }} onMouseLeave={() => setHv(null)}>
            <defs><linearGradient id="avanceGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACENTO.verde} stopOpacity="0.35" /><stop offset="100%" stopColor={ACENTO.verde} stopOpacity="0.02" /></linearGradient></defs>
            {[0, 50, 100].map(v => (
              <g key={v}>
                <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
                <text x={L - 6} y={y(v) + 3} textAnchor="end" style={{ fontSize: 10, fill: 'var(--muted-foreground)' }}>{v}%</text>
              </g>
            ))}
            <line x1={L} x2={L} y1={T} y2={H - B} stroke="var(--border)" strokeWidth="1" />
            <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--border)" strokeWidth="1" />
            {marcas.map((t, i) => <text key={i} x={x(t)} y={H - 6} textAnchor={i === 0 ? 'start' : i === 5 ? 'end' : 'middle'} style={{ fontSize: 10, fill: 'var(--muted-foreground)' }}>{fmtHora(t, conDia)}</text>)}
            {hv !== null && <line x1={x(pts[hv].t)} x2={x(pts[hv].t)} y1={T} y2={H - B} stroke="var(--muted-foreground)" strokeWidth="1" opacity="0.5" />}
            <path d={`${linea} L${x(ult.t)} ${H - B} L${x(pts[0].t)} ${H - B} Z`} fill="url(#avanceGrad)" />
            <path d={linea} fill="none" stroke={ACENTO.verde} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={x(ult.t)} cy={y(ult.v)} r="5" fill={ACENTO.verde} stroke="var(--card)" strokeWidth="2" />
          </svg>
        )}
        {hv !== null && (
          <div role="tooltip" style={{ ...globo, left: Math.min(Math.max(x(pts[hv].t), 90), W - 90), bottom: 'calc(100% + 6px)', transform: 'translateX(-50%)', whiteSpace: 'nowrap', maxWidth: 'none' }}>
            <strong>{new Date(pts[hv].t).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</strong> · Cobertura: {pts[hv].v}%
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Polígonos y cobertura ──────────────────────────────────────────────── */

function MediaDona({ pct, color }: { pct: number; color: string }) {
  const r = 34, L = Math.PI * r, d = 'M 6 40 A 34 34 0 0 1 74 40';
  return (
    <svg viewBox="0 0 80 46" width="84" height="48" role="img" aria-label={`${pct}%`} style={{ display: 'block', flexShrink: 0 }}>
      <path d={d} fill="none" stroke="var(--border)" strokeWidth="8" strokeLinecap="round" />
      {pct > 0 && <path d={d} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(L * Math.min(100, pct)) / 100} ${L}`} />}
      <text x="40" y="42" textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</text>
    </svg>
  );
}

export function Poligonos({ poligonos, grupos }: { poligonos: PoligonoApi[]; grupos: GrupoApi[] }) {
  const [ver, setVer] = useState(false);
  const pct = (p: PoligonoApi) => Math.min(100, Math.round(p.coberturaPct));
  const activos = poligonos.filter(p => pct(p) < 100).sort((a, b) => pct(b) - pct(a));
  const completos = poligonos.filter(p => pct(p) >= 100);
  const sutil = { padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--muted)', fontSize: chico, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' } as const;
  const fila = (p: PoligonoApi, i: number, arr: PoligonoApi[]) => {
    const ok = pct(p) >= 100;
    const g = p.grupos.find(x => x.clase === 'RASTRILLAJE') ?? p.grupos[0];
    const n = g ? grupos.find(x => x.id === g.id)?.integrantes.length ?? 0 : 0;
    return (
      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap', padding: i === 0 ? '0 0 8px' : '8px 0', opacity: ok ? 0.6 : 1,
        borderBottom: i < arr.length - 1 ? '1px solid color-mix(in srgb, var(--border) 60%, transparent)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
          <Pentagon size={18} color={ok ? '#6EE7B7' : ACENTO.grisClaro} />
          <strong style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)' }}>{p.nombre}</strong>
          {!ok && g && (
            <span style={{ ...sutil, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-flex' }}>{[0, 1, 2].map(q => <span key={q} style={{ width: 16, height: 16, borderRadius: '50%', background: g.color ?? 'color-mix(in srgb, var(--muted-foreground) 45%, var(--card))', opacity: g.color ? 0.55 + q * 0.15 : 1, border: '1.5px solid var(--card)', marginLeft: q ? -6 : 0 }} />)}</span>
              {g.nombre} · {n} agente{n === 1 ? '' : 's'}
            </span>
          )}
          {!ok && !g && <span style={sutil}>Sin grupo</span>}
        </div>
        <MediaDona pct={pct(p)} color={ok ? '#6EE7B7' : '#7DD3FC'} />
      </div>
    );
  };
  return (
    <section style={{ ...tarjeta, padding: 20, display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 345 }}>
      <Tit icono={MapPin} info="Rastrillaje métrico y cuadrillas desplegadas por sector"
        der={completos.length > 0 ? <BotonPildora abierto={ver} onClick={() => setVer(v => !v)}>{ver ? `Ocultar completados (${completos.length})` : `Ver completados (${completos.length})`}</BotonPildora> : undefined}>
        Polígonos y Cobertura Operativa
      </Tit>
      <ScrollFade minHeight={220}>
        {!poligonos.length && <p style={{ margin: 0, fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Todavía no hay polígonos de rastrillaje. Se dibujan desde el Mapa.</p>}
        {activos.map(fila)}
        {ver && completos.length > 0 && <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0' }}>
            <div style={{ height: 1, background: 'var(--border)', flex: 1 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: ACENTO.grisClaro, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sectores completados</span>
            <div style={{ height: 1, background: 'var(--border)', flex: 1 }} />
          </div>
          {completos.map(fila)}
        </>}
      </ScrollFade>
      <p style={{ margin: '16px 0 0', fontSize: chico, color: 'var(--muted-foreground)' }}>{completos.length} de {poligonos.length} sectores completados</p>
    </section>
  );
}

/* ── Evolución de despliegue ────────────────────────────────────────────── */

export function EvolucionDespliegue({ participaciones, inicio, fin }: { participaciones: Participacion[]; inicio: string; fin?: string }) {
  const H = 210;
  const [vista, setVista] = useState<VistaDespliegue>('7d');
  const [abierta, setAbierta] = useState(false);
  const [hv, setHv] = useState<{ d: number; i: string } | null>(null);
  const cols = despliegue(participaciones, inicio, fin, vista);
  // Cada institución con su color, ordenadas por aporte (sin agrupar en «Otras»).
  const totales: Record<string, number> = {};
  for (const c of cols) for (const [k, n] of Object.entries(c.porInst ?? {})) totales[k] = (totales[k] ?? 0) + n;
  const insts = Object.keys(totales).sort((a, b) => totales[b] - totales[a]);
  const color = (k: string) => colorInstitucion(insts.indexOf(k));
  const max = Math.max(1, ...cols.map(c => Object.values(c.porInst ?? {}).reduce((s, n) => s + n, 0)));
  const { tope, ticks } = ejeLindo(max);
  const der = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <div style={{ position: 'relative' }}>
        <button type="button" aria-expanded={abierta} onClick={() => setAbierta(a => !a)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: 'none', borderRadius: 'var(--radius-button)', background: abierta ? 'var(--muted)' : 'transparent',
            cursor: 'pointer', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
          Ver Instituciones ({insts.length})<ChevronDown size={14} />
        </button>
        {abierta && (
          <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 20, width: 240, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--popover)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {insts.length ? insts.map(n => <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: chico, color: 'var(--foreground)' }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: color(n), flexShrink: 0 }} />{n}</span>)
              : <span style={{ fontSize: chico, color: 'var(--muted-foreground)' }}>Sin personal todavía.</span>}
          </div>
        )}
      </div>
      <Segmentado etiqueta="Período" valor={vista} onCambiar={v => { setVista(v); setHv(null); }} opciones={[['7d', '7 Días'], ['sem', 'Semanal'], ['mes', 'Mensual']]} />
    </div>
  );
  return (
    <section style={{ ...tarjeta, padding: 20 }}>
      <Tit icono={ChartColumn} sub="Agentes que estuvieron en terreno (desplegados, rastrillando o replegados) en cada período, por institución" der={der}>Evolución de Despliegue Diario</Tit>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ position: 'relative', width: 28, height: H, flexShrink: 0 }}>
          {ticks.map(v => <span key={v} style={{ position: 'absolute', right: 0, bottom: (v / tope) * H, transform: 'translateY(50%)', fontSize: 'calc(10px * var(--escala-texto, 1))', color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ position: 'relative', height: H }}>
            {ticks.map(v => <div key={v} style={{ position: 'absolute', left: 0, right: 0, bottom: (v / tope) * H, borderTop: '1px dashed var(--border)' }} />)}
            <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
              {cols.map((c, di) => {
                const orden = c.porInst ? insts.filter(k => c.porInst![k]).map(k => [k, c.porInst![k]] as const) : [];
                let acc = 0; const pos: Record<string, number> = {};
                for (const [k, n] of orden) { pos[k] = acc + n / 2; acc += n; }
                return (
                  <div key={c.etiqueta} style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    {acc > 0 && <span style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', bottom: (acc / tope) * H + 6, fontSize: 'var(--text-h4)', fontWeight: 700, color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{acc}</span>}
                    <div style={{ width: 'min(56px, 60%)', display: 'flex', flexDirection: 'column-reverse', borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
                      {acc > 0 ? orden.map(([k, n]) => (
                        <div key={k} onMouseEnter={() => setHv({ d: di, i: k })} onMouseLeave={() => setHv(null)}
                          style={{ height: (n / tope) * H, background: color(k), borderTop: '1px solid var(--card)', cursor: 'pointer', opacity: !hv || (hv.d === di && hv.i === k) ? 1 : 0.88 }} />
                      )) : <div style={{ height: 6, background: 'var(--muted)' }} />}
                    </div>
                    {hv && hv.d === di && pos[hv.i] !== undefined && (
                      <div role="tooltip" style={{ ...globo, left: 'calc(50% + min(28px, 30%) + 12px)', bottom: (pos[hv.i] / tope) * H, transform: 'translateY(50%)', zIndex: 5, whiteSpace: 'nowrap', maxWidth: 'none' }}>
                        <strong style={{ display: 'block' }}>{c.etiqueta} - {hv.i}</strong>{c.porInst![hv.i]} agente{c.porInst![hv.i] === 1 ? '' : 's'} en terreno
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', marginTop: 8 }}>
            {cols.map(c => <span key={c.etiqueta} style={{ flex: 1, textAlign: 'center', fontSize: chico, color: c.porInst ? 'var(--foreground)' : 'var(--muted-foreground)', fontWeight: c.porInst ? 600 : 400 }}>{c.etiqueta}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}
