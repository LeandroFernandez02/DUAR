/**
 * CATÁLOGO Y MÁQUINA DE ESTADOS de agentes y grupos (rediseño del 24/09,
 * migración 010). Único lugar del backend que sabe:
 *   · qué estados existen,
 *   · qué estado le corresponde a un agente según el de su grupo (Regla 1),
 *   · qué acción lleva un grupo de qué estado a cuál, y quién puede hacerla.
 * Si una regla cambia, se cambia acá y en ningún otro lado.
 */

export const ESTADOS_AGENTE = [
  'DISPONIBLE',     // sin grupo, en la base, asignable
  'AGRUPADO',       // en un grupo que todavía no salió
  'DESPLEGADO',     // en el terreno sin rastrillar: yendo, o en apoyo (el conductor)
  'RASTRILLANDO',
  'REPLEGADO',      // volviendo del polígono
  'EN_ESPERA',      // de vuelta en el puesto de comando, todavía en su grupo
  'NO_DISPONIBLE',  // sin grupo, no asignable: lesión, ausencia, descanso
];

/** Los únicos estados posibles sin grupo (CHECK agente_estado_segun_grupo_chk). */
export const ESTADOS_AGENTE_SIN_GRUPO = ['DISPONIBLE', 'NO_DISPONIBLE', 'REPLEGADO'];

/** Lo que se puede elegir para un agente sin grupo (el coordinador en CU-17, o él mismo). */
export const ESTADOS_AGENTE_ELEGIBLES = ['DISPONIBLE', 'NO_DISPONIBLE'];

export const ESTADOS_GRUPO = [
  'EN_FORMACION', 'CONFIRMADO', 'ASIGNADO', 'DESPLEGADO',
  'RASTRILLANDO', 'REPLEGADO', 'EN_ESPERA', 'DISUELTO',
];

/** En el puesto de comando. Desde acá se puede disolver (CU-25). */
export const EN_BASE = ['EN_FORMACION', 'CONFIRMADO', 'ASIGNADO', 'EN_ESPERA'];

/**
 * En el terreno. Al entrar se abren los períodos del historial (el armado no
 * deja rastro, decisión del 28/08) y al volver a la base se cierran. Es también
 * la precondición del retiro del CU-26.
 */
export const EN_OPERACION = ['DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO'];

/**
 * Estados que informa el terreno (y ASIGNADO, para poder deshacer una salida
 * marcada por error). Entre ellos se mueve una CORRECCIÓN del coordinador.
 */
export const ESTADOS_CORREGIBLES = ['ASIGNADO', 'DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO', 'EN_ESPERA'];

/**
 * Acciones sobre un grupo. Cada una tiene un nombre que dice lo que pasó, no el
 * estado al que va: el Líder toca "Llegamos" en vez de elegir "Rastrillando", y
 * un salto imposible (Asignado → En espera) ni siquiera se puede pedir.
 *   · quien: 'COORDINADOR' | 'LIDER'
 */
export const ACCIONES = {
  confirmar:       { desde: ['EN_FORMACION', 'EN_ESPERA'],              hacia: 'CONFIRMADO',   quien: ['COORDINADOR'] },
  asignar:         { desde: ['CONFIRMADO'],                             hacia: 'ASIGNADO',     quien: ['COORDINADOR'] },
  reabrir:         { desde: ['CONFIRMADO', 'ASIGNADO', 'EN_ESPERA'],    hacia: 'EN_FORMACION', quien: ['COORDINADOR'] },
  salir:           { desde: ['ASIGNADO'],                               hacia: 'DESPLEGADO',   quien: ['COORDINADOR', 'LIDER'] },
  llegar_poligono: { desde: ['DESPLEGADO'],                             hacia: 'RASTRILLANDO', quien: ['COORDINADOR', 'LIDER'] },
  volver:          { desde: ['DESPLEGADO', 'RASTRILLANDO'],             hacia: 'REPLEGADO',    quien: ['COORDINADOR', 'LIDER'] },
  llegar_base:     { desde: ['REPLEGADO'],                              hacia: 'EN_ESPERA',    quien: ['COORDINADOR', 'LIDER'] },
  disolver:        { desde: EN_BASE,                                    hacia: 'DISUELTO',     quien: ['COORDINADOR'] },
};

/** Lo que pasa en el terreno: lo informa el Líder o lo registra el coordinador por radio. */
export const ACCIONES_TERRENO = ['salir', 'llegar_poligono', 'volver', 'llegar_base'];

/**
 * REGLA 1 — el estado de un integrante según el de su grupo. Nunca hay otra
 * fuente: nadie elige el estado de alguien que está en un grupo.
 *
 * Única excepción: el conductor se queda con el vehículo mientras el grupo
 * rastrilla, así que queda DESPLEGADO. Desde el 29/09 no hay "caminante": el
 * conductor no rastrilla y todos los demás sí (un piloto de dron busca sin
 * caminar y está RASTRILLANDO).
 */
export function estadoAgenteSegunGrupo(estadoGrupo, { esConductor = false } = {}) {
  switch (estadoGrupo) {
    case 'EN_FORMACION':
    case 'CONFIRMADO':
    case 'ASIGNADO':     return 'AGRUPADO';
    case 'DESPLEGADO':   return 'DESPLEGADO';
    case 'RASTRILLANDO': return esConductor ? 'DESPLEGADO' : 'RASTRILLANDO';
    case 'REPLEGADO':    return 'REPLEGADO';
    case 'EN_ESPERA':    return 'EN_ESPERA';
    case 'DISUELTO':     return 'DISPONIBLE';
    default:             return null;
  }
}

/* ── Reglas de composición (puras: sin base, para poder probarlas solas) ── */

/**
 * ¿Puede estar en un grupo de RASTRILLAJE? El recurso especial no (26/09),
 * salvo que vaya de conductor (29/09): ahí su papel es manejar, no su especialidad.
 */
export function entraARastrillaje({ esRecursoCritico, esConductor }) {
  return !esRecursoCritico || esConductor;
}

/**
 * ¿Por qué NO puede liderar un grupo de esta clase? null si puede.
 *  · especial       → cualquiera;
 *  · de rastrillaje → personal del DUAR que rastrilla: ni recurso especial ni
 *    conductor (el Líder camina con su grupo; el conductor espera en la camioneta).
 */
export function motivoLiderNoApto({ esDuar, esRecursoCritico, esConductor }, clase) {
  if (clase === 'ESPECIAL') return null;
  if (esRecursoCritico) return 'recurso_especial_en_rastrillaje';
  if (esConductor) return 'lider_conductor';
  if (!esDuar) return 'lider_no_duar';
  return null;
}

/** Binomio de un grupo de rastrillaje: los que rastrillan son todos menos el conductor. */
export function cuantosRastrillan(integrantes) {
  return integrantes.filter(i => !i.esConductor).length;
}

/** Etiquetas para motivos y mensajes. */
export const ETIQUETA_GRUPO = {
  EN_FORMACION: 'En formación', CONFIRMADO: 'Confirmado', ASIGNADO: 'Asignado',
  DESPLEGADO: 'Desplegado', RASTRILLANDO: 'Rastrillando', REPLEGADO: 'Replegado',
  EN_ESPERA: 'En espera', DISUELTO: 'Disuelto',
};

export const ETIQUETA_AGENTE = {
  DISPONIBLE: 'Disponible', AGRUPADO: 'Agrupado', DESPLEGADO: 'Desplegado',
  RASTRILLANDO: 'Rastrillando', REPLEGADO: 'Replegado', EN_ESPERA: 'En espera',
  NO_DISPONIBLE: 'No disponible',
};
