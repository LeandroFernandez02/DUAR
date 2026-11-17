-- ═════════════════════════════════════════════════════════════════════════
-- 038 · «Dotación» pasa a llamarse «Dependencia» en la base (17/11)
--
-- Desde el 06/11 (migración 033) la app dice «Dependencia», pero la base seguía
-- con el nombre viejo. Es sólo un cambio de nombres: no toca datos.
--
--   · tabla    cat_dotaciones         →  cat_dependencias
--   · columna  usuarios.dotacion_id   →  usuarios.dependencia_id
--   · claves foráneas, únicas y la clave primaria que arrastraban el nombre viejo
--
-- Las migraciones anteriores (005, 033, 034…) NO se reescriben: son el historial.
--
-- IMPORTANTE · aplicar JUSTO ANTES de publicar el código de esta versión (el
-- servidor nuevo usa los nombres nuevos y el viejo, los viejos): entre una cosa
-- y la otra el registro y la edición de perfil pueden fallar unos minutos.
-- Idempotente: se puede correr más de una vez.
-- ═════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.cat_dotaciones') IS NOT NULL AND to_regclass('public.cat_dependencias') IS NULL THEN
    ALTER TABLE public.cat_dotaciones RENAME TO cat_dependencias;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'dotacion_id') THEN
    ALTER TABLE public.usuarios RENAME COLUMN dotacion_id TO dependencia_id;
  END IF;
END $$;

-- Nombres de las restricciones (los índices que las respaldan cambian con ellas).
DO $$
DECLARE
  par text[];
BEGIN
  FOREACH par SLICE 1 IN ARRAY ARRAY[
    ['cat_dependencias', 'cat_dotaciones_pkey',                   'cat_dependencias_pkey'],
    ['cat_dependencias', 'cat_dotaciones_id_institucion_key',     'cat_dependencias_id_institucion_key'],
    ['cat_dependencias', 'cat_dotaciones_institucion_nombre_key', 'cat_dependencias_institucion_nombre_key'],
    ['cat_dependencias', 'cat_dotaciones_institucion_fkey',       'cat_dependencias_institucion_fkey'],
    ['usuarios',         'usuarios_dotacion_id_fkey',             'usuarios_dependencia_id_fkey'],
    ['usuarios',         'usuarios_dotacion_coherente_fkey',      'usuarios_dependencia_coherente_fkey']
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_constraint c
                WHERE c.conname = par[2] AND c.conrelid = ('public.' || par[1])::regclass) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I', par[1], par[2], par[3]);
    END IF;
  END LOOP;
END $$;

COMMENT ON COLUMN public.agentes_operativo.dependencia_nombre IS
  'Foto: dependencia (cat_dependencias) de la persona durante este operativo. Se congela al egresar (migración 034).';

COMMIT;

-- Verificación:
-- SELECT to_regclass('public.cat_dependencias'), to_regclass('public.cat_dotaciones');   -- la segunda, NULL
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name LIKE 'depend%';
