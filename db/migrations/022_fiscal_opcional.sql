-- ═════════════════════════════════════════════════════════════════════════
-- 022 · Fiscal de instrucción opcional (CU-08 / CU-09), 15/10
--
-- Al abrir un operativo todavía puede no haber un fiscal asignado (una
-- búsqueda de persona perdida suele arrancar antes de que la causa lo tenga).
-- El campo deja de ser obligatorio: sin fiscal queda en NULL, no en texto vacío.
--
-- Es seguro aplicarla ANTES de publicar el código: la versión anterior sigue
-- mandando siempre un fiscal y no se entera del cambio. Idempotente.
-- ═════════════════════════════════════════════════════════════════════════

ALTER TABLE public.operativos ALTER COLUMN fiscal_instruccion DROP NOT NULL;

COMMENT ON COLUMN public.operativos.fiscal_instruccion IS
  'Fiscal de instrucción a cargo de la causa. Opcional: NULL mientras no haya uno asignado (CU-08/09).';
