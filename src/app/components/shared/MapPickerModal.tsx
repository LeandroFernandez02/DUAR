import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, X, Check, Navigation, Search, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { buscarLugares, leerCoordenadas, type Lugar } from '../../services/geoService';

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

/* ── Interacción con el mapa (pedido del 05/10) ──
 * - Doble clic (o doble toque) marca el Punto 0: un clic suelto no hace nada,
 *   así arrastrar para moverse nunca deja un marcador sin querer.
 * - Moverse: mantener apretado y arrastrar.
 * - Zoom: los botones + / − o la rueda del mouse (en el celular, pellizcando).
 *   Por eso el doble clic NO acerca (doubleClickZoom={false} en el mapa).
 * - Un clic suelto sólo cierra la lista de resultados del buscador. */
function ClickHandler({ onDobleClic, onClic }: { onDobleClic: (lat: number, lng: number) => void; onClic: () => void }) {
  useMapEvents({
    dblclick(e) {
      onDobleClic(e.latlng.lat, e.latlng.lng);
    },
    click() {
      onClic();
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
  /** Localidad del formulario ("La Calera, Córdoba"): si todavía no hay punto, el mapa abre ahí. */
  localidad?: string;
}

export function MapPickerModal({ onConfirm, initialLat, initialLng, localidad }: MapPickerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const mapaRef = useRef<L.Map | null>(null);

  /* ── Buscador (Nominatim: sólo al apretar Enter o "Buscar", ver geoService) ── */
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Lugar[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [avisoBusqueda, setAvisoBusqueda] = useState('');

  const defaultCenter: [number, number] = [-31.41667, -64.18333];

  const resolveInitial = (): { lat: number; lng: number } | null => {
    const lat = parseFloat(initialLat || '');
    const lng = parseFloat(initialLng || '');
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    return null;
  };

  /** Encuadra un lugar: la localidad entera si se conocen sus límites, si no un acercamiento a calle. */
  const encuadrar = (lugar: Lugar) => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    try {
      if (lugar.limites) {
        const [s, o, n, e] = lugar.limites;
        mapa.fitBounds([[s, o], [n, e]], { maxZoom: 16, animate: false });
      } else {
        mapa.setView([lugar.lat, lugar.lng], 16, { animate: false });
      }
    } catch { /* mapa ya desmontado */ }
  };

  const handleOpen = () => {
    const init = resolveInitial();
    setSelected(init);
    setBusqueda('');
    setResultados(null);
    setAvisoBusqueda('');
    setMapKey(k => k + 1); // force MapContainer remount so it renders correctly in modal
    setIsOpen(true);

    // Sin punto todavía: el mapa arranca en la localidad elegida en el formulario
    // (una sola consulta, al abrir). Si falla, queda en Córdoba capital.
    const loc = localidad?.trim();
    if (!init && loc) {
      buscarLugares(loc).then(([primero]) => { if (primero) encuadrar(primero); }).catch(() => {});
    }
  };

  const buscar = async () => {
    const texto = busqueda.trim();
    if (!texto || buscando) return;

    // Coordenadas pegadas ("-31.42, -64.18"): van directo al marcador, sin consultar a nadie.
    const coords = leerCoordenadas(texto);
    if (coords) {
      setSelected(coords);
      setResultados(null);
      setAvisoBusqueda('');
      try { mapaRef.current?.setView([coords.lat, coords.lng], 16, { animate: false }); } catch { /* */ }
      return;
    }

    setBuscando(true);
    setAvisoBusqueda('');
    try {
      const b = mapaRef.current?.getBounds();
      const lista = await buscarLugares(texto, b ? [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] : undefined);
      setResultados(lista);
      if (!lista.length) setAvisoBusqueda('No se encontró ese lugar. Probá con otro nombre, una localidad o una dirección.');
    } catch {
      setResultados(null);
      setAvisoBusqueda('No se pudo buscar (¿sin conexión?). Podés marcar el punto directamente en el mapa.');
    } finally {
      setBuscando(false);
    }
  };

  /** Elegir un resultado: el marcador va ahí y el mapa lo encuadra; se puede ajustar con doble clic. */
  const elegirLugar = (lugar: Lugar) => {
    setSelected({ lat: lugar.lat, lng: lugar.lng });
    setResultados(null);
    setBusqueda(lugar.nombre);
    encuadrar(lugar);
  };

  const handleClose = () => setIsOpen(false);

  /** Doble clic en el mapa: ahí va el Punto 0. */
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelected({ lat, lng });
    setResultados(null);
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
        >
          {/* Un clic fuera del modal NO lo cierra (se perdería el punto marcado): sólo la X o Cancelar. */}
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

            {/* Buscador + instrucción */}
            <div
              className="flex flex-col gap-2 px-5 py-3 flex-shrink-0"
              style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)', position: 'relative', zIndex: 1100 }}
            >
              {/* Un div y no un <form>: el modal se dibuja dentro del formulario del operativo. */}
              <div className="flex gap-2">
                <div className="flex-1 min-w-0 flex items-center gap-2 px-3 rounded-[var(--radius-input)]"
                  style={{ background: 'var(--input-background)', border: '1px solid var(--border)' }}>
                  <Search size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                  <input
                    type="search"
                    value={busqueda}
                    onChange={e => { setBusqueda(e.target.value); if (avisoBusqueda) setAvisoBusqueda(''); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); buscar(); }
                      if (e.key === 'Escape' && resultados) { e.stopPropagation(); setResultados(null); }
                    }}
                    placeholder="Buscar localidad, dirección o lugar… o pegar coordenadas"
                    aria-label="Buscar un lugar en el mapa"
                    autoFocus
                    className="flex-1 min-w-0 py-2 bg-transparent outline-none"
                    style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', color: 'var(--foreground)', border: 'none' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={buscar}
                  disabled={!busqueda.trim() || buscando}
                  className="flex items-center gap-1.5 px-3 rounded-[var(--radius-button)] flex-shrink-0"
                  style={{
                    fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)',
                    background: busqueda.trim() ? 'var(--primary)' : 'var(--card)',
                    color: busqueda.trim() ? '#fff' : 'var(--muted-foreground)',
                    border: busqueda.trim() ? 'none' : '1px solid var(--border)',
                    cursor: busqueda.trim() && !buscando ? 'pointer' : 'not-allowed',
                  }}
                >
                  {buscando ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                  Buscar
                </button>
              </div>

              {/* Resultados, sobre el mapa */}
              {resultados && resultados.length > 0 && (
                <ul
                  className="absolute left-5 right-5 rounded-[var(--radius-input)] overflow-y-auto"
                  style={{ top: 'calc(100% - 6px)', maxHeight: 260, background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.18)', listStyle: 'none', margin: 0, padding: 4 }}
                >
                  {resultados.map((r, i) => (
                    <li key={`${r.lat},${r.lng},${i}`}>
                      <button
                        type="button"
                        onClick={() => elegirLugar(r)}
                        className="w-full flex items-start gap-2 px-3 py-2 rounded-[var(--radius-button)] text-left"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <MapPin size={13} style={{ color: 'var(--primary)', marginTop: 3, flexShrink: 0 }} />
                        <span className="min-w-0">
                          <span className="block truncate" style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
                            {r.nombre}
                          </span>
                          {r.detalle && (
                            <span className="block truncate" style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                              {r.detalle}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center gap-2">
                <Navigation size={12} style={{ color: avisoBusqueda ? '#b45309' : 'var(--primary)', flexShrink: 0 }} />
                <p style={{
                  fontFamily: 'var(--font-family-primary)',
                  fontSize: 'var(--text-label)',
                  color: avisoBusqueda ? '#b45309' : 'var(--muted-foreground)',
                }}>
                  {avisoBusqueda || 'Buscá el lugar o hacé doble clic en el mapa para marcar el punto de última ubicación conocida (LSP / Punto 0). Arrastrá para moverte; acercá con + / − o la rueda del mouse.'}
                </p>
              </div>
            </div>

            {/* Map */}
            <div className="flex-1 min-h-0" style={{ position: 'relative' }}>
              <MapContainer
                ref={mapaRef}
                key={mapKey}
                center={centerCoords}
                zoom={13}
                maxZoom={19}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
                doubleClickZoom={false}
                scrollWheelZoom={true}
                dragging={true}
              >
                {/* Satelital (Esri World Imagery) + nombres de lugares y rutas encima, para
                    ubicarse en el terreno sin perder la referencia de localidades y caminos.
                    En zonas rurales la foto llega hasta el nivel 18; más cerca se amplía la última. */}
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Imágenes &copy; Esri, Maxar, Earthstar Geographics"
                  maxNativeZoom={18}
                  maxZoom={19}
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                  maxNativeZoom={18}
                  maxZoom={19}
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  attribution="Referencias &copy; Esri"
                  maxNativeZoom={18}
                  maxZoom={19}
                />
                <ClickHandler onDobleClic={handleMapClick} onClic={() => setResultados(null)} />
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
                      Doble clic para marcar el Punto 0
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer
                En mobile no entran la caja de coordenadas + los dos botones en
                una sola fila (el minWidth:200 de la caja los empujaba fuera
                de la pantalla) — se apilan debajo de ~480px. */}
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 flex-shrink-0"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              {/* Coordinates display */}
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-input)] sm:min-w-[200px]"
                style={{
                  background: selected ? 'rgba(229,75,75,0.07)' : 'var(--muted)',
                  border: selected ? '1px solid rgba(229,75,75,0.3)' : '1px solid var(--border)',
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
              <div className="flex gap-2 justify-end">
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