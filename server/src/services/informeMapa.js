/**
 * Mapa del Informe (CU-41): un SVG vectorial con lo que hay en el operativo
 * (polígonos, tracks, radios, Punto Cero, hallazgos, puntos de interés e
 * instalaciones), sin mapa base. Sin teselas externas el PDF no depende de
 * ningún servicio y sale igual siempre; las coordenadas de cada hallazgo van
 * escritas en el informe para ubicarlo en cualquier mapa.
 *
 * Proyección Web Mercator (la misma del mapa del sistema), encuadrada en los
 * elementos, con escala gráfica y norte.
 */

const R = 6378137;
const GRIS = '#8a8380';
const ROJO = '#e54b4b';
const ROJO_OSCURO = '#b8302f';
const TINTA = '#2b2827';

const esc = s => String(s ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const color = c => (/^#[0-9a-f]{6}$/i.test(c ?? '') ? c : GRIS);

const mx = lng => (lng * Math.PI) / 180;
const my = lat => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/** Anillos [[lng,lat],…] de un Polygon o MultiPolygon GeoJSON. */
function anillos(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return geom.coordinates;
  if (geom.type === 'MultiPolygon') return geom.coordinates.flat();
  return [];
}
function lineas(geom) {
  if (!geom) return [];
  if (geom.type === 'LineString') return [geom.coordinates];
  if (geom.type === 'MultiLineString') return geom.coordinates;
  return [];
}

/**
 * @returns {{ svg: string, ancho: number, alto: number }}
 */
export function mapaSvg({ poligonos, tracks, marcadores, hallazgos, radios, puntoCero, puntoCeroAnteriores }, ancho = 515, alto = 300) {
  const pts = [];
  poligonos.forEach(p => anillos(p.geom).forEach(a => pts.push(...a)));
  tracks.forEach(t => lineas(t.geom).forEach(l => pts.push(...l)));
  marcadores.forEach(m => pts.push([m.lng, m.lat]));
  hallazgos.forEach(h => pts.push([h.lng, h.lat]));
  puntoCeroAnteriores.forEach(p => pts.push([p.lng, p.lat]));
  if (puntoCero) pts.push([puntoCero.lng, puntoCero.lat]);
  if (!pts.length) return null;

  const latRef = puntoCero?.lat ?? pts[0][1];
  const mPorUnidad = R * Math.cos((latRef * Math.PI) / 180);
  let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const [lng, lat] of pts) {
    const x = mx(lng), y = my(lat);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  // Mínimo 600 m de lado, para que un único punto no quede en un zoom absurdo.
  const minimo = 600 / mPorUnidad;
  if (x1 - x0 < minimo) { const c = (x0 + x1) / 2; x0 = c - minimo / 2; x1 = c + minimo / 2; }
  if (y1 - y0 < minimo) { const c = (y0 + y1) / 2; y0 = c - minimo / 2; y1 = c + minimo / 2; }

  const margen = 24;
  const k = Math.min((ancho - 2 * margen) / (x1 - x0), (alto - 2 * margen) / (y1 - y0));
  const ox = (ancho - (x1 - x0) * k) / 2, oy = (alto - (y1 - y0) * k) / 2;
  const P = (lng, lat) => [ox + (mx(lng) - x0) * k, alto - (oy + (my(lat) - y0) * k)];
  const f = n => n.toFixed(1);
  const camino = coords => coords.map(([lng, lat], i) => `${i ? 'L' : 'M'}${P(lng, lat).map(f).join(' ')}`).join(' ');
  const pxPorMetro = k / mPorUnidad;

  const partes = [`<rect x="0" y="0" width="${ancho}" height="${alto}" fill="#fbfaf8"/>`];

  // Radios desde el Punto Cero (debajo de todo, recortados al recuadro).
  if (puntoCero) {
    const [cx, cy] = P(puntoCero.lng, puntoCero.lat);
    for (const r of radios) {
      const rp = r.radioM * pxPorMetro;
      if (rp > Math.hypot(ancho, alto) * 1.5) continue;
      partes.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rp)}" fill="none" stroke="${ROJO_OSCURO}" stroke-width="0.8" stroke-dasharray="4 3"/>`);
      const ty = cy - rp - 3;
      if (ty > 10) partes.push(`<text x="${f(cx + 3)}" y="${f(ty)}" font-size="7" fill="${ROJO_OSCURO}">${esc(r.radioM >= 1000 ? `${r.radioM / 1000} km` : `${r.radioM} m`)}</text>`);
    }
  }

  for (const p of poligonos) {
    const c = color(p.color);
    const d = anillos(p.geom).map(a => camino(a) + ' Z').join(' ');
    partes.push(`<path d="${d}" fill="${c}" fill-opacity="0.10" stroke="${c}" stroke-width="1.3"${p.color ? '' : ' stroke-dasharray="4 3"'}/>`);
  }
  for (const t of tracks) {
    for (const l of lineas(t.geom)) partes.push(`<path d="${camino(l)}" fill="none" stroke="${color(t.color)}" stroke-width="0.9" stroke-linejoin="round"/>`);
  }
  for (const p of poligonos) {
    const a = anillos(p.geom)[0];
    if (!a?.length) continue;
    const xy = a.slice(0, -1).map(([lng, lat]) => P(lng, lat));
    const cx = xy.reduce((s, v) => s + v[0], 0) / xy.length, cy = xy.reduce((s, v) => s + v[1], 0) / xy.length;
    const nombre = p.nombre.length > 26 ? p.nombre.slice(0, 25) + '…' : p.nombre;
    partes.push(`<text x="${f(cx)}" y="${f(cy)}" font-size="8" font-weight="bold" text-anchor="middle" fill="${p.color ? color(p.color) : '#6f6866'}">${esc(nombre)}</text>`);
  }

  for (const m of marcadores) {
    const [x, y] = P(m.lng, m.lat);
    if (m.clase === 'INSTALACION') {
      partes.push(`<rect x="${f(x - 4)}" y="${f(y - 4)}" width="8" height="8" fill="${TINTA}"/>`);
    } else {
      partes.push(`<path d="M${f(x)} ${f(y - 5)} L${f(x + 4.5)} ${f(y + 3)} L${f(x - 4.5)} ${f(y + 3)} Z" fill="${TINTA}"/>`);
    }
    partes.push(`<text x="${f(x + 7)}" y="${f(y + 3)}" font-size="7" fill="${TINTA}">${esc(m.nombre.slice(0, 30))}</text>`);
  }

  // Punto Cero: los anteriores en gris unidos por su recorrido; el vigente en rojo.
  const recorrido = [...puntoCeroAnteriores, ...(puntoCero ? [puntoCero] : [])].map(p => P(p.lng, p.lat));
  if (recorrido.length > 1) {
    partes.push(`<path d="${recorrido.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ')}" fill="none" stroke="${GRIS}" stroke-width="0.8" stroke-dasharray="2 2"/>`);
  }
  for (const p of puntoCeroAnteriores) {
    const [x, y] = P(p.lng, p.lat);
    partes.push(`<circle cx="${f(x)}" cy="${f(y)}" r="3.5" fill="#ffffff" stroke="${GRIS}" stroke-width="1.2"/>`);
  }
  if (puntoCero) {
    const [x, y] = P(puntoCero.lng, puntoCero.lat);
    partes.push(`<circle cx="${f(x)}" cy="${f(y)}" r="5" fill="${ROJO_OSCURO}" stroke="#ffffff" stroke-width="1.5"/>`);
    partes.push(`<text x="${f(x - 8)}" y="${f(y - 7)}" font-size="7.5" font-weight="bold" text-anchor="end" fill="${ROJO_OSCURO}">PC</text>`);
  }
  hallazgos.forEach((h, i) => {
    const [x, y] = P(h.lng, h.lat);
    partes.push(`<circle cx="${f(x)}" cy="${f(y)}" r="7" fill="${ROJO}" stroke="#ffffff" stroke-width="1"/>`);
    partes.push(`<text x="${f(x)}" y="${f(y + 2.4)}" font-size="6.5" font-weight="bold" text-anchor="middle" fill="#ffffff">H${i + 1}</text>`);
  });

  // Norte y escala gráfica.
  partes.push(`<path d="M${ancho - 18} 10 L${ancho - 13} 24 L${ancho - 18} 21 L${ancho - 23} 24 Z" fill="${TINTA}"/>`);
  partes.push(`<text x="${ancho - 18}" y="33" font-size="7.5" text-anchor="middle" fill="${TINTA}">N</text>`);
  const opciones = [25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000];
  const metros = opciones.reduce((m, o) => (o * pxPorMetro <= ancho * 0.22 ? o : m), opciones[0]);
  const largo = metros * pxPorMetro, bx = ancho - 14 - largo, by = alto - 12;
  partes.push(`<rect x="${f(bx)}" y="${by}" width="${f(largo / 2)}" height="3.5" fill="${TINTA}"/>`);
  partes.push(`<rect x="${f(bx + largo / 2)}" y="${by}" width="${f(largo / 2)}" height="3.5" fill="#ffffff" stroke="${TINTA}" stroke-width="0.6"/>`);
  partes.push(`<text x="${f(bx)}" y="${by - 3}" font-size="7" fill="#6f6866">0</text>`);
  partes.push(`<text x="${f(bx + largo)}" y="${by - 3}" font-size="7" text-anchor="end" fill="#6f6866">${metros >= 1000 ? `${metros / 1000} km` : `${metros} m`}</text>`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">`
    + `<defs><clipPath id="marco"><rect x="0" y="0" width="${ancho}" height="${alto}"/></clipPath></defs>`
    + `<g clip-path="url(#marco)">${partes.join('')}</g></svg>`;
  return { svg, ancho, alto };
}
