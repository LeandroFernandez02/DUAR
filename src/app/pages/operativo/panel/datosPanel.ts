import { useCallback, useEffect, useState } from 'react';
import {
  agentesOperativoApi, gruposApi, poligonosApi, marcadoresApi, puntoCeroApi, tracksApi,
  type PersonalOperativoApi, type GrupoApi, type PoligonoApi, type MarcadorApi, type RadioApi, type TrackApi, type EstadoGrupoApi, type EventoCoberturaApi,
} from '../../../services/api';
import { ESPECIALIDADES_PANEL, ACENTO } from '../../panel/comunes';

/**
 * Panel del operativo (diseño v2, 11/11): todo sale de los datos reales del operativo —
 * personal, grupos, polígonos (cobertura), marcadores, radios del Punto 0, tracks GPX y las
 * entradas/salidas del personal— y se refresca cada 30 s mientras la pestaña está a la vista.
 */

/** Una participación con sus tramos en terreno (Desplegado, Rastrillando o Replegado). */
export type Participacion = { fechaIngreso: string; fechaEgreso: string | null; institucionNombre: string | null; tramos: { desde: string; hasta: string | null }[] };

export interface DatosCrudos {
  personal: PersonalOperativoApi[];
  grupos: GrupoApi[];
  poligonos: PoligonoApi[];
  marcadores: MarcadorApi[];
  radios: RadioApi[];
  tracks: TrackApi[];
  participaciones: Participacion[];
  /** Historial de cobertura de los polígonos; null si el servidor todavía no lo ofrece. */
  cobertura: EventoCoberturaApi[] | null;
}

const REFRESCO_MS = 30_000;
const EN_TERRENO = new Set(['DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO']);

export function useDatosPanel(operativoId: string) {
  const [datos, setDatos] = useState<DatosCrudos | null>(null);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    // Cada fuente por separado: si una falla, el resto del panel igual se ve.
    const seguro = <T,>(p: Promise<T>, vacio: T) => p.catch(() => vacio);
    const [p, g, pol, m, r, t, d, cob] = await Promise.all([
      seguro(agentesOperativoApi.listar(operativoId), null),
      seguro(gruposApi.listar(operativoId), { grupos: [] }),
      seguro(poligonosApi.listar(operativoId), { poligonos: [] }),
      seguro(marcadoresApi.listar(operativoId), { marcadores: [] }),
      seguro(puntoCeroApi.listarRadios(operativoId), { radios: [] }),
      seguro(tracksApi.listar(operativoId), { tracks: [] }),
      seguro(agentesOperativoApi.despliegue(operativoId), null),
      seguro(poligonosApi.historialCobertura(operativoId), null),
    ]);
    if (!p) { setError(true); return; }
    setError(false);
    setDatos({
      personal: p.personal, grupos: g.grupos.filter(x => x.estado !== 'DISUELTO'), poligonos: pol.poligonos,
      marcadores: m.marcadores, radios: r.radios, tracks: t.tracks,
      // Sin el historial (servidor viejo), se arma con el personal de ahora.
      participaciones: d?.participaciones ?? p.personal.map(a => ({ fechaIngreso: a.fechaIngreso, fechaEgreso: a.fechaEgreso, institucionNombre: a.institucionNombre,
        tramos: EN_TERRENO.has(a.estado) ? [{ desde: a.estadoActualizadoEn, hasta: null }] : [] })),
      cobertura: cob?.eventos ?? null,
    });
  }, [operativoId]);

  useEffect(() => {
    cargar();
    const id = setInterval(() => { if (document.visibilityState === 'visible') cargar(); }, REFRESCO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  return { datos, error, recargar: cargar };
}

/* ── Cálculos ───────────────────────────────────────────────────────────── */

const esHoy = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export function fuerza(personal: PersonalOperativoApi[]) {
  const total = personal.length;
  const terreno = personal.filter(a => EN_TERRENO.has(a.estado)).length;
  const sinGrupo = personal.filter(a => !a.grupoId).length;
  return { total, terreno, base: total - terreno, sinGrupo, conGrupo: total - sinGrupo, hoy: personal.filter(a => esHoy(a.fechaIngreso)).length };
}

/** Estados del grupo en el panel: los cuatro del terreno y «En base» (formación, confirmado, en espera). */
export const ESTADOS_GRUPO_PANEL: { clave: string; nombre: string; color: string; estados: EstadoGrupoApi[] }[] = [
  { clave: 'rastrillando', nombre: 'Rastrillando', color: ACENTO.verde, estados: ['RASTRILLANDO'] },
  { clave: 'desplegado', nombre: 'Desplegado', color: ACENTO.celesteFuerte, estados: ['DESPLEGADO'] },
  { clave: 'asignado', nombre: 'Asignado', color: ACENTO.ambar, estados: ['ASIGNADO'] },
  { clave: 'replegado', nombre: 'Replegado', color: ACENTO.grisClaro, estados: ['REPLEGADO'] },
  { clave: 'base', nombre: 'En base', color: ACENTO.gris, estados: ['EN_FORMACION', 'CONFIRMADO', 'EN_ESPERA'] },
];

export function gruposPorEstado(grupos: GrupoApi[]) {
  return ESTADOS_GRUPO_PANEL.map(e => ({ ...e, grupos: grupos.filter(g => e.estados.includes(g.estado)) }));
}

/** Por especialidad: total en el operativo, en terreno y listos en base (ni en terreno ni «No disponible»). */
export function recursos(personal: PersonalOperativoApi[]) {
  return ESPECIALIDADES_PANEL.map(e => {
    const de = personal.filter(a => a.especialidadNombre === e.nombre);
    const terreno = de.filter(a => EN_TERRENO.has(a.estado)).length;
    const base = de.filter(a => !EN_TERRENO.has(a.estado) && a.estado !== 'NO_DISPONIBLE').length;
    return { ...e, total: de.length, terreno, base };
  });
}

/** Cobertura media de los polígonos (0–100). */
export const coberturaMedia = (pol: PoligonoApi[]) =>
  pol.length ? Math.round(pol.reduce((s, p) => s + Math.min(100, p.coberturaPct), 0) / pol.length) : 0;

const CAMBIA_COBERTURA = new Set(['GEOMETRIA', 'TRACK_CARGADO', 'TRACK_REASIGNADO', 'TRACK_ELIMINADO']);

/**
 * Curva del avance: cobertura media de los polígonos vigentes en cada momento.
 *
 * Desde el 11/11 cada recálculo de cobertura queda en el historial del polígono con su
 * porcentaje (detalle.coberturaPct): esos polígonos tienen la curva EXACTA. Los que tienen
 * recorridos cargados antes no guardaron ese dato: su curva se estima repartiendo su cobertura
 * de hoy según los km de sus recorridos (`estimados` dice cuántos son). Un polígono cuenta
 * desde que se creó hasta que se eliminó, así agregar o borrar uno no cambia el pasado.
 */
export function curvaAvance(eventos: EventoCoberturaApi[] | null, poligonos: PoligonoApi[], tracks: TrackApi[], inicioOp: string) {
  const ahora = Date.now();
  const ms = (iso: string) => new Date(iso).getTime();
  const actual = new Map(poligonos.map(p => [p.id, Math.min(100, p.coberturaPct)]));
  const ids = new Set([...poligonos.map(p => p.id), ...(eventos ?? []).map(e => e.poligonoId)]);
  type Serie = { desde: number; hasta: number; puntos: { t: number; v: number }[] };
  const series: Serie[] = [];
  let estimados = 0;
  for (const id of ids) {
    const ev = (eventos ?? []).filter(e => e.poligonoId === id);
    const creado = ev.find(e => e.tipo === 'CREADO');
    const desde = creado ? ms(creado.en) : ms(poligonos.find(p => p.id === id)?.creadoEn ?? inicioOp);
    const borrado = ev.find(e => e.tipo === 'ELIMINADO');
    const hasta = borrado ? ms(borrado.en) : Infinity;
    const cambios = ev.filter(e => CAMBIA_COBERTURA.has(e.tipo));
    const exacto = eventos !== null && cambios.every(e => e.pct !== null);
    let puntos: { t: number; v: number }[];
    if (exacto) {
      puntos = [{ t: desde, v: 0 }, ...cambios.map(e => ({ t: ms(e.en), v: Math.min(100, e.pct ?? 0) }))];
    } else {
      estimados++;
      const final = actual.get(id) ?? [...cambios].reverse().find(e => e.pct !== null)?.pct ?? 0;
      const suyos = tracks.filter(t => t.poligonoId === id).map(t => ({ t: ms(t.fin ?? t.cargadoEn), km: t.distanciaM })).sort((a, b) => a.t - b.t);
      const total = suyos.reduce((s, x) => s + x.km, 0);
      let acc = 0;
      puntos = [{ t: desde, v: 0 }, ...suyos.map(x => { acc += x.km; return { t: Math.max(x.t, desde), v: total ? (final * acc) / total : final }; })];
      if (!suyos.length && final) puntos.push({ t: desde, v: final });
    }
    series.push({ desde, hasta, puntos });
  }
  const valorEn = (s: Serie, t: number) => { let v = 0; for (const p of s.puntos) { if (p.t <= t) v = p.v; else break; } return v; };
  const inicio = Math.min(ms(inicioOp), ...series.map(s => s.desde));
  const tiempos = [...new Set([inicio, ...series.flatMap(s => [s.desde, ...(Number.isFinite(s.hasta) ? [s.hasta] : []), ...s.puntos.map(p => p.t)]), ahora])]
    .filter(t => t >= inicio && t <= ahora).sort((a, b) => a - b);
  const pts = tiempos.map(t => {
    const vivos = series.filter(s => s.desde <= t && s.hasta > t);
    return { t, v: vivos.length ? Math.round(vivos.reduce((x, s) => x + valorEn(s, t), 0) / vivos.length) : 0 };
  });
  return { pts, estimados, total: series.length };
}

export type VistaDespliegue = '7d' | 'sem' | 'mes';
export interface ColumnaDespliegue { etiqueta: string; porInst: Record<string, number> | null }

/**
 * Agentes que estuvieron EN TERRENO (Desplegado, Rastrillando o Replegado) al menos una vez en
 * cada día / semana / mes del operativo, por institución: cada persona cuenta una vez por período.
 * Los días que todavía no pasaron quedan vacíos.
 */
export function despliegue(part: Participacion[], inicioOp: string, finOp: string | undefined, vista: VistaDespliegue): ColumnaDespliegue[] {
  const DIA = 86_400_000;
  const ini = new Date(inicioOp); ini.setHours(0, 0, 0, 0);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const ultimo = finOp ? Math.min(new Date(finOp).getTime(), Date.now()) : Date.now();
  const contar = (a: number, b: number) => {
    const m: Record<string, number> = {};
    for (const p of part) {
      const estuvo = p.tramos.some(t => new Date(t.desde).getTime() < b && (t.hasta ? new Date(t.hasta).getTime() : Infinity) >= a);
      if (estuvo) { const k = p.institucionNombre ?? 'Sin institución'; m[k] = (m[k] ?? 0) + 1; }
    }
    return m;
  };
  const cols: ColumnaDespliegue[] = [];
  if (vista === '7d') {
    const dias = Math.floor((Math.min(hoy.getTime(), ultimo) - ini.getTime()) / DIA) + 1;
    const primero = Math.max(1, dias - 6);
    for (let n = primero; n < primero + 7; n++) {
      const a = ini.getTime() + (n - 1) * DIA;
      cols.push({ etiqueta: `Día ${n}`, porInst: a <= ultimo ? contar(a, a + DIA) : null });
    }
  } else if (vista === 'sem') {
    const semanas = Math.floor((ultimo - ini.getTime()) / (7 * DIA)) + 1;
    const total = Math.max(4, semanas + 1);
    for (let n = 1; n <= total; n++) {
      const a = ini.getTime() + (n - 1) * 7 * DIA;
      cols.push({ etiqueta: `Sem ${n}`, porInst: a <= ultimo ? contar(a, a + 7 * DIA) : null });
    }
  } else {
    const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const c = new Date(ini.getFullYear(), ini.getMonth(), 1);
    const fin = new Date(ultimo);
    const meses: Date[] = [];
    while (c <= fin) { meses.push(new Date(c)); c.setMonth(c.getMonth() + 1); }
    meses.push(new Date(c)); // el que viene, vacío
    for (const m of meses.slice(-6)) {
      const a = m.getTime(), b = new Date(m.getFullYear(), m.getMonth() + 1, 1).getTime();
      cols.push({ etiqueta: MES[m.getMonth()], porInst: a <= ultimo ? contar(a, b) : null });
    }
  }
  return cols;
}

/** Hasta qué valor llega el eje (redondeado a un número «lindo») y sus marcas. */
export function ejeLindo(max: number, marcas = 4) {
  const bruto = Math.max(1, max) / marcas;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map(f => f * mag).find(p => p >= bruto) ?? 10 * mag;
  const tope = Math.ceil(Math.max(1, max) / paso) * paso;
  return { tope, ticks: Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => +(i * paso).toFixed(2)) };
}
