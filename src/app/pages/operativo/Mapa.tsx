/**
 * Mapa operacional (Módulo 5 · CU-27 a CU-38), según el diseño de Claude
 * Design guardado en diseno/ui_kits/mapa: árbol «Gestión del mapa» a la
 * izquierda, herramientas y vistas sobre el mapa, globos de información,
 * paneles de detalle a la derecha y modales para crear y confirmar.
 *
 * Las reglas de negocio no viven acá sino en la API; la pantalla las explica
 * (qué se puede, qué no y por qué) y muestra el mensaje del servidor cuando
 * rechaza algo. Lo que cada usuario decide ver se guarda en su navegador.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router';
import type L from 'leaflet';
import {
  MousePointer2, Ruler, Pentagon, Circle, Square, MapPinPlus, Flag, Crosshair, House, Layers, Plus, Minus, Maximize, Minimize,
  PanelLeftOpen, ChevronDown, ChevronUp, Info, Undo2, Check, Eraser, X, CircleCheck, Map as MapaIcono, Mountain, Satellite,
  type LucideIcon,
} from 'lucide-react';
import {
  ApiError, agentesOperativoApi, gruposApi, marcadoresApi, poligonosApi, puntoCeroApi, tracksApi,
  type GrupoApi, type MarcadorApi, type MovimientoPuntoCeroApi, type PersonalOperativoApi, type PoligonoApi,
  type PoligonoDetalleApi, type RadioApi, type TrackApi,
} from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import type { OperativoOutletContext } from './OperativoLayout';
import Lienzo, { BASES, type Base, type Herr, type Overlays, type Seleccion, type Vuelo } from './mapa/Lienzo';
import Arbol, { type Abiertas } from './mapa/Arbol';
import { BarraHerramientas, Boton, Leyenda, type Herramienta, type ItemLeyenda } from './mapa/piezas';
import { GloboInstalacion, GloboMarcador, GloboPuntoCero, GloboTrack } from './mapa/Globos';
import { PanelInstalacion, PanelMarcador, PanelPoligono, PanelPuntoCero, PanelTrack } from './mapa/Paneles';
import {
  ModalCargarGpx, ModalEliminar, ModalNuevaInstalacion, ModalNuevoMarcador, ModalNuevoPoligono, ModalPuntoCero, ModalQuitarGrupo,
} from './mapa/Modales';
import { aPoligono, fmtDist, fmtRadio, formaArrastre, largo, type LatLng } from './mapa/geo';
import {
  COLOR_SIN_GRUPO, OVERLAYS_INICIALES, PALETA_RADIOS, aPoligonoVista, aTrackVista, colorDeGrupo, guardarPreferencias, leerPreferencias,
  type Preferencias,
} from './mapa/modelo';

const REFRESCO_MS = 20_000;
const CORDOBA: LatLng = [-31.4201, -64.1888];
const EN_TERRENO = ['DESPLEGADO', 'RASTRILLANDO'];

type Globo = { tipo: Seleccion['tipo']; id: string; latlng: LatLng; offset: number; k: number };
type ModalMapa =
  | { tipo: 'nuevoPoligono'; vertices: LatLng[] }
  | { tipo: 'gpx' }
  | { tipo: 'marcador'; ll: LatLng }
  | { tipo: 'instalacion'; ll: LatLng }
  | { tipo: 'puntoCero'; hasta: LatLng }
  | { tipo: 'eliminar'; que: 'poligono' | 'track' | 'marcador'; id: string; nombre: string; titulo: string; extra: string }
  | { tipo: 'quitarGrupo'; poligonoId: string; grupoId: string; grupo: string; estado: string; poligono: string };

const LEYENDA: ItemLeyenda[] = [
  { tipo: 'linea', color: '#2563EB', etiqueta: 'Track GPX (color del grupo)' },
  { tipo: 'area', color: '#16A34A', etiqueta: 'Polígono con grupo' },
  { tipo: 'areaPunteada', color: COLOR_SIN_GRUPO, etiqueta: 'Polígono sin grupo' },
  { tipo: 'anillo', color: '#7C3AED', etiqueta: 'Radio desde Punto Cero' },
  { tipo: 'brecha', etiqueta: 'Brecha sin recorrer' },
  { tipo: 'marcador', simbolo: 'puntoCero', etiqueta: 'Punto Cero (LSP)' },
  { tipo: 'marcador', simbolo: 'PUESTO_COMANDO', etiqueta: 'Puesto de Comando' },
  { tipo: 'marcador', simbolo: 'BASE', etiqueta: 'Otras instalaciones SCI' },
  { tipo: 'marcador', simbolo: 'HALLAZGO', etiqueta: 'Hallazgo' },
  { tipo: 'marcador', simbolo: 'POI', etiqueta: 'Punto de interés' },
];
const ICONO_BASE: Record<Base, LucideIcon> = { politico: MapaIcono, fisico: Mountain, satelital: Satellite };

const hora = () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const mensaje = (err: unknown, porDefecto: string) => (err instanceof ApiError ? err.message : porDefecto);

export default function Mapa() {
  const { operativo, recargarOperativo } = useOutletContext<OperativoOutletContext>();
  const opId = operativo.id;
  const soloLectura = operativo.estado === 'finalizado' || operativo.estado === 'eliminado';
  const requiereMotivo = operativo.estado !== 'nuevo';

  /* ── Datos ── */
  const [poligonosApiL, setPoligonos] = useState<PoligonoApi[]>([]);
  const [tracksApiL, setTracks] = useState<TrackApi[]>([]);
  const [marcadores, setMarcadores] = useState<MarcadorApi[]>([]);
  const [puntoCero, setPuntoCero] = useState<LatLng | null>(operativo.punto0 ? [operativo.punto0.lat, operativo.punto0.lng] : null);
  const [historialP0, setHistorialP0] = useState<MovimientoPuntoCeroApi[]>([]);
  const [radios, setRadios] = useState<RadioApi[]>([]);
  const [grupos, setGrupos] = useState<GrupoApi[]>([]);
  const [personal, setPersonal] = useState<PersonalOperativoApi[]>([]);
  const [cargado, setCargado] = useState(false);
  const [actualizado, setActualizado] = useState<string | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [p, t, m, pc, r, g, pe] = await Promise.all([
        poligonosApi.listar(opId), tracksApi.listar(opId), marcadoresApi.listar(opId), puntoCeroApi.obtener(opId),
        puntoCeroApi.listarRadios(opId), gruposApi.listar(opId), agentesOperativoApi.listar(opId),
      ]);
      setPoligonos(p.poligonos); setTracks(t.tracks); setMarcadores(m.marcadores);
      setPuntoCero(pc.puntoCero ? [pc.puntoCero.lat, pc.puntoCero.lng] : null); setHistorialP0(pc.historial);
      setRadios(r.radios); setGrupos(g.grupos); setPersonal(pe.personal);
      setActualizado(hora()); setErrorCarga(null);
    } catch (err) {
      setActualizado(null);
      setErrorCarga(mensaje(err, 'No se pudo cargar el mapa. Revisá la conexión.'));
    } finally { setCargado(true); }
  }, [opId]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') cargar(); }, REFRESCO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  const poligonos = useMemo(() => poligonosApiL.map(p => aPoligonoVista(p, grupos)), [poligonosApiL, grupos]);
  const tracks = useMemo(() => tracksApiL.map(t => aTrackVista(t, grupos)), [tracksApiL, grupos]);

  /* ── Preferencias de cada usuario (CU-31) ── */
  const [prefs, setPrefs] = useState<Preferencias>(() => leerPreferencias(opId));
  useEffect(() => { guardarPreferencias(opId, prefs); }, [opId, prefs]);
  const ocultos = useMemo(() => new Set(prefs.ocultos), [prefs.ocultos]);
  const setOv = (k: keyof Overlays, v: boolean) => setPrefs(p => ({ ...p, overlays: { ...p.overlays, [k]: v } }));
  const setBase = (b: Base) => setPrefs(p => ({ ...p, base: b }));
  const alternar = (id: string) => setPrefs(p => ({ ...p, ocultos: p.ocultos.includes(id) ? p.ocultos.filter(x => x !== id) : [...p.ocultos, id] }));
  const mostrar = (ids: string[], v: boolean) => setPrefs(p => ({ ...p, ocultos: v ? p.ocultos.filter(x => !ids.includes(x)) : [...new Set([...p.ocultos, ...ids])] }));

  /* ── Estado de la pantalla ── */
  const [herr, setHerr] = useState<Herr>('select');
  const [sel, setSel] = useState<Seleccion | null>(null);
  const [globo, setGlobo] = useState<Globo | null>(null);
  const [borrador, setBorrador] = useState<LatLng[]>([]);
  const [medida, setMedida] = useState<LatLng[]>([]);
  const [editVerts, setEditVerts] = useState<{ id: string; verts: LatLng[] } | null>(null);
  const [moviendo, setMoviendo] = useState<{ id: string; ll: LatLng } | null>(null);
  const [modal, setModal] = useState<ModalMapa | null>(null);
  const [izquierda, setIzquierda] = useState(true);
  const [inmersivo, setInmersivo] = useState(false);
  const [abiertas, setAbiertas] = useState<Abiertas>({ radios: true, poligonos: true, marcadores: false, tracks: false, ajustes: false });
  const [q, setQ] = useState('');
  const [gruposAbierto, setGruposAbierto] = useState(false);
  const [basePop, setBasePop] = useState(false);
  const [aviso, setAviso] = useState<{ msg: string; error?: boolean } | null>(null);
  const [vuelo, setVuelo] = useState<Vuelo | null>(null);
  const [guardandoModo, setGuardandoModo] = useState(false);
  const [detallePol, setDetallePol] = useState<PoligonoDetalleApi | null>(null);
  const [detalleTrack, setDetalleTrack] = useState<TrackApi | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const encuadreInicial = useRef(false);
  const tAviso = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const avisar = (msg: string, error = false) => {
    setAviso({ msg, error });
    clearTimeout(tAviso.current);
    tAviso.current = setTimeout(() => setAviso(null), error ? 5000 : 2800);
  };
  const volar = (pts: LatLng[], extra?: Partial<Vuelo>) => setVuelo({ pts, k: Math.random(), ...extra });
  const offsetDe = (t: Seleccion['tipo']) => (t === 'track' ? -4 : t === 'puntoCero' ? -42 : -38);
  const abrirGlobo = (tipo: Seleccion['tipo'], id: string, latlng: LatLng, conVuelo = false) => {
    const abrir = () => setGlobo({ tipo, id, latlng, offset: offsetDe(tipo), k: Math.random() });
    if (conVuelo) { setGlobo(null); volar([latlng], { luego: abrir }); } else abrir();
  };
  const cancelarModo = () => { setHerr('select'); setBorrador([]); setMedida([]); setEditVerts(null); setMoviendo(null); };

  /* Detalle del polígono o del track elegido (historial, enlace al .gpx). */
  const selPol = sel?.tipo === 'poligono' ? poligonos.find(p => p.id === sel.id) ?? null : null;
  const selTr = sel?.tipo === 'track' ? tracks.find(t => t.id === sel.id) ?? null : null;
  const selMk = sel?.tipo === 'marcador' ? marcadores.find(m => m.id === sel.id) ?? null : null;
  useEffect(() => {
    if (!selPol) { setDetallePol(null); return; }
    let vivo = true;
    poligonosApi.obtener(opId, selPol.id).then(r => { if (vivo) setDetallePol(r.poligono); }).catch(() => {});
    return () => { vivo = false; };
  }, [opId, selPol?.id, poligonosApiL]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selTr) { setDetalleTrack(null); return; }
    let vivo = true;
    tracksApi.obtener(opId, selTr.id).then(r => { if (vivo) setDetalleTrack(r.track); }).catch(() => {});
    return () => { vivo = false; };
  }, [opId, selTr?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Si otro usuario lo eliminó, se cierra solo.
  useEffect(() => {
    if (!cargado) return;
    if (sel && !(selPol || selTr || selMk || sel.tipo === 'puntoCero')) setSel(null);
    if (globo && globo.tipo !== 'puntoCero' && !(globo.tipo === 'track' ? tracks.some(t => t.id === globo.id) : marcadores.some(m => m.id === globo.id))) setGlobo(null);
  }, [poligonos, tracks, marcadores]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Encuadrar ── */
  const encuadrar = useCallback(() => {
    const pts: LatLng[] = [
      ...poligonos.flatMap(p => p.vertices),
      ...marcadores.map(m => [m.lat, m.lng] as LatLng),
      ...tracks.flatMap(t => t.puntos.filter((_, i) => i % 10 === 0)),
      ...(puntoCero ? [puntoCero] : []),
    ];
    if (pts.length) volar(pts);
  }, [poligonos, marcadores, tracks, puntoCero]);
  useEffect(() => {
    if (cargado && !encuadreInicial.current && mapRef.current) { encuadreInicial.current = true; encuadrar(); }
  }, [cargado, encuadrar]);

  /* ── Pantalla completa (el mapa solo) ── */
  useEffect(() => {
    const f = () => { if (!document.fullscreenElement) setInmersivo(false); };
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  const pantallaCompleta = () => {
    if (inmersivo) { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); setInmersivo(false); }
    else { raiz.current?.requestFullscreen?.().catch(() => {}); setInmersivo(true); }
  };

  /* ── Teclado: Esc cancela, Enter cierra el polígono ── */
  const terminarPoligono = () => {
    const v = borrador.filter((p, i) => i === 0 || largo([borrador[i - 1], p]) > 5);
    if (v.length >= 3) setModal({ tipo: 'nuevoPoligono', vertices: v });
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
      if (e.key === 'Escape' && !modal) { cancelarModo(); setGlobo(null); setBasePop(false); }
      if (e.key === 'Enter' && herr === 'poligono' && !modal) terminarPoligono();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  /* ── Clics en el mapa ── */
  const onClicMapa = (ll: LatLng) => {
    setBasePop(false);
    if (moviendo) { setMoviendo(m => (m ? { ...m, ll } : m)); return; }
    if (herr === 'poligono') setBorrador(d => [...d, ll]);
    else if (herr === 'circulo' || herr === 'cuadrado') return;
    else if (herr === 'medir') setMedida(m => [...m, ll]);
    else if (herr === 'poi') setModal({ tipo: 'marcador', ll });
    else if (herr === 'instalacion') setModal({ tipo: 'instalacion', ll });
    else if (herr === 'puntoCero') setModal({ tipo: 'puntoCero', hasta: ll });
    else if (!editVerts) { setGlobo(null); setSel(null); }
  };
  const onSeleccion = (s: Seleccion, ll: LatLng) => {
    if (s.tipo === 'poligono') { setSel(s); setGlobo(null); } else abrirGlobo(s.tipo, s.id, ll);
  };
  const elegirHerr = (id: string) => {
    const m = mapRef.current;
    if (id === 'home') { encuadrar(); return; }
    if (id === 'capas') { setBasePop(b => !b); return; }
    if (id === 'zin') { m?.zoomIn(); return; }
    if (id === 'zout') { m?.zoomOut(); return; }
    if (id === 'full') { pantallaCompleta(); return; }
    const nueva = (herr === id && id !== 'select' ? 'select' : id) as Herr;
    cancelarModo();
    setHerr(nueva);
    if (nueva !== 'select') setGlobo(null);
  };

  /* ── Acciones contra la API (cada una recarga y avisa) ── */
  const despues = async (msg: string) => { await cargar(); avisar(msg); };

  const crearPoligono = async (vertices: LatLng[], d: { nombre: string; grupoId: string | null; notas: string | null }) => {
    const r = await poligonosApi.crear(opId, { nombre: d.nombre, geometria: aPoligono(vertices), notas: d.notas ?? undefined, grupoId: d.grupoId ?? undefined });
    setModal(null); cancelarModo();
    setSel({ tipo: 'poligono', id: r.poligono.id });
    setAbiertas(a => ({ ...a, poligonos: true }));
    await despues(`Polígono «${r.poligono.nombre}» creado`);
  };
  const guardarPoligono = async (id: string, d: { nombre?: string; notas?: string | null }) => {
    await poligonosApi.actualizar(opId, id, d);
    await despues(d.notas !== undefined ? 'Nota guardada' : 'Nombre guardado');
  };
  const guardarForma = async () => {
    if (!editVerts) return;
    const original = poligonos.find(p => p.id === editVerts.id)?.vertices ?? [];
    if (original.length === editVerts.verts.length && original.every((v, i) => v[0] === editVerts.verts[i][0] && v[1] === editVerts.verts[i][1])) {
      setSel({ tipo: 'poligono', id: editVerts.id }); setEditVerts(null);
      return;
    }
    setGuardandoModo(true);
    try {
      await poligonosApi.actualizar(opId, editVerts.id, { geometria: aPoligono(editVerts.verts) });
      setSel({ tipo: 'poligono', id: editVerts.id }); setEditVerts(null);
      await despues('Forma guardada: la cobertura se recalculó');
    } catch (err) { avisar(mensaje(err, 'No se pudo guardar la forma.'), true); } finally { setGuardandoModo(false); }
  };
  const guardarUbicacion = async () => {
    if (!moviendo) return;
    setGuardandoModo(true);
    try {
      const r = await marcadoresApi.actualizar(opId, moviendo.id, { lat: moviendo.ll[0], lng: moviendo.ll[1] });
      setMoviendo(null);
      await despues(`${r.marcador.nombre} reubicada`);
      abrirGlobo('marcador', r.marcador.id, [r.marcador.lat, r.marcador.lng]);
    } catch (err) { avisar(mensaje(err, 'No se pudo reubicar.'), true); } finally { setGuardandoModo(false); }
  };
  const confirmarEliminar = async (m: Extract<ModalMapa, { tipo: 'eliminar' }>) => {
    if (m.que === 'poligono') await poligonosApi.eliminar(opId, m.id);
    if (m.que === 'track') await tracksApi.eliminar(opId, m.id);
    if (m.que === 'marcador') await marcadoresApi.eliminar(opId, m.id);
    setModal(null); setSel(null); setGlobo(null);
    await despues(`${m.nombre} eliminado del mapa`);
  };
  const agregarRadio = async (radioM: number) => {
    const usados = radios.map(r => r.color.toUpperCase());
    const color = PALETA_RADIOS.find(c => !usados.includes(c.toUpperCase())) ?? PALETA_RADIOS[radios.length % PALETA_RADIOS.length];
    try {
      await puntoCeroApi.crearRadio(opId, { radioM, color });
      setOv('radios', true);
      await despues(`Radio de ${fmtRadio(radioM)} agregado`);
    } catch (err) { avisar(mensaje(err, 'No se pudo agregar el radio.'), true); }
  };
  const cambiarRadio = async (id: string, d: { radioM?: number; color?: string }) => {
    try { await puntoCeroApi.actualizarRadio(opId, id, d); await cargar(); }
    catch (err) { avisar(mensaje(err, 'No se pudo cambiar el radio.'), true); await cargar(); }
  };
  const quitarRadio = async (r: RadioApi) => {
    try { await puntoCeroApi.eliminarRadio(opId, r.id); await despues(`Radio de ${fmtRadio(r.radioM)} quitado`); }
    catch (err) { avisar(mensaje(err, 'No se pudo quitar el radio.'), true); }
  };

  /* ── Globo ── */
  let contenidoGlobo: React.ReactNode = null;
  if (globo) {
    const cerrar = () => setGlobo(null);
    if (globo.tipo === 'track') {
      const t = tracks.find(x => x.id === globo.id);
      const pol = t && poligonos.find(p => p.id === t.poligonoId);
      if (t) contenidoGlobo = (
        <GloboTrack t={t} soloLectura={soloLectura} onClose={cerrar}
          onCorregir={() => { setSel({ tipo: 'track', id: t.id }); setGlobo(null); }}
          onPoligono={pol ? () => { setSel({ tipo: 'poligono', id: pol.id }); setGlobo(null); volar(pol.vertices, { panel: true }); } : null}
          onEliminar={() => { setGlobo(null); setModal({ tipo: 'eliminar', que: 'track', id: t.id, nombre: `El recorrido de ${t.agente}`, titulo: 'track GPX', extra: 'Deja de sumar a la cobertura de su polígono. El archivo original queda guardado.' }); }} />
      );
    }
    if (globo.tipo === 'marcador') {
      const m = marcadores.find(x => x.id === globo.id);
      if (m && m.clase === 'INSTALACION') contenidoGlobo = (
        <GloboInstalacion m={m} soloLectura={soloLectura} onClose={cerrar} onEditar={() => { setSel({ tipo: 'marcador', id: m.id }); setGlobo(null); }}
          onReubicar={() => { cancelarModo(); setGlobo(null); setSel(null); setMoviendo({ id: m.id, ll: [m.lat, m.lng] }); }} />
      );
      else if (m) contenidoGlobo = <GloboMarcador m={m} soloLectura={soloLectura} onClose={cerrar} onEditar={() => { setSel({ tipo: 'marcador', id: m.id }); setGlobo(null); }} />;
    }
    if (globo.tipo === 'puntoCero' && puntoCero) contenidoGlobo = (
      <GloboPuntoCero lat={puntoCero[0]} lng={puntoCero[1]} ultimo={historialP0[0] ?? null} soloLectura={soloLectura} onClose={cerrar}
        onActualizar={() => { setGlobo(null); setModal({ tipo: 'puntoCero', hasta: puntoCero }); }} />
    );
  }

  /* ── Lo que se dibuja (sin lo que el usuario ocultó) ── */
  const polDibujo = useMemo(() => poligonos.filter(p => !ocultos.has(p.id)).map(p => ({
    id: p.id, nombre: p.nombre, vertices: p.vertices, color: p.color, sinGrupo: !p.grupos.length, coberturaPct: p.coberturaPct, tracks: p.tracks, brechas: p.brechas ?? null,
  })), [poligonos, ocultos]);
  const trDibujo = useMemo(() => tracks.filter(t => !ocultos.has(t.id)).map(t => ({ id: t.id, puntos: t.puntos, color: t.color })), [tracks, ocultos]);
  const mkDibujo = useMemo(() => marcadores.filter(m => !ocultos.has(m.id)).map(m => ({
    id: m.id, simbolo: m.clase === 'INSTALACION' ? m.tipoInstalacion! : m.clase, nombre: m.nombre, lat: m.lat, lng: m.lng, esInstalacion: m.clase === 'INSTALACION',
  })), [marcadores, ocultos]);
  const radiosDibujo = useMemo(() => radios.filter(r => !ocultos.has(r.id)), [radios, ocultos]);
  const globoLienzo = useMemo(() => (globo ? { latlng: globo.latlng, offset: globo.offset, k: globo.k, clave: `${globo.tipo}:${globo.id}` } : null), [globo]);
  const esSel = (clave: string) => (sel ? `${sel.tipo}:${sel.id}` === clave : false) || (globo ? `${globo.tipo}:${globo.id}` === clave : false);

  const rail: Herramienta[] = [
    { id: 'select', icono: MousePointer2, etiqueta: 'Seleccionar' }, { id: 'medir', icono: Ruler, etiqueta: 'Medir distancia' },
    ...(soloLectura ? [] : [
      { sep: true } as const,
      { id: 'poligono', icono: Pentagon, etiqueta: 'Dibujar polígono (Enter cierra · Esc cancela)' },
      { id: 'circulo', icono: Circle, etiqueta: 'Polígono circular (pulsar y arrastrar)' },
      { id: 'cuadrado', icono: Square, etiqueta: 'Polígono cuadrado (pulsar y arrastrar)' },
      { sep: true } as const,
      { id: 'poi', icono: MapPinPlus, etiqueta: 'Punto de interés o hallazgo' },
      { id: 'instalacion', icono: Flag, etiqueta: 'Instalación SCI' },
      { id: 'puntoCero', icono: Crosshair, etiqueta: 'Mover Punto Cero' },
    ]),
    { sep: true }, { id: 'home', icono: House, etiqueta: 'Encuadrar el operativo' },
  ];
  const railVista: Herramienta[] = [
    { id: 'capas', icono: Layers, etiqueta: 'Mapa base' }, { sep: true },
    { id: 'zin', icono: Plus, etiqueta: 'Acercar' }, { id: 'zout', icono: Minus, etiqueta: 'Alejar' }, { sep: true },
    { id: 'full', icono: inmersivo ? Minimize : Maximize, etiqueta: inmersivo ? 'Salir de pantalla completa' : 'Pantalla completa' },
  ];
  const panel = !!(selPol || selTr || selMk || sel?.tipo === 'puntoCero') && !editVerts && !moviendo;
  const derecha = panel ? 352 : 12;
  const centro: LatLng = puntoCero ?? CORDOBA;

  if (!cargado) {
    return <div className="flex items-center justify-center h-full" style={{ color: 'var(--muted-foreground)' }}>Cargando el mapa…</div>;
  }

  return (
    <div ref={raiz} style={{ height: '100%', minHeight: 520, display: 'flex', position: 'relative', background: 'var(--background)' }}>
      {izquierda && (
        <Arbol q={q} setQ={setQ} abiertas={abiertas} setAbiertas={setAbiertas} overlays={prefs.overlays} setOv={setOv}
          ocultos={ocultos} alternar={alternar} mostrar={mostrar} radios={radios} puntoCero={puntoCero}
          poligonos={poligonos} tracks={tracks} marcadores={marcadores} esSel={esSel} soloLectura={soloLectura} actualizado={actualizado}
          onPoligono={p => { setSel({ tipo: 'poligono', id: p.id }); setGlobo(null); volar(p.vertices, { panel: true }); }}
          onTrack={t => { setSel(null); if (t.puntos.length) abrirGlobo('track', t.id, t.puntos[Math.floor(t.puntos.length / 2)], true); }}
          onMarcador={m => abrirGlobo('marcador', m.id, [m.lat, m.lng], true)}
          onPuntoCero={() => puntoCero && abrirGlobo('puntoCero', 'p0', puntoCero, true)}
          onAgregarRadio={agregarRadio} onRadio={cambiarRadio} onQuitarRadio={quitarRadio}
          onCargarGpx={() => setModal({ tipo: 'gpx' })}
          onRestablecer={() => { setPrefs(p => ({ ...p, overlays: OVERLAYS_INICIALES, base: 'satelital', ocultos: [] })); setQ(''); setGlobo(null); setSel(null); cancelarModo(); encuadrar(); }}
          onCerrar={() => setIzquierda(false)} />
      )}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <Lienzo centroInicial={centro} base={prefs.base} overlays={prefs.overlays}
          poligonos={polDibujo} tracks={trDibujo} marcadores={mkDibujo} puntoCero={puntoCero}
          radios={radiosDibujo} radiosCentro={modal?.tipo === 'puntoCero' ? modal.hasta : puntoCero} radiosVistaPrevia={modal?.tipo === 'puntoCero'}
          sel={sel} globo={globoLienzo} contenidoGlobo={contenidoGlobo}
          herr={herr} borrador={borrador} medida={medida} editVerts={editVerts} moviendo={moviendo} vuelo={vuelo} margenDerecho={panel ? 340 : 0}
          onReady={m => { mapRef.current = m; }}
          onClicMapa={onClicMapa} onDobleClic={() => { if (herr === 'poligono') terminarPoligono(); }}
          onForma={(t, a, b) => { if (largo([a, b]) > 5) setModal({ tipo: 'nuevoPoligono', vertices: formaArrastre(t, a, b) }); }}
          onSeleccion={onSeleccion} onMoverArrastre={ll => setMoviendo(m => (m ? { ...m, ll } : m))}
          onVertice={(i, ll) => setEditVerts(ev => { if (!ev) return ev; const v = ev.verts.slice(); v[i] = ll; return { ...ev, verts: v }; })} />

        {/* Arriba a la izquierda: mostrar el árbol y las herramientas */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 900, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!izquierda && (
            <button type="button" onClick={() => setIzquierda(true)} title="Mostrar panel" aria-label="Mostrar panel" style={{ width: 44, height: 44, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--card)', boxShadow: 'var(--elevation-md)', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PanelLeftOpen size={16} /></button>
          )}
          {prefs.overlays.herramientas && <BarraHerramientas herramientas={rail} activa={moviendo || editVerts ? null : herr} onSelect={elegirHerr} />}
        </div>

        {/* Arriba a la derecha: grupos operativos */}
        {prefs.overlays.gruposFlot && (
          <div style={{ position: 'absolute', top: 12, right: derecha, zIndex: 900, transition: 'right .2s' }}>
            <GruposFlotante grupos={grupos} poligonos={poligonos} abierto={gruposAbierto} setAbierto={setGruposAbierto}
              onGrupo={g => {
                const pol = poligonos.find(p => p.id === g.poligonoId);
                if (pol) { setSel({ tipo: 'poligono', id: pol.id }); setGlobo(null); volar(pol.vertices, { panel: true }); setGruposAbierto(false); }
                else avisar(`${g.nombre} no tiene polígono asignado`);
              }} />
          </div>
        )}

        {/* Abajo a la derecha: vista, mapa base y simbología */}
        {prefs.overlays.zoom && (
          <div style={{ position: 'absolute', bottom: 26, right: derecha, zIndex: 900, transition: 'right .2s' }}>
            <BarraHerramientas herramientas={railVista} activa={basePop ? 'capas' : inmersivo ? 'full' : null} onSelect={elegirHerr} />
            {basePop && (
              <div style={{ position: 'absolute', right: 54, top: 0, display: 'flex', gap: 6, padding: 6, background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)' }}>
                {BASES.map(b => {
                  const on = b.id === prefs.base;
                  const I = ICONO_BASE[b.id];
                  return (
                    <button key={b.id} type="button" aria-pressed={on} onClick={() => { setBase(b.id); setBasePop(false); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 72, padding: '8px 4px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border)'}`, background: on ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent', color: on ? 'var(--primary)' : 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 11, fontWeight: 600 }}>
                      <I size={16} />{b.etiqueta}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {prefs.overlays.leyenda && (
          <div style={{ position: 'absolute', bottom: 26, right: derecha + (prefs.overlays.zoom ? 58 : 0), zIndex: 900, transition: 'right .2s' }}>
            <Leyenda items={LEYENDA} abiertaInicial={window.innerHeight > 820} />
          </div>
        )}

        <BannerModo herr={herr} borrador={borrador} medida={medida} editando={!!editVerts} moviendo={!!moviendo} guardando={guardandoModo}
          onDeshacer={() => setBorrador(d => d.slice(0, -1))} onTerminar={terminarPoligono} onCancelar={cancelarModo} onLimpiar={() => setMedida([])}
          onGuardarForma={guardarForma} onGuardarUbicacion={guardarUbicacion} />

        {errorCarga && (
          <div role="alert" style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, padding: '8px 14px', borderRadius: 'var(--radius)', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontSize: 12.5 }}>
            {errorCarga} Se muestra lo último que se cargó.
          </div>
        )}
        {soloLectura && (
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 950, padding: '6px 14px', borderRadius: 'var(--radius)', background: 'rgba(0,0,0,0.72)', color: '#fff', fontSize: 12 }}>
            El operativo está {operativo.estado}: el mapa es de sólo lectura.
          </div>
        )}

        {/* Paneles de detalle */}
        {selPol && !editVerts && (
          <PanelPoligono pol={selPol} detalle={detallePol?.id === selPol.id ? detallePol : null} grupos={grupos} tracks={tracks} soloLectura={soloLectura}
            brechas={prefs.overlays.brechas} onToggleBrechas={() => setOv('brechas', !prefs.overlays.brechas)} onClose={() => setSel(null)}
            onGuardar={d => guardarPoligono(selPol.id, d)}
            onAsignar={async gid => { await poligonosApi.asignarGrupo(opId, selPol.id, gid); await despues(`${grupos.find(g => g.id === gid)?.nombre ?? 'Grupo'} asignado a ${selPol.nombre}`); }}
            onQuitar={async (gid, enTerreno) => {
              const g = selPol.grupos.find(x => x.id === gid)!;
              if (enTerreno) { setModal({ tipo: 'quitarGrupo', poligonoId: selPol.id, grupoId: gid, grupo: g.nombre, estado: g.estado, poligono: selPol.nombre }); return; }
              try { await poligonosApi.quitarGrupo(opId, selPol.id, gid); await despues(`${g.nombre} quitado de ${selPol.nombre}: vuelve a Confirmado`); }
              catch (err) { avisar(mensaje(err, 'No se pudo quitar el grupo.'), true); }
            }}
            onCambiar={async (gid, nuevo) => { await poligonosApi.cambiarGrupo(opId, selPol.id, gid, nuevo); await despues('Grupo cambiado'); }}
            onEditarForma={() => { cancelarModo(); setEditVerts({ id: selPol.id, verts: selPol.vertices.slice() }); }}
            onEliminar={() => setModal({
              tipo: 'eliminar', que: 'poligono', id: selPol.id, nombre: selPol.nombre, titulo: 'polígono',
              extra: selPol.grupos.some(g => EN_TERRENO.includes(g.estado))
                ? 'Tiene un grupo trabajando en el terreno: primero el grupo tiene que salir del polígono.'
                : `${selPol.grupos.length ? 'Los grupos asignados vuelven a Confirmado. ' : ''}${selPol.tracks ? 'Sus tracks quedan «Fuera de polígono».' : ''}`.trim() || 'No tiene grupos ni tracks.',
            })}
            onTrack={t => { if (t.puntos.length) abrirGlobo('track', t.id, t.puntos[Math.floor(t.puntos.length / 2)], true); }} />
        )}
        {selTr && (
          <PanelTrack t={selTr} detalle={detalleTrack?.id === selTr.id ? detalleTrack : null} poligonos={poligonos} soloLectura={soloLectura} onClose={() => setSel(null)}
            onGuardar={async d => { await tracksApi.actualizar(opId, selTr.id, d); await despues('Track corregido'); }}
            onEliminar={() => setModal({ tipo: 'eliminar', que: 'track', id: selTr.id, nombre: `El recorrido de ${selTr.agente}`, titulo: 'track GPX', extra: 'Deja de sumar a la cobertura de su polígono. El archivo original queda guardado.' })} />
        )}
        {selMk && selMk.clase !== 'INSTALACION' && (
          <PanelMarcador m={selMk} soloLectura={soloLectura} onClose={() => setSel(null)}
            onGuardar={async d => { await marcadoresApi.actualizar(opId, selMk.id, d); await despues(d.clase === 'HALLAZGO' ? 'Marcado como hallazgo' : 'Marcador actualizado'); }}
            onEliminar={() => setModal({ tipo: 'eliminar', que: 'marcador', id: selMk.id, nombre: selMk.nombre, titulo: 'punto de interés', extra: 'Se quita del mapa con sus fotos.' })}
            onSubirFotos={async f => { await marcadoresApi.subirFotos(opId, selMk.id, f); await despues(f.length === 1 ? 'Foto agregada' : `${f.length} fotos agregadas`); }}
            onQuitarFoto={async fid => { await marcadoresApi.eliminarFoto(opId, selMk.id, fid); await despues('Foto quitada'); }} />
        )}
        {selMk && selMk.clase === 'INSTALACION' && !moviendo && (
          <PanelInstalacion m={selMk} soloLectura={soloLectura} onClose={() => setSel(null)}
            onGuardar={async d => { await marcadoresApi.actualizar(opId, selMk.id, d); await despues('Instalación actualizada'); }}
            onReubicar={() => { cancelarModo(); setGlobo(null); setSel(null); setMoviendo({ id: selMk.id, ll: [selMk.lat, selMk.lng] }); }}
            onEliminar={() => setModal({ tipo: 'eliminar', que: 'marcador', id: selMk.id, nombre: selMk.nombre, titulo: 'instalación', extra: 'Se quita del mapa.' })} />
        )}
        {sel?.tipo === 'puntoCero' && puntoCero && (
          <PanelPuntoCero lat={puntoCero[0]} lng={puntoCero[1]} historial={historialP0} soloLectura={soloLectura} onClose={() => setSel(null)}
            onActualizar={() => { setSel(null); setModal({ tipo: 'puntoCero', hasta: puntoCero }); }} />
        )}

        {aviso && (
          <div role="status" style={{ position: 'absolute', left: '50%', bottom: 72, transform: 'translateX(-50%)', zIndex: 1200, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 'var(--radius)', background: 'var(--card)', border: `1px solid ${aviso.error ? '#fecaca' : 'var(--border)'}`, boxShadow: 'var(--elevation-md)', fontSize: 13, color: aviso.error ? '#b91c1c' : 'var(--foreground)', maxWidth: '80%' }}>
            {aviso.error ? <Info size={16} color="#dc2626" /> : <CircleCheck size={16} color="#16a34a" />}{aviso.msg}
          </div>
        )}
      </div>

      {/* Modales */}
      {modal?.tipo === 'nuevoPoligono' && (
        <ModalNuevoPoligono vertices={modal.vertices} grupos={grupos} n={poligonos.length + 1} onCancel={() => { setModal(null); cancelarModo(); }}
          onGuardar={d => crearPoligono(modal.vertices, d)} />
      )}
      {modal?.tipo === 'gpx' && (
        <ModalCargarGpx operativoId={opId} personal={personal} grupos={grupos} onCancel={() => setModal(null)}
          onCargado={async t => {
            setModal(null); setAbiertas(a => ({ ...a, tracks: true }));
            await despues(t.poligonoNombre ? `Recorrido cargado en ${t.poligonoNombre}` : 'Recorrido cargado fuera de polígono');
            const pts = (t.geometria?.coordinates ?? []).map(c => [c[1], c[0]] as LatLng);
            if (pts.length) abrirGlobo('track', t.id, pts[Math.floor(pts.length / 2)], true);
          }} />
      )}
      {modal?.tipo === 'marcador' && (
        <ModalNuevoMarcador ll={modal.ll} onCancel={() => { setModal(null); setHerr('select'); }}
          onGuardar={async d => {
            const r = await marcadoresApi.crear(opId, { ...d, lat: modal.ll[0], lng: modal.ll[1] });
            setModal(null); setHerr('select'); setAbiertas(a => ({ ...a, marcadores: true }));
            setSel({ tipo: 'marcador', id: r.marcador.id });
            await despues(`${d.clase === 'HALLAZGO' ? 'Hallazgo' : 'Punto de interés'} marcado`);
          }} />
      )}
      {modal?.tipo === 'instalacion' && (
        <ModalNuevaInstalacion ll={modal.ll} onCancel={() => { setModal(null); setHerr('select'); }}
          onGuardar={async d => {
            const r = await marcadoresApi.crear(opId, { clase: 'INSTALACION', ...d, lat: modal.ll[0], lng: modal.ll[1] });
            setModal(null); setHerr('select'); setAbiertas(a => ({ ...a, marcadores: true }));
            await despues(`${r.marcador.nombre} marcada en el mapa`);
            abrirGlobo('marcador', r.marcador.id, [r.marcador.lat, r.marcador.lng]);
          }} />
      )}
      {modal?.tipo === 'puntoCero' && puntoCero && (
        <ModalPuntoCero desde={puntoCero} hasta={modal.hasta} requiereMotivo={requiereMotivo}
          nRadios={prefs.overlays.radios ? radiosDibujo.length : 0}
          onCambio={ll => setModal(m => (m?.tipo === 'puntoCero' ? { ...m, hasta: ll } : m))}
          onCancel={() => { setModal(null); cancelarModo(); }}
          onConfirmar={async (ll, motivo) => {
            await puntoCeroApi.mover(opId, { lat: ll[0], lng: ll[1], motivo: motivo ?? undefined });
            setModal(null); setHerr('select');
            await despues('Punto Cero actualizado: los radios lo siguen');
            recargarOperativo();
            abrirGlobo('puntoCero', 'p0', ll);
          }} />
      )}
      {modal?.tipo === 'eliminar' && (
        <ModalEliminar tipo={modal.titulo} nombre={modal.nombre} extra={modal.extra} onCancel={() => setModal(null)} onConfirmar={() => confirmarEliminar(modal)} />
      )}
      {modal?.tipo === 'quitarGrupo' && (
        <ModalQuitarGrupo grupo={modal.grupo} estado={modal.estado} poligono={modal.poligono} onCancel={() => setModal(null)}
          onConfirmar={async () => {
            await poligonosApi.quitarGrupo(opId, modal.poligonoId, modal.grupoId, true);
            setModal(null);
            await despues(`${modal.grupo} quitado de ${modal.poligono}`);
          }} />
      )}
    </div>
  );
}

/* ── Grupos operativos (arriba a la derecha) ── */
function GruposFlotante({ grupos, poligonos, abierto, setAbierto, onGrupo }: {
  grupos: GrupoApi[]; poligonos: { id: string; nombre: string }[]; abierto: boolean; setAbierto: (v: boolean) => void; onGrupo: (g: GrupoApi) => void;
}) {
  const terreno = grupos.filter(g => ['DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO'].includes(g.estado)).length;
  return (
    <div style={{ width: 290, background: 'var(--card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)', overflow: 'hidden', fontFamily: 'var(--font-family-primary)' }}>
      <button type="button" onClick={() => setAbierto(!abierto)} aria-expanded={abierto} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-family-primary)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 0 3px #dcfce7', flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--foreground)' }}>Grupos operativos</span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)' }}>{terreno} en el terreno · {grupos.length - terreno} en la base</span>
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{grupos.length}</span>
        {abierto ? <ChevronUp size={15} color="var(--muted-foreground)" /> : <ChevronDown size={15} color="var(--muted-foreground)" />}
      </button>
      {abierto && (
        <div style={{ borderTop: '1px solid var(--border)', padding: 6, maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {grupos.map(g => {
            const pol = poligonos.find(p => p.id === g.poligonoId);
            return (
              <button key={g.id} type="button" onClick={() => onGrupo(g)} onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-family-primary)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: colorDeGrupo(grupos, g.id) ?? '#94a3b8', flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--foreground)' }}>{g.nombre}</span>
                  <span style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pol ? pol.nombre : 'Sin polígono'} · {g.integrantes.length} integrantes</span>
                </span>
                <StatusBadge estado={g.estado.toLowerCase()} size="sm" />
              </button>
            );
          })}
          {!grupos.length && <p style={{ margin: 0, padding: 8, fontSize: 12, color: 'var(--muted-foreground)' }}>Todavía no hay grupos armados.</p>}
        </div>
      )}
    </div>
  );
}

/* ── Banner del modo en curso (dibujar, medir, reubicar…) ── */
function BannerModo({ herr, borrador, medida, editando, moviendo, guardando, onDeshacer, onTerminar, onCancelar, onLimpiar, onGuardarForma, onGuardarUbicacion }: {
  herr: Herr; borrador: LatLng[]; medida: LatLng[]; editando: boolean; moviendo: boolean; guardando: boolean;
  onDeshacer: () => void; onTerminar: () => void; onCancelar: () => void; onLimpiar: () => void; onGuardarForma: () => void; onGuardarUbicacion: () => void;
}) {
  const blanco = { color: '#fff' };
  let txt: string | null = null;
  let acc: React.ReactNode = null;
  if (moviendo) { txt = 'Arrastrá el marcador o hacé clic donde se trasladó la instalación'; acc = <Boton icono={Check} disabled={guardando} onClick={onGuardarUbicacion}>{guardando ? 'Guardando…' : 'Guardar ubicación'}</Boton>; }
  else if (editando) { txt = 'Arrastrá los vértices para modificar el polígono'; acc = <Boton icono={Check} disabled={guardando} onClick={onGuardarForma}>{guardando ? 'Guardando…' : 'Guardar geometría'}</Boton>; }
  else if (herr === 'poligono') {
    txt = borrador.length < 3 ? `Hacé clic para marcar los vértices (${borrador.length}/3 como mínimo)` : 'Doble clic, Enter o clic en el primer vértice para cerrar';
    acc = <><Boton variante="ghost" icono={Undo2} disabled={!borrador.length} onClick={onDeshacer} style={blanco}>Deshacer</Boton><Boton icono={Check} disabled={borrador.length < 3} onClick={onTerminar}>Terminar</Boton></>;
  }
  else if (herr === 'circulo' || herr === 'cuadrado') txt = `Pulsá y arrastrá en el mapa para dibujar el polígono ${herr === 'circulo' ? 'circular' : 'cuadrado'} · Esc cancela`;
  else if (herr === 'medir') {
    txt = medida.length > 1 ? `Distancia total: ${fmtDist(largo(medida))} · ${medida.length - 1} tramos` : 'Hacé clic en el mapa para medir una distancia (no se guarda)';
    acc = medida.length ? <Boton variante="ghost" icono={Eraser} onClick={onLimpiar} style={blanco}>Limpiar</Boton> : null;
  }
  else if (herr === 'poi') txt = 'Hacé clic en el mapa para marcar el punto de interés o el hallazgo';
  else if (herr === 'instalacion') txt = 'Hacé clic en el mapa para ubicar la instalación';
  else if (herr === 'puntoCero') txt = 'Hacé clic en el mapa en el lugar nuevo del Punto Cero';
  if (!txt) return null;
  return (
    <div style={{ position: 'absolute', top: 12, left: 68, zIndex: 950, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 6px 6px 14px', borderRadius: 'var(--radius)', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 12, width: 'max-content', maxWidth: 'calc(100% - 390px)' }}>
      <Info size={14} /><span style={{ flex: '1 1 auto' }}>{txt}</span>{acc}
      <Boton variante="ghost" icono={X} onClick={onCancelar} style={{ color: '#fff', padding: '6px 8px' }} title="Cancelar (Esc)" />
    </div>
  );
}
