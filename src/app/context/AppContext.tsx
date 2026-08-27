import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  initialData, Usuario, Operativo, GrupoRastrillaje, AppData, HistorialPuestoCom,
  AgenteOperativo, inferirCaminante,
} from '../data/mockData';
import { generarTokenConfirmacion } from '../services/emailService';

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

  // Build agent ownership map: each agent belongs to at most one group.
  // Leaders are claimed first (first-occurrence of leader wins), then non-leader members.
  const agentOwnership = new Map<string, string>(); // agentId → groupId

  // Pass 1: claim leaders (first group per leader wins)
  rawGrupos.forEach(g => {
    if (g.lider && !agentOwnership.has(g.lider)) {
      agentOwnership.set(g.lider, g.id);
    }
  });

  // Pass 2: claim non-leader members (first occurrence wins)
  rawGrupos.forEach(g => {
    g.agenteIds.forEach(aid => {
      if (!agentOwnership.has(aid)) {
        agentOwnership.set(aid, g.id);
      }
    });
  });

  // Pass 3: rebuild each group keeping only agents owned by that group
  const grupos = rawGrupos.map(g => {
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
  };
}

interface AppContextType {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  isDark: boolean;
  toggleDark: () => void;
  data: AppData;
  login: (email: string, password: string) => 'ok' | 'credentials' | 'inactive';
  logout: () => void;
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
  deleteGrupo: (id: string) => void;
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
    const SCHEMA_VERSION = '6'; // v6: AgenteOperativo (Decisión A) + esConductor
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

  const login = useCallback((email: string, password: string): 'ok' | 'credentials' | 'inactive' => {
    const found = data.usuarios.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return 'credentials';
    // Los usuarios eliminados son invisibles — tratarlos como credenciales incorrectas
    // para no revelar que la cuenta existió alguna vez.
    if (found.estado === 'eliminado') return 'credentials';
    if (found.estado === 'inactivo') return 'inactive';
    setUsuario(found);
    return 'ok';
  }, [data.usuarios]);

  const logout = useCallback(() => {
    setUsuario(null);
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
    setData(d => ({ ...d, grupos: [...d.grupos, { ...grupo, id }] }));
    return id;
  }, []);

  const updateGrupo = useCallback((id: string, grupo: Partial<GrupoRastrillaje>) => {
    setData(d => {
      const anterior = d.grupos.find(g => g.id === id);
      const grupos = d.grupos.map(g => (g.id === id ? { ...g, ...grupo } : g));

      // ── Regla del Conductor (nota de negocio · CU-18) ──────────────────────
      // El conductor entra al grupo junto con los demás, pero cuando el grupo
      // arranca el rastrillaje él se queda con el vehículo: pasa a EN_ESPERA.
      // Es automático y silencioso, igual que DESPLEGADO/RASTRILLANDO en CU-18.
      // Sigue perteneciendo al grupo, pero deja de contar como rastrillador
      // efectivo para el Binomio Mínimo de CU-26 (ver contarRastrilladores).
      const arrancaRastrillaje =
        grupo.estado === 'rastrillando' && anterior?.estado !== 'rastrillando';

      if (!arrancaRastrillaje) {
        return { ...d, grupos };
      }

      return {
        ...d,
        grupos,
        agentesOperativo: d.agentesOperativo.map(ao =>
          ao.grupoId === id && !ao.fechaEgreso && ao.esConductor && !ao.esCaminante
            ? { ...ao, estado: 'en_espera' as const }
            : ao
        ),
      };
    });
  }, []);

  const deleteGrupo = useCallback((id: string) => {
    setData(d => ({ ...d, grupos: d.grupos.filter(g => g.id !== id) }));
  }, []);

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
    }));
  }, []);

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