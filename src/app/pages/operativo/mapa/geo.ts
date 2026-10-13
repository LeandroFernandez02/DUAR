/**
 * Geometría y formatos del mapa operacional (Módulo 5). Las medidas oficiales
 * (área, perímetro, distancia del track, cobertura) las calcula la base con
 * PostGIS; esto es sólo para la pantalla: vista previa al dibujar, medir y
 * mostrar números con el formato de Argentina.
 */
import type { GeometriaPoligono } from '../../../services/api';

/** [lat, lng], el orden de Leaflet. */
export type LatLng = [number, number];

const R = 6371000;
const rad = (g: number) => (g * Math.PI) / 180;

/** Distancia sobre la esfera (haversine), en metros. */
export function distancia(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function largo(pts: LatLng[], cerrado = false): number {
  if (pts.length < 2) return 0;
  let d = 0;
  const n = cerrado ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) d += distancia(pts[i], pts[(i + 1) % pts.length]);
  return d;
}

/** Área aproximada (proyección local), sólo para la vista previa al dibujar. */
export function area(poly: LatLng[]): number {
  if (poly.length < 3) return 0;
  const lat0 = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const xy = poly.map(([la, ln]) => [rad(ln) * R * Math.cos(rad(lat0)), rad(la) * R]);
  let a = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}

const nf = (v: number, dec: number) => v.toLocaleString('es-AR', { maximumFractionDigits: dec });
export const fmtKm = (m: number) => `${nf(m / 1000, 1)} km`;
export const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${nf(m / 1000, 2)} km`);
export const fmtM = (m: number) => `${Math.round(m).toLocaleString('es-AR')} m`;
export const fmtArea = (m2: number) => (m2 < 1e6 ? `${nf(m2 / 1e4, 1)} ha` : `${nf(m2 / 1e6, 2)} km²`);
export const fmtCoord = (lat: number, lng: number) => `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
export const fmtRadio = (m: number) => (m < 1000 ? `${m} m` : `${nf(m / 1000, 2)} km`);
export const fmtPct = (p: number) => `${nf(p, p < 10 ? 1 : 0)} %`;

/** El anillo de un polígono GeoJSON como vértices de Leaflet (sin repetir el primero). */
export function vertices(g: GeometriaPoligono): LatLng[] {
  const anillo = g.coordinates[0] ?? [];
  const sinCierre = anillo.length > 1 && anillo[0][0] === anillo[anillo.length - 1][0] && anillo[0][1] === anillo[anillo.length - 1][1]
    ? anillo.slice(0, -1) : anillo;
  return sinCierre.map(([lng, lat]) => [lat, lng]);
}

/** Vértices de Leaflet → GeoJSON Polygon cerrado, como lo pide la API. */
export function aPoligono(v: LatLng[]): GeometriaPoligono {
  const anillo = v.map(([lat, lng]) => [lng, lat]);
  return { type: 'Polygon', coordinates: [[...anillo, anillo[0]]] };
}

/**
 * Polígono circular o cuadrado por arrastre: desde donde se pulsa hasta donde
 * se suelta (no hace falta empezar en el centro).
 */
export function formaArrastre(tipo: 'circulo' | 'cuadrado', a: LatLng, b: LatLng): LatLng[] {
  const kx = 111320 * Math.cos(rad(a[0]));
  const dy = (b[0] - a[0]) * 111320;
  const dx = (b[1] - a[1]) * kx;
  if (tipo === 'circulo') {
    const c: LatLng = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const r = Math.hypot(dx, dy) / 2;
    const kc = 111320 * Math.cos(rad(c[0]));
    return Array.from({ length: 48 }, (_, i) => [
      c[0] + (r * Math.sin((i * Math.PI) / 24)) / 111320,
      c[1] + (r * Math.cos((i * Math.PI) / 24)) / kc,
    ] as LatLng);
  }
  const l = Math.max(Math.abs(dx), Math.abs(dy));
  const sx = dx < 0 ? -1 : 1;
  const sy = dy < 0 ? -1 : 1;
  const m = ([y, x]: [number, number]): LatLng => [a[0] + y / 111320, a[1] + x / kx];
  return [[0, 0], [0, sx * l], [sy * l, sx * l], [sy * l, 0]].map(p => m(p as [number, number]));
}

/** Perfil de elevación de un track con [lng, lat, ele] (si el archivo traía elevación). */
export function perfil(coords: number[][]) {
  const dist = [0];
  const el = [coords[0]?.[2] ?? 0];
  for (let i = 1; i < coords.length; i++) {
    dist.push(dist[i - 1] + distancia([coords[i - 1][1], coords[i - 1][0]], [coords[i][1], coords[i][0]]));
    el.push(coords[i][2] ?? 0);
  }
  return { dist, el };
}

/** Elevación del terreno bajo el puntero (servicio externo de Open-Meteo, decisión del 12/10). */
export async function elevacion(lat: number, lng: number, senal?: AbortSignal): Promise<number | null> {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(5)}&longitude=${lng.toFixed(5)}`, { signal: senal });
    if (!r.ok) return null;
    const j = await r.json() as { elevation?: number[] };
    return typeof j.elevation?.[0] === 'number' ? j.elevation[0] : null;
  } catch { return null; }
}
