/**
 * Lo que la pantalla del mapa arma a partir de la API: vértices y colores
 * listos para dibujar, y lo que cada usuario decide ver (CU-33: mostrar u
 * ocultar es de cada usuario, se guarda en su navegador).
 */
import type { GrupoApi, MarcadorApi, PoligonoApi, TrackApi } from '../../../services/api';
import { vertices, type LatLng } from './geo';
import type { Base, Overlays } from './Lienzo';

export interface PoligonoVista extends PoligonoApi { vertices: LatLng[]; color: string }
export interface TrackVista extends TrackApi { puntos: LatLng[]; color: string }

/** Polígono sin grupo: gris pizarra, punteado. */
export const COLOR_SIN_GRUPO = '#475569';
const PALETA_GRUPOS = ['#2563EB', '#16A34A', '#D97706', '#7C3AED', '#DB2777', '#0891B2', '#E0662B', '#0D9488'];
export const PALETA_RADIOS = ['#0891B2', '#0D9488', '#DB2777', '#7C3AED', '#EA580C', '#475569'];

/** El color de un grupo: el que tiene guardado o uno fijo de la paleta según su lugar en la lista. */
export function colorDeGrupo(grupos: GrupoApi[], id: string | null | undefined): string | null {
  if (!id) return null;
  const i = grupos.findIndex(g => g.id === id);
  if (i < 0) return null;
  return grupos[i].color ?? PALETA_GRUPOS[i % PALETA_GRUPOS.length];
}

export function aPoligonoVista(p: PoligonoApi, grupos: GrupoApi[]): PoligonoVista {
  // El color del polígono es el de su grupo de rastrillaje (o el primero que tenga).
  const principal = p.grupos.find(g => g.clase === 'RASTRILLAJE') ?? p.grupos[0];
  return { ...p, vertices: vertices(p.geometria), color: principal ? colorDeGrupo(grupos, principal.id) ?? principal.color ?? COLOR_SIN_GRUPO : COLOR_SIN_GRUPO };
}

export function aTrackVista(t: TrackApi, grupos: GrupoApi[]): TrackVista {
  return {
    ...t,
    puntos: (t.geometria?.coordinates ?? []).map(c => [c[1], c[0]] as LatLng),
    color: colorDeGrupo(grupos, t.grupoId) ?? t.color ?? '#475569',
  };
}

export const esInstalacion = (m: MarcadorApi) => m.clase === 'INSTALACION';

export const OVERLAYS_INICIALES: Overlays = {
  radios: true, poligonos: true, trazas: true, marcadores: true, puntoCero: true, instalaciones: true, poi: true, hallazgos: true,
  etiquetas: true, brechas: false, leyenda: true, coords: true, escala: true, herramientas: true, zoom: true, gruposFlot: true,
};

export interface Preferencias {
  overlays: Overlays;
  base: Base;
  /** Elementos ocultos uno por uno (por id). */
  ocultos: string[];
}

const clave = (operativoId: string) => `duar-mapa-${operativoId}`;

export function leerPreferencias(operativoId: string): Preferencias {
  const porDefecto: Preferencias = { overlays: OVERLAYS_INICIALES, base: 'satelital', ocultos: [] };
  try {
    const j = JSON.parse(localStorage.getItem(clave(operativoId)) ?? 'null') as Partial<Preferencias> | null;
    if (!j) return porDefecto;
    return {
      overlays: { ...OVERLAYS_INICIALES, ...(j.overlays ?? {}) },
      base: j.base === 'politico' || j.base === 'fisico' || j.base === 'satelital' ? j.base : 'satelital',
      ocultos: Array.isArray(j.ocultos) ? j.ocultos.filter(x => typeof x === 'string') : [],
    };
  } catch { return porDefecto; }
}

export function guardarPreferencias(operativoId: string, p: Preferencias) {
  try { localStorage.setItem(clave(operativoId), JSON.stringify(p)); } catch { /* sin almacenamiento: sólo esta sesión */ }
}

/** "12/10 11:05" en hora de Argentina. */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Cordoba', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
}

export function duracion(s: number | null): string {
  if (s === null || s === undefined) return '—';
  const min = Math.round(s / 60);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}
