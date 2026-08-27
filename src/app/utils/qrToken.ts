/**
 * qrToken.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gestión de tokens de acceso para el QR de registro de agentes.
 *
 * Flujo:
 *  1. Al abrir el modal QR, se llama a getOrCreateQRToken → devuelve token
 *     vigente o genera uno nuevo.
 *  2. El token se embebe en la URL del QR: /registro/:id?qr=<token>
 *  3. El sistema rota automáticamente cada 24 horas.
 *  4. El coordinador puede forzar regeneración anticipada (regenerateQRToken).
 *  5. Registro.tsx valida el token al cargar la página vía validateQRToken.
 */

const STORAGE_PREFIX = 'duar_qr_token_';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export interface QRTokenInfo {
  token: string;
  expiresAt: number;  // epoch ms
  generatedAt: number; // epoch ms
}

function randomToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2)
  );
}

function storeToken(operativoId: string, info: QRTokenInfo): void {
  localStorage.setItem(STORAGE_PREFIX + operativoId, JSON.stringify(info));
}

function loadToken(operativoId: string): QRTokenInfo | null {
  const raw = localStorage.getItem(STORAGE_PREFIX + operativoId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QRTokenInfo;
  } catch {
    return null;
  }
}

/**
 * Devuelve el token activo si aún no expiró; de lo contrario genera uno nuevo.
 */
export function getOrCreateQRToken(operativoId: string): QRTokenInfo {
  const existing = loadToken(operativoId);
  if (existing && Date.now() < existing.expiresAt) {
    return existing;
  }
  return regenerateQRToken(operativoId);
}

/**
 * Fuerza la generación de un nuevo token (rotación manual).
 * Invalida cualquier QR ya compartido.
 */
export function regenerateQRToken(operativoId: string): QRTokenInfo {
  const info: QRTokenInfo = {
    token: randomToken(),
    expiresAt: Date.now() + TTL_MS,
    generatedAt: Date.now(),
  };
  storeToken(operativoId, info);
  return info;
}

/**
 * Valida el token recibido en la URL del QR.
 * Devuelve true solo si coincide exactamente con el almacenado y no expiró.
 */
export function validateQRToken(operativoId: string, token: string | null): boolean {
  if (!token) return false;
  const stored = loadToken(operativoId);
  if (!stored) return false;
  if (stored.token !== token) return false;
  if (Date.now() > stored.expiresAt) return false;
  return true;
}

/**
 * Formatea el tiempo restante hasta la expiración de forma legible.
 * Ej: "59m 12s", "3m 04s", "42s"
 */
export function formatTimeRemaining(expiresAt: number): string {
  const ms = Math.max(0, expiresAt - Date.now());
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

/**
 * Devuelve la fracción de tiempo consumido (0 = recién generado, 1 = expirado).
 */
export function getExpiryProgress(generatedAt: number, expiresAt: number): number {
  const total = expiresAt - generatedAt;
  const elapsed = Date.now() - generatedAt;
  return Math.min(1, Math.max(0, elapsed / total));
}
