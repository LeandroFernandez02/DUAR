declare const __VERSION_APP__: string;
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Ruler } from 'lucide-react';
import { MarcoAcceso, TituloAcceso, EnlaceAcceso } from '../components/auth/Acceso';
import { esInstalada, plataforma } from '../utils/instalacion';

/**
 * Información de pantalla (10/11): pública y sólo de lectura. Muestra los tamaños que ve el
 * navegador (ventana, pantalla y zonas del reloj y de la barra de inicio), para ajustar el
 * diseño del iPhone con números y no a ojo. Se llega desde la guía de instalación.
 */
function medir() {
  const sonda = document.createElement('div');
  sonda.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(sonda);
  const c = getComputedStyle(sonda);
  const z = { arriba: c.paddingTop, derecha: c.paddingRight, abajo: c.paddingBottom, izquierda: c.paddingLeft };
  sonda.remove();
  const nav = document.querySelector('nav[aria-label="Secciones"]')?.getBoundingClientRect();
  const vv = window.visualViewport;
  return [
    ['Modo', esInstalada() ? 'App instalada' : 'Navegador'],
    ['Barra del reloj', z.arriba !== '0px' && esInstalada() ? 'Translúcida' : esInstalada() ? 'Blanca (reinstalar el ícono)' : '—'],
    ['Versión', __VERSION_APP__],
    ['Ventana corta', document.documentElement.classList.contains('ventana-corta') ? 'sí' : 'no'],
    ['Teléfono', plataforma()],
    ['Ventana (ancho × alto)', `${window.innerWidth} × ${window.innerHeight}`],
    ['Pantalla (ancho × alto)', `${screen.width} × ${screen.height}`],
    ['Viewport visual (alto)', vv ? String(Math.round(vv.height)) : '—'],
    ['Alto del documento', String(document.documentElement.clientHeight)],
    ['Zona del reloj (arriba)', z.arriba],
    ['Barra de inicio (abajo)', z.abajo],
    ['Laterales', `${z.izquierda} / ${z.derecha}`],
    ['Menú inferior (borde de abajo)', nav ? String(Math.round(nav.bottom)) : 'no hay menú en esta pantalla'],
    ['Pixeles por punto', String(window.devicePixelRatio)],
  ] as [string, string][];
}

export default function InfoPantalla() {
  const navigate = useNavigate();
  const [filas, setFilas] = useState<[string, string][]>(() => []);
  useEffect(() => {
    const act = () => setFilas(medir());
    act();
    window.addEventListener('resize', act);
    window.addEventListener('orientationchange', act);
    return () => { window.removeEventListener('resize', act); window.removeEventListener('orientationchange', act); };
  }, []);

  return (
    <MarcoAcceso pie={<EnlaceAcceso onClick={() => navigate('/instalar')}>Volver a la guía</EnlaceAcceso>}>
      <TituloAcceso icono={Ruler} titulo="Información de pantalla"
        texto="Datos del tamaño de tu pantalla. Si algo se ve mal en tu celular, sacá una captura de esta pantalla y mandásela a soporte." />
      <dl className="flex flex-col" style={{ gap: 8, margin: 0 }}>
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4" style={{ paddingBottom: 8, borderBottom: '1px solid var(--border)', fontSize: 'var(--text-label)' }}>
            <dt style={{ color: 'var(--muted-foreground)' }}>{k}</dt>
            <dd style={{ margin: 0, fontWeight: 600, color: 'var(--foreground)', textAlign: 'right' }}>{v}</dd>
          </div>
        ))}
      </dl>
    </MarcoAcceso>
  );
}
