/**
 * Paneles de detalle a la derecha del mapa:
 *   · Polígono (CU-39 Consultar, CU-37 Modificar, CU-30 grupos, CU-40 cobertura)
 *   · Track (CU-32: sólo polígono y notas)
 *   · Punto de interés / hallazgo (CU-35, fotos) · Instalación SCI (CU-35)
 *   · Punto Cero (CU-36, con su historial)
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pentagon, Pencil, Plus, Save, Spline, Trash2, X, Repeat, Users, Dog, UserRound, Info, Route, Download, Move, Crosshair,
  ImagePlus, Loader2, LogIn, LogOut, Upload, FilePen, History, TriangleAlert,
} from 'lucide-react';
import {
  ApiError, TIPOS_INSTALACION, type GrupoApi, type MarcadorApi, type MovimientoPuntoCeroApi, type PoligonoDetalleApi,
  type TipoInstalacionApi, type TrackApi, type EventoPoligonoApi,
} from '../../../services/api';
import StatusBadge from '../../../components/shared/StatusBadge';
import { Boton, BarraCobertura, Campo, ErrorTexto, PanelDetalle, Selector, Simbolo, SIMBOLOS, chipIcono, pastilla, rotulo } from './piezas';
import { fmtArea, fmtCoord, fmtDist, fmtKm } from './geo';
import { colorDeGrupo, duracion, fechaCorta, type PoligonoVista, type TrackVista } from './modelo';

const mensaje = (err: unknown, porDefecto: string) => (err instanceof ApiError ? err.message : porDefecto);
const EN_TERRENO = ['DESPLEGADO', 'RASTRILLANDO'];
const NOTAS_MAX = 2000;

/** Guarda con aviso de error en el mismo bloque. */
function useGuardar() {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guardar = async (f: () => Promise<unknown>, porDefecto = 'No se pudo guardar.') => {
    setGuardando(true); setError(null);
    try { await f(); return true; } catch (err) { setError(mensaje(err, porDefecto)); return false; } finally { setGuardando(false); }
  };
  return { guardando, error, setError, guardar };
}

/* ── Texto editable en el lugar (nombre y notas del polígono, CU-37 N1/N2) ── */
function TextoEditable({ titulo, valor, vacio, multilinea, max, soloLectura, onGuardar, textoBoton }: {
  titulo: string; valor: string | null; vacio: string; multilinea?: boolean; max: number; soloLectura: boolean;
  onGuardar: (v: string) => Promise<unknown>; textoBoton: [string, string];
}) {
  const [ed, setEd] = useState(false);
  const [v, setV] = useState(valor ?? '');
  const g = useGuardar();
  useEffect(() => { setEd(false); setV(valor ?? ''); g.setError(null); }, [valor]); // eslint-disable-line react-hooks/exhaustive-deps
  const cambio = v.trim() !== (valor ?? '').trim() && (multilinea || v.trim().length > 0);
  const guardar = async () => { if (cambio && await g.guardar(() => onGuardar(v.trim()))) setEd(false); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={rotulo}>{titulo}</p>
        {!ed && !soloLectura && <Boton variante="ghost" icono={valor ? Pencil : Plus} onClick={() => setEd(true)}>{valor ? textoBoton[0] : textoBoton[1]}</Boton>}
      </div>
      {ed ? <>
        <Campo valor={v} onChange={setV} multilinea={multilinea} filas={4} maxLength={max} autoFocus
          placeholder={multilinea ? 'Terreno, accesos, riesgos, indicaciones para el grupo…' : undefined}
          onKeyDown={e => { if (!multilinea && e.key === 'Enter') guardar(); if (e.key === 'Escape') { setEd(false); setV(valor ?? ''); } }} />
        {g.error && <ErrorTexto>{g.error}</ErrorTexto>}
        <div style={{ display: 'flex', gap: 6 }}>
          <Boton icono={Save} disabled={!cambio || g.guardando} onClick={guardar}>{g.guardando ? 'Guardando…' : 'Guardar'}</Boton>
          <Boton variante="ghost" onClick={() => { setEd(false); setV(valor ?? ''); g.setError(null); }}>Cancelar</Boton>
        </div>
      </> : valor
        ? <p style={{ margin: 0, fontSize: multilinea ? 12.5 : 13, fontWeight: multilinea ? 400 : 500, color: 'var(--foreground)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{valor}</p>
        : <p style={{ margin: 0, fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{vacio}</p>}
    </div>
  );
}

/* ── Grupos del polígono (CU-30) ── */
function GruposDelPoligono({ pol, grupos, soloLectura, onAsignar, onQuitar, onCambiar }: {
  pol: PoligonoVista; grupos: GrupoApi[]; soloLectura: boolean;
  onAsignar: (grupoId: string) => Promise<unknown>;
  onQuitar: (grupoId: string, enTerreno: boolean) => void;
  onCambiar: (grupoId: string, nuevoId: string) => Promise<unknown>;
}) {
  const [nuevo, setNuevo] = useState('');
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [reemplazo, setReemplazo] = useState('');
  const g = useGuardar();
  useEffect(() => { setNuevo(''); setCambiando(null); setReemplazo(''); g.setError(null); }, [pol.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const tieneRastrillaje = pol.grupos.some(x => x.clase === 'RASTRILLAJE');
  // Sólo se asigna un grupo Confirmado que no esté en otro polígono (CU-30).
  const libres = grupos.filter(x => x.estado === 'CONFIRMADO' && !x.poligonoId);
  const opciones = [
    { value: '', label: libres.length ? 'Elegí un grupo confirmado…' : 'No hay grupos confirmados libres' },
    ...libres.map(x => ({
      value: x.id,
      label: `${x.nombre}${x.clase === 'ESPECIAL' ? ' · especial' : ''}${x.clase === 'RASTRILLAJE' && tieneRastrillaje ? ' · ya hay uno de rastrillaje' : ''}`,
      disabled: x.clase === 'RASTRILLAJE' && tieneRastrillaje,
    })),
  ];
  const reemplazos = (clase: string) => [
    { value: '', label: 'Elegí el grupo que lo reemplaza…' },
    ...libres.filter(x => x.clase === clase).map(x => ({ value: x.id, label: x.nombre })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={rotulo}>Grupos asignados</p>
      {pol.grupos.length ? pol.grupos.map(gr => {
        const color = colorDeGrupo(grupos, gr.id) ?? gr.color ?? '#475569';
        const completo = grupos.find(x => x.id === gr.id);
        const enTerreno = EN_TERRENO.includes(gr.estado);
        const I = gr.clase === 'ESPECIAL' ? Dog : Users;
        return (
          <div key={gr.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 'var(--radius)', background: `color-mix(in srgb, ${color} 6%, transparent)`, border: `1.5px solid color-mix(in srgb, ${color} 33%, transparent)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><I size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 'calc(13.5px * var(--escala-texto))', fontWeight: 600, color: 'var(--foreground)' }}>{gr.nombre}</p>
                <p style={{ margin: 0, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
                  {gr.clase === 'ESPECIAL' ? 'Especial' : 'Rastrillaje'}{completo ? ` · ${completo.integrantes.length} integrantes` : ''}
                </p>
              </div>
              <StatusBadge estado={gr.estado.toLowerCase()} size="sm" />
            </div>
            {gr.liderNombre && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'calc(12px * var(--escala-texto))' }}>
                <UserRound size={13} color="var(--muted-foreground)" /><span style={{ color: 'var(--muted-foreground)' }}>Líder</span><span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{gr.liderNombre}</span>
              </div>
            )}
            {!soloLectura && cambiando !== gr.id && (
              <div style={{ display: 'flex', gap: 6 }}>
                {gr.estado === 'ASIGNADO' && <Boton variante="outline" icono={Repeat} onClick={() => { setCambiando(gr.id); setReemplazo(''); }}>Cambiar grupo</Boton>}
                <Boton variante="ghost" icono={X} onClick={() => onQuitar(gr.id, enTerreno)}>Quitar</Boton>
              </div>
            )}
            {cambiando === gr.id && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                <Selector valor={reemplazo} onChange={setReemplazo} opciones={reemplazos(gr.clase)} />
                <Boton tam="md" disabled={!reemplazo || g.guardando} onClick={async () => { if (await g.guardar(() => onCambiar(gr.id, reemplazo))) setCambiando(null); }}>Cambiar</Boton>
                <Boton variante="ghost" tam="md" icono={X} title="Cancelar" onClick={() => setCambiando(null)} />
              </div>
            )}
            {enTerreno && (
              <div style={{ display: 'flex', gap: 6, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
                <Info size={12} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>El grupo está en el terreno: no se cambia. Al pasar a Replegado sale solo del polígono.</span>
              </div>
            )}
          </div>
        );
      }) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
          <Users size={18} color="var(--muted-foreground)" />
          <div>
            <p style={{ margin: 0, fontSize: 'calc(12.5px * var(--escala-texto))', fontWeight: 600, color: 'var(--foreground)' }}>Sin grupo asignado</p>
            <p style={{ margin: 0, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>Admite un grupo de rastrillaje y los especiales que hagan falta.</p>
          </div>
        </div>
      )}
      {!soloLectura && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <Selector valor={nuevo} onChange={setNuevo} opciones={opciones} disabled={!libres.length} />
          <Boton tam="md" disabled={!nuevo || g.guardando} onClick={async () => { if (await g.guardar(() => onAsignar(nuevo))) setNuevo(''); }}>Asignar</Boton>
        </div>
      )}
      {g.error && <ErrorTexto>{g.error}</ErrorTexto>}
    </div>
  );
}

/* ── Historial del polígono (CU-39) ── */
function textoEvento(e: EventoPoligonoApi, agenteDe: (trackId: string | null) => string | null): string {
  const d = (e.detalle ?? {}) as Record<string, unknown>;
  const g = e.grupoNombre ?? (d.grupo as string) ?? 'Un grupo';
  switch (e.tipo) {
    case 'CREADO': return 'Polígono dibujado';
    case 'NOMBRE': return `Nombre cambiado: «${d.anterior}» → «${d.nuevo}»`;
    case 'NOTAS': return 'Notas editadas';
    case 'GEOMETRIA': return `Forma modificada (${fmtArea(Number(d.areaAnteriorM2))} → ${fmtArea(Number(d.areaNuevaM2))})`;
    case 'ELIMINADO': return 'Polígono eliminado';
    case 'GRUPO_ASIGNADO': return `${g} asignado al polígono`;
    case 'GRUPO_CAMBIADO': return `${g} reemplazado por otro grupo`;
    case 'GRUPO_QUITADO': return `${g} quitado del polígono`;
    case 'GRUPO_REPLEGADO': return `${g} se replegó y salió del polígono`;
    case 'GRUPO_SALIO': return `${g} salió del polígono`;
    case 'TRACK_CARGADO': { const a = agenteDe(e.trackId); return `Track cargado${a ? ` · recorrido de ${a}` : ''}`; }
    case 'TRACK_REASIGNADO': return d.hacia ? `Track movido a ${d.hacia}` : `Track traído desde ${d.desde}`;
    case 'TRACK_ELIMINADO': return 'Track eliminado';
  }
}
const ICONO_EVENTO: Partial<Record<EventoPoligonoApi['tipo'], typeof LogIn>> = {
  CREADO: Pentagon, NOMBRE: FilePen, NOTAS: FilePen, GEOMETRIA: Spline, GRUPO_ASIGNADO: LogIn,
  TRACK_CARGADO: Upload, TRACK_REASIGNADO: Route, TRACK_ELIMINADO: Trash2,
};

function HistorialPoligono({ detalle, agenteDe }: { detalle: PoligonoDetalleApi | null; agenteDe: (id: string | null) => string | null }) {
  if (!detalle) return <p style={{ margin: 0, fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>Cargando historial…</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={rotulo}>Historial del polígono</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>Grupos que trabajaron</span>
        {detalle.asistieron.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {detalle.asistieron.map(g => {
              const c = g.color ?? '#64748b';
              return <span key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 999, border: `1px solid color-mix(in srgb, ${c} 40%, transparent)`, background: `color-mix(in srgb, ${c} 8%, transparent)`, fontSize: 'calc(11.5px * var(--escala-texto))', fontWeight: 600, color: 'var(--foreground)' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{g.nombre}</span>;
            })}
          </div>
        ) : <span style={{ fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>Ningún grupo trabajó todavía en este polígono.</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {detalle.historial.map((e, i) => {
          const c = e.grupoColor ?? '#64748b';
          const I = ICONO_EVENTO[e.tipo] ?? LogOut;
          return (
            <div key={e.id} style={{ display: 'flex', gap: 10, position: 'relative', paddingBottom: i < detalle.historial.length - 1 ? 12 : 0 }}>
              {i < detalle.historial.length - 1 && <span style={{ position: 'absolute', left: 10, top: 22, bottom: 0, width: 1, background: 'var(--border)' }} />}
              <span style={{ width: 21, height: 21, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, ${c} 12%, transparent)`, color: c }}><I size={11} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 'calc(12px * var(--escala-texto))', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.35 }}>{textoEvento(e, agenteDe)}</p>
                <p style={{ margin: '1px 0 0', fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{fechaCorta(e.registradoEn)}{e.registradoPor ? ` · ${e.registradoPor}` : ''}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PanelPoligono({ pol, detalle, grupos, tracks, soloLectura, brechas, onToggleBrechas, onClose, onGuardar, onAsignar, onQuitar, onCambiar, onEditarForma, onEliminar, onTrack }: {
  pol: PoligonoVista; detalle: PoligonoDetalleApi | null; grupos: GrupoApi[]; tracks: TrackVista[]; soloLectura: boolean;
  brechas: boolean; onToggleBrechas: () => void; onClose: () => void;
  onGuardar: (d: { nombre?: string; notas?: string | null }) => Promise<unknown>;
  onAsignar: (grupoId: string) => Promise<unknown>; onQuitar: (grupoId: string, enTerreno: boolean) => void;
  onCambiar: (grupoId: string, nuevoId: string) => Promise<unknown>;
  onEditarForma: () => void; onEliminar: () => void; onTrack: (t: TrackVista) => void;
}) {
  const propios = tracks.filter(t => t.poligonoId === pol.id);
  const agenteDe = (id: string | null) => detalle?.listaTracks.find(t => t.id === id)?.agente ?? null;
  return (
    <PanelDetalle chip={chipIcono(Pentagon, pol.color)} titulo={pol.nombre} onClose={onClose}
      sub={`Área ${fmtArea(pol.areaM2)} · Perímetro ${fmtKm(pol.perimetroM)}`}
      pie={soloLectura ? undefined : <><Boton variante="muted" icono={Spline} onClick={onEditarForma} style={{ flex: 1 }}>Editar geometría</Boton><Boton variante="ghost" icono={Trash2} onClick={onEliminar} style={{ color: '#dc2626' }}>Eliminar</Boton></>}>
      <TextoEditable titulo="Nombre" valor={pol.nombre} vacio="" max={120} soloLectura={soloLectura} textoBoton={['Editar nombre', 'Editar nombre']} onGuardar={nombre => onGuardar({ nombre })} />
      <GruposDelPoligono pol={pol} grupos={grupos} soloLectura={soloLectura} onAsignar={onAsignar} onQuitar={onQuitar} onCambiar={onCambiar} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={rotulo}>Cobertura por GPX</p>
        {pol.tracks ? <>
          <BarraCobertura valor={pol.coberturaPct} />
          <p style={{ margin: 0, fontSize: 'calc(11.5px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
            {fmtDist(pol.coberturaKm * 1000)} recorridos dentro del polígono · franja de 2 m a cada lado del recorrido · calculada {fechaCorta(pol.coberturaCalculadaEn)}
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--foreground)', cursor: 'pointer' }}>
            <input type="checkbox" checked={brechas} onChange={onToggleBrechas} style={{ accentColor: 'var(--primary)', margin: 0 }} />Mostrar brechas en el mapa
          </label>
        </> : (
          <p style={{ margin: 0, fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>Todavía no hay tracks GPX en este polígono. La cobertura se calcula sola cuando se cargan.</p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={rotulo}>Tracks en este polígono · {propios.length}</p>
        {propios.map(t => (
          <button key={t.id} type="button" onClick={() => onTrack(t)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-family-primary)', textAlign: 'left' }}>
            <Route size={13} color={t.color} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 'calc(12px * var(--escala-texto))', fontWeight: 600, color: 'var(--foreground)' }}>{t.agente}</span>
              <span style={{ display: 'block', fontSize: 'calc(10.5px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{t.inicio ? fechaCorta(t.inicio) : 'Sin horas'}{t.cargadoPor !== t.agente ? ` · cargado por ${t.cargadoPor}` : ''}</span>
            </span>
            <span style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{fmtKm(t.distanciaM)}</span>
          </button>
        ))}
      </div>
      <TextoEditable titulo="Notas" valor={pol.notas} vacio="Sin notas para este polígono." multilinea max={NOTAS_MAX} soloLectura={soloLectura} textoBoton={['Editar nota', 'Agregar nota']} onGuardar={notas => onGuardar({ notas: notas || null })} />
      <HistorialPoligono detalle={detalle} agenteDe={agenteDe} />
    </PanelDetalle>
  );
}

/* ── Track (CU-32) ── */
export function PanelTrack({ t, detalle, poligonos, soloLectura, onClose, onGuardar, onEliminar }: {
  t: TrackVista; detalle: TrackApi | null; poligonos: PoligonoVista[]; soloLectura: boolean; onClose: () => void;
  onGuardar: (d: { poligonoId?: string | null; notas?: string | null }) => Promise<unknown>; onEliminar: () => void;
}) {
  const [pol, setPol] = useState(t.poligonoId ?? '');
  const [notas, setNotas] = useState(t.notas ?? '');
  const g = useGuardar();
  useEffect(() => { setPol(t.poligonoId ?? ''); setNotas(t.notas ?? ''); g.setError(null); }, [t.id, t.poligonoId, t.notas]); // eslint-disable-line react-hooks/exhaustive-deps
  const cambios: { poligonoId?: string | null; notas?: string | null } = {};
  if ((pol || null) !== (t.poligonoId ?? null)) cambios.poligonoId = pol || null;
  if (notas.trim() !== (t.notas ?? '')) cambios.notas = notas.trim() || null;
  const sucio = Object.keys(cambios).length > 0;
  return (
    <PanelDetalle chip={chipIcono(Route, t.color)} titulo={`Recorrido de ${t.agente}`} insignia={pastilla(`Track GPX · ${t.archivoNombre}`, t.color)} onClose={onClose}
      sub={t.puntos.length ? `Inicio ${fmtCoord(t.puntos[0][0], t.puntos[0][1])}` : undefined}
      pie={soloLectura ? undefined : <>
        <Boton tam="md" icono={Save} disabled={!sucio || g.guardando} onClick={() => g.guardar(() => onGuardar(cambios))} style={{ flex: 1 }}>{g.guardando ? 'Guardando…' : 'Guardar cambios'}</Boton>
        <Boton variante="ghost" icono={Trash2} onClick={onEliminar} style={{ color: '#dc2626' }}>Eliminar</Boton>
      </>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius)', background: 'var(--muted)' }}>
        <UserRound size={15} color="var(--muted-foreground)" />
        <div>
          <p style={rotulo}>Cargado por</p>
          <p style={{ margin: '2px 0 0', fontSize: 'calc(13px * var(--escala-texto))', fontWeight: 600, color: 'var(--foreground)' }}>{t.cargadoPor}<span style={{ fontWeight: 400, color: 'var(--muted-foreground)', fontSize: 'calc(11.5px * var(--escala-texto))' }}> · {fechaCorta(t.cargadoEn)}</span></p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 'calc(12px * var(--escala-texto))' }}>
        <div><p style={rotulo}>Inicio</p><p style={{ margin: '2px 0 0' }}>{fechaCorta(t.inicio)}</p></div>
        <div><p style={rotulo}>Fin</p><p style={{ margin: '2px 0 0' }}>{fechaCorta(t.fin)}</p></div>
        <div><p style={rotulo}>Distancia</p><p style={{ margin: '2px 0 0' }}>{fmtKm(t.distanciaM)}</p></div>
        <div><p style={rotulo}>Duración</p><p style={{ margin: '2px 0 0' }}>{duracion(t.duracionS)}</p></div>
        <div><p style={rotulo}>Desnivel</p><p style={{ margin: '2px 0 0' }}>{t.conElevacion ? `↑ ${t.desnivelPositivoM ?? 0} m · ↓ ${t.desnivelNegativoM ?? 0} m` : 'Sin elevación'}</p></div>
        <div><p style={rotulo}>Grupo</p><p style={{ margin: '2px 0 0' }}>{t.grupoNombre ?? '—'}</p></div>
      </div>
      <p style={{ margin: 0, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
        El recorrido, las horas y la elevación salen del archivo y no se editan. Se detectó {Math.round(t.deteccionPct)} % de los puntos en {t.poligonoNombre ?? 'el polígono más cercano'}.
      </p>
      <Selector etiqueta="Polígono" overline valor={pol} onChange={setPol} disabled={soloLectura}
        opciones={[{ value: '', label: '— Fuera de polígono —' }, ...poligonos.map(p => ({ value: p.id, label: p.nombre }))]} />
      {soloLectura
        ? <div><p style={rotulo}>Notas</p><p style={{ margin: '4px 0 0', fontSize: 'calc(12.5px * var(--escala-texto))', whiteSpace: 'pre-wrap' }}>{t.notas || '—'}</p></div>
        : <Campo etiqueta="Notas" overline multilinea filas={3} valor={notas} onChange={setNotas} maxLength={NOTAS_MAX} placeholder="Observaciones sobre el recorrido…" />}
      {g.error && <ErrorTexto>{g.error}</ErrorTexto>}
      {detalle?.archivoUrl && (
        <a href={detalle.archivoUrl} target="_blank" rel="noreferrer" download={t.archivoNombre}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'calc(12px * var(--escala-texto))', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
          <Download size={13} />Descargar el archivo original
        </a>
      )}
    </PanelDetalle>
  );
}

/* ── Punto de interés / hallazgo (CU-35) ── */
export function PanelMarcador({ m, soloLectura, onClose, onGuardar, onEliminar, onSubirFotos, onQuitarFoto }: {
  m: MarcadorApi; soloLectura: boolean; onClose: () => void;
  onGuardar: (d: { clase?: 'HALLAZGO'; nombre?: string; descripcion?: string | null; detalle?: string | null }) => Promise<unknown>;
  onEliminar: () => void; onSubirFotos: (f: File[]) => Promise<unknown>; onQuitarFoto: (fotoId: string) => Promise<unknown>;
}) {
  const [clase, setClase] = useState(m.clase);
  const [nombre, setNombre] = useState(m.nombre);
  const [desc, setDesc] = useState(m.descripcion ?? '');
  const [det, setDet] = useState(m.detalle ?? '');
  const g = useGuardar();
  const fotos = useGuardar();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { setClase(m.clase); setNombre(m.nombre); setDesc(m.descripcion ?? ''); setDet(m.detalle ?? ''); g.setError(null); fotos.setError(null); }, [m.id, m.actualizadoEn]); // eslint-disable-line react-hooks/exhaustive-deps
  const hallazgo = m.clase === 'HALLAZGO';
  const tipo = clase === 'HALLAZGO' ? 'HALLAZGO' : 'POI';
  const c = SIMBOLOS[tipo];
  const cambios: { clase?: 'HALLAZGO'; nombre?: string; descripcion?: string | null; detalle?: string | null } = {};
  if (clase !== m.clase && clase === 'HALLAZGO') cambios.clase = 'HALLAZGO';
  if (nombre.trim() !== m.nombre) cambios.nombre = nombre.trim();
  if (desc.trim() !== (m.descripcion ?? '')) cambios.descripcion = desc.trim() || null;
  if (det.trim() !== (m.detalle ?? '')) cambios.detalle = det.trim() || null;
  const sucio = Object.keys(cambios).length > 0;
  const subir = async (lista: FileList | null) => {
    // Primero se copian: vaciar el campo vacía también su FileList.
    const archivos = lista ? [...lista] : [];
    if (input.current) input.current.value = '';
    if (!archivos.length) return;
    if (archivos.some(f => !f.type.startsWith('image/'))) { fotos.setError('Sólo se pueden subir imágenes.'); return; }
    if (archivos.some(f => f.size > 8 * 1024 * 1024)) { fotos.setError('Cada foto puede pesar hasta 8 MB.'); return; }
    await fotos.guardar(() => onSubirFotos(archivos), 'No se pudieron subir las fotos.');
  };
  return (
    <PanelDetalle chip={<Simbolo tipo={tipo} variante="chip" />} titulo={nombre || 'Sin nombre'} insignia={pastilla(c.label, c.color)} onClose={onClose} sub={fmtCoord(m.lat, m.lng)}
      pie={soloLectura ? undefined : <>
        <Boton tam="md" icono={Save} disabled={!sucio || !nombre.trim() || g.guardando} onClick={() => g.guardar(() => onGuardar(cambios))} style={{ flex: 1 }}>{g.guardando ? 'Guardando…' : 'Guardar cambios'}</Boton>
        {!hallazgo && <Boton variante="ghost" icono={Trash2} onClick={onEliminar} style={{ color: '#dc2626' }}>Eliminar</Boton>}
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={rotulo}>Tipo</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {(['POI', 'HALLAZGO'] as const).map(tp => {
            const k = SIMBOLOS[tp];
            const on = clase === tp;
            const I = k.icono!;
            const bloqueado = soloLectura || (hallazgo && tp === 'POI');
            return (
              <button key={tp} type="button" disabled={bloqueado} onClick={() => setClase(tp)} title={hallazgo && tp === 'POI' ? 'Un hallazgo es evidencia: no pasa a punto de interés' : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 'var(--radius-md)', cursor: bloqueado ? 'not-allowed' : 'pointer', opacity: bloqueado && !on ? 0.5 : 1, border: on ? `1.5px solid ${k.color}` : '1.5px solid var(--border)', background: on ? k.bg : 'transparent', color: on ? k.color : 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 'calc(12px * var(--escala-texto))', fontWeight: 600 }}>
                <I size={13} />{k.label}
              </button>
            );
          })}
        </div>
        {!hallazgo && clase === 'HALLAZGO' && (
          <p style={{ margin: 0, display: 'flex', gap: 6, fontSize: 'calc(11.5px * var(--escala-texto))', color: '#92400e', lineHeight: 1.45 }}><TriangleAlert size={13} style={{ flexShrink: 0, marginTop: 1 }} />Pasar a hallazgo no se deshace: un hallazgo es evidencia y no se elimina.</p>
        )}
        {hallazgo && <p style={{ margin: 0, fontSize: 'calc(11.5px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>Un hallazgo es evidencia: queda donde se encontró, no se elimina y sus fotos no se quitan. Sus datos sí se corrigen.</p>}
      </div>
      {soloLectura ? <>
        <div><p style={rotulo}>Descripción</p><p style={{ margin: '4px 0 0', fontSize: 'calc(13px * var(--escala-texto))' }}>{m.descripcion || '—'}</p></div>
        <div><p style={rotulo}>Detalle / notas de pista</p><p style={{ margin: '4px 0 0', fontSize: 'calc(12.5px * var(--escala-texto))', whiteSpace: 'pre-wrap' }}>{m.detalle || '—'}</p></div>
      </> : <>
        <Campo etiqueta="Nombre" overline valor={nombre} onChange={setNombre} maxLength={120} error={!nombre.trim()} />
        <Campo etiqueta="Descripción" overline valor={desc} onChange={setDesc} maxLength={300} placeholder="Descripción breve…" />
        <Campo etiqueta="Detalle / notas de pista" overline multilinea filas={5} valor={det} onChange={setDet} maxLength={4000} placeholder="Condiciones del lugar, evidencias encontradas, observaciones, hora del hallazgo…" />
      </>}
      {g.error && <ErrorTexto>{g.error}</ErrorTexto>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={rotulo}>Fotos de pista · {m.fotos.length}/8</p>
        {m.fotos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {m.fotos.map(f => (
              <div key={f.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--muted)' }}>
                {f.url && <a href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt="Foto de pista" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></a>}
                {!soloLectura && !hallazgo && (
                  <button type="button" aria-label="Quitar foto" onClick={() => fotos.guardar(() => onQuitarFoto(f.id), 'No se pudo quitar la foto.')}
                    style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={12} /></button>
                )}
              </div>
            ))}
          </div>
        )}
        {!soloLectura && m.fotos.length < 8 && (
          <>
            <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={e => subir(e.target.files)} aria-label="Fotos de pista" />
            <button type="button" disabled={fotos.guardando} onClick={() => input.current?.click()}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 18, borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border)', background: 'var(--muted)', color: 'var(--muted-foreground)', cursor: 'pointer', fontFamily: 'var(--font-family-primary)' }}>
              {fotos.guardando ? <Loader2 size={22} className="animate-spin" /> : <ImagePlus size={22} style={{ opacity: 0.6 }} />}
              <span style={{ fontSize: 'calc(12px * var(--escala-texto))' }}>{fotos.guardando ? 'Subiendo…' : 'Agregar fotos (imágenes de hasta 8 MB)'}</span>
            </button>
          </>
        )}
        {m.fotos.length === 0 && soloLectura && <p style={{ margin: 0, fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>Sin fotos.</p>}
        {fotos.error && <ErrorTexto>{fotos.error}</ErrorTexto>}
      </div>
      <p style={{ margin: 0, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>Marcado por {m.creadoPor ?? '—'} · {fechaCorta(m.creadoEn)}</p>
    </PanelDetalle>
  );
}

/* ── Instalación SCI (CU-35) ── */
export function GrillaTiposSci({ valor, onChange, disabled }: { valor: TipoInstalacionApi; onChange: (t: TipoInstalacionApi) => void; disabled?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {(Object.keys(TIPOS_INSTALACION) as TipoInstalacionApi[]).map(tp => {
        const on = valor === tp;
        return (
          <button key={tp} type="button" disabled={disabled} onClick={() => onChange(tp)} aria-pressed={on}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 'var(--radius-md)', cursor: disabled ? 'default' : 'pointer', textAlign: 'left', border: on ? '1.5px solid #2563eb' : '1.5px solid var(--border)', background: on ? '#dbeafe' : 'transparent', color: on ? '#1d4ed8' : 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 'calc(11.5px * var(--escala-texto))', fontWeight: 600, lineHeight: 1.2 }}>
            <Simbolo tipo={tp} />{TIPOS_INSTALACION[tp]}
          </button>
        );
      })}
    </div>
  );
}

export function PanelInstalacion({ m, soloLectura, onClose, onGuardar, onReubicar, onEliminar }: {
  m: MarcadorApi; soloLectura: boolean; onClose: () => void;
  onGuardar: (d: { tipoInstalacion?: TipoInstalacionApi; nombre?: string; responsable?: string | null; notas?: string | null }) => Promise<unknown>;
  onReubicar: () => void; onEliminar: () => void;
}) {
  const [tipo, setTipo] = useState(m.tipoInstalacion!);
  const [nombre, setNombre] = useState(m.nombre);
  const [resp, setResp] = useState(m.responsable ?? '');
  const [notas, setNotas] = useState(m.notas ?? '');
  const g = useGuardar();
  useEffect(() => { setTipo(m.tipoInstalacion!); setNombre(m.nombre); setResp(m.responsable ?? ''); setNotas(m.notas ?? ''); g.setError(null); }, [m.id, m.actualizadoEn]); // eslint-disable-line react-hooks/exhaustive-deps
  const cambios: { tipoInstalacion?: TipoInstalacionApi; nombre?: string; responsable?: string | null; notas?: string | null } = {};
  if (tipo !== m.tipoInstalacion) cambios.tipoInstalacion = tipo;
  if (nombre.trim() !== m.nombre) cambios.nombre = nombre.trim();
  if (resp.trim() !== (m.responsable ?? '')) cambios.responsable = resp.trim() || null;
  if (notas.trim() !== (m.notas ?? '')) cambios.notas = notas.trim() || null;
  const sucio = Object.keys(cambios).length > 0;
  return (
    <PanelDetalle chip={<Simbolo tipo={tipo} variante="chip" />} titulo={nombre || 'Sin nombre'} insignia={pastilla(`Instalación SCI · ${SIMBOLOS[tipo].glifo}`, '#2563eb')} onClose={onClose} sub={fmtCoord(m.lat, m.lng)}
      pie={soloLectura ? undefined : <>
        <Boton tam="md" icono={Save} disabled={!sucio || !nombre.trim() || g.guardando} onClick={() => g.guardar(() => onGuardar(cambios))} style={{ flex: 1 }}>{g.guardando ? 'Guardando…' : 'Guardar cambios'}</Boton>
        <Boton variante="ghost" icono={Trash2} onClick={onEliminar} style={{ color: '#dc2626' }}>Eliminar</Boton>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><p style={rotulo}>Tipo de instalación</p><GrillaTiposSci valor={tipo} onChange={setTipo} disabled={soloLectura} /></div>
      {soloLectura ? <>
        <div><p style={rotulo}>Responsable</p><p style={{ margin: '4px 0 0', fontSize: 'calc(13px * var(--escala-texto))' }}>{m.responsable || '—'}</p></div>
        <div><p style={rotulo}>Notas</p><p style={{ margin: '4px 0 0', fontSize: 'calc(12.5px * var(--escala-texto))', whiteSpace: 'pre-wrap' }}>{m.notas || '—'}</p></div>
      </> : <>
        <Campo etiqueta="Nombre" overline valor={nombre} onChange={setNombre} maxLength={120} error={!nombre.trim()} />
        <Campo etiqueta="Responsable" overline valor={resp} onChange={setResp} maxLength={120} placeholder="Quién está a cargo" />
        <Campo etiqueta="Notas" overline multilinea filas={3} valor={notas} onChange={setNotas} maxLength={NOTAS_MAX} placeholder="Accesos, recursos disponibles, frecuencia de radio…" />
      </>}
      {g.error && <ErrorTexto>{g.error}</ErrorTexto>}
      {!soloLectura && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={rotulo}>Ubicación</p>
          <p style={{ margin: 0, fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>Si la instalación se trasladó, reubicala en el mapa. La ubicación anterior queda en la auditoría del operativo.</p>
          <div><Boton variante="outline" icono={Move} onClick={onReubicar}>Reubicar en el mapa</Boton></div>
        </div>
      )}
    </PanelDetalle>
  );
}

/* ── Punto Cero (CU-36) ── */
export function PanelPuntoCero({ lat, lng, historial, soloLectura, onClose, onActualizar }: {
  lat: number; lng: number; historial: MovimientoPuntoCeroApi[]; soloLectura: boolean; onClose: () => void; onActualizar: () => void;
}) {
  return (
    <PanelDetalle chip={<Simbolo tipo="puntoCero" variante="chip" />} titulo="Punto Cero (LSP)" insignia={pastilla('Último punto de avistamiento', 'var(--primary)')} onClose={onClose} sub={fmtCoord(lat, lng)}
      pie={soloLectura ? undefined : <Boton tam="md" icono={Crosshair} onClick={onActualizar} full>Actualizar Punto Cero</Boton>}>
      <p style={{ margin: 0, fontSize: 'calc(12.5px * var(--escala-texto))', color: 'var(--foreground)', lineHeight: 1.6 }}>Es el centro del operativo: los radios se dibujan desde acá y lo siguen cuando se mueve.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ ...rotulo, display: 'flex', alignItems: 'center', gap: 6 }}><History size={12} />Historial · {historial.length}</p>
        {historial.map((h, i) => (
          <div key={h.id} style={{ display: 'flex', gap: 10, position: 'relative', paddingBottom: i < historial.length - 1 ? 12 : 0 }}>
            {i < historial.length - 1 && <span style={{ position: 'absolute', left: 10, top: 22, bottom: 0, width: 1, background: 'var(--border)' }} />}
            <span style={{ width: 21, height: 21, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}><Crosshair size={11} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 'calc(12px * var(--escala-texto))', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.35 }}>
                {h.desdeLat === null ? 'Definido al crear el operativo' : `Movido ${h.distanciaM !== null ? fmtDist(h.distanciaM) : ''}`}
              </p>
              {h.motivo && <p style={{ margin: '2px 0 0', fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--foreground)', lineHeight: 1.45 }}>{h.motivo}</p>}
              <p style={{ margin: '2px 0 0', fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono, monospace)' }}>{fmtCoord(h.hastaLat, h.hastaLng)}</p>
              <p style={{ margin: '1px 0 0', fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{fechaCorta(h.registradoEn)}{h.registradoPor ? ` · ${h.registradoPor}` : ''}</p>
            </div>
          </div>
        ))}
        {!historial.length && <p style={{ margin: 0, fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>Sin movimientos registrados.</p>}
      </div>
    </PanelDetalle>
  );
}

