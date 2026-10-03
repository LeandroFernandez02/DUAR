/**
 * Fecha y hora en Argentina para los campos `datetime-local` (que no tienen zona:
 * muestran y devuelven "YYYY-MM-DDTHH:mm" a secas).
 *
 * Se usa la zona de Argentina y no la del navegador: el sistema opera en Córdoba
 * y una computadora con la zona mal configurada no debe correr la hora del
 * operativo. Argentina es UTC−3 todo el año (sin horario de verano desde 2009);
 * el servidor completa la zona al guardar (operativo.controller#conZonaArgentina).
 *
 * Antes el valor por defecto salía de `toISOString()`, que está en UTC: el
 * formulario mostraba 3 horas de más, y además se calculaba una sola vez al
 * cargar la página, así que también quedaba la hora vieja si la página llevaba
 * rato abierta.
 */
const ZONA = 'America/Argentina/Cordoba';

const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/** Un instante → "YYYY-MM-DDTHH:mm" en hora de Argentina. */
function aCampo(fecha: Date): string {
  const p = Object.fromEntries(formato.formatToParts(fecha).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

const formatoTexto = new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA,
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/**
 * Para mostrar: "02/10/2026, 14:30" en hora de Argentina y en 24 h. Sin
 * `hourCycle`, Chrome muestra las 14:30 de 'es-AR' como "2:30 p. m." o
 * directamente "02:30" sin el "p. m.", que se lee como de madrugada.
 */
export function fechaHoraArgentina(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? iso : formatoTexto.format(fecha);
}

/** Ahora mismo, en hora de Argentina, para precargar un campo `datetime-local`. */
export const ahoraEnArgentina = () => aCampo(new Date());

/**
 * Lo que guarda la API (ISO con zona) → valor del campo en hora de Argentina.
 * Una fecha sola ("2026-03-15", datos viejos) se toma como las 00:00 de ese día.
 */
export function campoDesdeIso(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return `${iso}T00:00`;
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? iso.slice(0, 16) : aCampo(fecha);
}
