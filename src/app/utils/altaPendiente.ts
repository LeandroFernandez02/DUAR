/**
 * Puente entre el registro por QR (Registro.tsx) y la confirmación de email
 * (ConfirmarEmail.tsx) — dos pantallas que se visitan en momentos distintos
 * (la segunda, desde el link del correo, puede abrirse minutos u horas
 * después, en otra pestaña). CU-02 paso 7 exige el mail confirmado ANTES del
 * alta (paso 6); sin este puente, el agente quedaba registrado en el sistema
 * pero nunca entraba al operativo — tenía que acordarse de volver a la
 * pestaña original y tocar "Ya confirmé mi correo".
 *
 * Se guarda en localStorage (no en el token JWT ni en la URL del mail) porque
 * el alta requiere sesión, y sesión y localStorage viven en el mismo
 * navegador — si no está una, tampoco puede completarse la otra.
 */

const CLAVE = 'duar-alta-pendiente';

export interface AltaPendiente {
  operativoId: string;
  qrToken: string;
  operativoNombre: string;
  operativoUbicacion: string;
}

export function guardarAltaPendiente(datos: AltaPendiente): void {
  localStorage.setItem(CLAVE, JSON.stringify(datos));
}

export function leerAltaPendiente(): AltaPendiente | null {
  const raw = localStorage.getItem(CLAVE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AltaPendiente;
  } catch {
    localStorage.removeItem(CLAVE);
    return null;
  }
}

export function limpiarAltaPendiente(): void {
  localStorage.removeItem(CLAVE);
}
