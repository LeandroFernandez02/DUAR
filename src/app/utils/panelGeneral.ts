/**
 * Panel general (CU-42): todo lo que muestra sale de esta función, a partir de una
 * lista de operativos con lo justo para las cifras. Hoy la lista es de ejemplo
 * (data/panelGeneralMock.ts); cuando haya API, el servidor devuelve esta misma forma
 * y la pantalla no cambia.
 *
 * Qué se ve (decidido con el equipo, doc «Panel general de operativos»):
 *  1. Situación actual — siempre de ahora y de todos los operativos (sin filtros).
 *  2. Resultados (duración y resultado al finalizar), 4. instituciones y
 *     especialidades, 5. mapa de calor y 6. operativos por mes — con los filtros.
 * Nunca se cuentan los operativos eliminados ni los de prueba.
 */

export type EstadoOperativoPanel = 'NUEVO' | 'EN_PLANIFICACION' | 'ACTIVO' | 'EN_PROCESO' | 'INACTIVO' | 'FINALIZADO';

import { ETIQUETA_RESULTADO, RESULTADOS_RESUELTOS as RESUELTOS, type ResultadoOperativo } from './resultadoOperativo';
export { ETIQUETA_RESULTADO, type ResultadoOperativo };

export const ETIQUETA_ESTADO: Record<EstadoOperativoPanel, string> = {
  NUEVO: 'Nuevo', EN_PLANIFICACION: 'En planificación', ACTIVO: 'Activo', EN_PROCESO: 'En proceso',
  INACTIVO: 'Inactivo', FINALIZADO: 'Finalizado',
};
const EN_CURSO: EstadoOperativoPanel[] = ['ACTIVO', 'EN_PROCESO'];
const SIN_ACTIVAR: EstadoOperativoPanel[] = ['NUEVO', 'EN_PLANIFICACION'];

export interface OperativoPanel {
  id: string;
  titulo: string;
  localidad: string;
  estado: EstadoOperativoPanel;
  inicio: string;            // ISO
  fin: string | null;        // ISO, sólo finalizados
  resultado: ResultadoOperativo | null;
  /** Hay un coordinador a cargo del puesto de comando ahora (sólo importa en curso). */
  conCoordinador: boolean;
  /** Agentes vigentes ahora, por fase (sólo operativos en curso). */
  agentes: { terreno: number; base: number; noDisponible: number };
  /** Instituciones y especialidades que intervinieron (cada una cuenta una vez por operativo). */
  instituciones: string[];
  especialidades: string[];
  /** Polígonos de búsqueda: anillos [lat, lng]. */
  areas: [number, number][][];
  /** Punto Cero vigente [lat, lng]. */
  puntoCero: [number, number];
  /** Coordinador a cargo del puesto de comando ahora (null = nadie). */
  coordinador: string | null;
  /** Qué se busca (ficha del objetivo), si se cargó. */
  objetivo: { tipo: 'persona' | 'objeto'; descripcion: string } | null;
  /** Grupos vigentes y cuántos están en el terreno ahora. */
  grupos: { total: number; enTerreno: number };
}

export interface FiltrosPanel {
  desde: string;             // AAAA-MM-DD
  hasta: string;             // AAAA-MM-DD
  estado: EstadoOperativoPanel | '';
  localidad: string;
  institucion: string;
}

export interface Porcion { nombre: string; valor: number }
export interface Mes { clave: string; etiqueta: string; iniciados: number; maxSimultaneos: number }

export interface DatosPanel {
  actual: {
    activos: number;
    sinActivar: number;
    agentes: { terreno: number; base: number; noDisponible: number };
    sinCoordinador: OperativoPanel[];
    largos: { op: OperativoPanel; dias: number }[];
  };
  filtrados: OperativoPanel[];
  duracion: { finalizados: number; promedioH: number; medianaH: number; masCorto: OperativoPanel | null; masLargo: OperativoPanel | null; corto: number; largo: number } | null;
  resultados: { resultado: ResultadoOperativo; n: number }[];
  tasaResolucion: number | null;  // 0..1, sobre los finalizados con resultado
  instituciones: Porcion[];
  especialidades: Porcion[];
  meses: Mes[];
}

export const DIAS_LARGO = 30;
const DIA = 86_400_000;
const horas = (o: OperativoPanel) => ((o.fin ? new Date(o.fin).getTime() : Date.now()) - new Date(o.inicio).getTime()) / 3_600_000;

function contar(listas: string[][]): Porcion[] {
  const m = new Map<string, number>();
  for (const l of listas) for (const x of new Set(l)) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m].map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor || a.nombre.localeCompare(b.nombre));
}

/** Más de `max` porciones: las chicas se juntan en «Otras» (nunca se inventan colores nuevos). */
export function agruparPorciones(p: Porcion[], max = 6): Porcion[] {
  if (p.length <= max) return p;
  const resto = p.slice(max - 1).reduce((s, x) => s + x.valor, 0);
  return [...p.slice(0, max - 1), { nombre: 'Otras', valor: resto }];
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function porMes(ops: OperativoPanel[], desde: Date, hasta: Date): Mes[] {
  const meses: Mes[] = [];
  const c = new Date(desde.getFullYear(), desde.getMonth(), 1);
  while (c <= hasta && meses.length < 36) {
    const ini = c.getTime();
    const fin = new Date(c.getFullYear(), c.getMonth() + 1, 1).getTime();
    const iniciados = ops.filter(o => { const t = new Date(o.inicio).getTime(); return t >= ini && t < fin; }).length;
    // Máximo a la vez: se mira día por día dentro del mes.
    let max = 0;
    for (let d = ini; d < fin; d += DIA) {
      const n = ops.filter(o => new Date(o.inicio).getTime() < d + DIA && (o.fin ? new Date(o.fin).getTime() : Date.now()) >= d).length;
      if (n > max) max = n;
    }
    meses.push({ clave: `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}`, etiqueta: `${MESES[c.getMonth()]} ${String(c.getFullYear()).slice(2)}`, iniciados, maxSimultaneos: max });
    c.setMonth(c.getMonth() + 1);
  }
  return meses;
}

export function calcularPanel(todos: OperativoPanel[], f: FiltrosPanel): DatosPanel {
  const ahora = Date.now();
  const enCurso = todos.filter(o => EN_CURSO.includes(o.estado));
  const actual = {
    activos: enCurso.length,
    sinActivar: todos.filter(o => SIN_ACTIVAR.includes(o.estado)).length,
    agentes: enCurso.reduce((s, o) => ({ terreno: s.terreno + o.agentes.terreno, base: s.base + o.agentes.base, noDisponible: s.noDisponible + o.agentes.noDisponible }), { terreno: 0, base: 0, noDisponible: 0 }),
    sinCoordinador: enCurso.filter(o => !o.conCoordinador),
    largos: enCurso.map(op => ({ op, dias: Math.floor((ahora - new Date(op.inicio).getTime()) / DIA) }))
      .filter(x => x.dias > DIAS_LARGO).sort((a, b) => b.dias - a.dias),
  };

  // Un operativo entra en el rango si estuvo abierto en algún momento de él.
  const desde = new Date(`${f.desde}T00:00:00`);
  const hasta = new Date(`${f.hasta}T23:59:59`);
  const filtrados = todos.filter(o =>
    new Date(o.inicio) <= hasta && (o.fin ? new Date(o.fin) : new Date(ahora)) >= desde
    && (!f.estado || o.estado === f.estado)
    && (!f.localidad || o.localidad === f.localidad)
    && (!f.institucion || o.instituciones.includes(f.institucion)));

  const fin = filtrados.filter(o => o.estado === 'FINALIZADO' && o.fin);
  let duracion: DatosPanel['duracion'] = null;
  if (fin.length) {
    const h = fin.map(horas).sort((a, b) => a - b);
    const mitad = Math.floor(h.length / 2);
    const porH = [...fin].sort((a, b) => horas(a) - horas(b));
    duracion = {
      finalizados: fin.length,
      promedioH: h.reduce((s, x) => s + x, 0) / h.length,
      medianaH: h.length % 2 ? h[mitad] : (h[mitad - 1] + h[mitad]) / 2,
      masCorto: porH[0], masLargo: porH[porH.length - 1], corto: h[0], largo: h[h.length - 1],
    };
  }
  const conResultado = fin.filter(o => o.resultado);
  const resultados = (Object.keys(ETIQUETA_RESULTADO) as ResultadoOperativo[])
    .map(resultado => ({ resultado, n: conResultado.filter(o => o.resultado === resultado).length }));
  const tasaResolucion = conResultado.length
    ? conResultado.filter(o => RESUELTOS.includes(o.resultado!)).length / conResultado.length : null;

  return {
    actual, filtrados, duracion, resultados, tasaResolucion,
    instituciones: contar(filtrados.map(o => o.instituciones)),
    especialidades: contar(filtrados.map(o => o.especialidades)),
    meses: porMes(filtrados, desde, hasta),
  };
}

/** 76 h → «3 d 4 h»; 5,5 h → «5 h 30 min». */
export function formatoDuracion(h: number): string {
  if (h < 24) {
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    return mm ? `${hh} h ${mm} min` : `${hh} h`;
  }
  const d = Math.floor(h / 24), hh = Math.round(h - d * 24);
  return hh ? `${d} d ${hh} h` : `${d} d`;
}

export function opcionesDe(todos: OperativoPanel[]) {
  return {
    localidades: [...new Set(todos.map(o => o.localidad))].sort((a, b) => a.localeCompare(b)),
    instituciones: [...new Set(todos.flatMap(o => o.instituciones))].sort((a, b) => a.localeCompare(b)),
  };
}
