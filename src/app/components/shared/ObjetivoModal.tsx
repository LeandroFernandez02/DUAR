import { useState, useRef, useCallback } from 'react';
import {
  X, User, Package, Pencil, Plus, CheckCircle2,
  ChevronLeft, ChevronRight, Eye, Tag, Info,
  Ruler, Palette, Star, Truck, Scissors, Shirt,
  Hash, AlertCircle, Upload, Trash2, ImageOff,
  Lock, AlertTriangle,
} from 'lucide-react';
import {
  ObjetivoBusqueda, TipoObjetivo,
  DatosPersonaBuscada, DatosObjetoBuscado,
} from '../../data/mockData';
import {
  ObjetivoFormContent,
  PersonaForm, ObjetoForm,
  buildPersonaForm, buildObjetoForm,
} from './ObjetivoFormContent';
import { useApp } from '../../context/AppContext';

/* ─── Types ─── */
interface Props {
  operativoId: string;
  onClose: () => void;
}

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
function ImageGrid({ images, onOpen }: { images: string[]; onOpen: (i: number) => void }) {
  if (images.length === 0) {
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
      {images.map((src, idx) => (
        <button
          key={idx}
          onClick={() => onOpen(idx)}
          className="relative overflow-hidden rounded-[var(--radius-input)] group"
          style={{ aspectRatio: '1', background: 'var(--muted)' }}
        >
          <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
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

/* ─── Lightbox ─── */
function Lightbox({ images, index, onClose, onPrev, onNext }: {
  images: string[]; index: number;
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
          {index + 1} / {images.length}
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
        {images.length > 1 && (
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
          src={images[index]}
          alt={`Foto ${index + 1}`}
          className="max-w-full max-h-full object-contain"
          style={{ maxHeight: 'calc(100vh - 120px)', borderRadius: 'var(--radius-input)' }}
        />
        {images.length > 1 && (
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
      {images.length > 1 && (
        <div
          className="flex items-center gap-2 px-5 py-3 overflow-x-auto flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          onClick={e => e.stopPropagation()}
        >
          {images.map((src, i) => (
            <div
              key={i}
              className="flex-shrink-0 rounded-md overflow-hidden"
              style={{
                width: 44, height: 44,
                opacity: i === index ? 1 : 0.4,
                outline: i === index ? '2px solid #E54B4B' : 'none',
                outlineOffset: 2,
              }}
            >
              <img src={src} alt={`Min ${i + 1}`} className="w-full h-full object-cover" />
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
function PersonaView({ persona, images, onOpenLightbox }: {
  persona: DatosPersonaBuscada;
  images: string[];
  onOpenLightbox: (i: number) => void;
}) {
  const nombreCompleto = `${persona.nombre}${persona.apellido ? ' ' + persona.apellido : ''}`.trim();
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
          <DataCard label="DNI" value={persona.dni} icon={<Hash size={11} />} />
          <DataCard label="Edad" value={persona.edad !== undefined ? `${persona.edad} años` : undefined} icon={<Info size={11} />} />
          <DataCard label="Sexo" value={persona.sexo} icon={<User size={11} />} />
          <DataCard label="Nacionalidad" value={persona.nacionalidad} icon={<Info size={11} />} />
          <DataCard label="Estatura" value={persona.estatura} icon={<Ruler size={11} />} />
          <DataCard label="Complexión" value={persona.complexion} icon={<Info size={11} />} />
        </div>
      </div>

      {/* Datos físicos */}
      <div>
        <SectionTitle>Características físicas</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <DataCard label="Color de piel" value={persona.colorPiel} icon={<Palette size={11} />} />
          <DataCard label="Color de ojos" value={persona.colorOjos} icon={<Eye size={11} />} />
          <DataCard label="Color de cabello" value={persona.colorCabello} icon={<Scissors size={11} />} />
        </div>
      </div>

      {persona.detallesAdicionales && (
        <div>
          <SectionTitle>Detalles Adicionales</SectionTitle>
          <TextBlock icon={<Star size={15} />} accent>{persona.detallesAdicionales}</TextBlock>
        </div>
      )}

      {/* Imágenes */}
      <div>
        <SectionTitle>Imágenes ({images.length})</SectionTitle>
        <ImageGrid images={images} onOpen={onOpenLightbox} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Objeto view (read-only)
───────────────────────────────────────────────── */
function ObjetoView({ objeto, images, onOpenLightbox }: {
  objeto: DatosObjetoBuscado;
  images: string[];
  onOpenLightbox: (i: number) => void;
}) {
  const tipoLabel = objeto.tipo ? (OBJECT_TYPES[objeto.tipo] ?? objeto.tipo) : undefined;
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
            {objeto.nombre || 'Sin nombre registrado'}
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
          <DataCard label="Nombre / Descripción" value={objeto.nombre} icon={<Tag size={11} />} />
          <DataCard label="Tipo" value={tipoLabel} icon={<Package size={11} />} />
          <DataCard label="Marca" value={objeto.marca} icon={<Info size={11} />} />
          <DataCard label="Modelo" value={objeto.modelo} icon={<Info size={11} />} />
          <DataCard label="Color" value={objeto.color} icon={<Palette size={11} />} />
          <DataCard label="Dimensiones" value={objeto.dimensiones} icon={<Ruler size={11} />} />
        </div>
      </div>

      {objeto.descripcion && (
        <div>
          <SectionTitle>Descripción</SectionTitle>
          <TextBlock icon={<Truck size={15} />}>{objeto.descripcion}</TextBlock>
        </div>
      )}
      {objeto.detallesAdicionales && (
        <div>
          <SectionTitle>Detalles Adicionales</SectionTitle>
          <TextBlock icon={<Star size={15} />} accent>{objeto.detallesAdicionales}</TextBlock>
        </div>
      )}

      <div>
        <SectionTitle>Imágenes ({images.length})</SectionTitle>
        <ImageGrid images={images} onOpen={onOpenLightbox} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Main ObjetivoModal
───────────────────────────────────────────────── */
export default function ObjetivoModal({ operativoId, onClose }: Props) {
  const { getOperativo, updateOperativo } = useApp();
  const operativo = getOperativo(operativoId);
  const objetivo = operativo?.objetivoBusqueda ?? null;

  /* ── UI state ── */
  type Mode = 'view' | 'edit';
  const [mode, setMode] = useState<Mode>('view');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  /* ── Edit form state ── */
  const [tipo, setTipo] = useState<TipoObjetivo | ''>(objetivo?.tipo ?? '');
  const [personaForm, setPersonaForm] = useState<PersonaForm>(buildPersonaForm(objetivo?.persona));
  const [objetoForm, setObjetoForm] = useState<ObjetoForm>(buildObjetoForm(objetivo?.objeto));
  const [imagenes, setImagenes] = useState<string[]>(
    objetivo?.tipo === 'persona'
      ? (objetivo?.persona?.imagenes ?? [])
      : (objetivo?.objeto?.imagenes ?? [])
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentImages: string[] =
    objetivo?.tipo === 'persona'
      ? (objetivo?.persona?.imagenes ?? [])
      : (objetivo?.objeto?.imagenes ?? []);

  /* ── Lightbox navigation ── */
  const lbImages = mode === 'view' ? currentImages : imagenes;
  const lightboxPrev = () => setLightboxIdx(i => i !== null ? (i - 1 + lbImages.length) % lbImages.length : null);
  const lightboxNext = () => setLightboxIdx(i => i !== null ? (i + 1) % lbImages.length : null);

  /* ── Enter edit mode ── */
  const enterEdit = () => {
    setTipo(objetivo?.tipo ?? '');
    setPersonaForm(buildPersonaForm(objetivo?.persona));
    setObjetoForm(buildObjetoForm(objetivo?.objeto));
    setImagenes(
      objetivo?.tipo === 'persona'
        ? (objetivo?.persona?.imagenes ?? [])
        : (objetivo?.objeto?.imagenes ?? [])
    );
    setErrors({});
    setMode('edit');
  };

  /* ── Cancel edit ── */
  const cancelEdit = () => {
    setErrors({});
    setMode('view');
  };

  /* ── Validate & save ── */
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (tipo === 'persona') {
      if (!personaForm.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    } else if (tipo === 'objeto') {
      if (!objetoForm.nombre.trim()) e.nombre = 'El nombre / descripción es obligatorio.';
    } else {
      e.tipo = 'Seleccioná un tipo de objetivo.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    let result: ObjetivoBusqueda;
    if (tipo === 'persona') {
      result = {
        tipo: 'persona',
        persona: {
          nombre: personaForm.nombre.trim(),
          apellido: personaForm.apellido.trim(),
          dni: personaForm.dni.trim() || undefined,
          edad: personaForm.edad ? Number(personaForm.edad) : undefined,
          sexo: personaForm.sexo || undefined,
          nacionalidad: personaForm.nacionalidad.trim() || undefined,
          estatura: personaForm.estatura.trim() || undefined,
          complexion: personaForm.complexion || undefined,
          colorPiel: personaForm.colorPiel || undefined,
          colorOjos: personaForm.colorOjos || undefined,
          colorCabello: personaForm.colorCabello || undefined,
          detallesAdicionales: personaForm.detallesAdicionales.trim() || undefined,
          imagenes,
        },
      };
    } else {
      result = {
        tipo: 'objeto',
        objeto: {
          nombre: objetoForm.nombre.trim(),
          tipo: objetoForm.tipo || undefined,
          descripcion: objetoForm.descripcion.trim() || undefined,
          color: objetoForm.color.trim() || undefined,
          marca: objetoForm.marca.trim() || undefined,
          modelo: objetoForm.modelo.trim() || undefined,
          dimensiones: objetoForm.dimensiones.trim() || undefined,
          detallesAdicionales: objetoForm.detallesAdicionales.trim() || undefined,
          imagenes,
        },
      };
    }

    updateOperativo(operativoId, { objetivoBusqueda: result });
    setMode('view');
  };

  const isNew = !objetivo;

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
                  background: objetivo?.tipo === 'objeto'
                    ? 'rgba(255,169,135,0.15)'
                    : 'rgba(229,75,75,0.1)',
                }}
              >
                {objetivo?.tipo === 'objeto'
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
              {mode === 'view' && (
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] transition-opacity hover:opacity-88"
                    style={{
                      background: 'var(--primary)',
                      color: '#fff',
                      fontSize: 'var(--text-label)',
                      fontWeight: 'var(--font-weight-semibold)',
                      fontFamily: 'var(--font-family-primary)',
                    }}
                  >
                    <CheckCircle2 size={14} />
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

            {/* ─── VIEW MODE ─── */}
            {mode === 'view' && (
              <>
                {!objetivo ? (
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
                ) : objetivo.tipo === 'persona' && objetivo.persona ? (
                  <PersonaView
                    persona={objetivo.persona}
                    images={currentImages}
                    onOpenLightbox={setLightboxIdx}
                  />
                ) : objetivo.tipo === 'objeto' && objetivo.objeto ? (
                  <ObjetoView
                    objeto={objetivo.objeto}
                    images={currentImages}
                    onOpenLightbox={setLightboxIdx}
                  />
                ) : (
                  <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family-primary)' }}>
                    Datos del objetivo incompletos.
                  </p>
                )}
              </>
            )}

            {/* ─── EDIT MODE ─── */}
            {mode === 'edit' && (
              <>
                {/* Error banner */}
                {Object.keys(errors).length > 0 && (
                  <div
                    className="flex items-center gap-2 p-3 rounded-[var(--radius-input)] mb-4"
                    style={{ background: 'rgba(229,75,75,0.08)', border: '1px solid rgba(229,75,75,0.25)' }}
                  >
                    <AlertCircle size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <p style={{ color: 'var(--primary)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
                      {Object.values(errors)[0]}
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
                  imagenes={imagenes}
                  onImagenesChange={setImagenes}
                  onLightbox={idx => setLightboxIdx(idx)}
                  errors={errors}
                />
                <div style={{ height: 8 }} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && lbImages.length > 0 && (
        <Lightbox
          images={lbImages}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onPrev={lightboxPrev}
          onNext={lightboxNext}
        />
      )}
    </>
  );
}
