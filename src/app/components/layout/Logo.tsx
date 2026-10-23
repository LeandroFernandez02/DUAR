/**
 * Logo CALÍVAR (public/calivar). El sistema se llama CALÍVAR y está adaptado para el DUAR:
 * correos, informe PDF y verificación por QR siguen nombrando al DUAR (decisión del 23/10).
 *  · horizontal: menú lateral (siempre azul noche → versión blanca) o barra superior mobile;
 *  · simbolo: menú lateral colapsado;
 *  · vertical: login y pantallas de acceso.
 * `tono`: 'claro' = blanco (sobre azul noche) · 'auto' = azul noche en tema claro, blanco en oscuro.
 */
type Variante = 'horizontal' | 'simbolo' | 'vertical';

export default function Logo({ variante, tono = 'claro', ancho, alto }: { variante: Variante; tono?: 'claro' | 'auto'; ancho: number; alto: number }) {
  const src = (claro: boolean) => `/calivar/calivar-${variante}${claro ? '-claro' : ''}.svg`;
  const img = (claro: boolean, className?: string) => (
    <img src={src(claro)} alt="CALÍVAR" width={ancho} height={alto} className={className} style={{ width: ancho, height: alto, objectFit: 'contain', flexShrink: 0 }} />
  );
  if (tono === 'claro') return img(true);
  return <>{img(false, 'dark:hidden')}{img(true, 'hidden dark:block')}</>;
}
