import type { ComponentType, CSSProperties } from 'react';

/**
 * Pantalla de un módulo que todavía no se construyó. Todas las secciones en
 * desarrollo usan ésta, para que se vean iguales. Reemplaza a las maquetas con
 * datos inventados: con un operativo real no mostraban nada verdadero.
 */
export default function ModuloEnConstruccion({
  titulo,
  subtitulo,
  icono: Icono,
  detalle = 'Todavía se está definiendo qué métricas mostrar en esta sección.',
}: {
  titulo: string;
  /** Debajo del título (p. ej. el nombre del operativo). */
  subtitulo?: string;
  icono: ComponentType<{ size?: number; className?: string; style?: CSSProperties }>;
  /** Frase dentro de la tarjeta. */
  detalle?: string;
}) {
  return (
    <div className="p-6 md:p-8" style={{ fontFamily: 'var(--font-family-primary)' }}>
      <div className="mb-8">
        <h1 className="mb-1" style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-bold)' }}>
          {titulo}
        </h1>
        {subtitulo && (
          <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>{subtitulo}</p>
        )}
      </div>

      <div
        className="flex flex-col items-center justify-center py-16 rounded-[var(--radius-card)]"
        style={{ background: 'var(--card)', boxShadow: 'var(--elevation-sm)' }}
      >
        <Icono size={32} className="mb-3" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }} />
        <p className="mb-1" style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
          En construcción
        </p>
        <p style={{ fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' }}>
          {detalle}
        </p>
      </div>
    </div>
  );
}
