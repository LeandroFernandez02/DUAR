/**
 * Paneles (11/11): el último dato de cada panel queda guardado durante la sesión del navegador
 * (memoria + sessionStorage), así al volver a entrar se ve al instante y se actualiza por detrás.
 * No se usa localStorage: son datos del operativo y no deben quedar en el equipo al cerrar.
 */
const memoria = new Map<string, unknown>();

export function leerPanel<T>(clave: string): T | null {
  if (memoria.has(clave)) return memoria.get(clave) as T;
  try {
    const txt = sessionStorage.getItem(`panel:${clave}`);
    if (txt) { const v = JSON.parse(txt) as T; memoria.set(clave, v); return v; }
  } catch { /* sin almacenamiento: se carga de cero */ }
  return null;
}

export function guardarPanel(clave: string, valor: unknown) {
  memoria.set(clave, valor);
  try { sessionStorage.setItem(`panel:${clave}`, JSON.stringify(valor)); } catch { /* lleno o bloqueado: queda en memoria */ }
}
