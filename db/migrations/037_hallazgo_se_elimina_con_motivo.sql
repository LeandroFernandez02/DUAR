-- ═════════════════════════════════════════════════════════════════════════
-- 037 · Un hallazgo se puede eliminar, con motivo (16/11)
--
-- Decisión del usuario: el coordinador elimina puntos de interés, hallazgos e
-- instalaciones. Hasta ahora un hallazgo no se podía eliminar (019,
-- hallazgo_no_se_elimina: «es evidencia»). Desde ahora sí, pero:
--   · sigue siendo una baja con registro: la fila NO se borra (eliminado_en,
--     eliminado_por) y las fotos quedan;
--   · el motivo es obligatorio para un hallazgo (nueva columna motivo_eliminacion,
--     que también guarda el motivo de un punto de interés o instalación si se da);
--   · sale del mapa, pero el informe del operativo lo sigue mostrando, marcado
--     como eliminado, con quién, cuándo y por qué.
-- No cambia: un hallazgo no vuelve a ser punto de interés y sus fotos no se quitan.
--
-- Aplicar ANTES del deploy (el servidor nuevo escribe motivo_eliminacion). Idempotente.
-- ═════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.marcadores
  ADD COLUMN IF NOT EXISTS motivo_eliminacion text;

ALTER TABLE public.marcadores
  DROP CONSTRAINT IF EXISTS hallazgo_no_se_elimina;

ALTER TABLE public.marcadores
  DROP CONSTRAINT IF EXISTS marcador_motivo_eliminacion_largo;
ALTER TABLE public.marcadores
  ADD CONSTRAINT marcador_motivo_eliminacion_largo
  CHECK (motivo_eliminacion IS NULL OR char_length(motivo_eliminacion) BETWEEN 3 AND 300);

-- Un hallazgo eliminado tiene que decir por qué.
ALTER TABLE public.marcadores
  DROP CONSTRAINT IF EXISTS hallazgo_eliminado_con_motivo;
ALTER TABLE public.marcadores
  ADD CONSTRAINT hallazgo_eliminado_con_motivo
  CHECK (clase <> 'HALLAZGO' OR eliminado_en IS NULL OR motivo_eliminacion IS NOT NULL);

COMMENT ON COLUMN public.marcadores.motivo_eliminacion IS
  'Por qué se dio de baja (obligatorio en un hallazgo, 037). Sale en el informe del operativo.';
COMMENT ON TABLE public.marcadores IS
  'Puntos de interés, hallazgos e instalaciones SCI (CU-35/36). Un hallazgo se elimina sólo con motivo y queda en el informe (037).';

COMMIT;

-- Verificación:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'public.marcadores'::regclass ORDER BY 1;
