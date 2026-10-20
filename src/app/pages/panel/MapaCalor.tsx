import { MapContainer, TileLayer, Polygon, Circle, Tooltip, useMap } from 'react-leaflet';
import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { OperativoPanel } from '../../utils/panelGeneral';
import { ETIQUETA_RESULTADO, ETIQUETA_ESTADO } from '../../utils/panelGeneral';

/**
 * Mapa de calor del historial (panel general, sección 5): cada polígono de búsqueda
 * de cada operativo se pinta del mismo rojo, casi transparente. Donde se buscó varias
 * veces las capas se superponen y el color se intensifica: así se ve dónde se repiten
 * los operativos a lo largo del tiempo. Un solo tono (escala secuencial), sobre un
 * mapa base gris para que el calor no compita con la foto satelital.
 */
const OPACIDAD = 0.16;
const HALO_M = 6000;
const CORDOBA: L.LatLngTuple = [-31.4, -64.55];

function Encuadre({ ops }: { ops: OperativoPanel[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = ops.flatMap(o => o.areas.flat());
    // El contenedor recién toma su tamaño después del primer pintado: sin esto el encuadre queda corto.
    const t = setTimeout(() => {
      map.invalidateSize();
      if (pts.length) map.fitBounds(L.latLngBounds(pts as L.LatLngTuple[]), { padding: [30, 30], maxZoom: 12 });
      else map.setView(CORDOBA, 8);
    }, 50);
    return () => clearTimeout(t);
  }, [ops, map]);
  return null;
}

export default function MapaCalor({ ops, isDark }: { ops: OperativoPanel[]; isDark: boolean }) {
  const base = isDark
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const color = isDark ? '#ff6b6b' : '#d63a3a';
  const fecha = (s: string) => new Date(s).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
  const capas = useMemo(() => ops.flatMap(o => o.areas.map((a, i) => ({ o, a, k: `${o.id}-${i}` }))), [ops]);
  /** Halo de cada operativo (centro de sus áreas): a escala provincial los polígonos de 1–2 km son puntos; el halo suma calor por zona. */
  const halos = useMemo(() => ops.filter(o => o.areas.length).map(o => {
    const pts = o.areas.flat();
    return { o, c: [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length] as L.LatLngTuple };
  }), [ops]);

  return (
    <div>
      <div className="rounded-xl overflow-hidden" style={{ height: 420, border: '1px solid var(--border)' }}>
        <MapContainer center={CORDOBA} zoom={8} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer key={base} url={base} attribution="Mapa base &copy; Esri" maxZoom={16} />
          <Encuadre ops={ops} />
          {halos.map(({ o, c }) => (
            <Circle key={`h-${o.id}`} center={c} radius={HALO_M} pathOptions={{ stroke: false, fillColor: color, fillOpacity: OPACIDAD }}>
              <Tooltip sticky>
                <strong>{o.titulo}</strong><br />
                {o.localidad} · {fecha(o.inicio)}<br />
                {o.resultado ? ETIQUETA_RESULTADO[o.resultado] : ETIQUETA_ESTADO[o.estado]}
              </Tooltip>
            </Circle>
          ))}
          {capas.map(({ o, a, k }) => (
            <Polygon key={k} positions={a} pathOptions={{ color, weight: 0.6, opacity: 0.35, fillColor: color, fillOpacity: OPACIDAD }}>
              <Tooltip sticky>
                <strong>{o.titulo}</strong><br />
                {o.localidad} · {fecha(o.inicio)}<br />
                {o.resultado ? ETIQUETA_RESULTADO[o.resultado] : ETIQUETA_ESTADO[o.estado]}
              </Tooltip>
            </Polygon>
          ))}
        </MapContainer>
      </div>
      {/* Leyenda: cuántas áreas superpuestas dan cada intensidad. */}
      <div className="flex items-center gap-3 mt-3 flex-wrap" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
        <span>Operativos en la misma zona:</span>
        {[1, 2, 3, 5].map(n => (
          <span key={n} className="inline-flex items-center gap-1.5">
            <span style={{ width: 18, height: 12, borderRadius: 3, background: color, opacity: 1 - Math.pow(1 - OPACIDAD, n), display: 'inline-block' }} />
            {n === 5 ? '5 o más' : n}
          </span>
        ))}
        <span style={{ marginLeft: 'auto' }}>{ops.length} operativos · acercá el mapa para ver sus polígonos</span>
      </div>
    </div>
  );
}
