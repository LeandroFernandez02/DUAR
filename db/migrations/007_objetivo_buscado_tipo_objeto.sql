-- ============================================================================
--  MIGRACIÓN 007 · OBJETIVO BUSCADO — SOPORTE PARA "OBJETO" (CU-12/13/14)
--  Sistema DUAR · Fecha: 2026-09-17
-- ----------------------------------------------------------------------------
--  ORDEN: 00_tipos → bd.sql → 002 → 003 → 004 → 005 → 006 → ESTE ARCHIVO
--
--  PROBLEMA QUE RESUELVE
--  El CU-12 (Registrar Objetivo) describe DOS formularios alternativos: uno
--  para Persona y otro para Objeto (vehículo, embarcación, paquete, etc.),
--  pero `objetivo_buscado` sólo tiene columnas de Persona (nombre, apellido,
--  dni, edad, genero, estatura, complexion_fisica, colores, vestimenta,
--  detalles_adicionales). No existe ni una columna que discrimine el tipo
--  de ficha ni columnas para los datos propios de un Objeto.
--
--  SOLUCIÓN
--  Se agrega `tipo` (enum) para discriminar Persona/Objeto, y columnas
--  nullable para los datos de Objeto. Las columnas de Persona quedan tal
--  cual — se ignoran cuando tipo = 'OBJETO', igual que ya se ignoran las
--  de Objeto cuando tipo = 'PERSONA'.
--
--  Las dimensiones (alto/ancho/largo) se guardan en centímetros, misma
--  convención ya usada para `estatura`.
--
--  Idempotente: seguro de re-ejecutar.
-- ============================================================================

BEGIN;

-- ############################################################################
-- [1] Enum tipo_objetivo (CREATE TYPE no admite IF NOT EXISTS)
-- ############################################################################

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_objetivo') THEN
    CREATE TYPE tipo_objetivo AS ENUM ('PERSONA', 'OBJETO');
  END IF;
END $$;

-- ############################################################################
-- [2] Columna discriminante — backfill implícito: todo lo cargado hasta hoy
--     (vía el formulario mock) era siempre Persona.
-- ############################################################################

ALTER TABLE public.objetivo_buscado
    ADD COLUMN IF NOT EXISTS tipo tipo_objetivo NOT NULL DEFAULT 'PERSONA';

COMMENT ON COLUMN public.objetivo_buscado.tipo IS
    'Discrimina si la ficha describe una Persona o un Objeto buscado (CU-12). Determina qué bloque de columnas es el vigente: Persona (nombre/apellido/dni/edad/genero/estatura/complexion_fisica/color_*/vestimenta) u Objeto (tipo_objeto/color/marca/modelo/dimension_*).';

-- ############################################################################
-- [3] Columnas de Objeto — todas nullable, sólo se completan si tipo='OBJETO'
-- ############################################################################

ALTER TABLE public.objetivo_buscado
    ADD COLUMN IF NOT EXISTS tipo_objeto     varchar(30),
    ADD COLUMN IF NOT EXISTS color           varchar(100),
    ADD COLUMN IF NOT EXISTS marca           varchar(100),
    ADD COLUMN IF NOT EXISTS modelo          varchar(100),
    ADD COLUMN IF NOT EXISTS dimension_alto  integer,
    ADD COLUMN IF NOT EXISTS dimension_ancho integer,
    ADD COLUMN IF NOT EXISTS dimension_largo integer;

COMMENT ON COLUMN public.objetivo_buscado.tipo_objeto IS
    'Categoría libre del objeto (vehiculo/embarcacion/aeronave/paquete/equipaje/arma/animal/documento/otro) — validada sólo en el frontend, mismo criterio que complexion_fisica/color_piel: lista corta y fija que no amerita un catálogo administrable.';
COMMENT ON COLUMN public.objetivo_buscado.dimension_alto  IS 'Alto del objeto, en centímetros. Misma convención que estatura.';
COMMENT ON COLUMN public.objetivo_buscado.dimension_ancho IS 'Ancho del objeto, en centímetros.';
COMMENT ON COLUMN public.objetivo_buscado.dimension_largo IS 'Largo del objeto, en centímetros.';

-- ############################################################################
-- [4] Resemantización de fotos_objetivo.url_foto (no se migra el tipo de
--     columna, sólo se documenta el cambio de significado)
-- ############################################################################
--  Antes: pensada para una URL pública resoluble directamente.
--  Ahora: guarda el PATH del objeto dentro del bucket privado de Supabase
--  Storage (ej. "<operativoId>/<uuid>.jpg"), NUNCA una URL. La URL firmada
--  se genera en caliente en cada lectura (server/src/services/storage.service.js)
--  y no se persiste — expira sola.

COMMENT ON COLUMN public.fotos_objetivo.url_foto IS
    'Desde 2026-09 (CU-12/13/14 con Supabase Storage): guarda el PATH del objeto dentro del bucket privado "objetivos-fotos" (ej. "<operativoId>/<uuid>.jpg"), NO una URL resoluble. La URL firmada se genera en caliente en cada lectura y expira — nunca se persiste. El nombre de columna se mantiene para no romper la fila existente; el significado cambió.';

COMMIT;

-- ============================================================================
--  VERIFICACIÓN
-- ----------------------------------------------------------------------------
--  SELECT typname FROM pg_type WHERE typname = 'tipo_objetivo';
--
--  SELECT column_name, data_type, is_nullable
--    FROM information_schema.columns
--   WHERE table_name = 'objetivo_buscado'
--     AND column_name IN ('tipo','tipo_objeto','color','marca','modelo',
--                          'dimension_alto','dimension_ancho','dimension_largo')
--   ORDER BY column_name;
--
--  Esperado: 8 filas, `tipo` NOT NULL, el resto nullable.
-- ============================================================================
