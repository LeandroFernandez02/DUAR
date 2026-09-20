import React, { useEffect, useMemo, useRef } from 'react';
import {
  User, Package, CheckCircle2, ImagePlus, Expand, X as XIcon,
} from 'lucide-react';
import { TipoObjetivo } from '../../data/mockData';
import { listarPaises } from '../../services/geoService';
import { soloDigitos, formatearDni, validarNombre, validarApellido, validarDni } from '../../utils/validacionUsuario';

/* ─────────────────────────────────────────────────
   Validación compartida (modal de alta/edición y modal de acceso rápido).
   Mismas reglas que el resto de los formularios de personas; el DNI, la edad
   y la estatura son opcionales (a veces no se conocen) — sólo se validan si
   se cargaron. Espejo de server/src/controllers/objetivo.controller.js.
───────────────────────────────────────────────── */
export function validarObjetivoForm(
  tipo: TipoObjetivo | '',
  p: PersonaForm,
  o: ObjetoForm,
): Record<string, string> {
  const e: Record<string, string> = {};
  if (tipo === 'persona') {
    const eNombre = validarNombre(p.nombre); if (eNombre) e.nombre = eNombre;
    if (p.apellido.trim()) { const eAp = validarApellido(p.apellido); if (eAp) e.apellido = eAp; }
    if (p.dni) { const eDni = validarDni(p.dni); if (eDni) e.dni = eDni; }
    if (p.edad && (Number(p.edad) < 0 || Number(p.edad) > 120)) e.edad = 'La edad debe estar entre 0 y 120 años.';
    if (p.estatura && (Number(p.estatura) < 30 || Number(p.estatura) > 250)) e.estatura = 'La estatura debe estar entre 30 y 250 cm.';
  } else if (tipo === 'objeto') {
    if (!o.nombre.trim()) e.nombre = 'El nombre / descripción es obligatorio.';
  } else {
    e.tipo = 'Seleccioná un tipo de objetivo.';
  }
  return e;
}

/* ─────────────────────────────────────────────────
   Exported types & helpers
───────────────────────────────────────────────── */
export type PersonaForm = {
  nombre: string;
  apellido: string;
  dni: string;
  edad: string;
  sexo: string; // valor del enum real: MASCULINO/FEMENINO/OTRO
  nacionalidad: string;
  estatura: string; // centímetros
  complexion: string;
  colorPiel: string;
  colorOjos: string;
  colorCabello: string;
  vestimenta: string;
  detallesAdicionales: string;
};

export type ObjetoForm = {
  nombre: string;
  tipo: string;
  color: string;
  marca: string;
  modelo: string;
  dimensionAlto: string;  // centímetros
  dimensionAncho: string; // centímetros
  dimensionLargo: string; // centímetros
  detallesAdicionales: string;
};

export const emptyPersonaForm: PersonaForm = {
  nombre: '', apellido: '', dni: '', edad: '',
  sexo: '', nacionalidad: '', estatura: '', complexion: '',
  colorPiel: '', colorOjos: '', colorCabello: '', vestimenta: '',
  detallesAdicionales: '',
};

export const emptyObjetoForm: ObjetoForm = {
  nombre: '', tipo: '', color: '', marca: '', modelo: '',
  dimensionAlto: '', dimensionAncho: '', dimensionLargo: '', detallesAdicionales: '',
};

export function buildPersonaForm(p?: {
  nombre?: string | null; apellido?: string | null; dni?: string | null; edad?: number | null;
  genero?: string | null; nacionalidad?: string | null; estatura?: number | null;
  complexionFisica?: string | null; colorPiel?: string | null; colorOjos?: string | null;
  colorPelo?: string | null; vestimenta?: string | null; detallesAdicionales?: string | null;
}): PersonaForm {
  return {
    nombre: p?.nombre ?? '',
    apellido: p?.apellido ?? '',
    dni: soloDigitos(p?.dni ?? ''),
    edad: p?.edad != null ? String(p.edad) : '',
    sexo: p?.genero ?? '',
    nacionalidad: p?.nacionalidad ?? '',
    estatura: p?.estatura != null ? String(p.estatura) : '',
    complexion: p?.complexionFisica ?? '',
    colorPiel: p?.colorPiel ?? '',
    colorOjos: p?.colorOjos ?? '',
    colorCabello: p?.colorPelo ?? '',
    vestimenta: p?.vestimenta ?? '',
    detallesAdicionales: p?.detallesAdicionales ?? '',
  };
}

export function buildObjetoForm(o?: {
  nombre?: string | null; tipoObjeto?: string | null; color?: string | null;
  marca?: string | null; modelo?: string | null;
  dimensionAlto?: number | null; dimensionAncho?: number | null; dimensionLargo?: number | null;
  detallesAdicionales?: string | null;
}): ObjetoForm {
  return {
    nombre: o?.nombre ?? '',
    tipo: o?.tipoObjeto ?? '',
    color: o?.color ?? '',
    marca: o?.marca ?? '',
    modelo: o?.modelo ?? '',
    dimensionAlto: o?.dimensionAlto != null ? String(o.dimensionAlto) : '',
    dimensionAncho: o?.dimensionAncho != null ? String(o.dimensionAncho) : '',
    dimensionLargo: o?.dimensionLargo != null ? String(o.dimensionLargo) : '',
    detallesAdicionales: o?.detallesAdicionales ?? '',
  };
}

/* ─────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────── */
// Valores reales del enum `genero` (MASCULINO/FEMENINO/OTRO) — se guardan
// directo, sin capa de conversión (es un campo nuevo, no hay legado que
// respetar como en EstadoOperativoAgente).
const SEXO_OPTIONS = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMENINO', label: 'Femenino' },
  { value: 'OTRO', label: 'Otro' },
];
const COMPLEXION_OPTIONS = ['Delgada', 'Normal', 'Robusta', 'Obesa'];
const COLOR_PIEL_OPTIONS = ['Blanca', 'Morena', 'Trigueña', 'Negra', 'Amarilla', 'Otra'];
const COLOR_OJOS_OPTIONS = ['Negros', 'Marrones', 'Verdes', 'Azules', 'Grises', 'Miel'];
const COLOR_CABELLO_OPTIONS = ['Negro', 'Castaño', 'Rubio', 'Pelirrojo', 'Gris', 'Blanco', 'Sin cabello'];

const OBJETO_TIPOS = [
  { value: 'vehiculo',    label: 'Vehículo' },
  { value: 'embarcacion', label: 'Embarcación' },
  { value: 'aeronave',    label: 'Aeronave' },
  { value: 'paquete',     label: 'Paquete / Encomienda' },
  { value: 'equipaje',    label: 'Equipaje / Mochila' },
  { value: 'arma',        label: 'Arma' },
  { value: 'animal',      label: 'Animal' },
  { value: 'documento',   label: 'Documento' },
  { value: 'otro',        label: 'Otro' },
];

const MAX_IMG = 8;

/* ─────────────────────────────────────────────────
   Style helpers
───────────────────────────────────────────────── */
const inputSt = (): React.CSSProperties => ({
  width: '100%',
  padding: '8px 11px',
  borderRadius: 'var(--radius-input)',
  border: '1px solid var(--border)',
  background: 'var(--background)',
  color: 'var(--foreground)',
  fontSize: 'var(--text-base)',
  fontFamily: 'var(--font-family-primary)',
  outline: 'none',
  boxSizing: 'border-box' as const,
});

const inputRO = (): React.CSSProperties => ({
  width: '100%',
  padding: '8px 11px',
  borderRadius: 'var(--radius-input)',
  border: '1px solid var(--border)',
  background: 'var(--muted)',
  color: 'var(--muted-foreground)',
  fontSize: 'var(--text-base)',
  fontFamily: 'var(--font-family-primary)',
  outline: 'none',
  boxSizing: 'border-box' as const,
  cursor: 'default',
  opacity: 0.8,
});

/* ─────────────────────────────────────────────────
   Micro sub-components (internal)
───────────────────────────────────────────────── */
function Lbl({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{
      display: 'block',
      color: 'var(--muted-foreground)',
      fontSize: 'var(--text-label)',
      fontWeight: 'var(--font-weight-semibold)',
      fontFamily: 'var(--font-family-primary)',
      marginBottom: 5,
      letterSpacing: '0.03em',
    }}>
      {children}
      {required && <span style={{ color: 'var(--primary)', marginLeft: 3 }}>*</span>}
    </label>
  );
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: 'var(--primary)',
      fontSize: 'var(--text-label)',
      fontWeight: 'var(--font-weight-semibold)',
      fontFamily: 'var(--font-family-primary)',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      paddingBottom: 8,
      borderBottom: '1px solid var(--border)',
      marginBottom: 12,
      marginTop: 18,
    }}>
      {children}
    </p>
  );
}

function ErrMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p style={{
      color: 'var(--primary)', fontSize: '11px',
      fontFamily: 'var(--font-family-primary)', marginTop: 3,
    }}>
      {msg}
    </p>
  );
}

function Inp({ value, onChange, placeholder, type = 'text', readOnly, maxLength, inputMode, hasError }: {
  value: string; onChange?: (v: string) => void;
  placeholder?: string; type?: string; readOnly?: boolean;
  maxLength?: number; inputMode?: 'numeric' | 'text'; hasError?: boolean;
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      maxLength={maxLength}
      value={value}
      readOnly={readOnly}
      placeholder={readOnly ? undefined : placeholder}
      onChange={!readOnly ? e => onChange?.(e.target.value) : undefined}
      style={readOnly ? inputRO() : { ...inputSt(), ...(hasError ? { borderColor: 'var(--primary)' } : {}) }}
      onFocus={!readOnly ? e => { e.currentTarget.style.borderColor = 'var(--primary)'; } : undefined}
      onBlur={!readOnly ? e => { e.currentTarget.style.borderColor = hasError ? 'var(--primary)' : 'var(--border)'; } : undefined}
    />
  );
}

function Sel({ value, onChange, options, placeholder, readOnly }: {
  value: string; onChange?: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string; readOnly?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={readOnly}
      onChange={!readOnly ? e => onChange?.(e.target.value) : undefined}
      style={readOnly ? inputRO() : { ...inputSt(), cursor: 'pointer' }}
      onFocus={!readOnly ? e => { e.currentTarget.style.borderColor = 'var(--primary)'; } : undefined}
      onBlur={!readOnly ? e => { e.currentTarget.style.borderColor = 'var(--border)'; } : undefined}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Tex({ value, onChange, placeholder, rows = 3, readOnly }: {
  value: string; onChange?: (v: string) => void;
  placeholder?: string; rows?: number; readOnly?: boolean;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      readOnly={readOnly}
      placeholder={readOnly ? undefined : placeholder}
      onChange={!readOnly ? e => onChange?.(e.target.value) : undefined}
      style={{ ...(readOnly ? inputRO() : inputSt()), resize: 'vertical' as const }}
      onFocus={!readOnly ? e => { e.currentTarget.style.borderColor = 'var(--primary)'; } : undefined}
      onBlur={!readOnly ? e => { e.currentTarget.style.borderColor = 'var(--border)'; } : undefined}
    />
  );
}

/* ─────────────────────────────────────────────────
   Photo Upload Section (self-contained ref)
   Trabaja con archivos reales — nada de base64: las fotos existentes ya
   vienen con una URL firmada de Supabase Storage (expira, se regenera en
   cada carga de la ficha); las nuevas son `File[]` sin subir todavía, con
   una preview local (`URL.createObjectURL`) que se libera al desmontar o
   reemplazar la lista, para no acumular blobs en memoria.
───────────────────────────────────────────────── */
export interface FotoExistente { id: string; url: string | null; }

function PhotoSection({
  tipo, fotosExistentes, fotosNuevas, onAgregarArchivos, onQuitarNueva,
  onEliminarExistente, onLightbox, isReadOnly,
}: {
  tipo: TipoObjetivo;
  fotosExistentes: FotoExistente[];
  fotosNuevas: File[];
  onAgregarArchivos: (files: FileList | null) => void;
  onQuitarNueva: (idx: number) => void;
  onEliminarExistente: (fotoId: string) => void;
  onLightbox: (src: string) => void;
  isReadOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const total = fotosExistentes.length + fotosNuevas.length;

  const previewsNuevas = useMemo(
    () => fotosNuevas.map(f => URL.createObjectURL(f)),
    [fotosNuevas]
  );
  useEffect(() => () => { previewsNuevas.forEach(URL.revokeObjectURL); }, [previewsNuevas]);

  const processFiles = (files: FileList | null) => {
    const remaining = MAX_IMG - total;
    if (remaining <= 0 || !files) return;
    onAgregarArchivos(files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const label =
    tipo === 'persona' ? 'Fotografías de la persona' : 'Fotografías del objeto';

  return (
    <div>
      <SecTitle>{label}</SecTitle>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => processFiles(e.target.files)}
      />

      {/* Empty state */}
      {total === 0 && (
        !isReadOnly ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
            }}
            onDragLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            }}
            onDrop={e => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              processFiles(e.dataTransfer.files);
            }}
            className="w-full flex flex-col items-center gap-2 py-8 rounded-[var(--radius-input)] transition-all"
            style={{
              background: 'var(--muted)',
              border: '1.5px dashed var(--border)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            }}
          >
            <div
              className="flex items-center justify-center w-10 h-10 rounded-full"
              style={{ background: 'rgba(229,75,75,0.08)' }}
            >
              <ImagePlus size={18} style={{ color: 'var(--primary)' }} />
            </div>
            <div className="text-center">
              <p style={{
                color: 'var(--foreground)',
                fontSize: 'var(--text-label)',
                fontWeight: 'var(--font-weight-semibold)',
                fontFamily: 'var(--font-family-primary)',
              }}>
                Seleccionar fotos
              </p>
              <p style={{
                color: 'var(--muted-foreground)',
                fontSize: '11px',
                fontFamily: 'var(--font-family-primary)',
                marginTop: 2,
              }}>
                PNG, JPG, WEBP · máx. {MAX_IMG} imágenes · arrastrá o hacé clic
              </p>
            </div>
          </button>
        ) : (
          <div
            className="flex flex-col items-center gap-2 py-6 rounded-[var(--radius-input)]"
            style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            <ImagePlus size={20} style={{ color: 'var(--muted-foreground)', opacity: 0.45 }} />
            <p style={{
              color: 'var(--muted-foreground)',
              fontSize: 'var(--text-label)',
              fontFamily: 'var(--font-family-primary)',
            }}>
              Sin fotografías cargadas
            </p>
          </div>
        )
      )}

      {/* Grid of thumbnails: existentes (con URL firmada) + nuevas (preview local) */}
      {total > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {fotosExistentes.map((foto, idx) => (
            <div
              key={foto.id}
              className="relative group rounded-[var(--radius-input)] overflow-hidden"
              style={{
                aspectRatio: '1',
                background: 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {foto.url
                ? <img src={foto.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ImagePlus size={16} style={{ color: 'var(--muted-foreground)' }} /></div>
              }
              <div
                className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.48)' }}
              >
                {foto.url && (
                  <button
                    type="button"
                    onClick={() => onLightbox(foto.url!)}
                    className="flex items-center justify-center w-7 h-7 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', color: '#fff' }}
                  >
                    <Expand size={13} />
                  </button>
                )}
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => onEliminarExistente(foto.id)}
                    className="flex items-center justify-center w-7 h-7 rounded-full"
                    style={{ background: 'rgba(229,75,75,0.7)', border: '1px solid rgba(229,75,75,0.5)', cursor: 'pointer', color: '#fff' }}
                  >
                    <XIcon size={13} />
                  </button>
                )}
              </div>
              <span
                className="absolute top-1 left-1 rounded px-1"
                style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '9px', fontFamily: 'var(--font-family-primary)', lineHeight: '16px' }}
              >
                {idx + 1}
              </span>
            </div>
          ))}

          {fotosNuevas.map((_, idx) => (
            <div
              key={`nueva-${idx}`}
              className="relative group rounded-[var(--radius-input)] overflow-hidden"
              style={{
                aspectRatio: '1',
                background: 'var(--muted)',
                border: '1.5px dashed var(--primary)',
              }}
            >
              <img src={previewsNuevas[idx]} alt={`Foto nueva ${idx + 1}`} className="w-full h-full object-cover" />
              <div
                className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.48)' }}
              >
                <button
                  type="button"
                  onClick={() => onLightbox(previewsNuevas[idx])}
                  className="flex items-center justify-center w-7 h-7 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', color: '#fff' }}
                >
                  <Expand size={13} />
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => onQuitarNueva(idx)}
                    className="flex items-center justify-center w-7 h-7 rounded-full"
                    style={{ background: 'rgba(229,75,75,0.7)', border: '1px solid rgba(229,75,75,0.5)', cursor: 'pointer', color: '#fff' }}
                  >
                    <XIcon size={13} />
                  </button>
                )}
              </div>
              <span
                className="absolute top-1 left-1 rounded px-1.5 py-0.5"
                style={{ background: 'var(--primary)', color: '#fff', fontSize: '8px', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)', lineHeight: 1 }}
              >
                Nueva
              </span>
            </div>
          ))}

          {/* Add more button */}
          {!isReadOnly && total < MAX_IMG && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 rounded-[var(--radius-input)] transition-all"
              style={{
                aspectRatio: '1',
                background: 'var(--muted)',
                border: '1.5px dashed var(--border)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              }}
            >
              <ImagePlus size={16} style={{ color: 'var(--muted-foreground)' }} />
              <span style={{
                color: 'var(--muted-foreground)',
                fontSize: '9px',
                fontFamily: 'var(--font-family-primary)',
              }}>
                Agregar
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Main component props
───────────────────────────────────────────────── */
export interface ObjetivoFormContentProps {
  tipo: TipoObjetivo | '';
  onTipoChange: (t: TipoObjetivo) => void;
  /** When true, shows a locked type badge instead of the card selector */
  lockTipo?: boolean;
  personaForm: PersonaForm;
  onPersonaChange: (key: keyof PersonaForm, value: string) => void;
  objetoForm: ObjetoForm;
  onObjetoChange: (key: keyof ObjetoForm, value: string) => void;
  /** Fotos ya subidas a Storage (URL firmada) y fotos nuevas sin subir todavía. */
  fotosExistentes: FotoExistente[];
  fotosNuevas: File[];
  onAgregarArchivos: (files: FileList | null) => void;
  onQuitarNueva: (idx: number) => void;
  /** Borra una foto YA subida — el llamador decide si es inmediato (PUT/DELETE) o diferido. */
  onEliminarExistente: (fotoId: string) => void;
  onLightbox: (src: string) => void;
  errors?: Record<string, string>;
  isReadOnly?: boolean;
}

/* ─────────────────────────────────────────────────
   ObjetivoFormContent
───────────────────────────────────────────────── */
export function ObjetivoFormContent({
  tipo, onTipoChange, lockTipo = false,
  personaForm, onPersonaChange,
  objetoForm, onObjetoChange,
  fotosExistentes, fotosNuevas, onAgregarArchivos, onQuitarNueva, onEliminarExistente, onLightbox,
  errors = {}, isReadOnly = false,
}: ObjetivoFormContentProps) {
  const ro = isReadOnly;

  // Un valor guardado antes de que la nacionalidad fuera una lista (texto
  // libre) se conserva como opción, para no perderlo al abrir la ficha.
  const paisOptions = useMemo(() => {
    const paises = listarPaises();
    const actual = personaForm.nacionalidad;
    const lista = actual && !paises.includes(actual) ? [actual, ...paises] : paises;
    return lista.map(p => ({ value: p, label: p }));
  }, [personaForm.nacionalidad]);

  return (
    <div className="flex flex-col" style={{ gap: 4 }}>

      {/* ── TYPE SELECTOR ── */}
      {!lockTipo ? (
        <div>
          <Lbl>Tipo de objetivo <span style={{ color: 'var(--primary)' }}>*</span></Lbl>
          <div className="grid grid-cols-2 gap-3 mb-1">
            {(['persona', 'objeto'] as TipoObjetivo[]).map(t => (
              <button
                key={t}
                type="button"
                disabled={ro}
                onClick={() => !ro && onTipoChange(t)}
                className="flex items-center gap-3 p-4 rounded-[var(--radius-input)] text-left transition-all"
                style={{
                  border: `2px solid ${tipo === t ? 'var(--primary)' : 'var(--border)'}`,
                  background: tipo === t ? 'rgba(229,75,75,0.06)' : 'var(--muted)',
                  cursor: ro ? 'default' : 'pointer',
                  opacity: ro ? 0.75 : 1,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      tipo === t
                        ? t === 'persona'
                          ? 'rgba(229,75,75,0.15)'
                          : 'rgba(255,169,135,0.2)'
                        : 'var(--background)',
                  }}
                >
                  {t === 'persona' ? (
                    <User
                      size={18}
                      style={{ color: tipo === t ? 'var(--primary)' : 'var(--muted-foreground)' }}
                    />
                  ) : (
                    <Package
                      size={18}
                      style={{ color: tipo === t ? 'var(--accent)' : 'var(--muted-foreground)' }}
                    />
                  )}
                </div>
                <div>
                  <p style={{
                    color: tipo === t ? 'var(--foreground)' : 'var(--muted-foreground)',
                    fontSize: 'var(--text-base)',
                    fontWeight: tipo === t ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
                    fontFamily: 'var(--font-family-primary)',
                  }}>
                    {t === 'persona' ? 'Persona' : 'Objeto'}
                  </p>
                  <p style={{
                    color: 'var(--muted-foreground)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-family-primary)',
                  }}>
                    {t === 'persona' ? 'Persona desaparecida' : 'Bien, vehículo, etc.'}
                  </p>
                </div>
                {tipo === t && (
                  <CheckCircle2
                    size={16}
                    style={{ color: 'var(--primary)', marginLeft: 'auto', flexShrink: 0 }}
                  />
                )}
              </button>
            ))}
          </div>
          {!tipo && (
            <p style={{
              color: 'var(--muted-foreground)',
              fontSize: 'var(--text-label)',
              fontFamily: 'var(--font-family-primary)',
            }}>
              Seleccioná si el operativo busca una persona o un objeto para completar el formulario correspondiente.
            </p>
          )}
        </div>
      ) : (
        /* ── Locked type badge (edit mode) ── */
        <div
          className="flex items-center gap-2 p-3 rounded-[var(--radius-input)] mb-1"
          style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          {tipo === 'persona'
            ? <User size={14} style={{ color: 'var(--primary)' }} />
            : <Package size={14} style={{ color: 'var(--accent)' }} />
          }
          <span style={{
            color: 'var(--muted-foreground)',
            fontSize: 'var(--text-label)',
            fontFamily: 'var(--font-family-primary)',
          }}>
            Tipo de objetivo:&nbsp;
            <strong style={{
              color: 'var(--foreground)',
              fontWeight: 'var(--font-weight-semibold)',
            }}>
              {tipo === 'persona' ? 'Persona buscada' : 'Objeto buscado'}
            </strong>
          </span>
        </div>
      )}

      {/* ══════════════════════════════════
          PERSONA FIELDS
      ══════════════════════════════════ */}
      {tipo === 'persona' && (
        <>
          <SecTitle>Datos Filiatorios</SecTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Lbl required>Nombre</Lbl>
              <Inp
                value={personaForm.nombre}
                onChange={v => onPersonaChange('nombre', v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ ]/g, '').slice(0, 35))}
                placeholder="Ej: Juan"
                maxLength={35}
                hasError={!!errors.nombre}
                readOnly={ro}
              />
              <ErrMsg msg={errors.nombre} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Lbl>Apellido</Lbl>
              <Inp
                value={personaForm.apellido}
                onChange={v => onPersonaChange('apellido', v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'\- ]/g, '').slice(0, 35))}
                placeholder="Ej: García"
                maxLength={35}
                hasError={!!errors.apellido}
                readOnly={ro}
              />
              <ErrMsg msg={errors.apellido} />
            </div>
            <div>
              <Lbl>DNI / Documento</Lbl>
              <Inp
                value={formatearDni(personaForm.dni)}
                onChange={v => onPersonaChange('dni', soloDigitos(v).slice(0, 8))}
                placeholder="Ej: 35.123.456"
                inputMode="numeric"
                hasError={!!errors.dni}
                readOnly={ro}
              />
              <ErrMsg msg={errors.dni} />
            </div>
            <div>
              <Lbl>Edad</Lbl>
              <Inp
                value={personaForm.edad}
                onChange={v => onPersonaChange('edad', soloDigitos(v).slice(0, 3))}
                placeholder="Ej: 34"
                inputMode="numeric"
                hasError={!!errors.edad}
                readOnly={ro}
              />
              <ErrMsg msg={errors.edad} />
            </div>
            <div>
              <Lbl>Sexo</Lbl>
              <Sel
                value={personaForm.sexo}
                onChange={v => onPersonaChange('sexo', v)}
                options={SEXO_OPTIONS}
                placeholder="Seleccionar..."
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>Nacionalidad</Lbl>
              <Sel
                value={personaForm.nacionalidad}
                onChange={v => onPersonaChange('nacionalidad', v)}
                options={paisOptions}
                placeholder="Seleccionar..."
                readOnly={ro}
              />
            </div>
          </div>

          <SecTitle>Características Físicas</SecTitle>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Lbl>Estatura (cm)</Lbl>
              <Inp
                value={personaForm.estatura}
                onChange={v => onPersonaChange('estatura', soloDigitos(v).slice(0, 3))}
                placeholder="Ej: 172"
                inputMode="numeric"
                hasError={!!errors.estatura}
                readOnly={ro}
              />
              <ErrMsg msg={errors.estatura} />
            </div>
            <div>
              <Lbl>Complexión</Lbl>
              <Sel
                value={personaForm.complexion}
                onChange={v => onPersonaChange('complexion', v)}
                options={COMPLEXION_OPTIONS.map(s => ({ value: s, label: s }))}
                placeholder="Seleccionar..."
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>Color de piel</Lbl>
              <Sel
                value={personaForm.colorPiel}
                onChange={v => onPersonaChange('colorPiel', v)}
                options={COLOR_PIEL_OPTIONS.map(s => ({ value: s, label: s }))}
                placeholder="Seleccionar..."
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>Color de ojos</Lbl>
              <Sel
                value={personaForm.colorOjos}
                onChange={v => onPersonaChange('colorOjos', v)}
                options={COLOR_OJOS_OPTIONS.map(s => ({ value: s, label: s }))}
                placeholder="Seleccionar..."
                readOnly={ro}
              />
            </div>
            <div className="col-span-2">
              <Lbl>Color de cabello</Lbl>
              <Sel
                value={personaForm.colorCabello}
                onChange={v => onPersonaChange('colorCabello', v)}
                options={COLOR_CABELLO_OPTIONS.map(s => ({ value: s, label: s }))}
                placeholder="Seleccionar..."
                readOnly={ro}
              />
            </div>
          </div>

          <SecTitle>Detalles Adicionales</SecTitle>
          <div className="flex flex-col gap-3">
            <div>
              <Lbl>Vestimenta</Lbl>
              <Tex
                value={personaForm.vestimenta}
                onChange={v => onPersonaChange('vestimenta', v.slice(0, 500))}
                placeholder="Ropa que llevaba puesta al momento de la desaparición"
                rows={2}
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>Detalles adicionales</Lbl>
              <Tex
                value={personaForm.detallesAdicionales}
                onChange={v => onPersonaChange('detallesAdicionales', v.slice(0, 1000))}
                placeholder="Rasgos particulares, tatuajes, cicatrices, objetos que portaba, etc."
                rows={4}
                readOnly={ro}
              />
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════
          OBJETO FIELDS
      ══════════════════════════════════ */}
      {tipo === 'objeto' && (
        <>
          <SecTitle>Identificación</SecTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Lbl required>Nombre / Descripción</Lbl>
              <Inp
                value={objetoForm.nombre}
                onChange={v => onObjetoChange('nombre', v.slice(0, 100))}
                placeholder="Ej: Mochila negra North Face"
                readOnly={ro}
              />
              {errors.nombre && (
                <p style={{
                  color: 'var(--primary)', fontSize: '11px',
                  fontFamily: 'var(--font-family-primary)', marginTop: 3,
                }}>
                  {errors.nombre}
                </p>
              )}
            </div>
            <div>
              <Lbl>Tipo</Lbl>
              <Sel
                value={objetoForm.tipo}
                onChange={v => onObjetoChange('tipo', v)}
                options={OBJETO_TIPOS}
                placeholder="Seleccionar..."
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>Color</Lbl>
              <Inp
                value={objetoForm.color}
                onChange={v => onObjetoChange('color', v.slice(0, 100))}
                placeholder="Ej: Rojo oscuro"
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>Marca</Lbl>
              <Inp
                value={objetoForm.marca}
                onChange={v => onObjetoChange('marca', v.slice(0, 100))}
                placeholder="Ej: Toyota"
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>Modelo</Lbl>
              <Inp
                value={objetoForm.modelo}
                onChange={v => onObjetoChange('modelo', v.slice(0, 100))}
                placeholder="Ej: Hilux 2019"
                readOnly={ro}
              />
            </div>
          </div>

          <SecTitle>Dimensiones (cm)</SecTitle>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Lbl>Alto</Lbl>
              <Inp
                value={objetoForm.dimensionAlto}
                onChange={v => onObjetoChange('dimensionAlto', soloDigitos(v).slice(0, 4))}
                placeholder="Ej: 40"
                inputMode="numeric"
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>Ancho</Lbl>
              <Inp
                value={objetoForm.dimensionAncho}
                onChange={v => onObjetoChange('dimensionAncho', soloDigitos(v).slice(0, 4))}
                placeholder="Ej: 30"
                inputMode="numeric"
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>Largo</Lbl>
              <Inp
                value={objetoForm.dimensionLargo}
                onChange={v => onObjetoChange('dimensionLargo', soloDigitos(v).slice(0, 4))}
                placeholder="Ej: 20"
                inputMode="numeric"
                readOnly={ro}
              />
            </div>
          </div>

          <SecTitle>Detalles adicionales</SecTitle>
          <div className="flex flex-col gap-3">
            <div>
              <Lbl>Detalles adicionales</Lbl>
              <Tex
                value={objetoForm.detallesAdicionales}
                onChange={v => onObjetoChange('detallesAdicionales', v.slice(0, 1000))}
                placeholder="Describí el objeto: daños, inscripciones, modificaciones, elementos identificatorios, etc."
                rows={4}
                readOnly={ro}
              />
            </div>
          </div>
        </>
      )}

      {/* ── PHOTOS (shown when a tipo is selected) ── */}
      {(tipo === 'persona' || tipo === 'objeto') && (
        <PhotoSection
          tipo={tipo}
          fotosExistentes={fotosExistentes}
          fotosNuevas={fotosNuevas}
          onAgregarArchivos={onAgregarArchivos}
          onQuitarNueva={onQuitarNueva}
          onEliminarExistente={onEliminarExistente}
          onLightbox={onLightbox}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}
