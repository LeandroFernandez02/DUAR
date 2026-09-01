import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  initialData, Usuario, Operativo, GrupoRastrillaje, AppData, HistorialPuestoCom,
  AgenteOperativo, AgenteGrupoHistorial, EstadoOperativoAgente,
  inferirCaminante, ESTADOS_GRUPO_EN_TERRENO, ESTADOS_GRUPO_EN_OPERACION, grupoEnOperacion,
} from '../data/mockData';
import { generarTokenConfirmacion } from '../services/emailService';
import { authApi, setToken, getToken, ApiError, UsuarioApi } from '../services/api';

/**
 * Traduce el usuario que devuelve la API al modelo que usa el frontend.
 *
 * La base guarda los enums en MAYÚSCULAS ('ACTIVO') y el rol como nombre del
 * catálogo; el frontend viene usando minúsculas. Este mapeo es el puente
 * mientras se completa la migración de los datos mock a la base real.
 */
function mapearUsuarioApi(u: UsuarioApi): Usuario {
  return {
    id: u.id,
    dni: u.dni,
    nombre: u.nombre,
    apellido: u.apellido,
    email: u.email,
    password: '',                       // la clave nunca vuelve del servidor
    rol: u.rol.toLowerCase() as Usuario['rol'],
    telefono: u.telefono ?? undefined,
    fechaNacimiento: u.fechaNacimiento ?? undefined,
    institucionId: u.institucionId ?? undefined,
    dotacionId: u.dotacionId ?? undefined,
    especialidadId: u.especialidadId ?? undefined,
    alergiaIds: u.alergias.map(a => a.id),
    grupo_sanguineo: u.grupoSanguineo ?? undefined,
    estado: u.estado.toLowerCase() as Usuario['estado'],
    createdAt: new Date().toISOString().slice(0, 10),
    emailConfirmado: u.emailConfirmado,
  };
}

// Counter-based unique ID generator to avoid timestamp collisions
// when multiple entities are created synchronously in the same millisecond.
let _idCounter = 0;
function uniqueId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}${Date.now()}_${_idCounter}`;
}

/**
 * Deduplicates arrays by `id`, keeping the first occurrence.
 * Also removes any grupo IDs from operativos that no longer exist in the grupos array.
 * Ensures each agent appears in AT MOST ONE group (leaders take priority in their own group).
 * Ensures each agent appears in AT MOST ONE active operativo (activo/en_proceso/planificación/nuevo).
 * This sanitizes corrupted localStorage data that may have duplicate keys.
 */
function sanitizeData(raw: AppData): AppData {
  const dedupeById = <T extends { id: string }>(arr: T[]): T[] => {
    const seen = new Set<string>();
    return arr.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  const rawGrupos = dedupeById(raw.grupos ?? []);

  // Build agent ownership map: each agent belongs to at most one ACTIVE group.
  // Los grupos DISUELTOS quedan afuera de este cómputo: su agenteIds es una foto
  // histórica (CU-25), no una reclamación de pertenencia vigente. Si no los
  // excluyéramos, un ex-integrante que ya se unió a un grupo nuevo podría perder
  // esa membresía porque el grupo disuelto (más viejo, primero en el array) "gana"
  // la disputa de ownership por orden de aparición.
  const agentOwnership = new Map<string, string>(); // agentId → groupId
  const gruposActivosParaOwnership = rawGrupos.filter(g => g.estado !== 'disuelto');

  // Pass 1: claim leaders (first group per leader wins)
  gruposActivosParaOwnership.forEach(g => {
    if (g.lider && !agentOwnership.has(g.lider)) {
      agentOwnership.set(g.lider, g.id);
    }
  });

  // Pass 2: claim non-leader members (first occurrence wins)
  gruposActivosParaOwnership.forEach(g => {
    g.agenteIds.forEach(aid => {
      if (!agentOwnership.has(aid)) {
        agentOwnership.set(aid, g.id);
      }
    });
  });

  // Pass 3: rebuild each ACTIVE group keeping only agents owned by that group.
  // Los grupos DISUELTOS se preservan intactos — no se les toca agenteIds/lider,
  // es el registro forense de quién los integró (CU-25).
  const grupos = rawGrupos.map(g => {
    if (g.estado === 'disuelto') return g;
    const filteredIds = g.agenteIds.filter(aid => agentOwnership.get(aid) === g.id);
    const leaderBelongsHere = agentOwnership.get(g.lider) === g.id;
    const finalAgenteIds =
      leaderBelongsHere && !filteredIds.includes(g.lider)
        ? [g.lider, ...filteredIds]
        : filteredIds;
    const finalLider = leaderBelongsHere ? g.lider : '';
    return { ...g, lider: finalLider, agenteIds: finalAgenteIds };
  });

  const grupoIds = new Set(grupos.map(g => g.id));

  const rawOperativos = dedupeById(raw.operativos ?? []).map(op => ({
    ...op,
    grupoIds: (op.grupoIds ?? []).filter(gid => grupoIds.has(gid)),
  }));

  // ── Enforce one-active-operativo per agent ──────────────────────────────────
  // "Active" estados where an agent can only belong to ONE at a time.
  const ACTIVE_ESTADOS = new Set(['activo', 'en_proceso', 'planificación', 'nuevo']);

  // Priority order: activo > en_proceso > planificación > nuevo (first in sorted list wins)
  const PRIORITY: Record<string, number> = { activo: 0, en_proceso: 1, planificación: 2, nuevo: 3 };
  const sortedActive = [...rawOperativos]
    .filter(op => ACTIVE_ESTADOS.has(op.estado))
    .sort((a, b) => (PRIORITY[a.estado] ?? 9) - (PRIORITY[b.estado] ?? 9));

  // Map: agentId → operativoId that "owns" them among active ops
  const agentActiveOp = new Map<string, string>();
  sortedActive.forEach(op => {
    op.agenteIds.forEach(aid => {
      if (!agentActiveOp.has(aid)) {
        agentActiveOp.set(aid, op.id);
      }
    });
  });

  // Rebuild operativos: in active ops, only keep agents owned by that op
  const operativos = rawOperativos.map(op => {
    if (!ACTIVE_ESTADOS.has(op.estado)) return op; // don't touch finalized ops
    return {
      ...op,
      agenteIds: op.agenteIds.filter(aid => agentActiveOp.get(aid) === op.id),
    };
  });
  // ───────────────────────────────────────────────────────────────────────────

  // ── Regla de Ubicuidad sobre las encarnaciones tácticas ────────────────────
  // Un usuario puede tener como máximo UNA fila activa (sin fechaEgreso).
  // Espejo del índice `agente_unico_activo_idx` de PostgreSQL.
  const vistosActivos = new Set<string>();
  const agentesOperativo = dedupeById(raw.agentesOperativo ?? []).filter(ao => {
    if (ao.fechaEgreso) return true;          // los egresados no compiten
    if (vistosActivos.has(ao.usuarioId)) return false;
    vistosActivos.add(ao.usuarioId);
    return true;
  });

  return {
    usuarios: dedupeById(raw.usuarios ?? []),
    grupos,
    operativos,
    agentesOperativo,
    agentesGrupoHistorial: dedupeById(raw.agentesGrupoHistorial ?? []),
  };
}

/** Resultado de evaluar una extracción de grupo (CU-26). */
export type EvaluacionExtraccion =
  | { permitido: false; motivo: 'sin_grupo' | 'estado_grupo' | 'minimo_integrantes'; grupo?: GrupoRastrillaje }
  | {
      permitido: true;
      grupo: GrupoRastrillaje;
      /** Paso 4.1: el agente es el líder ⇒ sucesión de mando obligatoria */
      requiereSucesion: boolean;
      candidatosLider: string[];
      /** Paso 5.1: el grupo quedará con 1 integrante */
      alertaBinomio: boolean;
      miembrosRestantes: number;
    };

interface AppContextType {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  isDark: boolean;
  toggleDark: () => void;
  data: AppData;
  login: (email: string, password: string) => Promise<'ok' | 'credentials' | 'inactive' | 'sin_conexion'>;
  logout: () => Promise<void>;
  /** Autoedición: el propio usuario cambia sus datos (no dni/email/estado/rol). */
  actualizarPerfilPropio: (datos: Record<string, unknown>) => Promise<'ok' | string>;
  /** Vuelve a pedir `/auth/me` — usado tras confirmar el mail para que el banner "Confirmá tu correo" se saque sin recargar la página. */
  refrescarUsuario: () => Promise<void>;
  // Operativos CRUD
  addOperativo: (op: Omit<Operativo, 'id'>) => string;
  updateOperativo: (id: string, op: Partial<Operativo>) => void;
  deleteOperativo: (id: string) => void;
  getOperativo: (id: string) => Operativo | undefined;
  // Usuarios CRUD
  addUsuario: (user: Omit<Usuario, 'id' | 'createdAt' | 'emailConfirmado'> & { emailConfirmado?: boolean }) => string;
  updateUsuario: (id: string, user: Partial<Usuario>) => void;
  deleteUsuario: (id: string) => void;
  // Grupos CRUD
  addGrupo: (grupo: Omit<GrupoRastrillaje, 'id'>) => string;
  updateGrupo: (id: string, grupo: Partial<GrupoRastrillaje>) => void;
  /** Mueve un agente entre grupos manteniendo agenteIds + grupoId + historial. */
  moverAgenteAGrupo: (operativoId: string, usuarioId: string, destinoGrupoId: string | null) => 'ok' | 'lider' | 'sin_agente' | 'origen_en_operacion';
  /** CU-26: evalúa si se puede extraer un agente (sin mutar). */
  evaluarExtraccion: (agenteOperativoId: string) => EvaluacionExtraccion;
  /** CU-26: ejecuta la extracción con motivo, nuevo estado y sucesión de mando. */
  extraerAgenteDeGrupo: (agenteOperativoId: string, opciones: { motivo: string; nuevoEstado: EstadoOperativoAgente; nuevoLiderUsuarioId?: string }) => void;
  /** CU-25: disolución con baja lógica. 'bloqueado' si el grupo está rastrillando. */
  deleteGrupo: (id: string) => 'ok' | 'bloqueado';
  // Agentes en operativo
  addAgenteToOperativo: (operativoId: string, agenteId: string) => void;
  removeAgenteFromOperativo: (operativoId: string, agenteId: string) => void;
  // AgenteOperativo — datos TÁCTICOS (Decisión A)
  getAgenteOperativo: (operativoId: string, usuarioId: string) => AgenteOperativo | undefined;
  updateAgenteOperativo: (id: string, cambios: Partial<AgenteOperativo>) => void;
  // Confirmación de email
  confirmarEmail: (token: string) => 'ok' | 'ya_confirmado' | 'invalido';
  // Puesto de Comando dinámico
  moverPuestoComando: (operativoId: string, puntoId: string, newLat: number, newLng: number, motivo?: string) => void;
}

/**
 * Anchor the context object in globalThis so that Vite HMR re-evaluations of
 * this module (cascading from changes in mockData.ts or other deps) always
 * return the SAME React context reference.
 *
 * Without this, every HMR cycle calls createContext() again, producing a new
 * context object. The already-mounted AppProvider still provides the OLD context
 * while useApp() now reads the NEW one → finds no matching Provider → throws
 * "useApp must be used within AppProvider".
 */
const _CTX_KEY = '__duar_AppContext__';
const AppContext: React.Context<AppContextType | null> =
  ((globalThis as Record<string, unknown>)[_CTX_KEY] as React.Context<AppContextType | null>) ??
  (() => {
    const ctx = createContext<AppContextType | null>(null);
    (globalThis as Record<string, unknown>)[_CTX_KEY] = ctx;
    return ctx;
  })();

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('duar-theme') === 'dark';
  });

  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('duar-user');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const [data, setData] = useState<AppData>(() => {
    // Schema version: bump this whenever the data shape changes to force a reset
    const SCHEMA_VERSION = '8'; // v8: institucionId/dotacionId (catalogos) en Usuario
    const storedVersion = localStorage.getItem('duar-schema-version');
    if (storedVersion !== SCHEMA_VERSION) {
      // Wipe stale data and start fresh with the updated initialData
      localStorage.removeItem('duar-data');
      localStorage.removeItem('duar-user');
      localStorage.setItem('duar-schema-version', SCHEMA_VERSION);
      return initialData;
    }

    const saved = localStorage.getItem('duar-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AppData;
        const clean = sanitizeData(parsed);
        localStorage.setItem('duar-data', JSON.stringify(clean));
        return clean;
      } catch {
        return initialData;
      }
    }
    return initialData;
  });

  // Persist data changes to localStorage
  useEffect(() => {
    localStorage.setItem('duar-data', JSON.stringify(data));
  }, [data]);

  // Persist user session to localStorage
  useEffect(() => {
    if (usuario) {
      localStorage.setItem('duar-user', JSON.stringify(usuario));
    } else {
      localStorage.removeItem('duar-user');
    }
  }, [usuario]);

  // Persist theme preference
  useEffect(() => {
    localStorage.setItem('duar-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleDark = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  /**
   * CU-01 — Iniciar Sesión contra la API real.
   * La validación de credenciales, el estado de la cuenta y la creación de la
   * sesión ocurren en el backend (`sesiones_activas`); acá sólo se guarda el
   * token y el usuario devuelto.
   */
  const login = useCallback(async (
    email: string,
    password: string
  ): Promise<'ok' | 'credentials' | 'inactive' | 'sin_conexion'> => {
    try {
      const { token, usuario: u } = await authApi.login(email, password);
      setToken(token);
      setUsuario(mapearUsuarioApi(u));
      return 'ok';
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.motivo === 'inactive') return 'inactive';
        return 'credentials';
      }
      // fetch falló: el backend no está levantado
      return 'sin_conexion';
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();       // revoca la sesión del lado del servidor
    } catch {
      // Si el servidor no responde igual se cierra la sesión local.
    }
    setToken(null);
    setUsuario(null);
  }, []);

  /**
   * El propio agente edita sus datos (teléfono, institución, especialidad,
   * etc.). El backend ya ignora dni/email/estado/rol por más que se manden
   * — acá no hace falta filtrarlos de nuevo, sólo reflejar la respuesta.
   */
  const actualizarPerfilPropio = useCallback(async (datos: Record<string, unknown>): Promise<'ok' | string> => {
    try {
      const { usuario: u } = await authApi.actualizarMisDatos(datos);
      setUsuario(mapearUsuarioApi(u));
      return 'ok';
    } catch (err) {
      return err instanceof ApiError ? err.message : 'No se pudo guardar los cambios.';
    }
  }, []);

  /**
   * Re-consulta `/auth/me`. Necesario porque el `usuario` en memoria se carga
   * una sola vez al montar la app (ver el efecto de abajo); si el mail se
   * confirma en otra pestaña/pantalla (ConfirmarEmail.tsx) durante esa misma
   * sesión, ese `usuario` queda con `emailConfirmado: false` hasta que algo
   * lo vuelva a pedir — de ahí el banner "Confirmá tu correo" pegado en el
   * portal de agente pese a que el backend ya confirmó el mail.
   */
  const refrescarUsuario = useCallback(async () => {
    if (!getToken()) return;
    try {
      const { usuario: u } = await authApi.me();
      setUsuario(mapearUsuarioApi(u));
    } catch {
      // Si falla, el usuario en memoria queda como estaba — no es peor que antes.
    }
  }, []);

  /**
   * Al recargar la página se revalida la sesión contra el servidor.
   *
   * Antes esto sólo corría si NO había usuario en memoria — pero `usuario` se
   * restaura de localStorage al montar, así que en la práctica nunca revalidaba:
   * con un token vencido o revocado la app te mostraba adentro y recién fallaba
   * en cada request con 401. Ahora se revalida siempre que haya token, y si no
   * hay token se descarta el usuario guardado (estado incoherente).
   */
  useEffect(() => {
    if (!getToken()) {
      setUsuario(null);
      return;
    }
    authApi.me()
      .then(({ usuario: u }) => setUsuario(mapearUsuarioApi(u)))
      .catch(() => { setToken(null); setUsuario(null); });
    // Sólo al montar: restaurar sesión previa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * La sesión también puede caerse MIENTRAS se usa el sistema: expira, o un
   * administrador revoca al usuario (CU-07). `api.ts` detecta el 401 y limpia el
   * token, pero no puede tocar el estado de React — avisa con este evento para
   * que la app cierre la sesión y mande al login, en vez de quedar mostrando una
   * pantalla donde ya nada funciona.
   */
  useEffect(() => {
    const alExpirar = () => setUsuario(null);
    window.addEventListener('duar:sesion-expirada', alExpirar);
    return () => window.removeEventListener('duar:sesion-expirada', alExpirar);
  }, []);

  /* ── Operativos CRUD ── */

  const addOperativo = useCallback((op: Omit<Operativo, 'id'>): string => {
    const id = uniqueId('op');
    setData(d => ({ ...d, operativos: [...d.operativos, { ...op, id }] }));
    return id;
  }, []);

  const updateOperativo = useCallback((id: string, op: Partial<Operativo>) => {
    setData(d => ({
      ...d,
      operativos: d.operativos.map(o => (o.id === id ? { ...o, ...op } : o)),
    }));
  }, []);

  const deleteOperativo = useCallback((id: string) => {
    setData(d => ({ ...d, operativos: d.operativos.filter(o => o.id !== id) }));
  }, []);

  const getOperativo = useCallback((id: string): Operativo | undefined => {
    return data.operativos.find(o => o.id === id);
  }, [data.operativos]);

  /* ── Usuarios CRUD ── */

  const addUsuario = useCallback((user: Omit<Usuario, 'id' | 'createdAt' | 'emailConfirmado'> & { emailConfirmado?: boolean }): string => {
    const id = uniqueId('u');
    // Los nuevos usuarios creados vía QR arrancan sin confirmar email
    const token = generarTokenConfirmacion();
    const newUser: Usuario = {
      ...user,
      id,
      createdAt: new Date().toISOString().slice(0, 10),
      // Si el caller ya envió emailConfirmado (ej: admin crea usuario manualmente), respetar.
      // Si no, el nuevo usuario de QR siempre empieza sin confirmar.
      emailConfirmado: user.emailConfirmado ?? false,
      tokenConfirmacion: user.emailConfirmado ? undefined : token,
    };
    setData(d => ({ ...d, usuarios: [...d.usuarios, newUser] }));
    return id;
  }, []);

  const updateUsuario = useCallback((id: string, user: Partial<Usuario>) => {
    // Bloquear intento de poner estado 'eliminado' por la vía normal.
    // La eliminación solo se realiza a través de deleteUsuario().
    const safeUpdate = { ...user };
    if ((safeUpdate as any).estado === 'eliminado') {
      delete (safeUpdate as any).estado;
    }
    setData(d => ({
      ...d,
      usuarios: d.usuarios.map(u => (u.id === id ? { ...u, ...safeUpdate } : u)),
    }));
    // Keep session in sync if the updated user is the logged-in one
    setUsuario(prev => (prev?.id === id ? { ...prev, ...safeUpdate } : prev));
  }, []);

  /**
   * Eliminación lógica (soft-delete):
   * - Marca el usuario como 'eliminado' con timestamp de auditoría.
   * - Lo desvincula de todos los grupos y operativos activos.
   * - El registro se conserva en la base de datos pero es invisible en toda la UI.
   * - Permite crear nuevos usuarios con el mismo DNI o email en el futuro.
   */
  const deleteUsuario = useCallback((id: string) => {
    const ahora = new Date().toISOString();

    setData(d => {
      // 1. Marcar como eliminado con timestamp de auditoría
      const usuarios = d.usuarios.map(u =>
        u.id === id
          ? {
              ...u,
              estado: 'eliminado' as const,
              eliminadoAt: ahora,
              // Limpiar token de confirmación por seguridad
              tokenConfirmacion: undefined,
            }
          : u
      );

      // 2. Desvincular de todos los grupos donde sea lider o miembro
      const grupos = d.grupos.map(g => ({
        ...g,
        agenteIds: g.agenteIds.filter(aid => aid !== id),
        // Si era líder, dejar el campo vacío
        lider: g.lider === id ? '' : g.lider,
      }));

      // 3. Desvincular de todos los operativos (activos e históricos)
      const operativos = d.operativos.map(o => ({
        ...o,
        agenteIds: o.agenteIds.filter(aid => aid !== id),
      }));

      return { ...d, usuarios, grupos, operativos };
    });

    // Si el usuario eliminado tenía sesión activa, cerrarla
    setUsuario(prev => (prev?.id === id ? null : prev));
  }, []);

  /* ── Grupos CRUD ── */

  const addGrupo = useCallback((grupo: Omit<GrupoRastrillaje, 'id'>): string => {
    const id = uniqueId('g');
    setData(d => ({
      ...d,
      grupos: [...d.grupos, { ...grupo, id }],
      // Sincroniza la pertenencia táctica. NO abre períodos de historial: un
      // grupo nace en fase de ARMADO y todavía no se confirmó que nadie
      // trabajara en él (ver ESTADOS_GRUPO_EN_OPERACION).
      agentesOperativo: d.agentesOperativo.map(ao =>
        !ao.fechaEgreso && grupo.agenteIds.includes(ao.usuarioId)
          ? { ...ao, grupoId: id }
          : ao
      ),
    }));
    return id;
  }, []);

  const updateGrupo = useCallback((id: string, grupo: Partial<GrupoRastrillaje>) => {
    const ahora = new Date().toISOString();
    const ejecutor = usuario?.id;

    setData(d => {
      const anterior = d.grupos.find(g => g.id === id);
      const grupos = d.grupos.map(g => (g.id === id ? { ...g, ...grupo } : g));
      if (!anterior) return { ...d, grupos };

      const estadoNuevo = grupo.estado ?? anterior.estado;
      const operabaAntes = grupoEnOperacion(anterior.estado);
      const operaAhora = grupoEnOperacion(estadoNuevo);

      const miembros = d.agentesOperativo.filter(ao => ao.grupoId === id && !ao.fechaEgreso);

      let agentesGrupoHistorial = d.agentesGrupoHistorial;

      // ── El grupo SALE a terreno ⇒ se abren los períodos ────────────────────
      // Recién acá se confirma que estos agentes trabajaron en este grupo. Todo
      // el movimiento previo fue armado y no dejó rastro (a propósito).
      if (!operabaAntes && operaAhora) {
        const yaAbierto = new Set(
          d.agentesGrupoHistorial.filter(h => h.grupoId === id && !h.fechaFin).map(h => h.agenteOperativoId)
        );
        agentesGrupoHistorial = [
          ...agentesGrupoHistorial,
          ...miembros
            .filter(ao => !yaAbierto.has(ao.id))
            .map(ao => ({
              id: uniqueId('agh'),
              agenteOperativoId: ao.id,
              grupoId: id,
              fechaInicio: ahora,
            })),
        ];
      }

      // ── El grupo REGRESA (replegado / vuelve a armado) ⇒ se cierran ────────
      // Así el informe distingue tiempo realmente trabajado en terreno de
      // tiempo en base. Si vuelve a salir, se abre un período nuevo.
      if (operabaAntes && !operaAhora) {
        agentesGrupoHistorial = agentesGrupoHistorial.map(h =>
          h.grupoId === id && !h.fechaFin
            ? { ...h, fechaFin: ahora, motivoSalida: `Grupo ${estadoNuevo}`, registradoPor: ejecutor }
            : h
        );
      }

      // ── Regla del Conductor (nota de negocio · CU-18) ──────────────────────
      // El conductor entra al grupo junto con los demás, pero cuando el grupo
      // arranca el rastrillaje él se queda con el vehículo: pasa a EN_ESPERA.
      // Es automático y silencioso, igual que DESPLEGADO/RASTRILLANDO en CU-18.
      const arrancaRastrillaje =
        grupo.estado === 'rastrillando' && anterior.estado !== 'rastrillando';

      const agentesOperativo = arrancaRastrillaje
        ? d.agentesOperativo.map(ao =>
            ao.grupoId === id && !ao.fechaEgreso && ao.esConductor && !ao.esCaminante
              ? { ...ao, estado: 'en_espera' as const }
              : ao
          )
        : d.agentesOperativo;

      return { ...d, grupos, agentesOperativo, agentesGrupoHistorial };
    });
  }, [usuario?.id]);

  /**
   * Disolución de Grupo (CU-25). Baja lógica — nunca DELETE:
   *  · Precondición de seguridad: bloquea si el grupo está en el terreno
   *    ('rastrillando'); el Coordinador debe replegarlo primero.
   *  · Transacción única: estado→'disuelto' + eliminadoEn, y libera a todos
   *    los agentes vinculados (grupoId=undefined, estado→'disponible').
   *  · agenteIds/lider del grupo NO se tocan: quedan como registro histórico
   *    para el informe final ("el Grupo existió de 08:00 a 12:00...").
   */
  const deleteGrupo = useCallback((id: string): 'ok' | 'bloqueado' => {
    const grupo = data.grupos.find(g => g.id === id);
    if (!grupo) return 'ok';
    if (ESTADOS_GRUPO_EN_TERRENO.includes(grupo.estado)) return 'bloqueado';

    const ahora = new Date().toISOString();
    const ejecutor = usuario?.id;
    setData(d => ({
      ...d,
      grupos: d.grupos.map(g =>
        g.id === id ? { ...g, estado: 'disuelto' as const, eliminadoEn: ahora } : g
      ),
      agentesOperativo: d.agentesOperativo.map(ao =>
        ao.grupoId === id
          ? { ...ao, grupoId: undefined, estado: 'disponible' as const }
          : ao
      ),
      // Cierra los períodos abiertos de ese grupo (trazabilidad, CU-25/CU-26)
      agentesGrupoHistorial: d.agentesGrupoHistorial.map(h =>
        h.grupoId === id && !h.fechaFin
          ? { ...h, fechaFin: ahora, motivoSalida: 'Disolución del grupo', registradoPor: ejecutor }
          : h
      ),
    }));
    return 'ok';
  }, [data.grupos, usuario?.id]);

  /* ── Agentes en operativo ── */

  /**
   * Alta de un usuario en un operativo (CU-16).
   * Crea su encarnación TÁCTICA (AgenteOperativo) infiriendo `esCaminante`
   * por especialidad, y hace cumplir la Regla de Ubicuidad cerrando cualquier
   * alta activa previa en otro operativo.
   */
  const addAgenteToOperativo = useCallback((operativoId: string, agenteId: string) => {
    setData(d => {
      const ACTIVE_ESTADOS = new Set(['activo', 'en_proceso', 'planificación', 'nuevo']);
      const ahora = new Date().toISOString();

      const operativos = d.operativos.map(o => {
        if (o.id === operativoId) {
          return o.agenteIds.includes(agenteId)
            ? o
            : { ...o, agenteIds: [...o.agenteIds, agenteId] };
        }
        // Ubicuidad: sale de cualquier otro operativo activo
        if (ACTIVE_ESTADOS.has(o.estado) && o.agenteIds.includes(agenteId)) {
          return { ...o, agenteIds: o.agenteIds.filter(id => id !== agenteId) };
        }
        return o;
      });

      // Ubicuidad en la entidad táctica: cerrar la fila activa anterior (CU-20)
      let agentesOperativo = d.agentesOperativo.map(ao =>
        ao.usuarioId === agenteId && !ao.fechaEgreso && ao.operativoId !== operativoId
          ? { ...ao, fechaEgreso: ahora, estado: 'replegado' as const, grupoId: undefined }
          : ao
      );

      // Si ya tiene un alta VIGENTE en este operativo, no duplicar
      const yaActivo = agentesOperativo.some(
        ao => ao.usuarioId === agenteId && ao.operativoId === operativoId && !ao.fechaEgreso
      );

      if (!yaActivo) {
        const usuario = d.usuarios.find(u => u.id === agenteId);
        agentesOperativo = [
          ...agentesOperativo,
          {
            id: uniqueId('ao'),
            usuarioId: agenteId,
            operativoId,
            estado: 'disponible',
            esCaminante: inferirCaminante(usuario?.especialidad),
            esConductor: false, // exclusivo del Coordinador (CU-17)
            fechaIngreso: ahora,
          },
        ];
      }

      return { ...d, operativos, agentesOperativo };
    });
  }, []);

  /**
   * Baja de un agente del operativo (CU-20).
   * Borrado lógico: registra `fechaEgreso`, pasa el estado a REPLEGADO y lo
   * desvincula del grupo. Eso lo libera para otros operativos (Ubicuidad).
   */
  const removeAgenteFromOperativo = useCallback((operativoId: string, agenteId: string) => {
    const ahora = new Date().toISOString();
    setData(d => ({
      ...d,
      operativos: d.operativos.map(o =>
        o.id === operativoId
          ? { ...o, agenteIds: o.agenteIds.filter(id => id !== agenteId) }
          : o
      ),
      grupos: d.grupos.map(g => ({
        ...g,
        agenteIds: g.agenteIds.filter(aid => aid !== agenteId),
        lider: g.lider === agenteId ? '' : g.lider,
      })),
      agentesOperativo: d.agentesOperativo.map(ao =>
        ao.usuarioId === agenteId && ao.operativoId === operativoId && !ao.fechaEgreso
          ? { ...ao, fechaEgreso: ahora, estado: 'replegado' as const, grupoId: undefined }
          : ao
      ),
      // Si estaba en un grupo, cerrar su período (CU-20 también deja rastro)
      agentesGrupoHistorial: d.agentesGrupoHistorial.map(h => {
        const suyo = d.agentesOperativo.find(
          ao => ao.id === h.agenteOperativoId && ao.usuarioId === agenteId && ao.operativoId === operativoId
        );
        return suyo && !h.fechaFin
          ? { ...h, fechaFin: ahora, motivoSalida: 'Baja del operativo' }
          : h;
      }),
    }));
  }, []);

  /**
   * Mueve a un agente entre grupos (o al pool "Sin grupo" con destino null).
   *
   * Es la ÚNICA vía para cambiar la pertenencia a un grupo por arrastre. Mantiene
   * de forma atómica las tres representaciones que conviven en el modelo:
   *   1. `grupo.agenteIds`            — lo que dibuja el tablero
   *   2. `agenteOperativo.grupoId`    — la pertenencia táctica (Decisión A)
   *   3. `agentesGrupoHistorial`      — los períodos, registro forense (CU-26)
   *
   * Antes cada drop tocaba sólo (1) y dejaba que `sanitizeData` dedujera el resto,
   * con lo cual (2) y (3) quedaban desincronizados y se perdía la trazabilidad.
   *
   * Devuelve 'lider' si se intenta mover al líder: para cambiarlo hay que editar
   * el grupo (CU-24) o extraerlo con sucesión de mando (CU-26).
   */
  const moverAgenteAGrupo = useCallback((
    operativoId: string,
    usuarioId: string,
    destinoGrupoId: string | null
  ): 'ok' | 'lider' | 'sin_agente' | 'origen_en_operacion' => {
    const ao = data.agentesOperativo.find(
      a => a.operativoId === operativoId && a.usuarioId === usuarioId && !a.fechaEgreso
    );
    if (!ao) return 'sin_agente';
    if (ao.grupoId === destinoGrupoId) return 'ok'; // nada que hacer

    const origen = ao.grupoId ? data.grupos.find(g => g.id === ao.grupoId) : undefined;
    if (origen && origen.lider === usuarioId) return 'lider';

    // Si el grupo de origen YA salió a terreno, sacar a alguien no es un
    // reacomodo: es una baja parcial con consecuencias (sucesión de mando,
    // binomio mínimo, motivo registrado). Eso es CU-26, no un arrastre.
    if (origen && grupoEnOperacion(origen.estado)) return 'origen_en_operacion';

    const ahora = new Date().toISOString();
    const destino = destinoGrupoId ? data.grupos.find(g => g.id === destinoGrupoId) : undefined;
    // Sólo se abre período si el destino YA está operando (refuerzo en terreno).
    // Entre grupos en armado no se registra nada: es tanteo del Coordinador.
    const destinoOperando = !!destino && grupoEnOperacion(destino.estado);

    setData(d => ({
      ...d,
      grupos: d.grupos.map(g => {
        if (g.id === ao.grupoId) {
          return { ...g, agenteIds: g.agenteIds.filter(uid => uid !== usuarioId) };
        }
        if (g.id === destinoGrupoId && !g.agenteIds.includes(usuarioId)) {
          return { ...g, agenteIds: [...g.agenteIds, usuarioId] };
        }
        return g;
      }),
      agentesOperativo: d.agentesOperativo.map(a =>
        a.id === ao.id ? { ...a, grupoId: destinoGrupoId ?? undefined } : a
      ),
      agentesGrupoHistorial: destinoOperando
        ? [...d.agentesGrupoHistorial, {
            id: uniqueId('agh'),
            agenteOperativoId: ao.id,
            grupoId: destinoGrupoId!,
            fechaInicio: ahora,
          }]
        : d.agentesGrupoHistorial,
    }));

    return 'ok';
  }, [data.agentesOperativo, data.grupos]);

  /* ── CU-26: Extraer Agente de Grupo Activo (Baja Parcial / Contingencia) ── */

  /**
   * Evalúa si se puede extraer a un agente de su grupo, SIN mutar nada.
   * La vista la usa para decidir qué modales mostrar antes de confirmar.
   */
  const evaluarExtraccion = useCallback((agenteOperativoId: string): EvaluacionExtraccion => {
    const ao = data.agentesOperativo.find(a => a.id === agenteOperativoId);
    if (!ao?.grupoId) return { permitido: false as const, motivo: 'sin_grupo' as const };

    const grupo = data.grupos.find(g => g.id === ao.grupoId);
    if (!grupo) return { permitido: false as const, motivo: 'sin_grupo' as const };

    // Precondición CU-26: grupo DESPLEGADO, RASTRILLANDO o EN PAUSA
    if (!ESTADOS_GRUPO_EN_OPERACION.includes(grupo.estado)) {
      return { permitido: false as const, motivo: 'estado_grupo' as const, grupo };
    }

    // Miembros vigentes del grupo (los que NO egresaron del operativo)
    const miembros = data.agentesOperativo.filter(
      a => a.grupoId === grupo.id && !a.fechaEgreso
    );

    // Precondición CU-26: al menos 2 integrantes asignados
    if (miembros.length < 2) {
      return { permitido: false as const, motivo: 'minimo_integrantes' as const, grupo };
    }

    const esLider = grupo.lider === ao.usuarioId;
    const restantes = miembros.filter(m => m.id !== ao.id);

    return {
      permitido: true as const,
      grupo,
      /** Paso 4.1 — sucesión de mando obligatoria */
      requiereSucesion: esLider,
      /** Candidatos a nuevo líder (usuarioId), excluyendo al que se retira */
      candidatosLider: restantes.map(m => m.usuarioId),
      /** Paso 5.1 — quedará por debajo del binomio mínimo */
      alertaBinomio: restantes.length === 1,
      miembrosRestantes: restantes.length,
    };
  }, [data.agentesOperativo, data.grupos]);

  /**
   * Ejecuta la extracción (CU-26 pasos 7 y 8) como una transacción única:
   *  7. grupo_id = NULL en el agente + su estado individual al elegido.
   *  8.1 Si quedan 2+, el estado del grupo NO se modifica.
   *  8.2 Si queda 1 solo, el grupo pasa automáticamente a EN PAUSA.
   *  Obs.1 Cierra el período en agentesGrupoHistorial (trazabilidad judicial):
   *        NO se borra la participación, se sella con fechaFin y motivo.
   */
  const extraerAgenteDeGrupo = useCallback((
    agenteOperativoId: string,
    opciones: { motivo: string; nuevoEstado: EstadoOperativoAgente; nuevoLiderUsuarioId?: string }
  ) => {
    const ahora = new Date().toISOString();
    const ejecutor = usuario?.id;

    setData(d => {
      const ao = d.agentesOperativo.find(a => a.id === agenteOperativoId);
      if (!ao?.grupoId) return d;
      const grupoId = ao.grupoId;

      const restantes = d.agentesOperativo.filter(
        a => a.grupoId === grupoId && !a.fechaEgreso && a.id !== ao.id
      );

      return {
        ...d,
        // Paso 7: liberar al agente y aplicar su nuevo estado individual
        agentesOperativo: d.agentesOperativo.map(a =>
          a.id === ao.id
            ? { ...a, grupoId: undefined, estado: opciones.nuevoEstado }
            : a
        ),
        grupos: d.grupos.map(g => {
          if (g.id !== grupoId) return g;
          return {
            ...g,
            agenteIds: g.agenteIds.filter(uid => uid !== ao.usuarioId),
            // Paso 4.1: sucesión de mando si el que sale era el líder
            lider: opciones.nuevoLiderUsuarioId ?? (g.lider === ao.usuarioId ? '' : g.lider),
            // Paso 8: aislamiento táctico ⇒ EN PAUSA; si no, no se toca
            estado: restantes.length === 1 ? ('en_pausa' as const) : g.estado,
          };
        }),
        // Observación 1: cerrar el período, nunca borrarlo
        agentesGrupoHistorial: d.agentesGrupoHistorial.map(h =>
          h.agenteOperativoId === ao.id && h.grupoId === grupoId && !h.fechaFin
            ? { ...h, fechaFin: ahora, motivoSalida: opciones.motivo, registradoPor: ejecutor }
            : h
        ),
      };
    });
  }, [usuario?.id]);

  /* ── AgenteOperativo (datos tácticos) ── */

  const getAgenteOperativo = useCallback(
    (operativoId: string, usuarioId: string): AgenteOperativo | undefined =>
      data.agentesOperativo.find(
        ao => ao.operativoId === operativoId && ao.usuarioId === usuarioId && !ao.fechaEgreso
      ),
    [data.agentesOperativo]
  );

  const updateAgenteOperativo = useCallback((id: string, cambios: Partial<AgenteOperativo>) => {
    setData(d => ({
      ...d,
      agentesOperativo: d.agentesOperativo.map(ao =>
        ao.id === id ? { ...ao, ...cambios } : ao
      ),
    }));
  }, []);

  /* ── Confirmación de email ── */

  const confirmarEmail = useCallback((token: string): 'ok' | 'ya_confirmado' | 'invalido' => {
    let resultado: 'ok' | 'ya_confirmado' | 'invalido' = 'invalido';

    setData(d => {
      const idx = d.usuarios.findIndex(u => u.tokenConfirmacion === token);
      if (idx === -1) {
        // Token no existe — puede que ya se usó o nunca existió
        const yaConfirmado = d.usuarios.some(u => !u.tokenConfirmacion && u.emailConfirmado);
        resultado = 'invalido';
        return d;
      }
      if (d.usuarios[idx].emailConfirmado) {
        resultado = 'ya_confirmado';
        return d;
      }
      resultado = 'ok';
      const updated = d.usuarios.map((u, i) =>
        i === idx ? { ...u, emailConfirmado: true, tokenConfirmacion: undefined } : u
      );
      // También actualizar la sesión si es el usuario logueado
      return { ...d, usuarios: updated };
    });

    // Sincronizar sesión activa si corresponde
    setUsuario(prev => {
      if (prev?.tokenConfirmacion === token) {
        return { ...prev, emailConfirmado: true, tokenConfirmacion: undefined };
      }
      return prev;
    });

    return resultado;
  }, []);

  /* ── Puesto de Comando ── */

  const moverPuestoComando = useCallback((
    operativoId: string,
    puntoId: string,
    newLat: number,
    newLng: number,
    motivo?: string
  ) => {
    setData(d => ({
      ...d,
      operativos: d.operativos.map(o => {
        if (o.id !== operativoId) return o;
        // Find the current PC to build the history entry
        const pcActual = o.puntos.find(p => p.id === puntoId);
        const historialEntry: HistorialPuestoCom | undefined = pcActual
          ? {
              fecha: new Date().toISOString(),
              lat: pcActual.lat,
              lng: pcActual.lng,
              motivo: motivo ?? 'Sin motivo indicado',
            }
          : undefined;

        return {
          ...o,
          puntos: o.puntos.map(p =>
            p.id === puntoId ? { ...p, lat: newLat, lng: newLng } : p
          ),
          historialPuestoComando: historialEntry
            ? [...(o.historialPuestoComando ?? []), historialEntry]
            : o.historialPuestoComando,
        };
      }),
    }));
  }, []);

  return (
    <AppContext.Provider value={{
      usuario,
      isAuthenticated: !!usuario,
      isDark,
      toggleDark,
      data,
      login,
      logout,
      actualizarPerfilPropio,
      refrescarUsuario,
      addOperativo,
      updateOperativo,
      deleteOperativo,
      getOperativo,
      addUsuario,
      updateUsuario,
      deleteUsuario,
      addGrupo,
      updateGrupo,
      deleteGrupo,
      addAgenteToOperativo,
      removeAgenteFromOperativo,
      moverAgenteAGrupo,
      evaluarExtraccion,
      extraerAgenteDeGrupo,
      getAgenteOperativo,
      updateAgenteOperativo,
      confirmarEmail,
      moverPuestoComando,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}