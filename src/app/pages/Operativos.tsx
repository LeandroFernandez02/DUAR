import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Plus, MapPin, Calendar, Users, ArrowRight, QrCode, X, Trash2, Edit2,
  User, Package, LayoutGrid, List, Search, AlertCircle,
  Crosshair, Lock, Flag, CheckCircle2, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '../components/shared/StatusBadge';
import { MapPickerModal } from '../components/shared/MapPickerModal';
import { QRModal } from '../components/shared/QRModal';
import { useApp } from '../context/AppContext';
import {
  Operativo, EstadoOperativo, TipoObjetivo,
} from '../data/mockData';
import { operativosApi, ApiError, OperativoApi } from '../services/api';
import {
  ObjetivoFormContent,
  PersonaForm, ObjetoForm,
  emptyPersonaForm, emptyObjetoForm,
  buildPersonaForm, buildObjetoForm,
} from '../components/shared/ObjetivoFormContent';

/**
 * CU-08..11 (Módulo 3) ya hablan con la API real; CU-12..14 (Objetivo Buscado)
 * todavía no — por eso el formulario sigue mostrando esa pestaña (no tiene
 * sentido sacarla, el Coordinador puede seguir cargándola) pero al guardar NO
 * se envía al backend: `objetivo_buscado` no tiene endpoint todavía. Se pierde
 * al refrescar hasta que se migre ese CU.
 */
const ESTADO_API_A_MOCK: Record<string, EstadoOperativo> = {
  NUEVO: 'nuevo',
  ACTIVO: 'activo',
  INACTIVO: 'inactivo',
  EN_PLANIFICACION: 'planificación',
  EN_PROCESO: 'en_proceso',
  FINALIZADO: 'finalizado',
  ELIMINADO: 'eliminado',
};

/**
 * "Vigente" = todavía no se cerró: incluye NUEVO y EN_PLANIFICACION, no sólo
 * lo que ya está en curso. Se exporta como función, no como filtro inline
 * duplicado, porque ya se repitió dos veces con definiciones DISTINTAS en
 * este mismo archivo (el contador del botón no coincidía con lo que
 * realmente se mostraba) — mismo criterio que ESTADOS_ACTIVOS en
 * AgenteDashboard.tsx, que ya lo tenía bien.
 */
function esVigente(estado: EstadoOperativo): boolean {
  return estado === 'nuevo' || estado === 'planificación' || estado === 'en_proceso' || estado === 'activo';
}

/** Traduce el operativo de la API al modelo que ya consume esta pantalla. */
function mapearOperativo(o: OperativoApi): Operativo {
  return {
    id: o.id,
    nombre: o.titulo,
    estado: ESTADO_API_A_MOCK[o.estado] ?? 'nuevo',
    ubicacion: o.localidad,
    fiscal: o.fiscalInstruccion,
    punto0: { lat: o.puntoCeroLat, lng: o.puntoCeroLng },
    fechaInicio: o.fechaHoraInicio,
    fechaFin: o.fechaHoraFin ?? undefined,
    descripcion: o.descripcion ?? undefined,
    // El backend hoy sólo da la CANTIDAD (CU-11 paso 6), no los IDs reales —
    // Módulo 4 (agentes/grupos) todavía no está migrado. Se arma un array del
    // tamaño correcto sólo para que sigan andando los `.length` que ya usaba
    // esta pantalla; nunca se lee como IDs de verdad (ver `hasGpxPending`).
    agenteIds: Array.from({ length: o.cantidadAgentes }, (_, i) => `sin-migrar-${i}`),
    grupoIds: [],
    sectores: [],
    puntos: [],
    kmRastrillados: 0,
    coordinadorId: o.coordinadorId,
  };
}

type ModalType = 'create' | 'edit' | 'qr' | 'delete' | 'finalize' | null;
type ViewMode = 'card' | 'list';
type FilterEstado = 'vigentes' | 'all' | EstadoOperativo;
type ModalTab = 'operativo' | 'objetivo';

/* ── form base ── */
const emptyForm = {
  nombre: '',
  estado: 'nuevo' as EstadoOperativo,
  ubicacion: '',
  fiscal: '',
  punto0lat: '',
  punto0lng: '',
  fechaInicio: new Date().toISOString().slice(0, 16),
  descripcion: '',
  objetivo: '',
};

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: 'var(--input-background)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
    fontSize: 'var(--text-base)',
    fontFamily: 'var(--font-family-primary)',
    ...extra,
  };
}

function labelStyle(): React.CSSProperties {
  return {
    color: 'var(--foreground)',
    fontSize: 'var(--text-label)',
    fontWeight: 'var(--font-weight-semibold)',
    fontFamily: 'var(--font-family-primary)',
    display: 'block',
    marginBottom: 4,
  };
}

function errStyle(base: React.CSSProperties, hasError: boolean): React.CSSProperties {
  return hasError
    ? { ...base, border: '1.5px solid var(--primary)', background: 'rgba(229,75,75,0.04)' }
    : base;
}

function readOnlyInputStyle(): React.CSSProperties {
  return {
    background: 'var(--muted)',
    border: '1px solid var(--border)',
    color: 'var(--muted-foreground)',
    fontSize: 'var(--text-base)',
    fontFamily: 'var(--font-family-primary)',
    cursor: 'default',
    opacity: 0.8,
  };
}

/* ── Component ── */
export default function Operativos() {
  const navigate = useNavigate();
  const { usuario } = useApp();

  /* ── Datos REALES desde la API (CU-11) ──────────────────────────────────
   * Igual patrón que Usuarios.tsx: se pide la lista completa y el filtrado
   * por estado / búsqueda sigue siendo client-side (más abajo, sin cambios) —
   * el dataset de un sistema de este tamaño no lo justifica todavía.        */
  const [operativos, setOperativos] = useState<Operativo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorApi, setErrorApi] = useState('');

  const cargarOperativos = async () => {
    setCargando(true);
    setErrorApi('');
    try {
      const { operativos: lista } = await operativosApi.listar();
      setOperativos(lista.map(mapearOperativo));
    } catch (err) {
      setErrorApi(err instanceof ApiError ? err.message : 'No se pudo contactar al servidor.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarOperativos(); }, []);

  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<Operativo | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Set<string>>(new Set());
  const [formErrorMsg, setFormErrorMsg] = useState('');

  /* ── view / filter state ── */
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState<FilterEstado>(
    (searchParams.get('estado') as FilterEstado) ?? 'vigentes'
  );

  /* modal tab */
  const [modalTab, setModalTab] = useState<ModalTab>('operativo');

  /* objetivo buscado */
  const [objTipo, setObjTipo] = useState<TipoObjetivo | ''>('');
  const [objPersonaForm, setObjPersonaForm] = useState<PersonaForm>(emptyPersonaForm);
  const [objImagenes, setObjImagenes] = useState<string[]>([]);
  const [objObjetoForm, setObjObjetoForm] = useState<ObjetoForm>(emptyObjetoForm);
  const [objObjetoImagenes, setObjObjetoImagenes] = useState<string[]>([]);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  /* ── finalize state ── */
  const [finalizeNota, setFinalizeNota] = useState('');
  const [finalizeStep, setFinalizeStep] = useState<'confirm' | 'gpx_warning'>('confirm');

  /* ── open/close helpers ── */
  const resetObjetivo = () => {
    setObjTipo('');
    setObjPersonaForm(emptyPersonaForm);
    setObjImagenes([]);
    setObjObjetoForm(emptyObjetoForm);
    setObjObjetoImagenes([]);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setSelected(null);
    resetObjetivo();
    setFormErrors(new Set());
    setFormErrorMsg('');
    setModalTab('operativo');
    setModal('create');
  };

  const openEdit = (op: Operativo) => {
    setSelected(op);
    setFormErrors(new Set());
    setFormErrorMsg('');
    setModalTab('operativo');
    setForm({
      nombre: op.nombre,
      estado: op.estado,
      ubicacion: op.ubicacion,
      fiscal: op.fiscal || '',
      punto0lat: op.punto0 ? String(op.punto0.lat) : '',
      punto0lng: op.punto0 ? String(op.punto0.lng) : '',
      fechaInicio: op.fechaInicio.length === 10 ? `${op.fechaInicio}T00:00` : op.fechaInicio.slice(0, 16),
      descripcion: op.descripcion || '',
      objetivo: op.objetivo || '',
    });
    if (op.objetivoBusqueda?.tipo === 'persona' && op.objetivoBusqueda.persona) {
      const { imagenes, ...rest } = op.objetivoBusqueda.persona;
      setObjTipo('persona');
      setObjPersonaForm(buildPersonaForm(rest));
      setObjImagenes(imagenes ?? []);
      setObjObjetoForm(emptyObjetoForm);
      setObjObjetoImagenes([]);
    } else if (op.objetivoBusqueda?.tipo === 'objeto' && op.objetivoBusqueda.objeto) {
      const { imagenes, ...rest } = op.objetivoBusqueda.objeto;
      setObjTipo('objeto');
      setObjObjetoForm(buildObjetoForm(rest));
      setObjObjetoImagenes(imagenes ?? []);
      setObjPersonaForm(emptyPersonaForm);
      setObjImagenes([]);
    } else {
      resetObjetivo();
    }
    setModal('edit');
  };

  const openQr = (op: Operativo) => { setSelected(op); setModal('qr'); };
  const openDelete = (op: Operativo) => { setSelected(op); setModal('delete'); };

  /**
   * CU-08 paso 8 (Transición Automática): entrar por primera vez a un
   * operativo NUEVO lo pasa a ACTIVO. Se espera la respuesta antes de navegar
   * para que el panel ya encuentre el estado correcto — si se generara un QR
   * ahí mismo, la precondición de CU-15 (ACTIVO/EN_PLANIFICACION) tiene que
   * estar cumplida.
   */
  const entrarAOperativo = async (op: Operativo) => {
    if (op.estado === 'nuevo') {
      try { await operativosApi.activar(op.id); } catch { /* no bloquea la navegación */ }
    }
    navigate(`/operativo/${op.id}/dashboard`);
  };

  /* ── finalize helpers ──
   * El aviso de "GPX sin sincronizar" (CU-10 paso 5.1) necesita el subsistema
   * de tracking real (Módulo 5, todavía no construido) para saber si hay algo
   * pendiente de verdad. Con el conteo de agentes como aproximación se
   * mostraría la advertencia con datos inventados; se desactiva hasta que
   * exista una fuente real que consultar. */
  const hasGpxPending = (_op: Operativo) => false;

  const openFinalize = (op: Operativo) => {
    setSelected(op);
    setFinalizeNota('');
    setFinalizeStep('confirm');
    setModal('finalize');
  };

  const handleFinalizeConfirm = () => {
    if (!selected) return;
    if (hasGpxPending(selected)) {
      setFinalizeStep('gpx_warning');
    } else {
      handleFinalizeExec();
    }
  };

  const handleFinalizeExec = async () => {
    if (!selected) return;
    try {
      // CU-10 paso 7: el backend libera a TODO el personal asignado en la
      // misma operación — no es sólo cambiar el estado del operativo.
      await operativosApi.finalizar(selected.id, finalizeNota.trim() || undefined);
      setModal(null);
      await cargarOperativos();
      toast.success('Operativo finalizado correctamente. Personal liberado.', {
        duration: 5000,
        style: {
          background: '#f0fdf4',
          border: '1px solid #86efac',
          color: '#15803d',
          fontFamily: 'var(--font-family-primary)',
          fontSize: 'var(--text-base)',
        },
      });
    } catch (err) {
      setModal(null);
      toast.error(err instanceof ApiError ? err.message : 'No se pudo finalizar el operativo.');
    }
  };

  /* ── build objetivoBusqueda payload ── */
  const buildObjetivo = () => {
    if (objTipo === 'persona') {
      const f = objPersonaForm;
      const hasData = f.nombre || f.apellido || f.edad || f.estatura || f.sexo || objImagenes.length > 0;
      if (!hasData) return undefined;
      return {
        tipo: 'persona' as TipoObjetivo,
        persona: {
          nombre: f.nombre,
          apellido: f.apellido,
          dni: f.dni || undefined,
          edad: f.edad ? Number(f.edad) : undefined,
          sexo: f.sexo || undefined,
          nacionalidad: f.nacionalidad || undefined,
          estatura: f.estatura || undefined,
          complexion: f.complexion || undefined,
          colorPiel: f.colorPiel || undefined,
          colorOjos: f.colorOjos || undefined,
          colorCabello: f.colorCabello || undefined,
          detallesAdicionales: f.detallesAdicionales || undefined,
          imagenes: objImagenes,
        },
      };
    }
    if (objTipo === 'objeto') {
      const f = objObjetoForm;
      const hasData = f.nombre || f.descripcion || f.marca || f.modelo || objObjetoImagenes.length > 0;
      if (!hasData) return undefined;
      return {
        tipo: 'objeto' as TipoObjetivo,
        objeto: {
          nombre: f.nombre,
          tipo: f.tipo || undefined,
          descripcion: f.descripcion || undefined,
          color: f.color || undefined,
          marca: f.marca || undefined,
          modelo: f.modelo || undefined,
          dimensiones: f.dimensiones || undefined,
          detallesAdicionales: f.detallesAdicionales || undefined,
          imagenes: objObjetoImagenes,
        },
      };
    }
    return undefined;
  };

  const handleCreate = async () => {
    const errors = new Set<string>();
    if (!form.nombre.trim())      errors.add('nombre');
    if (!form.ubicacion.trim())   errors.add('ubicacion');
    if (!form.fiscal.trim())      errors.add('fiscal');
    if (!form.punto0lat.trim())   errors.add('punto0lat');
    if (!form.punto0lng.trim())   errors.add('punto0lng');
    if (!form.fechaInicio.trim()) errors.add('fechaInicio');
    if (errors.size > 0) {
      setFormErrors(errors);
      setFormErrorMsg('Completá los campos obligatorios para continuar.');
      return;
    }
    const lat = parseFloat(form.punto0lat);
    const lng = parseFloat(form.punto0lng);
    if (isNaN(lat) || lat < -90 || lat > 90)   { setFormErrors(new Set(['punto0lat'])); setFormErrorMsg('Latitud inválida (–90 a 90).'); return; }
    if (isNaN(lng) || lng < -180 || lng > 180) { setFormErrors(new Set(['punto0lng'])); setFormErrorMsg('Longitud inválida (–180 a 180).'); return; }
    setFormErrors(new Set());
    setFormErrorMsg('');
    try {
      // El "Objetivo Buscado" cargado en la otra pestaña (buildObjetivo()) NO
      // se envía todavía: CU-12..14 no tienen endpoint. Se pierde al cerrar el
      // modal hasta que se migre — ver el comentario junto a mapearOperativo.
      await operativosApi.crear({
        titulo: form.nombre.trim(),
        localidad: form.ubicacion.trim(),
        fiscalInstruccion: form.fiscal.trim(),
        descripcion: form.descripcion || undefined,
        puntoCeroLat: lat,
        puntoCeroLng: lng,
        fechaHoraInicio: form.fechaInicio,
      });
      setModal(null);
      await cargarOperativos();
    } catch (err) {
      // Incluye el 409 de carátula duplicada en 24h (CU-08 Observaciones).
      setFormErrorMsg(err instanceof ApiError ? err.message : 'No se pudo crear el operativo.');
    }
  };

  const handleEdit = async () => {
    if (!selected) return;
    const errors = new Set<string>();
    if (!form.nombre.trim())      errors.add('nombre');
    if (!form.ubicacion.trim())   errors.add('ubicacion');
    if (!form.fiscal.trim())      errors.add('fiscal');
    if (!form.punto0lat.trim())   errors.add('punto0lat');
    if (!form.punto0lng.trim())   errors.add('punto0lng');
    if (errors.size > 0) {
      setFormErrors(errors);
      setFormErrorMsg('Faltan completar campos obligatorios.');
      return;
    }
    const latVal = parseFloat(form.punto0lat);
    const lngVal = parseFloat(form.punto0lng);
    if (isNaN(latVal) || latVal < -90 || latVal > 90)   { setFormErrors(new Set(['punto0lat'])); setFormErrorMsg('Latitud inválida (–90 a 90).'); return; }
    if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) { setFormErrors(new Set(['punto0lng'])); setFormErrorMsg('Longitud inválida (–180 a 180).'); return; }
    setFormErrors(new Set());
    setFormErrorMsg('');
    try {
      // `estado` no se manda: el backend rechaza intentar transicionarlo por
      // esta vía genérica (existen endpoints dedicados — activar/finalizar —
      // mismo criterio que ya se usa para usuarios con ELIMINADO en CU-06).
      await operativosApi.actualizar(selected.id, {
        titulo: form.nombre.trim(),
        localidad: form.ubicacion.trim(),
        fiscalInstruccion: form.fiscal.trim(),
        descripcion: form.descripcion || undefined,
        puntoCeroLat: latVal,
        puntoCeroLng: lngVal,
        fechaHoraInicio: form.fechaInicio,
      });
      setModal(null);
      await cargarOperativos();
    } catch (err) {
      // Incluye el 409 de "sólo lectura" si el operativo pasó a
      // Finalizado/Eliminado mientras el modal estaba abierto (CU-09 obs.).
      setFormErrorMsg(err instanceof ApiError ? err.message : 'No se pudo modificar el operativo.');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      // El backend sólo la permite si sigue en NUEVO — no hay CU formal de
      // "Eliminar Operativo"; uno ya en curso se cierra con Finalizar (CU-10).
      await operativosApi.eliminar(selected.id);
      setModal(null);
      await cargarOperativos();
    } catch (err) {
      setModal(null);
      toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar el operativo.');
    }
  };

  /* ── filtered list ── */
  const filteredOperativos = useMemo(() => {
    let list = [...operativos];
    if (filterEstado === 'vigentes') {
      list = list.filter(o => esVigente(o.estado));
    } else if (filterEstado !== 'all') {
      list = list.filter(o => o.estado === filterEstado);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        o.nombre.toLowerCase().includes(q) ||
        o.ubicacion.toLowerCase().includes(q) ||
        (o.descripcion ?? '').toLowerCase().includes(q) ||
        (o.objetivoBusqueda?.persona?.nombre ?? '').toLowerCase().includes(q) ||
        (o.objetivoBusqueda?.persona?.apellido ?? '').toLowerCase().includes(q) ||
        (o.objetivoBusqueda?.objeto?.nombre ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [operativos, filterEstado, searchQuery]);


  const estadoColors: Record<string, string> = {
    activo: '#16a34a',
    'planificación': '#ca8a04',
    inactivo: '#dc2626',
    nuevo: '#FFA987',
    en_proceso: '#2563eb',
    finalizado: '#6b7280',
    eliminado: '#be185d',
  };

  /* read-only mode: operativos finalizados o eliminados no pueden modificarse */
  const isEditReadOnly =
    modal === 'edit' &&
    (selected?.estado === 'finalizado' || selected?.estado === 'eliminado');


  return (
    <div className="p-6 md:p-8" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h1)', fontWeight: 'var(--font-weight-bold)' }}>
              Sistema de Búsqueda y Rastreo
            </h1>
            <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
              Dirección de Unidades de Alto Riesgo (DUAR) — Córdoba
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-button)] text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
          >
            <Plus size={16} />
            Nuevo Operativo
          </button>
        </div>

        {/* Stats strip */}

      </div>

      {/* Rechazos del servidor: carátula duplicada (CU-08 obs.), solo-lectura
          (CU-09 obs.), o caída de la API. */}
      {errorApi && (
        <div
          className="flex items-start gap-2.5 p-3 rounded-lg mb-4"
          style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 'var(--text-base)' }}
        >
          <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{errorApi}</span>
          <button
            onClick={() => setErrorApi('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}
            aria-label="Cerrar aviso"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Toolbar: Search + Tabs + View Toggle ── */}
      <div
        className="flex flex-col gap-0 mb-5 rounded-[var(--radius-card)] overflow-hidden"
        style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)', border: '1px solid var(--border)' }}
      >
        {/* Row 1: search input + view toggle */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--muted-foreground)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por título..."
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
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
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
              { mode: 'card' as ViewMode, icon: <LayoutGrid size={15} />, label: 'Tarjetas' },
              { mode: 'list' as ViewMode, icon: <List size={15} />, label: 'Lista' },
            ]).map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded"
                style={{
                  background: viewMode === mode ? 'var(--card)' : 'transparent',
                  color: viewMode === mode ? 'var(--primary)' : 'var(--muted-foreground)',
                  fontFamily: 'var(--font-family-primary)',
                  fontSize: 'var(--text-label)',
                  fontWeight: viewMode === mode ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                  boxShadow: viewMode === mode ? 'var(--elevation-sm)' : 'none',
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

          {/* Results counter */}
          {(searchQuery || filterEstado !== 'vigentes') && filteredOperativos.length < operativos.length && (
            <span
              className="hidden sm:block flex-shrink-0"
              style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}
            >
              {filteredOperativos.length} de {operativos.length}
            </span>
          )}
        </div>

        {/* Row 2: estado filter tabs */}
        <div
          className="flex items-stretch overflow-x-auto"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {([
            { value: 'all',           label: 'Todos',           dot: 'var(--muted-foreground)', count: operativos.length },
            { value: 'vigentes',      label: 'Vigentes',        dot: '#16a34a',  count: operativos.filter(o => esVigente(o.estado)).length },
            { value: 'nuevo',        label: 'Nuevo',           dot: '#FFA987',  count: operativos.filter(o => o.estado === 'nuevo').length },
            { value: 'activo',       label: 'Activos',         dot: '#16a34a',  count: operativos.filter(o => o.estado === 'activo').length },
            { value: 'planificación',label: 'En Planificación',dot: '#ca8a04',  count: operativos.filter(o => o.estado === 'planificación').length },
            { value: 'en_proceso',   label: 'En Proceso',      dot: '#2563eb',  count: operativos.filter(o => o.estado === 'en_proceso').length },
            { value: 'inactivo',     label: 'Inactivos',       dot: '#dc2626',  count: operativos.filter(o => o.estado === 'inactivo').length },
            { value: 'finalizado',   label: 'Finalizados',     dot: '#6b7280',  count: operativos.filter(o => o.estado === 'finalizado').length },
          ] as { value: FilterEstado; label: string; dot: string; count: number }[]).map((tab, idx, arr) => {
            const isActive = filterEstado === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilterEstado(tab.value)}
                className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 relative transition-colors"
                style={{
                  background: isActive ? 'rgba(229,75,75,0.05)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                  fontFamily: 'var(--font-family-primary)',
                  fontSize: 'var(--text-label)',
                  fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                  border: 'none',
                  borderRight: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: isActive ? 'var(--primary)' : tab.dot }}
                />
                {tab.label}
                <span
                  className="inline-flex items-center justify-center px-1.5 rounded-full min-w-[18px]"
                  style={{
                    background: isActive ? 'rgba(229,75,75,0.12)' : 'var(--muted)',
                    color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                    fontSize: '10px',
                    fontFamily: 'var(--font-family-primary)',
                    fontWeight: 'var(--font-weight-semibold)',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content area ── */}
      {cargando ? (
        <div
          className="flex items-center justify-center py-20 rounded-[var(--radius-card)]"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}
        >
          Cargando operativos…
        </div>
      ) : operativos.length === 0 ? (
        /* Empty — no operativos at all */
        <div
          className="flex flex-col items-center justify-center py-20 rounded-[var(--radius-card)]"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(229,75,75,0.1)' }}>
            <Plus size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <p className="mb-1" style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
            No hay operativos vigentes
          </p>
          <p className="mb-4" style={{ fontSize: 'var(--text-base)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}>
            Creá el primer operativo para comenzar.
          </p>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-[var(--radius-button)] text-white"
            style={{ background: 'var(--primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', cursor: 'pointer' }}
          >
            Crear operativo
          </button>
        </div>
      ) : filteredOperativos.length === 0 ? (
        /* Empty — filters / search return nothing */
        <div
          className="flex flex-col items-center justify-center py-16 rounded-[var(--radius-card)]"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(229,75,75,0.08)' }}
          >
            <Search size={22} style={{ color: 'var(--primary)' }} />
          </div>
          <p className="mb-1" style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)' }}>
            No hay operativos vigentes
          </p>
          <p className="mb-5 text-center px-8" style={{ fontSize: 'var(--text-base)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}>
            {searchQuery
              ? `No se encontraron resultados para "${searchQuery}".`
              : 'No hay operativos activos o en proceso para el filtro seleccionado.'}
          </p>
          <button
            onClick={() => { setSearchQuery(''); setFilterEstado('vigentes'); }}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)]"
            style={{
              background: 'var(--muted)', color: 'var(--foreground)',
              fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'var(--font-family-primary)', border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
            Limpiar filtros
          </button>
        </div>
      ) : viewMode === 'card' ? (
        /* ═══════ CARD VIEW ═══════ */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredOperativos.map(op => (
            <div
              key={op.id}
              className="rounded-[var(--radius-card)] flex flex-col overflow-hidden group"
              style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)', border: '1px solid var(--border)', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--elevation-md)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--elevation-sm)'}
            >
              {/* Accent bar */}
              <div className="h-1 w-full flex-shrink-0" style={{ background: estadoColors[op.estado] || 'var(--primary)' }} />

              {/* Clickeable body → navega al panel */}
              <button
                onClick={() => { void entrarAOperativo(op); }}
                className="p-5 flex-1 flex flex-col text-left w-full"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {/* Title + Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3
                    className="leading-snug"
                    style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}
                  >
                    {op.nombre}
                  </h3>
                  <div className="flex-shrink-0"><StatusBadge estado={op.estado} size="sm" /></div>
                </div>

                {/* Metadata rows */}
                <div className="flex flex-col gap-2 flex-1">
                  {/* Localidad */}
                  <div className="flex items-center gap-2">
                    <MapPin size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span className="truncate" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}>
                      {op.ubicacion}
                    </span>
                  </div>

                  {/* Fecha de inicio */}
                  <div className="flex items-center gap-2">
                    <Calendar size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}>
                      {new Date(op.fechaInicio).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  {/* Agentes */}
                  <div className="flex items-center gap-2">
                    <Users size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}>
                      {op.agenteIds.length} agente{op.agenteIds.length !== 1 ? 's' : ''} asignado{op.agenteIds.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Objetivo buscado */}
                  {op.objetivoBusqueda && (
                    <div className="flex items-center gap-1.5">
                      {op.objetivoBusqueda.tipo === 'persona'
                        ? <User size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                        : <Package size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />}
                      <span className="truncate" style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-primary)' }}>
                        {op.objetivoBusqueda.tipo === 'persona'
                          ? `${op.objetivoBusqueda.persona?.nombre ?? ''} ${op.objetivoBusqueda.persona?.apellido ?? ''}`.trim() || 'Persona buscada'
                          : op.objetivoBusqueda.objeto?.nombre || 'Objeto buscado'}
                      </span>
                    </div>
                  )}

                  {/* UUID abreviado */}
                  <div className="flex items-center gap-1.5 mt-auto pt-2">
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-family-primary)',
                        color: 'var(--muted-foreground)',
                        background: 'var(--muted)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        padding: '1px 6px',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '0.02em',
                      }}
                    >
                      ID: {op.id.slice(0, 8)}…
                    </span>
                  </div>
                </div>
              </button>

              {/* Footer: acciones rápidas + link al panel */}
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop: '1px solid var(--border)', background: 'var(--muted)' }}
              >
                {/* Quick actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={e => { e.stopPropagation(); openQr(op); }}
                    title="Código QR"
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--card)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                  >
                    <QrCode size={14} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(op); }}
                    title="Modificar"
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--card)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                  >
                    <Edit2 size={14} />
                  </button>
                  {op.estado !== 'finalizado' && op.estado !== 'eliminado' && (
                    <button
                      onClick={e => { e.stopPropagation(); openFinalize(op); }}
                      title="Finalizar operativo"
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: '#b45309', background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fef3c7'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                    >
                      <Flag size={14} />
                    </button>
                  )}
                  {op.estado === 'nuevo' && (
                    <button
                      onClick={e => { e.stopPropagation(); openDelete(op); }}
                      title="Eliminar"
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fee2e2'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Acceder al panel */}
                <button
                  onClick={() => { void entrarAOperativo(op); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{
                    color: 'var(--primary)',
                    background: 'rgba(229,75,75,0.08)',
                    border: '1px solid rgba(229,75,75,0.18)',
                    fontFamily: 'var(--font-family-primary)',
                    fontSize: 'var(--text-label)',
                    fontWeight: 'var(--font-weight-semibold)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.15)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.08)'}
                >
                  Panel
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ═══════ LIST VIEW ═══════ */
        <div
          className="rounded-[var(--radius-card)] overflow-hidden"
          style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)', border: '1px solid var(--border)' }}
        >
          {/* Table header */}
          <div
            className="hidden md:grid px-5 py-2.5 gap-3"
            style={{
              background: 'var(--muted)',
              borderBottom: '1px solid var(--border)',
              gridTemplateColumns: '3fr 1fr 1.5fr 1fr auto',
            }}
          >
            {['Operativo', 'Estado', 'Ubicación', 'Inicio', ''].map(col => (
              <span key={col} style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--font-family-primary)' }}>
                {col}
              </span>
            ))}
          </div>

          {/* Rows */}
          {filteredOperativos.map((op, idx) => (
            <div
              key={op.id}
              className="flex flex-col md:grid px-5 py-3.5 gap-2 md:gap-3 md:items-center transition-colors"
              style={{
                gridTemplateColumns: '3fr 1fr 1.5fr 1fr auto',
                borderBottom: idx < filteredOperativos.length - 1 ? '1px solid var(--border)' : 'none',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--muted)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              {/* Name col */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-1 self-stretch rounded-full flex-shrink-0 min-h-[36px]" style={{ background: estadoColors[op.estado] || 'var(--primary)' }} />
                <div className="min-w-0">
                  <p className="truncate" style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
                    {op.nombre}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
                      <Users size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                      {op.agenteIds.length} agente{op.agenteIds.length !== 1 ? 's' : ''}
                    </span>
                    {op.objetivoBusqueda && (
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
                        {op.objetivoBusqueda.tipo === 'persona'
                          ? <User size={10} style={{ display: 'inline', marginRight: 2, verticalAlign: 'middle' }} />
                          : <Package size={10} style={{ display: 'inline', marginRight: 2, verticalAlign: 'middle' }} />}
                        {op.objetivoBusqueda.tipo === 'persona'
                          ? (`${op.objetivoBusqueda.persona?.nombre ?? ''} ${op.objetivoBusqueda.persona?.apellido ?? ''}`.trim() || 'Persona')
                          : (op.objetivoBusqueda.objeto?.nombre || 'Objeto')}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-family-primary)',
                        color: 'var(--muted-foreground)',
                        background: 'var(--muted)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        padding: '0px 5px',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      ID: {op.id.slice(0, 8)}…
                    </span>
                  </div>
                </div>
              </div>

              {/* Status col */}
              <div className="md:block">
                <StatusBadge estado={op.estado} size="sm" />
              </div>

              {/* Location col */}
              <div className="min-w-0 hidden md:flex items-center gap-1.5">
                <MapPin size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span className="truncate" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
                  {op.ubicacion}
                </span>
              </div>

              {/* Date col */}
              <div className="hidden md:flex items-center gap-1.5">
                <Calendar size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
                  {new Date(op.fechaInicio).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>

              {/* Actions col */}
              <div className="flex items-center gap-1 flex-shrink-0 mt-2 md:mt-0">
                <button onClick={() => openQr(op)} title="Código QR" className="p-1.5 rounded-lg" style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--border)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <QrCode size={14} />
                </button>
                <button onClick={() => openEdit(op)} title="Modificar" className="p-1.5 rounded-lg" style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--border)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <Edit2 size={14} />
                </button>
                {op.estado !== 'finalizado' && op.estado !== 'eliminado' && (
                  <button onClick={() => openFinalize(op)} title="Finalizar operativo" className="p-1.5 rounded-lg" style={{ color: '#b45309', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fef3c7'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <Flag size={14} />
                  </button>
                )}
                {op.estado === 'nuevo' && (
                  <button onClick={() => openDelete(op)} title="Eliminar" className="p-1.5 rounded-lg" style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fee2e2'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  onClick={() => { void entrarAOperativo(op); }}
                  title="Acceder al panel"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ml-1"
                  style={{ color: 'var(--primary)', background: 'rgba(229,75,75,0.08)', border: '1px solid rgba(229,75,75,0.2)', cursor: 'pointer', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.15)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.08)'}
                >
                  Panel
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════ CREATE / EDIT MODAL ════ */}
      {(modal === 'create' || modal === 'edit') && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              boxShadow: 'var(--elevation-md)',
              borderRadius: 'var(--radius-card)',
              width: '100%',
              maxWidth: '640px',
              height: 'min(90vh, 760px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <h2 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
                  {modal === 'create' ? 'Nuevo Operativo' : 'Modificar Operativo'}
                </h2>
                {modal === 'create' && (
                  <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', marginTop: 2 }}>
                    Estado inicial: <span style={{ color: '#FFA987', fontWeight: 'var(--font-weight-semibold)' }}>Nuevo</span> — se activará al ingresar al panel
                  </p>
                )}
              </div>
              <button onClick={() => setModal(null)} style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* ── Tab Toggle ── */}
            {(() => {
              const hasObjetivoData = !!(
                objTipo === 'persona'
                  ? (objPersonaForm.nombre || objPersonaForm.apellido || objPersonaForm.edad || objPersonaForm.estatura || objPersonaForm.sexo || objImagenes.length > 0)
                  : objTipo === 'objeto'
                    ? (objObjetoForm.nombre || objObjetoForm.descripcion || objObjetoForm.marca || objObjetoForm.modelo || objObjetoImagenes.length > 0)
                    : false
              );
              const tabs: { id: ModalTab; label: string; icon: ReactNode }[] = [
                { id: 'operativo', label: 'Datos del Operativo', icon: <Crosshair size={13} /> },
                { id: 'objetivo',  label: 'Objetivo Buscado',   icon: objTipo === 'objeto' ? <Package size={13} /> : <User size={13} /> },
              ];
              return (
                <div
                  className="flex items-center gap-1 px-5 py-3 flex-shrink-0"
                  style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}
                >
                  {tabs.map(tab => {
                    const active = modalTab === tab.id;
                    const showDot = tab.id === 'objetivo' && hasObjetivoData;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setModalTab(tab.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)] relative transition-all"
                        style={{
                          background: active ? 'var(--card)' : 'transparent',
                          color: active ? 'var(--primary)' : 'var(--muted-foreground)',
                          fontFamily: 'var(--font-family-primary)',
                          fontSize: 'var(--text-label)',
                          fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                          border: active ? '1px solid var(--border)' : '1px solid transparent',
                          boxShadow: active ? 'var(--elevation-sm)' : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {tab.icon}
                        {tab.label}
                        {showDot && (
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: active ? 'var(--primary)' : '#FFA987' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: '1 1 0', minHeight: 0, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* ── Banner de bloqueo: solo lectura (Finalizado / Eliminado) ── */}
              {isEditReadOnly && (
                <div
                  className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius-input)]"
                  style={{ background: 'rgba(107,114,128,0.1)', border: '1.5px solid rgba(107,114,128,0.4)' }}
                >
                  <Lock size={15} style={{ color: '#6b7280', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ color: '#374151', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', fontWeight: 'var(--font-weight-semibold)' }}>
                      Modificación bloqueada
                    </p>
                    <p style={{ color: '#6b7280', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', marginTop: 2 }}>
                      El operativo se encuentra {selected?.estado === 'eliminado' ? 'Eliminado' : 'Finalizado'} y no puede modificarse por razones legales y de trazabilidad.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Error banner ── */}
              {formErrorMsg && !isEditReadOnly && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-input)]"
                  style={{ background: 'rgba(229,75,75,0.08)', border: '1px solid rgba(229,75,75,0.3)' }}
                >
                  <AlertCircle size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--primary)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>{formErrorMsg}</span>
                </div>
              )}

              {/* ══════════════════════════════
                  TAB: DATOS DEL OPERATIVO
              ══════════════════════════════ */}
              {modalTab === 'operativo' && (
                <>
                  {/* ── Sección: Datos del Operativo ── */}
                  <div className="flex flex-col gap-4">
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-family-primary)' }}>
                      Datos del operativo
                    </p>

                    {/* Titulo */}
                    <div>
                      <label style={labelStyle()}>Título *</label>
                      <input
                        type="text"
                        value={form.nombre}
                        readOnly={isEditReadOnly}
                        onChange={isEditReadOnly ? undefined : e => { setForm({ ...form, nombre: e.target.value }); setFormErrors(p => { const n = new Set(p); n.delete('nombre'); return n; }); }}
                        placeholder="Ej: Búsqueda Cerro Champaquí — García Juan"
                        className="w-full px-3 py-2.5 rounded-lg border outline-none"
                        style={isEditReadOnly ? readOnlyInputStyle() : errStyle(inputStyle(), formErrors.has('nombre'))}
                      />
                      {!isEditReadOnly && formErrors.has('nombre') && <span style={{ color: 'var(--primary)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>Campo obligatorio</span>}
                    </div>

                    {/* Localidad + Fecha y Hora */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label style={labelStyle()}>Localidad *</label>
                        <input
                          type="text"
                          value={form.ubicacion}
                          readOnly={isEditReadOnly}
                          onChange={isEditReadOnly ? undefined : e => { setForm({ ...form, ubicacion: e.target.value }); setFormErrors(p => { const n = new Set(p); n.delete('ubicacion'); return n; }); }}
                          placeholder="Ej: La Cumbrecita, Córdoba"
                          className="w-full px-3 py-2.5 rounded-lg border outline-none"
                          style={isEditReadOnly ? readOnlyInputStyle() : errStyle(inputStyle(), formErrors.has('ubicacion'))}
                        />
                        {!isEditReadOnly && formErrors.has('ubicacion') && <span style={{ color: 'var(--primary)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>Obligatorio</span>}
                      </div>
                      <div>
                        <label style={labelStyle()}>Fecha y Hora *</label>
                        <input
                          type="datetime-local"
                          value={form.fechaInicio}
                          readOnly={isEditReadOnly}
                          onChange={isEditReadOnly ? undefined : e => { setForm({ ...form, fechaInicio: e.target.value }); setFormErrors(p => { const n = new Set(p); n.delete('fechaInicio'); return n; }); }}
                          className="w-full px-3 py-2.5 rounded-lg border outline-none"
                          style={isEditReadOnly ? readOnlyInputStyle() : errStyle(inputStyle(), formErrors.has('fechaInicio'))}
                        />
                        {!isEditReadOnly && formErrors.has('fechaInicio') && <span style={{ color: 'var(--primary)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>Obligatorio</span>}
                      </div>
                    </div>

                    {/* Fiscal de Instrucción */}
                    <div>
                      <label style={labelStyle()}>Fiscal de Instrucción *</label>
                      <input
                        type="text"
                        value={form.fiscal}
                        readOnly={isEditReadOnly}
                        onChange={isEditReadOnly ? undefined : e => { setForm({ ...form, fiscal: e.target.value }); setFormErrors(p => { const n = new Set(p); n.delete('fiscal'); return n; }); }}
                        placeholder="Nombre y apellido del fiscal a cargo"
                        className="w-full px-3 py-2.5 rounded-lg border outline-none"
                        style={isEditReadOnly ? readOnlyInputStyle() : errStyle(inputStyle(), formErrors.has('fiscal'))}
                      />
                      {!isEditReadOnly && formErrors.has('fiscal') && <span style={{ color: 'var(--primary)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>Campo obligatorio</span>}
                    </div>

                    {/* Estado — solo en edición */}
                    {modal === 'edit' && (
                      <div>
                        <label style={labelStyle()}>Estado</label>
                        <select
                          value={form.estado}
                          disabled={isEditReadOnly}
                          onChange={isEditReadOnly ? undefined : e => setForm({ ...form, estado: e.target.value as EstadoOperativo })}
                          className="w-full px-3 py-2.5 rounded-lg border outline-none"
                          style={isEditReadOnly ? readOnlyInputStyle() : inputStyle()}
                        >
                          <option value="nuevo">Nuevo</option>
                          <option value="planificación">En Planificación</option>
                          <option value="activo">Activo</option>
                          <option value="en_proceso">En Proceso</option>
                          <option value="inactivo">Inactivo</option>
                          <option value="finalizado">Finalizado</option>
                          <option value="eliminado">Eliminado</option>
                        </select>
                      </div>
                    )}

                    {/* Descripción del operativo */}
                    <div>
                      <label style={labelStyle()}>Descripción</label>
                      <textarea
                        value={form.descripcion}
                        readOnly={isEditReadOnly}
                        onChange={isEditReadOnly ? undefined : e => setForm({ ...form, descripcion: e.target.value })}
                        rows={3}
                        placeholder="Contexto general del operativo, objetivos, particularidades..."
                        className="w-full px-3 py-2.5 rounded-lg border outline-none resize-none"
                        style={isEditReadOnly ? readOnlyInputStyle() : inputStyle()}
                      />
                    </div>
                  </div>

                  {/* ── Sección: Punto 0 (LSP) ── */}
                  <div className="flex flex-col gap-3">
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-family-primary)' }}>
                      Punto 0 — Última posición conocida (LSP) *
                    </p>
                    <div
                      className="rounded-[var(--radius-input)] p-4 flex flex-col gap-3"
                      style={{ background: 'var(--muted)', border: (formErrors.has('punto0lat') || formErrors.has('punto0lng')) ? '1.5px solid var(--primary)' : '1px solid var(--border)' }}
                    >
                      <div className="flex items-start gap-2">
                        <Crosshair size={14} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
                        <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
                          Coordenadas decimales del punto de última ubicación conocida (WGS84). Podés escribirlas manualmente o seleccionarlo en el mapa.
                        </p>
                      </div>

                      {!isEditReadOnly && (
                        <MapPickerModal
                          initialLat={form.punto0lat}
                          initialLng={form.punto0lng}
                          onConfirm={(lat, lng) => {
                            setForm(f => ({ ...f, punto0lat: lat.toFixed(5), punto0lng: lng.toFixed(5) }));
                            setFormErrors(p => { const n = new Set(p); n.delete('punto0lat'); n.delete('punto0lng'); return n; });
                          }}
                        />
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label style={labelStyle()}>Latitud *</label>
                          <input
                            type="number"
                            step="0.00001"
                            min="-90"
                            max="90"
                            value={form.punto0lat}
                            readOnly={isEditReadOnly}
                            onChange={isEditReadOnly ? undefined : e => { setForm({ ...form, punto0lat: e.target.value }); setFormErrors(p => { const n = new Set(p); n.delete('punto0lat'); return n; }); }}
                            placeholder="Ej: –31.99300"
                            className="w-full px-3 py-2.5 rounded-lg border outline-none"
                            style={isEditReadOnly ? readOnlyInputStyle() : errStyle(inputStyle(), formErrors.has('punto0lat'))}
                          />
                          {!isEditReadOnly && formErrors.has('punto0lat') && <span style={{ color: 'var(--primary)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>Obligatorio</span>}
                        </div>
                        <div>
                          <label style={labelStyle()}>Longitud *</label>
                          <input
                            type="number"
                            step="0.00001"
                            min="-180"
                            max="180"
                            value={form.punto0lng}
                            readOnly={isEditReadOnly}
                            onChange={isEditReadOnly ? undefined : e => { setForm({ ...form, punto0lng: e.target.value }); setFormErrors(p => { const n = new Set(p); n.delete('punto0lng'); return n; }); }}
                            placeholder="Ej: –64.92300"
                            className="w-full px-3 py-2.5 rounded-lg border outline-none"
                            style={isEditReadOnly ? readOnlyInputStyle() : errStyle(inputStyle(), formErrors.has('punto0lng'))}
                          />
                          {!isEditReadOnly && formErrors.has('punto0lng') && <span style={{ color: 'var(--primary)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>Obligatorio</span>}
                        </div>
                      </div>

                      {form.punto0lat && form.punto0lng ? (
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-button)]"
                          style={{ background: 'rgba(229,75,75,0.07)', border: '1px solid rgba(229,75,75,0.2)' }}
                        >
                          <Crosshair size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <span style={{ fontFamily: 'var(--font-family-primary)', fontSize: '11px', color: 'var(--primary)' }}>
                            {parseFloat(form.punto0lat).toFixed(5)}, {parseFloat(form.punto0lng).toFixed(5)}
                          </span>
                        </div>
                      ) : (
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
                          Ejemplo: –31.41667, –64.18333 (Córdoba capital)
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ══════════════════════════════
                  TAB: OBJETIVO BUSCADO
              ══════════════════════════════ */}
              {modalTab === 'objetivo' && (
                <ObjetivoFormContent
                  tipo={objTipo}
                  onTipoChange={t => {
                    if (t === 'persona') { setObjObjetoForm(emptyObjetoForm); setObjObjetoImagenes([]); }
                    else { setObjPersonaForm(emptyPersonaForm); setObjImagenes([]); }
                    setObjTipo(t);
                  }}
                  lockTipo={false}
                  personaForm={objPersonaForm}
                  onPersonaChange={(k, v) => setObjPersonaForm(f => ({ ...f, [k]: v }))}
                  objetoForm={objObjetoForm}
                  onObjetoChange={(k, v) => setObjObjetoForm(f => ({ ...f, [k]: v }))}
                  imagenes={objTipo === 'persona' ? objImagenes : objObjetoImagenes}
                  onImagenesChange={imgs => {
                    if (objTipo === 'persona') setObjImagenes(imgs);
                    else setObjObjetoImagenes(imgs);
                  }}
                  onLightbox={setLightboxImg}
                  isReadOnly={isEditReadOnly}
                />
              )}

              {/* ── Lightbox ── */}
              {lightboxImg && (
                <div
                  onClick={() => setLightboxImg(null)}
                  style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
                >
                  <button
                    onClick={() => setLightboxImg(null)}
                    style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                  >
                    <X size={18} />
                  </button>
                  <img
                    src={lightboxImg}
                    alt="Vista ampliada"
                    onClick={e => e.stopPropagation()}
                    style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 'var(--radius-card)', objectFit: 'contain', boxShadow: 'var(--elevation-md)' }}
                  />
                </div>
              )}

            </div>

            {/* Footer buttons */}
            <div
              className="flex justify-end gap-3 px-6 py-4 flex-shrink-0"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              {isEditReadOnly ? (
                /* Modo solo lectura: únicamente botón Cerrar */
                <button
                  onClick={() => setModal(null)}
                  className="flex items-center gap-2 px-5 py-2 rounded-[var(--radius-button)]"
                  style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', cursor: 'pointer' }}
                >
                  <X size={14} />
                  Cerrar
                </button>
              ) : (
                /* Modo editable: Cancelar + Guardar */
                <>
                  <button
                    onClick={() => setModal(null)}
                    className="px-4 py-2 rounded-[var(--radius-button)] border"
                    style={{ color: 'var(--foreground)', borderColor: 'var(--border)', background: 'transparent', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={modal === 'create' ? handleCreate : handleEdit}
                    className="px-4 py-2 rounded-[var(--radius-button)] text-white"
                    style={{ background: 'var(--primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', cursor: 'pointer' }}
                  >
                    {modal === 'create' ? 'Guardar Operativo' : 'Guardar Cambios'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {modal === 'qr' && selected && (
        <QRModal operativo={selected} onClose={() => setModal(null)} />
      )}

      {/* ══════════════════════════════════════════
          Finalize Modal — CU-09
      ══════════════════════════════════════════ */}
      {modal === 'finalize' && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div
            className="w-full max-w-[440px] rounded-[var(--radius-card)] overflow-hidden"
            style={{ background: 'var(--card)', boxShadow: 'var(--elevation-lg)' }}
          >
            {/* ── Shared header ── */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                {finalizeStep === 'confirm' ? (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#fef3c7' }}
                  >
                    <Flag size={18} style={{ color: '#b45309' }} />
                  </div>
                ) : (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(229,75,75,0.1)' }}
                  >
                    <Clock size={18} style={{ color: 'var(--primary)' }} />
                  </div>
                )}
                <div>
                  <h2 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
                    {finalizeStep === 'confirm' ? 'Finalizar Operativo' : 'Sincronización GPX pendiente'}
                  </h2>
                  <p className="truncate max-w-[240px]" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', marginTop: 1 }}>
                    {selected.nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModal(null)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--muted)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
              >
                <X size={17} />
              </button>
            </div>

            {/* ─────────── STEP: confirm ─────────── */}
            {finalizeStep === 'confirm' && (
              <>
                <div className="px-5 py-5 flex flex-col gap-4">
                  {/* Warning notice */}
                  <div
                    className="flex items-start gap-3 rounded-[var(--radius-input)] px-4 py-3"
                    style={{ background: '#fffbeb', border: '1.5px solid #fcd34d' }}
                  >
                    <AlertCircle size={15} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ color: '#78350f', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.55 }}>
                      Esta acción es <strong>irreversible</strong>. El operativo pasará a estado&nbsp;
                      <strong>Finalizado</strong> y todos los datos quedarán en <strong>modo solo lectura</strong>. El personal asignado será liberado.
                    </p>
                  </div>

                  {/* Textarea opcional */}
                  <div>
                    <label style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', fontFamily: 'var(--font-family-primary)', display: 'block', marginBottom: 6 }}>
                      Reseña o conclusión del operativo
                      <span style={{ color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-regular)', marginLeft: 4 }}>(opcional)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={finalizeNota}
                      onChange={e => setFinalizeNota(e.target.value)}
                      placeholder="Ej: Persona hallada con vida en sector norte. Se desactiva el operativo tras 48 hs de búsqueda…"
                      className="w-full px-3 py-2.5 rounded-[var(--radius-input)] border outline-none resize-none"
                      style={{
                        background: 'var(--background)',
                        border: '1px solid var(--border)',
                        color: 'var(--foreground)',
                        fontSize: 'var(--text-base)',
                        fontFamily: 'var(--font-family-primary)',
                        lineHeight: 1.55,
                      }}
                      onFocus={e => (e.currentTarget.style.border = '1.5px solid var(--primary)')}
                      onBlur={e => (e.currentTarget.style.border = '1px solid var(--border)')}
                    />
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)', marginTop: 4 }}>
                      Esta nota quedará registrada en el Informe Final del operativo.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="flex justify-end gap-3 px-5 py-4"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <button
                    onClick={() => setModal(null)}
                    className="px-4 py-2 rounded-[var(--radius-button)]"
                    style={{
                      color: 'var(--foreground)',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)',
                      fontFamily: 'var(--font-family-primary)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--muted)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleFinalizeConfirm}
                    className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)]"
                    style={{
                      background: '#b45309',
                      color: '#fff',
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)',
                      fontFamily: 'var(--font-family-primary)',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#92400e'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#b45309'}
                  >
                    <CheckCircle2 size={15} />
                    Confirmar Finalización
                  </button>
                </div>
              </>
            )}

            {/* ─────────── STEP: gpx_warning ─────────── */}
            {finalizeStep === 'gpx_warning' && (
              <>
                <div className="px-5 py-5 flex flex-col gap-4">
                  {/* Alert bloqueante */}
                  <div
                    className="flex items-start gap-3 rounded-[var(--radius-input)] px-4 py-4"
                    style={{ background: 'rgba(229,75,75,0.06)', border: '1.5px solid rgba(229,75,75,0.35)' }}
                  >
                    <AlertCircle size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
                        Atención: Existen tracks GPX en proceso de sincronización activa.
                      </p>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', marginTop: 5, lineHeight: 1.55 }}>
                        {selected.agenteIds.length} agente{selected.agenteIds.length !== 1 ? 's' : ''} aún están subiendo datos de rastrillaje. Forzar el cierre puede ocasionar <strong>pérdida de registros GPS</strong> no sincronizados.
                      </p>
                    </div>
                  </div>

                  {/* Indicador visual de agentes sincronizando */}
                  <div
                    className="rounded-[var(--radius-input)] px-4 py-3"
                    style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={12} style={{ color: 'var(--muted-foreground)' }} />
                      <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', fontWeight: 'var(--font-weight-semibold)' }}>
                        Sincronización en curso
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {selected.agenteIds.slice(0, 3).map((id, i) => (
                        <div key={id} className="flex items-center gap-2">
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: i % 2 === 0 ? '#f59e0b' : '#fcd34d', animation: 'pulse 1.5s ease-in-out infinite' }}
                          />
                          <span style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
                            Agente {id} — subiendo track GPX…
                          </span>
                        </div>
                      ))}
                      {selected.agenteIds.length > 3 && (
                        <span style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)', paddingLeft: 14 }}>
                          +{selected.agenteIds.length - 3} más…
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="flex justify-end gap-3 px-5 py-4"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <button
                    onClick={() => setModal(null)}
                    className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)]"
                    style={{
                      color: 'var(--foreground)',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)',
                      fontFamily: 'var(--font-family-primary)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--muted)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <Clock size={14} />
                    Esperar
                  </button>
                  <button
                    onClick={handleFinalizeExec}
                    className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)]"
                    style={{
                      background: 'var(--primary)',
                      color: '#fff',
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)',
                      fontFamily: 'var(--font-family-primary)',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#c0392b'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--primary)'}
                  >
                    <AlertCircle size={15} />
                    Forzar Cierre
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal === 'delete' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-[380px] rounded-[var(--radius-card)] p-6"
            style={{ background: 'var(--card)', boxShadow: 'var(--elevation-md)' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: '#fee2e2' }}>
              <Trash2 size={22} color="#dc2626" />
            </div>
            <h2 className="mb-2" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)' }}>
              Eliminar Operativo
            </h2>
            <p className="mb-5" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
              ¿Seguro que querés eliminar <strong>{selected.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-[var(--radius-button)] border"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border)', background: 'transparent', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-[var(--radius-button)] text-white"
                style={{ background: 'var(--destructive)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
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
