-- =============================================================================
--  020 · search_path fijo en las funciones de la 019
-- =============================================================================
--  El asesor de seguridad de Supabase (lint 0011, function_search_path_mutable)
--  marcó las dos funciones de trigger de la 019: sin un search_path fijo, quien
--  pueda crear objetos en otro esquema podría hacer que la función use los
--  suyos en lugar de los de la base. Se fija explícito. PostGIS vive en el
--  esquema `extensions` (ST_Area, ST_Perimeter, geography).
--  Idempotente; no cambia ningún dato ni comportamiento.
-- =============================================================================

ALTER FUNCTION public.poligono_medidas()       SET search_path = public, extensions;
ALTER FUNCTION public.marcador_hallazgo_fijo() SET search_path = public;
