-- ============================================================================
-- 023 · El correo de una cuenta ELIMINADA queda libre (Testeo 15/10, punto 29 · CU-07)
-- ============================================================================
-- Decisión del 18/10: si una cuenta se eliminó, con su correo se puede crear una
-- cuenta nueva (otra persona, otro DNI). Reemplaza la regla del 05/10 («el correo
-- queda reservado para su dueño»).
--
-- Lo que NO cambia:
--   · el DNI sigue siendo UNIQUE pleno: quien vuelve con el DNI de una cuenta
--     eliminada reactiva ESA cuenta (mismo id, historial unido);
--   · la fila eliminada conserva su correo tal cual: el historial y la auditoría
--     siguen diciendo con qué correo operó esa cuenta.
--
-- Entre las cuentas vigentes el correo sigue siendo único, ahora también sin
-- importar mayúsculas (antes eso lo controlaba sólo la aplicación).
-- Idempotente.
-- ============================================================================

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_vigente_key
  ON usuarios (lower(email))
  WHERE eliminado_en IS NULL;

COMMENT ON INDEX usuarios_email_vigente_key IS
  'Correo único entre cuentas vigentes (sin importar mayúsculas). El de una cuenta eliminada queda libre (023, 18/10).';
