-- ============================================================================
--  MIGRACIÓN 009 · GRUPOS DE TRABAJO (MÓDULO 4 · CU-21 a CU-26)
--  Sistema DUAR · Fecha: 2026-09-22
-- ----------------------------------------------------------------------------
--  ORDEN: ... → 008_estados_agente_sin_en_espera → ESTE ARCHIVO
--
--  La tabla `grupos` ya existía (vacía) desde el baseline. Hasta hoy los grupos
--  vivían sólo en el mock del frontend; esta migración agrega lo que faltaba
--  para que el backend los administre:
--
--   · Nombre único por operativo (CU-21 paso 3.2: "El nombre del grupo ya está
--     en uso"). Es un índice PARCIAL: un grupo disuelto (baja lógica, CU-25)
--     queda en la tabla como registro histórico y libera su nombre — si no, en
--     un operativo de varios días no se podría volver a armar un "Grupo Alfa".
--     Se compara en minúsculas y sin espacios de borde para que "Alfa" y
--     " alfa " no convivan.
--
--   · Color del grupo. Lo asigna el backend al crearlo (el primero libre de una
--     paleta fija). Hoy lo usan las tarjetas del tablero y el portal del
--     agente; más adelante el mapa (Módulo 5) pinta el polígono del grupo con
--     este mismo color, así que tiene que ser un dato persistido y no algo que
--     cada pantalla calcule por su cuenta.
--
--  Idempotente: seguro de re-ejecutar.
-- ============================================================================

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS grupo_nombre_unico_activo_idx
    ON public.grupos (operativo_id, lower(btrim(nombre)))
 WHERE eliminado_en IS NULL;

ALTER TABLE public.grupos
    ADD COLUMN IF NOT EXISTS color varchar(7);

COMMENT ON COLUMN public.grupos.color IS
    'Color del grupo (#RRGGBB). Lo asigna el backend al crearlo, el primero libre de una paleta fija. Tarjetas del tablero, portal del agente y, en el Modulo 5, el poligono del grupo en el mapa.';

COMMENT ON COLUMN public.grupos.estado IS
    'Ciclo del grupo (CU-21 a CU-26). Cada cambio arrastra a los integrantes por cascada (grupo.model.js#aplicarCascada): EN_FORMACION/EN_APRESTO -> DISPONIBLE, DESPLEGADO -> DESPLEGADO, RASTRILLANDO -> RASTRILLANDO (no caminantes: DESPLEGADO), EN_PAUSA -> DESCANSANDO, REPLEGADO -> REPLEGADO. Nunca pisa NO_DISPONIBLE. DISUELTO va siempre junto con eliminado_en (CU-25 paso 5).';

COMMIT;

-- ============================================================================
--  VERIFICACIÓN POST-MIGRACIÓN
-- ----------------------------------------------------------------------------
--  SELECT indexdef FROM pg_indexes WHERE indexname = 'grupo_nombre_unico_activo_idx';
--  SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'grupos' AND column_name = 'color';
-- ============================================================================
