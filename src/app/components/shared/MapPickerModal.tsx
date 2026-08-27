import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, X, Check, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

/* ── Fix default Leaflet marker icons ── */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* Custom red marker for Punto 0 */
const punto0Icon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/* ── Handles map clicks ── */
function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/* ── Re-centers map when selected point changes ── */
function MapRecenter({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!coords) return;
    try {
      // animate:false prevents Leaflet from running panBy animations that
      // crash with "Cannot read properties of undefined (reading 'classList')"
      // when the map container is unmounted mid-animation.
      map.setView(coords, map.getZoom(), { animate: false });
    } catch {
      // map already destroyed — ignore
    }
    return () => {
      // Cancel any in-flight pan/zoom animations before the component unmounts
      try { map.stop(); } catch { /* already gone */ }
    };
  }, [coords, map]);
  return null;
}

/* ── Props ── */
interface MapPickerModalProps {
  onConfirm: (lat: number, lng: number) => void;
  initialLat?: string;
  initialLng?: string;
}

export function MapPickerModal({ onConfirm, initialLat, initialLng }: MapPickerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);
  const [mapKey, setMapKey] = useState(0);

  const defaultCenter: [number, number] = [-31.41667, -64.18333];

  const resolveInitial = (): { lat: number; lng: number } | null => {
    const lat = parseFloat(initialLat || '');
    const lng = parseFloat(initialLng || '');
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    return null;
  };

  const handleOpen = () => {
    const init = resolveInitial();
    setSelected(init);
    setMapKey(k => k + 1); // force MapContainer remount so it renders correctly in modal
    setIsOpen(true);
  };

  const handleClose = () => setIsOpen(false);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelected({ lat, lng });
  }, []);

  const handleConfirm = () => {
    if (selected) {
      onConfirm(selected.lat, selected.lng);
      setIsOpen(false);
    }
  };

  const centerCoords: [number, number] = selected
    ? [selected.lat, selected.lng]
    : defaultCenter;

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-button)] transition-all w-full justify-center"
        style={{
          background: 'var(--primary)',
          color: '#fff',
          fontFamily: 'var(--font-family-primary)',
          fontSize: 'var(--text-label)',
          fontWeight: 'var(--font-weight-semibold)',
          border: 'none',
          cursor: 'pointer',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <Navigation size={13} />
        Seleccionar en mapa
      </button>

      {/* ── Modal overlay ── */}
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 99999, background: 'rgba(0,0,0,0.65)' }}
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            className="flex flex-col rounded-[var(--radius-card)] overflow-hidden"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              width: 'min(92vw, 720px)',
              height: 'min(88vh, 580px)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <MapPin size={15} style={{ color: 'var(--primary)' }} />
                <span style={{
                  fontFamily: 'var(--font-family-primary)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--foreground)',
                }}>
                  Seleccionar Punto 0 / LSP
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex items-center justify-center rounded-[var(--radius-button)] transition-colors"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted-foreground)',
                  padding: '4px',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Instruction bar */}
            <div
              className="flex items-center gap-2 px-5 py-2.5 flex-shrink-0"
              style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}
            >
              <Navigation size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <p style={{
                fontFamily: 'var(--font-family-primary)',
                fontSize: 'var(--text-label)',
                color: 'var(--muted-foreground)',
              }}>
                Hacé clic en el mapa para colocar el marcador en el punto de última ubicación conocida (LSP / Punto 0).
              </p>
            </div>

            {/* Map */}
            <div className="flex-1 min-h-0" style={{ position: 'relative' }}>
              <MapContainer
                key={mapKey}
                center={centerCoords}
                zoom={13}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <ClickHandler onMapClick={handleMapClick} />
                {selected && (
                  <>
                    <Marker position={[selected.lat, selected.lng]} icon={punto0Icon} />
                    <MapRecenter coords={[selected.lat, selected.lng]} />
                  </>
                )}
              </MapContainer>

              {/* Crosshair hint when nothing selected */}
              {!selected && (
                <div
                  className="absolute flex flex-col items-center gap-2 pointer-events-none"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1000,
                  }}
                >
                  <div
                    className="px-3 py-2 rounded-[var(--radius-button)]"
                    style={{
                      background: 'rgba(0,0,0,0.55)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <p style={{
                      fontFamily: 'var(--font-family-primary)',
                      fontSize: 'var(--text-label)',
                      color: '#fff',
                      textAlign: 'center',
                    }}>
                      Hacé clic para marcar el Punto 0
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              {/* Coordinates display */}
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-input)]"
                style={{
                  background: selected ? 'rgba(229,75,75,0.07)' : 'var(--muted)',
                  border: selected ? '1px solid rgba(229,75,75,0.3)' : '1px solid var(--border)',
                  minWidth: 200,
                }}
              >
                <MapPin size={13} style={{ color: selected ? 'var(--primary)' : 'var(--muted-foreground)', flexShrink: 0 }} />
                {selected ? (
                  <span style={{
                    fontFamily: 'var(--font-family-primary)',
                    fontSize: 'var(--text-label)',
                    color: 'var(--foreground)',
                    letterSpacing: '0.01em',
                  }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Lat </span>
                    {selected.lat.toFixed(5)}
                    <span style={{ color: 'var(--muted-foreground)', margin: '0 6px' }}>·</span>
                    <span style={{ color: 'var(--muted-foreground)' }}>Lng </span>
                    {selected.lng.toFixed(5)}
                  </span>
                ) : (
                  <span style={{
                    fontFamily: 'var(--font-family-primary)',
                    fontSize: 'var(--text-label)',
                    color: 'var(--muted-foreground)',
                    fontStyle: 'italic',
                  }}>
                    Sin punto seleccionado
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-[var(--radius-button)] transition-colors"
                  style={{
                    fontFamily: 'var(--font-family-primary)',
                    fontSize: 'var(--text-label)',
                    fontWeight: 'var(--font-weight-medium)',
                    background: 'var(--muted)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--foreground)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!selected}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-button)] transition-all"
                  style={{
                    fontFamily: 'var(--font-family-primary)',
                    fontSize: 'var(--text-label)',
                    fontWeight: 'var(--font-weight-semibold)',
                    background: selected ? 'var(--primary)' : 'var(--muted)',
                    color: selected ? '#fff' : 'var(--muted-foreground)',
                    border: 'none',
                    cursor: selected ? 'pointer' : 'not-allowed',
                    opacity: selected ? 1 : 0.55,
                  }}
                >
                  <Check size={13} />
                  Confirmar punto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}