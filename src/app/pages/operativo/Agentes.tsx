import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useOutletContext } from 'react-router';
import {
  UserPlus, Users, Search, X, Check, Pencil, Trash2, ShieldCheck,
  LayoutGrid, List, AlertTriangle, Loader2, History, Plus,
} from 'lucide-react';
import { OperativoOutletContext } from './OperativoLayout';
import {
  agentesOperativoApi, gruposApi, usuariosApi, ApiError,
  PersonalOperativoApi, UsuarioApi,
} from '../../services/api';
import { formatearDni } from '../../utils/validacionUsuario';
import { haceCuanto } from '../../utils/tiempo';
import TableroGrupos, { type TableroGruposHandle } from './TableroGrupos';
import EditarAgenteModal, { EstadoOperativoBadge, ESTADO_OP_CONFIG } from '../../components/shared/EditarAgenteModal';
import LineaTiempoModal from '../../components/shared/LineaTiempoModal';
import FiltroDesplegable from '../../components/shared/FiltroDesplegable';
import AvatarAgente from '../../components/shared/AvatarAgente';
import { EstadoOperativoAgente, catEspecialidades } from '../../data/mockData';

/** Especialidades elegidas en el filtro: 'none' (sin especialidad) o el id de `cat_especialidades`. */

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

/** Dato con título chico arriba y valor legible abajo (tarjeta del agente). */
function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="uppercase tracking-wider" style={{ fontSize: '9.5px', fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)' }}>{titulo}</p>
      <p className="mt-0.5 truncate" style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)' }}>{children}</p>
    </div>
  );
}

/** Refresco de la grilla: mismo ritmo que el tablero de grupos (decisión del 22/09). */
const INTERVALO_MS = 10_000;

/**
 * CU-17..19 (Agentes de Operativo) y, en la pestaña Grupos, CU-21..26 — todo
 * contra la API real. CU-23 paso 1 ubica el tablero de grupos "dentro del menú
 * del Módulo de Agentes": por eso es una pestaña acá y no otra página.
 */
export default function Agentes() {
  const { operativo } = useOutletContext<OperativoOutletContext>();
  const [pestana, setPestana] = useState<'agentes' | 'grupos'>('agentes');
  const soloLectura = operativo.estado === 'finalizado' || operativo.estado === 'eliminado';
  const tableroRef = useRef<TableroGruposHandle>(null);

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

  // Consulta periódica sin el spinner de carga: un agente que se marca
  // No disponible desde su portal aparece acá en ≤10 s.
  useEffect(() => {
    if (pestana !== 'agentes') return;
    const id = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try { setAgentes((await agentesOperativoApi.listar(operativo.id)).personal); } catch { /* se reintenta en el próximo ciclo */ }
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [pestana, operativo.id]);

  // ── Búsqueda + filtro por estado táctico + vista ──
  const [vista, setVista] = useState<'cards' | 'list'>('cards');
  const [query, setQuery] = useState('');
  const [estadosSel, setEstadosSel] = useState<EstadoOperativoAgente[]>([]);
  const [especialidadesSel, setEspecialidadesSel] = useState<string[]>([]);
  const hayFiltros = estadosSel.length > 0 || especialidadesSel.length > 0;

  const filtrados = useMemo(() => {
    let list = [...agentes];
    if (estadosSel.length) list = list.filter(a => estadosSel.includes(a.estado?.toLowerCase() as EstadoOperativoAgente));
    if (especialidadesSel.length) {
      list = list.filter(a => especialidadesSel.some(f => (f === 'none' ? !a.especialidadId : a.especialidadId === f)));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(a =>
        `${a.nombre} ${a.apellido}`.toLowerCase().includes(q) ||
        a.dni.toLowerCase().includes(q) ||
        (a.especialidadNombre ?? '').toLowerCase().includes(q) ||
        (a.institucionNombre ?? '').toLowerCase().includes(q)
      );
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
    setLoadingUsuarios(true);
    try {
      const { usuarios: lista } = await usuariosApi.listar();
      setUsuarios(lista);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const idsEnOperativo = useMemo(() => new Set(agentes.map(a => a.usuarioId)), [agentes]);

  // Sólo agentes con cuenta ACTIVA (mismo gate que el alta por QR — CU-15
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
    return disponibles.filter(u =>
      `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) ||
      u.dni.toLowerCase().includes(q) ||
      (u.institucionNombre ?? '').toLowerCase().includes(q) ||
      (u.especialidadNombre ?? '').toLowerCase().includes(q)
    );
  }, [disponibles, busquedaUsuario]);

  const toggleSeleccion = (usuarioId: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(usuarioId)) next.delete(usuarioId);
      else next.add(usuarioId);
      return next;
    });
  };

  const handleAgregar = async () => {
    setAgregando(true);
    const pendientes = Array.from(seleccionados);
    const fallidos = new Set<string>();
    const erroresNuevos: Record<string, string> = {};
    for (const usuarioId of pendientes) {
      try {
        await agentesOperativoApi.agregar(operativo.id, { usuarioId });
      } catch (err) {
        fallidos.add(usuarioId);
        erroresNuevos[usuarioId] = err instanceof ApiError ? err.message : 'No se pudo agregar.';
      }
    }
    setSeleccionados(fallidos);
    setErroresAgregar(erroresNuevos);
    setAgregando(false);
    await cargarAgentes();
    if (fallidos.size === 0) setModalAdd(false);
  };

  // ── Editar (reutiliza EditarAgenteModal — CU-17) ──
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

  const fieldStyle = {
    background: 'var(--input-background)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
    fontFamily: 'var(--font-family-primary)',
    borderRadius: 'var(--radius-input)',
  };

  return (
    <div className="p-6 md:p-8" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="mb-1" style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)', color: 'var(--foreground)' }}>
            {pestana === 'grupos' ? 'Grupos' : 'Agentes'}
          </h1>
          <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
            {agentes.length} agente{agentes.length !== 1 ? 's' : ''} en el operativo
          </p>
        </div>
      </div>

      {/* Pestañas: el tablero de grupos vive dentro de Agentes (CU-23 paso 1). El
          botón de acción principal cambia con la pestaña, al mismo nivel que las tabs. */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div role="tablist" aria-label="Vista del personal" className="flex gap-1 p-1 rounded-[var(--radius-button)] w-fit"
          style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
          {([['agentes', 'Agentes'], ['grupos', 'Grupos']] as const).map(([valor, etiqueta]) => (
            <button key={valor} type="button" role="tab" aria-selected={pestana === valor}
              onClick={() => setPestana(valor)}
              className="px-4 py-1.5 rounded-[calc(var(--radius-button)-2px)]"
              style={{
                background: pestana === valor ? 'var(--card)' : 'transparent',
                color: pestana === valor ? 'var(--primary)' : 'var(--muted-foreground)',
                fontSize: 'var(--text-label)',
                fontWeight: pestana === valor ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                boxShadow: pestana === valor ? 'var(--elevation-sm)' : 'none',
                border: 'none', cursor: 'pointer',
              }}>
              {etiqueta}
            </button>
          ))}
        </div>

        {pestana === 'agentes' ? (
          <button
            onClick={abrirModalAdd}
            className="flex items-center gap-2 px-3 py-2 hover:opacity-90"
            style={{
              borderRadius: 'var(--radius-button)', fontSize: 'var(--text-label)',
              fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
              background: 'var(--primary)', color: 'var(--primary-foreground)',
            }}
          >
            <UserPlus size={15} />
            Agregar Agente
          </button>
        ) : !soloLectura && (
          <button
            type="button"
            onClick={() => tableroRef.current?.abrirCrear()}
            className="flex items-center gap-2 px-3 py-2 hover:opacity-90"
            style={{
              borderRadius: 'var(--radius-button)', fontSize: 'var(--text-label)',
              fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
              background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            Nuevo Grupo
          </button>
        )}
      </div>

      {pestana === 'grupos' ? (
        <TableroGrupos ref={tableroRef} operativoId={operativo.id} soloLectura={soloLectura} />
      ) : (
        <>
        {/* Toolbar: búsqueda + vista + filtro por estado */}
        {agentes.length > 0 && (
          <div
            className="flex flex-col gap-3 mb-5 p-4 rounded-[var(--radius-card)]"
            style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, DNI, dotación, especialidad..."
                  className="w-full pl-9 pr-9 py-2 rounded-[var(--radius-input)] border outline-none"
                  style={{ ...fieldStyle, fontSize: 'var(--text-base)' }}
                />
                {query && (
                  <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} aria-label="Limpiar búsqueda">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center rounded-[var(--radius-input)] p-0.5 flex-shrink-0" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                {([
                  { mode: 'cards' as const, icon: <LayoutGrid size={15} />, label: 'Tarjetas' },
                  { mode: 'list' as const, icon: <List size={15} />, label: 'Lista' },
                ]).map(({ mode, icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setVista(mode)}
                    title={label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded"
                    style={{
                      background: vista === mode ? 'var(--card)' : 'transparent',
                      color: vista === mode ? 'var(--primary)' : 'var(--muted-foreground)',
                      fontSize: 'var(--text-label)',
                      fontWeight: vista === mode ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                      boxShadow: vista === mode ? 'var(--elevation-sm)' : 'none',
                      border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filtros: píldoras desplegables, de selección múltiple. */}
            <div className="flex items-center gap-2 flex-wrap pt-1" style={{ borderTop: '1px solid var(--border)', margin: '0 -16px', padding: '10px 16px 0' }}>
              <span className="shrink-0" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Filtrar por:</span>
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
                  <button type="button" onClick={() => { setEstadosSel([]); setEspecialidadesSel([]); }}
                    style={{ fontSize: 'var(--text-label)', color: 'var(--primary)', fontWeight: 'var(--font-weight-semibold)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>
                    Limpiar filtros
                  </button>
                  <span className="ml-auto" style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                    {filtrados.length} de {agentes.length} agentes
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Listado */}
        {loadingAgentes ? (
          <div className="flex items-center justify-center py-16" style={{ color: 'var(--muted-foreground)' }}>
            <Loader2 size={20} className="animate-spin mr-2" /> Cargando agentes…
          </div>
        ) : agentes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-sm)' }}>
            <Users size={32} className="mb-3" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
            <p className="mb-1" style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>Sin agentes asignados</p>
            <p className="mb-4" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Agregá agentes al operativo.</p>
            <button onClick={abrirModalAdd} className="px-4 py-2" style={{ borderRadius: 'var(--radius-button)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
              Agregar Agente
            </button>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 rounded-[var(--radius-card)]" style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}>
            <Search size={20} style={{ color: 'var(--muted-foreground)' }} className="mb-3" />
            <p className="mb-1" style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>Sin resultados</p>
            <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Ningún agente coincide con los filtros aplicados.</p>
          </div>
        ) : vista === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtrados.map(agente => (
              <div key={agente.id} className="p-4" style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-sm)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <AvatarAgente esDuar={agente.esDuar} esConductor={agente.esConductor} esRecursoCritico={agente.esRecursoCritico} tamano={40} />
                    <div>
                      <p style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>{agente.nombre} {agente.apellido}</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>DNI: {formatearDni(agente.dni)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setHistoria(agente)} className="p-1 rounded transition-colors" title="Línea de tiempo" aria-label={`Línea de tiempo de ${agente.nombre} ${agente.apellido}`} style={{ color: 'var(--muted-foreground)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.08)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <History size={13} />
                    </button>
                    <button onClick={() => setEditUsuarioId(agente.usuarioId)} className="p-1 rounded transition-colors" title="Editar datos operativos" style={{ color: 'var(--muted-foreground)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.08)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => { setQuitarTarget(agente); setErrorQuitar(null); }} className="p-1 rounded" title="Quitar del operativo" style={{ color: 'var(--muted-foreground)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#dc2626'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; }}>
                      <X size={13} />
                    </button>
                  </div>
                </div>
                {agente.estado && (
                  <div className="mb-3 flex items-center gap-1.5">
                    <EstadoOperativoBadge estado={agente.estado.toLowerCase() as EstadoOperativoAgente} size="xs" />
                    <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>
                      {haceCuanto(agente.estadoActualizadoEn)}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <Dato titulo="Dotación"><Dotacion agente={agente} /></Dato>
                  <Dato titulo="Especialidad">
                    {agente.especialidadNombre ?? <span style={{ color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-normal)' }}>Sin especialidad</span>}
                  </Dato>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden" style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-sm)' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                    {['Agente', 'Estado Op.', 'Dotación', 'Especialidad', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 uppercase tracking-wider" style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((agente, idx) => (
                    <tr key={agente.id} style={{ borderBottom: idx < filtrados.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <AvatarAgente esDuar={agente.esDuar} esConductor={agente.esConductor} esRecursoCritico={agente.esRecursoCritico} tamano={32} />
                          <div>
                            <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-medium)' }}>{agente.nombre} {agente.apellido}</p>
                            <p style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>{formatearDni(agente.dni)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {agente.estado ? (
                          <div className="flex items-center gap-1.5">
                            <EstadoOperativoBadge estado={agente.estado.toLowerCase() as EstadoOperativoAgente} size="xs" />
                            <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>
                              {haceCuanto(agente.estadoActualizadoEn)}
                            </span>
                          </div>
                        ) : <span style={{ color: 'var(--muted-foreground)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: 'var(--text-base)' }}><Dotacion agente={agente} /></td>
                      <td className="px-4 py-3" style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)' }}>
                        {agente.especialidadNombre ?? <span style={{ color: 'var(--muted-foreground)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setHistoria(agente)} className="p-1.5 rounded-lg transition-colors" title="Línea de tiempo" aria-label={`Línea de tiempo de ${agente.nombre} ${agente.apellido}`} style={{ color: 'var(--muted-foreground)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.08)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; }}>
                            <History size={14} />
                          </button>
                          <button onClick={() => setEditUsuarioId(agente.usuarioId)} className="p-1.5 rounded-lg transition-colors" title="Editar datos operativos" style={{ color: 'var(--muted-foreground)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.08)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => { setQuitarTarget(agente); setErrorQuitar(null); }} className="p-1.5 rounded-lg transition-colors" title="Quitar del operativo" style={{ color: 'var(--muted-foreground)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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

      {/* ── MODAL: Editar Agente (datos operativos, CU-17) ── */}
      {agenteEnEdicion && (
        <EditarAgenteModal
          agente={agenteEnEdicion}
          operativoId={operativo.id}
          onClose={() => setEditUsuarioId(null)}
          onSaved={cargarAgentes}
        />
      )}

      {/* ── MODAL: Agregar Agente ── */}
      {modalAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={e => { if (e.target === e.currentTarget && !agregando) setModalAdd(false); }}>
          <div className="w-full flex flex-col" style={{ maxWidth: 580, maxHeight: '85vh', background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-md)', overflow: 'hidden' }}>
            <div className="flex items-center justify-between flex-shrink-0" style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>Agregar Agentes al Operativo</h2>
                <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', marginTop: 2 }}>
                  {loadingUsuarios ? 'Cargando…' : `${disponibles.length} agente${disponibles.length !== 1 ? 's' : ''} disponible${disponibles.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <button onClick={() => !agregando && setModalAdd(false)} style={{ color: 'var(--muted-foreground)', padding: 4, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div className="flex-shrink-0" style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>
              <div className="relative">
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, apellido, DNI, dotación, especialidad…"
                  value={busquedaUsuario}
                  onChange={e => setBusquedaUsuario(e.target.value)}
                  autoFocus
                  className="w-full outline-none"
                  style={{ paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, ...fieldStyle, fontSize: 'var(--text-base)' }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ padding: '12px 24px' }}>
              {loadingUsuarios ? (
                <div className="flex items-center justify-center py-12" style={{ color: 'var(--muted-foreground)' }}>
                  <Loader2 size={20} className="animate-spin mr-2" /> Cargando…
                </div>
              ) : disponibles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ gap: 8 }}>
                  <Users size={28} style={{ color: 'var(--muted-foreground)', opacity: 0.35 }} />
                  <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>No hay agentes disponibles para agregar.</p>
                </div>
              ) : disponiblesFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ gap: 8 }}>
                  <Search size={24} style={{ color: 'var(--muted-foreground)', opacity: 0.35 }} />
                  <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Sin resultados para "{busquedaUsuario}"</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {disponiblesFiltrados.map(u => {
                    const isSelected = seleccionados.has(u.id);
                    const error = erroresAgregar[u.id];
                    return (
                      <div key={u.id}>
                        <button
                          onClick={() => toggleSeleccion(u.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                            borderRadius: 'var(--radius-input)',
                            border: error ? '1.5px solid #dc2626' : isSelected ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                            background: isSelected ? 'rgba(229,75,75,0.04)' : 'var(--background)',
                            cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'border-color 0.13s, background 0.13s',
                          }}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: u.esDuar ? 'var(--primary)' : 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 'var(--font-weight-bold)' }}>
                            {u.nombre.charAt(0)}{u.apellido.charAt(0)}
                          </div>
                          <div style={{ flex: '0 0 auto', minWidth: 150 }}>
                            <p style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{u.nombre} {u.apellido}</p>
                            {u.institucionNombre && <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: 1 }}>{u.institucionNombre}</p>}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                            {u.especialidadNombre && (
                              <span style={{ fontSize: '10px', fontWeight: 'var(--font-weight-semibold)', background: 'var(--muted)', color: 'var(--muted-foreground)', borderRadius: 999, padding: '2px 7px' }}>{u.especialidadNombre}</span>
                            )}
                          </div>
                          <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border)', background: isSelected ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.13s' }}>
                            {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                          </div>
                        </button>
                        {error && (
                          <p className="mt-1" style={{ fontSize: '11px', color: '#dc2626', paddingLeft: 12 }}>{error}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between flex-shrink-0" style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
              <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                {seleccionados.size > 0
                  ? <span style={{ color: 'var(--primary)', fontWeight: 'var(--font-weight-semibold)' }}>{seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}</span>
                  : 'Seleccioná uno o más agentes'}
              </p>
              <div className="flex gap-2">
                <button onClick={() => !agregando && setModalAdd(false)} style={{ padding: '8px 16px', borderRadius: 'var(--radius-button)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button
                  onClick={handleAgregar}
                  disabled={seleccionados.size === 0 || agregando}
                  className="flex items-center gap-2"
                  style={{
                    padding: '8px 20px', borderRadius: 'var(--radius-button)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)',
                    background: 'var(--primary)', color: 'var(--primary-foreground)',
                    opacity: seleccionados.size === 0 || agregando ? 0.55 : 1,
                    cursor: seleccionados.size === 0 || agregando ? 'not-allowed' : 'pointer', border: 'none', transition: 'opacity 0.15s',
                  }}
                >
                  {agregando && <Loader2 size={14} className="animate-spin" />}
                  {seleccionados.size > 1 ? `Agregar ${seleccionados.size} agentes` : 'Agregar agente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Confirmar baja del operativo ── */}
      {quitarTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={e => { if (e.target === e.currentTarget && !quitando) setQuitarTarget(null); }}>
          <div className="w-full rounded-[var(--radius-card)] overflow-hidden" style={{ maxWidth: 420, background: 'var(--card)', boxShadow: 'var(--elevation-md)' }}>
            <div className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fee2e2' }}>
                <AlertTriangle size={17} style={{ color: '#dc2626' }} />
              </div>
              <div>
                <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>Quitar del operativo</p>
                <p className="mt-1" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', lineHeight: 1.5 }}>
                  <strong>{quitarTarget.nombre} {quitarTarget.apellido}</strong> deja de figurar como agente activo de este operativo. Su cuenta y su historial no se ven afectados.
                </p>
                {errorQuitar && <p className="mt-2" style={{ color: '#dc2626', fontSize: 'var(--text-label)' }}>{errorQuitar}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <button onClick={() => !quitando && setQuitarTarget(null)} className="flex-1 py-2.5 rounded-[var(--radius-button)]" style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmarQuitar} disabled={quitando} className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-[var(--radius-button)]" style={{ background: '#dc2626', color: '#fff', fontSize: 'var(--text-base)', border: 'none', fontWeight: 'var(--font-weight-semibold)', cursor: quitando ? 'default' : 'pointer', opacity: quitando ? 0.7 : 1 }}>
                {quitando && <Loader2 size={14} className="animate-spin" />}
                Quitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
