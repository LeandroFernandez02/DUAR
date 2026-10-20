/**
 * Resultado del operativo que se elige al finalizar (CU-10, migración 025). Espejo de
 * RESULTADOS_OPERATIVO en server/src/utils/validaciones.js. Lo usan la ventana de
 * finalizar, la ficha del operativo y el panel general (CU-42).
 */
export type ResultadoOperativo = 'HALLADA_CON_VIDA' | 'HALLADA_SIN_VIDA' | 'OBJETO_HALLADO' | 'SIN_HALLAZGO' | 'SUSPENDIDA';

export const ETIQUETA_RESULTADO: Record<ResultadoOperativo, string> = {
  HALLADA_CON_VIDA: 'Persona hallada con vida',
  HALLADA_SIN_VIDA: 'Persona hallada sin vida',
  OBJETO_HALLADO: 'Objeto hallado',
  SIN_HALLAZGO: 'Sin hallazgo',
  SUSPENDIDA: 'Búsqueda suspendida',
};

/** Los que cuentan como «resuelto» en el panel general. */
export const RESULTADOS_RESUELTOS: ResultadoOperativo[] = ['HALLADA_CON_VIDA', 'HALLADA_SIN_VIDA', 'OBJETO_HALLADO'];

/** Opciones según qué se buscaba: a una búsqueda de objeto no se le ofrece «persona hallada», y viceversa. */
export function opcionesResultado(tipoBuscado?: 'persona' | 'objeto'): ResultadoOperativo[] {
  if (tipoBuscado === 'persona') return ['HALLADA_CON_VIDA', 'HALLADA_SIN_VIDA', 'SIN_HALLAZGO', 'SUSPENDIDA'];
  if (tipoBuscado === 'objeto') return ['OBJETO_HALLADO', 'SIN_HALLAZGO', 'SUSPENDIDA'];
  return ['HALLADA_CON_VIDA', 'HALLADA_SIN_VIDA', 'OBJETO_HALLADO', 'SIN_HALLAZGO', 'SUSPENDIDA'];
}
