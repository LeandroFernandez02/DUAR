/**
 * PuntoDetailPanel — Panel deslizable de detalle de un Punto de Interés.
 * Permite ver/editar descripción detallada y gestionar fotos de pistas.
 * Las imágenes se comprimen en canvas antes de almacenarse como base64.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Camera, Trash2, ChevronLeft, ChevronRight,
  Crosshair, Flag, MapPin, AlertTriangle, ImageOff,
  Loader2, Save, ZoomIn,
} from 'lucide-react';
import { PuntoInteres } from '../../data/mockData';

/* ─── Marker config (mirrors Mapa.tsx) ───────────────────────────────────── */
const MARKER_CFG = {
  puntoCero:     { color: '#E54B4B', label: 'Punto Cero',        bg: '#fee2e2', icon: <Crosshair size={13} /> },
  puestoComando: { color: '#2563eb', label: 'Puesto de Comando', bg: '#dbeafe', icon: <Flag size={13} /> },
  poi:           { color: '#ca8a04', label: 'Punto de Interés',  bg: '#fef9c3', icon: <MapPin size={13} /> },
  hallazgo:      { color: '#16a34a', label: 'Hallazgo',          bg: '#dcfce7', icon: <AlertTriangle size={13} /> },
} as const;

/* ─── Image compression ──────────────────────────────────────────────────── */
async function compressImage(file: File, maxPx = 1400, quality = 0.80): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale  = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w      = Math.round(img.width  * scale);
      const h      = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
    img.src = url;
  });
}

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props {
  punto: PuntoInteres;
  onClose: () => void;
  onSave:  (updates: Partial<PuntoInteres>) => void;
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export function PuntoDetailPanel({ punto, onClose, onSave }: Props) {
  const [descripcion,         setDescripcion]         = useState(punto.descripcion         ?? '');
  const [descripcionDetallada, setDescripcionDetallada] = useState(punto.descripcionDetallada ?? '');
  const [fotos,               setFotos]               = useState<string[]>(punto.fotos ?? []);
  const [uploading,           setUploading]           = useState(false);
  const [lightbox,            setLightbox]            = useState<number | null>(null);
  const [dirty,               setDirty]               = useState(false);
  const [saved,               setSaved]               = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  /* Sync when punto changes (different punto selected) */
  useEffect(() => {
    setDescripcion(punto.descripcion ?? '');
    setDescripcionDetallada(punto.descripcionDetallada ?? '');
    setFotos(punto.fotos ?? []);
    setDirty(false);
    setSaved(false);
  }, [punto.id]);

  /* Mark dirty on any edit */
  useEffect(() => { setDirty(true); setSaved(false); }, [descripcion, descripcionDetallada, fotos]);

  /* ESC closes lightbox first, then panel */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox !== null) { setLightbox(null); return; }
        onClose();
      }
      if (lightbox !== null) {
        if (e.key === 'ArrowLeft')  setLightbox(i => (i! > 0 ? i! - 1 : fotos.length - 1));
        if (e.key === 'ArrowRight') setLightbox(i => (i! < fotos.length - 1 ? i! + 1 : 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, fotos.length, onClose]);

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const compressed: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const b64 = await compressImage(file);
      if (b64) compressed.push(b64);
    }
    setFotos(prev => [...prev, ...compressed]);
    setUploading(false);
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files.length) return;
    setUploading(true);
    const compressed: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const b64 = await compressImage(file);
      if (b64) compressed.push(b64);
    }
    setFotos(prev => [...prev, ...compressed]);
    setUploading(false);
  }, []);

  const handleDeleteFoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
    if (lightbox !== null) {
      if (index === lightbox) setLightbox(null);
      else if (index < lightbox) setLightbox(l => l! - 1);
    }
  };

  const handleSave = () => {
    onSave({ descripcion, descripcionDetallada, fotos });
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const cfg = MARKER_CFG[punto.tipo as keyof typeof MARKER_CFG];

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Panel */}
      <div
        style={{
          position:        'absolute',
          top:             0,
          right:           0,
          bottom:          0,
          width:           340,
          zIndex:          200,
          display:         'flex',
          flexDirection:   'column',
          background:      'var(--card)',
          borderLeft:      '1px solid var(--border)',
          boxShadow:       'var(--elevation-md)',
          fontFamily:      'var(--font-family-primary)',
          overflowY:       'auto',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-start justify-between p-4"
          style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              {cfg.icon}
            </div>
            <div className="min-w-0">
              <p
                className="truncate"
                style={{
                  color:      'var(--foreground)',
                  fontSize:   'var(--text-h4)',
                  fontWeight: 'var(--font-weight-semibold)',
                  lineHeight: 1.25,
                }}
              >
                {punto.nombre}
              </p>
              <span
                className="inline-block mt-1 px-2 py-0.5 rounded-full"
                style={{
                  background: cfg.bg,
                  color:      cfg.color,
                  fontSize:   '10px',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                {cfg.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-md transition-colors hover:opacity-70"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Coords ── */}
        <div
          className="px-4 py-2 flex items-center gap-2"
          style={{
            borderBottom: '1px solid var(--border)',
            background:   'var(--muted)',
            flexShrink:   0,
          }}
        >
          <Crosshair size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
          <span
            style={{
              fontFamily: 'monospace',
              fontSize:   '11px',
              color:      'var(--muted-foreground)',
            }}
          >
            {punto.lat.toFixed(5)}°, {punto.lng.toFixed(5)}°
          </span>
        </div>

        {/* ── Scroll body ── */}
        <div className="flex flex-col gap-0 flex-1" style={{ overflowY: 'auto' }}>

          {/* Descripción corta */}
          <div className="px-4 pt-4 pb-3">
            <label
              className="block mb-1.5"
              style={{
                color:      'var(--muted-foreground)',
                fontSize:   '11px',
                fontWeight: 'var(--font-weight-semibold)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Descripción
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripción breve…"
              className="w-full px-3 py-2 rounded-lg outline-none"
              style={{
                background: 'var(--input-background)',
                border:     '1px solid var(--border)',
                color:      'var(--foreground)',
                fontSize:   'var(--text-base)',
              }}
            />
          </div>

          {/* Descripción detallada */}
          <div className="px-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <label
              className="block mb-1.5"
              style={{
                color:      'var(--muted-foreground)',
                fontSize:   '11px',
                fontWeight: 'var(--font-weight-semibold)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Detalle / Notas de pista
            </label>
            <textarea
              value={descripcionDetallada}
              onChange={e => setDescripcionDetallada(e.target.value)}
              placeholder="Ingresá información detallada: condiciones del lugar, evidencias encontradas, observaciones, hora de hallazgo…"
              rows={6}
              className="w-full px-3 py-2 rounded-lg outline-none resize-none"
              style={{
                background: 'var(--input-background)',
                border:     '1px solid var(--border)',
                color:      'var(--foreground)',
                fontSize:   'var(--text-base)',
                lineHeight: 1.55,
              }}
            />
          </div>

          {/* Fotos */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <label
                style={{
                  color:      'var(--muted-foreground)',
                  fontSize:   '11px',
                  fontWeight: 'var(--font-weight-semibold)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Fotos de pista
                {fotos.length > 0 && (
                  <span
                    className="ml-2 px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--primary)', color: '#fff', fontSize: '10px' }}
                  >
                    {fotos.length}
                  </span>
                )}
              </label>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{
                  background: 'var(--primary)',
                  color:      '#fff',
                  fontSize:   '12px',
                  fontWeight: 'var(--font-weight-semibold)',
                  opacity:    uploading ? 0.6 : 1,
                }}
              >
                {uploading
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Camera size={13} />
                }
                {uploading ? 'Cargando…' : 'Agregar'}
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Drop zone (when no photos) */}
            {fotos.length === 0 && !uploading && (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl p-6 cursor-pointer transition-colors"
                style={{
                  border:    '2px dashed var(--border)',
                  background: 'var(--muted)',
                  color:     'var(--muted-foreground)',
                }}
                onClick={() => fileRef.current?.click()}
              >
                <ImageOff size={28} style={{ opacity: 0.4 }} />
                <p style={{ fontSize: 'var(--text-label)', textAlign: 'center' }}>
                  Sin fotos cargadas.<br/>Hacé clic o arrastrá imágenes aquí
                </p>
              </div>
            )}

            {/* Photo grid */}
            {fotos.length > 0 && (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="grid gap-2"
                style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
              >
                {fotos.map((src, i) => (
                  <div
                    key={i}
                    className="relative group rounded-lg overflow-hidden"
                    style={{ aspectRatio: '1 / 1', background: 'var(--muted)' }}
                  >
                    <img
                      src={src}
                      alt={`Foto ${i + 1}`}
                      draggable={false}
                      className="w-full h-full"
                      style={{ objectFit: 'cover', display: 'block' }}
                    />
                    {/* Overlay actions on hover */}
                    <div
                      className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.52)' }}
                    >
                      <button
                        onClick={() => setLightbox(i)}
                        className="p-1.5 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}
                        title="Ver"
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteFoto(i)}
                        className="p-1.5 rounded-lg"
                        style={{ background: 'rgba(229,75,75,0.80)', color: '#fff' }}
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {/* Index badge */}
                    <div
                      className="absolute bottom-1 left-1 px-1 rounded"
                      style={{
                        background: 'rgba(0,0,0,0.55)',
                        color:      '#fff',
                        fontSize:   '9px',
                        fontWeight: 'var(--font-weight-semibold)',
                      }}
                    >
                      {i + 1}
                    </div>
                  </div>
                ))}

                {/* Uploading placeholder */}
                {uploading && (
                  <div
                    className="rounded-lg flex items-center justify-center"
                    style={{ aspectRatio: '1 / 1', background: 'var(--muted)', border: '1px dashed var(--border)' }}
                  >
                    <Loader2 size={20} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />
                  </div>
                )}
              </div>
            )}

            {fotos.length > 0 && (
              <p className="mt-2" style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>
                Arrastrá más imágenes aquí para agregarlas. Las fotos se guardan con el operativo.
              </p>
            )}
          </div>
        </div>

        {/* ── Footer Save ── */}
        <div
          className="p-4 flex items-center gap-3"
          style={{ borderTop: '1px solid var(--border)', flexShrink: 0 }}
        >
          <button
            onClick={handleSave}
            disabled={!dirty && !saved}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-button)] transition-all"
            style={{
              background: saved ? '#16a34a' : dirty ? 'var(--primary)' : 'var(--muted)',
              color:      saved || dirty ? '#fff' : 'var(--muted-foreground)',
              fontSize:   'var(--text-base)',
              fontWeight: 'var(--font-weight-semibold)',
              cursor:     !dirty && !saved ? 'default' : 'pointer',
            }}
          >
            <Save size={14} />
            {saved ? 'Guardado ✓' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox !== null && fotos[lightbox] && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.88)', zIndex: 999 }}
          onClick={() => setLightbox(null)}
        >
          {/* Navigation prev */}
          {fotos.length > 1 && (
            <button
              className="absolute left-4 p-2 rounded-full transition-opacity hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', zIndex: 1000 }}
              onClick={e => { e.stopPropagation(); setLightbox(i => (i! > 0 ? i! - 1 : fotos.length - 1)); }}
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Image */}
          <img
            src={fotos[lightbox]}
            alt={`Foto ${lightbox + 1}`}
            draggable={false}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth:     '88vw',
              maxHeight:    '88vh',
              objectFit:    'contain',
              borderRadius: 'var(--radius-card)',
              boxShadow:    '0 24px 64px rgba(0,0,0,0.6)',
              display:      'block',
            }}
          />

          {/* Navigation next */}
          {fotos.length > 1 && (
            <button
              className="absolute right-4 p-2 rounded-full transition-opacity hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', zIndex: 1000 }}
              onClick={e => { e.stopPropagation(); setLightbox(i => (i! < fotos.length - 1 ? i! + 1 : 0)); }}
            >
              <ChevronRight size={28} />
            </button>
          )}

          {/* Close + counter */}
          <div
            className="absolute top-4 right-4 flex items-center gap-3"
            style={{ zIndex: 1000 }}
          >
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'var(--text-label)' }}>
              {lightbox + 1} / {fotos.length}
            </span>
            <button
              onClick={() => setLightbox(null)}
              className="p-2 rounded-full transition-opacity hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Delete from lightbox */}
          <button
            onClick={e => { e.stopPropagation(); handleDeleteFoto(lightbox); }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'rgba(229,75,75,0.85)', color: '#fff', zIndex: 1000, fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)' }}
          >
            <Trash2 size={14} />
            Eliminar foto
          </button>
        </div>
      )}
    </>
  );
}
