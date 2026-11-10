/// <reference types="vite-plugin-pwa/react" />
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';
import { useEsCompacto } from '../../utils/useAncho';

/**
 * App instalable (PWA, 10/11): registra la app en el navegador y, cuando se publica una
 * versión nueva, avisa con «Actualizar». No se recarga sola: alguien puede estar cargando
 * un punto en el terreno. Busca versiones nuevas al abrir y cada 30 minutos.
 */
export default function ActualizacionApp() {
  const compacto = useEsCompacto();
  const { needRefresh: [hayNueva, setHayNueva], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (registro) setInterval(() => { registro.update().catch(() => {}); }, 30 * 60 * 1000);
    },
  });
  if (!hayNueva) return null;

  return (
    <div role="status" className="flex items-center gap-3"
      style={{
        position: 'fixed', left: 16, right: 16, bottom: compacto ? 84 : 24, zIndex: 3000, margin: '0 auto', maxWidth: 460,
        padding: '10px 12px 10px 14px', borderRadius: 'var(--radius-card)', background: 'var(--sidebar)', color: '#fff',
        boxShadow: 'var(--elevation-md, 0 8px 24px rgba(0,0,0,.25))', fontFamily: 'var(--font-family-primary)',
      }}>
      <RefreshCw size={18} style={{ flexShrink: 0, color: 'var(--primary)' }} />
      <span style={{ flex: 1, fontSize: 'var(--text-label)', lineHeight: 1.4 }}>Hay una versión nueva de CALÍVAR.</span>
      <button type="button" onClick={() => setHayNueva(false)}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.75)', fontSize: 'var(--text-label)', cursor: 'pointer', padding: '6px 4px' }}>
        Más tarde
      </button>
      <button type="button" onClick={() => updateServiceWorker(true)}
        style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', borderRadius: 'var(--radius-button)',
          padding: '8px 14px', fontSize: 'var(--text-label)', fontWeight: 600, cursor: 'pointer' }}>
        Actualizar
      </button>
    </div>
  );
}
