import { RefObject } from 'react';
import { ImagePlus, Expand, X } from 'lucide-react';

interface PhotoUploadSectionProps {
  label: string;
  imagenes: string[];
  isReadOnly: boolean;
  onAdd: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  onLightbox: (src: string) => void;
  inputRef: RefObject<HTMLInputElement>;
  max?: number;
}

export function PhotoUploadSection({
  label,
  imagenes,
  isReadOnly,
  onAdd,
  onRemove,
  onLightbox,
  inputRef,
  max = 8,
}: PhotoUploadSectionProps) {
  const remaining = max - imagenes.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <p
          style={{
            color: 'var(--muted-foreground)',
            fontSize: '11px',
            fontWeight: 'var(--font-weight-semibold)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'var(--font-family-primary)',
          }}
        >
          {label}
        </p>
        {imagenes.length > 0 && (
          <span style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
            {imagenes.length} / {max}
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => onAdd(e.target.files)}
      />

      {/* Drop zone — only when editable and slots remain */}
      {!isReadOnly && remaining > 0 && imagenes.length === 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.04)';
          }}
          onDragLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLElement).style.background = 'var(--muted)';
          }}
          onDrop={e => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLElement).style.background = 'var(--muted)';
            onAdd(e.dataTransfer.files);
          }}
          className="w-full flex flex-col items-center gap-2 py-5 rounded-[var(--radius-input)] transition-all"
          style={{
            background: 'var(--muted)',
            border: '1.5px dashed var(--border)',
            cursor: 'pointer',
          }}
        >
          <div
            className="flex items-center justify-center w-9 h-9 rounded-full"
            style={{ background: 'rgba(229,75,75,0.08)' }}
          >
            <ImagePlus size={17} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="text-center">
            <p style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)' }}>
              Seleccionar fotos
            </p>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)', marginTop: 2 }}>
              PNG, JPG, WEBP · máx. {max} imágenes · arrastrá o hacé click
            </p>
          </div>
        </button>
      )}

      {/* Thumbnails grid */}
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
                style={{ background: 'rgba(0,0,0,0.45)' }}
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
                    onClick={() => onRemove(idx)}
                    className="flex items-center justify-center w-7 h-7 rounded-full"
                    style={{
                      background: 'rgba(229,75,75,0.7)',
                      border: '1px solid rgba(229,75,75,0.5)',
                      cursor: 'pointer',
                      color: '#fff',
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {/* Photo number badge */}
              <span
                className="absolute top-1 left-1 w-4 h-4 flex items-center justify-center rounded-full"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  fontSize: '9px',
                  fontFamily: 'var(--font-family-primary)',
                  fontWeight: 'var(--font-weight-semibold)',
                  lineHeight: 1,
                }}
              >
                {idx + 1}
              </span>
            </div>
          ))}

          {/* Add more tile */}
          {!isReadOnly && remaining > 0 && (
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
                (e.currentTarget as HTMLElement).style.background = 'rgba(229,75,75,0.04)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.background = 'var(--muted)';
              }}
            >
              <ImagePlus size={16} style={{ color: 'var(--muted-foreground)' }} />
              <span style={{ color: 'var(--muted-foreground)', fontSize: '9px', fontFamily: 'var(--font-family-primary)' }}>
                Agregar
              </span>
            </button>
          )}
        </div>
      )}

      {/* Read-only empty state */}
      {isReadOnly && imagenes.length === 0 && (
        <div
          className="flex flex-col items-center gap-2 py-5 rounded-[var(--radius-input)]"
          style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <ImagePlus size={20} style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} />
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
            Sin fotografías cargadas
          </p>
        </div>
      )}
    </div>
  );
}
