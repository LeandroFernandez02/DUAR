import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Franja fija arriba mientras el navegador no tiene conexión (Testeo 25/10, punto 32). Antes,
 * sin internet los botones no avanzaban y no se decía por qué. Los pedidos que fallan igual
 * muestran su propio aviso (ApiError `sin_conexion` en services/api.ts); esto avisa antes.
 */
export default function AvisoSinConexion() {
  const [enLinea, setEnLinea] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  useEffect(() => {
    const on = () => setEnLinea(true);
    const off = () => setEnLinea(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (enLinea) return null;
  return (
    <div role="alert" className="flex items-center justify-center gap-2"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 3000, padding: '8px 16px',
        background: '#b45309', color: '#fff', fontFamily: 'var(--font-family-primary)', fontSize: 'var(--text-label)', fontWeight: 600 }}>
      <WifiOff size={15} style={{ flexShrink: 0 }} />
      Sin conexión a internet. Lo que intentes guardar no se va a registrar hasta que vuelva la conexión.
    </div>
  );
}
