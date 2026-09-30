/**
 * Cliente de la API del Sistema DUAR.
 *
 * Único lugar del frontend que sabe cómo se habla con el backend: si mañana
 * cambia la URL base o el esquema de autenticación, se toca sólo este archivo.
 *
 * El token de sesión se guarda en localStorage y viaja en cada request como
 * `Authorization: Bearer`. Es un token OPACO: el servidor lo valida contra la
 * tabla `sesiones_activas` (Decisión E), así que puede revocarse al instante.
 */

const TOKEN_KEY = 'duar-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Error de API que conserva el status HTTP y el motivo que envió el backend.
 *
 * `datos` guarda el cuerpo completo de la respuesta: hay rechazos que traen
 * información necesaria para decidir qué mostrar. El caso concreto es la Regla
 * de Ubicuidad (CU-15 paso 6.2), donde el 409 incluye qué operativo ocupa hoy
 * al agente para poder nombrarlo en el modal.
 */
export class ApiError extends Error {
  status: number;
  motivo?: string;
  datos: Record<string, unknown>;
  constructor(message: string, status: number, motivo?: string, datos: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.motivo = motivo;
    this.datos = datos;
  }
}

/** Común a `request` y `requestFormData`: 204/error/401, nunca duplicado entre las dos. */
async function manejarRespuesta<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  const cuerpo = await res.json().catch(() => ({}));

  if (!res.ok) {
    // 401 = el token dejó de valer (expiró o lo revocaron): se limpia la sesión
    // local y se avisa a la app. El evento es necesario porque este módulo no
    // puede tocar el estado de React; sin él, la interfaz seguiría mostrando al
    // usuario adentro mientras cada request falla.
    if (res.status === 401) {
      setToken(null);
      window.dispatchEvent(new Event('duar:sesion-expirada'));
    }
    throw new ApiError(cuerpo.error ?? `Error ${res.status}`, res.status, cuerpo.motivo, cuerpo);
  }

  return cuerpo as T;
}

async function request<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opciones.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${ruta}`, { ...opciones, headers });
  return manejarRespuesta<T>(res);
}

/**
 * Variante para `multipart/form-data` (subida de fotos — CU-12/13). No puede
 * reusar `request`: ese fuerza `Content-Type: application/json`, y el
 * navegador necesita fijar el `Content-Type` de un FormData él solo (lleva el
 * boundary del multipart, que no se puede armar a mano).
 */
async function requestFormData<T>(ruta: string, formData: FormData, method: 'POST' | 'PUT' = 'POST'): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${ruta}`, { method, headers, body: formData });
  return manejarRespuesta<T>(res);
}

export const api = {
  get:  <T>(ruta: string) => request<T>(ruta),
  post: <T>(ruta: string, body?: unknown) =>
    request<T>(ruta, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put:  <T>(ruta: string, body?: unknown) =>
    request<T>(ruta, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del:  <T>(ruta: string) => request<T>(ruta, { method: 'DELETE' }),
};

/* ── Tipos que devuelve el backend ──────────────────────────────────────── */

export interface UsuarioApi {
  id: string;
  dni: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  // El backend ya lo devuelve (usuario.model.js), pero faltaba en este
  // contrato: por eso la fecha de nacimiento se guardaba bien pero al
  // reabrir el formulario de edición aparecía vacía.
  fechaNacimiento: string | null;
  rol: string;
  rolId: string;
  institucionId: string | null;
  institucionNombre: string | null;
  esDuar: boolean;
  dotacionId: string | null;
  dotacionNombre: string | null;
  especialidadId: string | null;
  especialidadNombre: string | null;
  grupoSanguineo: string | null;
  estado: string;
  alergias: { id: string; nombre: string }[];
  emailConfirmado: boolean;
}

export interface Catalogos {
  roles: { id: string; nombre: string }[];
  instituciones: { id: string; nombre: string; esDuar: boolean }[];
  dotaciones: { id: string; nombre: string; institucionId: string }[];
  especialidades: { id: string; nombre: string; esRecursoCritico: boolean }[];
  alergias: { id: string; nombre: string }[];
}

/* ── Endpoints ──────────────────────────────────────────────────────────── */

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; usuario: UsuarioApi }>('/auth/login', { email, password }),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<{ usuario: UsuarioApi }>('/auth/me'),

  /** CU-02 paso 7 — confirmar cuenta con el token que llega por correo. */
  confirmarEmail: (token: string) =>
    api.get<{ estado: 'ok' | 'ya_confirmado' }>(`/auth/confirmar-email/${token}`),

  /**
   * CU-03 paso 3-5. El backend SIEMPRE responde igual, exista o no ese email
   * ("invisibilidad de datos") — no hay forma de que este llamado falle por
   * "no encontrado".
   */
  solicitarRecuperacion: (email: string) =>
    api.post<{ mensaje: string }>('/auth/recuperar-contrasena', { email }),

  /** Chequea el link ANTES de mostrar el formulario (CU-03 paso 6.1). */
  chequearTokenRecuperacion: (token: string) =>
    api.get<{ valido: true }>(`/auth/recuperar-contrasena/${token}`),

  /** CU-03 pasos 8-9. */
  restablecerContrasena: (token: string, password: string) =>
    api.post<{ mensaje: string }>('/auth/restablecer-contrasena', { token, password }),

  /** Portal del Agente: su alta activa ahora mismo, o null si no tiene. */
  miOperativoActual: () => api.get<{ operativo: OperativoApi | null }>('/mi-operativo'),

  /**
   * Reenvío de confirmación a pedido del propio agente (self-service).
   * Si está en cooldown, el backend responde 409/429 con
   * `motivo: 'cooldown'` y `datos.segundos` restantes.
   */
  reenviarConfirmacion: () => api.post<{ mensaje: string }>('/auth/reenviar-confirmacion'),

  /**
   * Autoedición: el agente edita sus propios datos. El backend ignora — por
   * más que se manden — dni, email, estado y rol; eso queda reservado al
   * panel de Usuarios (admin/coordinador).
   */
  actualizarMisDatos: (datos: Partial<CrearUsuarioPayload>) =>
    api.put<{ usuario: UsuarioApi }>('/auth/me', datos),
};

export const catalogosApi = {
  todos: () => api.get<Catalogos>('/catalogos'),
};

/** ¿Está la API arriba? Se usa para avisar si falta levantar el backend. */
export async function apiDisponible(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch {
    return false;
  }
}

/* ── Usuarios (Módulo 2 · CU-04..07) ────────────────────────────────────── */

export interface CrearUsuarioPayload {
  dni: string;
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: string;
  telefono?: string;
  institucionId?: string;
  dotacionId?: string;
  especialidadId?: string;
  grupoSanguineo?: string;
  fechaNacimiento?: string;
  /** CU-06: sólo se envía al editar (Activo/Inactivo). ELIMINADO se rechaza
   *  del lado del servidor — para eso está el endpoint DELETE (CU-07), que
   *  hace las validaciones de autobloqueo y último administrador. */
  estado?: string;
  /** N:M real contra cat_alergias. `[]` vacía las alergias deliberadamente;
   *  `undefined` (al editar) significa "no tocar". */
  alergiaIds?: string[];
}

/* ── Flujo QR: CU-15 Generar QR · CU-02 Registro · alta en operativo ─────── */

export interface QRTokenApi {
  id: string;
  token: string;
  creadoEn: string;
  expiraEn: string;
}

export interface OperativoQRApi {
  id: string;
  titulo: string;
  localidad: string;
  estado: string;
  fechaHoraInicio: string;
}

export interface AgenteOperativoApi {
  id: string;
  usuarioId: string;
  operativoId: string;
  estado: string;
  grupoId: string | null;
  esConductor: boolean;
  especialidadId: string | null;
  fechaIngreso: string;
  fechaEgreso: string | null;
}

/** Lo que el agente completa al registrarse por QR (CU-02 paso 3). */
export interface RegistroQRPayload {
  qrToken: string;
  dni: string;
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  telefono?: string;
  fechaNacimiento?: string;
  institucionId?: string;
  dotacionId?: string;
  especialidadId?: string;
  grupoSanguineo?: string;
  alergiaIds?: string[];
  // `esConductor` NO va acá a propósito: es táctico y lo decide el
  // Coordinador (CU-17), no el agente.
}

export const qrApi = {
  /** CU-15 pasos 4-5 · público: ¿a qué operativo da acceso este QR? */
  validar: (token: string) =>
    api.get<{ operativo: OperativoQRApi; expiraEn: string }>(`/qr/${token}`),

  /** CU-15 pasos 1-2 · el Coordinador obtiene el QR vigente (o uno nuevo). */
  obtener: (operativoId: string) =>
    api.get<{ qr: QRTokenApi; operativo: { id: string; titulo: string } }>(
      `/operativos/${operativoId}/qr`
    ),

  /** CU-15 Observaciones · "Control de Puerta": invalida el QR filtrado. */
  refrescar: (operativoId: string) =>
    api.post<{ qr: QRTokenApi; operativo: { id: string; titulo: string } }>(
      `/operativos/${operativoId}/qr/refrescar`
    ),

  /** CU-19 · grilla del Coordinador (se consulta por polling). */
  personal: (operativoId: string) =>
    api.get<{ personal: unknown[] }>(`/operativos/${operativoId}/personal`),
};

export const registroApi = {
  /** CU-02 · crea el perfil global y deja la sesión abierta. */
  registrar: (datos: RegistroQRPayload) =>
    api.post<{ token: string; usuario: UsuarioApi; operativo: OperativoQRApi }>(
      '/auth/registro',
      datos
    ),

  /**
   * CU-15 pasos 6-8 · alta en el operativo.
   * Si el agente ya está en otro, el backend responde 409 con
   * `motivo: 'regla_ubicuidad'`; hay que repetir con `abandonarAnterior: true`
   * sólo después de que el agente lo confirme en el modal.
   */
  altaEnOperativo: (operativoId: string, qrToken: string, abandonarAnterior = false) =>
    api.post<{ agente: AgenteOperativoApi; abandonoAnterior: boolean }>(
      `/operativos/${operativoId}/alta`,
      { qrToken, abandonarAnterior }
    ),
};

/* ── Operativos (Módulo 3 · CU-08..11) ──────────────────────────────────── */

export interface OperativoApi {
  id: string;
  titulo: string;
  localidad: string;
  fiscalInstruccion: string;
  descripcion: string | null;
  estado: string;
  fechaHoraInicio: string;
  fechaHoraFin: string | null;
  coordinadorId: string;
  puntoCeroLat: number;
  puntoCeroLng: number;
  creadoEn: string;
  cantidadAgentes: number;
  /** CU-12/13/14: si ya tiene una ficha de objetivo cargada. */
  tieneObjetivo: boolean;
  /**
   * Vista previa liviana para las cards del listado (CU-11) — sin fotos ni el
   * resto de los datos. Sólo viene poblada en `operativosApi.listar()`;
   * `obtener`/`crear`/`actualizar` no traen este JOIN.
   */
  objetivoTipo?: 'PERSONA' | 'OBJETO' | null;
  objetivoNombre?: string | null;
  objetivoApellido?: string | null;
}

export interface CrearOperativoPayload {
  titulo: string;
  localidad: string;
  fiscalInstruccion: string;
  descripcion?: string;
  puntoCeroLat: number;
  puntoCeroLng: number;
  fechaHoraInicio: string;
}

export const operativosApi = {
  /** CU-11. `estado`: 'vigentes' | 'all' | un valor del ENUM en mayúsculas. */
  listar: (params?: { busqueda?: string; estado?: string }) => {
    const qs = new URLSearchParams();
    if (params?.busqueda) qs.set('busqueda', params.busqueda);
    if (params?.estado) qs.set('estado', params.estado);
    const suffix = qs.toString() ? `?${qs}` : '';
    return api.get<{ operativos: OperativoApi[] }>(`/operativos${suffix}`);
  },
  obtener: (id: string) => api.get<{ operativo: OperativoApi }>(`/operativos/${id}`),
  crear: (datos: CrearOperativoPayload) =>
    api.post<{ operativo: OperativoApi }>('/operativos', datos),
  actualizar: (id: string, datos: Partial<CrearOperativoPayload>) =>
    api.put<{ operativo: OperativoApi }>(`/operativos/${id}`, datos),
  /** CU-08 paso 8: transición NUEVO → ACTIVO al entrar. Idempotente. */
  activar: (id: string) => api.post<{ operativo: OperativoApi }>(`/operativos/${id}/activar`),
  /** CU-10: cierra el operativo y libera a todo el personal asignado. */
  finalizar: (id: string, notaFinal?: string) =>
    api.post<{ operativo: OperativoApi }>(`/operativos/${id}/finalizar`, { notaFinal }),
  /** Baja lógica — el backend sólo la permite si sigue en estado NUEVO. */
  eliminar: (id: string) => api.del<void>(`/operativos/${id}`),
};

export const usuariosApi = {
  listar: () => api.get<{ usuarios: UsuarioApi[] }>('/usuarios'),
  crear: (datos: CrearUsuarioPayload) =>
    api.post<{ usuario: UsuarioApi }>('/usuarios', datos),
  actualizar: (id: string, datos: Partial<CrearUsuarioPayload>) =>
    api.put<{ usuario: UsuarioApi }>(`/usuarios/${id}`, datos),
  eliminar: (id: string) => api.del<void>(`/usuarios/${id}`),
  auditoria: (id: string) =>
    api.get<{ eventos: unknown[] }>(`/usuarios/${id}/auditoria`),
  /** Reenvío a pedido del coordinador/admin, para un usuario en estado PENDIENTE. */
  reenviarConfirmacion: (id: string) =>
    api.post<{ mensaje: string }>(`/usuarios/${id}/reenviar-confirmacion`),
};

/**
 * Encarnación TÁCTICA de un usuario en UN operativo (Decisión A). Es lo que
 * devuelve `GET /:id/personal` (CU-19), ya con el JOIN a `usuarios` resuelto
 * — por eso trae nombre/dni/etc. además de los campos propios de la fila.
 */
export interface PersonalOperativoApi {
  id: string;
  usuarioId: string;
  operativoId: string;
  /** Uno de los 7 de `estado_agente` (migración 010). Con grupo, lo define el grupo. */
  estado: EstadoAgenteApi;
  /** ISO. Último cambio de `estado` — alimenta el "disponible hace 30 min". */
  estadoActualizadoEn: string;
  grupoId: string | null;
  /** Maneja la camioneta: no rastrilla y entra a cualquier grupo (29/09). */
  esConductor: boolean;
  especialidadId: string | null;
  fechaIngreso: string;
  fechaEgreso: string | null;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string | null;
  grupoSanguineo: string | null;
  especialidadNombre: string | null;
  institucionNombre: string | null;
  esDuar: boolean;
  /** Su especialidad táctica es de recurso especial (dron, canes, paramédico, caballería, buzos). */
  esRecursoCritico: boolean;
}

export const agentesOperativoApi = {
  /** CU-19: personal actualmente en el operativo. */
  listar: (operativoId: string) =>
    api.get<{ personal: PersonalOperativoApi[] }>(`/operativos/${operativoId}/personal`),
  /** CU-17: alta directa por el Coordinador (sin QR). */
  agregar: (operativoId: string, datos: { usuarioId: string; especialidadId?: string; abandonarAnterior?: boolean }) =>
    api.post<{ agente: PersonalOperativoApi }>(`/operativos/${operativoId}/agentes`, datos),
  /**
   * CU-17: datos tácticos. `estado` sólo para quien NO está en un grupo
   * (Disponible / No disponible); con grupo el backend responde 409 `agente_en_grupo`.
   */
  actualizar: (operativoId: string, usuarioId: string, datos: { estado?: EstadoAgenteApi; especialidadId?: string | null; esConductor?: boolean }) =>
    api.put<{ agente: PersonalOperativoApi }>(`/operativos/${operativoId}/agentes/${usuarioId}`, datos),
  /** Baja lógica: cierra la participación, no toca al Usuario global. */
  quitar: (operativoId: string, usuarioId: string) =>
    api.del<void>(`/operativos/${operativoId}/agentes/${usuarioId}`),
};

/* ── Grupos de Trabajo (Módulo 4 · CU-21..26) ────────────────────────────── */
/* Modelo de estados del 24/09 (migración 010).                              */

/** Los 7 de `estado_agente`. */
export type EstadoAgenteApi =
  | 'DISPONIBLE' | 'AGRUPADO' | 'DESPLEGADO' | 'RASTRILLANDO' | 'REPLEGADO' | 'EN_ESPERA' | 'NO_DISPONIBLE';

/**
 * Clase del grupo (migración 012, 26/09). Se elige al crear y no cambia:
 *  · RASTRILLAJE → sólo agentes que caminan; Líder del DUAR, mínimo 2 y binomio.
 *  · ESPECIAL    → recursos especiales, con agentes de apoyo; Líder libre, sin binomio.
 */
export type ClaseGrupoApi = 'RASTRILLAJE' | 'ESPECIAL';

/** Los 8 de `estado_grupo`. DISUELTO sólo se alcanza disolviendo (CU-25). */
export type EstadoGrupoApi =
  | 'EN_FORMACION' | 'CONFIRMADO' | 'ASIGNADO' | 'DESPLEGADO' | 'RASTRILLANDO' | 'REPLEGADO' | 'EN_ESPERA' | 'DISUELTO';

/** Lo que pasa en el terreno: lo informa el Líder o lo registra el coordinador por radio. */
export type AccionTerreno = 'salir' | 'llegar_poligono' | 'volver' | 'llegar_base';

/** Acciones del coordinador sobre un grupo (disolver va aparte). */
export type AccionGrupo = 'confirmar' | 'asignar' | 'reabrir' | AccionTerreno | 'corregir';

export interface IntegranteGrupoApi {
  /** id de `agentes_operativo` (el alta táctica), no del usuario. */
  id: string;
  usuarioId: string;
  nombre: string;
  apellido: string;
  dni: string;
  estado: EstadoAgenteApi;
  estadoActualizadoEn: string;
  esConductor: boolean;
  esDuar: boolean;
  especialidadNombre: string | null;
  esRecursoCritico: boolean;
}

export interface GrupoApi {
  id: string;
  operativoId: string;
  nombre: string;
  estado: EstadoGrupoApi;
  clase: ClaseGrupoApi;
  /** `agentes_operativo.id` del Líder. null si el Líder se trasladó a otro operativo. */
  liderId: string | null;
  color: string | null;
  creadoEn: string;
  estadoActualizadoEn: string;
  /** Cuántos integrantes rastrillan: todos menos el conductor (el binomio cuenta éstos). */
  rastrillan: number;
  /** De rastrillaje, en el terreno y con uno solo rastrillando. Calculado, no guardado. */
  alertaBinomio: boolean;
  /** Hasta el CU-28 (Módulo 5), la zona es la descripción que cargó el coordinador al asignar. */
  zonaAsignada: string | null;
  /** El Líder primero, después por apellido. */
  integrantes: IntegranteGrupoApi[];
}

/** Un evento de la línea de tiempo (tabla `eventos_estado`). */
export interface EventoEstadoApi {
  id: string;
  entidad: 'GRUPO' | 'AGENTE';
  accion: string;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  /** Cuándo pasó (celular del Líder, o la hora que cargó el coordinador). */
  ocurridoEn: string;
  /** Cuándo llegó al servidor. */
  registradoEn: string;
  fuente: 'PORTAL_LIDER' | 'PORTAL_AGENTE' | 'COORDINADOR' | 'RADIO' | 'CASCADA' | 'SISTEMA' | 'QR';
  resultado: 'APLICADO' | 'CONFIRMACION' | 'SUPERADO' | 'RECHAZADO';
  motivo: string | null;
  nota: string | null;
  horaConfiable: boolean;
  grupoId: string | null;
  grupoNombre: string | null;
  agenteOperativoId: string | null;
  agenteNombre: string | null;
  registradoPorNombre: string | null;
  eventoOrigenId: string | null;
  origenAccion: string | null;
  origenFuente: string | null;
  /** Otras vías por las que llegó el mismo hecho (radio + celular). */
  confirmaciones: { fuente: string; ocurridoEn: string; registradoEn: string; horaConfiable: boolean; registradoPorNombre: string | null }[];
}

export interface ArmadoAutomaticoApi {
  creados: { id: string; nombre: string; integrantes: number }[];
  asignados: number;
  sinAsignar: { id: string; nombre: string; apellido: string }[];
  /** true si se armaron menos grupos de los pedidos por falta de líderes DUAR (CU-22 5.1). */
  limitadoPorLideres: boolean;
}

export const gruposApi = {
  /** CU-23 */
  listar: (operativoId: string) =>
    api.get<{ grupos: GrupoApi[] }>(`/operativos/${operativoId}/grupos`),
  /** CU-21. En un grupo especial el Líder puede ser cualquiera; en uno de rastrillaje, del DUAR. */
  crear: (operativoId: string, datos: { nombre: string; liderId: string; clase: ClaseGrupoApi }) =>
    api.post<{ grupo: GrupoApi }>(`/operativos/${operativoId}/grupos`, datos),
  /** CU-22 */
  armadoAutomatico: (operativoId: string, tamano: number) =>
    api.post<ArmadoAutomaticoApi>(`/operativos/${operativoId}/grupos/automatico`, { tamano }),
  /** CU-24: nombre y Líder (el Líder sólo con el grupo En formación). El estado va por `accion`. */
  actualizar: (operativoId: string, grupoId: string, datos: { nombre?: string; liderId?: string }) =>
    api.put<{ grupo: GrupoApi }>(`/operativos/${operativoId}/grupos/${grupoId}`, datos),
  /**
   * Cambiar el estado de un grupo. Las acciones del terreno quedan registradas
   * como aviso de radio; `ocurridoEn` es la hora en que pasó, si el aviso llegó tarde.
   * Si el mismo hecho ya estaba registrado, `resultado` es CONFIRMACION.
   */
  accion: (operativoId: string, grupoId: string, datos: {
    accion: AccionGrupo; ocurridoEn?: string; zona?: string; motivo?: string; estadoDestino?: EstadoGrupoApi;
  }) => api.post<{ grupo: GrupoApi; resultado: EventoEstadoApi['resultado'] }>(`/operativos/${operativoId}/grupos/${grupoId}/acciones`, datos),
  /** CU-21 paso 6 / CU-24: arrastrar, sólo con grupos En formación. `destinoGrupoId: null` = "Sin grupo". */
  mover: (operativoId: string, agenteOperativoId: string, destinoGrupoId: string | null) =>
    api.post<{ agente: unknown }>(`/operativos/${operativoId}/grupos/mover`, { agenteOperativoId, destinoGrupoId }),
  /** CU-26: el retirado queda Replegado y sin grupo. */
  extraer: (operativoId: string, grupoId: string, datos: {
    agenteOperativoId: string; motivo: string; nuevoLiderId?: string; riesgoAceptado?: boolean;
  }) => api.post<{ grupo: GrupoApi; alertaBinomio: boolean }>(`/operativos/${operativoId}/grupos/${grupoId}/extraer`, datos),
  /** CU-25 (baja lógica, sólo desde la base) */
  disolver: (operativoId: string, grupoId: string) =>
    api.del<void>(`/operativos/${operativoId}/grupos/${grupoId}`),
  /** La historia de un grupo. */
  lineaTiempo: (operativoId: string, grupoId: string) =>
    api.get<{ eventos: EventoEstadoApi[] }>(`/operativos/${operativoId}/grupos/${grupoId}/linea-tiempo`),
  /** El día de una persona en el operativo (por su alta, `agentes_operativo.id`). */
  lineaTiempoAgente: (operativoId: string, agenteOperativoId: string) =>
    api.get<{ eventos: EventoEstadoApi[] }>(`/operativos/${operativoId}/agentes/${agenteOperativoId}/linea-tiempo`),
};

/* ── Portal del agente (Módulo 4) ───────────────────────────────────────── */

export interface MiEstadoApi {
  id: string;
  operativoId: string;
  estado: EstadoAgenteApi;
  estadoActualizadoEn: string;
  grupoId: string | null;
}

/** Un aviso que el Líder toca en su celular (se envía en el momento; sin señal, va por radio). */
export interface EventoPortalApi {
  id: string;
  grupoId: string;
  accion: AccionTerreno;
  /** La hora en que se tocó el botón. */
  ocurridoEn: string;
}

export const portalApi = {
  /** Mi estado y mi grupo (con `soyLider`), o nulls si no estoy en ningún operativo. */
  miGrupo: () =>
    api.get<{ agente: MiEstadoApi | null; grupo: (GrupoApi & { soyLider: boolean }) | null }>('/mi-grupo'),
  /** El Líder informa lo que pasó. Van en lote y en orden; cada uno vuelve con su resultado. */
  enviarEventos: (eventos: EventoPortalApi[]) =>
    api.post<{
      resultados: { id: string; resultado: EventoEstadoApi['resultado']; mensaje?: string }[];
      grupo: (GrupoApi & { soyLider: boolean }) | null;
    }>('/mi-grupo/eventos', { eventos }),
  /** El agente SIN grupo se marca Disponible o No disponible. */
  cambiarMiEstado: (estado: 'DISPONIBLE' | 'NO_DISPONIBLE') =>
    api.put<{ agente: MiEstadoApi }>('/mi-estado', { estado }),
};

/* ── Objetivo Buscado (Módulo 3 · CU-12..14) ─────────────────────────────── */

export interface FotoObjetivoApi {
  id: string;
  /** URL firmada de Supabase Storage — expira; se regenera en cada GET. */
  url: string | null;
}

/**
 * Una ficha por operativo (`objetivo_buscado.operativo_id` es UNIQUE).
 * Persona y Objeto comparten la misma fila: `tipo` dice cuál bloque de
 * campos es el vigente — el otro bloque viaja en null.
 */
export interface ObjetivoApi {
  id: string;
  operativoId: string;
  tipo: 'PERSONA' | 'OBJETO';
  // Persona
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  nacionalidad: string | null;
  edad: number | null;
  estatura: number | null; // centímetros
  genero: 'MASCULINO' | 'FEMENINO' | 'OTRO' | null;
  complexionFisica: string | null;
  colorPiel: string | null;
  colorOjos: string | null;
  colorPelo: string | null;
  vestimenta: string | null;
  detallesAdicionales: string | null;
  // Objeto
  tipoObjeto: string | null;
  color: string | null;
  marca: string | null;
  modelo: string | null;
  dimensionAlto: number | null;  // centímetros
  dimensionAncho: number | null; // centímetros
  dimensionLargo: number | null; // centímetros
  creadoEn: string;
  actualizadoEn: string;
  fotos: FotoObjetivoApi[];
}

export type CrearObjetivoPayload = Partial<Omit<ObjetivoApi, 'id' | 'operativoId' | 'creadoEn' | 'actualizadoEn' | 'fotos'>> & {
  tipo: 'PERSONA' | 'OBJETO';
};

export const objetivoApi = {
  /** CU-14: 404 con motivo 'sin_objetivo' si todavía no se cargó la ficha. */
  obtener: (operativoId: string) =>
    api.get<{ objetivo: ObjetivoApi }>(`/operativos/${operativoId}/objetivo`),
  /** CU-12. */
  crear: (operativoId: string, datos: CrearObjetivoPayload) =>
    api.post<{ objetivo: ObjetivoApi }>(`/operativos/${operativoId}/objetivo`, datos),
  /** CU-13. */
  actualizar: (operativoId: string, datos: Partial<CrearObjetivoPayload>) =>
    api.put<{ objetivo: ObjetivoApi }>(`/operativos/${operativoId}/objetivo`, datos),
  /** Requiere que la ficha ya exista (CU-12 primero). Hasta 8 fotos por vez. */
  subirFotos: (operativoId: string, archivos: File[]) => {
    const formData = new FormData();
    archivos.forEach(a => formData.append('fotos', a));
    return requestFormData<{ objetivo: ObjetivoApi }>(`/operativos/${operativoId}/objetivo/fotos`, formData);
  },
  eliminarFoto: (operativoId: string, fotoId: string) =>
    api.del<void>(`/operativos/${operativoId}/objetivo/fotos/${fotoId}`),
};
