import { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, User, Package, Pencil, Plus, CheckCircle2,
  ChevronLeft, ChevronRight, Eye, Tag, Info,
  Ruler, Palette, Star, Scissors, Shirt,
  Hash, AlertCircle, ImageOff, Lock, Loader2,
} from 'lucide-react';
import { TipoObjetivo } from '../../data/mockData';
import { formatearDni } from '../../utils/validacionUsuario';
import { objetivoApi, ObjetivoApi, CrearObjetivoPayload, ApiError } from '../../services/api';
import {
  ObjetivoFormContent,
  PersonaForm, ObjetoForm, FotoExistente,
  buildPersonaForm, buildObjetoForm, validarObjetivoForm,
} from './ObjetivoFormContent';

/* ─── Types ─── */
interface Props {
  operativoId: string;
  onClose: () => void;
}

type FotoLista = { id: string; url: string };

/* ─── Constants ─── */
const OBJECT_TYPES: Record<string, string> = {
  vehiculo: 'Vehículo',
  embarcacion: 'Embarcación',
  aeronave: 'Aeronave',
  paquete: 'Paquete / Encomienda',
  equipaje: 'Equipaje / Mochila',
  arma: 'Arma',
  animal: 'Animal',
  documento: 'Documento',
  otro: 'Otro',
};

const GENERO_LABEL: Record<string, string> = {
  MASCULINO: 'Masculino', FEMENINO: 'Femenino', OTRO: 'Otro',
};

/* ─────────────────────────────────────────────────
   View helpers
───────────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: 'var(--muted-foreground)', fontSize: '11px',
      fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
      textTransform: 'uppercase', letterSpacing: '0.07em',
      paddingBottom: 6, borderBottom: '1px solid var(--border)', marginBottom: 10,
    }}>
      {children}
    </p>
  );
}

function DataCard({ label, value, icon }: { label: string; value?: string | number; icon?: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div
      className="flex flex-col gap-1 p-3 rounded-[var(--radius-input)]"
      style={{ background: 'var(--muted)' }}
    >
      <span style={{
        color: 'var(--muted-foreground)', fontSize: '11px',
        fontFamily: 'var(--font-family-primary)',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {icon && <span style={{ color: 'var(--primary)' }}>{icon}</span>}
        {label}
      </span>
      <span style={{
        color: 'var(--foreground)', fontSize: 'var(--text-base)',
        fontWeight: 'var(--font-weight-medium)', fontFamily: 'var(--font-family-primary)',
      }}>
        {value}
      </span>
    </div>
  );
}

function TextBlock({ icon, children, accent }: { icon: React.ReactNode; children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-[var(--radius-input)]"
      style={accent
        ? { background: 'rgba(229,75,75,0.05)', border: '1px solid rgba(229,75,75,0.15)' }
        : { background: 'var(--muted)' }
      }
    >
      <span style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <p style={{
        color: 'var(--foreground)', fontSize: 'var(--text-base)',
        fontFamily: 'var(--font-family-primary)', lineHeight: 1.65,
      }}>
        {children}
      </p>
    </div>
  );
}

/* ─── Simple image grid (view-only) ─── */
function ImageGrid({ fotos, onOpen }: { fotos: FotoLista[]; onOpen: (i: number) => void }) {
  if (fotos.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-8 rounded-[var(--radius-input)]"
        style={{ background: 'var(--muted)', border: '1.5px dashed var(--border)' }}
      >
        <ImageOff size={22} style={{ color: 'var(--muted-foreground)', opacity: 0.35 }} />
        <p style={{
          color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
          fontFamily: 'var(--font-family-primary)', marginTop: 6, opacity: 0.6,
        }}>
          Sin imágenes registradas
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
      {fotos.map((foto, idx) => (
        <button
          key={foto.id}
          onClick={() => onOpen(idx)}
          className="relative overflow-hidden rounded-[var(--radius-input)] group"
          style={{ aspectRatio: '1', background: 'var(--muted)' }}
        >
          <img src={foto.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.42)' }}
          >
            <Eye size={16} color="#fff" />
          </div>
          <div
            className="absolute top-1 left-1 rounded px-1"
            style={{
              background: 'rgba(0,0,0,0.55)', color: '#fff',
              fontSize: '9px', fontFamily: 'var(--font-family-primary)', lineHeight: '16px',
            }}
          >
            {idx + 1}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Lightbox (sólo para modo lectura — el modo edición usa el propio de ObjetivoFormContent) ─── */
function Lightbox({ fotos, index, onClose, onPrev, onNext }: {
  fotos: FotoLista[]; index: number;
  onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.94)' }}
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
          {index + 1} / {fotos.length}
        </span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg"
          style={{ color: 'rgba(255,255,255,0.6)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
        {fotos.length > 1 && (
          <button
            onClick={onPrev}
            className="absolute left-4 p-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <img
          src={fotos[index].url}
          alt={`Foto ${index + 1}`}
          className="max-w-full max-h-full object-contain"
          style={{ maxHeight: 'calc(100vh - 120px)', borderRadius: 'var(--radius-input)' }}
        />
        {fotos.length > 1 && (
          <button
            onClick={onNext}
            className="absolute right-4 p-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>
      {fotos.length > 1 && (
        <div
          className="flex items-center gap-2 px-5 py-3 overflow-x-auto flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          onClick={e => e.stopPropagation()}
        >
          {fotos.map((f, i) => (
            <div
              key={f.id}
              className="flex-shrink-0 rounded-md overflow-hidden"
              style={{
                width: 44, height: 44,
                opacity: i === index ? 1 : 0.4,
                outline: i === index ? '2px solid #E54B4B' : 'none',
                outlineOffset: 2,
              }}
            >
              <img src={f.url} alt={`Min ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Persona view (read-only)
───────────────────────────────────────────────── */
function PersonaView({ objetivo, fotos, onOpenLightbox }: {
  objetivo: ObjetivoApi;
  fotos: FotoLista[];
  onOpenLightbox: (i: number) => void;
}) {
  const nombreCompleto = `${objetivo.nombre ?? ''}${objetivo.apellido ? ' ' + objetivo.apellido : ''}`.trim();
  return (
    <div className="flex flex-col gap-6">
      {/* Avatar header */}
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(229,75,75,0.1)' }}
        >
          <User size={26} style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <p style={{
            color: 'var(--foreground)', fontSize: 'var(--text-h2)',
            fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.2,
          }}>
            {nombreCompleto || 'Sin nombre registrado'}
          </p>
          <span
            className="inline-block px-2 py-0.5 rounded-md mt-1"
            style={{
              background: 'rgba(229,75,75,0.12)', color: 'var(--primary)',
              fontSize: '11px', fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'var(--font-family-primary)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}
          >
            Persona buscada
          </span>
        </div>
      </div>

      {/* Identificación */}
      <div>
        <SectionTitle>Identificación</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <DataCard label="DNI" value={objetivo.dni ? formatearDni(objetivo.dni) : undefined} icon={<Hash size={11} />} />
          <DataCard label="Edad" value={objetivo.edad != null ? `${objetivo.edad} años` : undefined} icon={<Info size={11} />} />
          <DataCard label="Sexo" value={objetivo.genero ? GENERO_LABEL[objetivo.genero] : undefined} icon={<User size={11} />} />
          <DataCard label="Nacionalidad" value={objetivo.nacionalidad ?? undefined} icon={<Info size={11} />} />
        </div>
      </div>

      {/* Datos físicos */}
      <div>
        <SectionTitle>Características físicas</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <DataCard label="Estatura" value={objetivo.estatura != null ? `${objetivo.estatura} cm` : undefined} icon={<Ruler size={11} />} />
          <DataCard label="Complexión" value={objetivo.complexionFisica ?? undefined} icon={<Info size={11} />} />
          <DataCard label="Color de piel" value={objetivo.colorPiel ?? undefined} icon={<Palette size={11} />} />
          <DataCard label="Color de ojos" value={objetivo.colorOjos ?? undefined} icon={<Eye size={11} />} />
          <DataCard label="Color de cabello" value={objetivo.colorPelo ?? undefined} icon={<Scissors size={11} />} />
        </div>
      </div>

      {objetivo.vestimenta && (
        <div>
          <SectionTitle>Vestimenta</SectionTitle>
          <TextBlock icon={<Shirt size={15} />}>{objetivo.vestimenta}</TextBlock>
        </div>
      )}

      {objetivo.detallesAdicionales && (
        <div>
          <SectionTitle>Detalles Adicionales</SectionTitle>
          <TextBlock icon={<Star size={15} />} accent>{objetivo.detallesAdicionales}</TextBlock>
        </div>
      )}

      {/* Imágenes */}
      <div>
        <SectionTitle>Imágenes ({fotos.length})</SectionTitle>
        <ImageGrid fotos={fotos} onOpen={onOpenLightbox} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Objeto view (read-only)
───────────────────────────────────────────────── */
function ObjetoView({ objetivo, fotos, onOpenLightbox }: {
  objetivo: ObjetivoApi;
  fotos: FotoLista[];
  onOpenLightbox: (i: number) => void;
}) {
  const tipoLabel = objetivo.tipoObjeto ? (OBJECT_TYPES[objetivo.tipoObjeto] ?? objetivo.tipoObjeto) : undefined;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,169,135,0.15)' }}
        >
          <Package size={26} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <p style={{
            color: 'var(--foreground)', fontSize: 'var(--text-h2)',
            fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.2,
          }}>
            {objetivo.nombre || 'Sin nombre registrado'}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className="inline-block px-2 py-0.5 rounded-md"
              style={{
                background: 'rgba(255,169,135,0.2)', color: 'var(--accent)',
                fontSize: '11px', fontWeight: 'var(--font-weight-semibold)',
                fontFamily: 'var(--font-family-primary)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              Objeto buscado
            </span>
            {tipoLabel && (
              <span style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
                {tipoLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>Identificación</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <DataCard label="Nombre / Descripción" value={objetivo.nombre ?? undefined} icon={<Tag size={11} />} />
          <DataCard label="Tipo" value={tipoLabel} icon={<Package size={11} />} />
          <DataCard label="Marca" value={objetivo.marca ?? undefined} icon={<Info size={11} />} />
          <DataCard label="Modelo" value={objetivo.modelo ?? undefined} icon={<Info size={11} />} />
          <DataCard label="Color" value={objetivo.color ?? undefined} icon={<Palette size={11} />} />
        </div>
      </div>

      <div>
        <SectionTitle>Dimensiones</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <DataCard label="Alto" value={objetivo.dimensionAlto != null ? `${objetivo.dimensionAlto} cm` : undefined} icon={<Ruler size={11} />} />
          <DataCard label="Ancho" value={objetivo.dimensionAncho != null ? `${objetivo.dimensionAncho} cm` : undefined} icon={<Ruler size={11} />} />
          <DataCard label="Largo" value={objetivo.dimensionLargo != null ? `${objetivo.dimensionLargo} cm` : undefined} icon={<Ruler size={11} />} />
        </div>
      </div>

      {objetivo.detallesAdicionales && (
        <div>
          <SectionTitle>Detalles Adicionales</SectionTitle>
          <TextBlock icon={<Star size={15} />} accent>{objetivo.detallesAdicionales}</TextBlock>
        </div>
      )}

      <div>
        <SectionTitle>Imágenes ({fotos.length})</SectionTitle>
        <ImageGrid fotos={fotos} onOpen={onOpenLightbox} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Main ObjetivoModal — CU-14 (vista rápida) + CU-12/13 (edición)
───────────────────────────────────────────────── */
export default function ObjetivoModal({ operativoId, onClose }: Props) {
  const [objetivo, setObjetivo] = useState<ObjetivoApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  /* ── UI state ── */
  type Mode = 'view' | 'edit';
  const [mode, setMode] = useState<Mode>('view');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  /* ── Edit form state ── */
  const [tipo, setTipo] = useState<TipoObjetivo>('persona');
  const [personaForm, setPersonaForm] = useState<PersonaForm>(buildPersonaForm());
  const [objetoForm, setObjetoForm] = useState<ObjetoForm>(buildObjetoForm());
  const [fotosExistentes, setFotosExistentes] = useState<FotoExistente[]>([]);
  const [fotosNuevas, setFotosNuevas] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lbImgEdit, setLbImgEdit] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cargarObjetivo = useCallback(async () => {
    setLoading(true);
    try {
      const { objetivo: o } = await objetivoApi.obtener(operativoId);
      setObjetivo(o);
    } catch (err) {
      if (err instanceof ApiError && err.motivo === 'sin_objetivo') {
        setObjetivo(null);
      } else {
        setErrorGeneral(err instanceof ApiError ? err.message : 'No se pudo cargar el objetivo.');
      }
    } finally {
      setLoading(false);
    }
  }, [operativoId]);

  useEffect(() => { cargarObjetivo(); }, [cargarObjetivo]);

  // Fotos de sólo-lectura (modo view): URLs firmadas frescas de la última carga.
  const fotosVista: FotoLista[] = (objetivo?.fotos ?? []).filter((f): f is FotoLista => !!f.url);

  /* ── Enter edit mode ── */
  const enterEdit = () => {
    setTipo(objetivo?.tipo === 'OBJETO' ? 'objeto' : 'persona');
    setPersonaForm(buildPersonaForm(objetivo ?? undefined));
    setObjetoForm(buildObjetoForm(objetivo ?? undefined));
    setFotosExistentes(objetivo?.fotos ?? []);
    setFotosNuevas([]);
    setErrors({});
    setErrorGeneral('');
    setMode('edit');
  };

  const cancelEdit = () => {
    setErrors({});
    setErrorGeneral('');
    setMode('view');
  };

  const onAgregarArchivos = (files: FileList | null) => {
    if (!files) return;
    const remaining = 8 - (fotosExistentes.length + fotosNuevas.length);
    if (remaining <= 0) return;
    const nuevas = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, remaining);
    if (nuevas.length) setFotosNuevas(prev => [...prev, ...nuevas]);
  };
  const onQuitarNueva = (idx: number) => setFotosNuevas(prev => prev.filter((_, i) => i !== idx));
  const onEliminarExistente = async (fotoId: string) => {
    try {
      await objetivoApi.eliminarFoto(operativoId, fotoId);
      setFotosExistentes(prev => prev.filter(f => f.id !== fotoId));
    } catch (err) {
      setErrorGeneral(err instanceof ApiError ? err.message : 'No se pudo eliminar la foto.');
    }
  };

  /* ── Validate & save ── */
  const validate = (): boolean => {
    const e = validarObjetivoForm(tipo, personaForm, objetoForm);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = (): CrearObjetivoPayload => {
    if (tipo === 'persona') {
      return {
        tipo: 'PERSONA',
        nombre: personaForm.nombre.trim(),
        apellido: personaForm.apellido.trim() || null,
        dni: personaForm.dni.trim() || null,
        edad: personaForm.edad ? Number(personaForm.edad) : null,
        genero: (personaForm.sexo || null) as CrearObjetivoPayload['genero'],
        nacionalidad: personaForm.nacionalidad.trim() || null,
        estatura: personaForm.estatura ? Number(personaForm.estatura) : null,
        complexionFisica: personaForm.complexion || null,
        colorPiel: personaForm.colorPiel || null,
        colorOjos: personaForm.colorOjos || null,
        colorPelo: personaForm.colorCabello || null,
        vestimenta: personaForm.vestimenta.trim() || null,
        detallesAdicionales: personaForm.detallesAdicionales.trim() || null,
      };
    }
    return {
      tipo: 'OBJETO',
      nombre: objetoForm.nombre.trim(),
      tipoObjeto: objetoForm.tipo || null,
      color: objetoForm.color.trim() || null,
      marca: objetoForm.marca.trim() || null,
      modelo: objetoForm.modelo.trim() || null,
      dimensionAlto: objetoForm.dimensionAlto ? Number(objetoForm.dimensionAlto) : null,
      dimensionAncho: objetoForm.dimensionAncho ? Number(objetoForm.dimensionAncho) : null,
      dimensionLargo: objetoForm.dimensionLargo ? Number(objetoForm.dimensionLargo) : null,
      detallesAdicionales: objetoForm.detallesAdicionales.trim() || null,
    };
  };

  const isNew = !objetivo;

  const handleSave = async () => {
    if (!validate()) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setGuardando(true);
    setErrorGeneral('');
    try {
      const payload = buildPayload();
      if (isNew) {
        await objetivoApi.crear(operativoId, payload);
      } else {
        await objetivoApi.actualizar(operativoId, payload);
      }
      if (fotosNuevas.length > 0) {
        await objetivoApi.subirFotos(operativoId, fotosNuevas);
      }
      await cargarObjetivo();
      setMode('view');
    } catch (err) {
      setErrorGeneral(err instanceof ApiError ? err.message : 'No se pudo guardar el objetivo.');
    } finally {
      setGuardando(false);
    }
  };

  const lightboxPrev = () => setLightboxIdx(i => i !== null ? (i - 1 + fotosVista.length) % fotosVista.length : null);
  const lightboxNext = () => setLightboxIdx(i => i !== null ? (i + 1) % fotosVista.length : null);

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={mode === 'view' ? onClose : undefined}
      >
        {/* ── Modal panel ── */}
        <div
          className="w-full flex flex-col rounded-[var(--radius-card)] overflow-hidden"
          style={{
            maxWidth: 660,
            maxHeight: '90vh',
            background: 'var(--card)',
            boxShadow: 'var(--elevation-md)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ══ Header ══ */}
          <div
            className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: objetivo?.tipo === 'OBJETO'
                    ? 'rgba(255,169,135,0.15)'
                    : 'rgba(229,75,75,0.1)',
                }}
              >
                {objetivo?.tipo === 'OBJETO'
                  ? <Package size={17} style={{ color: 'var(--accent)' }} />
                  : <User size={17} style={{ color: 'var(--primary)' }} />
                }
              </div>
              <div>
                <p style={{
                  color: 'var(--foreground)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                }}>
                  Objetivo Buscado
                </p>
                {mode === 'view' && objetivo && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Lock size={10} style={{ color: 'var(--muted-foreground)' }} />
                    <span style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
                      Solo lectura — presioná Editar para modificar
                    </span>
                  </div>
                )}
                {mode === 'edit' && (
                  <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
                    {isNew ? 'Completá los datos del objetivo' : 'Modificá los datos del objetivo'}
                  </p>
                )}
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-2">
              {mode === 'view' && !loading && (
                <button
                  onClick={enterEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] transition-opacity hover:opacity-88"
                  style={{
                    background: isNew ? 'var(--primary)' : 'var(--muted)',
                    color: isNew ? '#fff' : 'var(--foreground)',
                    border: isNew ? 'none' : '1px solid var(--border)',
                    fontSize: 'var(--text-label)',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontFamily: 'var(--font-family-primary)',
                  }}
                >
                  {isNew ? <Plus size={14} /> : <Pencil size={13} />}
                  {isNew ? 'Cargar' : 'Editar'}
                </button>
              )}
              {mode === 'edit' && (
                <>
                  <button
                    onClick={cancelEdit}
                    disabled={guardando}
                    className="px-3 py-1.5 rounded-[var(--radius-button)] transition-colors"
                    style={{
                      background: 'var(--muted)',
                      color: 'var(--foreground)',
                      border: '1px solid var(--border)',
                      fontSize: 'var(--text-label)',
                      fontWeight: 'var(--font-weight-semibold)',
                      fontFamily: 'var(--font-family-primary)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--muted)')}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={guardando}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] transition-opacity hover:opacity-88"
                    style={{
                      background: 'var(--primary)',
                      color: '#fff',
                      fontSize: 'var(--text-label)',
                      fontWeight: 'var(--font-weight-semibold)',
                      fontFamily: 'var(--font-family-primary)',
                      opacity: guardando ? 0.7 : 1,
                    }}
                  >
                    {guardando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {isNew ? 'Cargar objetivo' : 'Guardar cambios'}
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors ml-1"
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ══ Scrollable body ══ */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">

            {errorGeneral && mode === 'view' && (
              <div
                className="flex items-center gap-2 p-3 rounded-[var(--radius-input)] mb-4"
                style={{ background: 'rgba(229,75,75,0.08)', border: '1px solid rgba(229,75,75,0.25)' }}
              >
                <AlertCircle size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <p style={{ color: 'var(--primary)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
                  {errorGeneral}
                </p>
              </div>
            )}

            {/* ─── VIEW MODE ─── */}
            {mode === 'view' && (
              <>
                {loading ? (
                  <div className="flex items-center justify-center py-20" style={{ color: 'var(--muted-foreground)' }}>
                    <Loader2 size={18} className="animate-spin" style={{ marginRight: 8 }} /> Cargando…
                  </div>
                ) : !objetivo ? (
                  /* Empty state */
                  <div
                    className="flex flex-col items-center justify-center py-20 rounded-[var(--radius-card)]"
                    style={{ background: 'var(--muted)', border: '1.5px dashed var(--border)' }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: 'var(--card)' }}
                    >
                      <User size={26} style={{ color: 'var(--muted-foreground)', opacity: 0.35 }} />
                    </div>
                    <p style={{
                      color: 'var(--foreground)', fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                    }}>
                      Sin objetivo cargado
                    </p>
                    <p style={{
                      color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
                      fontFamily: 'var(--font-family-primary)',
                      marginTop: 6, marginBottom: 20, textAlign: 'center', maxWidth: 300,
                    }}>
                      Todavía no hay datos del objetivo. Presioná "Cargar" para agregar la información.
                    </p>
                    <button
                      onClick={enterEdit}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-button)] transition-opacity hover:opacity-88"
                      style={{
                        background: 'var(--primary)', color: '#fff',
                        fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)',
                        fontFamily: 'var(--font-family-primary)',
                      }}
                    >
                      <Plus size={16} /> Cargar objetivo buscado
                    </button>
                  </div>
                ) : objetivo.tipo === 'PERSONA' ? (
                  <PersonaView objetivo={objetivo} fotos={fotosVista} onOpenLightbox={setLightboxIdx} />
                ) : (
                  <ObjetoView objetivo={objetivo} fotos={fotosVista} onOpenLightbox={setLightboxIdx} />
                )}
              </>
            )}

            {/* ─── EDIT MODE ─── */}
            {mode === 'edit' && (
              <>
                {/* Error banner */}
                {(Object.keys(errors).length > 0 || errorGeneral) && (
                  <div
                    className="flex items-center gap-2 p-3 rounded-[var(--radius-input)] mb-4"
                    style={{ background: 'rgba(229,75,75,0.08)', border: '1px solid rgba(229,75,75,0.25)' }}
                  >
                    <AlertCircle size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <p style={{ color: 'var(--primary)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
                      {errorGeneral || Object.values(errors)[0]}
                    </p>
                  </div>
                )}

                <ObjetivoFormContent
                  tipo={tipo}
                  onTipoChange={setTipo}
                  lockTipo={!isNew}
                  personaForm={personaForm}
                  onPersonaChange={(k, v) => setPersonaForm(f => ({ ...f, [k]: v }))}
                  objetoForm={objetoForm}
                  onObjetoChange={(k, v) => setObjetoForm(f => ({ ...f, [k]: v }))}
                  fotosExistentes={fotosExistentes}
                  fotosNuevas={fotosNuevas}
                  onAgregarArchivos={onAgregarArchivos}
                  onQuitarNueva={onQuitarNueva}
                  onEliminarExistente={onEliminarExistente}
                  onLightbox={setLbImgEdit}
                  errors={errors}
                />
                <div style={{ height: 8 }} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Lightbox (modo lectura, con prev/next sobre las fotos reales) ── */}
      {mode === 'view' && lightboxIdx !== null && fotosVista.length > 0 && (
        <Lightbox
          fotos={fotosVista}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onPrev={lightboxPrev}
          onNext={lightboxNext}
        />
      )}

      {/* ── Lightbox de una sola foto (modo edición — existentes o previews locales) ── */}
      {mode === 'edit' && lbImgEdit && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLbImgEdit(null)}
        >
          <button
            onClick={() => setLbImgEdit(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%', width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={18} />
          </button>
          <img
            src={lbImgEdit}
            alt="Vista ampliada"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 'var(--radius-input)', objectFit: 'contain' }}
          />
        </div>
      )}
    </>
  );
}
