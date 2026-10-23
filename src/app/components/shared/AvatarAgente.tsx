/**
 * Avatar de un agente del operativo: en vez de las iniciales, un ícono que dice
 * de un vistazo qué papel cumple (28/09), para no llenar la ficha de etiquetas.
 *  · conductor → camión (fucsia): espera al grupo en la camioneta, no rastrea;
 *  · recurso especial (dron, canes, paramédico, caballería, buzos) → estrella (ámbar);
 *  · agente de rastrillaje → huellas (turquesa con ícono azul noche si es del DUAR, acero si no).
 * Si es conductor y además tiene una especialidad crítica, manda el camión: el
 * papel en el terreno es manejar. La especialidad sigue escrita en la ficha.
 * Tamaños del diseño CALÍVAR: 40 en las tarjetas, 30 en las filas de grupo.
 */
import { Footprints, Star, Truck } from 'lucide-react';

interface Props {
  esDuar: boolean;
  esConductor: boolean;
  esRecursoCritico: boolean;
  /** Diámetro en píxeles. */
  tamano?: number;
  /** Iniciales en lugar del ícono (usuarios que no son agentes de un operativo). */
  iniciales?: string;
}

export default function AvatarAgente({ esDuar, esConductor, esRecursoCritico, tamano = 40, iniciales }: Props) {
  const { Icono, fondo, titulo } = esConductor
    ? { Icono: Truck, fondo: '#c026d3', titulo: 'Conductor' }
    : esRecursoCritico
      ? { Icono: Star, fondo: '#d97706', titulo: 'Recurso especial' }
      : { Icono: Footprints, fondo: esDuar ? 'var(--primary)' : 'var(--accent)', titulo: `Agente de rastrillaje${esDuar ? ' · DUAR' : ''}` };
  return (
    <div title={titulo} role="img" aria-label={titulo} style={{
      width: tamano, height: tamano, borderRadius: '50%', flexShrink: 0,
      background: fondo, color: fondo === 'var(--primary)' ? 'var(--primary-foreground)' : '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-family-primary)', fontSize: Math.round(tamano * 0.34), fontWeight: 700,
    }}>
      {iniciales || <Icono size={Math.round(tamano * 0.45)} strokeWidth={2} />}
    </div>
  );
}
