import { useParams, Navigate } from 'react-router';
import { useRef, useState, useCallback } from 'react';
import {
  User, Package, Hash, Info, Tag, Ruler, Palette,
  Eye, Scissors, Shirt, Star, Truck, ImageOff,
  Upload, X, Trash2, AlertTriangle, ChevronLeft, ChevronRight,
  Pencil, Plus, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  DatosPersonaBuscada, DatosObjetoBuscado,
  ObjetivoBusqueda, TipoObjetivo, Operativo,
} from '../../data/mockData';
import {
  ObjetivoFormContent,
  PersonaForm, ObjetoForm,
  buildPersonaForm, buildObjetoForm,
} from '../../components/shared/ObjetivoFormContent';

/* ─── Constants (display only) ─── */
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
   Edit / Create Modal  (uses shared ObjetivoFormContent)
───────────────────────────────────────────────── */
function EditModal({
  objetivo,
  onSave,
  onClose,
}: {
  objetivo: ObjetivoBusqueda | null;
  onSave: (obj: ObjetivoBusqueda) => void;
  onClose: () => void;
}) {
  const isNew = objetivo === null;

  const [tipo, setTipo] = useState<TipoObjetivo>(objetivo?.tipo ?? 'persona');
  const [personaForm, setPersonaForm] = useState<PersonaForm>(
    buildPersonaForm(objetivo?.persona)
  );
  const [objetoForm, setObjetoForm] = useState<ObjetoForm>(
    buildObjetoForm(objetivo?.objeto)
  );
  const [imagenes, setImagenes] = useState<string[]>(
    objetivo?.tipo === 'persona'
      ? (objetivo?.persona?.imagenes ?? [])
      : (objetivo?.objeto?.imagenes ?? [])
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lbImg, setLbImg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (tipo === 'persona') {
      if (!personaForm.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    } else {
      if (!objetoForm.nombre.trim()) e.nombre = 'El nombre/descripción es obligatorio.';
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
    onSave(result);
  };

  return (
    <>
      {/* ── Modal overlay ── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          className="w-full flex flex-col rounded-[var(--radius-card)] overflow-hidden"
          style={{
            maxWidth: 640,
            maxHeight: '90vh',
            background: 'var(--card)',
            boxShadow: 'var(--elevation-md)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(229,75,75,0.1)' }}
              >
                {isNew
                  ? <Plus size={17} style={{ color: 'var(--primary)' }} />
                  : <Pencil size={17} style={{ color: 'var(--primary)' }} />
                }
              </div>
              <div>
                <p style={{
                  color: 'var(--foreground)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                }}>
                  {isNew ? 'Cargar objetivo buscado' : 'Editar objetivo buscado'}
                </p>
                <p style={{
                  color: 'var(--muted-foreground)',
                  fontSize: 'var(--text-label)',
                  fontFamily: 'var(--font-family-primary)',
                }}>
                  {isNew ? 'Completá los datos del objetivo' : 'Modificá los datos del objetivo'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">

            {/* Error banner */}
            {Object.keys(errors).length > 0 && (
              <div
                className="flex items-center gap-2 p-3 rounded-[var(--radius-input)] mb-4"
                style={{ background: 'rgba(229,75,75,0.08)', border: '1px solid rgba(229,75,75,0.25)' }}
              >
                <AlertCircle size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <p style={{
                  color: 'var(--primary)',
                  fontSize: 'var(--text-label)',
                  fontFamily: 'var(--font-family-primary)',
                }}>
                  {Object.values(errors)[0]}
                </p>
              </div>
            )}

            {/* Shared form content */}
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
              onLightbox={setLbImg}
              errors={errors}
            />

            <div style={{ height: 8 }} />
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-2 px-6 py-4 flex-shrink-0"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-[var(--radius-button)] transition-colors"
              style={{
                background: 'var(--muted)',
                color: 'var(--foreground)',
                fontSize: 'var(--text-label)',
                fontWeight: 'var(--font-weight-semibold)',
                fontFamily: 'var(--font-family-primary)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--muted)')}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)] transition-opacity hover:opacity-88"
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
          </div>
        </div>
      </div>

      {/* Lightbox within modal */}
      {lbImg && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLbImg(null)}
        >
          <button
            onClick={() => setLbImg(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%', width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={18} />
          </button>
          <img
            src={lbImg}
            alt="Vista ampliada"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              borderRadius: 'var(--radius-input)',
              objectFit: 'contain',
            }}
          />
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────
   Delete Image Confirm Modal
───────────────────────────────────────────────── */
function DeleteModal({
  imgSrc, imgIndex, total, onConfirm, onCancel,
}: {
  imgSrc: string; imgIndex: number; total: number;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-[var(--radius-card)] flex flex-col overflow-hidden"
        style={{ background: 'var(--card)', boxShadow: 'var(--elevation-md)' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(229,75,75,0.12)' }}
          >
            <AlertTriangle size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <p style={{
              color: 'var(--foreground)', fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
            }}>
              Eliminar imagen
            </p>
            <p style={{
              color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
              fontFamily: 'var(--font-family-primary)',
            }}>
              Foto {imgIndex + 1} de {total}
            </p>
          </div>
        </div>
        <div className="px-5 pt-4">
          <div
            className="rounded-[var(--radius-input)] overflow-hidden"
            style={{ maxHeight: 180, background: 'var(--muted)' }}
          >
            <img
              src={imgSrc}
              alt="Vista previa"
              className="w-full h-full object-cover"
              style={{ maxHeight: 180, objectFit: 'cover' }}
            />
          </div>
        </div>
        <div className="px-5 py-4">
          <div
            className="flex items-start gap-2 p-3 rounded-[var(--radius-input)]"
            style={{ background: 'rgba(229,75,75,0.06)', border: '1px solid rgba(229,75,75,0.2)' }}
          >
            <AlertTriangle size={13} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }} />
            <p style={{
              color: 'var(--foreground)', fontSize: 'var(--text-label)',
              fontFamily: 'var(--font-family-primary)', lineHeight: 1.55,
            }}>
              Esta acción no se puede deshacer. La imagen será eliminada permanentemente del registro del objetivo.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-[var(--radius-button)] transition-colors"
            style={{
              background: 'var(--muted)', color: 'var(--foreground)',
              fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'var(--font-family-primary)', border: '1px solid var(--border)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--muted)')}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-button)] transition-opacity hover:opacity-85"
            style={{
              background: 'var(--primary)', color: '#fff',
              fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)',
              fontFamily: 'var(--font-family-primary)',
            }}
          >
            <Trash2 size={13} />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Lightbox (page-level, for the image gallery)
───────────────────────────────────────────────── */
function Lightbox({
  images, index, onClose, onPrev, onNext, onDeleteRequest,
}: {
  images: string[]; index: number;
  onClose: () => void; onPrev: () => void; onNext: () => void;
  onDeleteRequest: (idx: number) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        <span style={{
          color: 'rgba(255,255,255,0.7)', fontSize: 'var(--text-label)',
          fontFamily: 'var(--font-family-primary)',
        }}>
          {index + 1} / {images.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDeleteRequest(index)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: 'rgba(229,75,75,0.15)', color: '#E54B4B',
              border: '1px solid rgba(229,75,75,0.3)',
              fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(229,75,75,0.28)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(229,75,75,0.15)')}
          >
            <Trash2 size={13} /> Eliminar
          </button>
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
                width: 48, height: 48,
                opacity: i === index ? 1 : 0.45,
                outline: i === index ? '2px solid #E54B4B' : 'none',
                outlineOffset: 2,
              }}
            >
              <img src={src} alt={`Miniatura ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Image Gallery  (page-level, outside modal)
───────────────────────────────────────────────── */
function ImageGallery({
  images, onUpload, onDeleteRequest, onOpenLightbox,
}: {
  images: string[];
  onUpload: (files: FileList) => void;
  onDeleteRequest: (idx: number) => void;
  onOpenLightbox: (idx: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)] transition-all"
          style={{
            background: 'var(--primary)', color: '#fff',
            fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)',
            fontFamily: 'var(--font-family-primary)',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <Upload size={14} /> Subir imágenes
        </button>
        <span style={{
          color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
          fontFamily: 'var(--font-family-primary)',
        }}>
          {images.length} imagen{images.length !== 1 ? 'es' : ''} cargada{images.length !== 1 ? 's' : ''}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files?.length) { onUpload(e.target.files); e.target.value = ''; } }}
        />
      </div>

      {images.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center py-14 rounded-[var(--radius-input)] w-full transition-all"
          style={{ background: 'var(--muted)', border: '1.5px dashed var(--border)', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <ImageOff size={28} style={{ color: 'var(--muted-foreground)', opacity: 0.35 }} />
          <p style={{
            color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
            fontFamily: 'var(--font-family-primary)', marginTop: 10, opacity: 0.6,
          }}>
            Sin imágenes — hacé clic para subir
          </p>
        </button>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {images.map((src, idx) => (
            <div
              key={idx}
              className="relative overflow-hidden rounded-[var(--radius-input)] group"
              style={{ aspectRatio: '1', background: 'var(--muted)' }}
            >
              <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
              <div
                className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.48)' }}
              >
                <button
                  onClick={() => onOpenLightbox(idx)}
                  className="p-1.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                  title="Ver imagen"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.28)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                >
                  <Eye size={14} color="#fff" />
                </button>
                <button
                  onClick={() => onDeleteRequest(idx)}
                  className="p-1.5 rounded-lg"
                  style={{ background: 'rgba(229,75,75,0.25)' }}
                  title="Eliminar imagen"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(229,75,75,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(229,75,75,0.25)')}
                >
                  <Trash2 size={14} color="#E54B4B" />
                </button>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Display sub-components
───────────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      color: 'var(--foreground)', fontSize: 'var(--text-label)',
      fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
      textTransform: 'uppercase', letterSpacing: '0.07em',
      paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 12,
    }}>
      {children}
    </h3>
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
      className="flex items-start gap-3 p-4 rounded-[var(--radius-input)]"
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

/* ─── Persona display ─── */
function PersonaContent({
  persona, images, onUpload, onDeleteRequest, onOpenLightbox,
}: {
  persona: DatosPersonaBuscada; images: string[];
  onUpload: (f: FileList) => void;
  onDeleteRequest: (i: number) => void;
  onOpenLightbox: (i: number) => void;
}) {
  const nombreCompleto = `${persona.nombre}${persona.apellido ? ' ' + persona.apellido : ''}`.trim();
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(229,75,75,0.1)' }}
        >
          <User size={26} style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <h2 style={{
            color: 'var(--foreground)', fontSize: 'var(--text-h1)',
            fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.2,
          }}>
            {nombreCompleto || 'Sin nombre registrado'}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className="px-2 py-0.5 rounded-md"
              style={{
                background: 'rgba(229,75,75,0.12)', color: 'var(--primary)',
                fontSize: '11px', fontWeight: 'var(--font-weight-semibold)',
                fontFamily: 'var(--font-family-primary)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              Persona buscada
            </span>
            {persona.dni && (
              <span style={{
                color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
                fontFamily: 'var(--font-family-primary)',
              }}>
                DNI {persona.dni}
              </span>
            )}
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>Datos Personales</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <DataCard label="Nombre completo" value={nombreCompleto} icon={<User size={11} />} />
          <DataCard label="DNI / Documento" value={persona.dni} icon={<Hash size={11} />} />
          <DataCard label="Edad" value={persona.edad !== undefined ? `${persona.edad} años` : undefined} icon={<Info size={11} />} />
          <DataCard label="Sexo" value={persona.sexo} icon={<Info size={11} />} />
          <DataCard label="Nacionalidad" value={persona.nacionalidad} icon={<Tag size={11} />} />
        </div>
      </div>

      <div>
        <SectionTitle>Características Físicas</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <DataCard label="Estatura" value={persona.estatura} icon={<Ruler size={11} />} />
          <DataCard label="Complexión" value={persona.complexion} icon={<Info size={11} />} />
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

      <div>
        <SectionTitle>Imágenes ({images.length})</SectionTitle>
        <ImageGallery
          images={images}
          onUpload={onUpload}
          onDeleteRequest={onDeleteRequest}
          onOpenLightbox={onOpenLightbox}
        />
      </div>
    </div>
  );
}

/* ─── Objeto display ─── */
function ObjetoContent({
  objeto, images, onUpload, onDeleteRequest, onOpenLightbox,
}: {
  objeto: DatosObjetoBuscado; images: string[];
  onUpload: (f: FileList) => void;
  onDeleteRequest: (i: number) => void;
  onOpenLightbox: (i: number) => void;
}) {
  const tipoLabel = objeto.tipo ? (OBJECT_TYPES[objeto.tipo] ?? objeto.tipo) : undefined;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,169,135,0.15)' }}
        >
          <Package size={26} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h2 style={{
            color: 'var(--foreground)', fontSize: 'var(--text-h1)',
            fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.2,
          }}>
            {objeto.nombre || 'Sin nombre registrado'}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className="px-2 py-0.5 rounded-md"
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
              <span style={{
                color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
                fontFamily: 'var(--font-family-primary)',
              }}>
                {tipoLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>Identificación</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
        <ImageGallery
          images={images}
          onUpload={onUpload}
          onDeleteRequest={onDeleteRequest}
          onOpenLightbox={onOpenLightbox}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────── */
export default function ObjetivoBuscado() {
  const { id } = useParams<{ id: string }>();
  const { getOperativo, updateOperativo } = useApp();

  const [showEditModal, setShowEditModal] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);

  if (!id) return <Navigate to="/operativos" replace />;
  const operativo = getOperativo(id);
  if (!operativo) return <Navigate to="/operativos" replace />;

  const objetivo = operativo.objetivoBusqueda;

  const currentImages: string[] =
    objetivo?.tipo === 'persona'
      ? (objetivo.persona?.imagenes ?? [])
      : (objetivo?.objeto?.imagenes ?? []);

  /* ── Persist helpers ── */
  const saveImages = useCallback((newImages: string[]) => {
    if (!objetivo) return;
    const updated: Partial<Operativo> = {
      objetivoBusqueda: objetivo.tipo === 'persona'
        ? { ...objetivo, persona: { ...objetivo.persona!, imagenes: newImages } }
        : { ...objetivo, objeto: { ...objetivo.objeto!, imagenes: newImages } },
    };
    updateOperativo(id, updated);
  }, [objetivo, id, updateOperativo]);

  const handleUpload = useCallback((files: FileList) => {
    const readers = Array.from(files).map(
      f => new Promise<string>(res => {
        const r = new FileReader();
        r.onload = e => res(e.target?.result as string);
        r.readAsDataURL(f);
      })
    );
    Promise.all(readers).then(b64 => saveImages([...currentImages, ...b64]));
  }, [currentImages, saveImages]);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteIdx === null) return;
    const next = currentImages.filter((_, i) => i !== deleteIdx);
    saveImages(next);
    if (lightboxIdx !== null) {
      if (next.length === 0) setLightboxIdx(null);
      else if (lightboxIdx >= next.length) setLightboxIdx(next.length - 1);
    }
    setDeleteIdx(null);
  }, [deleteIdx, currentImages, saveImages, lightboxIdx]);

  const handleSaveObjetivo = useCallback((obj: ObjetivoBusqueda) => {
    updateOperativo(id, { objetivoBusqueda: obj });
    setShowEditModal(false);
  }, [id, updateOperativo]);

  const lightboxPrev = () => setLightboxIdx(i => i !== null ? (i - 1 + currentImages.length) % currentImages.length : null);
  const lightboxNext = () => setLightboxIdx(i => i !== null ? (i + 1) % currentImages.length : null);

  return (
    <>
      <div className="p-6 md:p-8" style={{ fontFamily: 'var(--font-family-primary)' }}>

        {/* Page header */}
        <div
          className="flex items-center justify-between gap-4 flex-wrap pb-6 mb-6"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: objetivo?.tipo === 'objeto'
                  ? 'rgba(255,169,135,0.15)'
                  : 'rgba(229,75,75,0.1)',
              }}
            >
              {objetivo?.tipo === 'objeto'
                ? <Package size={20} style={{ color: 'var(--accent)' }} />
                : <User size={20} style={{ color: 'var(--primary)' }} />
              }
            </div>
            <div>
              <h1 style={{
                color: 'var(--foreground)', fontSize: 'var(--text-h2)',
                fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-family-primary)', lineHeight: 1.2,
              }}>
                Objetivo Buscado
              </h1>
              
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)] transition-opacity hover:opacity-88"
            style={objetivo
              ? {
                  background: 'var(--card)', border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                  fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                }
              : {
                  background: 'var(--primary)', color: '#fff',
                  fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)',
                  fontFamily: 'var(--font-family-primary)',
                }
            }
          >
            {objetivo
              ? <><Pencil size={14} /> Editar datos</>
              : <><Plus size={14} /> Cargar objetivo</>
            }
          </button>
        </div>

        {/* Content */}
        {!objetivo ? (
          /* Empty state */
          <div
            className="flex flex-col items-center justify-center py-24 rounded-[var(--radius-card)]"
            style={{ background: 'var(--card)', border: '1.5px dashed var(--border)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--muted)' }}
            >
              <User size={28} style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
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
              marginTop: 6, marginBottom: 20, textAlign: 'center', maxWidth: 320,
            }}>
              Todavía no hay datos del objetivo para este operativo. Cargá la información para poder visualizarla.
            </p>
            <button
              onClick={() => setShowEditModal(true)}
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
        ) : (
          <div
            className="p-6 md:p-8 rounded-[var(--radius-card)]"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            {objetivo.tipo === 'persona' && objetivo.persona ? (
              <PersonaContent
                persona={objetivo.persona}
                images={currentImages}
                onUpload={handleUpload}
                onDeleteRequest={setDeleteIdx}
                onOpenLightbox={setLightboxIdx}
              />
            ) : objetivo.tipo === 'objeto' && objetivo.objeto ? (
              <ObjetoContent
                objeto={objetivo.objeto}
                images={currentImages}
                onUpload={handleUpload}
                onDeleteRequest={setDeleteIdx}
                onOpenLightbox={setLightboxIdx}
              />
            ) : (
              <p style={{
                color: 'var(--muted-foreground)', fontSize: 'var(--text-base)',
                fontFamily: 'var(--font-family-primary)',
              }}>
                Datos del objetivo incompletos.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Edit / Create modal */}
      {showEditModal && (
        <EditModal
          objetivo={objetivo ?? null}
          onSave={handleSaveObjetivo}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && currentImages.length > 0 && (
        <Lightbox
          images={currentImages}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onPrev={lightboxPrev}
          onNext={lightboxNext}
          onDeleteRequest={idx => setDeleteIdx(idx)}
        />
      )}

      {/* Delete image confirm */}
      {deleteIdx !== null && (
        <DeleteModal
          imgSrc={currentImages[deleteIdx]}
          imgIndex={deleteIdx}
          total={currentImages.length}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteIdx(null)}
        />
      )}
    </>
  );
}
