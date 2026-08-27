/**
 * Mapa.tsx — Visor de tiles sin dependencias externas.
 * Pan, zoom, marcadores, formas geo-ancladas y Puesto de Comando dinámico
 * con historial de desplazamientos y rastre visual en el mapa.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router';
import { useApp } from '../../context/AppContext';
import { MapShape } from '../../data/mockData';
import {
  Layers, MapPin, Flag, AlertTriangle, Navigation,
  ZoomIn, ZoomOut, Crosshair, Trash2, X, Pencil, Circle, Square,
  MoveRight, Clock, ChevronDown, ChevronUp, Upload,
} from 'lucide-react';
import { PuntoDetailPanel } from '../../components/map/PuntoDetailPanel';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const TILE_SIZE   = 256;
const MIN_ZOOM    = 3;
const MAX_ZOOM    = 17;
const TILE_BUFFER = 2;

const SHAPE_PALETTE = [
  '#E54B4B', '#FFA987', '#2563eb', '#16a34a',
  '#ca8a04', '#7c3aed', '#06b6d4', '#f97316',
];

const GPX_PALETTE = ['#facc15', '#a3e635', '#38bdf8', '#f472b6', '#fb923c', '#a78bfa'];

const PC_COLOR = '#2563eb';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type MapLayer  = 'físico' | 'satélite' | 'político';
type ToolMode  = 'ver' | 'puntoCero' | 'puestoComando' | 'poi' | 'hallazgo'
               | 'rectangulo' | 'circulo' | 'poligono' | 'moverPC';

type ActiveDraw =
  | { type: 'rect';   startLat: number; startLng: number; curLat: number; curLng: number }
  | { type: 'circle'; centerLat: number; centerLng: number; edgeLat: number; edgeLng: number };

interface GpxTrace {
  id: string;
  name: string;
  color: string;
  points: Array<{ lat: number; lng: number }>;
  agenteId?: string;
}

/* ─── Tile URL factories ─────────────────────────────────────────────────── */
function getTileUrl(layer: MapLayer, z: number, tx: number, ty: number): string {
  const n = Math.pow(2, z);
  tx = ((tx % n) + n) % n;
  const s = ['a', 'b', 'c'][(Math.abs(tx) + Math.abs(ty)) % 3];
  switch (layer) {
    case 'físico':
      return `https://${s}.tile.opentopomap.org/${z}/${tx}/${ty}.png`;
    case 'satélite':
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`;
    case 'político':
      return `https://${s}.tile.openstreetmap.org/${z}/${tx}/${ty}.png`;
  }
}

/* ─── Mercator math ──────────────────────────────────────────────────────── */
function latlngToGlobal(lat: number, lng: number, zoom: number) {
  const scale  = Math.pow(2, zoom) * TILE_SIZE;
  const x      = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y      = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function globalToLatlng(gx: number, gy: number, zoom: number) {
  const scale = Math.pow(2, zoom) * TILE_SIZE;
  const lng   = (gx / scale) * 360 - 180;
  const n     = Math.PI - (2 * Math.PI * gy) / scale;
  const lat   = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat, lng };
}

function latlngToScreen(
  lat: number, lng: number,
  cLat: number, cLng: number,
  zoom: number, cw: number, ch: number,
  panDx = 0, panDy = 0,
) {
  const cg = latlngToGlobal(cLat, cLng, zoom);
  const pg = latlngToGlobal(lat, lng, zoom);
  return {
    x: pg.x - cg.x + cw / 2 + panDx,
    y: pg.y - cg.y + ch / 2 + panDy,
  };
}

function formatTs(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

/* ─── GPX parser ─────────────────────────────────────────────────────────── */
function parseGpx(text: string): Array<{ lat: number; lng: number }> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  const pts: Array<{ lat: number; lng: number }> = [];
  doc.querySelectorAll('trkpt, wpt, rtept').forEach(el => {
    const lat = parseFloat(el.getAttribute('lat') ?? '');
    const lon = parseFloat(el.getAttribute('lon') ?? '');
    if (!isNaN(lat) && !isNaN(lon)) pts.push({ lat, lng: lon });
  });
  return pts;
}

/* ─── Spatial helpers (gap analysis) ────────────────────────────────────── */
function isPointInShape(lat: number, lng: number, shape: MapShape): boolean {
  if (shape.tipo === 'rectangulo' && shape.nw && shape.se)
    return lat <= shape.nw.lat && lat >= shape.se.lat &&
           lng >= shape.nw.lng && lng <= shape.se.lng;
  if (shape.tipo === 'circulo' && shape.center && shape.radiusPoint) {
    const dlat = shape.center.lat - shape.radiusPoint.lat;
    const dlng = shape.center.lng - shape.radiusPoint.lng;
    const r2 = dlat * dlat + dlng * dlng;
    return (lat - shape.center.lat) ** 2 + (lng - shape.center.lng) ** 2 <= r2;
  }
  if (shape.tipo === 'poligono' && shape.points && shape.points.length >= 3) {
    let inside = false;
    const poly = shape.points;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].lng, yi = poly[i].lat;
      const xj = poly[j].lng, yj = poly[j].lat;
      if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
        inside = !inside;
    }
    return inside;
  }
  return false;
}

function computeShapeCoveragePercent(shape: MapShape, traces: GpxTrace[]): number {
  const raw = traces.flatMap(t => t.points);
  if (raw.length === 0) return 0;
  const step = Math.max(1, Math.floor(raw.length / 800));
  const allPts = raw.filter((_, i) => i % step === 0);
  let minLat: number, maxLat: number, minLng: number, maxLng: number;
  if (shape.tipo === 'rectangulo' && shape.nw && shape.se) {
    minLat = shape.se.lat; maxLat = shape.nw.lat; minLng = shape.nw.lng; maxLng = shape.se.lng;
  } else if (shape.tipo === 'circulo' && shape.center && shape.radiusPoint) {
    const dlat = Math.abs(shape.center.lat - shape.radiusPoint.lat);
    const dlng = Math.abs(shape.center.lng - shape.radiusPoint.lng);
    const r = Math.sqrt(dlat * dlat + dlng * dlng);
    minLat = shape.center.lat - r; maxLat = shape.center.lat + r;
    minLng = shape.center.lng - r; maxLng = shape.center.lng + r;
  } else if (shape.tipo === 'poligono' && shape.points?.length) {
    minLat = Math.min(...shape.points.map(p => p.lat)); maxLat = Math.max(...shape.points.map(p => p.lat));
    minLng = Math.min(...shape.points.map(p => p.lng)); maxLng = Math.max(...shape.points.map(p => p.lng));
  } else { return 0; }
  const N = 12;
  let inside = 0, covered = 0;
  const r2 = 0.00035 * 0.00035; // ≈35 m
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const slat = minLat + (maxLat - minLat) * (i + 0.5) / N;
      const slng = minLng + (maxLng - minLng) * (j + 0.5) / N;
      if (!isPointInShape(slat, slng, shape)) continue;
      inside++;
      if (allPts.some(p => (p.lat - slat) ** 2 + (p.lng - slng) ** 2 <= r2)) covered++;
    }
  }
  return inside === 0 ? 0 : Math.round((covered / inside) * 100);
}

/* ─── Marker appearance ──────────────────────────────────────────────────── */
const MARKER_CFG = {
  puntoCero:     { color: '#E54B4B', symbol: '⊕', label: 'Punto Cero',        bg: '#fee2e2' },
  puestoComando: { color: '#2563eb', symbol: '⚑', label: 'Puesto de Comando', bg: '#dbeafe' },
  poi:           { color: '#ca8a04', symbol: '★', label: 'Punto de Interés',  bg: '#fef9c3' },
  hallazgo:      { color: '#16a34a', symbol: '▲', label: 'Hallazgo',          bg: '#dcfce7' },
} as const;

const SIDEBAR_ICON: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  puntoCero:     { icon: <Crosshair size={12} />,    color: '#E54B4B', bg: '#fee2e2' },
  puestoComando: { icon: <Flag size={12} />,          color: '#2563eb', bg: '#dbeafe' },
  poi:           { icon: <MapPin size={12} />,        color: '#ca8a04', bg: '#fef9c3' },
  hallazgo:      { icon: <AlertTriangle size={12} />, color: '#16a34a', bg: '#dcfce7' },
};

const SHAPE_ICON: Record<string, string> = {
  poligono:   '⬡',
  circulo:    '●',
  rectangulo: '■',
};

/* ─── Tile component ─────────────────────────────────────────────────────── */
function Tile({ src, left, top }: { src: string; left: number; top: number }) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        position: 'absolute',
        left, top,
        width: TILE_SIZE,
        height: TILE_SIZE,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    />
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function Mapa() {
  const { id }                                      = useParams<{ id: string }>();
  const { getOperativo, updateOperativo, moverPuestoComando, data } = useApp();

  /* map state */
  const [center, setCenter] = useState<[number, number]>([-31.993, -64.923]);
  const [zoom,   setZoom]   = useState(13);
  const [layer,  setLayer]  = useState<MapLayer>('satélite');

  /* tool */
  const [tool,   setTool]  = useState<ToolMode>('ver');
  const toolRef            = useRef<ToolMode>('ver');
  useEffect(() => { toolRef.current = tool; }, [tool]);

  /* visibility */
  const [showPuntos,     setShowPuntos]     = useState(true);
  const [showShapes,     setShowShapes]     = useState(true);
  const [showPCTrail,    setShowPCTrail]    = useState(true);
  const [showHistorialPC, setShowHistorialPC] = useState(false);

  /* GPX traces */
  const [gpxTraces,        setGpxTraces]        = useState<GpxTrace[]>([]);
  const [showGpxTraces,    setShowGpxTraces]     = useState(true);
  const [showGapAnalysis,  setShowGapAnalysis]   = useState(false);
  const gpxFileInputRef                          = useRef<HTMLInputElement>(null);
  const [uploadingAgenteId, setUploadingAgenteId] = useState<string | null>(null);
  const [expandedGrupos,    setExpandedGrupos]    = useState<Set<string>>(new Set());

  /* selection */
  const [selectedPunto, setSelectedPunto] = useState<string | null>(null);
  const [hoveredPunto,  setHoveredPunto]  = useState<string | null>(null);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);

  /* container size */
  const containerRef = useRef<HTMLDivElement>(null);
  const [cw, setCw]  = useState(800);
  const [ch, setCh]  = useState(600);

  /* pan */
  const [isPanning, setIsPanning] = useState(false);
  const panStart                  = useRef({ mx: 0, my: 0 });
  const [panDx, setPanDx]         = useState(0);
  const [panDy, setPanDy]         = useState(0);

  /* drawing */
  const [activeDraw,     setActiveDraw]     = useState<ActiveDraw | null>(null);
  const [polygonPoints,  setPolygonPoints]  = useState<Array<{ lat: number; lng: number }>>([]);
  const [polygonCursor,  setPolygonCursor]  = useState<{ lat: number; lng: number } | null>(null);
  const [selectedColor,  setSelectedColor]  = useState(SHAPE_PALETTE[0]);

  /* modals — add punto */
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [addForm,        setAddForm]        = useState({ nombre: '', descripcion: '' });
  const [clickLatLng,    setClickLatLng]    = useState<{ lat: number; lng: number } | null>(null);

  /* modals — name shape */
  const [showNameModal,  setShowNameModal]  = useState(false);
  const [pendingShape,   setPendingShape]   = useState<Omit<MapShape, 'id' | 'nombre'> | null>(null);
  const [shapeNameInput, setShapeNameInput] = useState('');

  /* modals — mover Puesto de Comando */
  const [showMoverPCModal, setShowMoverPCModal] = useState(false);
  const [pendingPCLatLng,  setPendingPCLatLng]  = useState<{ lat: number; lng: number } | null>(null);
  const [moverPCPuntoId,   setMoverPCPuntoId]   = useState<string>('');
  const [moverPCMotivo,    setMoverPCMotivo]     = useState('');

  /* ── Container resize ────────────────────────────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setCw(width);
      setCh(height);
    });
    ro.observe(el);
    setCw(el.clientWidth);
    setCh(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  /* ── ESC cancels actions ─────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDraw(null);
        setPolygonPoints([]);
        setPolygonCursor(null);
        setShowAddModal(false);
        setShowNameModal(false);
        setPendingShape(null);
        setShowMoverPCModal(false);
        setPendingPCLatLng(null);
        setMoverPCMotivo('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const operativo = getOperativo(id!);

  /* initial center */
  useEffect(() => {
    if (!operativo || operativo.puntos.length === 0) return;
    const lat = operativo.puntos.reduce((s, p) => s + p.lat, 0) / operativo.puntos.length;
    const lng = operativo.puntos.reduce((s, p) => s + p.lng, 0) / operativo.puntos.length;
    setCenter([lat, lng]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!operativo) return null;

  const puntos    = operativo.puntos;
  const shapes    = operativo.shapes ?? [];
  const historialPC = operativo.historialPuestoComando ?? [];
  const pcPuntos  = puntos.filter(p => p.tipo === 'puestoComando');

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  const toScreen = useCallback(
    (lat: number, lng: number) =>
      latlngToScreen(lat, lng, center[0], center[1], zoom, cw, ch, panDx, panDy),
    [center, zoom, cw, ch, panDx, panDy],
  );

  const eventToLatLng = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const cg   = latlngToGlobal(center[0], center[1], zoom);
    return globalToLatlng(cg.x + mx - cw / 2 - panDx, cg.y + my - ch / 2 - panDy, zoom);
  }, [center, zoom, cw, ch, panDx, panDy]);

  /* ── Tile grid ───────────────────────────────────────────────────────── */
  const tiles = useMemo(() => {
    const cg  = latlngToGlobal(center[0], center[1], zoom);
    const cgx = cg.x - panDx;
    const cgy = cg.y - panDy;
    const minTx = Math.floor((cgx - cw / 2) / TILE_SIZE) - TILE_BUFFER;
    const maxTx = Math.floor((cgx + cw / 2) / TILE_SIZE) + TILE_BUFFER;
    const minTy = Math.floor((cgy - ch / 2) / TILE_SIZE) - TILE_BUFFER;
    const maxTy = Math.floor((cgy + ch / 2) / TILE_SIZE) + TILE_BUFFER;
    const result: Array<{ key: string; src: string; left: number; top: number }> = [];
    for (let ty = minTy; ty <= maxTy; ty++) {
      if (ty < 0 || ty >= Math.pow(2, zoom)) continue;
      for (let tx = minTx; tx <= maxTx; tx++) {
        result.push({
          key:  `${layer}-${zoom}-${tx}-${ty}`,
          src:  getTileUrl(layer, zoom, tx, ty),
          left: tx * TILE_SIZE - cgx + cw / 2,
          top:  ty * TILE_SIZE - cgy + ch / 2,
        });
      }
    }
    return result;
  }, [center, zoom, layer, cw, ch, panDx, panDy]);

  /* ── Pan ─────────────────────────────────────────────────────────────── */
  const commitPan = useCallback(() => {
    if (!isPanning) return;
    setIsPanning(false);
    if (panDx !== 0 || panDy !== 0) {
      const cg = latlngToGlobal(center[0], center[1], zoom);
      const { lat, lng } = globalToLatlng(cg.x - panDx, cg.y - panDy, zoom);
      setCenter([lat, lng]);
      setPanDx(0);
      setPanDy(0);
    }
  }, [isPanning, panDx, panDy, center, zoom]);

  /* ── Event handlers ──────────────────────────────────────────────────── */
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const t = toolRef.current;
    if (t === 'rectangulo' || t === 'circulo') {
      const pos = eventToLatLng(e);
      if (t === 'rectangulo') {
        setActiveDraw({ type: 'rect', startLat: pos.lat, startLng: pos.lng, curLat: pos.lat, curLng: pos.lng });
      } else {
        setActiveDraw({ type: 'circle', centerLat: pos.lat, centerLng: pos.lng, edgeLat: pos.lat, edgeLng: pos.lng });
      }
    } else if (t !== 'poligono') {
      setIsPanning(true);
      panStart.current = { mx: e.clientX, my: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const t = toolRef.current;
    if (isPanning) {
      setPanDx(e.clientX - panStart.current.mx);
      setPanDy(e.clientY - panStart.current.my);
    } else if (activeDraw) {
      const pos = eventToLatLng(e);
      setActiveDraw(d => {
        if (!d) return null;
        if (d.type === 'rect')   return { ...d, curLat: pos.lat, curLng: pos.lng };
        if (d.type === 'circle') return { ...d, edgeLat: pos.lat, edgeLng: pos.lng };
        return d;
      });
    } else if (t === 'poligono') {
      setPolygonCursor(eventToLatLng(e));
    }
  };

  const handleMouseUp = () => {
    if (isPanning) { commitPan(); return; }
    if (!activeDraw) return;

    if (activeDraw.type === 'rect') {
      const { startLat, startLng, curLat, curLng } = activeDraw;
      const sS = toScreen(startLat, startLng);
      const cS = toScreen(curLat, curLng);
      if (Math.abs(cS.x - sS.x) > 8 || Math.abs(cS.y - sS.y) > 8) {
        setPendingShape({
          tipo:  'rectangulo',
          color: selectedColor,
          nw:    { lat: Math.max(startLat, curLat), lng: Math.min(startLng, curLng) },
          se:    { lat: Math.min(startLat, curLat), lng: Math.max(startLng, curLng) },
        });
        setShapeNameInput('');
        setShowNameModal(true);
      }
    } else if (activeDraw.type === 'circle') {
      const ctrS = toScreen(activeDraw.centerLat, activeDraw.centerLng);
      const edgS = toScreen(activeDraw.edgeLat,   activeDraw.edgeLng);
      const r    = Math.sqrt((edgS.x - ctrS.x) ** 2 + (edgS.y - ctrS.y) ** 2);
      if (r > 8) {
        setPendingShape({
          tipo:        'circulo',
          color:       selectedColor,
          center:      { lat: activeDraw.centerLat, lng: activeDraw.centerLng },
          radiusPoint: { lat: activeDraw.edgeLat,   lng: activeDraw.edgeLng   },
        });
        setShapeNameInput('');
        setShowNameModal(true);
      }
    }
    setActiveDraw(null);
  };

  const handleMouseLeave = () => {
    if (isPanning) commitPan();
    if (activeDraw) setActiveDraw(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta   = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
    if (newZoom === zoom) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    const cg   = latlngToGlobal(center[0], center[1], zoom);
    const pt   = globalToLatlng(cg.x + mx - cw / 2, cg.y + my - ch / 2, zoom);
    const nCg  = latlngToGlobal(pt.lat, pt.lng, newZoom);
    const nC   = globalToLatlng(nCg.x - (mx - cw / 2), nCg.y - (my - ch / 2), newZoom);
    setZoom(newZoom);
    setCenter([nC.lat, nC.lng]);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.detail > 1) return;
    const t = toolRef.current;
    if (t === 'poligono') {
      setPolygonPoints(pts => [...pts, eventToLatLng(e)]);
    } else if (['puntoCero', 'puestoComando', 'poi', 'hallazgo'].includes(t)) {
      setClickLatLng(eventToLatLng(e));
      setAddForm({ nombre: '', descripcion: '' });
      setShowAddModal(true);
    } else if (t === 'moverPC') {
      if (pcPuntos.length === 0) return; // no PC to move
      const pos = eventToLatLng(e);
      setPendingPCLatLng(pos);
      // pre-select the first (or only) PC punto
      setMoverPCPuntoId(pcPuntos[0].id);
      setMoverPCMotivo('');
      setShowMoverPCModal(true);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (toolRef.current === 'poligono' && polygonPoints.length >= 2) {
      e.stopPropagation();
      setPendingShape({ tipo: 'poligono', color: selectedColor, points: polygonPoints });
      setPolygonPoints([]);
      setPolygonCursor(null);
      setShapeNameInput('');
      setShowNameModal(true);
    }
  };

  /* ── Tool change helper ──────────────────────────────────────────────── */
  const changeTool = (t: ToolMode) => {
    setTool(t);
    setActiveDraw(null);
    setPolygonPoints([]);
    setPolygonCursor(null);
  };

  /* ── Data handlers ───────────────────────────────────────────────────── */
  const handleAddPunto = () => {
    if (!addForm.nombre || !clickLatLng) return;
    updateOperativo(id!, {
      puntos: [...puntos, {
        id:          `p${Date.now()}`,
        nombre:      addForm.nombre,
        tipo:        tool as 'puntoCero' | 'puestoComando' | 'poi' | 'hallazgo',
        lat:         clickLatLng.lat,
        lng:         clickLatLng.lng,
        descripcion: addForm.descripcion,
      }],
    });
    setShowAddModal(false);
    setTool('ver');
  };

  const handleDeletePunto = (puntoId: string) => {
    updateOperativo(id!, { puntos: puntos.filter(p => p.id !== puntoId) });
    setSelectedPunto(null);
  };

  const handleSaveShape = () => {
    if (!pendingShape || !shapeNameInput.trim()) return;
    const newShape: MapShape = { id: `sh${Date.now()}`, nombre: shapeNameInput.trim(), ...pendingShape };
    updateOperativo(id!, { shapes: [...shapes, newShape] });
    setShowNameModal(false);
    setPendingShape(null);
    setTool('ver');
  };

  const handleDeleteShape = (shapeId: string) => {
    updateOperativo(id!, { shapes: shapes.filter(s => s.id !== shapeId) });
    if (selectedShape === shapeId) setSelectedShape(null);
  };

  const handleSavePuntoDetail = (updates: Partial<typeof puntos[0]>) => {
    updateOperativo(id!, {
      puntos: puntos.map(p => p.id === selectedPunto ? { ...p, ...updates } : p),
    });
  };

  /* ── Mover PC confirm ────────────────────────────────────────────────── */
  const handleConfirmMoverPC = () => {
    if (!pendingPCLatLng || !moverPCPuntoId) return;
    moverPuestoComando(id!, moverPCPuntoId, pendingPCLatLng.lat, pendingPCLatLng.lng, moverPCMotivo || undefined);
    setShowMoverPCModal(false);
    setPendingPCLatLng(null);
    setMoverPCMotivo('');
    setTool('ver');
  };

  /* ── GPX file load ───────────────────────────────────────────────────── */
  const handleGpxFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const agenteId = uploadingAgenteId ?? undefined;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result as string;
        const points = parseGpx(text);
        if (points.length === 0) return;
        setGpxTraces(ts => [...ts, {
          id:       `gpx${Date.now()}_${Math.random().toString(36).slice(2)}`,
          name:     file.name.replace(/\.gpx$/i, ''),
          color:    GPX_PALETTE[ts.length % GPX_PALETTE.length],
          points,
          agenteId,
        }]);
      };
      reader.readAsText(file);
    });
    e.target.value = '';
    setUploadingAgenteId(null);
  };

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const isDrawTool   = tool === 'rectangulo' || tool === 'circulo' || tool === 'poligono';
  const isMarkerTool = ['puntoCero', 'puestoComando', 'poi', 'hallazgo'].includes(tool);
  const cursorStyle  = isPanning ? 'grabbing'
    : isDrawTool || isMarkerTool || tool === 'moverPC' ? 'crosshair'
    : 'grab';

  /* ── Gap analysis coverage (memoized) ───────────────────────────────── */
  const shapeCoverages = useMemo(
    () => Object.fromEntries(shapes.map(s => [s.id, computeShapeCoveragePercent(s, gpxTraces)])),
    [shapes, gpxTraces],
  );
  const getCoverColor = (pct: number) => pct >= 70 ? '#16a34a' : pct >= 30 ? '#f97316' : '#E54B4B';

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* RENDER                                                                   */
  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-full" style={{ fontFamily: 'var(--font-family-primary)' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div
        className="w-[264px] flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >

        {/* Marcadores */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="uppercase tracking-wider mb-3"
            style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>
            Marcadores
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { key: 'ver',           label: 'Ver',        icon: <Navigation size={14} /> },
              { key: 'puntoCero',     label: 'Punto Cero', icon: <Crosshair size={14} /> },
              { key: 'puestoComando', label: 'P. Comando', icon: <Flag size={14} /> },
              { key: 'poi',           label: 'P. Interés', icon: <MapPin size={14} /> },
              { key: 'hallazgo',      label: 'Hallazgo',   icon: <AlertTriangle size={14} /> },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => changeTool(t.key)}
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all"
                style={{
                  background: tool === t.key ? 'var(--primary)' : 'var(--muted)',
                  color:      tool === t.key ? '#fff' : 'var(--muted-foreground)',
                  fontSize:   '11px',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          {isMarkerTool && (
            <div className="mt-2 p-2 rounded-lg text-center"
              style={{ background: 'rgba(229,75,75,0.08)', color: 'var(--primary)', fontSize: '11px' }}>
              Hacé clic en el mapa para colocar
            </div>
          )}
        </div>

        {/* ── Puesto de Comando dinámico ───────────────────────────────────── */}
        {tool === 'puestoComando' && <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="uppercase tracking-wider"
              style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>
              Puesto de Comando
            </p>
            {historialPC.length > 0 && (
              <button
                onClick={() => setShowHistorialPC(v => !v)}
                className="flex items-center gap-1 px-2 py-0.5 rounded"
                style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', fontSize: '10px' }}
              >
                <Clock size={10} />
                {historialPC.length}
                {showHistorialPC ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            )}
          </div>

          {pcPuntos.length === 0 ? (
            <p style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
              Sin Puesto de Comando. Agregá uno con el marcador de arriba.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Current PC info */}
              {pcPuntos.map(pc => (
                <div
                  key={pc.id}
                  className="flex items-start gap-2 p-2 rounded-lg"
                  style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)' }}
                >
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: '#dbeafe', color: PC_COLOR }}>
                    <Flag size={12} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate"
                      style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                      {pc.nombre}
                    </p>
                    <p style={{ fontFamily: 'monospace', fontSize: '9px', color: 'var(--muted-foreground)' }}>
                      {pc.lat.toFixed(4)}°, {pc.lng.toFixed(4)}°
                    </p>
                    {historialPC.length > 0 && (
                      <p style={{ fontSize: '10px', color: PC_COLOR, marginTop: 2 }}>
                        {historialPC.length} traslado{historialPC.length !== 1 ? 's' : ''} registrado{historialPC.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Reposicionar button */}
              <button
                onClick={() => changeTool('moverPC')}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg transition-all"
                style={{
                  background: tool === 'moverPC' ? PC_COLOR : 'var(--muted)',
                  color:      tool === 'moverPC' ? '#fff' : 'var(--muted-foreground)',
                  fontSize:   '12px',
                  fontWeight: 'var(--font-weight-semibold)',
                  border:     tool === 'moverPC' ? 'none' : '1px dashed var(--border)',
                }}
              >
                <MoveRight size={14} />
                {tool === 'moverPC' ? 'Clic en el mapa para mover…' : 'Reposicionar PC'}
              </button>

              {/* Trail toggle */}
              {historialPC.length > 0 && (
                <label className="flex items-center justify-between cursor-pointer">
                  <span style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)' }}>Mostrar rastro</span>
                  <div
                    className="w-9 h-5 rounded-full relative transition-colors"
                    style={{ background: showPCTrail ? PC_COLOR : 'var(--border)' }}
                    onClick={() => setShowPCTrail(v => !v)}
                  >
                    <div
                      className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                      style={{ left: showPCTrail ? '18px' : '2px' }}
                    />
                  </div>
                </label>
              )}
            </div>
          )}

          {/* Historial timeline */}
          {showHistorialPC && historialPC.length > 0 && (
            <div className="mt-3 flex flex-col gap-0" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <p className="uppercase tracking-wider mb-2"
                style={{ color: 'var(--muted-foreground)', fontSize: '10px', fontWeight: 'var(--font-weight-semibold)' }}>
                Historial de traslados
              </p>
              {[...historialPC].reverse().map((h, revIdx) => {
                const idx = historialPC.length - 1 - revIdx;
                return (
                  <div
                    key={h.id}
                    className="flex gap-2 py-2"
                    style={{ borderBottom: revIdx < historialPC.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center" style={{ width: 20, flexShrink: 0 }}>
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: idx === historialPC.length - 1 ? PC_COLOR : 'var(--muted)',
                          border:     `2px solid ${PC_COLOR}`,
                          fontSize:   '8px',
                          color:      idx === historialPC.length - 1 ? '#fff' : PC_COLOR,
                          fontWeight: 'var(--font-weight-semibold)',
                        }}
                      >
                        {idx + 1}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>
                        {formatTs(h.timestamp)}
                      </p>
                      <p style={{ fontFamily: 'monospace', fontSize: '9px', color: 'var(--muted-foreground)' }}>
                        {h.lat.toFixed(4)}°, {h.lng.toFixed(4)}°
                      </p>
                      {h.motivo && (
                        <p className="mt-0.5" style={{ color: 'var(--foreground)', fontSize: '11px', fontStyle: 'italic' }}>
                          "{h.motivo}"
                        </p>
                      )}
                    </div>
                    <button
                      title="Volar a esta posición"
                      onClick={() => setCenter([h.lat, h.lng])}
                      className="flex-shrink-0 p-1 rounded"
                      style={{ color: PC_COLOR, background: 'rgba(37,99,235,0.08)' }}
                    >
                      <Navigation size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>}

        {/* Dibujar áreas */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="uppercase tracking-wider mb-3"
            style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>
            Dibujar Área
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { key: 'poligono',   label: 'Polígono', icon: <Pencil size={14} /> },
              { key: 'circulo',    label: 'Círculo',  icon: <Circle size={14} /> },
              { key: 'rectangulo', label: 'Rect.',    icon: <Square size={14} /> },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => changeTool(t.key)}
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all"
                style={{
                  background: tool === t.key ? 'var(--primary)' : 'var(--muted)',
                  color:      tool === t.key ? '#fff' : 'var(--muted-foreground)',
                  fontSize:   '11px',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {isDrawTool && (
            <div className="mt-3">
              <p className="mb-2" style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>Color del área:</p>
              <div className="flex flex-wrap gap-2">
                {SHAPE_PALETTE.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    style={{
                      width: 22, height: 22,
                      borderRadius: '50%',
                      background: c,
                      border:     selectedColor === c ? '2.5px solid var(--foreground)' : '2px solid rgba(0,0,0,0.2)',
                      outline:    selectedColor === c ? '2px solid var(--card)' : 'none',
                      outlineOffset: '1px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {tool === 'poligono' && (
            <div className="mt-2 p-2 rounded-lg"
              style={{ background: 'rgba(229,75,75,0.08)', color: 'var(--primary)', fontSize: '11px' }}>
              {polygonPoints.length === 0 ? 'Clic para agregar vértices'
                : `${polygonPoints.length} vértice(s) — doble clic para cerrar`}
            </div>
          )}
          {tool === 'rectangulo' && (
            <div className="mt-2 p-2 rounded-lg"
              style={{ background: 'rgba(229,75,75,0.08)', color: 'var(--primary)', fontSize: '11px' }}>
              Clic y arrastrá para dibujar el rectángulo
            </div>
          )}
          {tool === 'circulo' && (
            <div className="mt-2 p-2 rounded-lg"
              style={{ background: 'rgba(229,75,75,0.08)', color: 'var(--primary)', fontSize: '11px' }}>
              Clic en el centro y arrastrá para definir el radio
            </div>
          )}
        </div>

        {/* ── Trazas GPX por Integrante ──────────────────────────────────── */}
        <div className="border-b" style={{ borderColor: 'var(--border)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <p className="uppercase tracking-wider"
              style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>
              Trazas GPX {gpxTraces.length > 0 && `(${gpxTraces.length})`}
            </p>
            <label className="flex items-center justify-between cursor-pointer gap-2">
              <span style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>Ver</span>
              <div
                className="w-8 h-4 rounded-full relative transition-colors"
                style={{ background: showGpxTraces ? 'var(--primary)' : 'var(--border)' }}
                onClick={() => setShowGpxTraces(v => !v)}
              >
                <div className="w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all"
                  style={{ left: showGpxTraces ? '17px' : '2px' }} />
              </div>
            </label>
          </div>

          {/* Groups list */}
          {operativo.grupoIds.length === 0 ? (
            <p className="px-4 pb-4" style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
              Sin grupos asignados a este operativo.
            </p>
          ) : (
            <div className="flex flex-col pb-3">
              {operativo.grupoIds.map(grupoId => {
                const grupo = data.grupos.find(g => g.id === grupoId);
                if (!grupo) return null;
                const isExpanded = expandedGrupos.has(grupoId);

                // Build ordered member list: leader first, then the rest
                const liderUser    = data.usuarios.find(u => u.id === grupo.lider);
                const otherMembers = grupo.agenteIds
                  .filter(aid => aid !== grupo.lider)
                  .map(aid => data.usuarios.find(u => u.id === aid))
                  .filter(Boolean) as typeof data.usuarios;
                const allMembers = [
                  ...(liderUser ? [liderUser] : []),
                  ...otherMembers,
                ];

                const grupoTraces = gpxTraces.filter(t => allMembers.some(m => m.id === t.agenteId));
                const totalPts    = grupoTraces.reduce((s, t) => s + t.points.length, 0);

                return (
                  <div key={grupoId}>
                    {/* Group header row */}
                    <button
                      className="w-full flex items-center gap-2 px-4 py-2 transition-colors"
                      style={{ background: isExpanded ? 'var(--muted)' : 'transparent' }}
                      onClick={() => setExpandedGrupos(prev => {
                        const next = new Set(prev);
                        next.has(grupoId) ? next.delete(grupoId) : next.add(grupoId);
                        return next;
                      })}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: grupo.color }} />
                      <span className="flex-1 text-left truncate"
                        style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                        {grupo.nombre}
                      </span>
                      {grupoTraces.length > 0 && (
                        <span style={{ color: 'var(--muted-foreground)', fontSize: '10px', fontFamily: 'monospace' }}>
                          {grupoTraces.length} traza{grupoTraces.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <ChevronDown
                        size={12}
                        style={{
                          color: 'var(--muted-foreground)',
                          transform: isExpanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                          flexShrink: 0,
                        }}
                      />
                    </button>

                    {/* Members list */}
                    {isExpanded && (
                      <div className="flex flex-col gap-0 px-3 pb-2">
                        {allMembers.map(miembro => {
                          const isLider    = miembro.id === grupo.lider;
                          const initials   = `${miembro.nombre[0]}${miembro.apellido[0]}`.toUpperCase();
                          const mTraces    = gpxTraces.filter(t => t.agenteId === miembro.id);

                          return (
                            <div key={miembro.id} className="flex flex-col gap-0.5 py-1.5"
                              style={{ borderBottom: '1px solid var(--border)' }}>
                              {/* Member row */}
                              <div className="flex items-center gap-2">
                                {/* Avatar */}
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{
                                    background: isLider ? grupo.color : 'var(--muted)',
                                    color:      isLider ? '#fff' : 'var(--muted-foreground)',
                                    fontSize:   '9px',
                                    fontWeight: 'var(--font-weight-semibold)',
                                  }}
                                >
                                  {initials}
                                </div>
                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                  <p className="truncate"
                                    style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
                                    {miembro.nombre} {miembro.apellido}
                                  </p>
                                  {isLider && (
                                    <p style={{ color: grupo.color, fontSize: '9px', fontWeight: 'var(--font-weight-semibold)' }}>
                                      Líder
                                    </p>
                                  )}
                                </div>
                                {/* Upload button */}
                                <button
                                  title="Cargar .gpx de este integrante"
                                  onClick={() => {
                                    setUploadingAgenteId(miembro.id);
                                    gpxFileInputRef.current?.click();
                                  }}
                                  className="flex items-center gap-1 px-1.5 py-1 rounded-md transition-colors"
                                  style={{
                                    background: 'var(--muted)',
                                    color:      'var(--muted-foreground)',
                                    fontSize:   '10px',
                                    fontWeight: 'var(--font-weight-semibold)',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Upload size={10} />
                                  .gpx
                                </button>
                              </div>

                              {/* Member traces */}
                              {mTraces.length > 0 && (
                                <div className="flex flex-col gap-0.5 pl-8 mt-0.5">
                                  {mTraces.map(trace => (
                                    <div key={trace.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md"
                                      style={{ background: 'var(--muted)' }}>
                                      <div className="w-4 h-1 rounded-full flex-shrink-0" style={{ background: trace.color }} />
                                      <span className="flex-1 truncate"
                                        style={{ color: 'var(--foreground)', fontSize: '10px' }}>
                                        {trace.name}
                                      </span>
                                      <span style={{ color: 'var(--muted-foreground)', fontSize: '9px', fontFamily: 'monospace' }}>
                                        {trace.points.length.toLocaleString()}
                                      </span>
                                      <button
                                        onClick={() => setGpxTraces(ts => ts.filter(t => t.id !== trace.id))}
                                        style={{ color: 'var(--muted-foreground)', flexShrink: 0 }}
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Traces without agent (orphan fallback) */}
                        {totalPts === 0 && gpxTraces.filter(t => !t.agenteId).length === 0 && (
                          <p className="pt-1" style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>
                            Sin trazas cargadas para este grupo.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unassigned traces (loaded without a member context) */}
              {gpxTraces.filter(t => !t.agenteId).length > 0 && (
                <div className="mt-1 px-4">
                  <p className="uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--muted-foreground)', fontSize: '10px', fontWeight: 'var(--font-weight-semibold)' }}>
                    Sin asignar
                  </p>
                  <div className="flex flex-col gap-1">
                    {gpxTraces.filter(t => !t.agenteId).map(trace => (
                      <div key={trace.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                        style={{ background: 'var(--muted)' }}>
                        <div className="w-5 h-1.5 rounded-full flex-shrink-0" style={{ background: trace.color }} />
                        <span className="flex-1 truncate"
                          style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
                          {trace.name}
                        </span>
                        <span style={{ color: 'var(--muted-foreground)', fontSize: '10px', fontFamily: 'monospace' }}>
                          {trace.points.length.toLocaleString()} pts
                        </span>
                        <button
                          onClick={() => setGpxTraces(ts => ts.filter(t => t.id !== trace.id))}
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Capa del mapa */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="uppercase tracking-wider mb-3"
            style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>
            Capa del Mapa
          </p>
          <div className="flex flex-col gap-1">
            {(['físico', 'satélite', 'político'] as MapLayer[]).map(l => (
              <button
                key={l}
                onClick={() => setLayer(l)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg capitalize transition-all text-left"
                style={{
                  background: layer === l ? 'var(--primary)' : 'transparent',
                  color:      layer === l ? '#fff' : 'var(--foreground)',
                  fontSize:   'var(--text-label)',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                <Layers size={12} />
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Visibilidad */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="uppercase tracking-wider mb-3"
            style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>
            Visibilidad
          </p>
          <div className="flex flex-col gap-2">
            {[
              { label: 'Puntos',      value: showPuntos,    set: () => setShowPuntos(v => !v) },
              { label: 'Áreas',       value: showShapes,    set: () => setShowShapes(v => !v) },
              { label: 'Trazas GPX',  value: showGpxTraces, set: () => setShowGpxTraces(v => !v) },
            ].map(v => (
              <label key={v.label} className="flex items-center justify-between cursor-pointer">
                <span style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)' }}>{v.label}</span>
                <div
                  className="w-9 h-5 rounded-full relative transition-colors"
                  style={{ background: v.value ? 'var(--primary)' : 'var(--border)' }}
                  onClick={v.set}
                >
                  <div
                    className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                    style={{ left: v.value ? '18px' : '2px' }}
                  />
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Lista de áreas */}
        {shapes.length > 0 && (
          <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="uppercase tracking-wider mb-3"
              style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>
              Áreas ({shapes.length})
            </p>
            <div className="flex flex-col gap-1">
              {shapes.map(shape => (
                <div
                  key={shape.id}
                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors"
                  style={{ background: selectedShape === shape.id ? 'var(--muted)' : 'transparent' }}
                  onClick={() => setSelectedShape(selectedShape === shape.id ? null : shape.id)}
                >
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: shape.color }} />
                  <span className="flex-1 truncate"
                    style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
                    {shape.nombre}
                  </span>
                  {showGapAnalysis && gpxTraces.length > 0 && (() => {
                    const pct = shapeCoverages[shape.id] ?? 0;
                    return (
                      <span style={{ color: getCoverColor(pct), fontSize: '10px', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'monospace' }}>
                        {pct}%
                      </span>
                    );
                  })()}
                  <span style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>{SHAPE_ICON[shape.tipo]}</span>
                  <button onClick={e => { e.stopPropagation(); handleDeleteShape(shape.id); }}
                    style={{ color: 'var(--muted-foreground)' }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de puntos */}
        <div className="p-4 flex-1">
          <p className="uppercase tracking-wider mb-3"
            style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>
            Puntos ({puntos.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {puntos.map(p => {
              const cfg = SIDEBAR_ICON[p.tipo];
              return (
                <div
                  key={p.id}
                  className="flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors"
                  style={{ background: selectedPunto === p.id ? 'var(--muted)' : 'transparent' }}
                  onClick={() => setSelectedPunto(selectedPunto === p.id ? null : p.id)}
                >
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate"
                      style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)' }}>
                      {p.nombre}
                    </p>
                    {p.descripcion && (
                      <p className="truncate" style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>
                        {p.descripcion}
                      </p>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDeletePunto(p.id); }}
                    style={{ color: 'var(--muted-foreground)' }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
            {puntos.length === 0 && (
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>Sin puntos marcados.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Map viewport ─────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={containerRef}
          style={{
            position: 'absolute', inset: 0,
            overflow: 'hidden',
            cursor: cursorStyle,
            background: '#0a0a12',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        >
          {/* Tiles */}
          {tiles.map(t => <Tile key={t.key} src={t.src} left={t.left} top={t.top} />)}

          {/* SVG overlay */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>

            {/* ── PC trail: historical breadcrumb ── */}
            {showPCTrail && historialPC.length > 0 && (() => {
              // Build ordered trail: hist[0]…hist[n-1] → current PC position
              const allPoints = [
                ...historialPC.map(h => ({ lat: h.lat, lng: h.lng, label: '', isGhost: true })),
                ...pcPuntos.map(pc => ({ lat: pc.lat, lng: pc.lng, label: pc.nombre, isGhost: false })),
              ];
              const screenPts = allPoints.map(p => toScreen(p.lat, p.lng));

              // Polyline path
              const pathD = screenPts.map((pt, i) =>
                `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
              ).join(' ');

              return (
                <g>
                  {/* Connecting line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={PC_COLOR}
                    strokeWidth={2}
                    strokeDasharray="8 5"
                    strokeOpacity={0.55}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {/* Ghost markers for past positions */}
                  {historialPC.map((h, i) => {
                    const pt = toScreen(h.lat, h.lng);
                    return (
                      <g key={h.id} transform={`translate(${pt.x},${pt.y})`}>
                        {/* Outer ring */}
                        <circle cx={0} cy={0} r={9}
                          fill="none" stroke={PC_COLOR} strokeWidth={1.5} strokeOpacity={0.45} />
                        {/* Inner dot */}
                        <circle cx={0} cy={0} r={5}
                          fill={PC_COLOR} fillOpacity={0.25} stroke={PC_COLOR} strokeWidth={1} strokeOpacity={0.55} />
                        {/* Sequence number */}
                        <text x={0} y={0} textAnchor="middle" dominantBaseline="middle"
                          fontSize={7} fontWeight={700} fill={PC_COLOR} fillOpacity={0.8}
                          fontFamily="var(--font-family-primary)"
                          style={{ pointerEvents: 'none' }}>
                          {i + 1}
                        </text>
                        {/* Timestamp tooltip on hover — using SVG title */}
                        <title>{formatTs(h.timestamp)}{h.motivo ? ` — ${h.motivo}` : ''}</title>
                      </g>
                    );
                  })}
                </g>
              );
            })()}

            {/* ── Committed shapes ── */}
            {showShapes && shapes.map(shape => {
              const isSelected = selectedShape === shape.id;
              const color  = shape.color;
              const fillOp = isSelected ? 0.32 : 0.18;
              const sw     = isSelected ? 2.5  : 2;

              if (shape.tipo === 'rectangulo' && shape.nw && shape.se) {
                const nwS = toScreen(shape.nw.lat, shape.nw.lng);
                const seS = toScreen(shape.se.lat, shape.se.lng);
                const x = Math.min(nwS.x, seS.x), y = Math.min(nwS.y, seS.y);
                const w = Math.abs(seS.x - nwS.x), h = Math.abs(seS.y - nwS.y);
                return (
                  <g key={shape.id} style={{ cursor: 'pointer', pointerEvents: 'all' }}
                    onClick={e => { e.stopPropagation(); setSelectedShape(selectedShape === shape.id ? null : shape.id); }}>
                    <rect x={x} y={y} width={w} height={h} fill={color} fillOpacity={fillOp} stroke={color} strokeWidth={sw} />
                    <text x={x + 6} y={y + 15} fill={color} fontSize={11} fontWeight={600}
                      fontFamily="var(--font-family-primary)" style={{ pointerEvents: 'none' }}>
                      {shape.nombre}
                    </text>
                  </g>
                );
              }

              if (shape.tipo === 'circulo' && shape.center && shape.radiusPoint) {
                const cS = toScreen(shape.center.lat, shape.center.lng);
                const eS = toScreen(shape.radiusPoint.lat, shape.radiusPoint.lng);
                const r  = Math.sqrt((eS.x - cS.x) ** 2 + (eS.y - cS.y) ** 2);
                return (
                  <g key={shape.id} style={{ cursor: 'pointer', pointerEvents: 'all' }}
                    onClick={e => { e.stopPropagation(); setSelectedShape(selectedShape === shape.id ? null : shape.id); }}>
                    <circle cx={cS.x} cy={cS.y} r={r} fill={color} fillOpacity={fillOp} stroke={color} strokeWidth={sw} />
                    <text x={cS.x} y={cS.y - r - 5} textAnchor="middle" fill={color} fontSize={11} fontWeight={600}
                      fontFamily="var(--font-family-primary)" style={{ pointerEvents: 'none' }}>
                      {shape.nombre}
                    </text>
                  </g>
                );
              }

              if (shape.tipo === 'poligono' && shape.points && shape.points.length >= 2) {
                const pts = shape.points.map(p => toScreen(p.lat, p.lng));
                const d   = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
                const cx  = pts.reduce((s, p) => s + p.x, 0) / pts.length;
                const cy  = pts.reduce((s, p) => s + p.y, 0) / pts.length;
                return (
                  <g key={shape.id} style={{ cursor: 'pointer', pointerEvents: 'all' }}
                    onClick={e => { e.stopPropagation(); setSelectedShape(selectedShape === shape.id ? null : shape.id); }}>
                    <path d={d} fill={color} fillOpacity={fillOp} stroke={color} strokeWidth={sw} strokeLinejoin="round" />
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                      fill={color} fontSize={11} fontWeight={600}
                      fontFamily="var(--font-family-primary)" style={{ pointerEvents: 'none' }}>
                      {shape.nombre}
                    </text>
                  </g>
                );
              }
              return null;
            })}

            {/* ── GPX traces ── */}
            {showGpxTraces && gpxTraces.map(trace => {
              if (trace.points.length < 2) return null;
              const pts = trace.points.map(p => toScreen(p.lat, p.lng));
              const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
              return (
                <g key={trace.id}>
                  {/* Glow */}
                  <path d={d} fill="none" stroke={trace.color} strokeWidth={5} strokeOpacity={0.2}
                    strokeLinejoin="round" strokeLinecap="round" />
                  {/* Main track */}
                  <path d={d} fill="none" stroke={trace.color} strokeWidth={2.2}
                    strokeLinejoin="round" strokeLinecap="round" />
                  {/* Start/end dots */}
                  <circle cx={pts[0].x} cy={pts[0].y} r={4} fill={trace.color} stroke="#fff" strokeWidth={1.5} />
                  <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={4} fill={trace.color} stroke="#fff" strokeWidth={1.5} />
                </g>
              );
            })}

            {/* ── Gap analysis overlay ── */}
            {showGapAnalysis && shapes.map(shape => {
              const pct = shapeCoverages[shape.id] ?? 0;
              const cc  = getCoverColor(pct);

              if (shape.tipo === 'rectangulo' && shape.nw && shape.se) {
                const nwS = toScreen(shape.nw.lat, shape.nw.lng);
                const seS = toScreen(shape.se.lat, shape.se.lng);
                const x = Math.min(nwS.x, seS.x), y = Math.min(nwS.y, seS.y);
                const w = Math.abs(seS.x - nwS.x), h = Math.abs(seS.y - nwS.y);
                const bw = 42, bh = 22;
                return (
                  <g key={`gap-${shape.id}`} style={{ pointerEvents: 'none' }}>
                    <rect x={x} y={y} width={w} height={h} fill={cc} fillOpacity={0.18} stroke={cc} strokeWidth={2} />
                    <rect x={x + w/2 - bw/2} y={y + h/2 - bh/2} width={bw} height={bh} rx={5} fill="rgba(10,10,18,0.72)" />
                    <text x={x + w/2} y={y + h/2 + 1} textAnchor="middle" dominantBaseline="middle"
                      fill={cc} fontSize={12} fontWeight={700} fontFamily="var(--font-family-primary)">
                      {pct}%
                    </text>
                  </g>
                );
              }

              if (shape.tipo === 'circulo' && shape.center && shape.radiusPoint) {
                const cS = toScreen(shape.center.lat, shape.center.lng);
                const eS = toScreen(shape.radiusPoint.lat, shape.radiusPoint.lng);
                const r  = Math.sqrt((eS.x - cS.x) ** 2 + (eS.y - cS.y) ** 2);
                return (
                  <g key={`gap-${shape.id}`} style={{ pointerEvents: 'none' }}>
                    <circle cx={cS.x} cy={cS.y} r={r} fill={cc} fillOpacity={0.18} stroke={cc} strokeWidth={2} />
                    <rect x={cS.x - 21} y={cS.y - 11} width={42} height={22} rx={5} fill="rgba(10,10,18,0.72)" />
                    <text x={cS.x} y={cS.y + 1} textAnchor="middle" dominantBaseline="middle"
                      fill={cc} fontSize={12} fontWeight={700} fontFamily="var(--font-family-primary)">
                      {pct}%
                    </text>
                  </g>
                );
              }

              if (shape.tipo === 'poligono' && shape.points && shape.points.length >= 2) {
                const pts = shape.points.map(p => toScreen(p.lat, p.lng));
                const d   = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
                const cx  = pts.reduce((s, p) => s + p.x, 0) / pts.length;
                const cy  = pts.reduce((s, p) => s + p.y, 0) / pts.length;
                return (
                  <g key={`gap-${shape.id}`} style={{ pointerEvents: 'none' }}>
                    <path d={d} fill={cc} fillOpacity={0.18} stroke={cc} strokeWidth={2} strokeLinejoin="round" />
                    <rect x={cx - 21} y={cy - 11} width={42} height={22} rx={5} fill="rgba(10,10,18,0.72)" />
                    <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                      fill={cc} fontSize={12} fontWeight={700} fontFamily="var(--font-family-primary)">
                      {pct}%
                    </text>
                  </g>
                );
              }

              return null;
            })}

            {/* ── Active rect preview ── */}
            {activeDraw && activeDraw.type === 'rect' && (() => {
              const nwS = toScreen(activeDraw.startLat, activeDraw.startLng);
              const seS = toScreen(activeDraw.curLat, activeDraw.curLng);
              const x = Math.min(nwS.x, seS.x), y = Math.min(nwS.y, seS.y);
              const w = Math.abs(seS.x - nwS.x), h = Math.abs(seS.y - nwS.y);
              return <rect x={x} y={y} width={w} height={h}
                fill={selectedColor} fillOpacity={0.15} stroke={selectedColor} strokeWidth={2} strokeDasharray="6 4" />;
            })()}

            {/* ── Active circle preview ── */}
            {activeDraw && activeDraw.type === 'circle' && (() => {
              const cS = toScreen(activeDraw.centerLat, activeDraw.centerLng);
              const eS = toScreen(activeDraw.edgeLat, activeDraw.edgeLng);
              const r  = Math.sqrt((eS.x - cS.x) ** 2 + (eS.y - cS.y) ** 2);
              return (
                <>
                  <circle cx={cS.x} cy={cS.y} r={r} fill={selectedColor} fillOpacity={0.15}
                    stroke={selectedColor} strokeWidth={2} strokeDasharray="6 4" />
                  <circle cx={cS.x} cy={cS.y} r={4} fill={selectedColor} />
                  <line x1={cS.x} y1={cS.y} x2={eS.x} y2={eS.y}
                    stroke={selectedColor} strokeWidth={1.5} strokeDasharray="4 3" />
                  {r > 0 && (
                    <text x={cS.x} y={cS.y + r + 14} textAnchor="middle"
                      fill={selectedColor} fontSize={10} fontWeight={600}
                      fontFamily="var(--font-family-primary)">
                      r ≈ {Math.round(r)}px
                    </text>
                  )}
                </>
              );
            })()}

            {/* ── Polygon in-progress ── */}
            {tool === 'poligono' && polygonPoints.length > 0 && (() => {
              const pts = polygonPoints.map(p => toScreen(p.lat, p.lng));
              const cur = polygonCursor ? toScreen(polygonCursor.lat, polygonCursor.lng) : null;
              const committed = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
              const toNext    = cur ? ` L${cur.x.toFixed(1)},${cur.y.toFixed(1)}` : '';
              const closeBack = (cur && pts.length >= 2) ? ` L${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}` : '';
              return (
                <>
                  <path d={committed + toNext + closeBack}
                    fill={selectedColor} fillOpacity={0.12}
                    stroke={selectedColor} strokeWidth={2} strokeDasharray="7 4" strokeLinejoin="round" />
                  {pts.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y}
                      r={i === 0 ? 5.5 : 3.5}
                      fill={selectedColor} stroke="#fff" strokeWidth={1.5} />
                  ))}
                </>
              );
            })()}

            {/* ── Punto markers ── */}
            {showPuntos && puntos.map(punto => {
              const pos = toScreen(punto.lat, punto.lng);
              const cfg = MARKER_CFG[punto.tipo as keyof typeof MARKER_CFG];
              if (!cfg) return null;
              const isSelected = selectedPunto === punto.id || hoveredPunto === punto.id;
              return (
                <g
                  key={punto.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                  onClick={e => { e.stopPropagation(); setSelectedPunto(selectedPunto === punto.id ? null : punto.id); }}
                  onMouseEnter={() => setHoveredPunto(punto.id)}
                  onMouseLeave={() => setHoveredPunto(null)}
                >
                  <circle cx={0} cy={-22} r={12} fill={cfg.color} stroke="#fff" strokeWidth={2.5}
                    filter="drop-shadow(0 3px 6px rgba(0,0,0,0.40))" />
                  <line x1={0} y1={-10} x2={0} y2={0} stroke={cfg.color} strokeWidth={3} strokeLinecap="round" />
                  <text x={0} y={-18} textAnchor="middle" dominantBaseline="middle"
                    fontSize={12} fill="#fff" fontFamily="sans-serif"
                    style={{ pointerEvents: 'none' }}>
                    {cfg.symbol}
                  </text>
                  {isSelected && (
                    <g transform="translate(14, -48)">
                      <rect x={0} y={0}
                        width={Math.max(punto.nombre.length * 6.5 + 16, 110)}
                        height={punto.descripcion ? 48 : 32}
                        rx={6} fill="#fff"
                        filter="drop-shadow(0 4px 12px rgba(0,0,0,0.22))" />
                      <text x={8} y={17} fontSize={12} fontWeight={600} fill="#444140"
                        fontFamily="var(--font-family-primary)">
                        {punto.nombre}
                      </text>
                      {punto.descripcion ? (
                        <text x={8} y={33} fontSize={10} fill="#888"
                          fontFamily="var(--font-family-primary)">
                          {punto.descripcion}
                        </text>
                      ) : (
                        <text x={8} y={33} fontSize={9} fill={cfg.color} fontWeight={600}
                          fontFamily="var(--font-family-primary)">
                          {punto.lat.toFixed(4)}° {Math.abs(punto.lng).toFixed(4)}°
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Polygon hint */}
        {tool === 'poligono' && polygonPoints.length >= 3 && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg pointer-events-none"
            style={{
              background: 'rgba(37,99,235,0.88)', backdropFilter: 'blur(6px)',
              color: '#fff', fontSize: 'var(--text-label)',
              fontWeight: 'var(--font-weight-semibold)', zIndex: 100,
            }}
          >
            Doble clic para cerrar el polígono · {polygonPoints.length} vértices
          </div>
        )}

        {/* Move PC hint */}
        {tool === 'moverPC' && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg pointer-events-none"
            style={{
              background: `rgba(37,99,235,0.88)`, backdropFilter: 'blur(6px)',
              color: '#fff', fontSize: 'var(--text-label)',
              fontWeight: 'var(--font-weight-semibold)', zIndex: 100,
            }}
          >
            ⚑ Hacé clic en el mapa para reposicionar el Puesto de Comando
          </div>
        )}

        {/* Zoom controls */}
        <div
          className="absolute top-4 right-4 flex flex-col rounded-lg overflow-hidden"
          style={{ boxShadow: 'var(--elevation-sm)', background: 'var(--card)', zIndex: 100 }}
        >
          <button onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setZoom(z => Math.min(MAX_ZOOM, z + 1)); }}
            className="p-2.5 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--foreground)' }}>
            <ZoomIn size={16} />
          </button>
          <div className="h-px" style={{ background: 'var(--border)' }} />
          <div className="px-2 py-1 text-center"
            style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>
            {zoom}
          </div>
          <div className="h-px" style={{ background: 'var(--border)' }} />
          <button onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setZoom(z => Math.max(MIN_ZOOM, z - 1)); }}
            className="p-2.5 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--foreground)' }}>
            <ZoomOut size={16} />
          </button>
        </div>

        {/* Layer badge */}
        <div
          className="absolute bottom-6 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg capitalize"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)', color: 'var(--foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', zIndex: 100 }}
        >
          <Layers size={12} />
          {layer}
        </div>

        {/* Coordinates */}
        <div
          className="absolute bottom-6 right-4 px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', fontFamily: 'monospace', fontSize: '10px', zIndex: 100 }}
        >
          {center[0].toFixed(4)}°S &nbsp;{Math.abs(center[1]).toFixed(4)}°O
        </div>

        {/* Punto detail panel */}
        {selectedPunto && (() => {
          const punto = puntos.find(p => p.id === selectedPunto);
          if (!punto) return null;
          return (
            <PuntoDetailPanel
              punto={punto}
              onClose={() => setSelectedPunto(null)}
              onSave={handleSavePuntoDetail}
            />
          );
        })()}
      </div>

      {/* ── Modal: agregar punto ──────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.52)', zIndex: 500 }}>
          <div className="w-full max-w-[360px] rounded-[var(--radius-card)] p-6"
            style={{ background: 'var(--card)', boxShadow: 'var(--elevation-md)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
                Agregar {MARKER_CFG[tool as keyof typeof MARKER_CFG]?.label ?? tool}
              </h2>
              <button onClick={() => setShowAddModal(false)} style={{ color: 'var(--muted-foreground)' }}>
                <X size={16} />
              </button>
            </div>
            {clickLatLng && (
              <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', marginBottom: 12, fontFamily: 'monospace' }}>
                {clickLatLng.lat.toFixed(5)}°, {clickLatLng.lng.toFixed(5)}°
              </p>
            )}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block mb-1"
                  style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Nombre *
                </label>
                <input type="text" value={addForm.nombre}
                  onChange={e => setAddForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Nombre del punto" autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAddPunto()}
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={{ background: 'var(--input-background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: 'var(--text-base)' }}
                />
              </div>
              <div>
                <label className="block mb-1"
                  style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Descripción
                </label>
                <input type="text" value={addForm.descripcion}
                  onChange={e => setAddForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Descripción opcional"
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={{ background: 'var(--input-background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: 'var(--text-base)' }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-[var(--radius-button)] border"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border)', background: 'transparent', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                Cancelar
              </button>
              <button onClick={handleAddPunto}
                className="px-4 py-2 rounded-[var(--radius-button)]"
                style={{ background: 'var(--primary)', color: '#fff', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: nombrar área ───────────────────────────────────────────── */}
      {showNameModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.52)', zIndex: 500 }}>
          <div className="w-full max-w-[360px] rounded-[var(--radius-card)] p-6"
            style={{ background: 'var(--card)', boxShadow: 'var(--elevation-md)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
                Nombrar área dibujada
              </h2>
              <button onClick={() => { setShowNameModal(false); setPendingShape(null); }}
                style={{ color: 'var(--muted-foreground)' }}>
                <X size={16} />
              </button>
            </div>
            {pendingShape && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--muted)' }}>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: pendingShape.color }} />
                <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>
                  {pendingShape.tipo === 'rectangulo' ? 'Rectángulo'
                    : pendingShape.tipo === 'circulo' ? 'Círculo'
                    : `Polígono · ${pendingShape.points?.length ?? 0} vértices`}
                </span>
              </div>
            )}
            <div>
              <label className="block mb-1"
                style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                Nombre del área *
              </label>
              <input type="text" value={shapeNameInput}
                onChange={e => setShapeNameInput(e.target.value)}
                placeholder="ej. Zona de búsqueda Norte" autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveShape()}
                className="w-full px-3 py-2 rounded-lg outline-none"
                style={{ background: 'var(--input-background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: 'var(--text-base)' }}
              />
            </div>
            <div>
              <label className="block mb-2"
                style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                Color del área
              </label>
              <div className="flex flex-wrap gap-2">
                {SHAPE_PALETTE.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPendingShape(s => s ? { ...s, color: c } : null)}
                    style={{
                      width: 26, height: 26,
                      borderRadius: '50%',
                      background: c,
                      border:       pendingShape?.color === c ? '2.5px solid var(--foreground)' : '2px solid rgba(0,0,0,0.18)',
                      outline:      pendingShape?.color === c ? '2px solid var(--card)' : 'none',
                      outlineOffset: '1px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowNameModal(false); setPendingShape(null); }}
                className="px-4 py-2 rounded-[var(--radius-button)] border"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border)', background: 'transparent', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                Descartar
              </button>
              <button onClick={handleSaveShape}
                className="px-4 py-2 rounded-[var(--radius-button)]"
                style={{ background: 'var(--primary)', color: '#fff', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hidden GPX file input ─────────────────────────────────────────── */}
      <input
        ref={gpxFileInputRef}
        type="file"
        accept=".gpx"
        multiple
        style={{ display: 'none' }}
        onChange={handleGpxFileLoad}
      />

      {/* ── Modal: confirmar reposición Puesto de Comando ─────────────────── */}
      {showMoverPCModal && pendingPCLatLng && (
        <div className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.52)', zIndex: 500 }}>
          <div className="w-full max-w-[400px] rounded-[var(--radius-card)] overflow-hidden"
            style={{ background: 'var(--card)', boxShadow: 'var(--elevation-md)' }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4"
              style={{ background: 'rgba(37,99,235,0.08)', borderBottom: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#dbeafe', color: PC_COLOR }}>
                <MoveRight size={18} />
              </div>
              <div className="flex-1">
                <h2 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Reposicionar Puesto de Comando
                </h2>
                <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', marginTop: 2 }}>
                  La posición actual quedará registrada en el historial
                </p>
              </div>
              <button onClick={() => { setShowMoverPCModal(false); setPendingPCLatLng(null); }}
                style={{ color: 'var(--muted-foreground)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* PC selector (if multiple) */}
              {pcPuntos.length > 1 && (
                <div>
                  <label className="block mb-1.5"
                    style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                    Puesto a mover
                  </label>
                  <select
                    value={moverPCPuntoId}
                    onChange={e => setMoverPCPuntoId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg outline-none"
                    style={{ background: 'var(--input-background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: 'var(--text-base)' }}
                  >
                    {pcPuntos.map(pc => (
                      <option key={pc.id} value={pc.id}>{pc.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* New position */}
              <div className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)' }}>
                <div className="mt-0.5">
                  <Navigation size={14} style={{ color: PC_COLOR }} />
                </div>
                <div>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', marginBottom: 4, fontWeight: 'var(--font-weight-semibold)' }}>
                    Nueva posición
                  </p>
                  <p style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--foreground)' }}>
                    {pendingPCLatLng.lat.toFixed(5)}°, {pendingPCLatLng.lng.toFixed(5)}°
                  </p>
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block mb-1.5"
                  style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Motivo del traslado
                  <span style={{ color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-regular)' }}> (opcional)</span>
                </label>
                <textarea
                  value={moverPCMotivo}
                  onChange={e => setMoverPCMotivo(e.target.value)}
                  placeholder="ej. Búsqueda avanzó hacia el norte, se reubica la base…"
                  rows={3}
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg outline-none resize-none"
                  style={{ background: 'var(--input-background)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: 'var(--text-base)', lineHeight: 1.5 }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button
                onClick={() => { setShowMoverPCModal(false); setPendingPCLatLng(null); setMoverPCMotivo(''); }}
                className="px-4 py-2 rounded-[var(--radius-button)] border"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border)', background: 'transparent', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                Cancelar
              </button>
              <button
                onClick={handleConfirmMoverPC}
                className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)]"
                style={{ background: PC_COLOR, color: '#fff', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                <MoveRight size={15} />
                Confirmar traslado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
