import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Plus, MapPin, Calendar, Users, ArrowRight, QrCode, X, Trash2, Edit2,
  RadioTower, Search, AlertCircle,
  Crosshair, Lock, Flag, CheckCircle2, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '../components/shared/StatusBadge';
import { AccionCabecera } from '../components/layout/Movil';
import { MapPickerModal } from '../components/shared/MapPickerModal';
import { QRModal } from '../components/shared/QRModal';
import { useApp } from '../context/AppContext';
import { ETIQUETA_PUESTO, puedeGestionar } from '../utils/permisos';
import { Operativo, EstadoOperativo } from '../data/mockData';
import { operativosApi, ApiError } from '../services/api';
import { mapearOperativo } from '../utils/mapearOperativo';
import { ETIQUETA_RESULTADO, opcionesResultado, type ResultadoOperativo } from '../utils/resultadoOperativo';
import { fechaHoraArgentina } from '../utils/fechaArgentina';
import SelectorLocalidad from '../components/shared/SelectorLocalidad';
import FiltroDesplegable from '../components/shared/FiltroDesplegable';
import Button from '../components/shared/base/Button';
import {
  Buscador, SelectorVista, BarraFiltros, BotonTextoFiltro, Vacio, BotonIcono, ListaFija,
  tarjetaBase, estiloTitulosColumna, type VistaListado,
} from '../components/shared/Listados';
import { useVistaListado } from '../components/shared/Listados';
import {
  validarTitulo, validarFiscal, filtrarFiscal,
  TITULO_MAX, FISCAL_MAX, DESCRIPCION_MAX, NOTA_FINAL_MAX,
} from '../utils/validacionOperativo';

/**
 * CU-08..11 (Módulo 3) ya hablan con la API real. CU-12..14 (Objetivo Buscado)
 * se cargan aparte, desde la pestaña "Objetivo Buscado" del panel del
 * operativo ya creado (ver src/app/pages/operativo/ObjetivoBuscado.tsx) — así
 * lo describe el CU-12 (paso 1: "accede al panel del operativo específico").
 * Este modal de Crear/Editar Operativo ya NO tiene una pestaña de objetivo:
 * mezclar esa carga acá no está en ningún CU y duplicaba el formulario.
 */

/**
 * "Vigente" = todavía no se cerró: incluye NUEVO y EN_PLANIFICACION, no sólo
 * lo que ya está en curso. Se exporta como función, no como filtro inline
 * duplicado, porque ya se repitió dos veces con definiciones DISTINTAS en
 * este mismo archivo (el contador del botón no coincidía con lo que
 * realmente se mostraba) — mismo criterio que ESTADOS_ACTIVOS en
 * AgenteDashboard.tsx, que ya lo tenía bien.
 */
function esVigente(estado: EstadoOperativo): boolean {
  return estado === 'nuevo' || estado === 'planificación' || estado === 'en_proceso' || estado === 'iniciado' || estado === 'inactivo';
}

/**
 * Puesto de comando (29/10, migración 029) para la tarjeta y la fila del listado:
 * el Coordinador de turno (si no hay, el primero que esté en algún puesto) y
 * "+N" por los demás, o "Sin nadie en el puesto de comando". En ámbar sólo
 * cuando el operativo está en curso y no hay ningún Coordinador de turno.
 */
function puestoDe(op: Operativo): { texto: string; alerta: boolean; detalle: string } {
  const turno = op.puestoComando ?? [];
  const enCurso = op.estado === 'iniciado' || op.estado === 'planificación' || op.estado === 'en_proceso';
  const coord = turno.find(p => p.puesto === 'COORDINADOR');
  const primero = coord ?? turno[0];
  const detalle = turno.map(p => `${ETIQUETA_PUESTO[p.puesto]}: ${p.nombre} ${p.apellido}`).join(' · ');
  if (!primero) return { texto: 'Sin nadie en el puesto de comando', alerta: enCurso, detalle: 'Puesto de comando' };
  const mas = turno.length > 1 ? ` +${turno.length - 1}` : '';
  const prefijo = primero.puesto === 'COORDINADOR' ? '' : `${ETIQUETA_PUESTO[primero.puesto]}: `;
  return { texto: `${prefijo}${primero.nombre} ${primero.apellido}`.trim() + mas, alerta: enCurso && !coord, detalle };
}

type ModalType = 'create' | 'edit' | 'qr' | 'delete' | 'finalize' | null;
type ViewMode = VistaListado;
/** "Vigentes": todavía no se cerró (nuevo, en planificación, en proceso, iniciado o inactivo). Es el filtro de entrada. */
const VIGENTES: EstadoOperativo[] = ['nuevo', 'planificación', 'en_proceso', 'iniciado', 'inactivo'];

/** Estados que se pueden elegir en el filtro, con el color de su punto. */
const ESTADOS_FILTRO: { value: EstadoOperativo; label: string; dot: string }[] = [
  { value: 'nuevo',         label: 'Nuevo',           dot: 'var(--accent)' },
  { value: 'iniciado',      label: 'Iniciado',         dot: '#16a34a' },
  { value: 'planificación', label: 'En Planificación', dot: '#ca8a04' },
  { value: 'en_proceso',    label: 'En Proceso',      dot: '#2563eb' },
  { value: 'inactivo',      label: 'Inactivo',        dot: '#dc2626' },
  { value: 'finalizado',    label: 'Finalizado',      dot: '#6b7280' },
];

/** Lo que llega en `?estado=` (links de otras pantallas) → estados elegidos. */
function estadosDesdeUrl(valor: string | null): EstadoOperativo[] {
  if (!valor || valor === 'vigentes') return VIGENTES;
  if (valor === 'all') return [];
  return ESTADOS_FILTRO.some(e => e.value === valor) ? [valor as EstadoOperativo] : VIGENTES;
}
const sonVigentes = (sel: EstadoOperativo[]) => sel.length === VIGENTES.length && VIGENTES.every(v => sel.includes(v));

/* ── form base ── */
/** Cómo se llama cada estado de agente en el aviso previo al cierre (CU-10 5.1). */
const ETIQUETA_ESTADO_AGENTE: Record<string, string> = {
  AGRUPADO: 'Agrupado', DESPLEGADO: 'Desplegado', RASTRILLANDO: 'Rastrillando', REPLEGADO: 'Replegado',
};

const emptyForm = {
  nombre: '',
  estado: 'nuevo' as EstadoOperativo,
  ubicacion: '',
  fiscal: '',
  punto0lat: '',
  punto0lng: '',
  descripcion: '',
  motivoPuntoCero: '',   // CU-36: sólo al mover el Punto 0 con el operativo en curso
};

const MOTIVO_PUNTO_CERO_MAX = 500;

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
    ? { ...base, border: '1.5px solid var(--primary)', background: 'color-mix(in srgb, var(--primary) 4%, transparent)' }
    : base;
}

/** Leyenda bajo Latitud/Longitud (Testeo 25/10, punto 31): vacía es «Obligatorio»; fuera de rango, «Coordenada inválida». */
function errorCoordenada(valor: string, max: number): string {
  if (!valor.trim()) return 'Obligatorio';
  const n = parseFloat(valor);
  return Number.isNaN(n) || n < -max || n > max ? `Coordenada inválida: entre −${max} y ${max}` : 'Revisá este campo';
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
/** Columnas de la vista Lista: en mobile sólo operativo y estado (las acciones bajan a otra línea). */
const COLUMNAS_LISTA = 'grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_236px]';

/** Fila de metadato de la tarjeta: ícono turquesa y texto gris (ámbar si es una alerta). */
function MetaFila({ icono: I, children, alerta, title }: { icono: typeof MapPin; children: React.ReactNode; alerta?: boolean; title?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0" title={title}>
      <I size={13} style={{ color: alerta ? '#b45309' : 'var(--primary)', flexShrink: 0 }} />
      <span className="truncate" style={{ fontSize: 'var(--text-label)', color: alerta ? '#b45309' : 'var(--muted-foreground)' }}>{children}</span>
    </div>
  );
}

/** «Panel →»: la única forma de entrar al operativo (entrar a uno Nuevo lo activa). */
function BotonPanel({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title="Acceder al panel" className="flex items-center gap-1.5"
      style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--primary)', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: 600,
        background: 'color-mix(in srgb, var(--primary) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 18%, transparent)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 15%, transparent)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 8%, transparent)')}>
      Panel<ArrowRight size={13} />
    </button>
  );
}

export default function Operativos() {
  const navigate = useNavigate();
  const { usuario } = useApp();
  /** El Jefe de operativo (29/10) sólo mira: sin crear, modificar, finalizar, eliminar ni QR. */
  const gestiona = puedeGestionar(usuario);

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useVistaListado('operativos', usuario?.id);
  const [searchQuery, setSearchQuery] = useState('');
  // Estados elegidos (selección múltiple, 02/10). Vacío = todos.
  const [estadosSel, setEstadosSel] = useState<EstadoOperativo[]>(() => estadosDesdeUrl(searchParams.get('estado')));

  /* ── finalize state ── */
  const [finalizeNota, setFinalizeNota] = useState('');
  /** Resultado del operativo (CU-10, migración 025): obligatorio para finalizar. */
  const [finalizeResultado, setFinalizeResultado] = useState<ResultadoOperativo | ''>('');
  const [finalizeSinResultado, setFinalizeSinResultado] = useState(false);
  const [finalizeStep, setFinalizeStep] = useState<'confirm' | 'revision'>('confirm');
  /** Lo que conviene revisar antes de cerrar (CU-10 5.1): sin tracks GPX o con agentes todavía en actividad. */
  const [revision, setRevision] = useState<{ tracksCargados: number; agentesEnActividad: { nombre: string; apellido: string; estado: string }[] } | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  /* ── open/close helpers ── */
  const openCreate = () => {
    setForm({ ...emptyForm });
    setSelected(null);
    setFormErrors(new Set());
    setFormErrorMsg('');
    setModal('create');
  };

  const openEdit = (op: Operativo) => {
    setSelected(op);
    setFormErrors(new Set());
    setFormErrorMsg('');
    setForm({
      nombre: op.nombre,
      estado: op.estado,
      ubicacion: op.ubicacion,
      fiscal: op.fiscal || '',
      punto0lat: op.punto0 ? String(op.punto0.lat) : '',
      punto0lng: op.punto0 ? String(op.punto0.lng) : '',
      descripcion: op.descripcion || '',
      motivoPuntoCero: '',
    });
    setModal('edit');
  };

  const openQr = (op: Operativo) => { setSelected(op); setModal('qr'); };
  const openDelete = (op: Operativo) => { setSelected(op); setModal('delete'); };

  /**
   * CU-08 paso 8 (Transición Automática): entrar por primera vez a un
   * operativo NUEVO lo pasa a ACTIVO. Se espera la respuesta antes de navegar
   * para que el panel ya encuentre el estado correcto — si se generara un QR
   * ahí mismo, la precondición de CU-16 (ACTIVO/EN_PLANIFICACION) tiene que
   * estar cumplida.
   */
  /** Acciones rápidas de cada operativo: QR, Modificar, Finalizar (si no terminó) y Eliminar (sólo los Nuevos). */
  const accionesDe = (op: Operativo) => !gestiona ? <div /> : (
    <div className="flex items-center gap-1">
      <BotonIcono icono={QrCode} title="Código QR" onClick={() => openQr(op)} />
      <BotonIcono icono={Edit2} title="Modificar" onClick={() => openEdit(op)} />
      {op.estado !== 'finalizado' && op.estado !== 'eliminado' && <BotonIcono icono={Flag} title="Finalizar operativo" tono="aviso" onClick={() => openFinalize(op)} />}
      {op.estado === 'nuevo' && <BotonIcono icono={Trash2} title="Eliminar" tono="peligro" onClick={() => openDelete(op)} />}
    </div>
  );

  const entrarAOperativo = async (op: Operativo) => {
    if (op.estado === 'nuevo' && gestiona) {
      try { await operativosApi.activar(op.id); } catch { /* no bloquea la navegación */ }
    }
    navigate(`/operativo/${op.id}/dashboard`);
  };

  /* ── finalize helpers ──
   * CU-10 paso 5.1 (Testeo 15/10, punto 17): antes de cerrar se consulta al servidor si hay algún
   * track GPX cargado y si algún agente sigue en actividad (cualquier estado que no sea En espera,
   * Disponible o No disponible). Si falta algo se avisa; «Forzar cierre» finaliza igual. */
  const openFinalize = (op: Operativo) => {
    setSelected(op);
    setFinalizeNota('');
    setFinalizeResultado('');
    setFinalizeSinResultado(false);
    setFinalizeStep('confirm');
    setRevision(null);
    setModal('finalize');
  };

  // «Finalizar operativo» desde la ficha del panel (OperativoInfoModal) llega como ?finalizar=<id>:
  // se abre esta misma ventana, la única que finaliza de verdad (revisión, resultado y reseña).
  const finalizarDesdeUrl = searchParams.get('finalizar');
  useEffect(() => {
    if (!finalizarDesdeUrl || cargando) return;
    const op = operativos.find(o => o.id === finalizarDesdeUrl);
    if (op && op.estado !== 'finalizado' && op.estado !== 'eliminado') openFinalize(op);
    const resto = new URLSearchParams(searchParams);
    resto.delete('finalizar');
    setSearchParams(resto, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalizarDesdeUrl, cargando, operativos]);

  const handleFinalizeConfirm = async () => {
    if (!selected) return;
    if (!finalizeResultado) { setFinalizeSinResultado(true); return; }
    setRevisando(true);
    try {
      const r = await operativosApi.revisionFinalizar(selected.id);
      if (r.tracksCargados === 0 || r.agentesEnActividad.length > 0) {
        setRevision(r);
        setFinalizeStep('revision');
        return;
      }
    } catch {
      // Si la revisión no se puede consultar no se bloquea el cierre: el servidor igual valida todo.
    } finally {
      setRevisando(false);
    }
    handleFinalizeExec();
  };

  const handleFinalizeExec = async () => {
    // Un segundo clic mientras se procesa mandaba otro pedido: salían dos avisos, el de éxito y
    // «ya está finalizado» (Testeo 25/10, punto 42).
    if (!selected || !finalizeResultado || finalizando) return;
    setFinalizando(true);
    try {
      // CU-10 paso 7: el backend libera a TODO el personal asignado en la
      // misma operación — no es sólo cambiar el estado del operativo.
      await operativosApi.finalizar(selected.id, finalizeResultado, finalizeNota.trim() || undefined);
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
    } finally {
      setFinalizando(false);
    }
  };

  /** Formato/longitud de los campos ya completos (la obligatoriedad se chequea aparte). */
  const validarFormatos = (): { campos: Set<string>; mensaje: string } | null => {
    const eTitulo = validarTitulo(form.nombre);
    if (eTitulo) return { campos: new Set(['nombre']), mensaje: eTitulo };
    const eFiscal = validarFiscal(form.fiscal);
    if (eFiscal) return { campos: new Set(['fiscal']), mensaje: `Fiscal de Instrucción: ${eFiscal}` };
    return null;
  };

  const handleCreate = async () => {
    const errors = new Set<string>();
    if (!form.nombre.trim())      errors.add('nombre');
    if (!form.ubicacion.trim())   errors.add('ubicacion');
    if (!form.punto0lat.trim())   errors.add('punto0lat');
    if (!form.punto0lng.trim())   errors.add('punto0lng');
    if (errors.size > 0) {
      setFormErrors(errors);
      setFormErrorMsg('Completá los campos obligatorios para continuar.');
      return;
    }
    const errFormato = validarFormatos();
    if (errFormato) { setFormErrors(errFormato.campos); setFormErrorMsg(errFormato.mensaje); return; }
    const lat = parseFloat(form.punto0lat);
    const lng = parseFloat(form.punto0lng);
    if (isNaN(lat) || lat < -90 || lat > 90)   { setFormErrors(new Set(['punto0lat'])); setFormErrorMsg('Latitud inválida (–90 a 90).'); return; }
    if (isNaN(lng) || lng < -180 || lng > 180) { setFormErrors(new Set(['punto0lng'])); setFormErrorMsg('Longitud inválida (–180 a 180).'); return; }
    setFormErrors(new Set());
    setFormErrorMsg('');
    try {
      await operativosApi.crear({
        titulo: form.nombre.trim(),
        localidad: form.ubicacion.trim(),
        fiscalInstruccion: form.fiscal.trim() || null,
        descripcion: form.descripcion || undefined,
        puntoCeroLat: lat,
        puntoCeroLng: lng,
        // La fecha y hora de inicio la pone el servidor al crear (Testeo 25/10, punto 26).
      });
      setModal(null);
      await cargarOperativos();
    } catch (err) {
      // Incluye el 409 de título repetido (CU-08 Observaciones).
      setFormErrorMsg(err instanceof ApiError ? err.message : 'No se pudo crear el operativo.');
    }
  };

  const handleEdit = async () => {
    if (!selected) return;
    const errors = new Set<string>();
    if (!form.nombre.trim())      errors.add('nombre');
    if (!form.ubicacion.trim())   errors.add('ubicacion');
    if (!form.punto0lat.trim())   errors.add('punto0lat');
    if (!form.punto0lng.trim())   errors.add('punto0lng');
    if (errors.size > 0) {
      setFormErrors(errors);
      setFormErrorMsg('Faltan completar campos obligatorios.');
      return;
    }
    const errFormato = validarFormatos();
    if (errFormato) { setFormErrors(errFormato.campos); setFormErrorMsg(errFormato.mensaje); return; }
    const latVal = parseFloat(form.punto0lat);
    const lngVal = parseFloat(form.punto0lng);
    if (isNaN(latVal) || latVal < -90 || latVal > 90)   { setFormErrors(new Set(['punto0lat'])); setFormErrorMsg('Latitud inválida (–90 a 90).'); return; }
    if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) { setFormErrors(new Set(['punto0lng'])); setFormErrorMsg('Longitud inválida (–180 a 180).'); return; }
    if (pideMotivoPuntoCero && !form.motivoPuntoCero.trim()) {
      setFormErrors(new Set(['motivoPuntoCero']));
      setFormErrorMsg('Escribí por qué se mueve el Punto 0: con el operativo en curso, el motivo queda en su historial.');
      return;
    }
    setFormErrors(new Set());
    setFormErrorMsg('');
    try {
      // `estado` no se manda: el backend rechaza intentar transicionarlo por
      // esta vía genérica (existen endpoints dedicados — activar/finalizar —
      // mismo criterio que ya se usa para usuarios con ELIMINADO en CU-06).
      await operativosApi.actualizar(selected.id, {
        titulo: form.nombre.trim(),
        localidad: form.ubicacion.trim(),
        fiscalInstruccion: form.fiscal.trim() || null,   // vacío lo deja sin fiscal
        descripcion: form.descripcion || undefined,
        // El Punto 0 sólo viaja si se movió (CU-36: cada movimiento queda en su historial).
        ...(puntoCeroMovido ? {
          puntoCeroLat: latVal,
          puntoCeroLng: lngVal,
          motivoPuntoCero: form.motivoPuntoCero.trim() || undefined,
        } : {}),
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
    if (estadosSel.length) list = list.filter(o => estadosSel.includes(o.estado));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        o.nombre.toLowerCase().includes(q) ||
        o.ubicacion.toLowerCase().includes(q) ||
        (o.descripcion ?? '').toLowerCase().includes(q) ||
        (o.objetivoPreview?.nombre ?? '').toLowerCase().includes(q) ||
        (o.objetivoPreview?.apellido ?? '').toLowerCase().includes(q) ||
        (o.puestoComando ?? []).some(p => `${p.nombre} ${p.apellido}`.toLowerCase().includes(q))
      );
    }
    return list;
  }, [operativos, estadosSel, searchQuery]);


  const estadoColors: Record<string, string> = {
    iniciado: '#16a34a',
    'planificación': '#ca8a04',
    inactivo: '#dc2626',
    nuevo: 'var(--accent)',
    en_proceso: '#2563eb',
    finalizado: '#6b7280',
    eliminado: '#be185d',
  };

  /* read-only mode: operativos finalizados o eliminados no pueden modificarse */
  /** CU-36: ¿se movió el Punto 0 respecto del guardado? Con el operativo en curso, pide motivo. */
  const puntoCeroMovido = modal === 'edit' && !!selected?.punto0 && (
    Math.abs(parseFloat(form.punto0lat) - selected.punto0.lat) > 1e-7 ||
    Math.abs(parseFloat(form.punto0lng) - selected.punto0.lng) > 1e-7);
  const pideMotivoPuntoCero = puntoCeroMovido && selected?.estado !== 'nuevo';

  const isEditReadOnly =
    modal === 'edit' &&
    (selected?.estado === 'finalizado' || selected?.estado === 'eliminado');


  return (
    <div className="p-4 lg:p-6" style={{ fontFamily: 'var(--font-family-primary)' }}>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h1)', fontWeight: 'var(--font-weight-bold)' }}>
              Sistema de Búsqueda y Rastreo
            </h1>
            <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>
              Gestión de Operativos de Búsqueda y Rastrillaje
            </p>
          </div>
          {/* En mobile/tablet va a la barra superior (diseño CALÍVAR) */}
          {gestiona && <AccionCabecera>
            <button
              onClick={openCreate}
              aria-label="Nuevo Operativo"
              className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-button)] text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
            >
              <Plus size={16} />
              Nuevo Operativo
            </button>
          </AccionCabecera>}
        </div>

        {/* Stats strip */}

      </div>

      {/* Rechazos del servidor: carátula duplicada (CU-08 obs.), solo-lectura
          (CU-09 obs.), o caída de la API. */}
      {errorApi && (
        <div
          className="flex items-start gap-2.5 p-3 rounded-lg mb-4"
          style={{ background: 'color-mix(in srgb, var(--destructive) calc(10% + var(--tinte-oscuro, 0%) * 0.1), transparent)', border: '1px solid color-mix(in srgb, var(--destructive) 30%, transparent)', color: 'color-mix(in srgb, #fca5a5 var(--tinte-oscuro, 0%), #b91c1c)', fontSize: 'var(--text-base)' }}
        >
          <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{errorApi}</span>
          <button
            onClick={() => setErrorApi('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'color-mix(in srgb, #fca5a5 var(--tinte-oscuro, 0%), #b91c1c)', cursor: 'pointer' }}
            aria-label="Cerrar aviso"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Buscador, vista y filtro por estado ── */}
      <div className="mb-5" style={tarjetaBase}>
        <div className="flex items-center gap-3" style={{ padding: '16px 16px 12px' }}>
          <Buscador value={searchQuery} onChange={setSearchQuery} placeholder="Buscar por título..." />
          <SelectorVista value={viewMode} onChange={setViewMode} />
          {(searchQuery || !sonVigentes(estadosSel)) && filteredOperativos.length < operativos.length && (
            <span className="hidden sm:block shrink-0" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)' }}>
              {filteredOperativos.length} de {operativos.length}
            </span>
          )}
        </div>
        <BarraFiltros>
          <FiltroDesplegable<EstadoOperativo>
            titulo="Estado"
            seleccion={estadosSel}
            onCambiar={setEstadosSel}
            atajos={[{ label: 'Vigentes', valores: VIGENTES, count: operativos.filter(o => esVigente(o.estado)).length }]}
            opciones={ESTADOS_FILTRO.map(e => ({ ...e, count: operativos.filter(o => o.estado === e.value).length }))}
          />
          {estadosSel.length > 0 && !sonVigentes(estadosSel) && <BotonTextoFiltro onClick={() => setEstadosSel(VIGENTES)}>Ver sólo vigentes</BotonTextoFiltro>}
          {estadosSel.length === 0 && (
            <span style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>Mostrando todos los operativos</span>
          )}
        </BarraFiltros>
      </div>

      {/* ── Contenido ── */}
      {cargando ? (
        <div className="flex items-center justify-center py-20" style={{ ...tarjetaBase, color: 'var(--muted-foreground)' }}>Cargando operativos…</div>
      ) : operativos.length === 0 ? (
        <Vacio icono={Plus} titulo="No hay operativos vigentes"
          texto={gestiona ? 'Creá el primer operativo para comenzar.' : 'Todavía no hay operativos para consultar.'}
          accion={gestiona ? <Button size="md" icon={Plus} onClick={openCreate}>Crear operativo</Button> : undefined} />
      ) : filteredOperativos.length === 0 ? (
        <Vacio icono={Search} titulo="No hay operativos vigentes"
          texto={searchQuery ? `No se encontraron resultados para "${searchQuery}".` : 'No hay operativos iniciados o en proceso para el filtro seleccionado.'}
          accion={<Button variant="muted" size="md" icon={X} onClick={() => { setSearchQuery(''); setEstadosSel(VIGENTES); }}>Limpiar filtros</Button>} />
      ) : viewMode === 'card' ? (
        /* ═══════ TARJETAS ═══════ */
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))' }}>
          {filteredOperativos.map(op => {
            const m = puestoDe(op);
            return (
              <div key={op.id} className="flex flex-col overflow-hidden" style={{ ...tarjetaBase, transition: 'box-shadow .15s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--elevation-md)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--elevation-sm)')}>
                <div className="h-1 w-full shrink-0" style={{ background: estadoColors[op.estado] || 'var(--primary)' }} />
                {/* Cuerpo informativo (no navega: sólo el botón "Panel" accede) */}
                <div className="flex-1 flex flex-col" style={{ padding: 20 }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 style={{ margin: 0, color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 1.35 }}>{op.nombre}</h3>
                    <div className="shrink-0"><StatusBadge estado={op.estado} size="sm" /></div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <MetaFila icono={MapPin}>{op.ubicacion}</MetaFila>
                    <MetaFila icono={Calendar}>{fechaHoraArgentina(op.fechaInicio)}</MetaFila>
                    <MetaFila icono={Users}>{op.agenteIds.length} agente{op.agenteIds.length !== 1 ? 's' : ''} asignado{op.agenteIds.length !== 1 ? 's' : ''}</MetaFila>
                    {/* Quién está de turno en el puesto de comando (29/10): reemplaza al objetivo buscado. */}
                    <MetaFila icono={RadioTower} alerta={m.alerta} title={m.detalle}>{m.texto}</MetaFila>
                  </div>
                </div>
                <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--muted)' }}>
                  {accionesDe(op)}
                  <BotonPanel onClick={() => { void entrarAOperativo(op); }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ═══════ LISTA (títulos de columna fijos al scrollear) ═══════ */
        <ListaFija estiloEncabezado={{ padding: '10px 20px' }}
          encabezado={
            <div className={`grid gap-3 ${COLUMNAS_LISTA}`}>
              {['Operativo', 'Estado', 'Ubicación', 'Inicio', ''].map((c, i) => <span key={c} className={i >= 2 ? 'hidden md:block' : undefined} style={estiloTitulosColumna}>{c}</span>)}
            </div>
          }>
          {filteredOperativos.map((op, idx) => {
            const m = puestoDe(op);
            return (
              <div key={op.id} className={`grid items-center gap-3 transition-colors ${COLUMNAS_LISTA}`}
                style={{ padding: '14px 20px', borderBottom: idx < filteredOperativos.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1 self-stretch rounded-full shrink-0 min-h-[36px]" style={{ background: estadoColors[op.estado] || 'var(--primary)' }} />
                  <div className="min-w-0">
                    <p className="truncate" style={{ margin: 0, color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>{op.nombre}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap" style={{ fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
                      <span className="flex items-center gap-1"><Users size={10} />{op.agenteIds.length} agente{op.agenteIds.length !== 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1" title={m.detalle} style={{ color: m.alerta ? '#b45309' : undefined }}><RadioTower size={10} />{m.texto}</span>
                    </div>
                  </div>
                </div>
                <div><StatusBadge estado={op.estado} size="sm" /></div>
                <div className="hidden md:block min-w-0"><MetaFila icono={MapPin}>{op.ubicacion}</MetaFila></div>
                <div className="hidden md:block"><MetaFila icono={Calendar}>{fechaHoraArgentina(op.fechaInicio)}</MetaFila></div>
                <div className="flex items-center gap-1 shrink-0 col-span-2 md:col-span-1">
                  {accionesDe(op)}
                  <BotonPanel onClick={() => { void entrarAOperativo(op); }} />
                </div>
              </div>
            );
          })}
        </ListaFija>
      )}

      {/* ════ CREATE / EDIT MODAL ════ */}
      {(modal === 'create' || modal === 'edit') && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'var(--scrim-modal)',
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
                    Estado inicial: <span style={{ color: 'var(--accent-strong)', fontWeight: 'var(--font-weight-semibold)' }}>Nuevo</span> — se activará al ingresar al panel.
                    La fecha y hora de inicio se registra al guardar.
                  </p>
                )}
              </div>
              <button onClick={() => setModal(null)} style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

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
                  style={{ background: 'color-mix(in srgb, var(--destructive) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--destructive) 30%, transparent)' }}
                >
                  <AlertCircle size={15} style={{ color: 'var(--destructive)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--destructive)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>{formErrorMsg}</span>
                </div>
              )}

              <>
                  {/* ── Sección: Datos del Operativo ── */}
                  <div className="flex flex-col gap-4">
                    <p style={{ color: 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto))', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-family-primary)' }}>
                      Datos del operativo
                    </p>

                    {/* Titulo */}
                    <div>
                      <label style={labelStyle()}>Título *</label>
                      <input
                        type="text"
                        value={form.nombre}
                        readOnly={isEditReadOnly}
                        maxLength={TITULO_MAX}
                        onChange={isEditReadOnly ? undefined : e => { setForm({ ...form, nombre: e.target.value.slice(0, TITULO_MAX) }); setFormErrors(p => { const n = new Set(p); n.delete('nombre'); return n; }); }}
                        placeholder="Ej: Búsqueda Cerro Champaquí — García Juan"
                        className="w-full px-3 py-2.5 rounded-lg border outline-none"
                        style={isEditReadOnly ? readOnlyInputStyle() : errStyle(inputStyle(), formErrors.has('nombre'))}
                      />
                      {!isEditReadOnly && formErrors.has('nombre') && <span style={{ color: 'var(--destructive)', fontSize: 'calc(11px * var(--escala-texto))', fontFamily: 'var(--font-family-primary)' }}>Revisá este campo</span>}
                    </div>

                    {/* Provincia + Localidad (lista Georef; se guarda como "Localidad, Provincia") */}
                    <div>
                      <SelectorLocalidad
                        value={form.ubicacion}
                        onChange={valor => { setForm(f => ({ ...f, ubicacion: valor })); setFormErrors(p => { const n = new Set(p); n.delete('ubicacion'); return n; }); }}
                        readOnly={isEditReadOnly}
                        errorProvincia={formErrors.has('ubicacion')}
                        errorLocalidad={formErrors.has('ubicacion')}
                        labelStyle={labelStyle()}
                        inputStyle={inputStyle()}
                        errStyle={errStyle}
                        readOnlyStyle={readOnlyInputStyle()}
                      />
                      {!isEditReadOnly && formErrors.has('ubicacion') && <span style={{ color: 'var(--destructive)', fontSize: 'calc(11px * var(--escala-texto))', fontFamily: 'var(--font-family-primary)' }}>Elegí provincia y localidad</span>}
                    </div>

                    {/* Fecha y hora de inicio: la del momento de crearlo, hora de Argentina; no se elige ni se
                        modifica (Testeo 25/10, punto 26). Al crear no hay campo; al editar se muestra fija. */}
                    {modal === 'edit' && selected && (
                      <div>
                        <label style={labelStyle()}>Fecha y hora de inicio</label>
                        <div className="w-full px-3 py-2.5 rounded-lg border flex items-center gap-2" style={readOnlyInputStyle()}>
                          <Lock size={13} style={{ flexShrink: 0 }} />{fechaHoraArgentina(selected.fechaInicio)}
                        </div>
                      </div>
                    )}

                    {/* Fiscal de Instrucción */}
                    <div>
                      <label style={labelStyle()}>Fiscal de Instrucción</label>
                      <input
                        type="text"
                        value={form.fiscal}
                        readOnly={isEditReadOnly}
                        maxLength={FISCAL_MAX}
                        onChange={isEditReadOnly ? undefined : e => { setForm({ ...form, fiscal: filtrarFiscal(e.target.value) }); setFormErrors(p => { const n = new Set(p); n.delete('fiscal'); return n; }); }}
                        placeholder="Nombre y apellido del fiscal a cargo"
                        className="w-full px-3 py-2.5 rounded-lg border outline-none"
                        style={isEditReadOnly ? readOnlyInputStyle() : errStyle(inputStyle(), formErrors.has('fiscal'))}
                      />
                      {!isEditReadOnly && formErrors.has('fiscal') && <span style={{ color: 'var(--destructive)', fontSize: 'calc(11px * var(--escala-texto))', fontFamily: 'var(--font-family-primary)' }}>Revisá este campo</span>}
                    </div>

                    {/* El estado no se edita acá: cambia con las acciones reales (entrar, pausar, finalizar, eliminar). */}

                    {/* Descripción del operativo */}
                    <div>
                      <label style={labelStyle()}>Descripción</label>
                      <textarea
                        value={form.descripcion}
                        readOnly={isEditReadOnly}
                        maxLength={DESCRIPCION_MAX}
                        onChange={isEditReadOnly ? undefined : e => setForm({ ...form, descripcion: e.target.value.slice(0, DESCRIPCION_MAX) })}
                        rows={3}
                        placeholder="Contexto general del operativo, objetivos, particularidades..."
                        className="w-full px-3 py-2.5 rounded-lg border outline-none resize-none"
                        style={isEditReadOnly ? readOnlyInputStyle() : inputStyle()}
                      />
                    </div>
                  </div>

                  {/* ── Sección: Punto 0 (LSP) ── */}
                  <div className="flex flex-col gap-3">
                    <p style={{ color: 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto))', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-family-primary)' }}>
                      Punto 0 — Última posición conocida (LSP) *
                    </p>
                    <div
                      className="rounded-[var(--radius-input)] p-4 flex flex-col gap-3"
                      style={{ background: 'var(--muted)', border: (formErrors.has('punto0lat') || formErrors.has('punto0lng')) ? '1.5px solid var(--destructive)' : '1px solid var(--border)' }}
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
                          localidad={form.ubicacion}
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
                          {!isEditReadOnly && formErrors.has('punto0lat') && <span style={{ color: 'var(--destructive)', fontSize: 'calc(11px * var(--escala-texto))', fontFamily: 'var(--font-family-primary)' }}>{errorCoordenada(form.punto0lat, 90)}</span>}
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
                          {!isEditReadOnly && formErrors.has('punto0lng') && <span style={{ color: 'var(--destructive)', fontSize: 'calc(11px * var(--escala-texto))', fontFamily: 'var(--font-family-primary)' }}>{errorCoordenada(form.punto0lng, 180)}</span>}
                        </div>
                      </div>

                      {pideMotivoPuntoCero && !isEditReadOnly && (
                        <div>
                          <label style={labelStyle()}>Motivo del cambio del Punto 0 *</label>
                          <textarea
                            value={form.motivoPuntoCero}
                            maxLength={MOTIVO_PUNTO_CERO_MAX}
                            onChange={e => { setForm({ ...form, motivoPuntoCero: e.target.value }); setFormErrors(p => { const n = new Set(p); n.delete('motivoPuntoCero'); return n; }); }}
                            rows={2}
                            placeholder="Ej.: apareció una prenda 1 km al norte"
                            className="w-full px-3 py-2.5 rounded-lg border outline-none resize-none"
                            style={errStyle(inputStyle(), formErrors.has('motivoPuntoCero'))}
                          />
                          <span style={{ color: formErrors.has('motivoPuntoCero') ? 'var(--destructive)' : 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto))', fontFamily: 'var(--font-family-primary)' }}>
                            El operativo está en curso: el movimiento queda en el historial del Punto 0, con quién, cuándo y por qué.
                          </span>
                        </div>
                      )}

                      {form.punto0lat && form.punto0lng ? (
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-button)]"
                          style={{ background: 'color-mix(in srgb, var(--primary) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' }}
                        >
                          <Crosshair size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <span style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--primary)' }}>
                            {parseFloat(form.punto0lat).toFixed(5)}, {parseFloat(form.punto0lng).toFixed(5)}
                          </span>
                        </div>
                      ) : (
                        <p style={{ color: 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto))', fontFamily: 'var(--font-family-primary)' }}>
                          Ejemplo: –31.41667, –64.18333 (Córdoba capital)
                        </p>
                      )}
                    </div>
                  </div>
              </>

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
                    className="px-4 py-2 rounded-[var(--radius-button)] text-[var(--primary-foreground)]"
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
                    style={{ background: 'color-mix(in srgb, #d97706 calc(10% + var(--tinte-oscuro, 0%) * 0.08), transparent)' }}
                  >
                    <Flag size={18} style={{ color: '#b45309' }} />
                  </div>
                ) : (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}
                  >
                    <Clock size={18} style={{ color: 'var(--primary)' }} />
                  </div>
                )}
                <div>
                  <h2 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
                    {finalizeStep === 'confirm' ? 'Finalizar Operativo' : 'Revisá antes de finalizar'}
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

                  {/* Resultado (obligatorio, CU-10 · migración 025): lo cuenta el panel general. */}
                  <fieldset>
                    <legend style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', fontFamily: 'var(--font-family-primary)', marginBottom: 6 }}>
                      Resultado del operativo <span style={{ color: 'var(--primary)' }}>*</span>
                    </legend>
                    <div className="flex flex-col gap-1.5">
                      {opcionesResultado(selected.objetivoPreview?.tipo).map(op => {
                        const elegido = finalizeResultado === op;
                        return (
                          <label key={op} className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-input)] cursor-pointer"
                            style={{ border: elegido ? '1.5px solid var(--primary)' : '1px solid var(--border)', background: elegido ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : 'var(--background)',
                              color: 'var(--foreground)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)' }}>
                            <input type="radio" name="resultado-operativo" value={op} checked={elegido}
                              onChange={() => { setFinalizeResultado(op); setFinalizeSinResultado(false); }} style={{ accentColor: 'var(--primary)' }} />
                            {ETIQUETA_RESULTADO[op]}
                          </label>
                        );
                      })}
                    </div>
                    {finalizeSinResultado && (
                      <p style={{ color: '#dc2626', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', marginTop: 6 }}>
                        Elegí el resultado del operativo para poder finalizarlo.
                      </p>
                    )}
                  </fieldset>

                  {/* Textarea opcional */}
                  <div>
                    <label style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)', fontFamily: 'var(--font-family-primary)', display: 'block', marginBottom: 6 }}>
                      Reseña o conclusión del operativo
                      <span style={{ color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-regular)', marginLeft: 4 }}>(opcional)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={finalizeNota}
                      maxLength={NOTA_FINAL_MAX}
                      onChange={e => setFinalizeNota(e.target.value.slice(0, NOTA_FINAL_MAX))}
                      placeholder="Ej: Persona hallada con vida en el polígono norte. Se desactiva el operativo tras 48 hs de búsqueda…"
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
                    <p style={{ color: 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto))', fontFamily: 'var(--font-family-primary)', marginTop: 4 }}>
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
                    disabled={revisando || finalizando}
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
                    {revisando ? 'Revisando…' : finalizando ? 'Finalizando…' : 'Confirmar Finalización'}
                  </button>
                </div>
              </>
            )}

            {/* ─────────── STEP: revision (CU-10 5.1) ─────────── */}
            {finalizeStep === 'revision' && revision && (
              <>
                <div className="px-5 py-5 flex flex-col gap-4">
                  {/* Alert bloqueante */}
                  <div
                    className="flex items-start gap-3 rounded-[var(--radius-input)] px-4 py-4"
                    style={{ background: 'color-mix(in srgb, var(--destructive) 6%, transparent)', border: '1.5px solid color-mix(in srgb, var(--destructive) 35%, transparent)' }}
                  >
                    <AlertCircle size={18} style={{ color: 'var(--destructive)', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
                        {/* Dice qué falta en vez de un genérico (Testeo 25/10, punto 41). */}
                        {revision.tracksCargados === 0 && revision.agentesEnActividad.length > 0
                          ? 'Antes de finalizar: no hay recorridos GPX cargados y hay agentes en actividad.'
                          : revision.tracksCargados === 0
                            ? 'Antes de finalizar: no hay recorridos GPX cargados.'
                            : 'Antes de finalizar: hay agentes que siguen en actividad.'}
                      </p>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', marginTop: 5, lineHeight: 1.55 }}>
                        Una vez finalizado no se puede cargar ni corregir nada. Si forzás el cierre, lo que falte <strong>queda sin registrar</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Qué es lo que falta */}
                  <div
                    className="rounded-[var(--radius-input)] px-4 py-3 flex flex-col gap-3"
                    style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                  >
                    {revision.tracksCargados === 0 && (
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#f59e0b', marginTop: 6 }} />
                        <span style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.5 }}>
                          <strong>No hay ningún track GPX cargado.</strong> No va a quedar registro de lo recorrido en el terreno.
                        </span>
                      </div>
                    )}
                    {revision.agentesEnActividad.length > 0 && (
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#f59e0b', marginTop: 6 }} />
                        <div style={{ fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', lineHeight: 1.5, color: 'var(--foreground)' }}>
                          <strong>
                            {revision.agentesEnActividad.length === 1 ? '1 agente sigue en actividad' : `${revision.agentesEnActividad.length} agentes siguen en actividad`}
                          </strong>{' '}
                          (no está En espera, Disponible ni No disponible):
                          <ul style={{ margin: '4px 0 0', paddingLeft: 16, color: 'var(--muted-foreground)', fontSize: 'calc(11px * var(--escala-texto))' }}>
                            {revision.agentesEnActividad.slice(0, 5).map((a, i) => (
                              <li key={i}>{a.nombre} {a.apellido} · {ETIQUETA_ESTADO_AGENTE[a.estado] ?? a.estado}</li>
                            ))}
                            {revision.agentesEnActividad.length > 5 && <li>+{revision.agentesEnActividad.length - 5} más…</li>}
                          </ul>
                        </div>
                      </div>
                    )}
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
                    disabled={finalizando}
                    className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)]"
                    style={{
                      background: 'var(--primary)',
                      color: 'var(--primary-foreground)',
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)',
                      fontFamily: 'var(--font-family-primary)',
                      cursor: finalizando ? 'wait' : 'pointer',
                      opacity: finalizando ? 0.7 : 1,
                      border: 'none',
                    }}
                  >
                    <AlertCircle size={15} />
                    {finalizando ? 'Finalizando…' : 'Forzar Cierre'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal === 'delete' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--scrim-modal)' }}>
          <div
            className="w-full max-w-[380px] rounded-[var(--radius-card)] p-6"
            style={{ background: 'var(--card)', boxShadow: 'var(--elevation-md)' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'color-mix(in srgb, var(--destructive) calc(10% + var(--tinte-oscuro, 0%) * 0.1), transparent)' }}>
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
