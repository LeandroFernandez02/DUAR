/**
 * familiaToken.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gestión de tokens de acceso efímeros para el Portal de Seguimiento Familiar.
 *
 * Flujo:
 *  1. El coordinador hace clic en "Vista Familia" dentro del dashboard del operativo.
 *  2. Se genera un token UUID aleatorio y se persiste en localStorage con un TTL.
 *  3. La URL que se abre en la nueva pestaña incluye el token como query param.
 *  4. FamiliaDashboard lee el token de la URL y lo valida contra localStorage.
 *  5. Si no coincide o expiró → pantalla de acceso denegado.
 */

const STORAGE_PREFIX = 'duar_familia_token_';
const TTL_MS = 30 * 60 * 1000; // 30 minutos

interface StoredToken {
  value: string;
  expiresAt: number; // epoch ms
}

/** Genera un token, lo persiste y devuelve el valor para incluir en la URL. */
export function generateFamiliaToken(operativoId: string): string {
  const token =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  const entry: StoredToken = {
    value: token,
    expiresAt: Date.now() + TTL_MS,
  };

  localStorage.setItem(STORAGE_PREFIX + operativoId, JSON.stringify(entry));
  return token;
}

/** Valida el token de la URL contra localStorage. Devuelve true si es válido. */
export function validateFamiliaToken(operativoId: string, token: string | null): boolean {
  if (!token) return false;

  const raw = localStorage.getItem(STORAGE_PREFIX + operativoId);
  if (!raw) return false;

  try {
    const entry: StoredToken = JSON.parse(raw);
    if (entry.value !== token) return false;
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(STORAGE_PREFIX + operativoId);
      return false;
    }
    // Renovar TTL en cada visita válida (refresh window)
    entry.expiresAt = Date.now() + TTL_MS;
    localStorage.setItem(STORAGE_PREFIX + operativoId, JSON.stringify(entry));
    return true;
  } catch {
    return false;
  }
}

/** Revoca el token (útil si en el futuro se quiere cerrar acceso manualmente). */
export function revokeFamiliaToken(operativoId: string): void {
  localStorage.removeItem(STORAGE_PREFIX + operativoId);
}
