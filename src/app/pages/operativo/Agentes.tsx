import { useState, useMemo } from 'react';
import { useParams } from 'react-router';
import { Plus, X, Trash2, UserPlus, Users, Shuffle, ShieldCheck, AlertTriangle, CheckCircle2, Info, LayoutGrid, List, Search, Check, Pencil, UserRoundPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Especialidad, EstadoGrupo, Usuario, AgenteOperativo, catEspecialidades, catInstituciones, dotacionesDe, puedeSerLider, institucionLabel } from '../../data/mockData';
import GruposDnD from './GruposDnD';
import EditarAgenteModal, { EstadoOperativoBadge } from '../../components/shared/EditarAgenteModal';

type ModalType = 'addAgente' | 'createGrupo' | 'editGrupo' | 'deleteGrupo' | 'autoAsignar' | null;
type EstadoAgenteFilter = 'all' | 'sin_estado' | 'disponible' | 'desplegado' | 'rastrillando' | 'descansando' | 'en_espera' | 'replegado';
type EspecialidadAgenteFilter = 'all' | Especialidad | 'sin_especialidad';

const COLORS = ['#E54B4B', '#FFA987', '#444140', '#c0392b', '#d4886a', '#7c3aed', '#0891b2'];
const NOMBRES_GRUPOS = ['Alfa', 'Beta', 'Delta', 'Gamma', 'Epsilon', 'Zeta', 'Eta'];

// La regla del Líder ahora se lee del catálogo (cat_instituciones.es_duar),
// nunca de un match de texto sobre la dotación.
const isDUAR = (u: Usuario) => puedeSerLider(u);

interface GrupoPreview {
  nombre: string;
  color: string;
  liderId: string;
  miembrosIds: string[];
}

export default function Agentes() {
  const { id } = useParams<{ id: string }>();
  const {
    getOperativo, data,
    addAgenteToOperativo, removeAgenteFromOperativo,
    addGrupo, updateGrupo, deleteGrupo, updateOperativo, addUsuario,
  } = useApp();

  const [modal, setModal] = useState<ModalType>(null);
  const [editAgenteId, setEditAgenteId] = useState<string | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<string | null>(null);
  const [grupoForm, setGrupoForm] = useState({
    nombre: '', lider: '', color: COLORS[0], estado: 'en_formacion' as EstadoGrupo,
  });
  const [newAgenteId, setNewAgenteId] = useState('');
  const [selectedAgenteIds, setSelectedAgenteIds] = useState<Set<string>>(new Set());
  const [agenteSearch, setAgenteSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'agentes' | 'grupos'>('agentes');
  const [agentesView, setAgentesView] = useState<'cards' | 'list'>('cards');
  const [agentesQuery, setAgentesQuery] = useState('');
  const [estadoFilter,       setEstadoFilter]       = useState<EstadoAgenteFilter>('all');
  const [especialidadFilter, setEspecialidadFilter] = useState<EspecialidadAgenteFilter>('all');

  // Confirmación de agregar agentes
  const [showConfirmAdd, setShowConfirmAdd] = useState(false);

  // Crear agente rápido (modal sobre el modal addAgente)
  const [showCrearAgente, setShowCrearAgente] = useState(false);
  const emptyCrearForm = { nombre: '', apellido: '', dni: '', email: '', especialidad: '' as Especialidad | '', grupo_sanguineo: '', institucionId: '', dotacionId: '' };
  const [crearForm, setCrearForm] = useState(emptyCrearForm);
  const [crearErrors, setCrearErrors] = useState<Record<string, string>>({});

  const handleCrearAgente = () => {
    const errs: Record<string, string> = {};
    if (!crearForm.nombre.trim()) errs.nombre = 'Requerido';
    if (!crearForm.apellido.trim()) errs.apellido = 'Requerido';
    if (!crearForm.dni.trim()) errs.dni = 'Requerido';
    if (!crearForm.email.trim()) errs.email = 'Requerido';
    if (Object.keys(errs).length) { setCrearErrors(errs); return; }

    addUsuario({
      nombre: crearForm.nombre.trim(),
      apellido: crearForm.apellido.trim(),
      dni: crearForm.dni.trim(),
      email: crearForm.email.trim(),
      password: crearForm.dni.trim(),
      rol: 'agente',
      estado: 'activo',
      institucionId: crearForm.institucionId || undefined,
      dotacionId: crearForm.dotacionId || undefined,
      especialidad: (crearForm.especialidad as Especialidad) || undefined,
      grupo_sanguineo: crearForm.grupo_sanguineo || undefined,
      // `caminante` es TÁCTICO: lo infiere addAgenteToOperativo al dar el alta.
    });

    setCrearForm(emptyCrearForm);
    setCrearErrors({});
    setShowCrearAgente(false);
  };

  // Auto-asignación state
  const [numGruposAuto, setNumGruposAuto] = useState(2);
  const [autoResult, setAutoResult] = useState<'idle' | 'success'>('idle');

  const operativo = getOperativo(id!);
  if (!operativo) return null;

  // Los usuarios eliminados son invisibles — filtrarlos en todos los contextos
  const agentes = data.usuarios.filter(u =>
    u.estado !== 'eliminado' && operativo.agenteIds.includes(u.id)
  );

  // ── Datos TÁCTICOS de este operativo, indexados por usuario (Decisión A) ──
  // El estado, el caminante/conductor y el override de especialidad NO viven en
  // el Usuario global: se leen de su AgenteOperativo.
  const tacticoPorUsuario = new Map<string, AgenteOperativo>();
  data.agentesOperativo
    .filter(ao => ao.operativoId === id && !ao.fechaEgreso)
    .forEach(ao => tacticoPorUsuario.set(ao.usuarioId, ao));

  const tactico = (usuarioId: string): AgenteOperativo | undefined =>
    tacticoPorUsuario.get(usuarioId);
  /** Especialidad efectiva: la táctica del operativo sobrescribe a la global. */
  const especialidadDe = (u: Usuario): Especialidad | undefined =>
    tactico(u.id)?.especialidad ?? u.especialidad;
  // Vista activa: excluye disueltos (CU-25). Siguen en operativo.grupoIds
  // como registro histórico, pero no se muestran ni se pueden operar.
  const grupos = data.grupos.filter(g => operativo.grupoIds.includes(g.id) && g.estado !== 'disuelto');
  const disponibles = data.usuarios.filter(u =>
    u.rol === 'agente' &&
    u.estado !== 'eliminado' &&
    !operativo.agenteIds.includes(u.id)
  );

  const enOtroOperativo = (userId: string) =>
    data.operativos.some(op =>
      op.id !== id &&
      op.estado !== 'finalizado' &&
      op.estado !== 'eliminado' &&
      op.agenteIds.includes(userId)
    );

  // Filtered agents for the main list (toolbar search + filter pills)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredAgentes = useMemo(() => {
    let list = [...agentes];
    // Estado operativo
    if (estadoFilter === 'sin_estado') list = list.filter(a => !tactico(a.id)?.estado);
    else if (estadoFilter !== 'all') list = list.filter(a => tactico(a.id)?.estado === estadoFilter);
    // Especialidad
    if (especialidadFilter === 'sin_especialidad') list = list.filter(a => !especialidadDe(a));
    else if (especialidadFilter !== 'all')          list = list.filter(a => especialidadDe(a) === especialidadFilter);
    // Text search
    if (agentesQuery.trim()) {
      const q = agentesQuery.toLowerCase();
      list = list.filter(a =>
        `${a.nombre} ${a.apellido}`.toLowerCase().includes(q) ||
        a.dni.toLowerCase().includes(q) ||
        (a.email ?? '').toLowerCase().includes(q) ||
        institucionLabel(a).toLowerCase().includes(q) ||
        (a.especialidad ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [agentes, estadoFilter, especialidadFilter, agentesQuery]);

  // Filtered disponibles for the search modal
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredDisponibles = useMemo(() => {
    const q = agenteSearch.trim().toLowerCase();
    if (!q) return disponibles;
    return disponibles.filter(u =>
      `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) ||
      u.dni.toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      institucionLabel(u).toLowerCase().includes(q) ||
      (u.especialidad ?? '').toLowerCase().includes(q)
    );
  }, [agenteSearch, disponibles]);

  // Classify for auto-assignment
  const agentesActivos = agentes.filter(a => a.estado === 'activo');
  const duarAgentes = agentesActivos.filter(isDUAR);
  const otrosAgentes = agentesActivos.filter(a => !isDUAR(a));
  const maxGruposAuto = Math.max(1, duarAgentes.length);
  const numGruposEfectivo = Math.min(numGruposAuto, maxGruposAuto);

  // Preview computation (derived directly - fast enough without memo)
  const computePreview = (): GrupoPreview[] => {
    if (duarAgentes.length === 0) return [];
    const n = numGruposEfectivo;
    const groups: GrupoPreview[] = Array.from({ length: n }, (_, i) => ({
      nombre: `Grupo ${NOMBRES_GRUPOS[i] ?? `${i + 1}`}`,
      color: COLORS[i % COLORS.length],
      liderId: duarAgentes[i].id,
      miembrosIds: [duarAgentes[i].id],
    }));
    const remaining = [...duarAgentes.slice(n), ...otrosAgentes];
    remaining.forEach((agente, idx) => {
      groups[idx % n].miembrosIds.push(agente.id);
    });
    return groups;
  };
  const preview: GrupoPreview[] = computePreview();

  const handleApplyAutoAsignar = () => {
    if (preview.length === 0) return;

    // CU-25: verificar ANTES de mutar nada, para no dejar una disolución a
    // medio camino si un grupo está rastrillando en el terreno.
    const grupoBloqueado = grupos.find(g => g.estado === 'rastrillando');
    if (grupoBloqueado) {
      alert(`No se puede reasignar: el grupo "${grupoBloqueado.nombre}" está Rastrillando en el terreno. Debe cambiar su estado a Replegado primero.`);
      return;
    }

    // Disolución lógica de todos los grupos existentes del operativo (CU-25)
    operativo.grupoIds.forEach(gid => deleteGrupo(gid));
    // Create new groups
    const newIds: string[] = [];
    preview.forEach(p => {
      const newId = addGrupo({
        nombre: p.nombre,
        lider: p.liderId,
        agenteIds: p.miembrosIds,
        estado: 'en_formacion',
        color: p.color,
        kmRecorridos: 0,
      });
      newIds.push(newId);
    });
    updateOperativo(id!, { grupoIds: newIds });
    setAutoResult('success');
    setTimeout(() => {
      setModal(null);
      setAutoResult('idle');
      setActiveTab('grupos');
    }, 1400);
  };

  const handleAddAgente = () => {
    if (selectedAgenteIds.size > 0) {
      selectedAgenteIds.forEach(aId => addAgenteToOperativo(id!, aId));
      setSelectedAgenteIds(new Set());
      setAgenteSearch('');
      setNewAgenteId('');
      setModal(null);
    } else if (newAgenteId) {
      addAgenteToOperativo(id!, newAgenteId);
      setNewAgenteId('');
      setModal(null);
    }
  };

  const toggleAgenteSelection = (agenteId: string) => {
    setSelectedAgenteIds(prev => {
      const next = new Set(prev);
      if (next.has(agenteId)) next.delete(agenteId);
      else next.add(agenteId);
      return next;
    });
  };

  const handleCreateGrupo = () => {
    if (!grupoForm.nombre || !grupoForm.lider) return;
    // Validate: leader must be DUAR
    const liderUser = data.usuarios.find(u => u.id === grupoForm.lider);
    if (liderUser && !isDUAR(liderUser)) {
      alert('El Líder de Grupo debe pertenecer al DUAR.');
      return;
    }
    // addGrupo is atomic: it removes the leader (and all agenteIds) from any other group
    // in the same setData call, so no race condition is possible.
    const newId = addGrupo({
      nombre: grupoForm.nombre,
      lider: grupoForm.lider,
      agenteIds: [grupoForm.lider],
      estado: grupoForm.estado,
      color: grupoForm.color,
      kmRecorridos: 0,
    });
    updateOperativo(id!, { grupoIds: [...operativo.grupoIds, newId] });
    setModal(null);
  };

  const handleEditGrupo = () => {
    if (!selectedGrupo || !grupoForm.nombre) return;
    const liderUser = data.usuarios.find(u => u.id === grupoForm.lider);
    if (liderUser && !isDUAR(liderUser)) {
      alert('El Líder de Grupo debe pertenecer al DUAR.');
      return;
    }
    // updateGrupo is atomic: if the leader changed, it removes the new leader from any other
    // group they belong to in the same setData call — no separate cleanup needed.
    updateGrupo(selectedGrupo, grupoForm);
    setModal(null);
  };

  const handleDeleteGrupo = () => {
    if (!selectedGrupo) return;
    const resultado = deleteGrupo(selectedGrupo);
    if (resultado === 'bloqueado') {
      alert('No se puede disolver un grupo activo en el terreno. Debe cambiar su estado a Replegado primero.');
      return; // deja el modal de confirmación abierto
    }
    // El grupo permanece en operativo.grupoIds a propósito: es el registro
    // histórico que el informe final necesita (CU-25). La vista activa lo
    // filtra por estado, no por pertenencia al operativo.
    setModal(null);
  };

  const openEditGrupo = (gid: string) => {
    const g = data.grupos.find(gr => gr.id === gid);
    if (!g) return;
    setSelectedGrupo(gid);
    setGrupoForm({ nombre: g.nombre, lider: g.lider, color: g.color, estado: g.estado });
    setModal('editGrupo');
  };

  const fieldStyle = {
    background: 'var(--input-background)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
    fontFamily: 'var(--font-family-primary)',
    borderRadius: 'var(--radius-input)',
  };

  // 'conductor' ya no figura: dejó de ser especialidad (es un booleano táctico).
  const especialidadColor: Record<string, string> = {
    'paramédico': '#0891b2',
    'bombero': '#dc2626',
    'bombero voluntario': '#ea580c',
    'canes': '#65a30d',
    'defensa civil': '#0284c7',
    'dron': '#7c3aed',
  };

  // DUAR-eligible agents in the operativo (for leader selection in manual creation)
  const duarAgentesEnOperativo = agentes.filter(isDUAR);

  // IDs of DUAR agents who are already leading a group in this operativo
  const lideresActuales = new Set(grupos.map(g => g.lider).filter(Boolean));

  // For "create grupo" modal: exclude agents already leading any group
  const duarDisponiblesParaNuevoLider = duarAgentesEnOperativo.filter(
    a => !lideresActuales.has(a.id)
  );

  // For "edit grupo" modal: exclude leaders of OTHER groups (allow re-selecting the current group's leader)
  const currentGroupLider = selectedGrupo
    ? data.grupos.find(g => g.id === selectedGrupo)?.lider ?? ''
    : '';
  const duarDisponiblesParaEditarLider = duarAgentesEnOperativo.filter(
    a => !lideresActuales.has(a.id) || a.id === currentGroupLider
  );

  return (
    <div className="p-6 md:p-8" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1
            className="mb-1"
            style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)', color: 'var(--foreground)' }}
          >
            Agentes y Grupos
          </h1>
          <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
            {agentes.length} agentes · {grupos.length} grupos de rastrillaje
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {activeTab === 'agentes' && (
            <button
              onClick={() => { setSelectedAgenteIds(new Set()); setAgenteSearch(''); setModal('addAgente'); }}
              className="flex items-center gap-2 px-3 py-2 hover:opacity-90"
              style={{
                borderRadius: 'var(--radius-button)',
                fontSize: 'var(--text-label)',
                fontWeight: 'var(--font-weight-semibold)',
                fontFamily: 'var(--font-family-primary)',
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
            >
              <UserPlus size={15} />
              Agregar Agente
            </button>
          )}
          {activeTab === 'grupos' && (
            <>
              <button
                onClick={() => { setNumGruposAuto(Math.min(2, maxGruposAuto)); setAutoResult('idle'); setModal('autoAsignar'); }}
                className="flex items-center gap-2 px-3 py-2 transition-colors hover:opacity-80"
                style={{
                  borderRadius: 'var(--radius-button)',
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                  background: 'var(--secondary)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                }}
              >
                <Shuffle size={15} />
                Asignación Automática
              </button>
              <button
                onClick={() => { setGrupoForm({ nombre: '', lider: '', color: COLORS[0], estado: 'en_formacion' }); setModal('createGrupo'); }}
                className="flex items-center gap-2 px-3 py-2 hover:opacity-90"
                style={{
                  borderRadius: 'var(--radius-button)',
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                }}
              >
                <Plus size={15} />
                Nuevo Grupo
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center mb-5">
        <div
          className="flex gap-1 p-1 rounded-lg w-fit"
          style={{ background: 'var(--muted)' }}
        >
          {(['agentes', 'grupos'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-md capitalize transition-all"
              style={{
                fontSize: 'var(--text-label)',
                fontWeight: 'var(--font-weight-medium)',
                fontFamily: 'var(--font-family-primary)',
                background: activeTab === tab ? 'var(--card)' : 'transparent',
                color: activeTab === tab ? 'var(--foreground)' : 'var(--muted-foreground)',
                boxShadow: activeTab === tab ? 'var(--elevation-sm)' : 'none',
              }}
            >
              {tab === 'agentes' ? `Agentes (${agentes.length})` : `Grupos (${grupos.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Agentes Toolbar: Search + Filter pills + View Toggle ── */}
      {activeTab === 'agentes' && agentes.length > 0 && (
        <div
          className="flex flex-col gap-3 mb-5 p-4 rounded-[var(--radius-card)]"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)', border: '1px solid var(--border)' }}
        >
          {/* Row 1: search + view toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--muted-foreground)' }}
              />
              <input
                type="text"
                value={agentesQuery}
                onChange={e => setAgentesQuery(e.target.value)}
                placeholder="Buscar por nombre, DNI, dotación, especialidad..."
                className="w-full pl-9 pr-9 py-2 rounded-[var(--radius-input)] border outline-none transition-all"
                style={{
                  background: 'var(--input-background)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-family-primary)',
                  fontSize: 'var(--text-base)',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
              {agentesQuery && (
                <button
                  onClick={() => setAgentesQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* View mode toggle */}
            <div
              className="flex items-center rounded-[var(--radius-input)] p-0.5 flex-shrink-0"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              {([
                { mode: 'cards' as const, icon: <LayoutGrid size={15} />, label: 'Tarjetas' },
                { mode: 'list' as const, icon: <List size={15} />, label: 'Lista' },
              ]).map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setAgentesView(mode)}
                  title={label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded"
                  style={{
                    background: agentesView === mode ? 'var(--card)' : 'transparent',
                    color: agentesView === mode ? 'var(--primary)' : 'var(--muted-foreground)',
                    fontFamily: 'var(--font-family-primary)',
                    fontSize: 'var(--text-label)',
                    fontWeight: agentesView === mode ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                    boxShadow: agentesView === mode ? 'var(--elevation-sm)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filter groups */}
          <div style={{ borderTop: '1px solid var(--border)', margin: '0 -16px', opacity: 0.5 }} />

          <div className="flex flex-col gap-2.5 pt-1">

            {/* Estado */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="shrink-0" style={{ fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', color: 'var(--muted-foreground)', minWidth: 72 }}>
                Estado:
              </span>
              {([
                { value: 'all'          as EstadoAgenteFilter, label: 'Todos',        dot: null,      count: agentes.length },
                { value: 'disponible'   as EstadoAgenteFilter, label: 'Disponible',   dot: '#0d9488', count: agentes.filter(a => tactico(a.id)?.estado === 'disponible').length },
                { value: 'desplegado'   as EstadoAgenteFilter, label: 'Desplegado',   dot: '#d97706', count: agentes.filter(a => tactico(a.id)?.estado === 'desplegado').length },
                { value: 'rastrillando' as EstadoAgenteFilter, label: 'Rastrillando', dot: '#16a34a', count: agentes.filter(a => tactico(a.id)?.estado === 'rastrillando').length },
                { value: 'descansando'  as EstadoAgenteFilter, label: 'Descansando',  dot: '#2563eb', count: agentes.filter(a => tactico(a.id)?.estado === 'descansando').length },
                { value: 'en_espera'    as EstadoAgenteFilter, label: 'En espera',    dot: '#9333ea', count: agentes.filter(a => tactico(a.id)?.estado === 'en_espera').length },
                { value: 'replegado'    as EstadoAgenteFilter, label: 'Replegado',    dot: '#9ca3af', count: agentes.filter(a => tactico(a.id)?.estado === 'replegado').length },
              ]).map(f => (
                <button key={f.value} onClick={() => setEstadoFilter(f.value)} className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full" style={{ border: estadoFilter === f.value ? '1.5px solid var(--primary)' : '1.5px solid var(--border)', background: estadoFilter === f.value ? 'rgba(229,75,75,0.08)' : 'transparent', color: estadoFilter === f.value ? 'var(--primary)' : 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: estadoFilter === f.value ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)', cursor: 'pointer', transition: 'all 0.13s' }}>
                  {f.dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.dot }} />}
                  {f.label}
                  <span className="px-1.5 rounded" style={{ background: estadoFilter === f.value ? 'rgba(229,75,75,0.15)' : 'var(--muted)', color: estadoFilter === f.value ? 'var(--primary)' : 'var(--muted-foreground)', fontSize: '10px', fontFamily: 'var(--font-family-primary)' }}>{f.count}</span>
                </button>
              ))}
            </div>

            {/* Especialidad */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="shrink-0" style={{ fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', color: 'var(--muted-foreground)', minWidth: 72 }}>
                Especialidad:
              </span>
              {([
                { value: 'all' as EspecialidadAgenteFilter, label: 'Todas', dot: null, count: agentes.length },
                // Derivadas del catálogo (espejo de cat_especialidades)
                ...catEspecialidades.map(e => ({
                  value: e.slug as EspecialidadAgenteFilter,
                  label: e.nombre,
                  dot: especialidadColor[e.slug] ?? '#6b7280',
                  count: agentes.filter(a => especialidadDe(a) === e.slug).length,
                })),
              ]).map(f => (
                <button key={f.value} onClick={() => setEspecialidadFilter(f.value)} className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full capitalize" style={{ border: especialidadFilter === f.value ? '1.5px solid var(--primary)' : '1.5px solid var(--border)', background: especialidadFilter === f.value ? 'rgba(229,75,75,0.08)' : 'transparent', color: especialidadFilter === f.value ? 'var(--primary)' : 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: especialidadFilter === f.value ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)', cursor: 'pointer', transition: 'all 0.13s' }}>
                  {f.dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.dot }} />}
                  {f.label}
                  <span className="px-1.5 rounded" style={{ background: especialidadFilter === f.value ? 'rgba(229,75,75,0.15)' : 'var(--muted)', color: especialidadFilter === f.value ? 'var(--primary)' : 'var(--muted-foreground)', fontSize: '10px', fontFamily: 'var(--font-family-primary)' }}>{f.count}</span>
                </button>
              ))}
            </div>

            {/* Results counter + clear button */}
            {(agentesQuery || estadoFilter !== 'all' || especialidadFilter !== 'all') && (
              <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px dashed var(--border)' }}>
                <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
                  {filteredAgentes.length} de {agentes.length} agentes
                </span>
                <button
                  onClick={() => { setAgentesQuery(''); setEstadoFilter('all'); setEspecialidadFilter('all'); }}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full"
                  style={{ fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', color: 'var(--primary)', border: '1px solid rgba(229,75,75,0.3)', background: 'rgba(229,75,75,0.05)', cursor: 'pointer' }}
                >
                  <X size={11} />
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AGENTES TAB */}
      {activeTab === 'agentes' && (
        <>
          {agentes.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16"
              style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-sm)' }}
            >
              <Users size={32} className="mb-3" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
              <p
                className="mb-1"
                style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}
              >Sin agentes asignados</p>
              <p className="mb-4" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                Agregá agentes al operativo.
              </p>
              <button
                onClick={() => { setSelectedAgenteIds(new Set()); setAgenteSearch(''); setModal('addAgente'); }}
                className="px-4 py-2"
                style={{
                  borderRadius: 'var(--radius-button)',
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                }}
              >
                Agregar Agente
              </button>
            </div>
          ) : agentesView === 'cards' ? (
            /* ── CARDS VIEW ── */
            filteredAgentes.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-14 rounded-[var(--radius-card)]"
                style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--muted)' }}>
                  <Search size={20} style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <p className="mb-1" style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>Sin resultados</p>
                <p className="mb-4" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Ningún agente coincide con los filtros aplicados.</p>
                <button
                  onClick={() => { setAgentesQuery(''); setEstadoFilter('all'); setEspecialidadFilter('all'); }}
                  className="px-4 py-2 rounded-[var(--radius-button)]"
                  style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', border: '1px solid var(--border)' }}
                >Limpiar filtros</button>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAgentes.map(agente => {
                const grupoDelAgente = grupos.find(g => g.agenteIds.includes(agente.id));
                const esLider = grupos.some(g => g.lider === agente.id);
                const esDUAR = isDUAR(agente);
                return (
                  <div
                    key={agente.id}
                    className="p-4"
                    style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-sm)' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{
                            background: esDUAR ? 'var(--primary)' : 'var(--accent)',
                            color: '#fff',
                            fontSize: 'var(--text-label)',
                            fontWeight: 'var(--font-weight-bold)',
                          }}
                        >
                          {agente.nombre.charAt(0)}{agente.apellido.charAt(0)}
                        </div>
                        <div>
                          <p
                            style={{
                              fontSize: 'var(--text-label)',
                              fontWeight: 'var(--font-weight-semibold)',
                              color: 'var(--foreground)',
                            }}
                          >
                            {agente.nombre} {agente.apellido}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
                            DNI: {agente.dni}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditAgenteId(agente.id)}
                          className="p-1 rounded transition-colors"
                          title="Editar datos operativos"
                          style={{ color: 'var(--muted-foreground)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.08)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => removeAgenteFromOperativo(id!, agente.id)}
                          className="p-1 rounded"
                          title="Quitar del operativo"
                          style={{ color: 'var(--muted-foreground)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Estado operativo badge */}
                    {tactico(agente.id)?.estado && (
                      <div className="mb-2">
                        <EstadoOperativoBadge estado={tactico(agente.id)?.estado} size="xs" />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {esDUAR && (
                        <span
                          className="px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{
                            fontSize: '10px',
                            fontWeight: 'var(--font-weight-semibold)',
                            background: 'rgba(229,75,75,0.1)',
                            color: 'var(--primary)',
                          }}
                        >
                          <ShieldCheck size={9} />
                          DUAR
                        </span>
                      )}
                      {esLider && (
                        <span
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            fontSize: '10px',
                            fontWeight: 'var(--font-weight-semibold)',
                            background: 'rgba(229,75,75,0.15)',
                            color: 'var(--primary)',
                          }}
                        >
                          Líder
                        </span>
                      )}
                      {agente.especialidad && (
                        <span
                          className="px-2 py-0.5 rounded-full capitalize"
                          style={{
                            fontSize: '10px',
                            fontWeight: 'var(--font-weight-semibold)',
                            background: `${especialidadColor[agente.especialidad] || '#6b7280'}20`,
                            color: especialidadColor[agente.especialidad] || '#6b7280',
                          }}
                        >
                          {agente.especialidad}
                        </span>
                      )}
                      {agente.grupo_sanguineo && (
                        <span
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            fontSize: '10px',
                            fontWeight: 'var(--font-weight-semibold)',
                            background: 'rgba(229,75,75,0.1)',
                            color: 'var(--primary)',
                          }}
                        >
                          {agente.grupo_sanguineo}
                        </span>
                      )}
                      {grupoDelAgente && (
                        <span
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            fontSize: '10px',
                            fontWeight: 'var(--font-weight-semibold)',
                            background: `${grupoDelAgente.color}20`,
                            color: grupoDelAgente.color,
                          }}
                        >
                          {grupoDelAgente.nombre}
                        </span>
                      )}
                    </div>
                    {agente.institucionId && (
                      <p className="mt-2" style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
                        {institucionLabel(agente)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            )
          ) : (
            /* ── LIST / TABLE VIEW ── */
            filteredAgentes.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-14 rounded-[var(--radius-card)]"
                style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--muted)' }}>
                  <Search size={20} style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <p className="mb-1" style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>Sin resultados</p>
                <p className="mb-4" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>Ningún agente coincide con los filtros aplicados.</p>
                <button
                  onClick={() => { setAgentesQuery(''); setEstadoFilter('all'); setEspecialidadFilter('all'); }}
                  className="px-4 py-2 rounded-[var(--radius-button)]"
                  style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', border: '1px solid var(--border)' }}
                >Limpiar filtros</button>
              </div>
            ) : (
            <div
              className="overflow-hidden"
              style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-sm)' }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                      {['Agente', 'Estado Op.', 'Especialidad', 'Dotación', 'Grupo Sang.', 'Grupo', 'Rol', ''].map(h => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 uppercase tracking-wider"
                          style={{
                            color: 'var(--muted-foreground)',
                            fontSize: '11px',
                            fontWeight: 'var(--font-weight-semibold)',
                            fontFamily: 'var(--font-family-primary)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgentes.map((agente, idx) => {
                      const grupoDelAgente = grupos.find(g => g.agenteIds.includes(agente.id));
                      const esLider = grupos.some(g => g.lider === agente.id);
                      const esDUAR = isDUAR(agente);
                      return (
                        <tr
                          key={agente.id}
                          style={{
                            borderBottom: idx < filteredAgentes.length - 1 ? '1px solid var(--border)' : 'none',
                          }}
                        >
                          {/* Agente */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{
                                  background: esDUAR ? 'var(--primary)' : 'var(--accent)',
                                  color: '#fff',
                                  fontSize: '11px',
                                  fontWeight: 'var(--font-weight-bold)',
                                  fontFamily: 'var(--font-family-primary)',
                                }}
                              >
                                {agente.nombre.charAt(0)}{agente.apellido.charAt(0)}
                              </div>
                              <div>
                                <p style={{
                                  color: 'var(--foreground)',
                                  fontSize: 'var(--text-base)',
                                  fontWeight: 'var(--font-weight-medium)',
                                  fontFamily: 'var(--font-family-primary)',
                                }}>
                                  {agente.nombre} {agente.apellido}
                                </p>
                                <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
                                  {agente.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          {/* Estado Operativo */}
                          <td className="px-4 py-3">
                            {tactico(agente.id)?.estado
                              ? <EstadoOperativoBadge estado={tactico(agente.id)?.estado} size="xs" />
                              : <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)' }}>—</span>
                            }
                          </td>
                          {/* Especialidad */}
                          <td className="px-4 py-3">
                            {agente.especialidad ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full capitalize"
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 'var(--font-weight-semibold)',
                                  fontFamily: 'var(--font-family-primary)',
                                  background: `${especialidadColor[agente.especialidad] || '#6b7280'}20`,
                                  color: especialidadColor[agente.especialidad] || '#6b7280',
                                }}
                              >
                                {agente.especialidad}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)' }}>—</span>
                            )}
                          </td>
                          {/* Dotación */}
                          <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)' }}>
                            {institucionLabel(agente)}
                          </td>
                          {/* Grupo Sanguíneo */}
                          <td className="px-4 py-3">
                            {agente.grupo_sanguineo ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full"
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 'var(--font-weight-semibold)',
                                  fontFamily: 'var(--font-family-primary)',
                                  background: 'rgba(229,75,75,0.1)',
                                  color: 'var(--primary)',
                                }}
                              >
                                {agente.grupo_sanguineo}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)' }}>—</span>
                            )}
                          </td>
                          {/* Grupo */}
                          <td className="px-4 py-3">
                            {grupoDelAgente ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 'var(--font-weight-semibold)',
                                  fontFamily: 'var(--font-family-primary)',
                                  background: `${grupoDelAgente.color}20`,
                                  color: grupoDelAgente.color,
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: grupoDelAgente.color,
                                    display: 'inline-block',
                                    flexShrink: 0,
                                  }}
                                />
                                {grupoDelAgente.nombre}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)' }}>Sin grupo</span>
                            )}
                          </td>
                          {/* Rol (DUAR / Líder badges) */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {esDUAR && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 'var(--font-weight-semibold)',
                                    fontFamily: 'var(--font-family-primary)',
                                    background: 'rgba(229,75,75,0.1)',
                                    color: 'var(--primary)',
                                  }}
                                >
                                  <ShieldCheck size={9} />
                                  DUAR
                                </span>
                              )}
                              {esLider && (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full"
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 'var(--font-weight-semibold)',
                                    fontFamily: 'var(--font-family-primary)',
                                    background: 'rgba(229,75,75,0.15)',
                                    color: 'var(--primary)',
                                  }}
                                >
                                  Líder
                                </span>
                              )}
                              {!esDUAR && !esLider && (
                                <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)' }}>—</span>
                              )}
                            </div>
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditAgenteId(agente.id)}
                                className="p-1.5 rounded-lg transition-colors"
                                title="Editar datos operativos"
                                style={{ color: 'var(--muted-foreground)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.08)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; }}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => removeAgenteFromOperativo(id!, agente.id)}
                                className="p-1.5 rounded-lg transition-colors"
                                title="Quitar del operativo"
                                style={{ color: 'var(--muted-foreground)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            )
          )}
        </>
      )}

      {/* GRUPOS TAB */}
      {activeTab === 'grupos' && (
        <>
          {grupos.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16"
              style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-sm)' }}
            >
              <Users size={32} className="mb-3" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
              <p
                className="mb-1"
                style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}
              >
                Sin grupos creados
              </p>
              <p className="mb-4" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                Organizá a los agentes en grupos de rastrillaje.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setNumGruposAuto(Math.min(2, maxGruposAuto)); setAutoResult('idle'); setModal('autoAsignar'); }}
                  className="px-4 py-2 flex items-center gap-2"
                  style={{
                    borderRadius: 'var(--radius-button)',
                    fontSize: 'var(--text-label)',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontFamily: 'var(--font-family-primary)',
                    background: 'var(--secondary)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <Shuffle size={14} />
                  Asignación Automática
                </button>
                <button
                  onClick={() => { setGrupoForm({ nombre: '', lider: '', color: COLORS[0], estado: 'en_formacion' }); setModal('createGrupo'); }}
                  className="px-4 py-2"
                  style={{
                    borderRadius: 'var(--radius-button)',
                    fontSize: 'var(--text-label)',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontFamily: 'var(--font-family-primary)',
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                  }}
                >
                  Crear Grupo
                </button>
              </div>
            </div>
          ) : (
            <GruposDnD
              grupos={grupos}
              agentes={agentes}
              operativoId={id!}
              sectores={operativo.sectores}
              onEditGrupo={openEditGrupo}
              onDeleteGrupo={(gid) => { setSelectedGrupo(gid); setModal('deleteGrupo'); }}
            />
          )}
        </>
      )}



      {/* ── MODAL: Editar Agente (datos operativos) ── */}
      {editAgenteId && (() => {
        const ag = data.usuarios.find(u => u.id === editAgenteId);
        return ag ? (
          <EditarAgenteModal agente={ag} operativoId={id!} onClose={() => setEditAgenteId(null)} />
        ) : null;
      })()}

      {/* ── MODAL: Asignación Automática ── */}
      {modal === 'autoAsignar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div
            className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-md)' }}
          >
            {autoResult === 'success' ? (
              <div className="flex flex-col items-center justify-center py-14 px-6">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'rgba(34,197,94,0.12)' }}
                >
                  <CheckCircle2 size={28} color="#16a34a" />
                </div>
                <p
                  className="mb-1"
                  style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}
                >
                  Grupos asignados exitosamente
                </p>
                <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
                  {preview.length} grupos creados con líderes DUAR.
                </p>
              </div>
            ) : (
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--secondary)' }}
                    >
                      <Shuffle size={17} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                      <h2
                        style={{
                          fontSize: 'var(--text-h3)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--foreground)',
                        }}
                      >
                        Asignación Automática de Grupos
                      </h2>
                      <p style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
                        Distribuye al personal disponible del operativo
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setModal(null)} style={{ color: 'var(--muted-foreground)' }}>
                    <X size={17} />
                  </button>
                </div>

                {/* Regla inquebrantable */}
                <div
                  className="flex gap-3 p-3 rounded-lg mb-5"
                  style={{ background: 'rgba(229,75,75,0.07)', border: '1px solid rgba(229,75,75,0.2)' }}
                >
                  <ShieldCheck size={16} style={{ color: 'var(--primary)', marginTop: 1, shrink: 0 }} className="shrink-0" />
                  <div>
                    <p
                      style={{
                        fontSize: 'var(--text-label)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--primary)',
                      }}
                    >
                      Regla Inquebrantable
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--foreground)' }}>
                      Cada grupo <strong>debe</strong> tener un Líder de Grupo que pertenezca obligatoriamente al <strong>DUAR</strong>.
                      El personal de otras agencias solo puede ser integrante.
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Agentes activos', value: agentesActivos.length, color: 'var(--foreground)' },
                    { label: 'DUAR (elegibles líderes)', value: duarAgentes.length, color: 'var(--primary)' },
                    { label: 'Otras agencias', value: otrosAgentes.length, color: 'var(--muted-foreground)' },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      className="flex flex-col items-center justify-center p-3 rounded-lg"
                      style={{ background: 'var(--muted)' }}
                    >
                      <span
                        style={{
                          fontSize: 'var(--text-h2)',
                          fontWeight: 'var(--font-weight-bold)',
                          color: stat.color,
                        }}
                      >
                        {stat.value}
                      </span>
                      <span
                        className="text-center"
                        style={{ fontSize: '10px', fontWeight: 'var(--font-weight-medium)', color: 'var(--muted-foreground)' }}
                      >
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>

                {duarAgentes.length === 0 ? (
                  <div
                    className="flex gap-3 p-4 rounded-lg mb-5"
                    style={{ background: '#fef9c3', border: '1px solid #fde047' }}
                  >
                    <AlertTriangle size={17} color="#854d0e" className="shrink-0 mt-0.5" />
                    <div>
                      <p
                        style={{
                          fontSize: 'var(--text-label)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: '#854d0e',
                        }}
                      >
                        Sin agentes DUAR disponibles
                      </p>
                      <p style={{ fontSize: '11px', color: '#713f12' }}>
                        No hay agentes activos del DUAR asignados a este operativo. Agregá al menos un agente DUAR para poder crear grupos con líderes válidos.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Número de grupos slider */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <label
                          style={{
                            fontSize: 'var(--text-label)',
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--foreground)',
                          }}
                        >
                          Cantidad de grupos
                        </label>
                        <span
                          className="px-2.5 py-0.5 rounded-full"
                          style={{
                            fontSize: 'var(--text-label)',
                            fontWeight: 'var(--font-weight-bold)',
                            background: 'var(--primary)',
                            color: '#fff',
                          }}
                        >
                          {numGruposEfectivo}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={maxGruposAuto}
                        value={numGruposAuto}
                        onChange={e => setNumGruposAuto(Number(e.target.value))}
                        className="w-full"
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      {numGruposAuto > maxGruposAuto && (
                        <p className="mt-1" style={{ fontSize: '11px', color: 'var(--primary)' }}>
                          Limitado a {maxGruposAuto} grupos por disponibilidad de líderes DUAR.
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <Info size={11} style={{ color: 'var(--muted-foreground)' }} />
                        <p style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
                          Máximo {maxGruposAuto} grupo{maxGruposAuto !== 1 ? 's' : ''} según cantidad de agentes DUAR.
                        </p>
                      </div>
                    </div>

                    {/* Preview grupos */}
                    <div className="mb-5">
                      <p
                        className="mb-3"
                        style={{
                          fontSize: 'var(--text-label)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--foreground)',
                        }}
                      >
                        Vista previa de la distribución
                      </p>
                      <div className="flex flex-col gap-3">
                        {preview.map((grupo, idx) => {
                          const liderUser = data.usuarios.find(u => u.id === grupo.liderId)!;
                          const miembros = data.usuarios.filter(u => grupo.miembrosIds.includes(u.id) && u.id !== grupo.liderId);
                          return (
                            <div
                              key={idx}
                              className="overflow-hidden"
                              style={{
                                borderRadius: 'var(--radius-card)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              <div className="h-1" style={{ background: grupo.color }} />
                              <div className="p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: grupo.color }} />
                                  <p
                                    style={{
                                      fontSize: 'var(--text-label)',
                                      fontWeight: 'var(--font-weight-semibold)',
                                      color: 'var(--foreground)',
                                    }}
                                  >
                                    {grupo.nombre}
                                  </p>
                                </div>
                                {/* Líder */}
                                <div className="flex items-center gap-2 mb-2">
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                                    style={{
                                      background: 'var(--primary)',
                                      color: '#fff',
                                      fontSize: '9px',
                                      fontWeight: 'var(--font-weight-bold)',
                                    }}
                                  >
                                    {liderUser.nombre.charAt(0)}{liderUser.apellido.charAt(0)}
                                  </div>
                                  <p style={{ fontSize: '11px', color: 'var(--foreground)' }}>
                                    <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                                      {liderUser.nombre} {liderUser.apellido}
                                    </span>
                                    {' '}
                                    <span style={{ color: 'var(--muted-foreground)' }}>— Líder (DUAR)</span>
                                  </p>
                                  <ShieldCheck size={12} style={{ color: 'var(--primary)', marginLeft: 'auto', shrink: 0 }} className="shrink-0" />
                                </div>
                                {/* Integrantes */}
                                {miembros.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {miembros.map(m => (
                                      <span
                                        key={m.id}
                                        className="px-2 py-0.5 rounded-full"
                                        style={{
                                          fontSize: '10px',
                                          fontFamily: 'var(--font-family-primary)',
                                          background: 'var(--muted)',
                                          color: 'var(--foreground)',
                                        }}
                                      >
                                        {m.nombre} {m.apellido}
                                        {!isDUAR(m) && (
                                          <span style={{ color: 'var(--muted-foreground)' }}> · {institucionLabel(m)}</span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
                                    Solo líder (sin integrantes adicionales)
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Warning si hay grupos existentes */}
                    {operativo.grupoIds.length > 0 && (
                      <div
                        className="flex gap-3 p-3 rounded-lg mb-5"
                        style={{ background: '#fef9c3', border: '1px solid #fde047' }}
                      >
                        <AlertTriangle size={15} color="#854d0e" className="shrink-0 mt-0.5" />
                        <p style={{ fontSize: '11px', color: '#713f12' }}>
                          Esta acción <strong>reemplazará</strong> los {operativo.grupoIds.length} grupo(s) existentes por la nueva distribución automática.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setModal(null)}
                    className="px-4 py-2"
                    style={{
                      borderRadius: 'var(--radius-button)',
                      fontSize: 'var(--text-label)',
                      fontWeight: 'var(--font-weight-semibold)',
                      fontFamily: 'var(--font-family-primary)',
                      color: 'var(--foreground)',
                      border: '1px solid var(--border)',
                      background: 'transparent',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleApplyAutoAsignar}
                    disabled={duarAgentes.length === 0 || preview.length === 0}
                    className="px-4 py-2 flex items-center gap-2 hover:opacity-90 disabled:opacity-40"
                    style={{
                      borderRadius: 'var(--radius-button)',
                      fontSize: 'var(--text-label)',
                      fontWeight: 'var(--font-weight-semibold)',
                      fontFamily: 'var(--font-family-primary)',
                      background: 'var(--primary)',
                      color: 'var(--primary-foreground)',
                    }}
                  >
                    <Shuffle size={14} />
                    Aplicar Asignación
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: Agregar Agente ── */}
      {modal === 'addAgente' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setModal(null); setSelectedAgenteIds(new Set()); setAgenteSearch(''); } }}
        >
          <div
            className="w-full flex flex-col"
            style={{
              maxWidth: 580,
              maxHeight: '85vh',
              background: 'var(--card)',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--elevation-md)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between flex-shrink-0"
              style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 'var(--text-h3)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-family-primary)',
                  }}
                >
                  Agregar Agentes al Operativo
                </h2>
                <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)', marginTop: 2 }}>
                  {disponibles.length} agente{disponibles.length !== 1 ? 's' : ''} disponible{disponibles.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => { setModal(null); setSelectedAgenteIds(new Set()); setAgenteSearch(''); }}
                style={{ color: 'var(--muted-foreground)', padding: 4, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search bar */}
            <div className="flex-shrink-0" style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>
              <div className="relative">
                <Search
                  size={15}
                  style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--muted-foreground)', pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="Buscar por nombre, apellido, DNI, dotación, especialidad…"
                  value={agenteSearch}
                  onChange={e => setAgenteSearch(e.target.value)}
                  autoFocus
                  className="w-full outline-none"
                  style={{
                    paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                    background: 'var(--input-background)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-input)',
                    color: 'var(--foreground)',
                    fontSize: 'var(--text-base)',
                    fontFamily: 'var(--font-family-primary)',
                  }}
                />
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '12px 24px' }}>
              {disponibles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ gap: 8 }}>
                  <Users size={28} style={{ color: 'var(--muted-foreground)', opacity: 0.35 }} />
                  <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}>
                    No hay agentes disponibles para agregar.
                  </p>
                </div>
              ) : filteredDisponibles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ gap: 8 }}>
                  <Search size={24} style={{ color: 'var(--muted-foreground)', opacity: 0.35 }} />
                  <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}>
                    Sin resultados para "{agenteSearch}"
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredDisponibles.map(u => {
                    const esDUAR = isDUAR(u);
                    const isSelected = selectedAgenteIds.has(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => toggleAgenteSelection(u.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-input)',
                          border: isSelected
                            ? '1.5px solid var(--primary)'
                            : '1.5px solid var(--border)',
                          background: isSelected ? 'rgba(229,75,75,0.04)' : 'var(--background)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          transition: 'border-color 0.13s, background 0.13s',
                        }}
                      >
                        {/* Avatar */}
                        <div
                          style={{
                            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                            background: esDUAR ? 'var(--primary)' : 'var(--accent)',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-family-primary)',
                          }}
                        >
                          {u.nombre.charAt(0)}{u.apellido.charAt(0)}
                        </div>

                        {/* Name + DNI */}
                        <div style={{ flex: '0 0 auto', minWidth: 150 }}>
                          <p style={{
                            fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)',
                            whiteSpace: 'nowrap',
                          }}>
                            {u.nombre} {u.apellido}
                          </p>
                          {u.institucionId && (
                            <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)', marginTop: 1 }}>
                              {institucionLabel(u)}
                            </p>
                          )}
                        </div>

                        {/* Badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                          {u.especialidad && (
                            <span style={{
                              fontSize: '10px', fontWeight: 'var(--font-weight-semibold)',
                              background: 'var(--muted)', color: 'var(--muted-foreground)',
                              borderRadius: 999, padding: '2px 7px',
                              fontFamily: 'var(--font-family-primary)',
                              textTransform: 'capitalize',
                            }}>
                              {u.especialidad}
                            </span>
                          )}
                          {enOtroOperativo(u.id) && (
                            <span style={{
                              fontSize: '10px', fontWeight: 'var(--font-weight-semibold)',
                              background: 'rgba(234,179,8,0.12)', color: '#92400e',
                              border: '1px solid rgba(234,179,8,0.4)',
                              borderRadius: 999, padding: '2px 7px',
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              fontFamily: 'var(--font-family-primary)',
                            }}>
                              <AlertTriangle size={8} />
                              En otro operativo
                            </span>
                          )}
                        </div>

                        {/* Checkbox */}
                        <div
                          style={{
                            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                            border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border)',
                            background: isSelected ? 'var(--primary)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.13s',
                          }}
                        >
                          {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between flex-shrink-0"
              style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--card)' }}
            >
              {/* Left: selection count + crear usuario */}
              <div className="flex flex-col gap-1">
                <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}>
                  {selectedAgenteIds.size > 0
                    ? <span style={{ color: 'var(--primary)', fontWeight: 'var(--font-weight-semibold)' }}>{selectedAgenteIds.size} seleccionado{selectedAgenteIds.size !== 1 ? 's' : ''}</span>
                    : 'Seleccioná uno o más agentes'
                  }
                </p>
                <button
                  onClick={() => setShowCrearAgente(true)}
                  className="flex items-center gap-1.5"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: 'var(--primary)', fontSize: '11px',
                    fontFamily: 'var(--font-family-primary)',
                    fontWeight: 'var(--font-weight-semibold)',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.7'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                >
                  <UserRoundPlus size={12} />
                  Crear usuario nuevo
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setModal(null); setSelectedAgenteIds(new Set()); setAgenteSearch(''); }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-button)',
                    fontSize: 'var(--text-label)',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontFamily: 'var(--font-family-primary)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => selectedAgenteIds.size > 0 && setShowConfirmAdd(true)}
                  disabled={selectedAgenteIds.size === 0}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 'var(--radius-button)',
                    fontSize: 'var(--text-label)',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontFamily: 'var(--font-family-primary)',
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    opacity: selectedAgenteIds.size === 0 ? 0.45 : 1,
                    cursor: selectedAgenteIds.size === 0 ? 'not-allowed' : 'pointer',
                    border: 'none',
                    transition: 'opacity 0.15s',
                  }}
                >
                  {selectedAgenteIds.size > 1
                    ? `Agregar ${selectedAgenteIds.size} agentes`
                    : 'Agregar agente'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Confirmar agregar agentes (z-60) ── */}
      {showConfirmAdd && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={() => setShowConfirmAdd(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-[var(--radius-card)] overflow-hidden"
            style={{ background: 'var(--card)', boxShadow: 'var(--elevation-lg)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Accent bar */}
            <div style={{ height: 4, background: 'linear-gradient(90deg, var(--primary), var(--accent))' }} />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(229,75,75,0.1)' }}>
                  <UserPlus size={17} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
                    Confirmar incorporación
                  </p>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', marginTop: 1 }}>
                    {selectedAgenteIds.size} agente{selectedAgenteIds.size !== 1 ? 's' : ''} seleccionado{selectedAgenteIds.size !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmAdd(false)}
                style={{ color: 'var(--muted-foreground)', padding: 4, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--muted)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <X size={17} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 flex flex-col gap-3">
              <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.6 }}>
                ¿Confirmás que querés agregar{' '}
                <strong style={{ color: 'var(--foreground)' }}>
                  {selectedAgenteIds.size === 1 ? 'este agente' : `estos ${selectedAgenteIds.size} agentes`}
                </strong>{' '}
                al operativo <strong style={{ color: 'var(--foreground)' }}>{operativo.nombre}</strong>?
              </p>

              {/* Lista de agentes seleccionados */}
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {[...selectedAgenteIds].map(uid => {
                  const u = data.usuarios.find(x => x.id === uid);
                  if (!u) return null;
                  return (
                    <div key={uid} className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-input)]" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: isDUAR(u) ? 'var(--primary)' : 'var(--accent)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-family-primary)',
                      }}>
                        {u.nombre.charAt(0)}{u.apellido.charAt(0)}
                      </div>
                      <div>
                        <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
                          {u.nombre} {u.apellido}
                        </p>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
                          DNI {u.dni}{u.especialidad ? ` · ${u.especialidad}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setShowConfirmAdd(false)}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-button)',
                  fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)', color: 'var(--foreground)',
                  border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--muted)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                Cancelar
              </button>
              <button
                onClick={() => { handleAddAgente(); setShowConfirmAdd(false); }}
                className="flex items-center gap-2"
                style={{
                  padding: '8px 20px', borderRadius: 'var(--radius-button)',
                  fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)', background: 'var(--primary)',
                  color: 'var(--primary-foreground)', border: 'none', cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.88'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              >
                <UserPlus size={14} />
                {selectedAgenteIds.size > 1 ? `Agregar ${selectedAgenteIds.size} agentes` : 'Agregar agente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Crear Usuario (sobre addAgente, z-60) ── */}
      {showCrearAgente && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowCrearAgente(false); setCrearForm(emptyCrearForm); setCrearErrors({}); } }}
        >
          <div
            className="w-full flex flex-col"
            style={{
              maxWidth: 520,
              background: 'var(--card)',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--elevation-lg)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between flex-shrink-0"
              style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(229,75,75,0.1)' }}
                >
                  <UserRoundPlus size={17} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
                    Crear nuevo usuario
                  </h2>
                  <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)', marginTop: 2 }}>
                    El agente creado aparecerá en el listado para seleccionar
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowCrearAgente(false); setCrearForm(emptyCrearForm); setCrearErrors({}); }}
                style={{ color: 'var(--muted-foreground)', padding: 4, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--muted)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="overflow-y-auto" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Nombre + Apellido */}
              <div className="grid grid-cols-2 gap-3">
                {(['nombre', 'apellido'] as const).map(field => (
                  <div key={field}>
                    <label style={{ display: 'block', marginBottom: 5, fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
                      {field === 'nombre' ? 'Nombre' : 'Apellido'} <span style={{ color: 'var(--primary)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={crearForm[field]}
                      onChange={e => { setCrearForm(f => ({ ...f, [field]: e.target.value })); setCrearErrors(er => ({ ...er, [field]: '' })); }}
                      className="w-full outline-none"
                      style={{
                        padding: '8px 12px', borderRadius: 'var(--radius-input)',
                        border: crearErrors[field] ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                        background: 'var(--input-background)', color: 'var(--foreground)',
                        fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)',
                      }}
                      onFocus={e => { if (!crearErrors[field]) e.currentTarget.style.border = '1.5px solid var(--primary)'; }}
                      onBlur={e => { if (!crearErrors[field]) e.currentTarget.style.border = '1px solid var(--border)'; }}
                    />
                    {crearErrors[field] && <p style={{ color: 'var(--primary)', fontSize: '11px', marginTop: 3, fontFamily: 'var(--font-family-primary)' }}>{crearErrors[field]}</p>}
                  </div>
                ))}
              </div>

              {/* DNI + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
                    DNI <span style={{ color: 'var(--primary)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={crearForm.dni}
                    onChange={e => { setCrearForm(f => ({ ...f, dni: e.target.value })); setCrearErrors(er => ({ ...er, dni: '' })); }}
                    placeholder="Ej: 30456789"
                    className="w-full outline-none"
                    style={{
                      padding: '8px 12px', borderRadius: 'var(--radius-input)',
                      border: crearErrors.dni ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                      background: 'var(--input-background)', color: 'var(--foreground)',
                      fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)',
                    }}
                    onFocus={e => { if (!crearErrors.dni) e.currentTarget.style.border = '1.5px solid var(--primary)'; }}
                    onBlur={e => { if (!crearErrors.dni) e.currentTarget.style.border = '1px solid var(--border)'; }}
                  />
                  {crearErrors.dni && <p style={{ color: 'var(--primary)', fontSize: '11px', marginTop: 3, fontFamily: 'var(--font-family-primary)' }}>{crearErrors.dni}</p>}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
                    Email <span style={{ color: 'var(--primary)' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={crearForm.email}
                    onChange={e => { setCrearForm(f => ({ ...f, email: e.target.value })); setCrearErrors(er => ({ ...er, email: '' })); }}
                    placeholder="agente@ejemplo.com"
                    className="w-full outline-none"
                    style={{
                      padding: '8px 12px', borderRadius: 'var(--radius-input)',
                      border: crearErrors.email ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                      background: 'var(--input-background)', color: 'var(--foreground)',
                      fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)',
                    }}
                    onFocus={e => { if (!crearErrors.email) e.currentTarget.style.border = '1.5px solid var(--primary)'; }}
                    onBlur={e => { if (!crearErrors.email) e.currentTarget.style.border = '1px solid var(--border)'; }}
                  />
                  {crearErrors.email && <p style={{ color: 'var(--primary)', fontSize: '11px', marginTop: 3, fontFamily: 'var(--font-family-primary)' }}>{crearErrors.email}</p>}
                </div>
              </div>

              {/* Especialidad + Grupo sanguíneo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
                    Especialidad <span style={{ color: 'var(--muted-foreground)', fontWeight: 'normal' }}>(opcional)</span>
                  </label>
                  <select
                    value={crearForm.especialidad}
                    onChange={e => setCrearForm(f => ({ ...f, especialidad: e.target.value as Especialidad | '' }))}
                    className="w-full outline-none"
                    style={{
                      padding: '8px 12px', borderRadius: 'var(--radius-input)',
                      border: '1px solid var(--border)',
                      background: 'var(--input-background)', color: 'var(--foreground)',
                      fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)',
                    }}
                  >
                    <option value="">Sin especialidad</option>
                    <option value="paramédico">Paramédico</option>
                    <option value="bombero">Bombero</option>
                    <option value="bombero voluntario">Bombero Voluntario</option>
                    <option value="conductor">Conductor</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
                    Grupo sanguíneo <span style={{ color: 'var(--muted-foreground)', fontWeight: 'normal' }}>(opcional)</span>
                  </label>
                  <select
                    value={crearForm.grupo_sanguineo}
                    onChange={e => setCrearForm(f => ({ ...f, grupo_sanguineo: e.target.value }))}
                    className="w-full outline-none"
                    style={{
                      padding: '8px 12px', borderRadius: 'var(--radius-input)',
                      border: '1px solid var(--border)',
                      background: 'var(--input-background)', color: 'var(--foreground)',
                      fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)',
                    }}
                  >
                    <option value="">No especificado</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* Institución — define si podrá ser Líder de grupo */}
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
                  Institución
                </label>
                <select
                  value={crearForm.institucionId}
                  onChange={e => setCrearForm(f => ({ ...f, institucionId: e.target.value, dotacionId: '' }))}
                  className="w-full outline-none"
                  style={{
                    padding: '8px 12px', borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--border)',
                    background: 'var(--input-background)', color: 'var(--foreground)',
                    fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)',
                  }}
                >
                  <option value="">— Seleccioná la institución —</option>
                  {catInstituciones.map(i => (
                    <option key={i.id} value={i.id}>{i.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Dotación — sólo si la institución tiene destacamentos cargados */}
              {dotacionesDe(crearForm.institucionId).length > 0 && (
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
                  Dotación
                </label>
                <select
                  value={crearForm.dotacionId}
                  onChange={e => setCrearForm(f => ({ ...f, dotacionId: e.target.value }))}
                  className="w-full outline-none"
                  style={{
                    padding: '8px 12px', borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--border)',
                    background: 'var(--input-background)', color: 'var(--foreground)',
                    fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)',
                  }}
                >
                  <option value="">— Seleccioná la dotación —</option>
                  {dotacionesDe(crearForm.institucionId).map(d => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              )}
              <div style={{ display: 'none' }}>
              </div>

              {/* Contraseña hint */}
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-input)]"
                style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
              >
                <Info size={13} style={{ color: 'var(--muted-foreground)', marginTop: 1, flexShrink: 0 }} />
                <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)', lineHeight: 1.5 }}>
                  La contraseña inicial será el <strong style={{ color: 'var(--foreground)' }}>DNI</strong> del agente. Se puede modificar luego desde la gestión de usuarios.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex justify-end gap-2 flex-shrink-0"
              style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--card)' }}
            >
              <button
                onClick={() => { setShowCrearAgente(false); setCrearForm(emptyCrearForm); setCrearErrors({}); }}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-button)',
                  fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)', color: 'var(--foreground)',
                  border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--muted)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearAgente}
                className="flex items-center gap-2"
                style={{
                  padding: '8px 20px', borderRadius: 'var(--radius-button)',
                  fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)', background: 'var(--primary)',
                  color: 'var(--primary-foreground)', border: 'none', cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.88'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              >
                <UserRoundPlus size={14} />
                Crear usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Crear/Editar Grupo ── */}
      {(modal === 'createGrupo' || modal === 'editGrupo') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-[440px] p-6"
            style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-md)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                style={{
                  fontSize: 'var(--text-h3)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--foreground)',
                }}
              >
                {modal === 'createGrupo' ? 'Nuevo Grupo de Rastrillaje' : 'Editar Grupo'}
              </h2>
              <button onClick={() => setModal(null)} style={{ color: 'var(--muted-foreground)' }}>
                <X size={17} />
              </button>
            </div>

            {/* DUAR rule notice */}
            <div
              className="flex gap-2 p-2.5 rounded-lg mb-4"
              style={{ background: 'rgba(229,75,75,0.07)', border: '1px solid rgba(229,75,75,0.2)' }}
            >
              <ShieldCheck size={13} style={{ color: 'var(--primary)', shrink: 0, marginTop: 1 }} className="shrink-0" />
              <p style={{ fontSize: '11px', color: 'var(--foreground)' }}>
                El líder debe pertenecer al <strong>DUAR</strong>. Solo se muestran agentes DUAR como opciones.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label
                  className="block mb-1"
                  style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}
                >
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  value={grupoForm.nombre}
                  onChange={e => setGrupoForm({ ...grupoForm, nombre: e.target.value })}
                  placeholder="Ej: Grupo Alfa"
                  className="w-full px-3 py-2.5 outline-none"
                  style={fieldStyle}
                />
              </div>
              <div>
                <label
                  className="block mb-1"
                  style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}
                >
                  Líder del Grupo * <span style={{ color: 'var(--primary)', fontWeight: 'var(--font-weight-normal)' }}>(Solo DUAR)</span>
                </label>
                <select
                  value={grupoForm.lider}
                  onChange={e => setGrupoForm({ ...grupoForm, lider: e.target.value })}
                  className="w-full px-3 py-2.5 outline-none"
                  style={fieldStyle}
                >
                  <option value="">— Seleccioná el líder —</option>
                  {(modal === 'createGrupo' ? duarDisponiblesParaNuevoLider : duarDisponiblesParaEditarLider).map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} {a.apellido} — {institucionLabel(a)}
                    </option>
                  ))}
                </select>
                {duarAgentesEnOperativo.length === 0 && (
                  <p className="mt-1.5" style={{ fontSize: '11px', color: 'var(--primary)' }}>
                    No hay agentes DUAR en este operativo. Agregá uno primero.
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block mb-1"
                  style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}
                >
                  Estado
                </label>
                <select
                  value={grupoForm.estado}
                  onChange={e => setGrupoForm({ ...grupoForm, estado: e.target.value as EstadoGrupo })}
                  className="w-full px-3 py-2.5 outline-none"
                  style={fieldStyle}
                >
                  {/* Catálogo estado_grupo. 'disuelto' no se ofrece: se llega
                      por CU-25 (disolución), no eligiéndolo a mano. */}
                  <option value="en_formacion">En Formación</option>
                  <option value="en_apresto">En Apresto</option>
                  <option value="desplegado">Desplegado</option>
                  <option value="rastrillando">Rastrillando</option>
                  <option value="en_pausa">En Pausa</option>
                  <option value="replegado">Replegado</option>
                </select>
              </div>
              <div>
                <label
                  className="block mb-2"
                  style={{ fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}
                >
                  Color del Grupo
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setGrupoForm({ ...grupoForm, color: c })}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{
                        background: c,
                        outline: grupoForm.color === c ? `2px solid var(--foreground)` : 'none',
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2"
                style={{
                  borderRadius: 'var(--radius-button)',
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={modal === 'createGrupo' ? handleCreateGrupo : handleEditGrupo}
                className="px-4 py-2"
                style={{
                  borderRadius: 'var(--radius-button)',
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                }}
              >
                {modal === 'createGrupo' ? 'Crear Grupo' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Eliminar Grupo ── */}
      {modal === 'deleteGrupo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-[360px] p-6"
            style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-md)' }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ background: '#fee2e2' }}
            >
              <Trash2 size={20} color="#dc2626" />
            </div>
            <h2
              className="mb-2"
              style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}
            >
              Eliminar Grupo
            </h2>
            <p className="mb-5" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
              ¿Seguro que querés eliminar este grupo? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2"
                style={{
                  borderRadius: 'var(--radius-button)',
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteGrupo}
                className="px-4 py-2"
                style={{
                  borderRadius: 'var(--radius-button)',
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                  background: '#dc2626',
                  color: '#fff',
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}