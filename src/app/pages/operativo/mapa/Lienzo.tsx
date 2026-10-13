/**
 * Lienzo Leaflet del mapa operacional (CU-33). Imperativo a propósito, como el
 * prototipo: hay pocos elementos y redibujar la capa entera ante cada cambio
 * es más simple y predecible que sincronizar componentes uno por uno.
 *
 * Capas, de abajo hacia arriba: mapa base · radios (pane propio, no tapan
 * clics) · brechas · polígonos · tracks · marcadores · dibujo en curso.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { pinHtml, type TipoSimbolo } from './piezas';
import { elevacion, fmtDist, fmtRadio, formaArrastre, largo, type LatLng } from './geo';

export type Base = 'politico' | 'fisico' | 'satelital';
export const BASES: { id: Base; etiqueta: string }[] = [
  { id: 'politico', etiqueta: 'Político' }, { id: 'fisico', etiqueta: 'Físico' }, { id: 'satelital', etiqueta: 'Satelital' },
];
const CAPAS_BASE: Record<Base, { url: string; attr: string }[]> = {
  politico: [{ url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap' }],
  fisico: [{ url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: '&copy; OpenTopoMap (CC-BY-SA)' }],
  satelital: [
    { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics' },
    { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', attr: 'Referencias &copy; Esri' },
  ],
};

export type Herr = 'select' | 'medir' | 'poligono' | 'circulo' | 'cuadrado' | 'poi' | 'instalacion' | 'puntoCero';
export type Seleccion = { tipo: 'poligono' | 'track' | 'marcador' | 'puntoCero'; id: string };

export interface PoligonoLienzo { id: string; nombre: string; vertices: LatLng[]; color: string; sinGrupo: boolean; coberturaPct: number; tracks: number; brechas: unknown | null }
export interface TrackLienzo { id: string; puntos: LatLng[]; color: string }
export interface MarcadorLienzo { id: string; simbolo: TipoSimbolo; nombre: string; lat: number; lng: number; esInstalacion: boolean }
export interface RadioLienzo { id: string; radioM: number; color: string }

export interface Overlays {
  radios: boolean; poligonos: boolean; trazas: boolean; marcadores: boolean; puntoCero: boolean; instalaciones: boolean;
  poi: boolean; hallazgos: boolean; etiquetas: boolean; brechas: boolean; leyenda: boolean; coords: boolean; escala: boolean;
  herramientas: boolean; zoom: boolean; gruposFlot: boolean;
}

export interface Vuelo { pts: LatLng[]; k: number; panel?: boolean; luego?: () => void }

interface Props {
  centroInicial: LatLng;
  base: Base;
  overlays: Overlays;
  poligonos: PoligonoLienzo[];
  tracks: TrackLienzo[];
  marcadores: MarcadorLienzo[];
  puntoCero: LatLng | null;
  radios: RadioLienzo[];
  radiosCentro: LatLng | null;
  radiosVistaPrevia: boolean;
  sel: Seleccion | null;
  globo: { latlng: LatLng; offset: number; k: number; clave: string } | null;
  contenidoGlobo: ReactNode;
  herr: Herr;
  borrador: LatLng[];
  medida: LatLng[];
  editVerts: { id: string; verts: LatLng[] } | null;
  moviendo: { id: string; ll: LatLng } | null;
  vuelo: Vuelo | null;
  /** Ancho que tapa el panel de la derecha: los vuelos y los globos lo esquivan. */
  margenDerecho: number;
  onReady: (m: L.Map) => void;
  onClicMapa: (ll: LatLng) => void;
  onDobleClic: () => void;
  onForma: (tipo: 'circulo' | 'cuadrado', a: LatLng, b: LatLng) => void;
  onSeleccion: (s: Seleccion, ll: LatLng) => void;
  onMoverArrastre: (ll: LatLng) => void;
  onVertice: (i: number, ll: LatLng) => void;
}

const cssVar = (n: string, f: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
const PRI = () => cssVar('--primary', '#E54B4B');
const FG = () => cssVar('--foreground', '#444140');

function iconoPin(tipo: TipoSimbolo, etiqueta: string | null, sel: boolean) {
  const { html, alto } = pinHtml(tipo, etiqueta, sel);
  return L.divIcon({ html, className: 'duar-divicon', iconSize: [140, alto + 24], iconAnchor: [70, alto] });
}
const iconoVertice = (color: string) => L.divIcon({
  className: 'duar-divicon',
  html: `<div style="width:12px;height:12px;border-radius:50%;background:#fff;border:2.5px solid ${color};box-shadow:0 1px 4px rgba(0,0,0,.35);box-sizing:border-box"></div>`,
  iconSize: [12, 12], iconAnchor: [6, 6],
});

/* Estilos de Leaflet del mapa: puntero flecha (mano sólo al arrastrar o sobre un elemento), globos y etiquetas. */
const ESTILOS = `
.mapa-duar.leaflet-container{font-family:var(--font-family-primary)}
.mapa-duar.leaflet-grab{cursor:default}
.leaflet-dragging .mapa-duar.leaflet-grab,.leaflet-dragging .mapa-duar .leaflet-interactive,.leaflet-dragging .mapa-duar .leaflet-marker-draggable{cursor:grabbing}
.mapa-duar .leaflet-interactive,.mapa-duar .leaflet-marker-icon{cursor:pointer}
.mapa-duar.dibujando,.mapa-duar.dibujando .leaflet-interactive{cursor:crosshair}
.duar-divicon{background:none;border:none}
.leaflet-tooltip.duar-tip{background:rgba(28,25,23,.86);border:none;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.3);color:#fff;font-family:var(--font-family-primary);font-size:11px;font-weight:600;padding:3px 8px;display:flex;align-items:center;gap:6px;white-space:nowrap}
.leaflet-tooltip.duar-tip:before{display:none}
.duar-tip .dot{width:7px;height:7px;border-radius:50%;display:inline-block;box-shadow:0 0 0 1.5px #fff}
.duar-ring-lbl{display:inline-block;background:#fff;border:1.5px solid;border-radius:999px;padding:0 7px;font:700 10px/15px var(--font-family-primary);white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.25)}
.duar-divicon:has(.duar-ring-lbl){display:flex;justify-content:center;align-items:center}
.duar-popup .leaflet-popup-content-wrapper{background:var(--card);color:var(--foreground);border-radius:14px;padding:0;border:1px solid var(--border);box-shadow:0 8px 32px rgba(68,65,64,.22)}
.duar-popup .leaflet-popup-content{margin:0;width:auto!important;line-height:1.4}
.duar-popup .leaflet-popup-tip{background:var(--card);box-shadow:none}
.mapa-duar .leaflet-control-attribution{font-size:10px}
`;

const escapar = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export default function Lienzo(props: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const capas = useRef<Record<string, L.LayerGroup>>({});
  const extra = useRef<{ rubber?: L.Polyline; forma?: LatLng | null; tiles?: L.TileLayer[]; radR?: L.Renderer; popup?: L.Popup }>({});
  const cb = useRef(props);
  cb.current = props;
  const [escala, setEscala] = useState({ px: 80, etiqueta: '' });
  const coordRef = useRef<HTMLSpanElement>(null);
  const elevRef = useRef<HTMLSpanElement>(null);
  const [popEl] = useState(() => document.createElement('div'));

  /* Montaje: el mapa y sus eventos, una sola vez. */
  useEffect(() => {
    const map = L.map(elRef.current!, { zoomControl: false, doubleClickZoom: false, attributionControl: true })
      .setView(props.centroInicial, 14);
    map.getContainer().classList.add('mapa-duar');
    // Radios: debajo de los polígonos (overlayPane = 400), sobre el mapa base, sin tapar clics.
    map.createPane('radios').style.zIndex = '350';
    map.getPane('radios')!.style.pointerEvents = 'none';
    map.createPane('radiosLbl').style.zIndex = '390';
    map.getPane('radiosLbl')!.style.pointerEvents = 'none';
    extra.current.radR = L.svg({ pane: 'radios' });
    for (const k of ['rad', 'gap', 'pol', 'tr', 'pts', 'meas', 'draft']) capas.current[k] = L.layerGroup().addTo(map);
    extra.current.rubber = L.polyline([], { color: PRI(), weight: 2, dashArray: '4 6', interactive: false }).addTo(map);

    const aLL = (e: L.LeafletMouseEvent): LatLng => [e.latlng.lat, e.latlng.lng];
    // Un botón del globo que lo cierra (React lo saca del DOM antes de que el clic
    // llegue al mapa) no tiene que contar como un clic en el mapa vacío.
    map.on('click', e => {
      const ev = e as L.LeafletMouseEvent;
      if (!(ev.originalEvent.target as Node | null)?.isConnected) return;
      cb.current.onClicMapa(aLL(ev));
    });
    map.on('dblclick', () => cb.current.onDobleClic());
    const esForma = () => cb.current.herr === 'circulo' || cb.current.herr === 'cuadrado';
    map.on('mousedown', e => {
      const ev = e as L.LeafletMouseEvent;
      if (!esForma() || ev.originalEvent.button !== 0) return;
      extra.current.forma = aLL(ev);
      extra.current.rubber!.setStyle({ color: PRI(), dashArray: undefined });
    });
    map.on('mouseup', e => {
      const a = extra.current.forma;
      if (!a) return;
      extra.current.forma = null;
      extra.current.rubber!.setStyle({ dashArray: '4 6' });
      extra.current.rubber!.setLatLngs([]);
      const t = cb.current.herr;
      if (t === 'circulo' || t === 'cuadrado') cb.current.onForma(t, a, aLL(e as L.LeafletMouseEvent));
    });
    const alEsc = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && extra.current.forma) { extra.current.forma = null; extra.current.rubber!.setLatLngs([]); }
    };
    document.addEventListener('keydown', alEsc);

    const actualizarEscala = () => {
      const y = map.getSize().y / 2;
      const mpp = map.distance(map.containerPointToLatLng([0, y]), map.containerPointToLatLng([100, y])) / 100;
      const pasos = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
      const d = pasos.filter(s => s / mpp <= 130).pop() ?? 1;
      setEscala({ px: Math.round(d / mpp), etiqueta: d >= 1000 ? `${d / 1000} km` : `${d} m` });
    };
    map.on('zoomend moveend resize', actualizarEscala);
    actualizarEscala();

    // Coordenadas al instante; la elevación se pide cuando el puntero se queda quieto.
    let espera: ReturnType<typeof setTimeout> | undefined;
    let pedido: AbortController | undefined;
    map.on('mousemove', e => {
      const ll = aLL(e as L.LeafletMouseEvent);
      if (coordRef.current) coordRef.current.textContent = `Lat ${ll[0].toFixed(5)}°  Lon ${ll[1].toFixed(5)}°`;
      clearTimeout(espera);
      espera = setTimeout(async () => {
        pedido?.abort();
        pedido = new AbortController();
        const m = await elevacion(ll[0], ll[1], pedido.signal);
        if (elevRef.current) elevRef.current.textContent = m === null ? 'Elev. —' : `Elev. ${Math.round(m).toLocaleString('es-AR')} m`;
      }, 450);
      const p = cb.current;
      if (p.herr === 'circulo' || p.herr === 'cuadrado') {
        const a = extra.current.forma;
        if (a) { const v = formaArrastre(p.herr, a, ll); extra.current.rubber!.setLatLngs([...v, v[0]]); }
        else extra.current.rubber!.setLatLngs([]);
        return;
      }
      const d = p.herr === 'poligono' ? p.borrador : p.herr === 'medir' ? p.medida : null;
      if (d && d.length) {
        extra.current.rubber!.setStyle({ color: p.herr === 'medir' ? FG() : PRI() });
        extra.current.rubber!.setLatLngs(p.herr === 'poligono' ? [d[d.length - 1], ll, d[0]] : [d[d.length - 1], ll]);
      } else extra.current.rubber!.setLatLngs([]);
    });

    extra.current.popup = L.popup({
      closeButton: false, autoClose: false, closeOnClick: false, closeOnEscapeKey: false,
      autoPanPaddingTopLeft: L.point(80, 90), autoPanPaddingBottomRight: L.point(80, 70),
      maxWidth: 360, minWidth: 280, className: 'duar-popup',
    });
    mapRef.current = map;
    cb.current.onReady(map);
    // Al abrir o cerrar el árbol o un panel cambia el ancho: el mapa se reacomoda.
    const obs = new ResizeObserver(() => map.invalidateSize());
    obs.observe(elRef.current!);
    return () => {
      obs.disconnect();
      clearTimeout(espera);
      pedido?.abort();
      document.removeEventListener('keydown', alEsc);
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Mapa base. */
  useEffect(() => {
    const map = mapRef.current!;
    extra.current.tiles?.forEach(t => map.removeLayer(t));
    extra.current.tiles = CAPAS_BASE[props.base].map(b => L.tileLayer(b.url, { attribution: b.attr, maxZoom: 19, subdomains: 'abc' }).addTo(map));
    extra.current.tiles.forEach(t => t.bringToBack());
  }, [props.base]);

  /* Vuelos (encuadrar un elemento; con panel abierto deja lugar a la derecha). */
  useEffect(() => {
    const f = props.vuelo;
    const map = mapRef.current;
    if (!f || !map || !f.pts.length) return;
    const w = map.getSize().x;
    const margen = Math.max(f.panel ? Math.min(380, w * 0.45) : 0, cb.current.margenDerecho);
    const opts = { maxZoom: 16, paddingTopLeft: L.point(80, 80), paddingBottomRight: L.point(margen + 80, 60) };
    const uno = f.pts.length === 1;
    const z = Math.max(map.getZoom(), 15);
    // Un punto solo se centra en lo que queda visible (sin el panel).
    const destino = uno ? map.unproject(map.project(f.pts[0], z).add([margen / 2, 0]), z) : null;
    let hecho = false;
    const fin = () => { if (hecho) return; hecho = true; f.luego?.(); };
    map.once('moveend', fin);
    const t = setTimeout(() => {
      if (hecho) return;
      map.stop();
      if (uno) map.setView(destino!, z, { animate: false }); else map.fitBounds(L.latLngBounds(f.pts), { ...opts, animate: false });
      fin();
    }, 1200);
    if (uno) map.flyTo(destino!, z, { duration: 0.6 }); else map.flyToBounds(L.latLngBounds(f.pts), { ...opts, duration: 0.6 });
    return () => clearTimeout(t);
  }, [props.vuelo]);

  /* Globo. */
  useEffect(() => {
    const map = mapRef.current!;
    const pop = extra.current.popup!;
    const g = props.globo;
    if (g) {
      pop.options.offset = L.point(0, g.offset);
      pop.options.autoPanPaddingBottomRight = L.point(props.margenDerecho + 40, 70);
      pop.setLatLng(g.latlng).setContent(popEl);
      if (!map.hasLayer(pop)) pop.openOn(map); else pop.update();
    } else if (map.hasLayer(pop)) map.closePopup(pop);
  }, [props.globo, popEl]);

  /* Polígonos, brechas, tracks y marcadores. */
  const { poligonos, tracks, marcadores, sel, globo, overlays, herr, editVerts, moviendo, puntoCero } = props;
  useEffect(() => {
    const { pol, tr, pts, gap } = capas.current;
    [pol, tr, pts, gap].forEach(l => l.clearLayers());
    const inter = herr === 'select' && !editVerts && !moviendo;
    const esSel = (t: Seleccion['tipo'], id: string) => (sel?.tipo === t && sel.id === id) || (globo?.clave === `${t}:${id}`);

    if (overlays.brechas && overlays.poligonos) {
      poligonos.forEach(p => {
        if (!p.brechas) return;
        L.geoJSON(p.brechas as GeoJSON.GeoJsonObject, { style: { stroke: false, fillColor: '#dc2626', fillOpacity: 0.38 }, interactive: false }).addTo(gap);
      });
    }
    if (overlays.poligonos) {
      poligonos.forEach(p => {
        if (editVerts?.id === p.id) return;
        const s = esSel('poligono', p.id);
        const forma = L.polygon(p.vertices, {
          color: p.color, weight: s ? 3.5 : 2, fillColor: p.color,
          fillOpacity: s ? 0.26 : overlays.brechas && p.brechas ? 0.06 : 0.14,
          dashArray: p.sinGrupo ? '7 6' : undefined, interactive: inter, bubblingMouseEvents: false,
        });
        if (overlays.etiquetas) {
          const pct = p.tracks ? ` · ${p.coberturaPct.toLocaleString('es-AR', { maximumFractionDigits: p.coberturaPct < 10 ? 1 : 0 })} %` : '';
          forma.bindTooltip(`<span class="dot" style="background:${p.color}"></span>${escapar(p.nombre)}${pct}`, { permanent: true, direction: 'center', className: 'duar-tip' });
        }
        forma.on('click', e => cb.current.onSeleccion({ tipo: 'poligono', id: p.id }, [e.latlng.lat, e.latlng.lng]));
        forma.addTo(pol);
      });
    }
    if (overlays.trazas) {
      tracks.forEach(t => {
        if (t.puntos.length < 2) return;
        const s = esSel('track', t.id);
        L.polyline(t.puntos, { color: '#fff', weight: s ? 8 : 5, opacity: 0.85, interactive: false }).addTo(tr);
        const linea = L.polyline(t.puntos, { color: t.color, weight: s ? 4.5 : 2.5, opacity: 0.95, interactive: inter, bubblingMouseEvents: false });
        linea.on('click', e => cb.current.onSeleccion({ tipo: 'track', id: t.id }, [e.latlng.lat, e.latlng.lng]));
        linea.addTo(tr);
        L.circleMarker(t.puntos[0], { radius: 4, color: '#fff', weight: 2, fillColor: t.color, fillOpacity: 1, interactive: false }).addTo(tr);
        L.circleMarker(t.puntos[t.puntos.length - 1], { radius: 4, color: t.color, weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(tr);
      });
    }
    if (overlays.marcadores) {
      marcadores.forEach(m => {
        if (m.esInstalacion ? !overlays.instalaciones : m.simbolo === 'POI' ? !overlays.poi : !overlays.hallazgos) return;
        const mv = moviendo?.id === m.id;
        const pos: LatLng = mv ? moviendo!.ll : [m.lat, m.lng];
        const s = esSel('marcador', m.id);
        const mk = L.marker(pos, {
          icon: iconoPin(m.simbolo, m.esInstalacion ? m.nombre : null, s || mv), draggable: mv,
          interactive: inter || mv, bubblingMouseEvents: false, zIndexOffset: mv ? 2000 : m.esInstalacion ? 200 : s ? 500 : 0,
          keyboard: false,
        });
        if (mv) mk.on('dragend', e => { const ll = (e.target as L.Marker).getLatLng(); cb.current.onMoverArrastre([ll.lat, ll.lng]); });
        else mk.on('click', () => cb.current.onSeleccion({ tipo: 'marcador', id: m.id }, pos));
        mk.addTo(pts);
      });
      if (overlays.puntoCero && puntoCero) {
        const p0 = L.marker(puntoCero, { icon: iconoPin('puntoCero', 'Punto 0', esSel('puntoCero', 'p0')), interactive: inter, bubblingMouseEvents: false, zIndexOffset: 1000, keyboard: false });
        p0.on('click', () => cb.current.onSeleccion({ tipo: 'puntoCero', id: 'p0' }, puntoCero));
        p0.addTo(pts);
      }
    }
  }, [poligonos, tracks, marcadores, sel, globo, overlays, herr, editVerts, moviendo, puntoCero]);

  /* Radios desde el Punto Cero (punteados mientras se elige el punto nuevo). */
  const { radios, radiosCentro, radiosVistaPrevia } = props;
  useEffect(() => {
    const r = capas.current.rad;
    r.clearLayers();
    if (!overlays.radios || !radiosCentro) return;
    [...radios].sort((a, b) => b.radioM - a.radioM).forEach(x => {
      L.circle(radiosCentro, {
        radius: x.radioM, renderer: extra.current.radR, pane: 'radios', color: x.color, weight: 2, opacity: 0.9,
        fillColor: x.color, fillOpacity: radiosVistaPrevia ? 0.03 : 0.07, dashArray: radiosVistaPrevia ? '6 6' : undefined, interactive: false,
      }).addTo(r);
      L.marker([radiosCentro[0] + x.radioM / 110540, radiosCentro[1]], {
        pane: 'radiosLbl', interactive: false, keyboard: false,
        icon: L.divIcon({ className: 'duar-divicon', html: `<div class="duar-ring-lbl" style="color:${x.color};border-color:${x.color}">${fmtRadio(x.radioM)}</div>`, iconSize: [70, 18], iconAnchor: [35, 9] }),
      }).addTo(r);
    });
  }, [radios, radiosCentro, radiosVistaPrevia, overlays.radios]);

  /* Dibujo en curso: polígono, vértices editables y medición. */
  const { borrador, medida } = props;
  useEffect(() => {
    const d = capas.current.draft;
    d.clearLayers();
    const map = mapRef.current!;
    if (herr === 'poligono' && borrador.length) {
      L.polyline(borrador, { color: PRI(), weight: 2.5, interactive: false }).addTo(d);
      if (borrador.length > 2) L.polygon(borrador, { stroke: false, fillColor: PRI(), fillOpacity: 0.12, interactive: false }).addTo(d);
      borrador.forEach((p, i) => L.marker(p, { icon: iconoVertice(i === 0 ? FG() : PRI()), interactive: i === 0 && borrador.length > 2, keyboard: false })
        .on('click', () => cb.current.onDobleClic()).addTo(d));
    }
    if (herr !== 'poligono' && herr !== 'medir' && herr !== 'circulo' && herr !== 'cuadrado') extra.current.rubber!.setLatLngs([]);
    if (herr === 'circulo' || herr === 'cuadrado') map.dragging.disable(); else map.dragging.enable();
    if (editVerts) {
      const pol = poligonos.find(p => p.id === editVerts.id);
      const c = pol?.color ?? '#475569';
      const forma = L.polygon(editVerts.verts, { color: c, weight: 2.5, fillColor: c, fillOpacity: 0.2, dashArray: '4 4', interactive: false }).addTo(d);
      editVerts.verts.forEach((p, i) => {
        const m = L.marker(p, { icon: iconoVertice(c), draggable: true, keyboard: false }).addTo(d);
        m.on('drag', e => { const v = editVerts.verts.slice(); const ll = (e as L.LeafletMouseEvent).latlng; v[i] = [ll.lat, ll.lng]; forma.setLatLngs(v); });
        m.on('dragend', e => { const ll = (e.target as L.Marker).getLatLng(); cb.current.onVertice(i, [ll.lat, ll.lng]); });
      });
    }
    const ms = capas.current.meas;
    ms.clearLayers();
    if (herr === 'medir' && medida.length) {
      L.polyline(medida, { color: '#fff', weight: 6, opacity: 0.8, interactive: false }).addTo(ms);
      L.polyline(medida, { color: FG(), weight: 2.5, dashArray: '6 5', interactive: false }).addTo(ms);
      medida.forEach(p => L.circleMarker(p, { radius: 4.5, color: FG(), weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(ms));
      if (medida.length > 1) {
        L.marker(medida[medida.length - 1], { opacity: 0, interactive: false, keyboard: false })
          .bindTooltip(fmtDist(largo(medida)), { permanent: true, direction: 'right', offset: [8, 0], className: 'duar-tip' }).addTo(ms);
      }
    }
  }, [borrador, medida, herr, editVerts, poligonos]);

  /* Puntero: cruz mientras se dibuja o se elige un lugar. */
  useEffect(() => {
    mapRef.current?.getContainer().classList.toggle('dibujando', herr !== 'select' || !!moviendo);
  }, [herr, moviendo]);

  const sep = <span style={{ width: 1, height: 12, background: 'var(--border)' }} />;
  const caja = { display: 'flex', alignItems: 'center', padding: '5px 10px', borderRadius: 'var(--radius-md)', background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-sm)', color: 'var(--foreground)', fontFamily: 'var(--font-family-mono, monospace)', fontSize: 11 } as const;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <style>{ESTILOS}</style>
      <div ref={elRef} style={{ position: 'absolute', inset: 0, background: '#e8e4df' }} />
      <div style={{ position: 'absolute', left: 12, bottom: 26, zIndex: 500, display: 'flex', alignItems: 'flex-end', gap: 8, pointerEvents: 'none' }}>
        {overlays.coords && (
          <div style={{ ...caja, gap: 10, whiteSpace: 'pre', height: 19 }}>
            <span ref={coordRef}>{`Lat ${props.centroInicial[0].toFixed(5)}°  Lon ${props.centroInicial[1].toFixed(5)}°`}</span>{sep}<span ref={elevRef}>Elev. —</span>
          </div>
        )}
        {overlays.escala && (
          <div style={{ ...caja, flexDirection: 'column', gap: 3, alignItems: 'stretch' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: escala.px, lineHeight: 1 }}><span>0</span><span>{escala.etiqueta}</span></div>
            <div style={{ display: 'flex', width: escala.px, height: 5, border: '1px solid var(--foreground)', boxSizing: 'border-box' }}>
              {[0, 1, 2, 3].map(i => <span key={i} style={{ flex: 1, background: i % 2 ? 'transparent' : 'var(--foreground)' }} />)}
            </div>
          </div>
        )}
      </div>
      {createPortal(props.contenidoGlobo ?? null, popEl)}
    </div>
  );
}
