/**
 * Modales del mapa: nuevo polígono (CU-27), cargar GPX en nombre de un agente
 * (CU-29), nuevo marcador (CU-32), nueva instalación (CU-32), actualizar el
 * Punto Cero (CU-34), eliminar (CU-36) y quitar un grupo que está en el
 * terreno (CU-28).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pentagon, Route, Check, Upload, TriangleAlert, FileUp, FileCheck, X, Trash2, Crosshair, Flag, MapPinPlus, Footprints, Loader2 } from 'lucide-react';
import {
  ApiError, GPX_MAX_BYTES, TIPOS_INSTALACION, tracksApi,
  type AnalisisGpxApi, type GrupoApi, type PersonalOperativoApi, type TipoInstalacionApi, type TrackApi,
} from '../../../services/api';
import { Boton, Campo, ErrorTexto, Modal, Selector, SIMBOLOS, rotulo } from './piezas';
import { GrillaTiposSci } from './Paneles';
import { area, distancia, fmtArea, fmtCoord, fmtDist, fmtKm, type LatLng } from './geo';
import { colorDeGrupo, duracion, fechaCorta } from './modelo';

const mensaje = (err: unknown, porDefecto: string) => (err instanceof ApiError ? err.message : porDefecto);

function useEnvio() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enviar = async (f: () => Promise<unknown>, porDefecto = 'No se pudo guardar.') => {
    setEnviando(true); setError(null);
    try { await f(); } catch (err) { setError(mensaje(err, porDefecto)); } finally { setEnviando(false); }
  };
  return { enviando, error, setError, enviar };
}

/* ── CU-27 ── */
export function ModalNuevoPoligono({ vertices, grupos, n, onCancel, onGuardar }: {
  vertices: LatLng[]; grupos: GrupoApi[]; n: number; onCancel: () => void;
  onGuardar: (d: { nombre: string; grupoId: string | null; notas: string | null }) => Promise<unknown>;
}) {
  const [nombre, setNombre] = useState(`Polígono ${n}`);
  const [grupoId, setGrupoId] = useState('');
  const [notas, setNotas] = useState('');
  const e = useEnvio();
  const libres = grupos.filter(g => g.estado === 'CONFIRMADO' && !g.poligonoId);
  const corto = nombre.trim().length < 3;
  return (
    <Modal titulo="Nuevo polígono" subtitulo={`${vertices.length} vértices · ${fmtArea(area(vertices))}`} icono={Pentagon} onClose={onCancel}
      pie={<><Boton variante="outline" tam="md" onClick={onCancel}>Cancelar</Boton><Boton tam="md" icono={Check} disabled={corto || e.enviando} onClick={() => e.enviar(() => onGuardar({ nombre: nombre.trim(), grupoId: grupoId || null, notas: notas.trim() || null }))}>{e.enviando ? 'Guardando…' : 'Guardar polígono'}</Boton></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Campo etiqueta="Nombre" requerido valor={nombre} onChange={v => { setNombre(v); e.setError(null); }} maxLength={120} error={corto} autoFocus />
        {corto && <ErrorTexto>Ingresá un nombre para el polígono (3 a 120 caracteres).</ErrorTexto>}
        <Selector etiqueta="Asignar a un grupo" valor={grupoId} onChange={setGrupoId}
          opciones={[{ value: '', label: '— Asignar más tarde —' }, ...libres.map(g => ({ value: g.id, label: `${g.nombre} · ${g.integrantes.length} integrantes${g.clase === 'ESPECIAL' ? ' · especial' : ''}` }))]} />
        <Campo etiqueta="Notas" multilinea filas={3} valor={notas} onChange={setNotas} maxLength={2000} placeholder="Tipo de terreno, accesos, riesgos…" />
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>
          {grupoId ? 'El grupo pasa a Asignado.' : libres.length ? 'Podés asignarle un grupo confirmado ahora o después.' : 'No hay grupos confirmados libres: podés asignarlo después.'}
        </p>
        {e.error && <ErrorTexto>{e.error}</ErrorTexto>}
      </div>
    </Modal>
  );
}

/* ── CU-29 (el coordinador, en nombre de un agente) ── */
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function ModalCargarGpx({ operativoId, personal, grupos, onCancel, onCargado }: {
  operativoId: string; personal: PersonalOperativoApi[]; grupos: GrupoApi[]; onCancel: () => void; onCargado: (t: TrackApi) => void;
}) {
  const archivoRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analisis, setAnalisis] = useState<AnalisisGpxApi | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [agenteId, setAgenteId] = useState('');
  const [qa, setQa] = useState('');
  const [lista, setLista] = useState(false);
  const [notas, setNotas] = useState('');
  const [encima, setEncima] = useState(false);
  const e = useEnvio();
  const agente = personal.find(a => a.id === agenteId);
  const grupoDe = (a: PersonalOperativoApi) => grupos.find(g => g.id === a.grupoId);
  const sugeridos = useMemo(() => personal.filter(a => {
    const g = grupoDe(a);
    return !qa.trim() || normalizar(`${a.nombre} ${a.apellido} ${a.dni} ${g?.nombre ?? ''} ${a.institucionNombre ?? ''}`).includes(normalizar(qa.trim()));
  }).slice(0, 8), [personal, qa]); // eslint-disable-line react-hooks/exhaustive-deps

  const elegir = async (f: File | undefined) => {
    if (archivoRef.current) archivoRef.current.value = '';
    if (!f) return;
    e.setError(null);
    if (!/\.gpx$/i.test(f.name)) { e.setError('El archivo tiene que ser .gpx.'); return; }
    if (f.size > GPX_MAX_BYTES) { e.setError('El archivo GPX puede pesar hasta 4 MB.'); return; }
    setLeyendo(true);
    try {
      const r = await tracksApi.analizar(operativoId, f);
      setArchivo(f); setAnalisis(r.analisis);
    } catch (err) { e.setError(mensaje(err, 'No se pudo leer el archivo.')); } finally { setLeyendo(false); }
  };
  const cargar = () => e.enviar(async () => {
    const r = await tracksApi.crear(operativoId, archivo!, agenteId, notas.trim() || undefined);
    onCargado(r.track);
  }, 'No se pudo cargar el recorrido.');

  return (
    <Modal titulo="Cargar traza GPX" subtitulo="El recorrido de un agente, exportado de su reloj, Wikiloc u otro GPS" icono={Route} onClose={onCancel} ancho={540}
      pie={<><Boton variante="outline" tam="md" onClick={onCancel}>Cancelar</Boton><Boton tam="md" icono={Upload} disabled={!archivo || !agente || e.enviando} onClick={cargar}>{e.enviando ? 'Cargando…' : 'Cargar traza'}</Boton></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input ref={archivoRef} type="file" accept=".gpx,application/gpx+xml" style={{ display: 'none' }} onChange={ev => elegir(ev.target.files?.[0])} aria-label="Archivo GPX" />
        {archivo && analisis ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 'var(--radius)', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)' }}>
            <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileCheck size={17} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--foreground)', wordBreak: 'break-all' }}>{archivo.name}</p>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-foreground)' }}>
                {analisis.puntos.toLocaleString('es-AR')} puntos · {fmtKm(analisis.distanciaM)} · {duracion(analisis.duracionS)}
                {analisis.conElevacion ? ` · ↑ ${analisis.desnivelPositivoM} m` : ' · sin elevación'}
              </p>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-foreground)' }}>{analisis.inicio ? `${fechaCorta(analisis.inicio)} a ${fechaCorta(analisis.fin)}` : 'Sin horas en el archivo'}</p>
            </div>
            <Boton variante="ghost" icono={X} onClick={() => { setArchivo(null); setAnalisis(null); }}>Quitar</Boton>
          </div>
        ) : (
          <div role="button" tabIndex={0} onClick={() => archivoRef.current?.click()} onKeyDown={ev => { if (ev.key === 'Enter') archivoRef.current?.click(); }}
            onDragOver={ev => { ev.preventDefault(); setEncima(true); }} onDragLeave={() => setEncima(false)} onDrop={ev => { ev.preventDefault(); setEncima(false); elegir(ev.dataTransfer.files[0]); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '26px 16px', borderRadius: 'var(--radius-lg)', cursor: 'pointer', border: `2px dashed ${encima ? 'var(--primary)' : 'var(--border)'}`, background: encima ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : 'var(--muted)', color: 'var(--muted-foreground)' }}>
            {leyendo ? <Loader2 size={28} className="animate-spin" /> : <FileUp size={28} style={{ opacity: 0.6 }} />}
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{leyendo ? 'Leyendo el archivo…' : 'Arrastrá el archivo .gpx o hacé clic para buscarlo'}</p>
            <p style={{ margin: 0, fontSize: 11.5 }}>Hasta 4 MB. Se lee el recorrido y se detecta en qué polígono cae.</p>
          </div>
        )}
        {analisis && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius)', marginTop: -4, background: analisis.poligono ? 'var(--muted)' : '#fef3c7', border: `1px solid ${analisis.poligono ? 'var(--border)' : '#fcd34d'}` }}>
            {analisis.poligono ? <Pentagon size={15} color="var(--primary)" /> : <TriangleAlert size={15} color="#b45309" />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...rotulo }}>Polígono detectado por coordenadas</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: analisis.poligono ? 'var(--foreground)' : '#92400e' }}>
                {analisis.poligono ? analisis.poligono.nombre : 'Fuera de polígono'}
                <span style={{ fontWeight: 400, color: 'var(--muted-foreground)', fontSize: 11.5 }}> · {Math.round(analisis.deteccionPct)} % de los puntos{analisis.poligono ? ' adentro' : ' en el más cercano (hace falta 30 %)'}</span>
              </p>
            </div>
          </div>
        )}
        <div style={{ position: 'relative' }}>
          {agente ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 600, lineHeight: 1.5 }}>Recorrido de *</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-input)', background: 'var(--input-background)', border: '1px solid var(--primary)' }}>
                <span style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colorDeGrupo(grupos, agente.grupoId) ?? '#64748b', color: '#fff' }}><Footprints size={14} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{agente.nombre} {agente.apellido}</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-foreground)' }}>DNI {agente.dni} · {grupoDe(agente)?.nombre ?? 'Sin grupo'}{agente.institucionNombre ? ` · ${agente.institucionNombre}` : ''}</p>
                </div>
                <Boton variante="ghost" icono={X} onClick={() => { setAgenteId(''); setQa(''); }}>Cambiar</Boton>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-foreground)' }}>Va a quedar «recorrido de» este agente y «cargado por» vos.</p>
            </div>
          ) : (
            <>
              <div onFocus={() => setLista(true)}>
                <Campo etiqueta="Recorrido de" requerido valor={qa} onChange={v => { setQa(v); setLista(true); }} placeholder="Buscar agente del operativo por nombre, DNI o grupo…" />
              </div>
              {lista && <>
                <div onClick={() => setLista(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
                <div role="listbox" style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 2, maxHeight: 240, overflowY: 'auto', padding: 4, borderRadius: 'var(--radius-md)', background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)' }}>
                  {sugeridos.map(a => {
                    const g = grupoDe(a);
                    return (
                      <button key={a.id} type="button" role="option" aria-selected={false} onClick={() => { setAgenteId(a.id); setLista(false); }}
                        onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--muted)')} onMouseLeave={ev => (ev.currentTarget.style.background = 'none')}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 8px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-family-primary)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: colorDeGrupo(grupos, a.grupoId) ?? '#cbd5e1' }} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500, color: 'var(--foreground)' }}>{a.nombre} {a.apellido}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{g?.nombre ?? 'Sin grupo'} · {a.dni}</span>
                      </button>
                    );
                  })}
                  {!sugeridos.length && <p style={{ margin: 0, padding: 8, fontSize: 12, color: 'var(--muted-foreground)' }}>Ningún agente del operativo coincide con «{qa}».</p>}
                </div>
              </>}
            </>
          )}
        </div>
        <Campo etiqueta="Notas" multilinea filas={2} valor={notas} onChange={setNotas} maxLength={2000} placeholder="Ej.: lo cargo yo porque el agente no tiene señal" />
        {e.error && <ErrorTexto>{e.error}</ErrorTexto>}
      </div>
    </Modal>
  );
}

/* ── CU-32: punto de interés o hallazgo ── */
export function ModalNuevoMarcador({ ll, onCancel, onGuardar }: {
  ll: LatLng; onCancel: () => void;
  onGuardar: (d: { clase: 'POI' | 'HALLAZGO'; nombre: string; descripcion: string | null; detalle: string | null }) => Promise<unknown>;
}) {
  const [clase, setClase] = useState<'POI' | 'HALLAZGO'>('POI');
  const [nombre, setNombre] = useState('');
  const [desc, setDesc] = useState('');
  const [det, setDet] = useState('');
  const e = useEnvio();
  return (
    <Modal titulo="Nuevo marcador" subtitulo={fmtCoord(ll[0], ll[1])} icono={MapPinPlus} onClose={onCancel}
      pie={<><Boton variante="outline" tam="md" onClick={onCancel}>Cancelar</Boton><Boton tam="md" icono={Check} disabled={!nombre.trim() || e.enviando} onClick={() => e.enviar(() => onGuardar({ clase, nombre: nombre.trim(), descripcion: desc.trim() || null, detalle: det.trim() || null }))}>{e.enviando ? 'Guardando…' : 'Guardar marcador'}</Boton></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {(['POI', 'HALLAZGO'] as const).map(tp => {
            const k = SIMBOLOS[tp]; const on = clase === tp; const I = k.icono!;
            return <button key={tp} type="button" aria-pressed={on} onClick={() => setClase(tp)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: on ? `1.5px solid ${k.color}` : '1.5px solid var(--border)', background: on ? k.bg : 'transparent', color: on ? k.color : 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 12.5, fontWeight: 600 }}><I size={14} />{k.label}</button>;
          })}
        </div>
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
          {clase === 'HALLAZGO' ? 'Un hallazgo es evidencia del caso (una prenda, un rastro, un objeto): queda con hora y autor, y no se elimina.' : 'Un lugar útil u orientador: refugio, cruce de arroyo, acceso.'}
        </p>
        <Campo etiqueta="Nombre" requerido valor={nombre} onChange={setNombre} maxLength={120} autoFocus placeholder={clase === 'HALLAZGO' ? 'Ej.: Campera roja' : 'Ej.: Refugio de piedra'} />
        <Campo etiqueta="Descripción" valor={desc} onChange={setDesc} maxLength={300} placeholder="Descripción breve…" />
        <Campo etiqueta="Detalle" multilinea filas={3} valor={det} onChange={setDet} maxLength={4000} placeholder="Condiciones del lugar, quién lo encontró, hora…" />
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-foreground)' }}>Las fotos se agregan desde su panel, después de guardarlo.</p>
        {e.error && <ErrorTexto>{e.error}</ErrorTexto>}
      </div>
    </Modal>
  );
}

/* ── CU-32: instalación SCI ── */
export function ModalNuevaInstalacion({ ll, onCancel, onGuardar }: {
  ll: LatLng; onCancel: () => void;
  onGuardar: (d: { tipoInstalacion: TipoInstalacionApi; nombre: string; responsable: string | null; notas: string | null }) => Promise<unknown>;
}) {
  const [tipo, setTipo] = useState<TipoInstalacionApi>('BASE');
  const [nombre, setNombre] = useState(TIPOS_INSTALACION.BASE);
  const [tocado, setTocado] = useState(false);
  const [resp, setResp] = useState('');
  const [notas, setNotas] = useState('');
  const e = useEnvio();
  const elegir = (tp: TipoInstalacionApi) => { setTipo(tp); if (!tocado) setNombre(TIPOS_INSTALACION[tp]); };
  return (
    <Modal titulo="Nueva instalación" subtitulo={`Sistema de Comando de Incidentes · ${fmtCoord(ll[0], ll[1])}`} icono={Flag} onClose={onCancel}
      pie={<><Boton variante="outline" tam="md" onClick={onCancel}>Cancelar</Boton><Boton tam="md" icono={Check} disabled={!nombre.trim() || e.enviando} onClick={() => e.enviar(() => onGuardar({ tipoInstalacion: tipo, nombre: nombre.trim(), responsable: resp.trim() || null, notas: notas.trim() || null }))}>{e.enviando ? 'Guardando…' : 'Guardar instalación'}</Boton></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>Tipo *</span><GrillaTiposSci valor={tipo} onChange={elegir} /></div>
        <Campo etiqueta="Nombre" requerido valor={nombre} onChange={v => { setNombre(v); setTocado(true); }} maxLength={120} error={!nombre.trim()} />
        <Campo etiqueta="Responsable" valor={resp} onChange={setResp} maxLength={120} placeholder="Quién está a cargo" />
        <Campo etiqueta="Notas" multilinea filas={3} valor={notas} onChange={setNotas} maxLength={2000} placeholder="Accesos, recursos disponibles, frecuencia de radio…" />
        {e.error && <ErrorTexto>{e.error}</ErrorTexto>}
      </div>
    </Modal>
  );
}

/* ── CU-34 ── */
export function ModalPuntoCero({ desde, hasta, nRadios, requiereMotivo, onCambio, onCancel, onConfirmar }: {
  desde: LatLng; hasta: LatLng; nRadios: number; requiereMotivo: boolean;
  onCambio: (ll: LatLng) => void; onCancel: () => void; onConfirmar: (ll: LatLng, motivo: string | null) => Promise<unknown>;
}) {
  const [lat, setLat] = useState(hasta[0].toFixed(5));
  const [lng, setLng] = useState(hasta[1].toFixed(5));
  const [motivo, setMotivo] = useState('');
  const e = useEnvio();
  const num = (s: string) => parseFloat(s.replace(',', '.'));
  const la = num(lat), lo = num(lng);
  const ok = Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
  useEffect(() => { if (ok) onCambio([la, lo]); }, [lat, lng]); // eslint-disable-line react-hooks/exhaustive-deps
  // Si el mapa mueve el punto (otro clic con la herramienta), se actualizan los campos.
  useEffect(() => { setLat(hasta[0].toFixed(5)); setLng(hasta[1].toFixed(5)); }, [hasta[0], hasta[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  const d = ok ? distancia(desde, [la, lo]) : 0;
  const falta = requiereMotivo && !motivo.trim();
  return (
    <Modal titulo="Actualizar Punto Cero" subtitulo="Último punto de avistamiento (LSP)" icono={Crosshair} onClose={onCancel} ancho={480}
      pie={<><Boton variante="outline" tam="md" onClick={onCancel}>Cancelar</Boton><Boton tam="md" icono={Check} disabled={!ok || d < 0.5 || falta || e.enviando} onClick={() => e.enviar(() => onConfirmar([la, lo], motivo.trim() || null))}>{e.enviando ? 'Guardando…' : 'Confirmar'}</Boton></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--muted)', border: '1px solid var(--border)' }}>
          <p style={rotulo}>Actual</p>
          <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-family-mono, monospace)', fontSize: 12, color: 'var(--foreground)' }}>{fmtCoord(desde[0], desde[1])}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Campo overline etiqueta="Nueva latitud" valor={lat} onChange={setLat} placeholder="-31.98120" inputMode="decimal" error={!ok} />
          <Campo overline etiqueta="Nueva longitud" valor={lng} onChange={setLng} placeholder="-64.92620" inputMode="decimal" error={!ok} />
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: ok ? 'var(--muted-foreground)' : '#dc2626', lineHeight: 1.55 }}>
          {ok
            ? d < 0.5 ? 'Hacé clic en el mapa en el lugar nuevo o escribí las coordenadas.'
              : <>El Punto Cero se mueve {fmtDist(d)}. Todos los usuarios del operativo van a ver el nuevo centro.{nRadios ? ` Los ${nRadios} radios se recentran en el punto nuevo (vista previa punteada en el mapa).` : ''}</>
            : 'Ingresá coordenadas válidas en grados decimales (latitud entre −90 y 90, longitud entre −180 y 180).'}
        </p>
        <Campo etiqueta={requiereMotivo ? 'Motivo *' : 'Motivo'} multilinea filas={2} valor={motivo} onChange={setMotivo} maxLength={500} error={falta && d >= 0.5}
          placeholder="Ej.: hallazgo de una prenda 1 km al norte" />
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-foreground)' }}>
          {requiereMotivo ? 'El operativo está en curso: el motivo es obligatorio y queda en el historial del Punto Cero.' : 'El movimiento queda en el historial del Punto Cero.'}
        </p>
        {e.error && <ErrorTexto>{e.error}</ErrorTexto>}
      </div>
    </Modal>
  );
}

/* ── CU-36 ── */
export function ModalEliminar({ tipo, nombre, extra, onCancel, onConfirmar }: {
  tipo: string; nombre: string; extra: string; onCancel: () => void; onConfirmar: () => Promise<unknown>;
}) {
  const e = useEnvio();
  return (
    <Modal titulo={`Eliminar ${tipo}`} onClose={onCancel} ancho={440}
      pie={<><Boton variante="outline" tam="md" onClick={onCancel}>Cancelar</Boton><Boton variante="danger" tam="md" icono={Trash2} disabled={e.enviando} onClick={() => e.enviar(onConfirmar, 'No se pudo eliminar.')}>{e.enviando ? 'Eliminando…' : 'Eliminar'}</Boton></>}>
      <div style={{ display: 'flex', gap: 12 }}>
        <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><TriangleAlert size={17} /></span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--foreground)', lineHeight: 1.55 }}>¿Eliminar <strong>{nombre}</strong> del mapa?</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.55 }}>{extra}</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.55 }}>Es una baja con registro: deja de verse para todos, pero queda qué era, quién lo eliminó y cuándo.</p>
          {e.error && <ErrorTexto>{e.error}</ErrorTexto>}
        </div>
      </div>
    </Modal>
  );
}

/* ── CU-28: quitar un grupo que está en el terreno ── */
export function ModalQuitarGrupo({ grupo, estado, poligono, onCancel, onConfirmar }: {
  grupo: string; estado: string; poligono: string; onCancel: () => void; onConfirmar: () => Promise<unknown>;
}) {
  const e = useEnvio();
  return (
    <Modal titulo="Quitar grupo del polígono" icono={TriangleAlert} onClose={onCancel} ancho={440}
      pie={<><Boton variante="outline" tam="md" onClick={onCancel}>Cancelar</Boton><Boton variante="danger" tam="md" icono={X} disabled={e.enviando} onClick={() => e.enviar(onConfirmar, 'No se pudo quitar el grupo.')}>{e.enviando ? 'Quitando…' : 'Quitar igualmente'}</Boton></>}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--foreground)' }}>{grupo}</strong> está <strong style={{ color: 'var(--foreground)' }}>{estado.toLowerCase()}</strong> en {poligono}.
        Si lo quitás, el grupo sigue en el terreno pero el polígono queda sin él. Queda registrado en el historial del polígono.
      </p>
      {e.error && <div style={{ marginTop: 10 }}><ErrorTexto>{e.error}</ErrorTexto></div>}
    </Modal>
  );
}
