-- ============================================================================
-- 011 · Orden de los eventos que nacen en la misma transacción (24/09)
-- ============================================================================
-- CURRENT_TIMESTAMP en Postgres es la hora de INICIO de la transacción: todos
-- los eventos de un mismo cambio (el grupo que se crea y sus integrantes que se
-- suman, el grupo que sale y la cascada a cada agente) quedaban con el mismo
-- `registrado_en`, y la línea de tiempo no podía saber cuál fue primero. Se
-- veía "Ana se sumó al grupo" antes de "Grupo creado".
--
-- clock_timestamp() es la hora real de cada INSERT: dentro de una transacción
-- respeta el orden en que el backend registra los eventos (primero el del
-- grupo, después los de la cascada). `ocurrido_en` no cambia: sigue siendo la
-- hora en que pasó el hecho, igual para todos los eventos de un mismo cambio.
--
-- Los eventos anteriores a esta migración conservan su empate; las consultas
-- de línea de tiempo lo desempatan poniendo el evento del grupo primero.
-- ============================================================================

ALTER TABLE public.eventos_estado
  ALTER COLUMN registrado_en SET DEFAULT clock_timestamp();

COMMENT ON COLUMN public.eventos_estado.registrado_en IS
  'Cuándo llegó el evento al servidor (clock_timestamp: dentro de una transacción ordena los eventos en el orden en que se registraron).';
