export type Rol = 'administrador' | 'coordinador' | 'agente';
export type EstadoUsuario = 'activo' | 'inactivo' | 'eliminado';
export type EstadoOperativo = 'activo' | 'planificación' | 'inactivo' | 'nuevo' | 'finalizado' | 'eliminado' | 'en_proceso';
export type EstadoGrupo = 'rastrillando' | 'descansando' | 'inactivo';
export type EstadoSector = 'pendiente' | 'en_progreso' | 'completado';
/**
 * Especialidad TÉCNICA: lo que el agente SABE HACER.
 * "Conductor" ya NO es una especialidad — pasó a ser un estado logístico
 * booleano (`esConductor`) dentro de AgenteOperativo.
 *
 * Los valores espejan las filas reales de `cat_especialidades` (ver catEspecialidades).
 */
export type Especialidad =
  | 'paramédico'
  | 'bombero'
  | 'bombero voluntario'
  | 'canes'
  | 'defensa civil'
  | 'dron';
export type ShapeType = 'poligono' | 'circulo' | 'rectangulo';
export type TipoObjetivo = 'persona' | 'objeto';
/**
 * Estado TÁCTICO del agente dentro de un operativo (enum `estado_agente` en BD).
 * Los 7 valores del catálogo oficial.
 */
export type EstadoOperativoAgente =
  | 'disponible'
  | 'desplegado'
  | 'rastrillando'
  | 'descansando'
  | 'en_espera'
  | 'replegado'
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
  dotacion?: string;
  especialidad?: Especialidad;
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
   * Exclusivo del Coordinador (CU-17); el usuario no lo elige al registrarse.
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

export interface GrupoRastrillaje {
  id: string;
  nombre: string;
  lider: string;
  agenteIds: string[];
  estado: EstadoGrupo;
  sectorAsignado?: string;
  color: string;
  kmRecorridos: number;
}

export interface Sector {
  id: string;
  nombre: string;
  estado: EstadoSector;
  grupoAsignado?: string;
  area: number;
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
  descripcion?: string;
  objetivo?: string;
  objetivoBusqueda?: ObjetivoBusqueda;
  agenteIds: string[];
  grupoIds: string[];
  sectores: Sector[];
  puntos: PuntoInteres[];
  shapes?: MapShape[];
  historialPuestoComando?: HistorialPuestoCom[];
  kmRastrillados: number;
  coordinadorId: string;
  notaFinal?: string;       // reseña/conclusión al cerrar el operativo
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
}

export const initialData: AppData = {
  usuarios: [
    {
      id: 'u1',
      dni: '20123456',
      nombre: 'Admin',
      apellido: 'DUAR',
      email: 'admin@duar.cba.gob.ar',
      password: '1234',
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
      password: '1234',
      rol: 'coordinador',
      fechaNacimiento: '1984-06-14',
      telefono: '351-4201234',
      dotacion: 'DUAR Córdoba',
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
      password: '1234',
      rol: 'agente',
      fechaNacimiento: '1997-05-15',
      telefono: '351-5551001',
      especialidad: 'paramédico',
      grupo_sanguineo: 'A+',
      alergias: 'Ninguna',
      dotacion: 'DUAR Champaquí',
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
      password: '1234',
      rol: 'agente',
      fechaNacimiento: '1991-03-22',
      telefono: '351-5552002',
      especialidad: 'bombero',
      grupo_sanguineo: 'O+',
      alergias: 'Polen',
      dotacion: 'Bomberos Córdoba',
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
      password: '1234',
      rol: 'agente',
      fechaNacimiento: '1999-07-08',
      telefono: '351-5553003',
      // 'Conductor' ya no es especialidad: es esConductor en AgenteOperativo
      grupo_sanguineo: 'B-',
      alergias: 'Ninguna',
      dotacion: 'DUAR Córdoba',
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
      password: '1234',
      rol: 'agente',
      fechaNacimiento: '1988-11-30',
      telefono: '351-5554004',
      especialidad: 'bombero voluntario',
      grupo_sanguineo: 'AB+',
      alergias: 'Penicilina',
      dotacion: 'Bomberos Voluntarios Alta Gracia',
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
      password: '1234',
      rol: 'agente',
      fechaNacimiento: '1995-04-12',
      telefono: '351-5555005',
      especialidad: 'paramédico',
      grupo_sanguineo: 'O-',
      alergias: 'Ninguna',
      dotacion: 'DUAR Traslasierra',
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
      password: '1234',
      rol: 'agente',
      fechaNacimiento: '1982-09-25',
      telefono: '351-5556006',
      // 'Conductor' ya no es especialidad: es esConductor en AgenteOperativo
      grupo_sanguineo: 'A-',
      alergias: 'Aspirina',
      dotacion: 'DUAR Córdoba',
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
      password: '1234',
      rol: 'agente',
      fechaNacimiento: '2001-01-17',
      telefono: '351-5557007',
      especialidad: 'bombero',
      grupo_sanguineo: 'B+',
      alergias: 'Ninguna',
      dotacion: 'Bomberos Córdoba',
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
      password: '1234',
      rol: 'agente',
      fechaNacimiento: '1986-06-03',
      telefono: '351-5558008',
      // 'Conductor' ya no es especialidad: es esConductor en AgenteOperativo
      grupo_sanguineo: 'A+',
      alergias: 'Ninguna',
      dotacion: 'DUAR Córdoba',
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
      sectorAsignado: 's1',
      color: '#E54B4B',
      kmRecorridos: 4.2,
    },
    {
      id: 'g2',
      nombre: 'Grupo Beta',
      lider: 'u5',
      agenteIds: ['u5', 'u6'],
      estado: 'rastrillando',
      sectorAsignado: 's7',
      color: '#FFA987',
      kmRecorridos: 3.1,
    },
    {
      id: 'g3',
      nombre: 'Grupo Delta',
      lider: 'u7',
      agenteIds: ['u7', 'u9'],
      estado: 'rastrillando',
      sectorAsignado: 's9',
      color: '#444140',
      kmRecorridos: 2.7,
    },
    {
      id: 'g4',
      nombre: 'Grupo Gamma',
      lider: 'u10',
      agenteIds: ['u10'],
      estado: 'inactivo',
      color: '#c0392b',
      kmRecorridos: 0,
    },
  ],

  operativos: [
    {
      id: 'op1',
      nombre: 'Búsqueda Cerro Champaquí',
      estado: 'activo',
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
      sectores: [
        { id: 's1', nombre: 'Sector Norte', estado: 'en_progreso', grupoAsignado: 'g1', area: 12 },
        { id: 's2', nombre: 'Sector Sur', estado: 'pendiente', area: 8 },
        { id: 's3', nombre: 'Sector Este', estado: 'pendiente', area: 10 },
        { id: 's4', nombre: 'Sector Oeste', estado: 'completado', area: 6 },
      ],
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
      sectores: [],
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
      sectores: [
        { id: 's5', nombre: 'Sector Lago', estado: 'completado', area: 15 },
        { id: 's6', nombre: 'Sector Montaña', estado: 'completado', area: 12 },
      ],
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
      sectores: [],
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
      descripcion: 'Búsqueda activa de menor de edad en zona periurbana. Equipos desplegados en cuatro sectores.',
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
      sectores: [
        { id: 's7', nombre: 'Sector Urbano', estado: 'en_progreso', grupoAsignado: 'g2', area: 5 },
        { id: 's8', nombre: 'Sector Periurbano', estado: 'pendiente', area: 9 },
      ],
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
      sectores: [
        { id: 's9', nombre: 'Sendero Principal', estado: 'en_progreso', grupoAsignado: 'g3', area: 7 },
        { id: 's10', nombre: 'Quebrada Baja', estado: 'pendiente', grupoAsignado: 'g4', area: 11 },
      ],
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
   *  · Conductor en grupo RASTRILLANDO queda en 'en_espera' (se queda con el vehículo).
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
    // u5 es conductor: el grupo está rastrillando, así que quedó 'en_espera' en el vehículo.
    { id: 'ao7', usuarioId: 'u5', operativoId: 'op5', estado: 'en_espera',    esCaminante: false, esConductor: true,  grupoId: 'g2', fechaIngreso: '2026-03-10T08:00:00.000Z' },
    { id: 'ao8', usuarioId: 'u6', operativoId: 'op5', estado: 'rastrillando', esCaminante: true,  esConductor: false, grupoId: 'g2', fechaIngreso: '2026-03-10T08:00:00.000Z' },

    // ── op6 · Quebrada del Condorito (en proceso) · g3 rastrillando, g4 en formación ──
    { id: 'ao9',  usuarioId: 'u7',  operativoId: 'op6', estado: 'desplegado',   esCaminante: false, esConductor: false, grupoId: 'g3', fechaIngreso: '2026-03-17T06:30:00.000Z' },
    { id: 'ao10', usuarioId: 'u9',  operativoId: 'op6', estado: 'rastrillando', esCaminante: true,  esConductor: false, grupoId: 'g3', fechaIngreso: '2026-03-17T06:30:00.000Z' },
    { id: 'ao11', usuarioId: 'u10', operativoId: 'op6', estado: 'disponible',   esCaminante: false, esConductor: true,  grupoId: 'g4', fechaIngreso: '2026-03-17T06:30:00.000Z' },
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
 * Reglas de negocio de los estados logísticos (CU-17, CU-18, CU-26)
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
}

export const catEspecialidades: CatEspecialidad[] = [
  { id: 'f9152846-4fe6-4cbe-9cb2-69e2549a5fae', nombre: 'Paramedico',         slug: 'paramédico',          esRecursoCritico: true  },
  { id: '328cf95c-6ee2-446a-bba7-197e0f00b322', nombre: 'Dron',               slug: 'dron',                esRecursoCritico: true  },
  { id: '788ad70e-d044-48e3-b6b2-5b7f265ee106', nombre: 'Bombero',            slug: 'bombero',             esRecursoCritico: false },
  { id: '515dcdee-7b3b-4c4e-8161-c070254df8de', nombre: 'Bombero Voluntario', slug: 'bombero voluntario',  esRecursoCritico: false },
  { id: 'eb010f9d-406e-4248-ba27-d88ca045ca4f', nombre: 'Canes',              slug: 'canes',               esRecursoCritico: false },
  { id: 'e0322446-d6eb-4335-85e3-558d484e2334', nombre: 'Defensa Civil',      slug: 'defensa civil',       esRecursoCritico: false },
];

/** Busca una especialidad del catálogo por su slug. */
export function getEspecialidad(slug?: Especialidad): CatEspecialidad | undefined {
  return slug ? catEspecialidades.find(e => e.slug === slug) : undefined;
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
 * especialidad nueva (Canes, Defensa Civil, Dron...) queda clasificada de forma
 * explícita y no cae por omisión en "no camina", que es el error peligroso —
 * dejaría al agente fuera del rastrillaje y del Binomio Mínimo (CU-26).
 *
 * El Coordinador puede sobrescribirlo dentro del operativo, con advertencia (CU-17).
 */
export function inferirCaminante(especialidad?: Especialidad): boolean {
  return !esRecursoCritico(especialidad);
}

/**
 * Rastrilladores efectivos de un grupo (CU-26 · Binomio Mínimo).
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