import { Operativo, EstadoOperativo } from '../data/mockData';
import { OperativoApi } from '../services/api';

export const ESTADO_API_A_MOCK: Record<string, EstadoOperativo> = {
  NUEVO: 'nuevo',
  ACTIVO: 'activo',
  INACTIVO: 'inactivo',
  EN_PLANIFICACION: 'planificación',
  EN_PROCESO: 'en_proceso',
  FINALIZADO: 'finalizado',
  ELIMINADO: 'eliminado',
};

/**
 * Traduce el operativo de la API al modelo que consumen las pantallas de
 * Operativos. Único lugar que hace esta traducción — usado tanto por la
 * lista (Operativos.tsx) como por el Panel (OperativoLayout.tsx), para que
 * no diverjan.
 */
export function mapearOperativo(o: OperativoApi): Operativo {
  return {
    id: o.id,
    nombre: o.titulo,
    estado: ESTADO_API_A_MOCK[o.estado] ?? 'nuevo',
    ubicacion: o.localidad,
    fiscal: o.fiscalInstruccion,
    punto0: { lat: o.puntoCeroLat, lng: o.puntoCeroLng },
    fechaInicio: o.fechaHoraInicio,
    fechaFin: o.fechaHoraFin ?? undefined,
    descripcion: o.descripcion ?? undefined,
    // El backend hoy sólo da la CANTIDAD (CU-11 paso 6), no los IDs reales —
    // Módulo 4 (agentes/grupos) todavía no está migrado del todo. Se arma un
    // array del tamaño correcto sólo para que sigan andando los `.length` que
    // ya usaba esta pantalla; nunca se lee como IDs de verdad. El listado real
    // de agentes de un operativo vive en `agentesOperativoApi.listar`.
    agenteIds: Array.from({ length: o.cantidadAgentes }, (_, i) => `sin-migrar-${i}`),
    grupoIds: [],
    sectores: [],
    puntos: [],
    kmRastrillados: 0,
    coordinadorId: o.coordinadorId,
  };
}
