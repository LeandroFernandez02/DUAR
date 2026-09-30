/**
 * Avatar de un agente del operativo: en vez de las iniciales, un ícono que dice
 * de un vistazo qué papel cumple (28/09), para no llenar la ficha de etiquetas.
 *  · conductor → camión (fucsia): espera al grupo en la camioneta, no rastrea;
 *  · recurso especial (dron, canes, paramédico, caballería, buzos) → estrella (ámbar);
 *  · agente de rastrillaje → huellas (rojo si es del DUAR, salmón si no).
 * Si es conductor y además tiene una especialidad crítica, manda el camión: el
 * papel en el terreno es manejar. La especialidad sigue escrita en la ficha.
 */
import { Footprints, Star, Truck } from 'lucide-react';

interface Props {
  esDuar: boolean;
  esConductor: boolean;
  esRecursoCritico: boolean;
  /** Diámetro en píxeles. */
  tamano?: number;
}

export default function AvatarAgente({ esDuar, esConductor, esRecursoCritico, tamano = 32 }: Props) {
  const { Icono, fondo, titulo } = esConductor
    ? { Icono: Truck, fondo: '#c026d3', titulo: 'Conductor' }
    : esRecursoCritico
      ? { Icono: Star, fondo: '#d97706', titulo: 'Recurso especial' }
      : { Icono: Footprints, fondo: esDuar ? 'var(--primary)' : 'var(--accent)', titulo: 'Agente de rastrillaje' };
  return (
    <div title={titulo} role="img" aria-label={titulo} style={{
      width: tamano, height: tamano, borderRadius: '50%', flexShrink: 0,
      background: fondo, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icono size={Math.round(tamano * 0.5)} strokeWidth={2} />
    </div>
  );
}
