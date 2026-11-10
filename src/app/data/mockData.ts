import type { ResultadoOperativo } from '../utils/resultadoOperativo';
export type Rol = 'administrador' | 'coordinador' | 'jefe de operativo' | 'agente';
export type EstadoUsuario = 'activo' | 'inactivo' | 'eliminado' | 'pendiente';
export type EstadoOperativo = 'iniciado' | 'planificación' | 'inactivo' | 'nuevo' | 'finalizado' | 'eliminado' | 'en_proceso';
/**
 * Ciclo de vida del grupo — espejo del ENUM `estado_grupo` (8 valores,
 * rediseño del 24/09, migración 010). Las reglas reales viven en el backend
 * (server/src/models/estados.js); esto lo usan las pantallas que siguen en
 * mock (Mapa, Informe) y los catálogos visuales.
 *  · en_formacion → armándose; la composición se edita sólo acá
 *  · confirmado   → composición cerrada
 *  · asignado     → tiene zona / polígono (CU-31)
 *  · desplegado   → yendo al polígono
 *  · rastrillando → trabajando el polígono
 *  · replegado    → volviendo
 *  · en_espera    → de vuelta en el puesto de comando, sin decisión
 *  · disuelto     → terminal, baja lógica (CU-27). Nunca se hace DELETE.
 */
export type EstadoGrupo =
  | 'en_formacion'
  | 'confirmado'
  | 'asignado'
  | 'desplegado'
  | 'rastrillando'
  | 'replegado'
  | 'en_espera'
  | 'disuelto';

/** Grupo en el terreno: no se puede disolver (CU-27 paso 2.1). */
export const ESTADOS_GRUPO_EN_TERRENO: EstadoGrupo[] = ['desplegado', 'rastrillando', 'replegado'];

/**
 * Grupo EN OPERACIÓN: salió al terreno. Frontera entre las dos fases:
 *  · ARMADO (en la base) → no se registra historial: un agente podría pasar por
 *    cinco grupos en dos minutos y eso no prueba nada.
 *  · OPERACIÓN (estos estados) → se abren los períodos del historial (valor
 *    judicial) y sacar a alguien exige la ceremonia de CU-28.
 */
export const ESTADOS_GRUPO_EN_OPERACION: EstadoGrupo[] = ['desplegado', 'rastrillando', 'replegado'];

/** ¿El grupo ya salió a terreno? (ver ESTADOS_GRUPO_EN_OPERACION) */
export function grupoEnOperacion(estado: EstadoGrupo): boolean {
  return ESTADOS_GRUPO_EN_OPERACION.includes(estado);
}
/**
 * Especialidad TÉCNICA: lo que el agente SABE HACER.
 * "Conductor" ya NO es una especialidad — pasó a ser un estado logístico
 * booleano (`esConductor`) dentro de AgenteOperativo.
 *
 * Los valores espejan las filas reales de `cat_especialidades` (ver catEspecialidades).
 */
export type Especialidad =
  | 'caminante'
  | 'buceo'
  | 'caballería'
  | 'motos'
  | 'investigación'
  | 'drones'
  | 'altura'
  | 'k-9'
  | 'acuático'
  | 'conductor';
export type ShapeType = 'poligono' | 'circulo' | 'rectangulo';
export type TipoObjetivo = 'persona' | 'objeto';
/**
 * Estado TÁCTICO del agente dentro de un operativo (enum `estado_agente`, 7
 * valores, rediseño del 24/09 — migración 010).
 *
 *  · disponible    → sin grupo, en la base, listo para que lo asignen.
 *  · agrupado      → en un grupo que todavía no salió.
 *  · desplegado    → en el terreno sin rastrillar: yendo, o en apoyo (el
 *                    conductor con el vehículo mientras el grupo rastrilla).
 *  · rastrillando  → trabajando el polígono.
 *  · replegado     → volviendo del polígono.
 *  · en_espera     → de vuelta en el puesto de comando, todavía en su grupo.
 *  · no_disponible → sin grupo, no asignable (lesión, ausencia, descanso).
 *
 * Con grupo, el estado lo define el grupo (Regla 1): nadie lo elige.
 */
export type EstadoOperativoAgente =
  | 'disponible'
  | 'agrupado'
  | 'desplegado'
  | 'rastrillando'
  | 'replegado'
  | 'en_espera'
  | 'no_disponible';

export interface DatosPersonaBuscada {
  nombre: string;
  apellido: string;
  dni?: string;
  edad?: number;
  sexo?: string;
  nacionalidad?: string;
  estatura?: string;
  complexion?: string;
  colorPiel?: string;
  colorOjos?: string;
  colorCabello?: string;
  detallesAdicionales?: string;
  imagenes?: string[]; // base64 data URIs
}

export interface DatosObjetoBuscado {
  nombre: string;
  tipo?: string; // vehículo, embarcación, aeronave, paquete, etc.
  descripcion?: string;
  color?: string;
  marca?: string;
  modelo?: string;
  dimensiones?: string;
  detallesAdicionales?: string;
  imagenes?: string[]; // base64 data URIs
}

export interface ObjetivoBusqueda {
  tipo: TipoObjetivo;
  persona?: DatosPersonaBuscada;
  objeto?: DatosObjetoBuscado;
}

export interface Usuario {
  id: string;
  dni: string;
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: Rol;
  fechaNacimiento?: string; // YYYY-MM-DD
  telefono?: string;
  alergias?: string;
  /**
   * Institución a la que pertenece (FK a cat_instituciones). La declara el
   * propio usuario al registrarse (CU-02).
   */
  institucionId?: string;
  /** Dependencia dentro de esa institución (en pantalla "Dependencia"). Con
   *  Policía · DUAR, `esDuar()` lo habilita a ser Líder. */
  dotacionId?: string;
  /**
   * Especialidad TÉCNICA del perfil global (FK a cat_especialidades).
   * `especialidad` (el slug) sigue existiendo para el override TÁCTICO en
   * AgenteOperativo (Decisión C); acá, a nivel de perfil, se referencia por id
   * — mismo patrón que institucionId/dotacionId — porque viene de la API real.
   */
  especialidadId?: string;
  especialidad?: Especialidad;
  /** Alergias del perfil global (FK N:M a cat_alergias). Ver catAlergias. */
  alergiaIds?: string[];
  grupo_sanguineo?: string;
  estado: EstadoUsuario;
  createdAt: string;
  /** true si el usuario confirmó su email; false = pendiente de verificación */
  emailConfirmado: boolean;
  /** Token de un solo uso para el link de confirmación; se limpia al confirmar */
  tokenConfirmacion?: string;
  /**
   * ISO timestamp del momento de eliminación lógica.
   * Solo presente cuando estado === 'eliminado'.
   * Sirve como registro de auditoría a nivel de base de datos.
   */
  eliminadoAt?: string;
  // NOTA (Decisión A): `estadoOperativo` y `caminante` vivían acá y fueron
  // movidos a AgenteOperativo. Son datos TÁCTICOS: dependen del operativo,
  // no del perfil global de la persona.
}

/**
 * AgenteOperativo — la encarnación TÁCTICA de un Usuario dentro de UN operativo.
 * Espejo de la tabla `agentes_operativo` (Decisión A: Dualidad Usuario/Agente).
 *
 * Todo lo que es circunstancial del operativo vive acá, NUNCA en el Usuario global:
 * el estado táctico, las funciones logísticas (caminante/conductor), el override
 * de especialidad y la pertenencia al grupo.
 */
export interface AgenteOperativo {
  id: string;
  usuarioId: string;
  operativoId: string;
  /** Estado táctico. Default 'disponible' al darse de alta. */
  estado: EstadoOperativoAgente;
  /**
   * Estado logístico: sale a caminar el polígono.
   * Se infiere por especialidad al dar el alta y el Coordinador puede
   * sobrescribirlo localmente sin tocar el perfil global (Decisión C).
   */
  esCaminante: boolean;
  /**
   * Estado logístico: cumple la función de conductor del vehículo.
   * Exclusivo del Coordinador (CU-19); el usuario no lo elige al registrarse.
   */
  esConductor: boolean;
  /** Override TÁCTICO de especialidad. Si es undefined, vale la del perfil global. */
  especialidad?: Especialidad;
  /** Grupo al que pertenece dentro del operativo (undefined = sin grupo). */
  grupoId?: string;
  fechaIngreso: string;
  /** ISO. Si tiene valor, el agente ya no está activo (libera la Regla de Ubicuidad). */
  fechaEgreso?: string;
}

/**
 * Período de pertenencia de un agente a un grupo — espejo de la tabla
 * `agentes_grupo_historial` (CU-28, Observación 1).
 *
 * Existe porque `AgenteOperativo.grupoId` es un único campo mutable: al extraer
 * a alguien (grupoId → undefined) se perdería el rastro de que estuvo ahí.
 * Esta tabla permite reconstruir en el informe final "el agente integró el
 * Grupo X desde la hora A hasta la hora B", que es la trazabilidad judicial.
 */
export interface AgenteGrupoHistorial {
  id: string;
  agenteOperativoId: string;
  grupoId: string;
  fechaInicio: string;
  /** ISO. undefined = sigue integrando el grupo. */
  fechaFin?: string;
  /** CU-28 paso 3: "Lesión", "Emergencia Personal", "Reasignación"... */
  motivoSalida?: string;
  /** Usuario (Coordinador) que ejecutó la baja. */
  registradoPor?: string;
}

export interface GrupoRastrillaje {
  id: string;
  nombre: string;
  lider: string;
  /**
   * Snapshot histórico de integrantes. Si estado==='disuelto', NO se vuelve a
   * tocar (CU-27 obs.: "el Grupo existió de 08:00 a 12:00, integrado por X,Y,Z").
   */
  agenteIds: string[];
  estado: EstadoGrupo;
  /** ISO. Baja lógica — se setea junto con estado='disuelto' (CU-27). */
  eliminadoEn?: string;
  color: string;
  kmRecorridos: number;
}

export interface PuntoInteres {
  id: string;
  nombre: string;
  tipo: 'puntoCero' | 'puestoComando' | 'poi' | 'hallazgo';
  lat: number;
  lng: number;
  descripcion?: string;
  descripcionDetallada?: string;
  fotos?: string[];
}

export interface MapShape {
  id: string;
  nombre: string;
  tipo: ShapeType;
  color: string;
  /** polygon: ordered array of lat/lng vertices */
  points?: Array<{ lat: number; lng: number }>;
  /** circle: center point */
  center?: { lat: number; lng: number };
  /** circle: a point on the circumference (used to compute screen radius) */
  radiusPoint?: { lat: number; lng: number };
  /** rectangle: north-west corner */
  nw?: { lat: number; lng: number };
  /** rectangle: south-east corner */
  se?: { lat: number; lng: number };
}

export interface HistorialPuestoCom {
  id: string;
  lat: number;
  lng: number;
  timestamp: string; // ISO 8601
  motivo?: string;
}

export interface Operativo {
  id: string;
  nombre: string;       // = Carátula
  estado: EstadoOperativo;
  ubicacion: string;    // = Localidad
  fiscal?: string;      // Fiscal de Instrucción
  punto0?: { lat: number; lng: number }; // LSP – Last Seen Point
  fechaInicio: string;  // ISO 8601 datetime
  fechaFin?: string;
  /** Por qué tiene el estado actual y si está Inactivo por una pausa manual (ciclo de estados, 24/10). */
  estadoMotivo?: string;
  estadoActualizadoEn?: string;
  pausaManual?: boolean;
  descripcion?: string;
  objetivo?: string;
  /**
   * Sólo la usan pantallas todavía sin migrar (historial mock de
   * AgenteDashboard.tsx). Las pantallas reales (panel del operativo, listado)
   * usan `tieneObjetivoBuscado`/`objetivoPreview` + `objetivoApi` — la ficha
   * completa vive en la tabla real `objetivo_buscado`, nunca acá.
   */
  objetivoBusqueda?: ObjetivoBusqueda;
  /** CU-13/13/14: si el operativo (real) ya tiene una ficha de objetivo cargada. */
  tieneObjetivoBuscado?: boolean;
  /** Vista previa liviana para las cards del listado (CU-12) — sin fotos. */
  objetivoPreview?: { tipo: TipoObjetivo; nombre?: string; apellido?: string };
  /** Jefe de Operativo vigente (02/11, migración 030); sin él, «No asignado». */
  jefe?: { id: string; nombre: string; apellido: string };
  agenteIds: string[];
  grupoIds: string[];
  puntos: PuntoInteres[];
  shapes?: MapShape[];
  historialPuestoComando?: HistorialPuestoCom[];
  kmRastrillados: number;
  coordinadorId: string;
  notaFinal?: string;       // reseña/conclusión al cerrar el operativo
  resultado?: ResultadoOperativo; // elegido al finalizar (CU-10, migración 025)
}

export interface AppData {
  usuarios: Usuario[];
  operativos: Operativo[];
  grupos: GrupoRastrillaje[];
  /**
   * Fuente de verdad de los datos TÁCTICOS (Decisión A).
   * `operativo.agenteIds` se mantiene sincronizado como simple lista de
   * pertenencia para el código que aún la consume.
   */
  agentesOperativo: AgenteOperativo[];
  /** Períodos de pertenencia a grupos — registro forense (CU-28). */
  agentesGrupoHistorial: AgenteGrupoHistorial[];
}

export const initialData: AppData = {
  usuarios: [
    {
      id: 'u1',
      dni: '20123456',
      nombre: 'Admin',
      apellido: 'DUAR',
      email: 'admin@duar.cba.gob.ar',
      password: '',
      rol: 'administrador',
      estado: 'activo',
      createdAt: '2025-01-10',
      emailConfirmado: true,
    },
    {
      id: 'u2',
      dni: '25987654',
      nombre: 'Marcelo',
      apellido: 'Fierro',
      email: 'coord@duar.cba.gob.ar',
      password: '',
      rol: 'coordinador',
      fechaNacimiento: '1984-06-14',
      telefono: '351-4201234',
      institucionId: '80ac6de6-9133-45f1-85c3-d3099894a45a', dotacionId: 'c4816e1e-a8df-4c71-a7f5-55575a443450', // Policía · DUAR
      estado: 'activo',
      createdAt: '2025-01-15',
      emailConfirmado: true,
    },
    {
      id: 'u3',
      dni: '30111222',
      nombre: 'Lucía',
      apellido: 'Zamora',
      email: 'agente1@duar.cba.gob.ar',
      password: '',
      rol: 'agente',
      fechaNacimiento: '1997-05-15',
      telefono: '351-5551001',
      especialidad: 'caminante',
      grupo_sanguineo: 'A+',
      alergias: 'Ninguna',
      institucionId: '80ac6de6-9133-45f1-85c3-d3099894a45a', dotacionId: 'c4816e1e-a8df-4c71-a7f5-55575a443450', // Policía · DUAR
      estado: 'activo',
      createdAt: '2025-02-01',
      emailConfirmado: true,
    },
    {
      id: 'u4',
      dni: '28334455',
      nombre: 'Sebastián',
      apellido: 'Romero',
      email: 'agente2@duar.cba.gob.ar',
      password: '',
      rol: 'agente',
      fechaNacimiento: '1991-03-22',
      telefono: '351-5552002',
      especialidad: 'caminante',
      grupo_sanguineo: 'O+',
      alergias: 'Polen',
      institucionId: 'e9abb177-b4ff-4beb-9200-7c06f07deb5a', // Bomberos Voluntarios
      estado: 'activo',
      createdAt: '2025-02-05',
      emailConfirmado: true,
    },
    {
      id: 'u5',
      dni: '32556677',
      nombre: 'Valentina',
      apellido: 'López',
      email: 'agente3@duar.cba.gob.ar',
      password: '',
      rol: 'agente',
      fechaNacimiento: '1999-07-08',
      telefono: '351-5553003',
      grupo_sanguineo: 'B-',
      alergias: 'Ninguna',
      institucionId: '80ac6de6-9133-45f1-85c3-d3099894a45a', dotacionId: 'c4816e1e-a8df-4c71-a7f5-55575a443450', // Policía · DUAR
      estado: 'activo',
      createdAt: '2025-02-10',
      emailConfirmado: true,
    },
    {
      id: 'u6',
      dni: '27778899',
      nombre: 'Diego',
      apellido: 'Herrera',
      email: 'agente4@duar.cba.gob.ar',
      password: '',
      rol: 'agente',
      fechaNacimiento: '1988-11-30',
      telefono: '351-5554004',
      especialidad: 'caminante',
      grupo_sanguineo: 'AB+',
      alergias: 'Penicilina',
      institucionId: 'e9abb177-b4ff-4beb-9200-7c06f07deb5a', // Bomberos Voluntarios
      estado: 'activo',
      createdAt: '2025-02-12',
      emailConfirmado: true,
    },
    {
      id: 'u7',
      dni: '33990011',
      nombre: 'Camila',
      apellido: 'Morales',
      email: 'agente5@duar.cba.gob.ar',
      password: '',
      rol: 'agente',
      fechaNacimiento: '1995-04-12',
      telefono: '351-5555005',
      especialidad: 'caminante',
      grupo_sanguineo: 'O-',
      alergias: 'Ninguna',
      institucionId: '80ac6de6-9133-45f1-85c3-d3099894a45a', dotacionId: 'c4816e1e-a8df-4c71-a7f5-55575a443450', // Policía · DUAR
      estado: 'activo',
      createdAt: '2025-02-18',
      emailConfirmado: true,
    },
    {
      id: 'u8',
      dni: '29112233',
      nombre: 'Ramiro',
      apellido: 'Sosa',
      email: 'agente6@duar.cba.gob.ar',
      password: '',
      rol: 'agente',
      fechaNacimiento: '1982-09-25',
      telefono: '351-5556006',
      grupo_sanguineo: 'A-',
      alergias: 'Aspirina',
      institucionId: '80ac6de6-9133-45f1-85c3-d3099894a45a', dotacionId: 'c4816e1e-a8df-4c71-a7f5-55575a443450', // Policía · DUAR
      estado: 'inactivo',
      createdAt: '2025-01-25',
      emailConfirmado: true,
    },
    {
      id: 'u9',
      dni: '31445566',
      nombre: 'Florencia',
      apellido: 'Rivas',
      email: 'agente7@duar.cba.gob.ar',
      password: '',
      rol: 'agente',
      fechaNacimiento: '2001-01-17',
      telefono: '351-5557007',
      especialidad: 'caminante',
      grupo_sanguineo: 'B+',
      alergias: 'Ninguna',
      institucionId: 'e9abb177-b4ff-4beb-9200-7c06f07deb5a', // Bomberos Voluntarios
      estado: 'activo',
      createdAt: '2025-03-01',
      emailConfirmado: true,
    },
    {
      id: 'u10',
      dni: '26334455',
      nombre: 'Martín',
      apellido: 'Aguirre',
      email: 'agente8@duar.cba.gob.ar',
      password: '',
      rol: 'agente',
      fechaNacimiento: '1986-06-03',
      telefono: '351-5558008',
      grupo_sanguineo: 'A+',
      alergias: 'Ninguna',
      institucionId: '80ac6de6-9133-45f1-85c3-d3099894a45a', dotacionId: 'c4816e1e-a8df-4c71-a7f5-55575a443450', // Policía · DUAR
      estado: 'activo',
      createdAt: '2025-03-05',
      emailConfirmado: true,
    },
  ],

  grupos: [
    {
      id: 'g1',
      nombre: 'Grupo Alfa',
      lider: 'u3',
      agenteIds: ['u3', 'u4'],
      estado: 'rastrillando',
      color: '#E54B4B',
      kmRecorridos: 4.2,
    },
    {
      id: 'g2',
      nombre: 'Grupo Beta',
      lider: 'u5',
      agenteIds: ['u5', 'u6'],
      estado: 'rastrillando',
      color: '#FFA987',
      kmRecorridos: 3.1,
    },
    {
      id: 'g3',
      nombre: 'Grupo Delta',
      lider: 'u7',
      agenteIds: ['u7', 'u9'],
      estado: 'rastrillando',
      color: '#444140',
      kmRecorridos: 2.7,
    },
    {
      id: 'g4',
      nombre: 'Grupo Gamma',
      lider: 'u10',
      agenteIds: ['u10'],
      estado: 'en_formacion',
      color: '#c0392b',
      kmRecorridos: 0,
    },
  ],

  operativos: [
    {
      id: 'op1',
      nombre: 'Búsqueda Cerro Champaquí',
      estado: 'iniciado',
      ubicacion: 'Cerro Champaquí, Córdoba',
      fechaInicio: '2026-02-28',
      descripcion: 'Búsqueda de excursionista extraviado en la zona del Cerro Champaquí. Última ubicación conocida: Refugio Champaquí.',
      objetivo: 'Persona: Juan García, 52 años, DNI 18.234.567. Excursionista experimentado. Vestimenta: campera azul, mochila verde.',
      objetivoBusqueda: {
        tipo: 'persona',
        persona: {
          nombre: 'Juan',
          apellido: 'García',
          dni: '18.234.567',
          edad: 52,
          sexo: 'Masculino',
          nacionalidad: 'Argentina',
          estatura: '1.75 m',
          complexion: 'Normal',
          colorPiel: 'Blanca',
          colorOjos: 'Marrones',
          colorCabello: 'Castaño con canas',
          detallesAdicionales: 'Campera azul impermeable marca Columbia, pantalón de montaña beige, zapatillas de trekking Salomon negras, mochila verde de 40L marca Osprey con parches reflectivos. Cicatriz lineal de 3 cm en mejilla izquierda. Usa anteojos de lectura con montura negra. Excursionista experimentado. Portaba balizas de emergencia PLB y GPS Garmin. Posible lesión en rodilla derecha crónica.',
          imagenes: [],
        },
      },
      // u3, u4 — solo estos dos están activos aquí
      agenteIds: ['u3', 'u4'],
      grupoIds: ['g1'],
      puntos: [
        { id: 'p1', nombre: 'Punto Cero', tipo: 'puntoCero', lat: -31.993, lng: -64.923, descripcion: 'Última ubicación conocida' },
        { id: 'p2', nombre: 'Puesto de Comando', tipo: 'puestoComando', lat: -31.985, lng: -64.911, descripcion: 'Base de operaciones' },
        { id: 'p3', nombre: 'Refugio Champaquí', tipo: 'poi', lat: -31.998, lng: -64.930, descripcion: 'Refugio de montaña' },
        { id: 'p4', nombre: 'Hallazgo mochila', tipo: 'hallazgo', lat: -31.996, lng: -64.927, descripcion: 'Mochila azul encontrada' },
      ],
      shapes: [],
      kmRastrillados: 10.0,
      coordinadorId: 'u2',
    },
    {
      id: 'op2',
      nombre: 'Rastrillaje Sierras del Norte',
      estado: 'planificación',
      ubicacion: 'Villa de Soto, Córdoba',
      fechaInicio: '2026-03-15',
      descripcion: 'Búsqueda preventiva en la zona de Sierras del Norte ante denuncia de persona desaparecida.',
      objetivo: 'Persona: Ana Rodríguez, 34 años. Datos en investigación.',
      objetivoBusqueda: {
        tipo: 'persona',
        persona: {
          nombre: 'Ana',
          apellido: 'Rodríguez',
          edad: 34,
          sexo: 'Femenino',
          detallesAdicionales: 'Datos en investigación.',
          imagenes: [],
        },
      },
      // Sin agentes asignados aún (planificación)
      agenteIds: [],
      grupoIds: [],
      puntos: [],
      shapes: [],
      kmRastrillados: 0,
      coordinadorId: 'u2',
    },
    {
      id: 'op3',
      nombre: 'Operativo Valle de Calamuchita',
      estado: 'inactivo',
      ubicacion: 'Villa General Belgrano, Córdoba',
      fechaInicio: '2026-01-10',
      fechaFin: '2026-01-18',
      descripcion: 'Búsqueda concluida exitosamente. Persona encontrada con vida en buen estado.',
      objetivo: 'Persona: Carlos Medina, 67 años.',
      objetivoBusqueda: {
        tipo: 'persona',
        persona: {
          nombre: 'Carlos',
          apellido: 'Medina',
          edad: 67,
          sexo: 'Masculino',
          nacionalidad: 'Argentina',
          imagenes: [],
        },
      },
      // Histórico: los agentes que participaron (ya finalizado)
      agenteIds: ['u3', 'u4', 'u5', 'u6'],
      grupoIds: [],
      puntos: [
        { id: 'p5', nombre: 'Punto Cero', tipo: 'puntoCero', lat: -31.988, lng: -64.549, descripcion: 'Última ubicación' },
      ],
      shapes: [],
      kmRastrillados: 22.5,
      coordinadorId: 'u2',
    },
    {
      id: 'op4',
      nombre: 'Búsqueda Delta Norte',
      estado: 'nuevo',
      ubicacion: 'La Cumbre, Córdoba',
      fechaInicio: '2026-03-08',
      descripcion: 'Nuevo operativo iniciado. Configuración en proceso.',
      objetivo: 'Por determinar.',
      agenteIds: [],
      grupoIds: [],
      puntos: [],
      shapes: [],
      kmRastrillados: 0,
      coordinadorId: 'u2',
    },
    {
      id: 'op5',
      nombre: 'Operativo Río Cuarto Sur',
      estado: 'en_proceso',
      ubicacion: 'Río Cuarto, Córdoba',
      fiscal: 'Dra. Marta Gómez',
      fechaInicio: '2026-03-10T08:00',
      descripcion: 'Búsqueda activa de menor de edad en zona periurbana. Equipos desplegados en cuatro polígonos.',
      objetivo: 'Persona: Sofía Torres, 14 años. Desaparecida desde el 09/03.',
      objetivoBusqueda: {
        tipo: 'persona',
        persona: {
          nombre: 'Sofía',
          apellido: 'Torres',
          edad: 14,
          sexo: 'Femenino',
          nacionalidad: 'Argentina',
          estatura: '1.58 m',
          complexion: 'Delgada',
          colorPiel: 'Trigueña',
          colorOjos: 'Negros',
          colorCabello: 'Negro lacio',
          detallesAdicionales: 'Buzo gris con capucha, jean azul, zapatillas blancas. Lunar pequeño sobre labio superior izquierdo.',
          imagenes: [],
        },
      },
      punto0: { lat: -33.125, lng: -64.347 },
      // u5, u6 — distintos a op1
      agenteIds: ['u5', 'u6'],
      grupoIds: ['g2'],
      puntos: [
        { id: 'p6', nombre: 'Punto Cero', tipo: 'puntoCero', lat: -33.125, lng: -64.347, descripcion: 'Último avistamiento' },
        { id: 'p7', nombre: 'Puesto de Comando', tipo: 'puestoComando', lat: -33.118, lng: -64.340, descripcion: 'Base principal' },
      ],
      shapes: [],
      kmRastrillados: 6.3,
      coordinadorId: 'u2',
    },
    {
      id: 'op6',
      nombre: 'Rastrillaje Quebrada del Condorito',
      estado: 'en_proceso',
      ubicacion: 'Parque Nacional Quebrada del Condorito, Córdoba',
      fiscal: 'Dr. Facundo Ramos',
      fechaInicio: '2026-03-17T06:30',
      descripcion: 'Búsqueda de turista extranjero no retornado al campamento base tras senderismo nocturno.',
      objetivo: 'Persona: Luca Bernardi, 28 aos, ciudadano italiano.',
      objetivoBusqueda: {
        tipo: 'persona',
        persona: {
          nombre: 'Luca',
          apellido: 'Bernardi',
          edad: 28,
          sexo: 'Masculino',
          nacionalidad: 'Italiana',
          estatura: '1.82 m',
          complexion: 'Atlética',
          colorPiel: 'Clara',
          colorOjos: 'Azules',
          colorCabello: 'Rubio',
          detallesAdicionales: 'Remera naranja, pantalón técnico negro, mochila roja pequeña. Tatuaje en antebrazo derecho. No habla español.',
          imagenes: [],
        },
      },
      punto0: { lat: -31.680, lng: -64.785 },
      // u7, u9, u10 — distintos a op1 y op5
      agenteIds: ['u7', 'u9', 'u10'],
      grupoIds: ['g3', 'g4'],
      puntos: [
        { id: 'p8', nombre: 'Punto Cero', tipo: 'puntoCero', lat: -31.680, lng: -64.785, descripcion: 'Campamento base' },
        { id: 'p9', nombre: 'Puesto de Comando', tipo: 'puestoComando', lat: -31.672, lng: -64.778, descripcion: 'Centro coordinación' },
      ],
      shapes: [],
      kmRastrillados: 3.8,
      coordinadorId: 'u2',
    },
  ],

  /**
   * Encarnaciones TÁCTICAS. Reglas respetadas en este seed:
   *  · Ubicuidad: cada usuario tiene como máximo UNA fila sin fechaEgreso.
   *    (u3..u6 participaron del op3, ya finalizado, y por eso tienen egreso.)
   *  · Caminante inferido por especialidad: bombero/bombero voluntario = true,
   *    paramédico = false. Los conductores arrancan en false.
   *  · Conductor en grupo RASTRILLANDO queda en 'desplegado' (se queda con el vehículo).
   */
  agentesOperativo: [
    // ── op1 · Cerro Champaquí (activo) · grupo g1 rastrillando ──
    { id: 'ao1', usuarioId: 'u3', operativoId: 'op1', estado: 'desplegado',   esCaminante: false, esConductor: false, grupoId: 'g1', fechaIngreso: '2026-02-28T07:00:00.000Z' },
    { id: 'ao2', usuarioId: 'u4', operativoId: 'op1', estado: 'rastrillando', esCaminante: true,  esConductor: false, grupoId: 'g1', fechaIngreso: '2026-02-28T07:00:00.000Z' },

    // ── op3 · Calamuchita (finalizado) · histórico, todos con egreso ──
    { id: 'ao3', usuarioId: 'u3', operativoId: 'op3', estado: 'replegado', esCaminante: false, esConductor: false, fechaIngreso: '2026-01-10T06:00:00.000Z', fechaEgreso: '2026-01-18T19:00:00.000Z' },
    { id: 'ao4', usuarioId: 'u4', operativoId: 'op3', estado: 'replegado', esCaminante: true,  esConductor: false, fechaIngreso: '2026-01-10T06:00:00.000Z', fechaEgreso: '2026-01-18T19:00:00.000Z' },
    { id: 'ao5', usuarioId: 'u5', operativoId: 'op3', estado: 'replegado', esCaminante: false, esConductor: true,  fechaIngreso: '2026-01-10T06:00:00.000Z', fechaEgreso: '2026-01-18T19:00:00.000Z' },
    { id: 'ao6', usuarioId: 'u6', operativoId: 'op3', estado: 'replegado', esCaminante: true,  esConductor: false, fechaIngreso: '2026-01-10T06:00:00.000Z', fechaEgreso: '2026-01-18T19:00:00.000Z' },

    // ── op5 · Río Cuarto Sur (en proceso) · grupo g2 rastrillando ──
    // u5 es conductor: el grupo está rastrillando, así que quedó 'desplegado' en el vehículo.
    { id: 'ao7', usuarioId: 'u5', operativoId: 'op5', estado: 'desplegado',   esCaminante: false, esConductor: true,  grupoId: 'g2', fechaIngreso: '2026-03-10T08:00:00.000Z' },
    { id: 'ao8', usuarioId: 'u6', operativoId: 'op5', estado: 'rastrillando', esCaminante: true,  esConductor: false, grupoId: 'g2', fechaIngreso: '2026-03-10T08:00:00.000Z' },

    // ── op6 · Quebrada del Condorito (en proceso) · g3 rastrillando, g4 en formación ──
    { id: 'ao9',  usuarioId: 'u7',  operativoId: 'op6', estado: 'desplegado',   esCaminante: false, esConductor: false, grupoId: 'g3', fechaIngreso: '2026-03-17T06:30:00.000Z' },
    { id: 'ao10', usuarioId: 'u9',  operativoId: 'op6', estado: 'rastrillando', esCaminante: true,  esConductor: false, grupoId: 'g3', fechaIngreso: '2026-03-17T06:30:00.000Z' },
    { id: 'ao11', usuarioId: 'u10', operativoId: 'op6', estado: 'disponible',   esCaminante: false, esConductor: true,  grupoId: 'g4', fechaIngreso: '2026-03-17T06:30:00.000Z' },
  ],

  /**
   * Períodos de pertenencia ABIERTOS. Solo existen para grupos EN OPERACIÓN:
   * g1/g2/g3 están rastrillando. g4 está en_formacion (fase de armado), así que
   * su integrante NO tiene período: todavía no se confirmó que trabajara ahí.
   */
  agentesGrupoHistorial: [
    { id: 'agh1', agenteOperativoId: 'ao1',  grupoId: 'g1', fechaInicio: '2026-02-28T07:00:00.000Z' },
    { id: 'agh2', agenteOperativoId: 'ao2',  grupoId: 'g1', fechaInicio: '2026-02-28T07:00:00.000Z' },
    { id: 'agh3', agenteOperativoId: 'ao7',  grupoId: 'g2', fechaInicio: '2026-03-10T08:00:00.000Z' },
    { id: 'agh4', agenteOperativoId: 'ao8',  grupoId: 'g2', fechaInicio: '2026-03-10T08:00:00.000Z' },
    { id: 'agh5', agenteOperativoId: 'ao9',  grupoId: 'g3', fechaInicio: '2026-03-17T06:30:00.000Z' },
    { id: 'agh6', agenteOperativoId: 'ao10', grupoId: 'g3', fechaInicio: '2026-03-17T06:30:00.000Z' },
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
 * Reglas de negocio de los estados logísticos (CU-19, CU-20, CU-28)
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Catálogo de especialidades — espejo de la tabla `cat_especialidades`.
 *
 * Los `id` son los UUID REALES de la base `duar-test`, para que al conectar el
 * backend esta constante se reemplace por un fetch sin tocar nada más.
 *
 * `esRecursoCritico` = la función especializada se PERDERÍA si la persona
 * saliera a caminar el polígono (debe quedarse en el Punto Cero, con el
 * vehículo o con su equipo). Es el dato que gobierna la inferencia de caminante.
 */
export interface CatEspecialidad {
  id: string;
  nombre: string;              // nombre tal cual está en la BD
  slug: Especialidad;          // clave que usa el frontend
  esRecursoCritico: boolean;
  /** Sólo "Conductor" (migración 035): maneja, no rastrilla y entra a cualquier grupo. */
  esConductor?: boolean;
}

export const catEspecialidades: CatEspecialidad[] = [
  // Catálogo del cliente (05/11, migración 033). Caminante es la única de
  // rastrillaje; el resto son recursos especiales y van a un grupo especial.
  // Caminante reutiliza el id de "Bombero", Drones el de "Dron", K-9 el de
  // "Canes" y Buceo el de "Buzos".
  { id: '788ad70e-d044-48e3-b6b2-5b7f265ee106', nombre: 'Caminante',     slug: 'caminante',     esRecursoCritico: false },
  { id: '3b25c85b-483c-43c0-b8a9-596d09468855', nombre: 'Buceo',         slug: 'buceo',         esRecursoCritico: true  },
  { id: 'eb016aa1-0c17-4fd3-add0-b31becf1d1b2', nombre: 'Caballería',    slug: 'caballería',    esRecursoCritico: true  },
  { id: '70bd0656-4b02-4f96-8448-da34e31eb4de', nombre: 'Motos',         slug: 'motos',         esRecursoCritico: true  },
  { id: 'd7aff1de-3fde-448e-a3c5-8bcc0d9513bf', nombre: 'Investigación', slug: 'investigación', esRecursoCritico: true  },
  { id: '328cf95c-6ee2-446a-bba7-197e0f00b322', nombre: 'Drones',        slug: 'drones',        esRecursoCritico: true  },
  { id: 'ed422a17-c6c4-4918-b409-e39f5a94a1b6', nombre: 'Altura',        slug: 'altura',        esRecursoCritico: true  },
  { id: 'eb010f9d-406e-4248-ba27-d88ca045ca4f', nombre: 'K-9',           slug: 'k-9',           esRecursoCritico: true  },
  { id: '4ff8d2fe-647c-4fda-b036-3d315c43d7e9', nombre: 'Acuático',      slug: 'acuático',      esRecursoCritico: true  },
  // El conductor pasó a ser una especialidad (07/11, migración 035): un agente es una sola cosa a la vez.
  { id: '39c9654d-b11c-487d-a3ca-45636957d599', nombre: 'Conductor',     slug: 'conductor',     esRecursoCritico: false, esConductor: true },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Institución y Dotación — espejo de cat_instituciones / cat_dotaciones
 * ────────────────────────────────────────────────────────────────────────────
 * Reemplazan al viejo campo de texto libre `Usuario.dotacion`, que obligaba a
 * resolver la regla del Líder con un `dotacion.includes('duar')`. Los datos de
 * prueba ya mostraban por qué eso fallaba: existían "DUAR Champaquí" y "DUAR
 * Traslasierra", que no son dotaciones reales del organismo.
 *
 * Los `id` son los UUID REALES de `duar-test`: al conectar el backend, estas
 * constantes se reemplazan por un fetch sin tocar nada más.
 */

export interface CatInstitucion {
  id: string;
  nombre: string;
}

export interface CatDotacion {
  id: string;
  nombre: string;
  /** Dependencia DENTRO de una institución (en pantalla: "Dependencia"). */
  institucionId: string;
  /** Sólo Policía · DUAR. Único criterio para poder ser Líder (06/11). Es un dato, no el nombre. */
  esDuar?: boolean;
}

export const catInstituciones: CatInstitucion[] = [
  // Lista del cliente (05/11, migración 033). "Policía" y "Otros" conservan el
  // id de "Policía de Córdoba" y "Otra". ETAC salió del catálogo y el DUAR pasó
  // a ser una dependencia de Policía (06/11).
  { id: '80ac6de6-9133-45f1-85c3-d3099894a45a', nombre: 'Policía' },
  { id: 'e9abb177-b4ff-4beb-9200-7c06f07deb5a', nombre: 'Bomberos Voluntarios' },
  { id: 'c120cfd5-4e0e-4ac0-baf9-40ac5f7dc4f8', nombre: 'Defensa Civil' },
  { id: 'fcc3e594-5ce6-44d7-8aa9-a6f5beb174e6', nombre: 'Guardia Local' },
  { id: '87e29fe7-ccfa-47e9-89eb-21b81dc7cb52', nombre: 'Gendarmería' },
  { id: '162f5957-16b5-4619-b49f-b2a09b8f42c0', nombre: 'Policía Federal' },
  { id: '1a88c42e-682f-4ade-aaea-cf30d9c185fd', nombre: 'Secretaría Gestión de Riesgo' },
  { id: '14a0e83e-3e0c-40b8-9cb9-5401bdad9c47', nombre: 'Otros' },
];

const ID_POLICIA = '80ac6de6-9133-45f1-85c3-d3099894a45a';
const ID_BOMBEROS_VOL = 'e9abb177-b4ff-4beb-9200-7c06f07deb5a';

/** Dependencias por institución: Policía (9) y Bomberos Voluntarios (14). */
export const catDotaciones: CatDotacion[] = [
  // Policía (05/11, migración 033)
  { id: 'd77c4166-5a55-4f44-aacc-43f69399ffd9', nombre: 'Investigaciones', institucionId: ID_POLICIA },
  { id: 'c4816e1e-a8df-4c71-a7f5-55575a443450', nombre: 'DUAR',            institucionId: ID_POLICIA, esDuar: true },
  { id: '4d7a2645-3f00-4b68-81f4-3f33c8365e78', nombre: 'Canes',           institucionId: ID_POLICIA },
  { id: '218c4c2f-54ed-4009-b103-1b19749b04f3', nombre: 'Drones',          institucionId: ID_POLICIA },
  { id: '7710eb28-4f2a-4811-9adf-7d5a5af8b9be', nombre: 'Caballería',      institucionId: ID_POLICIA },
  { id: '639d9a43-b25c-41e1-88b6-3c22d32ab89a', nombre: 'URD',             institucionId: ID_POLICIA },
  { id: '7805c1f7-a9bf-42d5-a848-fa6114f84388', nombre: 'Patrulla Rural',  institucionId: ID_POLICIA },
  { id: '9a80486a-d61b-49ae-af86-0fe8413421b2', nombre: 'Caminera',        institucionId: ID_POLICIA },
  { id: 'ff79ae43-b2a9-4d45-a5a2-87bb7222f8bd', nombre: 'Motos',           institucionId: ID_POLICIA },
  // Bomberos Voluntarios (05/11): las cuatro propias + las del DUAR menos Capital
  { id: 'b244f207-9dc1-4ddd-8a9a-3ceaca0dbc85', nombre: 'Villa Allende',                    institucionId: ID_BOMBEROS_VOL },
  { id: '1f0a2915-7969-4b5e-ba06-747785c643a6', nombre: 'Mendiolaza',                       institucionId: ID_BOMBEROS_VOL },
  { id: 'dbd0b0cc-6c64-4cdb-a856-eb00788f9e33', nombre: 'Saldán',                           institucionId: ID_BOMBEROS_VOL },
  { id: 'bab0371e-c2e0-4b12-b408-1da0af216e20', nombre: 'La Caldera',                       institucionId: ID_BOMBEROS_VOL },
  { id: '0935c5fc-e92d-4a89-869b-7bcca8560819', nombre: 'Miramar',                          institucionId: ID_BOMBEROS_VOL },
  { id: '79ab4b3d-f8ae-485c-8c45-fb486acf029a', nombre: 'Cruz del Eje',                     institucionId: ID_BOMBEROS_VOL },
  { id: 'a1139295-a804-4ff5-bf13-6f2ffe727244', nombre: 'Villa Cura Brochero (San Javier)', institucionId: ID_BOMBEROS_VOL },
  { id: 'af2d22f3-3496-4d97-8604-c11989e997d6', nombre: 'Dique La Viña',                    institucionId: ID_BOMBEROS_VOL },
  { id: '5b0c0d1e-6a2f-4e8b-9c3d-1f2a3b4c5d61', nombre: 'Carlos Paz (Villa Carlos Paz)',    institucionId: ID_BOMBEROS_VOL },
  { id: '5b0c0d1e-6a2f-4e8b-9c3d-1f2a3b4c5d62', nombre: 'Potrero de Garay',                 institucionId: ID_BOMBEROS_VOL },
  { id: '5b0c0d1e-6a2f-4e8b-9c3d-1f2a3b4c5d63', nombre: 'Dique Embalse (Río Tercero)',      institucionId: ID_BOMBEROS_VOL },
  { id: '5b0c0d1e-6a2f-4e8b-9c3d-1f2a3b4c5d64', nombre: 'Río Cuarto',                       institucionId: ID_BOMBEROS_VOL },
  { id: '5b0c0d1e-6a2f-4e8b-9c3d-1f2a3b4c5d65', nombre: 'Dique La Quebrada',                institucionId: ID_BOMBEROS_VOL },
  { id: '5b0c0d1e-6a2f-4e8b-9c3d-1f2a3b4c5d66', nombre: 'Otros',                            institucionId: ID_BOMBEROS_VOL },
];

export function getInstitucion(id?: string): CatInstitucion | undefined {
  return id ? catInstituciones.find(i => i.id === id) : undefined;
}

export function getDotacion(id?: string): CatDotacion | undefined {
  return id ? catDotaciones.find(d => d.id === id) : undefined;
}

/**
 * Dependencias (`cat_dotaciones`) de una institución.
 * El formulario muestra el desplegable "Dependencia" sólo si esto devuelve
 * algo: hoy Policía y Bomberos Voluntarios, sin ningún "if" por nombre.
 */
export function dotacionesDe(institucionId?: string): CatDotacion[] {
  return institucionId ? catDotaciones.filter(d => d.institucionId === institucionId) : [];
}

/** ¿Es Policía · DUAR? Se lee del catálogo (dependencia con esDuar), nunca del nombre. */
export function esDuar(u?: { dotacionId?: string }): boolean {
  return getDotacion(u?.dotacionId)?.esDuar ?? false;
}

/**
 * Regla del Líder (CU-23/23/25/27): sólo personal del DUAR puede conducir una
 * cuadrilla, porque son los capacitados para dar instrucciones en terreno.
 *
 * Se encapsula acá a propósito: si mañana el cliente habilita a otra fuerza,
 * se cambia esta única función y no los ~20 lugares que la consultan.
 */
export function puedeSerLider(u?: { dotacionId?: string }): boolean {
  return esDuar(u);
}

/** Etiqueta legible: "Policía · DUAR", "Bomberos Voluntarios · Saldán" o sólo "Defensa Civil". */
export function institucionLabel(u?: { institucionId?: string; dotacionId?: string }): string {
  const inst = getInstitucion(u?.institucionId);
  if (!inst) return '—';
  const dot = getDotacion(u?.dotacionId);
  return dot ? `${inst.nombre} · ${dot.nombre}` : inst.nombre;
}

/** Nombre de la especialidad del PERFIL GLOBAL a partir de su id (o '—'). */
export function especialidadNombrePorId(especialidadId?: string): string {
  if (!especialidadId) return '—';
  return catEspecialidades.find(e => e.id === especialidadId)?.nombre ?? '—';
}

/** Busca una especialidad del catálogo por su slug. */
export function getEspecialidad(slug?: Especialidad): CatEspecialidad | undefined {
  return slug ? catEspecialidades.find(e => e.slug === slug) : undefined;
}

/**
 * Catálogo de alergias — espejo de `cat_alergias`. Relación N:M real con el
 * usuario (`usuarios_alergias`): un agente puede tener más de una, por eso el
 * perfil global la referencia como `alergiaIds: string[]`, no como texto libre.
 * (El viejo campo `Usuario.alergias?: string` sigue existiendo aparte: lo usan
 * Registro.tsx y AgenteDashboard.tsx, que todavía no migraron a la API real.)
 */
export interface CatAlergia {
  id: string;
  nombre: string;
}

export const catAlergias: CatAlergia[] = [
  { id: '3543185c-cba2-46fc-a2f3-ece98cd3be4a', nombre: 'Penicilina (Amoxicilina)' },
  { id: '39bf8a20-39cd-4a5a-ae55-70c43824fb64', nombre: 'Antiinflamatorios' },
  { id: '31586d7d-f1b2-4bbb-b543-38a845784d7b', nombre: 'Anestesia local (Lidocaína)' },
  { id: 'f8db92bc-6ceb-4763-8efa-5a7a8ae1e61d', nombre: 'Yodo / Pervinox' },
  { id: '0e7bb52f-179b-435b-a4e3-66af8bb9aa88', nombre: 'Corticoides' },
  { id: 'faf58898-026b-4aed-92a0-59cccd7c8655', nombre: 'Picadura de abejas o avispas' },
  { id: '62facb83-09dd-405f-b3df-da4fd2960ed2', nombre: 'Picadura de hormigas o arañas' },
  { id: '73e86bdb-031e-49d7-8d40-54b7a48d89ce', nombre: 'Látex (Guantes médicos)' },
  { id: '1052f1c7-e3a0-4723-be8a-9b9f7fa7793d', nombre: 'Cintas adhesivas o apósitos' },
  // Existía en la base y faltaba acá (repaso en celular, 10/11).
  { id: '23bf4505-5c1b-4ef6-9ecf-ee8d8adb2546', nombre: 'Otras' },
];

/** Nombres de las alergias del usuario a partir de sus ids, para mostrar en tablas/detalle. */
export function alergiasNombres(alergiaIds?: string[]): string {
  if (!alergiaIds || alergiaIds.length === 0) return '—';
  return alergiaIds
    .map(id => catAlergias.find(a => a.id === id)?.nombre)
    .filter((n): n is string => !!n)
    .join(', ');
}

/**
 * ¿Esta especialidad es un recurso crítico?
 * Sin especialidad declarada ⇒ no se lo asume crítico.
 */
export function esRecursoCritico(especialidad?: Especialidad): boolean {
  return getEspecialidad(especialidad)?.esRecursoCritico ?? false;
}

/**
 * Infiere `esCaminante` a partir de la especialidad técnica (Decisión C).
 *
 *      esCaminante = NO es recurso crítico
 *
 * Se lee del catálogo en vez de una lista blanca hardcodeada: así una
 * especialidad nueva (Motos, Altura, Acuático...) queda clasificada de forma
 * explícita y no cae por omisión en "no camina", que es el error peligroso —
 * dejaría al agente fuera del rastrillaje y del Binomio Mínimo (CU-28).
 *
 * El Coordinador puede sobrescribirlo dentro del operativo, con advertencia (CU-19).
 */
export function inferirCaminante(especialidad?: Especialidad): boolean {
  return !esRecursoCritico(especialidad);
}

/**
 * Rastrilladores efectivos de un grupo (CU-28 · Binomio Mínimo).
 *
 * El conductor que se queda con el vehículo NO cuenta como rastrillador, aunque
 * siga perteneciendo al grupo. Por eso el criterio es `esCaminante`, no la mera
 * pertenencia: es exactamente lo que el negocio entiende por "salir a caminar".
 * Un conductor marcado también como caminante (la excepción táctica que el
 * Coordinador puede confirmar) sí cuenta.
 */
export function contarRastrilladores(agentes: AgenteOperativo[], grupoId: string): number {
  return agentes.filter(
    a => a.grupoId === grupoId && !a.fechaEgreso && a.esCaminante
  ).length;
}

export const climaMock = {
  actual: {
    temperatura: 14,
    sensacionTermica: 11,
    humedad: 68,
    viento: 22,
    descripcion: 'Parcialmente nublado',
    icono: '⛅',
    visibilidad: 8,
    presion: 1018,
  },
  pronostico: [
    { dia: 'Hoy', max: 17, min: 9, descripcion: 'Nublado', icono: '☁️', lluvia: 30 },
    { dia: 'Lun', max: 20, min: 11, descripcion: 'Soleado', icono: '☀️', lluvia: 5 },
    { dia: 'Mar', max: 18, min: 10, descripcion: 'Parcialmente nublado', icono: '⛅', lluvia: 15 },
    { dia: 'Mié', max: 15, min: 8, descripcion: 'Lluvia moderada', icono: '🌧️', lluvia: 80 },
    { dia: 'Jue', max: 16, min: 9, descripcion: 'Lluvias', icono: '🌦️', lluvia: 60 },
  ],
};

export const estadisticasMensuales = [
  { mes: 'Sep', operativos: 1 },
  { mes: 'Oct', operativos: 2 },
  { mes: 'Nov', operativos: 1 },
  { mes: 'Dic', operativos: 3 },
  { mes: 'Ene', operativos: 2 },
  { mes: 'Feb', operativos: 4 },
  { mes: 'Mar', operativos: 2 },
];
