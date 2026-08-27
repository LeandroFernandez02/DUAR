import React, { useRef } from 'react';
import {
  User, Package, CheckCircle2, ImagePlus, Expand, X as XIcon,
} from 'lucide-react';
import { TipoObjetivo } from '../../data/mockData';

/* ─────────────────────────────────────────────────
   Exported types & helpers
───────────────────────────────────────────────── */
export type PersonaForm = {
  nombre: string;
  apellido: string;
  dni: string;
  edad: string;
  sexo: string;
  nacionalidad: string;
  estatura: string;
  complexion: string;
  colorPiel: string;
  colorOjos: string;
  colorCabello: string;
  detallesAdicionales: string;
};

export type ObjetoForm = {
  nombre: string;
  tipo: string;
  descripcion: string;
  color: string;
  marca: string;
  modelo: string;
  dimensiones: string;
  detallesAdicionales: string;
};

export const emptyPersonaForm: PersonaForm = {
  nombre: '', apellido: '', dni: '', edad: '',
  sexo: '', nacionalidad: '', estatura: '', complexion: '',
  colorPiel: '', colorOjos: '', colorCabello: '',
  detallesAdicionales: '',
};

export const emptyObjetoForm: ObjetoForm = {
  nombre: '', tipo: '', descripcion: '', color: '',
  marca: '', modelo: '', dimensiones: '', detallesAdicionales: '',
};

export function buildPersonaForm(p?: {
  nombre: string; apellido?: string; dni?: string; edad?: number;
  sexo?: string; nacionalidad?: string; estatura?: string; complexion?: string;
  colorPiel?: string; colorOjos?: string; colorCabello?: string;
  detallesAdicionales?: string;
}): PersonaForm {
  return {
    nombre: p?.nombre ?? '',
    apellido: p?.apellido ?? '',
    dni: p?.dni ?? '',
    edad: p?.edad !== undefined ? String(p.edad) : '',
    sexo: p?.sexo ?? '',
    nacionalidad: p?.nacionalidad ?? '',
    estatura: p?.estatura ?? '',
    complexion: p?.complexion ?? '',
    colorPiel: p?.colorPiel ?? '',
    colorOjos: p?.colorOjos ?? '',
    colorCabello: p?.colorCabello ?? '',
    detallesAdicionales: p?.detallesAdicionales ?? '',
  };
}

export function buildObjetoForm(o?: {
  nombre: string; tipo?: string; descripcion?: string; color?: string;
  marca?: string; modelo?: string; dimensiones?: string; detallesAdicionales?: string;
}): ObjetoForm {
  return {
    nombre: o?.nombre ?? '',
    tipo: o?.tipo ?? '',
    descripcion: o?.descripcion ?? '',
    color: o?.color ?? '',
    marca: o?.marca ?? '',
    modelo: o?.modelo ?? '',
    dimensiones: o?.dimensiones ?? '',
    detallesAdicionales: o?.detallesAdicionales ?? '',
  };
}

/* ─────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────── */
const SEXO_OPTIONS = ['Masculino', 'Femenino', 'No binario', 'Sin especificar'];
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

function Inp({ value, onChange, placeholder, type = 'text', readOnly }: {
  value: string; onChange?: (v: string) => void;
  placeholder?: string; type?: string; readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      placeholder={readOnly ? undefined : placeholder}
      onChange={!readOnly ? e => onChange?.(e.target.value) : undefined}
      style={readOnly ? inputRO() : inputSt()}
      onFocus={!readOnly ? e => { e.currentTarget.style.borderColor = 'var(--primary)'; } : undefined}
      onBlur={!readOnly ? e => { e.currentTarget.style.borderColor = 'var(--border)'; } : undefined}
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
───────────────────────────────────────────────── */
function PhotoSection({
  tipo, imagenes, onImagenesChange, onLightbox, isReadOnly,
}: {
  tipo: TipoObjetivo;
  imagenes: string[];
  onImagenesChange: (imgs: string[]) => void;
  onLightbox: (src: string) => void;
  isReadOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_IMG - imagenes.length;
    if (remaining <= 0) return;
    const toRead = Array.from(files)
      .slice(0, remaining)
      .filter(f => f.type.startsWith('image/'));
    if (!toRead.length) return;

    Promise.all(
      toRead.map(f =>
        new Promise<string>(res => {
          const r = new FileReader();
          r.onload = e => res(e.target?.result as string);
          r.readAsDataURL(f);
        })
      )
    ).then(b64 => {
      onImagenesChange([...imagenes, ...b64].slice(0, MAX_IMG));
    });

    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (idx: number) => {
    onImagenesChange(imagenes.filter((_, i) => i !== idx));
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
      {imagenes.length === 0 && (
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

      {/* Grid of thumbnails */}
      {imagenes.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {imagenes.map((src, idx) => (
            <div
              key={idx}
              className="relative group rounded-[var(--radius-input)] overflow-hidden"
              style={{
                aspectRatio: '1',
                background: 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              <img
                src={src}
                alt={`Foto ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Hover overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.48)' }}
              >
                <button
                  type="button"
                  onClick={() => onLightbox(src)}
                  className="flex items-center justify-center w-7 h-7 rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <Expand size={13} />
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="flex items-center justify-center w-7 h-7 rounded-full"
                    style={{
                      background: 'rgba(229,75,75,0.7)',
                      border: '1px solid rgba(229,75,75,0.5)',
                      cursor: 'pointer',
                      color: '#fff',
                    }}
                  >
                    <XIcon size={13} />
                  </button>
                )}
              </div>
              {/* Index badge */}
              <span
                className="absolute top-1 left-1 rounded px-1"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  fontSize: '9px',
                  fontFamily: 'var(--font-family-primary)',
                  lineHeight: '16px',
                }}
              >
                {idx + 1}
              </span>
            </div>
          ))}

          {/* Add more button */}
          {!isReadOnly && imagenes.length < MAX_IMG && (
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
  /** Current array of base-64 images */
  imagenes: string[];
  /** Replace the full images array (add & remove handled internally) */
  onImagenesChange: (imgs: string[]) => void;
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
  imagenes, onImagenesChange, onLightbox,
  errors = {}, isReadOnly = false,
}: ObjetivoFormContentProps) {
  const ro = isReadOnly;

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
                onChange={v => onPersonaChange('nombre', v)}
                placeholder="Ej: Juan"
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
            <div className="col-span-2 sm:col-span-1">
              <Lbl>Apellido</Lbl>
              <Inp
                value={personaForm.apellido}
                onChange={v => onPersonaChange('apellido', v)}
                placeholder="Ej: García"
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>DNI / Documento</Lbl>
              <Inp
                value={personaForm.dni}
                onChange={v => onPersonaChange('dni', v)}
                placeholder="Ej: 35123456"
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>Edad</Lbl>
              <Inp
                value={personaForm.edad}
                onChange={v => onPersonaChange('edad', v)}
                placeholder="Ej: 34"
                type="number"
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>Sexo</Lbl>
              <Sel
                value={personaForm.sexo}
                onChange={v => onPersonaChange('sexo', v)}
                options={SEXO_OPTIONS.map(s => ({ value: s, label: s }))}
                placeholder="Seleccionar..."
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>Nacionalidad</Lbl>
              <Inp
                value={personaForm.nacionalidad}
                onChange={v => onPersonaChange('nacionalidad', v)}
                placeholder="Ej: Argentina"
                readOnly={ro}
              />
            </div>
          </div>

          <SecTitle>Características Físicas</SecTitle>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Lbl>Estatura</Lbl>
              <Inp
                value={personaForm.estatura}
                onChange={v => onPersonaChange('estatura', v)}
                placeholder="Ej: 1.72 m"
                readOnly={ro}
              />
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
              <Lbl>Detalles adicionales</Lbl>
              <Tex
                value={personaForm.detallesAdicionales}
                onChange={v => onPersonaChange('detallesAdicionales', v)}
                placeholder="Vestimenta, rasgos particulares, tatuajes, cicatrices, objetos que portaba, etc."
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
                onChange={v => onObjetoChange('nombre', v)}
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
                onChange={v => onObjetoChange('color', v)}
                placeholder="Ej: Rojo oscuro"
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>Marca</Lbl>
              <Inp
                value={objetoForm.marca}
                onChange={v => onObjetoChange('marca', v)}
                placeholder="Ej: Toyota"
                readOnly={ro}
              />
            </div>
            <div>
              <Lbl>Modelo</Lbl>
              <Inp
                value={objetoForm.modelo}
                onChange={v => onObjetoChange('modelo', v)}
                placeholder="Ej: Hilux 2019"
                readOnly={ro}
              />
            </div>
            <div className="col-span-2">
              <Lbl>Dimensiones / Medidas</Lbl>
              <Inp
                value={objetoForm.dimensiones}
                onChange={v => onObjetoChange('dimensiones', v)}
                placeholder="Ej: 30 x 20 x 15 cm"
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
                onChange={v => onObjetoChange('detallesAdicionales', v)}
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
          imagenes={imagenes}
          onImagenesChange={onImagenesChange}
          onLightbox={onLightbox}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}
