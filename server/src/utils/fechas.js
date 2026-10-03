/**
 * Las fechas y horas que se cargan a mano en los formularios están en hora de
 * Argentina (UTC−3 todo el año: no hay horario de verano desde 2009). Un campo
 * `datetime-local` las manda sin zona ("2026-10-02T11:00"), y Postgres, que
 * corre en UTC, las tomaría como 11:00 UTC = 08:00 en Argentina. Si el valor no
 * trae zona, se le agrega la de Argentina; si ya la trae (ISO con Z u offset),
 * queda como está.
 */
const SIN_ZONA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export function conZonaArgentina(valor) {
  const v = String(valor).trim();
  return SIN_ZONA.test(v) ? `${v}-03:00` : v;
}
