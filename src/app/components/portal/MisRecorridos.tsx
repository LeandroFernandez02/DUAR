/**
 * Portal del Agente — Mis recorridos (Módulo 5 · CU-31, flujo principal).
 *
 * El agente sube el .gpx de lo que caminó (lo exporta del reloj, Wikiloc, el
 * GPS…). Antes de guardarlo ve lo que el sistema leyó del archivo: puntos,
 * distancia, horas, desnivel y en qué polígono cae. Al confirmar, el recorrido
 * queda a su nombre, el original se guarda tal cual y la cobertura del
 * polígono se recalcula sola. Lo que se corrige después (polígono, notas) lo
 * hace el coordinador desde el mapa (CU-32).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Route, Upload, Loader2, MapPin, Check, X, AlertCircle } from 'lucide-react';
import {
  portalApi, ApiError, GPX_MAX_BYTES, type AnalisisGpxApi, type TrackApi,
} from '../../services/api';
import {
  Overlay, IconBox, Titulo, Texto, BotonSecundario, BotonPrimario, ErrorCaja, Etiqueta, estiloCampo,
} from '../shared/grupos/piezas';
import { fechaHoraArgentina } from '../../utils/fechaArgentina';
import { horaCorta } from '../../utils/tiempo';
import { tarjetaBase } from '../shared/Listados';

const NOTAS_MAX = 2000;

const tarjeta = tarjetaBase;
const rotulo = {
  color: 'var(--muted-foreground)', fontSize: 'calc(10px * var(--escala-texto))',
  fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase' as const, letterSpacing: '0.05em',
};

const km = (m: number) => `${(m / 1000).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;

function duracion(s: number | null): string {
  if (s === null) return 'sin horas';
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

/** "12/10/2026, 11:00 a 11:25" (o "sin horas en el archivo"). */
function franja(inicio: string | null, fin: string | null): string {
  if (!inicio) return 'Sin horas en el archivo';
  return fin ? `${fechaHoraArgentina(inicio)} a ${horaCorta(fin)}` : fechaHoraArgentina(inicio);
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="px-3 py-2 rounded-[var(--radius-input)]" style={{ background: 'var(--muted)' }}>
      <p style={{ ...rotulo, fontSize: 'calc(9.5px * var(--escala-texto))' }}>{etiqueta}</p>
      <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}>{valor}</p>
    </div>
  );
}

export default function MisRecorridos() {
  const [tracks, setTracks] = useState<TrackApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analisis, setAnalisis] = useState<AnalisisGpxApi | null>(null);
  const [notas, setNotas] = useState('');
  const [trabajando, setTrabajando] = useState<'analizando' | 'guardando' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    try {
      setTracks((await portalApi.misTracks()).tracks);
    } catch { /* sin señal: queda la última lista */ }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const mensaje = (err: unknown) =>
    err instanceof ApiError && err.status < 500 ? err.message : 'No se pudo enviar el archivo: revisá la conexión e intentá de nuevo.';

  const limpiar = () => { setArchivo(null); setAnalisis(null); setNotas(''); setErrorModal(null); };
  const cerrar = () => { if (!trabajando) limpiar(); };

  /** CU-31 pasos 2 a 5: se valida el archivo y se muestra el resumen. */
  const elegir = async (f: File | undefined) => {
    if (input.current) input.current.value = '';   // permite volver a elegir el mismo archivo
    if (!f) return;
    setError(null); setAviso(null);
    if (!/\.gpx$/i.test(f.name)) return setError('El archivo tiene que ser .gpx (exportalo así desde tu reloj o aplicación).');
    if (f.size > GPX_MAX_BYTES) return setError('El archivo GPX puede pesar hasta 4 MB.');
    setTrabajando('analizando');
    try {
      const r = await portalApi.analizarMiTrack(f);
      setArchivo(f);
      setAnalisis(r.analisis);
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setTrabajando(null);
    }
  };

  /** CU-31 paso 6: se guarda. */
  const confirmar = async () => {
    if (!archivo) return;
    setErrorModal(null);
    setTrabajando('guardando');
    try {
      const { track } = await portalApi.cargarMiTrack(archivo, notas.trim() || undefined);
      setAviso(track.poligonoNombre
        ? `Recorrido cargado en el polígono ${track.poligonoNombre}. Ya suma a su cobertura.`
        : 'Recorrido cargado fuera de polígono: el coordinador lo puede asignar desde el mapa.');
      limpiar();
      await cargar();
    } catch (err) {
      setErrorModal(mensaje(err));
    } finally {
      setTrabajando(null);
    }
  };

  return (
    <section className="rounded-[var(--radius-card)] p-4 flex flex-col gap-3" style={tarjeta} aria-labelledby="mis-recorridos-titulo">
      <div className="flex items-center justify-between gap-3">
        <p id="mis-recorridos-titulo" style={rotulo}>Mis recorridos GPX</p>
        {tracks.length > 0 && (
          <span style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
            {tracks.length} · {km(tracks.reduce((s, t) => s + t.distanciaM, 0))}
          </span>
        )}
      </div>

      {error && <ErrorCaja>{error}</ErrorCaja>}
      {aviso && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-[var(--radius-input)]" aria-live="polite"
          style={{ background: 'color-mix(in srgb, #16a34a calc(10% + var(--tinte-oscuro, 0%) * 0.1), transparent)', border: '1px solid color-mix(in srgb, #16a34a 30%, transparent)', color: 'color-mix(in srgb, #86efac var(--tinte-oscuro, 0%), #15803d)', fontSize: 'calc(11.5px * var(--escala-texto))', lineHeight: 1.45 }}>
          <Check size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span className="flex-1">{aviso}</span>
          <button type="button" aria-label="Cerrar" onClick={() => setAviso(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', padding: 0 }}>
            <X size={12} />
          </button>
        </div>
      )}

      {cargando ? (
        <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} /></div>
      ) : tracks.length === 0 ? (
        <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
          Al volver de rastrillar, cargá acá el archivo .gpx de tu recorrido: así queda registrado por dónde pasaste.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {tracks.map(t => (
            <li key={t.id} className="flex items-start gap-2 px-2.5 py-2 rounded-[var(--radius-input)]" style={{ background: 'var(--muted)' }}>
              <Route size={14} style={{ color: t.color ?? 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 'var(--text-label)', color: 'var(--foreground)', fontWeight: 'var(--font-weight-medium)' }}>
                  {t.poligonoNombre ?? 'Fuera de polígono'} · {km(t.distanciaM)}
                </p>
                <p style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                  {franja(t.inicio, t.fin)}
                  {t.cargadoPor !== t.agente && ` · cargado por ${t.cargadoPor}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input ref={input} type="file" accept=".gpx,application/gpx+xml" className="hidden"
        onChange={e => elegir(e.target.files?.[0])} aria-label="Archivo GPX del recorrido" />
      <button type="button" onClick={() => input.current?.click()} disabled={!!trabajando}
        className="flex items-center justify-center gap-2 px-4 py-3 rounded-[var(--radius-input)]"
        style={{
          border: '1.5px dashed var(--border)', background: 'var(--card)', color: 'var(--foreground)',
          fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', cursor: trabajando ? 'default' : 'pointer',
        }}>
        {trabajando === 'analizando'
          ? <><Loader2 size={15} className="animate-spin" /> Leyendo el archivo…</>
          : <><Upload size={15} /> Cargar recorrido GPX</>}
      </button>

      {/* ── CU-31 paso 5: resumen y confirmación ── */}
      {analisis && archivo && (
        <Overlay onClose={cerrar}>
          <div className="px-5 pt-5 flex items-start gap-3">
            <IconBox bg="color-mix(in srgb, var(--primary) 10%, transparent)"><Route size={17} style={{ color: 'var(--primary)' }} /></IconBox>
            <div className="min-w-0">
              <Titulo>¿Cargar este recorrido?</Titulo>
              <Texto><span style={{ wordBreak: 'break-all' }}>{archivo.name}</span></Texto>
            </div>
          </div>

          <div className="px-5 pt-4 flex flex-col gap-3">
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-input)]"
              style={analisis.poligono
                ? { background: 'color-mix(in srgb, #16a34a calc(10% + var(--tinte-oscuro, 0%) * 0.1), transparent)', border: '1px solid color-mix(in srgb, #16a34a 30%, transparent)', color: 'color-mix(in srgb, #86efac var(--tinte-oscuro, 0%), #15803d)' }
                : { background: 'color-mix(in srgb, #d97706 calc(10% + var(--tinte-oscuro, 0%) * 0.08), transparent)', border: '1px solid color-mix(in srgb, #d97706 32%, transparent)', color: 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #92400e)' }}>
              {analisis.poligono ? <MapPin size={14} style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />}
              <span style={{ fontSize: 'var(--text-label)', lineHeight: 1.45 }}>
                {analisis.poligono
                  ? <>Polígono <b>{analisis.poligono.nombre}</b> ({Math.round(analisis.deteccionPct)} % de los puntos adentro).</>
                  : <>No cae en ningún polígono ({Math.round(analisis.deteccionPct)} % de los puntos en el más cercano; hace falta 30 %). Se carga igual, como «Fuera de polígono», y el coordinador lo puede asignar.</>}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Dato etiqueta="Distancia" valor={km(analisis.distanciaM)} />
              <Dato etiqueta="Duración" valor={duracion(analisis.duracionS)} />
              <Dato etiqueta="Puntos" valor={analisis.puntos.toLocaleString('es-AR')} />
              <Dato etiqueta="Desnivel"
                valor={analisis.conElevacion ? `+${analisis.desnivelPositivoM} m / −${analisis.desnivelNegativoM} m` : 'sin elevación'} />
            </div>
            <p style={{ fontSize: 'calc(11.5px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{franja(analisis.inicio, analisis.fin)}</p>

            <div>
              <Etiqueta htmlFor="notas-recorrido">Notas (opcional)</Etiqueta>
              <textarea id="notas-recorrido" rows={2} maxLength={NOTAS_MAX} value={notas}
                onChange={e => setNotas(e.target.value)} disabled={!!trabajando}
                placeholder="Ej.: el GPS perdió señal en la quebrada"
                className="w-full px-3 py-2" style={{ ...estiloCampo, resize: 'vertical' }} />
            </div>
            <p style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
              El recorrido, las horas y la elevación se guardan como vienen en el archivo y no se editan.
            </p>
            {errorModal && <ErrorCaja>{errorModal}</ErrorCaja>}
          </div>

          <div className="flex gap-3 px-5 py-5">
            <BotonSecundario onClick={cerrar} disabled={!!trabajando}>Cancelar</BotonSecundario>
            <BotonPrimario onClick={confirmar} habilitado={!trabajando}>
              {trabajando === 'guardando' ? 'Cargando…' : 'Confirmar'}
            </BotonPrimario>
          </div>
        </Overlay>
      )}
    </section>
  );
}
