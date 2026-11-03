/**
 * Portal del Agente — el Líder de Grupo marca un punto de interés o un hallazgo en su sector
 * (pedido del cliente del 03/11). Sólo lo ve el Líder: la API también lo exige.
 *
 *  · Ubicación: la del GPS del celular, con su precisión; se puede corregir tocando el mapa o
 *    arrastrando el marcador (entonces ya no es del GPS y no lleva precisión).
 *  · Fuera del polígono del grupo: avisa a cuántos metros del borde quedó y deja guardarlo igual;
 *    el coordinador lo ve con la etiqueta «Fuera del polígono».
 *  · Fotos: con la cámara o de la galería, hasta 8; se achican antes de guardarse.
 *  · Sin señal: se guarda en el celular con la hora en que se marcó y se manda solo al volver la
 *    señal (utils/colaPortal.ts).
 *
 * `SumarFotos`: más fotos a un punto que ya cargó el Líder (también pasan por la cola).
 */
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Camera, ImagePlus, Crosshair, MapPin, Search, Loader2, X, AlertTriangle, LocateFixed } from 'lucide-react';
import type { MarcadorApi, MiSectorApi } from '../../services/api';
import {
  Overlay, IconBox, Titulo, Texto, BotonSecundario, BotonPrimario, ErrorCaja, Etiqueta, estiloCampo,
} from '../shared/grupos/piezas';
import { achicarFoto, encolar, nuevoId, type FotoPendiente } from '../../utils/colaPortal';

export const FOTOS_MAX = 8;
const LARGOS = { nombre: 120, descripcion: 300, detalle: 4000 };
type Clase = 'POI' | 'HALLAZGO';
export const CLASE_INFO: Record<Clase, { label: string; color: string; icono: typeof Search }> = {
  POI:      { label: 'Punto de interés', color: '#d97706', icono: Search },
  HALLAZGO: { label: 'Hallazgo',         color: '#dc2626', icono: MapPin },
};

type Punto = { lat: number; lng: number };

/** Vértices [lng, lat] del anillo exterior. */
const anillo = (s: MiSectorApi) => (s.geometria.coordinates[0] ?? []) as [number, number][];

/** ¿El punto cae dentro del polígono? (ray casting; alcanza a la escala de un sector). */
export function dentroDe(s: MiSectorApi, p: Punto): boolean {
  const v = anillo(s);
  let dentro = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    const [xi, yi] = v[i];
    const [xj, yj] = v[j];
    if ((yi > p.lat) !== (yj > p.lat) && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

/** Metros aproximados hasta el borde (proyección local; la cifra que queda la calcula la base). */
export function metrosAlBorde(s: MiSectorApi, p: Punto): number {
  const kx = 111320 * Math.cos((p.lat * Math.PI) / 180);
  const ky = 110540;
  const v = anillo(s).map(([lng, lat]) => [(lng - p.lng) * kx, (lat - p.lat) * ky]);
  let min = Infinity;
  for (let i = 0; i < v.length - 1; i++) {
    const [ax, ay] = v[i];
    const [bx, by] = v[i + 1];
    const dx = bx - ax, dy = by - ay;
    const t = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0;
    min = Math.min(min, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return Math.round(min);
}

const fmtM = (m: number) => (m >= 1000 ? `${(m / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km` : `${m} m`);

/* ── Fotos elegidas (con miniatura) ─────────────────────────────────────── */

interface FotoElegida extends FotoPendiente { vista: string }

function useFotos() {
  const [fotos, setFotos] = useState<FotoElegida[]>([]);
  const [procesando, setProcesando] = useState(false);
  useEffect(() => () => fotos.forEach(f => URL.revokeObjectURL(f.vista)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const sumar = async (lista: FileList | null, lugar: number) => {
    if (!lista?.length) return;
    setProcesando(true);
    try {
      const nuevas: FotoElegida[] = [];
      for (const archivo of Array.from(lista).slice(0, lugar)) {
        if (!archivo.type.startsWith('image/')) continue;
        const { blob, nombre } = await achicarFoto(archivo);
        nuevas.push({ clienteId: nuevoId(), blob, nombre, vista: URL.createObjectURL(blob) });
      }
      setFotos(f => [...f, ...nuevas]);
    } finally { setProcesando(false); }
  };
  const quitar = (id: string) => setFotos(f => {
    const q = f.find(x => x.clienteId === id);
    if (q) URL.revokeObjectURL(q.vista);
    return f.filter(x => x.clienteId !== id);
  });
  return { fotos, sumar, quitar, procesando };
}

function SelectorFotos({ fotos, lugar, procesando, onSumar, onQuitar, disabled }: {
  fotos: FotoElegida[]; lugar: number; procesando: boolean; disabled?: boolean;
  onSumar: (l: FileList | null) => void; onQuitar: (id: string) => void;
}) {
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const boton = (icono: typeof Camera, texto: string, ref: React.RefObject<HTMLInputElement | null>) => {
    const I = icono;
    return (
      <button type="button" onClick={() => ref.current?.click()} disabled={disabled || procesando || lugar < 1}
        className="flex-1 flex items-center justify-center gap-2"
        style={{ minHeight: 44, borderRadius: 'var(--radius-input)', border: '1.5px dashed var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: 600, cursor: lugar < 1 ? 'default' : 'pointer', opacity: lugar < 1 ? 0.5 : 1 }}>
        <I size={15} />{texto}
      </button>
    );
  };
  const elegir = (e: React.ChangeEvent<HTMLInputElement>) => { onSumar(e.target.files); e.target.value = ''; };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {boton(Camera, 'Sacar foto', camara)}
        {boton(ImagePlus, 'De la galería', galeria)}
      </div>
      <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={elegir} aria-label="Sacar foto con la cámara" />
      <input ref={galeria} type="file" accept="image/*" multiple className="hidden" onChange={elegir} aria-label="Elegir fotos de la galería" />
      {procesando && <p className="flex items-center gap-2" style={{ fontSize: 'calc(11.5px * var(--escala-texto))', color: 'var(--muted-foreground)' }}><Loader2 size={12} className="animate-spin" />Preparando la foto…</p>}
      {fotos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {fotos.map(f => (
            <div key={f.clienteId} className="relative" style={{ aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--muted)' }}>
              <img src={f.vista} alt="Foto elegida" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button type="button" aria-label="Quitar foto" onClick={() => onQuitar(f.clienteId)} disabled={disabled}
                style={{ position: 'absolute', top: 3, right: 3, width: 24, height: 24, borderRadius: 12, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Mapa para ubicar el punto ──────────────────────────────────────────── */

function MapaUbicar({ sector, punto, onMover }: { sector: MiSectorApi; punto: Punto | null; onMover: (p: Punto) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const marca = useRef<L.Marker | null>(null);
  const mover = useRef(onMover);
  mover.current = onMover;

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Imágenes &copy; Esri', maxZoom: 19 }).addTo(m);
    const forma = L.polygon(anillo(sector).map(([lng, lat]) => [lat, lng] as [number, number]),
      { color: '#00c2b3', weight: 2.5, fillOpacity: 0.15 }).addTo(m);
    m.fitBounds(forma.getBounds(), { padding: [16, 16] });
    m.on('click', (e: L.LeafletMouseEvent) => mover.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    mapa.current = m;
    return () => { m.remove(); mapa.current = null; marca.current = null; };
  }, [sector]);

  useEffect(() => {
    const m = mapa.current;
    if (!m || !punto) return;
    if (!marca.current) {
      marca.current = L.marker([punto.lat, punto.lng], {
        draggable: true,
        icon: L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13],
          html: '<div style="width:26px;height:26px;border-radius:13px;background:#dc2626;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>' }),
      }).addTo(m);
      marca.current.on('dragend', () => { const p = marca.current!.getLatLng(); mover.current({ lat: p.lat, lng: p.lng }); });
    } else {
      marca.current.setLatLng([punto.lat, punto.lng]);
    }
  }, [punto]);

  return <div ref={el} style={{ height: 220, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', isolation: 'isolate' }} aria-label="Mapa para ubicar el punto: tocá para moverlo" />;
}

/* ── Marcar un punto nuevo ──────────────────────────────────────────────── */

type Gps = { estado: 'buscando' } | { estado: 'ok'; precisionM: number } | { estado: 'error'; mensaje: string } | { estado: 'manual' };

export default function MarcarPunto({ sector, onClose, onGuardado }: {
  sector: MiSectorApi; onClose: () => void; onGuardado: (mensaje: string) => void;
}) {
  const [clase, setClase] = useState<Clase>('POI');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [detalle, setDetalle] = useState('');
  const [punto, setPunto] = useState<Punto | null>(null);
  const [gps, setGps] = useState<Gps>({ estado: 'buscando' });
  const [confirmarFuera, setConfirmarFuera] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const { fotos, sumar, quitar, procesando } = useFotos();

  const ubicar = () => {
    if (!('geolocation' in navigator)) { setGps({ estado: 'error', mensaje: 'Este celular no da la ubicación: tocá el mapa para marcar el punto.' }); return; }
    setGps({ estado: 'buscando' });
    navigator.geolocation.getCurrentPosition(
      pos => { setPunto({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGps({ estado: 'ok', precisionM: Math.round(pos.coords.accuracy) }); },
      err => setGps({ estado: 'error', mensaje: err.code === err.PERMISSION_DENIED
        ? 'No hay permiso para usar la ubicación: habilitalo en el navegador o tocá el mapa para marcar el punto.'
        : 'No se pudo obtener la ubicación del GPS: tocá el mapa para marcar el punto o intentá de nuevo.' }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };
  useEffect(ubicar, []); // eslint-disable-line react-hooks/exhaustive-deps

  const moverAMano = (p: Punto) => { setPunto(p); setGps({ estado: 'manual' }); };

  const guardar = async (aunqueFuera = false) => {
    setError(null);
    if (!nombre.trim()) return setError('Ingresá un nombre.');
    if (!punto) return setError('Falta la ubicación: esperá el GPS o tocá el mapa.');
    if (!aunqueFuera && !dentroDe(sector, punto)) return setConfirmarFuera(metrosAlBorde(sector, punto));
    setConfirmarFuera(null);
    setGuardando(true);
    try {
      const id = nuevoId();
      await encolar({
        id, tipo: 'marcador', nombre: nombre.trim(), clase, guardadoEn: new Date().toISOString(),
        datos: {
          clienteId: id, poligonoId: sector.id, clase, nombre: nombre.trim(),
          descripcion: descripcion.trim() || null, detalle: detalle.trim() || null,
          lat: punto.lat, lng: punto.lng, precisionM: gps.estado === 'ok' ? gps.precisionM : null,
          ocurridoEn: new Date().toISOString(),
        },
        fotos: fotos.map(({ clienteId, blob, nombre: n }) => ({ clienteId, blob, nombre: n })),
      });
      onGuardado(navigator.onLine
        ? `${CLASE_INFO[clase].label} «${nombre.trim()}» guardado. Se está enviando al coordinador.`
        : `${CLASE_INFO[clase].label} «${nombre.trim()}» guardado en el celular. Se envía solo cuando vuelva la señal.`);
    } catch {
      setError('No se pudo guardar en el celular. Intentá de nuevo.');
      setGuardando(false);
    }
  };

  const ocupado = guardando || procesando;
  const C = CLASE_INFO[clase];

  if (confirmarFuera !== null) {
    return (
      <Overlay onClose={() => setConfirmarFuera(null)}>
        <div className="px-5 pt-5 flex items-start gap-3">
          <IconBox bg="color-mix(in srgb, #d97706 14%, transparent)"><AlertTriangle size={17} style={{ color: '#d97706' }} /></IconBox>
          <div className="min-w-0">
            <Titulo>El punto queda fuera de tu sector</Titulo>
            <Texto>Está a unos {fmtM(confirmarFuera)} del borde de {sector.nombre}. Si lo guardás igual, el coordinador lo va a ver marcado «Fuera del polígono».</Texto>
          </div>
        </div>
        <div className="flex gap-3 px-5 py-5">
          <BotonSecundario onClick={() => setConfirmarFuera(null)}>Corregir ubicación</BotonSecundario>
          <BotonPrimario onClick={() => guardar(true)} habilitado={!guardando}>Guardar igual</BotonPrimario>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={() => { if (!ocupado) onClose(); }} ancho={520}>
      <div className="px-5 pt-5 flex items-start gap-3">
        <IconBox bg={`color-mix(in srgb, ${C.color} 12%, transparent)`}><C.icono size={17} style={{ color: C.color }} /></IconBox>
        <div className="min-w-0">
          <Titulo>Marcar en mi sector</Titulo>
          <Texto>{sector.nombre} · lo ve el coordinador en el mapa del operativo.</Texto>
        </div>
      </div>

      <div className="px-5 pt-4 flex flex-col gap-4 overflow-y-auto">
        <div>
          <Etiqueta>¿Qué marcás?</Etiqueta>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de marcador">
            {(['POI', 'HALLAZGO'] as Clase[]).map(k => {
              const I = CLASE_INFO[k];
              const activo = clase === k;
              return (
                <button key={k} type="button" role="radio" aria-checked={activo} onClick={() => setClase(k)} disabled={ocupado}
                  className="flex items-center justify-center gap-2"
                  style={{ minHeight: 44, borderRadius: 'var(--radius-input)', cursor: 'pointer', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: 600,
                    border: `1.5px solid ${activo ? I.color : 'var(--border)'}`, color: activo ? I.color : 'var(--foreground)',
                    background: activo ? `color-mix(in srgb, ${I.color} 10%, transparent)` : 'var(--card)' }}>
                  <I.icono size={15} />{I.label}
                </button>
              );
            })}
          </div>
          {clase === 'HALLAZGO' && (
            <p style={{ margin: '6px 0 0', fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
              Un hallazgo es evidencia: una vez cargado no se elimina ni se le quitan las fotos.
            </p>
          )}
        </div>

        <div>
          <Etiqueta htmlFor="marcar-nombre">Nombre</Etiqueta>
          <input id="marcar-nombre" value={nombre} onChange={e => setNombre(e.target.value)} maxLength={LARGOS.nombre} disabled={ocupado}
            placeholder={clase === 'HALLAZGO' ? 'Ej.: Zapatilla deportiva' : 'Ej.: Huellas en el barro'} className="w-full px-3 py-2" style={{ ...estiloCampo, minHeight: 44 }} />
        </div>
        <div>
          <Etiqueta htmlFor="marcar-desc">Descripción (opcional)</Etiqueta>
          <input id="marcar-desc" value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={LARGOS.descripcion} disabled={ocupado}
            placeholder="Una línea: qué es" className="w-full px-3 py-2" style={{ ...estiloCampo, minHeight: 44 }} />
        </div>
        <div>
          <Etiqueta htmlFor="marcar-detalle">Detalle (opcional)</Etiqueta>
          <textarea id="marcar-detalle" rows={3} value={detalle} onChange={e => setDetalle(e.target.value)} maxLength={LARGOS.detalle} disabled={ocupado}
            placeholder="Condiciones del lugar, evidencias, observaciones…" className="w-full px-3 py-2" style={{ ...estiloCampo, resize: 'vertical' }} />
        </div>

        <div className="flex flex-col gap-2">
          <Etiqueta>Ubicación</Etiqueta>
          <div className="flex items-center justify-between gap-2 flex-wrap" style={{ fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
            <span className="flex items-center gap-1.5">
              {gps.estado === 'buscando' && <><Loader2 size={13} className="animate-spin" />Buscando la señal del GPS…</>}
              {gps.estado === 'ok' && <><Crosshair size={13} style={{ color: 'var(--primary)' }} />GPS del celular · ± {fmtM(gps.precisionM)}</>}
              {gps.estado === 'manual' && <><MapPin size={13} />Ubicado a mano en el mapa</>}
              {gps.estado === 'error' && <><AlertTriangle size={13} style={{ color: '#d97706' }} />Sin GPS</>}
            </span>
            {gps.estado !== 'buscando' && (
              <button type="button" onClick={ubicar} disabled={ocupado} className="flex items-center gap-1"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', fontFamily: 'var(--font-family-primary)', fontSize: 'calc(12px * var(--escala-texto))', fontWeight: 600 }}>
                <LocateFixed size={13} />Usar mi ubicación
              </button>
            )}
          </div>
          {gps.estado === 'error' && <ErrorCaja>{gps.mensaje}</ErrorCaja>}
          <MapaUbicar sector={sector} punto={punto} onMover={moverAMano} />
          <p style={{ margin: 0, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
            {punto ? `${punto.lat.toFixed(6)}°, ${punto.lng.toFixed(6)}° · ` : ''}Para corregirlo, tocá el mapa o arrastrá el marcador.
          </p>
        </div>

        <div>
          <Etiqueta>Fotos (opcional, hasta {FOTOS_MAX})</Etiqueta>
          <SelectorFotos fotos={fotos} lugar={FOTOS_MAX - fotos.length} procesando={procesando} disabled={guardando}
            onSumar={l => sumar(l, FOTOS_MAX - fotos.length)} onQuitar={quitar} />
        </div>

        <p style={{ margin: 0, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
          Se guarda con la fecha y hora de ahora. Si no hay señal, queda en el celular y se envía solo cuando vuelva.
        </p>
        {error && <ErrorCaja>{error}</ErrorCaja>}
      </div>

      <div className="flex gap-3 px-5 py-5">
        <BotonSecundario onClick={onClose} disabled={ocupado}>Cancelar</BotonSecundario>
        <BotonPrimario onClick={() => guardar()} habilitado={!ocupado && !!nombre.trim() && !!punto}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </BotonPrimario>
      </div>
    </Overlay>
  );
}

/* ── Sumar fotos a un punto ya cargado ──────────────────────────────────── */

export function SumarFotos({ marcador, onClose, onGuardado }: { marcador: MarcadorApi; onClose: () => void; onGuardado: (m: string) => void }) {
  const lugar = FOTOS_MAX - marcador.fotos.length;
  const { fotos, sumar, quitar, procesando } = useFotos();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await encolar({
        id: nuevoId(), tipo: 'fotos', marcadorId: marcador.id, nombre: marcador.nombre,
        clase: marcador.clase === 'HALLAZGO' ? 'HALLAZGO' : 'POI', guardadoEn: new Date().toISOString(),
        fotos: fotos.map(({ clienteId, blob, nombre }) => ({ clienteId, blob, nombre })),
      });
      onGuardado(`${fotos.length === 1 ? 'Foto guardada' : `${fotos.length} fotos guardadas`} para «${marcador.nombre}». ${navigator.onLine ? 'Se están enviando.' : 'Se envían cuando vuelva la señal.'}`);
    } catch {
      setError('No se pudo guardar en el celular. Intentá de nuevo.');
      setGuardando(false);
    }
  };

  return (
    <Overlay onClose={() => { if (!guardando && !procesando) onClose(); }}>
      <div className="px-5 pt-5 flex items-start gap-3">
        <IconBox bg="color-mix(in srgb, var(--primary) 10%, transparent)"><Camera size={17} style={{ color: 'var(--primary)' }} /></IconBox>
        <div className="min-w-0">
          <Titulo>Sumar fotos</Titulo>
          <Texto>«{marcador.nombre}» · {lugar > 0 ? `podés sumar ${lugar} más` : 'ya tiene el máximo de fotos'}.</Texto>
        </div>
      </div>
      <div className="px-5 pt-4 flex flex-col gap-3">
        <SelectorFotos fotos={fotos} lugar={lugar - fotos.length} procesando={procesando} disabled={guardando}
          onSumar={l => sumar(l, lugar - fotos.length)} onQuitar={quitar} />
        {error && <ErrorCaja>{error}</ErrorCaja>}
      </div>
      <div className="flex gap-3 px-5 py-5">
        <BotonSecundario onClick={onClose} disabled={guardando || procesando}>Cancelar</BotonSecundario>
        <BotonPrimario onClick={guardar} habilitado={!guardando && !procesando && fotos.length > 0}>{guardando ? 'Guardando…' : 'Guardar'}</BotonPrimario>
      </div>
    </Overlay>
  );
}
