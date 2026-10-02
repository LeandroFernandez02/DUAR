import { Link } from 'react-router';
import { Shield } from 'lucide-react';

/**
 * Dirección que no existe, o un error de carga de la pantalla. Reemplaza a la
 * pantalla de error que trae la librería de rutas ("Hey developer"), que en un
 * sistema publicado no le dice nada útil a quien lo usa.
 */
export default function NoEncontrada() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)', fontFamily: 'var(--font-family-primary)' }}>
      <div className="flex flex-col items-center text-center gap-4" style={{ maxWidth: 380 }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
          <Shield size={22} color="#fff" />
        </div>
        <div>
          <h1 style={{ color: 'var(--foreground)', fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-semibold)' }}>
            Página no encontrada
          </h1>
          <p className="mt-1" style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)', lineHeight: 1.5 }}>
            La dirección que abriste no existe o ya no está disponible.
          </p>
        </div>
        <Link
          to="/"
          className="px-4 py-2 rounded-[var(--radius-button)]"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
