-- ============================================================================
-- 025 · Resultado del operativo al finalizar (CU-10 · CU-42 Panel general)
-- ============================================================================
-- Decisión del 19/10 (doc «Panel general de operativos»): al finalizar, además
-- de la reseña de texto libre (nota_final, 024), el coordinador elige el
-- RESULTADO de una lista cerrada. Es lo que permite contar en el panel general
-- cuántas búsquedas se resolvieron.
--
--   HALLADA_CON_VIDA · HALLADA_SIN_VIDA · OBJETO_HALLADO · SIN_HALLAZGO · SUSPENDIDA
--
-- Los operativos que ya estaban finalizados quedan con resultado NULL («sin
-- dato»): no se inventa uno. Desde ahora la API lo exige al finalizar.
-- Idempotente.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE resultado_operativo AS ENUM ('HALLADA_CON_VIDA', 'HALLADA_SIN_VIDA', 'OBJETO_HALLADO', 'SIN_HALLAZGO', 'SUSPENDIDA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE operativos ADD COLUMN IF NOT EXISTS resultado resultado_operativo;

COMMENT ON COLUMN operativos.resultado IS
  'Resultado elegido al finalizar (CU-10, 025): con vida / sin vida / objeto hallado / sin hallazgo / suspendida. NULL en los finalizados antes del 19/10.';

-- Sólo un operativo finalizado tiene resultado.
DO $$ BEGIN
  ALTER TABLE operativos ADD CONSTRAINT operativos_resultado_solo_finalizado
    CHECK (resultado IS NULL OR estado = 'FINALIZADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
