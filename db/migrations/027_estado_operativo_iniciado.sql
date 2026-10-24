-- ============================================================================
-- 027 · «Activo» pasa a llamarse «Iniciado» (estado_operativo) — 24/10
-- ============================================================================
-- Decisión del usuario: «iniciado» es más descriptivo que «activo» (que además se
-- confundía con el estado de las cuentas de usuario). Sólo cambia el nombre del valor:
-- ninguna fila, función, índice ni restricción se toca (no hay ninguno que lo nombre
-- como texto; ver la verificación del 24/10). Las filas de auditoría anteriores
-- conservan 'ACTIVO' en su JSON: es la historia de lo que pasó.
--
-- Se aplica JUSTO al publicar el código que lo usa (el código viejo escribe 'ACTIVO').
-- Idempotente.
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
              WHERE t.typname = 'estado_operativo' AND e.enumlabel = 'ACTIVO') THEN
    ALTER TYPE estado_operativo RENAME VALUE 'ACTIVO' TO 'INICIADO';
  END IF;
END $$;
