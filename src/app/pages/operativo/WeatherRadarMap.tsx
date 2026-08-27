/**
 * WeatherRadarMap.tsx
 * Mapa de tiles puro en React — sin Leaflet, sin react-leaflet.
 * Tiles OSM + radar RainViewer animado, posicionados con CSS absoluto.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import type { RadarFrame, OWMLayer } from '../../services/weatherService';
import { getOWMTileUrl } from '../../services/weatherService';
import { ZoomIn, ZoomOut, Crosshair } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const TILE_SIZE = 256;
const MAP_HEIGHT = 420;
const MIN_ZOOM = 4;
const MAX_ZOOM = 13;

// ─── Projection helpers ───────────────────────────────────────────────────────
function latLngToWorld(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom) * TILE_SIZE;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

function worldToScreen(
  worldX: number,
  worldY: number,
  centerWorld: { x: number; y: number },
  mapW: number,
): { sx: number; sy: number } {
  return {
    sx: mapW / 2 + (worldX - centerWorld.x),
    sy: MAP_HEIGHT / 2 + (worldY - centerWorld.y),
  };
}

// ─── Tile grid calculation ────────────────────────────────────────────────────
interface TileInfo {
  key: string;
  tx: number;
  ty: number;
  sx: number;
  sy: number;
}

function calcTiles(
  centerLat: number,
  centerLng: number,
  zoom: number,
  mapW: number,
): TileInfo[] {
  const center = latLngToWorld(centerLat, centerLng, zoom);
  const maxTile = Math.pow(2, zoom);

  const cTX = Math.floor(center.x / TILE_SIZE);
  const cTY = Math.floor(center.y / TILE_SIZE);

  const colsHalf = Math.ceil(mapW / 2 / TILE_SIZE) + 1;
  const rowsHalf = Math.ceil(MAP_HEIGHT / 2 / TILE_SIZE) + 1;

  const tiles: TileInfo[] = [];
  for (let dy = -rowsHalf; dy <= rowsHalf; dy++) {
    for (let dx = -colsHalf; dx <= colsHalf; dx++) {
      const tx = ((cTX + dx) % maxTile + maxTile) % maxTile;
      const ty = cTY + dy;
      if (ty < 0 || ty >= maxTile) continue;

      const worldX = (cTX + dx) * TILE_SIZE;
      const worldY = (cTY + dy) * TILE_SIZE;
      const { sx, sy } = worldToScreen(worldX, worldY, center, mapW);

      // Cull offscreen tiles with a small buffer
      if (sx > mapW + TILE_SIZE || sx < -TILE_SIZE) continue;
      if (sy > MAP_HEIGHT + TILE_SIZE || sy < -TILE_SIZE) continue;

      tiles.push({ key: `${tx}-${ty}-${dx}-${dy}`, tx, ty, sx, sy });
    }
  }
  return tiles;
}

// ─── Tile layers ──────────────────────────────────────────────────────────────
const OSM_SUBS = ['a', 'b', 'c'];

function OSMLayer({ tiles, zoom }: { tiles: TileInfo[]; zoom: number }) {
  return (
    <>
      {tiles.map(t => (
        <img
          key={t.key}
          src={`https://${OSM_SUBS[(t.tx + t.ty) % 3]}.tile.openstreetmap.org/${zoom}/${t.tx}/${t.ty}.png`}
          style={{
            position: 'absolute',
            left: t.sx,
            top: t.sy,
            width: TILE_SIZE,
            height: TILE_SIZE,
            display: 'block',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          alt=""
          draggable={false}
        />
      ))}
    </>
  );
}

function RadarTileLayer({
  tiles,
  zoom,
  frame,
  opacity,
}: {
  tiles: TileInfo[];
  zoom: number;
  frame: RadarFrame & { host: string };
  opacity: number;
}) {
  if (!frame?.path) return null;
  return (
    <>
      {tiles.map(t => (
        <img
          key={`r-${t.key}`}
          src={`${frame.host}${frame.path}/256/${zoom}/${t.tx}/${t.ty}/2/1_1.png`}
          style={{
            position: 'absolute',
            left: t.sx,
            top: t.sy,
            width: TILE_SIZE,
            height: TILE_SIZE,
            display: 'block',
            opacity,
            pointerEvents: 'none',
            userSelect: 'none',
            transition: 'opacity 0.15s ease',
          }}
          alt=""
          draggable={false}
        />
      ))}
    </>
  );
}

function OWMTileLayer({
  tiles,
  zoom,
  layer,
}: {
  tiles: TileInfo[];
  zoom: number;
  layer: OWMLayer;
}) {
  const baseUrl = getOWMTileUrl(layer);
  if (!baseUrl) return null;
  return (
    <>
      {tiles.map(t => (
        <img
          key={`owm-${t.key}`}
          src={baseUrl.replace('{z}', String(zoom)).replace('{x}', String(t.tx)).replace('{y}', String(t.ty))}
          style={{
            position: 'absolute',
            left: t.sx,
            top: t.sy,
            width: TILE_SIZE,
            height: TILE_SIZE,
            display: 'block',
            opacity: 0.55,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          alt=""
          draggable={false}
        />
      ))}
    </>
  );
}

function PuntoCeroMarker({
  markerLat,
  markerLng,
  centerLat,
  centerLng,
  zoom,
  mapW,
  label,
}: {
  markerLat: number;
  markerLng: number;
  centerLat: number;
  centerLng: number;
  zoom: number;
  mapW: number;
  label: string;
}) {
  const center = latLngToWorld(centerLat, centerLng, zoom);
  const mWorld = latLngToWorld(markerLat, markerLng, zoom);
  const { sx, sy } = worldToScreen(mWorld.x, mWorld.y, center, mapW);

  const [tooltip, setTooltip] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        left: sx - 14,
        top: sy - 32,
        zIndex: 20,
        cursor: 'pointer',
      }}
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
    >
      {/* Pin shape */}
      <div style={{
        width: 28, height: 28,
        borderRadius: '50% 50% 50% 0',
        transform: 'rotate(-45deg)',
        background: '#E54B4B',
        border: '3px solid #fff',
        boxShadow: '0 2px 10px rgba(229,75,75,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          transform: 'rotate(45deg)',
          width: 8, height: 8, borderRadius: '50%', background: '#fff',
        }} />
      </div>
      {/* Pulse ring */}
      <div style={{
        position: 'absolute', top: -4, left: -4,
        width: 36, height: 36, borderRadius: '50%',
        border: '2px solid rgba(229,75,75,0.4)',
        animation: 'radarPulse 2s ease-out infinite',
        pointerEvents: 'none',
      }} />
      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          bottom: 36,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-input)',
          padding: '5px 10px',
          whiteSpace: 'nowrap',
          boxShadow: 'var(--elevation-sm)',
          fontFamily: 'var(--font-family-primary)',
          fontSize: 11,
          color: 'var(--foreground)',
          fontWeight: 'var(--font-weight-semibold)',
          pointerEvents: 'none',
        }}>
          📍 {label}
          <div style={{ color: 'var(--muted-foreground)', fontWeight: 400, fontSize: 10 }}>
            {markerLat.toFixed(4)}, {markerLng.toFixed(4)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface WeatherRadarMapProps {
  lat: number;
  lng: number;
  locationName: string;
  frames: (RadarFrame & { host: string })[];
  currentFrameIdx: number;
  radarOpacity?: number;
  owmLayer: OWMLayer;
  zoom?: number;
}

// ─── Main map component ───────────────────────────────────────────────────────
export function WeatherRadarMap({
  lat,
  lng,
  locationName,
  frames,
  currentFrameIdx,
  radarOpacity = 0.7,
  owmLayer,
  zoom: initialZoom = 8,
}: WeatherRadarMapProps) {
  const [zoom, setZoom] = useState(initialZoom);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapW, setMapW] = useState(800);

  // Measure container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setMapW(w);
    });
    ro.observe(el);
    setMapW(el.clientWidth || 800);
    return () => ro.disconnect();
  }, []);

  const tiles = calcTiles(lat, lng, zoom, mapW);
  const currentFrame = frames[currentFrameIdx];

  const zoomIn = useCallback(() => setZoom(z => Math.min(z + 1, MAX_ZOOM)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(z - 1, MIN_ZOOM)), []);
  const resetZoom = useCallback(() => setZoom(initialZoom), [initialZoom]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        height: MAP_HEIGHT,
        width: '100%',
        background: '#e8e0d8',
        borderRadius: 'var(--radius-card)',
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* Pulse ring animation */}
      <style>{`
        @keyframes radarPulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0;   }
        }
      `}</style>

      {/* OSM base tiles */}
      <OSMLayer tiles={tiles} zoom={zoom} />

      {/* Radar overlay */}
      {currentFrame && (
        <RadarTileLayer
          tiles={tiles}
          zoom={zoom}
          frame={currentFrame}
          opacity={radarOpacity}
        />
      )}

      {/* OWM layer */}
      {owmLayer !== 'none' && (
        <OWMTileLayer tiles={tiles} zoom={zoom} layer={owmLayer} />
      )}

      {/* Punto Cero marker */}
      <PuntoCeroMarker
        markerLat={lat}
        markerLng={lng}
        centerLat={lat}
        centerLng={lng}
        zoom={zoom}
        mapW={mapW}
        label={locationName}
      />

      {/* Zoom controls */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 30,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {[
          { icon: <ZoomIn size={15} />, action: zoomIn, disabled: zoom >= MAX_ZOOM, title: 'Acercar' },
          { icon: <ZoomOut size={15} />, action: zoomOut, disabled: zoom <= MIN_ZOOM, title: 'Alejar' },
          { icon: <Crosshair size={14} />, action: resetZoom, disabled: false, title: 'Restablecer zoom' },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.action}
            disabled={btn.disabled}
            title={btn.title}
            style={{
              width: 32, height: 32, borderRadius: 6,
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(68,65,64,0.2)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: btn.disabled ? 'not-allowed' : 'pointer',
              color: btn.disabled ? 'rgba(68,65,64,0.3)' : '#444140',
              fontFamily: 'var(--font-family-primary)',
            }}
          >
            {btn.icon}
          </button>
        ))}
      </div>

      {/* Zoom level badge */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8, zIndex: 30,
        background: 'rgba(255,255,255,0.85)',
        borderRadius: 4, padding: '2px 6px',
        fontSize: 10, color: '#444140',
        fontFamily: 'var(--font-family-primary)',
        border: '1px solid rgba(68,65,64,0.15)',
      }}>
        Z{zoom}
      </div>

      {/* Attribution */}
      <div style={{
        position: 'absolute', bottom: 8, right: 8, zIndex: 30,
        fontSize: 9, color: '#444',
        background: 'rgba(255,255,255,0.75)',
        borderRadius: 3, padding: '2px 5px',
        fontFamily: 'var(--font-family-primary)',
      }}>
        © <a href="https://openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: '#444' }}>OpenStreetMap</a>
        {frames.length > 0 && <> · © <a href="https://rainviewer.com" target="_blank" rel="noreferrer" style={{ color: '#444' }}>RainViewer</a></>}
      </div>
    </div>
  );
}
