/**
 * Cliente de la API del Sistema DUAR.
 *
 * Único lugar del frontend que sabe cómo se habla con el backend: si mañana
 * cambia la URL base o el esquema de autenticación, se toca sólo este archivo.
 *
 * El token de sesión se guarda en sessionStorage y viaja en cada request como
 * `Authorization: Bearer`. Es un token OPACO: el servidor lo valida contra la
 * tabla `sesiones_activas` (Decisión E), así que puede revocarse al instante.
 *
 * sessionStorage (y no localStorage) para que la sesión se cierre sola al cerrar el
 * navegador o la pestaña (Testeo 15/10, punto 19). Cada pestaña tiene su propia sesión.
 */
import type { ResultadoOperativo } from '../utils/resultadoOperativo';

const TOKEN_KEY = 'duar-token';

// Las sesiones que quedaron guardadas en localStorage antes de este cambio no se reutilizan.
try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem('duar-user'); } catch { /* sin almacenamiento */ }

export function getToken(): string | null {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* sin almacenamiento: la sesión vale sólo mientras no se recargue */ }
}

/**
 * Error de API que conserva el status HTTP y el motivo que envió el backend.
 *
 * `datos` guarda el cuerpo completo de la respuesta: hay rechazos que traen
 * información necesaria para decidir qué mostrar. El caso concreto es la Regla
 * de Ubicuidad (CU-16 paso 6.2), donde el 409 incluye qué operativo ocupa hoy
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

/** Rechazo sin mensaje del servidor (se cortó la conexión, se reinició): algo legible en vez de «Error 500». */
function mensajeSinDetalle(status: number): string {
  if (status >= 500) return 'El servidor no pudo completar la operación. Probá de nuevo en unos segundos.';
  return `No se pudo completar la operación (error ${status}).`;
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
    throw new ApiError(cuerpo.error ?? mensajeSinDetalle(res.status), res.status, cuerpo.motivo, cuerpo);
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
    // `email`: de quién es la cuenta confirmada, para avisar si en el navegador hay otra sesión abierta.
    api.get<{ estado: 'ok' | 'ya_confirmado'; email: string | null }>(`/auth/confirmar-email/${token}`),

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

/* ── Flujo QR: CU-16 Generar QR · CU-02 Registro · alta en operativo ─────── */

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
  // Coordinador (CU-18), no el agente.
}

export const qrApi = {
  /** CU-16 pasos 4-5 · público: ¿a qué operativo da acceso este QR? */
  validar: (token: string) =>
    api.get<{ operativo: OperativoQRApi; expiraEn: string }>(`/qr/${token}`),

  /** CU-16 pasos 1-2 · el Coordinador obtiene el QR vigente (o uno nuevo). */
  obtener: (operativoId: string) =>
    api.get<{ qr: QRTokenApi; operativo: { id: string; titulo: string } }>(
      `/operativos/${operativoId}/qr`
    ),

  /** CU-16 Observaciones · "Control de Puerta": invalida el QR filtrado. */
  refrescar: (operativoId: string) =>
    api.post<{ qr: QRTokenApi; operativo: { id: string; titulo: string } }>(
      `/operativos/${operativoId}/qr/refrescar`
    ),

  /** CU-20 · grilla del Coordinador (se consulta por polling). */
  personal: (operativoId: string) =>
    api.get<{ personal: unknown[] }>(`/operativos/${operativoId}/personal`),
};

export const registroApi = {
  /** CU-02 · crea el perfil global y deja la sesión abierta. */
  registrar: (datos: RegistroQRPayload) =>
    // `reactivado`: el DNI era de una cuenta eliminada y se recuperó esa misma (CU-07, 05/10).
    api.post<{ token: string; usuario: UsuarioApi; operativo: OperativoQRApi; reactivado: boolean }>(
      '/auth/registro',
      datos
    ),

  /**
   * CU-16 pasos 6-8 · alta en el operativo.
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
  fiscalInstruccion: string | null;   // opcional: sin fiscal asignado todavía
  descripcion: string | null;
  /** Reseña que se escribe al finalizar (CU-10); antes pisaba la descripción (migración 024). */
  notaFinal?: string | null;
  /** Resultado elegido al finalizar (CU-10, migración 025); null si no está finalizado o se cerró antes. */
  resultado?: ResultadoOperativo | null;
  estado: string;
  /** Por qué tiene el estado actual (ciclo de estados, 24/10). */
  estadoMotivo?: string | null;
  estadoActualizadoEn?: string;
  /** Inactivo por pausa manual: sólo se reanuda a mano. */
  pausaManual?: boolean;
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
  /**
   * Presencia de mando (01/10), sólo en `listar()`: el último período a cargo.
   * Con `mandoHasta` vacío, está a cargo ahora; si no, es el último que estuvo.
   */
  mandoNombre?: string | null;
  mandoApellido?: string | null;
  mandoHasta?: string | null;
}

export interface CrearOperativoPayload {
  titulo: string;
  localidad: string;
  fiscalInstruccion?: string | null;  // opcional
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
  /** CU-09. Si se mueve el Punto Cero con el operativo en curso, `motivoPuntoCero` es obligatorio (CU-36). */
  actualizar: (id: string, datos: Partial<CrearOperativoPayload> & { motivoPuntoCero?: string }) =>
    api.put<{ operativo: OperativoApi }>(`/operativos/${id}`, datos),
  /** CU-08 paso 8: transición Nuevo → Iniciado al entrar. Idempotente. */
  activar: (id: string) => api.post<{ operativo: OperativoApi }>(`/operativos/${id}/activar`),
  /** Pausa manual (24/10): queda Inactivo con el motivo; no admite ingresos hasta reanudar. */
  pausar: (id: string, motivo: string) => api.post<{ operativo: OperativoApi }>(`/operativos/${id}/pausar`, { motivo }),
  /** Vuelve al estado que tenía antes de quedar Inactivo. */
  reanudar: (id: string) => api.post<{ operativo: OperativoApi }>(`/operativos/${id}/reanudar`),
  /** CU-10 5.1: tracks cargados y agentes que siguen en actividad, para avisar antes de cerrar. */
  revisionFinalizar: (id: string) =>
    api.get<{ tracksCargados: number; agentesEnActividad: { nombre: string; apellido: string; estado: string }[] }>(`/operativos/${id}/finalizar/revision`),
  /** CU-10: cierra el operativo y libera a todo el personal asignado. */
  finalizar: (id: string, resultado: ResultadoOperativo, notaFinal?: string) =>
    api.post<{ operativo: OperativoApi }>(`/operativos/${id}/finalizar`, { resultado, notaFinal }),
  /** Baja lógica — el backend sólo la permite si sigue en estado NUEVO. */
  eliminar: (id: string) => api.del<void>(`/operativos/${id}`),
};

export const usuariosApi = {
  listar: () => api.get<{ usuarios: UsuarioApi[] }>('/usuarios'),
  crear: (datos: CrearUsuarioPayload) =>
    // `correoEnviado`: salió el correo de confirmación de la cuenta nueva (CU-05 paso 5).
    api.post<{ usuario: UsuarioApi; reactivado: boolean; correoEnviado: boolean }>('/usuarios', datos),
  /** CU-06. Si cambia el correo, la cuenta vuelve a Pendiente y se manda la confirmación a la dirección nueva. */
  actualizar: (id: string, datos: Partial<CrearUsuarioPayload>) =>
    api.put<{ usuario: UsuarioApi; cambioEmail: boolean; correoEnviado: boolean }>(`/usuarios/${id}`, datos),
  eliminar: (id: string) => api.del<void>(`/usuarios/${id}`),
  auditoria: (id: string) =>
    api.get<{ eventos: unknown[] }>(`/usuarios/${id}/auditoria`),
  /** Reenvío a pedido del coordinador/admin, para un usuario en estado PENDIENTE. */
  reenviarConfirmacion: (id: string) =>
    api.post<{ mensaje: string }>(`/usuarios/${id}/reenviar-confirmacion`),
};

/**
 * Encarnación TÁCTICA de un usuario en UN operativo (Decisión A). Es lo que
 * devuelve `GET /:id/personal` (CU-20), ya con el JOIN a `usuarios` resuelto
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
  /** CU-20: personal actualmente en el operativo. */
  listar: (operativoId: string) =>
    api.get<{ personal: PersonalOperativoApi[] }>(`/operativos/${operativoId}/personal`),
  /** CU-18: alta directa por el Coordinador (sin QR). */
  agregar: (operativoId: string, datos: { usuarioId: string; especialidadId?: string; abandonarAnterior?: boolean }) =>
    api.post<{ agente: PersonalOperativoApi }>(`/operativos/${operativoId}/agentes`, datos),
  /**
   * CU-18: datos tácticos. `estado` sólo para quien NO está en un grupo
   * (Disponible / No disponible); con grupo el backend responde 409 `agente_en_grupo`.
   */
  actualizar: (operativoId: string, usuarioId: string, datos: { estado?: EstadoAgenteApi; especialidadId?: string | null; esConductor?: boolean }) =>
    api.put<{ agente: PersonalOperativoApi }>(`/operativos/${operativoId}/agentes/${usuarioId}`, datos),
  /** Baja lógica: cierra la participación, no toca al Usuario global. */
  quitar: (operativoId: string, usuarioId: string) =>
    api.del<void>(`/operativos/${operativoId}/agentes/${usuarioId}`),
};

/* ── Grupos de Trabajo (Módulo 4 · CU-22..27) ────────────────────────────── */
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

/** Los 8 de `estado_grupo`. DISUELTO sólo se alcanza disolviendo (CU-26). */
export type EstadoGrupoApi =
  | 'EN_FORMACION' | 'CONFIRMADO' | 'ASIGNADO' | 'DESPLEGADO' | 'RASTRILLANDO' | 'REPLEGADO' | 'EN_ESPERA' | 'DISUELTO';

/** Lo que pasa en el terreno: lo informa el Líder o lo registra el coordinador por radio. */
export type AccionTerreno = 'salir' | 'llegar_poligono' | 'volver' | 'llegar_base';

/** Acciones del coordinador sobre un grupo (disolver va aparte). */
export type AccionGrupo = 'confirmar' | 'asignar' | 'desasignar' | 'reabrir' | AccionTerreno | 'corregir';

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
  /** El polígono en el que está hoy (CU-30): mientras está Asignado o en el terreno. */
  poligonoId: string | null;
  /** Nombre de lo asignado: el polígono (o la descripción libre de antes del Módulo 5). */
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
  /**
   * ¿Quien lo registró estaba en el puesto de comando? (presencia de mando, 01/10)
   * true = presente · false = a distancia · null = no aplica o sin registro del puesto a esa hora.
   */
  enPuesto: boolean | null;
}

export interface ArmadoAutomaticoApi {
  creados: { id: string; nombre: string; integrantes: number }[];
  asignados: number;
  sinAsignar: { id: string; nombre: string; apellido: string }[];
  /** true si se armaron menos grupos de los pedidos por falta de líderes DUAR (CU-23 5.1). */
  limitadoPorLideres: boolean;
}

/* ── Puesto de comando: presencia de mando (CU-15; 01/10, migración 016) ── */

/** Un coordinador presente (o un período ya cerrado, en el historial). */
export interface PresenciaMandoApi {
  id: string;
  usuarioId: string;
  nombre: string;
  apellido: string;
  desde: string;
  hasta: string | null;
  motivo: string | null;
  /** Quién registró el ingreso (puede ser otro coordinador o un administrador). */
  ingresoPor: string;
  ingresoPorNombre: string;
  egresoPorNombre: string | null;
  /** Sólo en `presentes`. */
  aCargo?: boolean;
}

/** Un período a cargo del operativo. */
export interface PeriodoMandoApi {
  id: string;
  usuarioId: string;
  nombre: string;
  apellido: string;
  desde: string;
  hasta: string | null;
  motivo: string | null;
  asignadoPorNombre: string;
}

export interface MandoOperativoApi {
  aCargo: PeriodoMandoApi | null;
  presentes: PresenciaMandoApi[];
  historialPresencias: PresenciaMandoApi[];
  historialMando: PeriodoMandoApi[];
}

export const mandoApi = {
  estado: (operativoId: string) => api.get<MandoOperativoApi>(`/operativos/${operativoId}/mando`),
  /** Sin `usuarioId`, el coordinador se registra a sí mismo. `trasladar` lo saca de otro operativo. */
  ingresar: (operativoId: string, datos: { usuarioId?: string; trasladar?: boolean } = {}) =>
    api.post<{ quedoACargo: boolean; mando: MandoOperativoApi }>(`/operativos/${operativoId}/mando/ingreso`, datos),
  /** El retiro de OTRO exige motivo; si se retira el que está a cargo y quedan otros, `sucesorId`. */
  retirar: (operativoId: string, datos: { usuarioId?: string; motivo?: string; sucesorId?: string } = {}) =>
    api.post<{ quedaSinMando: boolean; mando: MandoOperativoApi }>(`/operativos/${operativoId}/mando/retiro`, datos),
  /** Traspaso (lo hace quien está a cargo o un administrador) o designación si nadie está a cargo. */
  asignar: (operativoId: string, usuarioId: string) =>
    api.post<{ mando: MandoOperativoApi }>(`/operativos/${operativoId}/mando/a-cargo`, { usuarioId }),
};

/* ── Módulo 5 · Polígonos del mapa (CU-29, 30, 37, 38, 39) ─────────────── */

/** GeoJSON Polygon en [longitud, latitud], como lo dibuja Leaflet. */
export interface GeometriaPoligono { type: 'Polygon'; coordinates: number[][][]; }

export interface GrupoEnPoligonoApi {
  id: string; nombre: string; clase: ClaseGrupoApi; estado: EstadoGrupoApi;
  color: string | null; asignadoEn: string; liderNombre: string | null;
}

/** Un polígono. No tiene estado (decisión del 12/10): lo describe su cobertura. */
export interface PoligonoApi {
  id: string;
  operativoId: string;
  nombre: string;
  notas: string | null;
  /** Color propio (#RRGGBB, migración 028); null = el de su grupo de rastrillaje. */
  color?: string | null;
  geometria: GeometriaPoligono;
  areaM2: number;
  perimetroM: number;
  coberturaPct: number;
  coberturaKm: number;
  coberturaCalculadaEn: string | null;
  creadoEn: string;
  tracks: number;
  /** A lo sumo uno de rastrillaje, más los especiales. */
  grupos: GrupoEnPoligonoApi[];
  /** Lo que queda sin recorrer (GeoJSON), o null si todavía no hay tracks. */
  brechas?: unknown | null;
}

export interface EventoPoligonoApi {
  id: string;
  tipo: 'CREADO' | 'NOMBRE' | 'GEOMETRIA' | 'NOTAS' | 'COLOR' | 'ELIMINADO'
    | 'GRUPO_ASIGNADO' | 'GRUPO_CAMBIADO' | 'GRUPO_QUITADO' | 'GRUPO_REPLEGADO' | 'GRUPO_SALIO'
    | 'TRACK_CARGADO' | 'TRACK_REASIGNADO' | 'TRACK_ELIMINADO';
  registradoEn: string;
  detalle: Record<string, unknown> | null;
  grupoId: string | null;
  grupoNombre: string | null;
  grupoColor: string | null;
  trackId: string | null;
  registradoPor: string | null;
}

/** CU-39: el polígono con lo que pasó en él. */
export interface PoligonoDetalleApi extends PoligonoApi {
  brechas: unknown | null;
  asistieron: { id: string; nombre: string; color: string | null; clase: ClaseGrupoApi; primeraVez: string }[];
  listaTracks: { id: string; agente: string; inicio: string | null; fin: string | null; cargadoEn: string; distanciaM: number; color: string | null }[];
  historial: EventoPoligonoApi[];
}

export const poligonosApi = {
  listar: (operativoId: string) =>
    api.get<{ poligonos: PoligonoApi[] }>(`/operativos/${operativoId}/poligonos`),
  /** CU-39 */
  obtener: (operativoId: string, poligonoId: string) =>
    api.get<{ poligono: PoligonoDetalleApi }>(`/operativos/${operativoId}/poligonos/${poligonoId}`),
  /** CU-29 (con `grupoId`, lo asigna en el mismo paso) */
  crear: (operativoId: string, datos: { nombre: string; geometria: GeometriaPoligono; notas?: string; grupoId?: string }) =>
    api.post<{ poligono: PoligonoDetalleApi }>(`/operativos/${operativoId}/poligonos`, datos),
  /** CU-37: nombre, notas y/o forma */
  actualizar: (operativoId: string, poligonoId: string, datos: { nombre?: string; notas?: string | null; color?: string | null; geometria?: GeometriaPoligono }) =>
    api.put<{ poligono: PoligonoDetalleApi }>(`/operativos/${operativoId}/poligonos/${poligonoId}`, datos),
  /** CU-38: baja con registro (no se puede con un grupo en el terreno) */
  eliminar: (operativoId: string, poligonoId: string) =>
    api.del<void>(`/operativos/${operativoId}/poligonos/${poligonoId}`),
  /** CU-30: sólo grupos Confirmados */
  asignarGrupo: (operativoId: string, poligonoId: string, grupoId: string) =>
    api.post<{ poligono: PoligonoDetalleApi }>(`/operativos/${operativoId}/poligonos/${poligonoId}/grupos`, { grupoId }),
  /** CU-30: con el grupo en el terreno hace falta `confirmar: true` */
  quitarGrupo: (operativoId: string, poligonoId: string, grupoId: string, confirmar = false) =>
    api.post<{ poligono: PoligonoDetalleApi }>(`/operativos/${operativoId}/poligonos/${poligonoId}/grupos/${grupoId}/quitar`, { confirmar }),
  /** CU-30: sólo si el actual todavía no salió (Asignado) */
  cambiarGrupo: (operativoId: string, poligonoId: string, grupoId: string, nuevoGrupoId: string) =>
    api.post<{ poligono: PoligonoDetalleApi }>(`/operativos/${operativoId}/poligonos/${poligonoId}/grupos/${grupoId}/cambiar`, { nuevoGrupoId }),
};

/* ── Tracks GPX (Módulo 5 · CU-31, 32, 38) ───────────────────────────────── */

/** Lo que muestra CU-31 pasos 3 a 5, antes de confirmar la carga (no se guarda nada). */
export interface AnalisisGpxApi {
  nombre: string | null;
  puntos: number;
  distanciaM: number;
  inicio: string | null;
  fin: string | null;
  duracionS: number | null;
  conElevacion: boolean;
  desnivelPositivoM: number | null;
  desnivelNegativoM: number | null;
  /** El polígono que contiene al menos el 30 % de los puntos; null = «Fuera de polígono». */
  poligono: { id: string; nombre: string } | null;
  deteccionPct: number;
}

export interface TrackApi {
  id: string;
  operativoId: string;
  poligonoId: string | null;
  poligonoNombre: string | null;
  agenteOperativoId: string;
  /** De quién es el recorrido. */
  agente: string;
  grupoId: string | null;
  grupoNombre: string | null;
  color: string | null;
  /** Quién lo subió: él mismo, o el coordinador en su nombre. */
  cargadoPor: string;
  cargadoEn: string;
  archivoNombre: string;
  inicio: string | null;
  fin: string | null;
  duracionS: number | null;
  distanciaM: number;
  conElevacion: boolean;
  desnivelPositivoM: number | null;
  desnivelNegativoM: number | null;
  deteccionPct: number;
  notas: string | null;
  /** GeoJSON LineString con [lng, lat, elevación] (no viaja al portal del agente). */
  geometria?: { type: 'LineString'; coordinates: number[][] };
  /** Enlace temporal (10 min) al .gpx original; sólo en el detalle. */
  archivoUrl?: string | null;
}

/** Máximo que acepta el servidor (techo de un envío en producción). */
export const GPX_MAX_BYTES = 4 * 1024 * 1024;

function formularioGpx(archivo: File, campos: Record<string, string | undefined> = {}): FormData {
  const f = new FormData();
  f.append('archivo', archivo);
  for (const [k, v] of Object.entries(campos)) if (v) f.append(k, v);
  return f;
}

/** El coordinador, desde el mapa (CU-31 en nombre de un agente, CU-32, CU-38). */
export const tracksApi = {
  analizar: (operativoId: string, archivo: File) =>
    requestFormData<{ analisis: AnalisisGpxApi }>(`/operativos/${operativoId}/tracks/analizar`, formularioGpx(archivo)),
  crear: (operativoId: string, archivo: File, agenteOperativoId: string, notas?: string) =>
    requestFormData<{ track: TrackApi }>(`/operativos/${operativoId}/tracks`, formularioGpx(archivo, { agenteOperativoId, notas })),
  listar: (operativoId: string) =>
    api.get<{ tracks: TrackApi[] }>(`/operativos/${operativoId}/tracks`),
  obtener: (operativoId: string, trackId: string) =>
    api.get<{ track: TrackApi }>(`/operativos/${operativoId}/tracks/${trackId}`),
  /** CU-32: sólo el polígono (null = fuera de polígono) y las notas. */
  actualizar: (operativoId: string, trackId: string, datos: { poligonoId?: string | null; notas?: string | null }) =>
    api.put<{ track: TrackApi }>(`/operativos/${operativoId}/tracks/${trackId}`, datos),
  /** CU-38: baja con registro. */
  eliminar: (operativoId: string, trackId: string) =>
    api.del<void>(`/operativos/${operativoId}/tracks/${trackId}`),
};

/* ── Marcadores, Punto Cero y radios (Módulo 5 · CU-34, 35, 36, 38) ───────── */

export type ClaseMarcadorApi = 'POI' | 'HALLAZGO' | 'INSTALACION';
export type TipoInstalacionApi =
  'PUESTO_COMANDO' | 'BASE' | 'CAMPAMENTO' | 'HELIPUNTO' | 'AREA_ESPERA' | 'AREA_CONCENTRACION_VICTIMAS';

export const TIPOS_INSTALACION: Record<TipoInstalacionApi, string> = {
  PUESTO_COMANDO: 'Puesto de Comando',
  BASE: 'Base',
  CAMPAMENTO: 'Campamento',
  HELIPUNTO: 'Helipunto',
  AREA_ESPERA: 'Área de Espera',
  AREA_CONCENTRACION_VICTIMAS: 'Área de Concentración de Víctimas',
};

export interface MarcadorApi {
  id: string;
  operativoId: string;
  clase: ClaseMarcadorApi;
  tipoInstalacion: TipoInstalacionApi | null;
  nombre: string;
  descripcion: string | null;
  detalle: string | null;
  responsable: string | null;
  notas: string | null;
  lat: number;
  lng: number;
  creadoPor: string | null;
  creadoEn: string;
  actualizadoEn: string;
  /** URL firmada (bucket privado; vence). */
  fotos: { id: string; url: string | null }[];
}

export interface DatosMarcador {
  clase?: ClaseMarcadorApi;
  tipoInstalacion?: TipoInstalacionApi;
  nombre?: string;
  descripcion?: string | null;
  detalle?: string | null;
  responsable?: string | null;
  notas?: string | null;
  /** Al crear, obligatorias. Al modificar, sólo para reubicar una instalación. */
  lat?: number;
  lng?: number;
}

export const marcadoresApi = {
  listar: (operativoId: string) =>
    api.get<{ marcadores: MarcadorApi[] }>(`/operativos/${operativoId}/marcadores`),
  obtener: (operativoId: string, marcadorId: string) =>
    api.get<{ marcador: MarcadorApi }>(`/operativos/${operativoId}/marcadores/${marcadorId}`),
  /** CU-34 */
  crear: (operativoId: string, datos: DatosMarcador & { clase: ClaseMarcadorApi; lat: number; lng: number }) =>
    api.post<{ marcador: MarcadorApi }>(`/operativos/${operativoId}/marcadores`, datos),
  /** CU-35: un hallazgo no cambia de clase; sólo las instalaciones se reubican. */
  actualizar: (operativoId: string, marcadorId: string, datos: DatosMarcador) =>
    api.put<{ marcador: MarcadorApi }>(`/operativos/${operativoId}/marcadores/${marcadorId}`, datos),
  /** CU-38: un hallazgo no se elimina. */
  eliminar: (operativoId: string, marcadorId: string) =>
    api.del<void>(`/operativos/${operativoId}/marcadores/${marcadorId}`),
  /** Hasta 8 por marcador; no en instalaciones. */
  subirFotos: (operativoId: string, marcadorId: string, archivos: File[]) => {
    const f = new FormData();
    archivos.forEach(a => f.append('fotos', a));
    return requestFormData<{ marcador: MarcadorApi }>(`/operativos/${operativoId}/marcadores/${marcadorId}/fotos`, f);
  },
  /** Las fotos de un hallazgo no se quitan. */
  eliminarFoto: (operativoId: string, marcadorId: string, fotoId: string) =>
    api.del<void>(`/operativos/${operativoId}/marcadores/${marcadorId}/fotos/${fotoId}`),
};

export interface MovimientoPuntoCeroApi {
  id: string;
  /** null en la definición inicial (al crear el operativo). */
  desdeLat: number | null;
  desdeLng: number | null;
  hastaLat: number;
  hastaLng: number;
  distanciaM: number | null;
  motivo: string | null;
  registradoEn: string;
  registradoPor: string | null;
}

export interface RadioApi {
  id: string;
  radioM: number;
  color: string;
  creadoEn: string;
}

export const puntoCeroApi = {
  obtener: (operativoId: string) =>
    api.get<{ puntoCero: { lat: number; lng: number }; historial: MovimientoPuntoCeroApi[] }>(`/operativos/${operativoId}/punto-cero`),
  /** CU-36: con el operativo en curso, `motivo` es obligatorio. */
  mover: (operativoId: string, datos: { lat: number; lng: number; motivo?: string }) =>
    api.put<{ puntoCero: { lat: number; lng: number }; historial: MovimientoPuntoCeroApi[] }>(`/operativos/${operativoId}/punto-cero`, datos),
  listarRadios: (operativoId: string) =>
    api.get<{ radios: RadioApi[] }>(`/operativos/${operativoId}/radios`),
  crearRadio: (operativoId: string, datos: { radioM: number; color: string }) =>
    api.post<{ radio: RadioApi }>(`/operativos/${operativoId}/radios`, datos),
  actualizarRadio: (operativoId: string, radioId: string, datos: { radioM?: number; color?: string }) =>
    api.put<{ radio: RadioApi }>(`/operativos/${operativoId}/radios/${radioId}`, datos),
  eliminarRadio: (operativoId: string, radioId: string) =>
    api.del<void>(`/operativos/${operativoId}/radios/${radioId}`),
};

export const gruposApi = {
  /** CU-24 */
  listar: (operativoId: string) =>
    api.get<{ grupos: GrupoApi[] }>(`/operativos/${operativoId}/grupos`),
  /** CU-22. En un grupo especial el Líder puede ser cualquiera; en uno de rastrillaje, del DUAR. */
  crear: (operativoId: string, datos: { nombre: string; liderId: string; clase: ClaseGrupoApi }) =>
    api.post<{ grupo: GrupoApi }>(`/operativos/${operativoId}/grupos`, datos),
  /** CU-23 */
  armadoAutomatico: (operativoId: string, tamano: number) =>
    api.post<ArmadoAutomaticoApi>(`/operativos/${operativoId}/grupos/automatico`, { tamano }),
  /** CU-25: nombre y Líder (el Líder sólo con el grupo En formación). El estado va por `accion`. */
  actualizar: (operativoId: string, grupoId: string, datos: { nombre?: string; liderId?: string }) =>
    api.put<{ grupo: GrupoApi }>(`/operativos/${operativoId}/grupos/${grupoId}`, datos),
  /**
   * Cambiar el estado de un grupo. Las acciones del terreno quedan registradas
   * como aviso de radio; `ocurridoEn` es la hora en que pasó, si el aviso llegó tarde.
   * Si el mismo hecho ya estaba registrado, `resultado` es CONFIRMACION.
   */
  accion: (operativoId: string, grupoId: string, datos: {
    accion: AccionGrupo; ocurridoEn?: string; poligonoId?: string; motivo?: string; estadoDestino?: EstadoGrupoApi;
  }) => api.post<{ grupo: GrupoApi; resultado: EventoEstadoApi['resultado'] }>(`/operativos/${operativoId}/grupos/${grupoId}/acciones`, datos),
  /** CU-22 paso 6 / CU-25: arrastrar, sólo con grupos En formación. `destinoGrupoId: null` = "Sin grupo". */
  mover: (operativoId: string, agenteOperativoId: string, destinoGrupoId: string | null) =>
    api.post<{ agente: unknown }>(`/operativos/${operativoId}/grupos/mover`, { agenteOperativoId, destinoGrupoId }),
  /** CU-27: el retirado queda Replegado y sin grupo. */
  extraer: (operativoId: string, grupoId: string, datos: {
    agenteOperativoId: string; motivo: string; nuevoLiderId?: string; riesgoAceptado?: boolean;
  }) => api.post<{ grupo: GrupoApi; alertaBinomio: boolean }>(`/operativos/${operativoId}/grupos/${grupoId}/extraer`, datos),
  /** CU-26 (baja lógica, sólo desde la base) */
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
  /** CU-31: mis recorridos en el operativo en el que estoy. */
  misTracks: () => api.get<{ tracks: TrackApi[] }>('/mis-tracks'),
  /** CU-31 pasos 3 a 5: el resumen del archivo antes de confirmar. */
  analizarMiTrack: (archivo: File) =>
    requestFormData<{ analisis: AnalisisGpxApi }>('/mis-tracks/analizar', formularioGpx(archivo)),
  /** CU-31: queda «recorrido de» y «cargado por» uno mismo. */
  cargarMiTrack: (archivo: File, notas?: string) =>
    requestFormData<{ track: TrackApi }>('/mis-tracks', formularioGpx(archivo, { notas })),
  /** «Mi sector»: el polígono de mi grupo (null sin grupo o sin polígono). */
  miSector: () => api.get<{ sector: MiSectorApi | null }>('/mi-sector'),
  /** «Objetivo buscado» del operativo en el que estoy (CU-14, sólo lectura). */
  miObjetivo: () => api.get<{ objetivo: ObjetivoApi | null }>('/mi-objetivo'),
};

export interface MiSectorApi {
  id: string;
  nombre: string;
  notas: string | null;
  /** GeoJSON Polygon (lng, lat). */
  geometria: { type: 'Polygon'; coordinates: number[][][] };
  areaM2: number;
  perimetroM: number;
  coberturaPct: number | null;
}

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

/* ── Módulo 6 · Informe por operativo (CU-41) ─────────────────────────── */

export type TipoInformeApi = 'PARCIAL' | 'FINAL';

/** Un informe emitido. La copia del PDF queda guardada y no cambia. */
export interface InformeApi {
  id: string;
  codigo: string;              // INF-2026-0003
  numeroEnOperativo: number;
  tipo: TipoInformeApi;
  corteEn: string;             // hasta cuándo cubre
  generadoEn: string;
  generadoPor: string;
  sha256: string;
  tamanoBytes: number;
}

export interface DescargaInformeApi { informe: InformeApi; url: string; nombreArchivo: string; nuevo?: boolean; }

/** Lo que muestra la verificación pública: nada personal ni del contenido. */
export interface InformeVerificableApi {
  codigo: string; tipo: TipoInformeApi; corteEn: string; generadoEn: string;
  sha256: string; tamanoBytes: number; operativoCodigo: string;
}

export const informesApi = {
  /** Paso 2: qué se va a emitir y los ya emitidos. */
  listar: (operativoId: string) =>
    api.get<{ proximo: { tipo: TipoInformeApi; yaEmitido: boolean }; informes: InformeApi[] }>(`/operativos/${operativoId}/informes`),
  /** Pasos 3-7: genera y guarda; con el operativo finalizado devuelve el final. */
  generar: (operativoId: string) => api.post<DescargaInformeApi>(`/operativos/${operativoId}/informes`),
  /** N2: la copia guardada de un informe ya emitido. */
  descargar: (operativoId: string, informeId: string) =>
    api.get<DescargaInformeApi>(`/operativos/${operativoId}/informes/${informeId}/descarga`),
  /** N1: pública, sin sesión. */
  verificar: async (codigo: string) => {
    const res = await fetch(`/api/informes/verificar/${encodeURIComponent(codigo.trim())}`);
    const cuerpo = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(cuerpo.error ?? `Error ${res.status}`, res.status, cuerpo.motivo, cuerpo);
    return cuerpo as { informe: InformeVerificableApi };
  },
};
