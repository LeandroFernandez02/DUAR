/**
 * "rastrillando hace 3 h" en vez de sólo "rastrillando".
 *
 * En el terreno el estado lo actualiza alguien con un teléfono y mala señal, así
 * que el Coordinador necesita saber si el dato es fresco o quedó viejo. Sin esto
 * un RASTRILLANDO de hace 5 minutos y uno de hace 4 horas se ven idénticos.
 * Lo usan la grilla de agentes, el tablero de grupos y el portal del agente.
 */
export function haceCuanto(iso: string | null | undefined): string {
  if (!iso) return '';
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} d`;
}

/** Hora exacta para el tooltip de una marca relativa: "21/09 14:05". */
export function horaExacta(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
}

/** Sólo la hora, en 24 h: "20:53". Sin `hourCycle` algunos navegadores dan "08:53 p. m.". */
export function horaCorta(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}
