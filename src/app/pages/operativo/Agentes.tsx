import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useOutletContext } from 'react-router';
import { UserPlus, Users, Search, X, Check, Pencil, ShieldCheck, AlertTriangle, Loader2, History, Plus } from 'lucide-react';
import { OperativoOutletContext } from './OperativoLayout';
import {
  agentesOperativoApi, gruposApi, usuariosApi, ApiError,
  PersonalOperativoApi, UsuarioApi,
} from '../../services/api';
import { toast } from 'sonner';
import { formatearDni } from '../../utils/validacionUsuario';
import { haceCuanto } from '../../utils/tiempo';
import TableroGrupos, { type TableroGruposHandle } from './TableroGrupos';
import EditarAgenteModal, { ESTADO_OP_CONFIG } from '../../components/shared/EditarAgenteModal';
import EstadoAgenteBadge from '../../components/shared/EstadoAgenteBadge';
import LineaTiempoModal from '../../components/shared/LineaTiempoModal';
import FiltroDesplegable from '../../components/shared/FiltroDesplegable';
import AvatarAgente from '../../components/shared/AvatarAgente';
import Button from '../../components/shared/base/Button';
import Modal from '../../components/shared/base/Modal';
import {
  Buscador, SelectorVista, BarraFiltros, BotonTextoFiltro, Vacio, BotonIcono, Dato, TablaFija,
  tarjetaBase, type VistaListado,
} from '../../components/shared/Listados';
import { useVistaListado } from '../../components/shared/Listados';
import { useApp } from '../../context/AppContext';
import { EstadoOperativoAgente, catEspecialidades } from '../../data/mockData';

/** Especialidades en el orden del filtro: primero las de rastrillaje, después los recursos especiales. */
const ESPECIALIDADES_FILTRO = [
  ...catEspecialidades.filter(e => !e.esRecursoCritico),
  ...catEspecialidades.filter(e => e.esRecursoCritico),
];

/** Dotación / institución. El personal del DUAR lleva el escudo. */
function Dotacion({ agente }: { agente: PersonalOperativoApi }) {
  if (!agente.institucionNombre) return <span style={{ color: 'var(--muted-foreground)' }}>—</span>;
  return (
    <span className="inline-flex items-center gap-1" style={{ color: 'var(--foreground)' }}>
      {agente.esDuar && <ShieldCheck size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
      {agente.institucionNombre}
    </span>
  );
}

/** Estado según el grupo (llega coherente del servidor, Regla 1) + hace cuánto. */
function EstadoConTiempo({ agente }: { agente: PersonalOperativoApi }) {
  if (!agente.estado) return <span style={{ color: 'var(--muted-foreground)' }}>—</span>;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <EstadoAgenteBadge estado={agente.estado.toLowerCase() as EstadoOperativoAgente} size="sm" />
      <span style={{ fontSize: 'calc(10.5px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{haceCuanto(agente.estadoActualizadoEn)}</span>
    </div>
  );
}

/**
 * Orden de los resultados de una búsqueda (Testeo 25/10, punto 34): primero los que tienen un
 * nombre o apellido que empieza con lo buscado, después los que lo contienen en el nombre, y al
 * final los que coinciden por DNI, dotación o especialidad. Dentro de cada grupo, por apellido.
 */
function ordenarPorNombre<T extends { nombre: string; apellido: string }>(lista: T[], q: string): T[] {
  const puntaje = (p: T) => {
    const palabras = `${p.nombre} ${p.apellido}`.toLowerCase().split(/\s+/);
    if (palabras.some(w => w.startsWith(q)) || `${p.nombre} ${p.apellido}`.toLowerCase().startsWith(q)) return 0;
    return `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ? 1 : 2;
  };
  return [...lista].sort((a, b) => puntaje(a) - puntaje(b) || a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
}

/** Refresco de la grilla: mismo ritmo que el tablero de grupos (decisión del 22/09). */
const INTERVALO_MS = 10_000;

/**
 * CU-18..20 (Agentes de Operativo) y, en la sección Grupos, CU-22..27 — todo
 * contra la API real. CU-24 paso 1 ubica el tablero de grupos "dentro del menú
 * del Módulo de Agentes": por eso es la misma pantalla con otra dirección.
 */
export default function Agentes() {
  const { operativo } = useOutletContext<OperativoOutletContext>();
  const { usuario } = useApp();
  // Agentes y Grupos son dos secciones del menú del operativo (diseño CALÍVAR, 23/10): la dirección dice cuál.
  const pestana: 'agentes' | 'grupos' = useLocation().pathname.endsWith('/grupos') ? 'grupos' : 'agentes';
  const soloLectura = operativo.estado === 'finalizado' || operativo.estado === 'eliminado';
  const tableroRef = useRef<TableroGruposHandle>(null);
  const [cantGrupos, setCantGrupos] = useState<number | null>(null);

  const [agentes, setAgentes] = useState<PersonalOperativoApi[]>([]);
  /** De quién se está mirando la línea de tiempo (su día en el operativo). */
  const [historia, setHistoria] = useState<PersonalOperativoApi | null>(null);
  const [loadingAgentes, setLoadingAgentes] = useState(true);

  const cargarAgentes = useCallback(async () => {
    setLoadingAgentes(true);
    try {
      const { personal } = await agentesOperativoApi.listar(operativo.id);
      setAgentes(personal);
    } finally {
      setLoadingAgentes(false);
    }
  }, [operativo.id]);

  useEffect(() => { cargarAgentes(); }, [cargarAgentes]);
  /** Los agentes ya vistos (para avisar sólo de los que llegan por QR entre consultas). */
  const idsVistos = useRef<Set<string>>(new Set());
  useEffect(() => { idsVistos.current = new Set(agentes.map(a => a.id)); }, [agentes]);

  // Consulta periódica sin el spinner de carga: un agente que se marca
  // No disponible desde su portal aparece acá en ≤10 s.
  useEffect(() => {
    if (pestana !== 'agentes') return;
    const id = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { personal } = await agentesOperativoApi.listar(operativo.id);
        // Quien aparece entre una consulta y otra se sumó solo (alta por QR, CU-16): se avisa.
        const antes = idsVistos.current;
        personal.filter(a => !antes.has(a.id)).forEach(a => toast(`Nuevo agente dado de alta por QR: ${a.nombre} ${a.apellido}`));
        setAgentes(personal);
      } catch { /* se reintenta en el próximo ciclo */ }
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [pestana, operativo.id]);

  // ── Búsqueda + filtros + vista ──
  const [vista, setVista] = useVistaListado('agentes', usuario?.id);
  const [query, setQuery] = useState('');
  const [estadosSel, setEstadosSel] = useState<EstadoOperativoAgente[]>([]);
  const [especialidadesSel, setEspecialidadesSel] = useState<string[]>([]);
  const hayFiltros = estadosSel.length > 0 || especialidadesSel.length > 0;
  const limpiar = () => { setQuery(''); setEstadosSel([]); setEspecialidadesSel([]); };

  const filtrados = useMemo(() => {
    let list = [...agentes];
    if (estadosSel.length) list = list.filter(a => estadosSel.includes(a.estado?.toLowerCase() as EstadoOperativoAgente));
    if (especialidadesSel.length) {
      list = list.filter(a => especialidadesSel.some(f => (f === 'none' ? !a.especialidadId : a.especialidadId === f)));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = ordenarPorNombre(list.filter(a =>
        `${a.nombre} ${a.apellido}`.toLowerCase().includes(q) ||
        a.dni.toLowerCase().includes(q) ||
        (a.especialidadNombre ?? '').toLowerCase().includes(q) ||
        (a.institucionNombre ?? '').toLowerCase().includes(q)
      ), q);
    }
    return list;
  }, [agentes, estadosSel, especialidadesSel, query]);

  // ── Modal: Agregar Agente ──
  const [modalAdd, setModalAdd] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioApi[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [erroresAgregar, setErroresAgregar] = useState<Record<string, string>>({});
  const [agregando, setAgregando] = useState(false);

  const abrirModalAdd = async () => {
    setModalAdd(true);
    setBusquedaUsuario('');
    setSeleccionados(new Set());
    setErroresAgregar({});
    setATrasladar({});
    setLoadingUsuarios(true);
    try {
      const { usuarios: lista } = await usuariosApi.listar();
      setUsuarios(lista);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const idsEnOperativo = useMemo(() => new Set(agentes.map(a => a.usuarioId)), [agentes]);

  // Sólo agentes con cuenta ACTIVA (mismo gate que el alta por QR — CU-16
  // paso 6.1: PENDIENTE/INACTIVO no puede quedar operando).
  const disponibles = useMemo(() =>
    usuarios.filter(u =>
      u.rol.toLowerCase() === 'agente' &&
      u.estado.toLowerCase() === 'activo' &&
      !idsEnOperativo.has(u.id)
    ), [usuarios, idsEnOperativo]);

  const disponiblesFiltrados = useMemo(() => {
    const q = busquedaUsuario.trim().toLowerCase();
    if (!q) return disponibles;
    return ordenarPorNombre(disponibles.filter(u =>
      `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) ||
      u.dni.toLowerCase().includes(q) ||
      (u.institucionNombre ?? '').toLowerCase().includes(q) ||
      (u.especialidadNombre ?? '').toLowerCase().includes(q)
    ), q);
  }, [disponibles, busquedaUsuario]);

  const toggleSeleccion = (usuarioId: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(usuarioId)) next.delete(usuarioId);
      else next.add(usuarioId);
      return next;
    });
  };

  /**
   * Regla de Ubicuidad (CU-18): el que ya está en otro operativo vuelve con el aviso y queda
   * seleccionado; el siguiente «Agregar» lo traslada (abandonarAnterior). Antes el aviso
   * preguntaba pero no había forma de confirmar (Testeo 25/10, punto 39).
   */
  const [aTrasladar, setATrasladar] = useState<Record<string, string>>({});   // usuarioId → título del operativo actual

  const handleAgregar = async () => {
    setAgregando(true);
    const pendientes = Array.from(seleccionados);
    const fallidos = new Set<string>();
    const erroresNuevos: Record<string, string> = {};
    const trasladosNuevos: Record<string, string> = {};
    for (const usuarioId of pendientes) {
      try {
        await agentesOperativoApi.agregar(operativo.id, { usuarioId, ...(aTrasladar[usuarioId] ? { abandonarAnterior: true } : {}) });
      } catch (err) {
        fallidos.add(usuarioId);
        if (err instanceof ApiError && err.motivo === 'regla_ubicuidad') {
          trasladosNuevos[usuarioId] = String((err.datos.operativoActual as { titulo?: string } | undefined)?.titulo ?? 'otro operativo');
        } else {
          erroresNuevos[usuarioId] = err instanceof ApiError ? err.message : 'No se pudo agregar.';
        }
      }
    }
    setSeleccionados(fallidos);
    setErroresAgregar(erroresNuevos);
    setATrasladar(trasladosNuevos);
    setAgregando(false);
    await cargarAgentes();
    if (fallidos.size === 0) setModalAdd(false);
  };

  // ── Editar (reutiliza EditarAgenteModal — CU-18) ──
  const [editUsuarioId, setEditUsuarioId] = useState<string | null>(null);
  const agenteEnEdicion = agentes.find(a => a.usuarioId === editUsuarioId) ?? null;

  // ── Quitar del operativo (baja lógica — no toca al Usuario) ──
  const [quitarTarget, setQuitarTarget] = useState<PersonalOperativoApi | null>(null);
  const [quitando, setQuitando] = useState(false);
  const [errorQuitar, setErrorQuitar] = useState<string | null>(null);

  const confirmarQuitar = async () => {
    if (!quitarTarget) return;
    setQuitando(true);
    setErrorQuitar(null);
    try {
      await agentesOperativoApi.quitar(operativo.id, quitarTarget.usuarioId);
      setQuitarTarget(null);
      await cargarAgentes();
    } catch (err) {
      setErrorQuitar(err instanceof ApiError ? err.message : 'No se pudo quitar. Intentá de nuevo.');
    } finally {
      setQuitando(false);
    }
  };

  const acciones = (a: PersonalOperativoApi) => (
    <div className="flex items-center gap-0.5 shrink-0">
      <BotonIcono icono={History} title="Línea de tiempo" onClick={() => setHistoria(a)} />
      <BotonIcono icono={Pencil} title="Editar datos operativos" onClick={() => setEditUsuarioId(a.usuarioId)} />
      <BotonIcono icono={X} tono="peligro" title="Quitar del operativo" onClick={() => { setQuitarTarget(a); setErrorQuitar(null); }} />
    </div>
  );

  const subtitulo = pestana === 'grupos'
    ? (cantGrupos === null ? 'Cargando grupos…' : `${cantGrupos} grupo${cantGrupos !== 1 ? 's' : ''} en el operativo`)
    : `${agentes.length} agente${agentes.length !== 1 ? 's' : ''} en el operativo`;

  return (
    <div className="p-4 lg:p-6" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Título de la sección y su acción principal (en mobile el botón queda sólo con el ícono) */}
      <div className="sec-cabecera flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="min-w-0">
          <h1 className="mb-1" style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)', color: 'var(--foreground)' }}>
            {pestana === 'grupos' ? 'Grupos' : 'Agentes'}
          </h1>
          <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>{subtitulo}</p>
        </div>

        {pestana === 'agentes' ? (
          <Button size="lg" icon={UserPlus} onClick={abrirModalAdd} aria-label="Agregar Agente">Agregar Agente</Button>
        ) : !soloLectura && (
          <Button size="lg" icon={Plus} onClick={() => tableroRef.current?.abrirCrear()} aria-label="Nuevo Grupo">Nuevo Grupo</Button>
        )}
      </div>

      {pestana === 'grupos' ? (
        <TableroGrupos ref={tableroRef} operativoId={operativo.id} soloLectura={soloLectura} onCantidad={setCantGrupos} />
      ) : (
        <>
        {/* Buscador, vista y filtros por estado y especialidad (selección múltiple; vacío = todos) */}
        {agentes.length > 0 && (
          <div className="mb-5" style={tarjetaBase}>
            <div className="flex items-center gap-3" style={{ padding: '16px 16px 12px' }}>
              <Buscador value={query} onChange={setQuery} placeholder="Buscar por nombre, DNI, dotación, especialidad..." />
              <SelectorVista value={vista} onChange={setVista} />
            </div>
            <BarraFiltros>
              <FiltroDesplegable<EstadoOperativoAgente> titulo="Estado" seleccion={estadosSel} onCambiar={setEstadosSel} opciones={
                (Object.keys(ESTADO_OP_CONFIG) as EstadoOperativoAgente[]).map(k => ({
                  value: k,
                  label: ESTADO_OP_CONFIG[k].label,
                  dot: ESTADO_OP_CONFIG[k].dot,
                  count: agentes.filter(a => a.estado?.toLowerCase() === k).length,
                }))
              } />
              <FiltroDesplegable<string> titulo="Especialidad" seleccion={especialidadesSel} onCambiar={setEspecialidadesSel} opciones={[
                ...ESPECIALIDADES_FILTRO.map(e => ({ value: e.id, label: e.nombre, count: agentes.filter(a => a.especialidadId === e.id).length })),
                { value: 'none', label: 'Sin especialidad', count: agentes.filter(a => !a.especialidadId).length },
              ]} />
              {hayFiltros && (
                <>
                  <BotonTextoFiltro onClick={() => { setEstadosSel([]); setEspecialidadesSel([]); }}>Limpiar filtros</BotonTextoFiltro>
                  <span className="ml-auto" style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
                    {filtrados.length} de {agentes.length} agentes
                  </span>
                </>
              )}
            </BarraFiltros>
          </div>
        )}

        {/* Listado */}
        {loadingAgentes && agentes.length === 0 ? (
          <div className="flex items-center justify-center py-16" style={{ ...tarjetaBase, color: 'var(--muted-foreground)' }}>
            <Loader2 size={20} className="animate-spin mr-2" /> Cargando agentes…
          </div>
        ) : agentes.length === 0 ? (
          <Vacio icono={Users} titulo="Sin agentes asignados" texto="Agregá agentes al operativo o compartí el QR de acceso."
            accion={<Button size="md" icon={UserPlus} onClick={abrirModalAdd}>Agregar Agente</Button>} />
        ) : filtrados.length === 0 ? (
          <Vacio icono={Search} titulo="Sin resultados" texto="Ningún agente coincide con los filtros aplicados."
            accion={<Button variant="muted" size="md" icon={X} onClick={limpiar}>Limpiar filtros</Button>} />
        ) : vista === 'card' ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(290px, 100%), 1fr))' }}>
            {filtrados.map(agente => (
              <div key={agente.id} style={{ ...tarjetaBase, padding: 16 }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarAgente esDuar={agente.esDuar} esConductor={agente.esConductor} esRecursoCritico={agente.esRecursoCritico} tamano={40} />
                    <div className="min-w-0">
                      <p className="truncate" style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--foreground)' }}>{agente.nombre} {agente.apellido}</p>
                      <p className="truncate" style={{ margin: 0, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>DNI {formatearDni(agente.dni)}</p>
                    </div>
                  </div>
                  {acciones(agente)}
                </div>
                <div className="mt-3"><EstadoConTiempo agente={agente} /></div>
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <Dato titulo="Dotación"><Dotacion agente={agente} /></Dato>
                  <Dato titulo="Especialidad">
                    {agente.especialidadNombre ?? <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>Sin especialidad</span>}
                  </Dato>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <TablaFija cols={[{ l: 'Agente', w: 270 }, { l: 'Estado Op.', w: 250 }, { l: 'Dotación', w: 230 }, { l: 'Especialidad', w: 180 }, { l: '', w: 130 }]}>
            <tbody>
              {filtrados.map((agente, i) => (
                <tr key={agente.id} style={{ borderBottom: i < filtrados.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 'var(--text-base)', color: 'var(--foreground)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarAgente esDuar={agente.esDuar} esConductor={agente.esConductor} esRecursoCritico={agente.esRecursoCritico} tamano={32} />
                      <div className="min-w-0">
                        <p className="truncate" style={{ margin: 0, fontWeight: 500 }}>{agente.nombre} {agente.apellido}</p>
                        <p className="truncate" style={{ margin: 0, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{formatearDni(agente.dni)}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><EstadoConTiempo agente={agente} /></td>
                  <td className="truncate" style={{ padding: '12px 16px' }}><Dotacion agente={agente} /></td>
                  <td className="truncate" style={{ padding: '12px 16px' }}>{agente.especialidadNombre ?? <span style={{ color: 'var(--muted-foreground)' }}>—</span>}</td>
                  <td style={{ padding: '12px 16px' }}>{acciones(agente)}</td>
                </tr>
              ))}
            </tbody>
          </TablaFija>
        )}
        </>
      )}

      {/* ── MODAL: Línea de tiempo del agente ── */}
      {historia && (
        <LineaTiempoModal vista="agente" titulo={`${historia.nombre} ${historia.apellido}`}
          subtitulo="Su día en el operativo: cuándo llegó, en qué grupo estuvo y cada cambio de estado."
          cargar={() => gruposApi.lineaTiempoAgente(operativo.id, historia.id).then(r => r.eventos)}
          onClose={() => setHistoria(null)} />
      )}

      {/* ── MODAL: Editar Agente (datos operativos, CU-18) ── */}
      {agenteEnEdicion && (
        <EditarAgenteModal
          agente={agenteEnEdicion}
          operativoId={operativo.id}
          onClose={() => setEditUsuarioId(null)}
          onSaved={cargarAgentes}
        />
      )}

      {/* ── MODAL: Agregar Agente ── */}
      <Modal open={modalAdd} title="Agregar Agentes al Operativo" icon={UserPlus} width={580}
        subtitle={loadingUsuarios ? 'Cargando…' : `${disponibles.length} agente${disponibles.length !== 1 ? 's' : ''} disponible${disponibles.length !== 1 ? 's' : ''}`}
        onClose={() => { if (!agregando) setModalAdd(false); }}
        footer={<>
          <p className="mr-auto" style={{ margin: 0, fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
            {seleccionados.size > 0
              ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}</span>
              : 'Seleccioná uno o más agentes'}
          </p>
          <Button variant="outline" size="md" onClick={() => !agregando && setModalAdd(false)}>Cancelar</Button>
          <Button size="md" icon={agregando ? Loader2 : undefined} onClick={handleAgregar} disabled={seleccionados.size === 0 || agregando}>
            {Array.from(seleccionados).some(id => aTrasladar[id])
              ? 'Confirmar traslado'
              : seleccionados.size > 1 ? `Agregar ${seleccionados.size} agentes` : 'Agregar agente'}
          </Button>
        </>}>
        <div className="mb-3"><Buscador value={busquedaUsuario} onChange={setBusquedaUsuario} placeholder="Buscar por nombre, apellido, DNI, dotación, especialidad…" /></div>
        {loadingUsuarios ? (
          <div className="flex items-center justify-center py-12" style={{ color: 'var(--muted-foreground)' }}>
            <Loader2 size={20} className="animate-spin mr-2" /> Cargando…
          </div>
        ) : disponibles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Users size={28} style={{ color: 'var(--muted-foreground)', opacity: 0.35 }} />
            <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>No hay agentes disponibles para agregar.</p>
          </div>
        ) : disponiblesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Search size={24} style={{ color: 'var(--muted-foreground)', opacity: 0.35 }} />
            <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Sin resultados para "{busquedaUsuario}"</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {disponiblesFiltrados.map(u => {
              const isSelected = seleccionados.has(u.id);
              const error = erroresAgregar[u.id];
              return (
                <div key={u.id}>
                  <button type="button" onClick={() => toggleSeleccion(u.id)} aria-pressed={isSelected}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', width: '100%', textAlign: 'left', cursor: 'pointer',
                      borderRadius: 'var(--radius-input)', fontFamily: 'var(--font-family-primary)',
                      border: error ? '1.5px solid var(--destructive)' : aTrasladar[u.id] && isSelected ? '1.5px solid #d97706' : isSelected ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                      background: isSelected ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : 'var(--background)',
                      transition: 'border-color .13s, background .13s',
                    }}>
                    <AvatarAgente esDuar={u.esDuar} esConductor={false} esRecursoCritico={false} tamano={38} iniciales={`${u.nombre.charAt(0)}${u.apellido.charAt(0)}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate" style={{ margin: 0, fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--foreground)' }}>{u.nombre} {u.apellido}</p>
                      <p className="truncate" style={{ margin: '1px 0 0', fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
                        {[u.institucionNombre, u.especialidadNombre].filter(Boolean).join(' · ') || 'Sin dotación'}
                      </p>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border)', background: isSelected ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .13s' }}>
                      {isSelected && <Check size={12} color="var(--primary-foreground)" strokeWidth={3} />}
                    </div>
                  </button>
                  {error && <p className="mt-1" style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--destructive)', paddingLeft: 12 }}>{error}</p>}
                  {aTrasladar[u.id] && isSelected && (
                    <p className="mt-1" style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #92400e)', paddingLeft: 12 }}>
                      Ya está en el operativo «{aTrasladar[u.id]}». Si confirmás, deja ese operativo y pasa a este.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* ── MODAL: Confirmar baja del operativo ── */}
      <Modal open={!!quitarTarget} title="Quitar del operativo" icon={AlertTriangle} width={420}
        onClose={() => { if (!quitando) setQuitarTarget(null); }}
        footer={<>
          <Button variant="outline" size="md" onClick={() => !quitando && setQuitarTarget(null)}>Cancelar</Button>
          <Button variant="danger" size="md" icon={quitando ? Loader2 : undefined} onClick={confirmarQuitar} disabled={quitando}>Quitar</Button>
        </>}>
        {quitarTarget && (
          <>
            <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--foreground)' }}>{quitarTarget.nombre} {quitarTarget.apellido}</strong> deja de figurar como agente activo de este operativo. Su cuenta y su historial no se ven afectados.
            </p>
            {errorQuitar && <p className="mt-2" style={{ color: 'var(--destructive)', fontSize: 'var(--text-label)' }}>{errorQuitar}</p>}
          </>
        )}
      </Modal>
    </div>
  );
}
