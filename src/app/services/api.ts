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

async function request<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opciones.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${ruta}`, { ...opciones, headers });

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
  esCaminante: boolean;
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
  // `esCaminante` y `esConductor` NO van acá a propósito: son tácticos y los
  // decide el sistema o el Coordinador, no el agente (Decisión C).
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
};
