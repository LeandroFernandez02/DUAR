/**
 * Mapa del Informe (CU-41): la imagen satelital de la zona (la misma de la
 * pantalla del mapa: Esri World Imagery con sus referencias) y, encima, lo que
 * hay en el operativo: polígonos, tracks, radios, Punto Cero, hallazgos,
 * puntos de interés e instalaciones, con escala gráfica y norte.
 *
 * Encuadre: todo lo del operativo, y como mínimo 1 km alrededor del Punto Cero
 * (decisión del usuario, 15/10), para que se reconozca el terreno.
 *
 * Las teselas se piden en el servidor y se pegan en una sola imagen (sharp),
 * que va dentro del SVG; el dibujo usa la misma proyección (Web Mercator en
 * píxeles de tesela), así que calza exacto. Si el servicio de imágenes no
 * responde, el mapa sale igual sobre fondo liso y el pie lo aclara.
 */
import sharp from 'sharp';

const TESELA = 256;
const ZOOM_MAX = 17;
const ESCALA_IMAGEN = 2;            // píxeles de imagen por unidad del PDF: nitidez al imprimir
const IMAGENES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';
const REFERENCIAS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile';
export const ATRIBUCION = 'Imágenes © Esri, Maxar, Earthstar Geographics · Referencias © Esri';

const GRIS = '#c9c2bf';
const ROJO = '#e54b4b';
const ROJO_OSCURO = '#b8302f';
const TINTA = '#2b2827';
const BLANCO = '#ffffff';

const esc = s => String(s ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const color = c => (/^#[0-9a-f]{6}$/i.test(c ?? '') ? c : GRIS);

/** Coordenadas globales en píxeles de tesela a zoom 0 (se multiplican por 2^z). */
const gx = lng => ((lng + 180) / 360) * TESELA;
const gy = lat => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TESELA;
};
const metrosPorPixel = (lat, z) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;

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

async function bajarTesela(base, z, x, y) {
  const n = 2 ** z;
  const xx = ((x % n) + n) % n;
  if (y < 0 || y >= n) return null;
  try {
    const r = await fetch(`${base}/${z}/${y}/${xx}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

/**
 * Pega las teselas que cubren el recuadro [px0, py0] + (anchoPx × altoPx) a zoom z.
 * Devuelve un JPEG o null si no se pudo bajar casi nada.
 */
async function fondoSatelital(z, px0, py0, anchoPx, altoPx) {
  const tx0 = Math.floor(px0 / TESELA), ty0 = Math.floor(py0 / TESELA);
  const tx1 = Math.floor((px0 + anchoPx - 1) / TESELA), ty1 = Math.floor((py0 + altoPx - 1) / TESELA);
  const pedidos = [];
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) pedidos.push({ tx, ty });
  }
  const [base, refs] = await Promise.all([
    Promise.all(pedidos.map(p => bajarTesela(IMAGENES, z, p.tx, p.ty))),
    Promise.all(pedidos.map(p => bajarTesela(REFERENCIAS, z, p.tx, p.ty))),
  ]);
  if (base.filter(Boolean).length < pedidos.length / 2) return null;

  const capas = [];
  pedidos.forEach((p, i) => {
    const left = Math.round(p.tx * TESELA - px0), top = Math.round(p.ty * TESELA - py0);
    if (base[i]) capas.push({ input: base[i], left, top });
    if (refs[i]) capas.push({ input: refs[i], left, top });
  });
  // sharp no acepta capas que se salen del lienzo: se arma con margen y después se recorta.
  const m = TESELA;
  const lienzo = sharp({ create: { width: anchoPx + 2 * m, height: altoPx + 2 * m, channels: 3, background: '#d9d4cf' } })
    .composite(capas.map(c => ({ ...c, left: c.left + m, top: c.top + m })));
  const armado = await lienzo.png().toBuffer();
  return sharp(armado).extract({ left: m, top: m, width: anchoPx, height: altoPx }).jpeg({ quality: 78 }).toBuffer();
}

/** Texto con borde blanco, para que se lea sobre la imagen. */
function rotulo(x, y, texto, { tam = 8, peso = 'bold', relleno = TINTA, ancla = 'start' } = {}) {
  const base = `x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${tam}" font-weight="${peso}" text-anchor="${ancla}"`;
  return `<text ${base} fill="${BLANCO}" stroke="${BLANCO}" stroke-width="1.8" stroke-linejoin="round">${esc(texto)}</text>`
    + `<text ${base} fill="${relleno}">${esc(texto)}</text>`;
}

/**
 * @returns {Promise<{ svg: string, ancho: number, alto: number, conImagen: boolean } | null>}
 */
export async function mapaSvg({ poligonos, tracks, marcadores, hallazgos, radios, puntoCero, puntoCeroAnteriores }, ancho = 515, alto = 330) {
  const pts = [];
  poligonos.forEach(p => anillos(p.geom).forEach(a => pts.push(...a)));
  tracks.forEach(t => lineas(t.geom).forEach(l => pts.push(...l)));
  marcadores.forEach(m => pts.push([m.lng, m.lat]));
  hallazgos.forEach(h => pts.push([h.lng, h.lat]));
  puntoCeroAnteriores.forEach(p => pts.push([p.lng, p.lat]));
  if (puntoCero) pts.push([puntoCero.lng, puntoCero.lat]);
  if (!pts.length) return null;

  // 1 km alrededor del Punto Cero, como mínimo.
  if (puntoCero) {
    const dLat = 1000 / 111320, dLng = 1000 / (111320 * Math.cos((puntoCero.lat * Math.PI) / 180));
    pts.push([puntoCero.lng - dLng, puntoCero.lat - dLat], [puntoCero.lng + dLng, puntoCero.lat + dLat]);
  }

  let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const [lng, lat] of pts) {
    x0 = Math.min(x0, gx(lng)); x1 = Math.max(x1, gx(lng)); y0 = Math.min(y0, gy(lat)); y1 = Math.max(y1, gy(lat));
  }
  const anchoPx = ancho * ESCALA_IMAGEN, altoPx = alto * ESCALA_IMAGEN, margen = 28 * ESCALA_IMAGEN;
  // Encuadre exacto: el zoom «ideal» casi nunca es entero. Se bajan las teselas del
  // zoom entero de arriba (más detalle) y la imagen se achica hasta el tamaño justo.
  const zIdeal = Math.log2(Math.min((anchoPx - 2 * margen) / Math.max(x1 - x0, 1e-9), (altoPx - 2 * margen) / Math.max(y1 - y0, 1e-9)));
  const z = Math.max(1, Math.min(ZOOM_MAX, Math.ceil(zIdeal)));
  const s = Math.min(1, 2 ** (zIdeal - z));          // píxeles de imagen por píxel de tesela
  const k = 2 ** z;
  const anchoT = Math.round(anchoPx / s), altoT = Math.round(altoPx / s);
  const px0 = Math.round(((x0 + x1) / 2) * k - anchoT / 2);
  const py0 = Math.round(((y0 + y1) / 2) * k - altoT / 2);

  const teselas = await fondoSatelital(z, px0, py0, anchoT, altoT).catch(() => null);
  const fondo = teselas && (s < 1 ? await sharp(teselas).resize(anchoPx, altoPx).jpeg({ quality: 80 }).toBuffer() : teselas);

  // Proyección a unidades del PDF.
  const P = (lng, lat) => [((gx(lng) * k - px0) * s) / ESCALA_IMAGEN, ((gy(lat) * k - py0) * s) / ESCALA_IMAGEN];
  const f = n => n.toFixed(1);
  const camino = coords => coords.map(([lng, lat], i) => `${i ? 'L' : 'M'}${P(lng, lat).map(f).join(' ')}`).join(' ');
  const latRef = puntoCero?.lat ?? pts[0][1];
  // Unidades del PDF por metro del terreno.
  const porMetro = s / (metrosPorPixel(latRef, z) * ESCALA_IMAGEN);

  const partes = [fondo
    ? `<image x="0" y="0" width="${ancho}" height="${alto}" preserveAspectRatio="none" href="data:image/jpeg;base64,${fondo.toString('base64')}"/>`
    : `<rect x="0" y="0" width="${ancho}" height="${alto}" fill="#f1ede9"/>`];

  if (puntoCero) {
    const [cx, cy] = P(puntoCero.lng, puntoCero.lat);
    for (const r of radios) {
      const rp = r.radioM * porMetro;
      if (rp > Math.hypot(ancho, alto) * 1.5) continue;
      partes.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rp)}" fill="none" stroke="${BLANCO}" stroke-width="2.2" stroke-opacity="0.7"/>`);
      partes.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rp)}" fill="none" stroke="${color(r.color) === GRIS ? ROJO : color(r.color)}" stroke-width="1.1" stroke-dasharray="5 3"/>`);
      const ty = cy - rp - 3;
      if (ty > 10) partes.push(rotulo(cx, ty, r.radioM >= 1000 ? `${r.radioM / 1000} km` : `${r.radioM} m`, { tam: 7, ancla: 'middle', relleno: ROJO_OSCURO }));
    }
  }

  for (const p of poligonos) {
    const c = p.color ? color(p.color) : BLANCO;
    const d = anillos(p.geom).map(a => camino(a) + ' Z').join(' ');
    partes.push(`<path d="${d}" fill="${c}" fill-opacity="0.18" stroke="${c}" stroke-width="1.8"${p.color ? '' : ' stroke-dasharray="5 3"'}/>`);
  }
  for (const t of tracks) {
    for (const l of lineas(t.geom)) {
      partes.push(`<path d="${camino(l)}" fill="none" stroke="${BLANCO}" stroke-width="2" stroke-opacity="0.6" stroke-linejoin="round"/>`);
      partes.push(`<path d="${camino(l)}" fill="none" stroke="${color(t.color)}" stroke-width="1.1" stroke-linejoin="round"/>`);
    }
  }
  for (const p of poligonos) {
    const a = anillos(p.geom)[0];
    if (!a?.length) continue;
    const xy = a.slice(0, -1).map(([lng, lat]) => P(lng, lat));
    const cx = xy.reduce((s, v) => s + v[0], 0) / xy.length;
    let cy = xy.reduce((s, v) => s + v[1], 0) / xy.length;
    // Si el centro del polígono cae sobre el Punto Cero, el nombre se corre abajo del punto: si no,
    // se pisaban «Punto Cero» y el nombre (recorrido del 19/10).
    if (puntoCero) {
      const [px, py] = P(puntoCero.lng, puntoCero.lat);
      if (Math.abs(cx - px) < 45 && Math.abs(cy - py) < 14) cy = py + 18;
    }
    const nombre = p.nombre.length > 26 ? p.nombre.slice(0, 25) + '…' : p.nombre;
    partes.push(rotulo(cx, cy, nombre, { tam: 8, ancla: 'middle', relleno: p.color ? color(p.color) : TINTA }));
  }

  for (const m of marcadores) {
    const [x, y] = P(m.lng, m.lat);
    partes.push(m.clase === 'INSTALACION'
      ? `<rect x="${f(x - 4)}" y="${f(y - 4)}" width="8" height="8" fill="${TINTA}" stroke="${BLANCO}" stroke-width="1"/>`
      : `<path d="M${f(x)} ${f(y - 5)} L${f(x + 4.5)} ${f(y + 3)} L${f(x - 4.5)} ${f(y + 3)} Z" fill="${TINTA}" stroke="${BLANCO}" stroke-width="1"/>`);
    partes.push(rotulo(x + 7, y + 3, m.nombre.slice(0, 30), { tam: 7, peso: 'normal' }));
  }

  const recorrido = [...puntoCeroAnteriores, ...(puntoCero ? [puntoCero] : [])].map(p => P(p.lng, p.lat));
  if (recorrido.length > 1) {
    partes.push(`<path d="${recorrido.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ')}" fill="none" stroke="${BLANCO}" stroke-width="1" stroke-dasharray="2 2"/>`);
  }
  for (const p of puntoCeroAnteriores) {
    const [x, y] = P(p.lng, p.lat);
    partes.push(`<circle cx="${f(x)}" cy="${f(y)}" r="3.5" fill="${BLANCO}" stroke="${TINTA}" stroke-width="1.2"/>`);
  }
  if (puntoCero) {
    const [x, y] = P(puntoCero.lng, puntoCero.lat);
    partes.push(`<circle cx="${f(x)}" cy="${f(y)}" r="5.5" fill="${ROJO_OSCURO}" stroke="${BLANCO}" stroke-width="1.8"/>`);
    partes.push(rotulo(x - 8, y - 7, 'Punto Cero', { tam: 7.5, ancla: 'end', relleno: ROJO_OSCURO }));
  }
  hallazgos.forEach((h, i) => {
    const [x, y] = P(h.lng, h.lat);
    partes.push(`<circle cx="${f(x)}" cy="${f(y)}" r="7" fill="${ROJO}" stroke="${BLANCO}" stroke-width="1.2"/>`);
    partes.push(`<text x="${f(x)}" y="${f(y + 2.4)}" font-size="6.5" font-weight="bold" text-anchor="middle" fill="${BLANCO}">H${i + 1}</text>`);
  });

  // Norte y escala gráfica, sobre una placa blanca.
  partes.push(`<rect x="${ancho - 30}" y="6" width="24" height="32" rx="3" fill="${BLANCO}" fill-opacity="0.85"/>`);
  partes.push(`<path d="M${ancho - 18} 10 L${ancho - 13} 24 L${ancho - 18} 21 L${ancho - 23} 24 Z" fill="${TINTA}"/>`);
  partes.push(`<text x="${ancho - 18}" y="34" font-size="7.5" text-anchor="middle" fill="${TINTA}">N</text>`);
  const opciones = [25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000];
  const metros = opciones.reduce((m, o) => (o * porMetro <= ancho * 0.22 ? o : m), opciones[0]);
  const largo = metros * porMetro, bx = ancho - 14 - largo, by = alto - 12;
  partes.push(`<rect x="${f(bx - 8)}" y="${by - 14}" width="${f(largo + 16)}" height="22" rx="3" fill="${BLANCO}" fill-opacity="0.85"/>`);
  partes.push(`<rect x="${f(bx)}" y="${by}" width="${f(largo / 2)}" height="3.5" fill="${TINTA}"/>`);
  partes.push(`<rect x="${f(bx + largo / 2)}" y="${by}" width="${f(largo / 2)}" height="3.5" fill="${BLANCO}" stroke="${TINTA}" stroke-width="0.6"/>`);
  partes.push(`<text x="${f(bx)}" y="${by - 3}" font-size="7" fill="${TINTA}">0</text>`);
  partes.push(`<text x="${f(bx + largo)}" y="${by - 3}" font-size="7" text-anchor="end" fill="${TINTA}">${metros >= 1000 ? `${metros / 1000} km` : `${metros} m`}</text>`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">`
    + `<defs><clipPath id="marco"><rect x="0" y="0" width="${ancho}" height="${alto}"/></clipPath></defs>`
    + `<g clip-path="url(#marco)">${partes.join('')}</g></svg>`;
  return { svg, ancho, alto, conImagen: !!fondo };
}
