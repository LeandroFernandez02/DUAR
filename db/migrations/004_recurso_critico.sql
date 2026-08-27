-- ============================================================================
--  MIGRACIÓN 004 · RECURSO CRÍTICO EN EL CATÁLOGO DE ESPECIALIDADES
--  Sistema DUAR · Fecha: 2026-08-27
-- ----------------------------------------------------------------------------
--  ORDEN: 00_tipos → bd.sql → 002_correctivo → 003_conductor → ESTE ARCHIVO
--
--  PROBLEMA QUE RESUELVE
--  La regla "¿este agente sale a caminar el polígono?" estaba HARDCODEADA en el
--  frontend como una lista blanca:
--      esCaminante = (especialidad === 'bombero' || 'bombero voluntario')
--  Es frágil por diseño: toda especialidad NUEVA cae por defecto en "no camina".
--  Con el catálogo real ya cargado quedó demostrado — 'Canes' y 'Defensa Civil'
--  se marcarían como NO caminantes, cuando ambos rastrillan.
--  El error cae del lado peligroso: un "no caminante" por omisión queda fuera del
--  rastrillaje y no cuenta para el Binomio Mínimo (CU-26) => se pierde capacidad
--  de búsqueda sin que el sistema avise.
--
--  SOLUCIÓN
--  "Recurso crítico" pasa a ser un DATO del catálogo, no lógica escondida en código.
--  Definición de negocio: es recurso crítico aquel cuya función especializada se
--  PERDERÍA si saliera a caminar el polígono (debe permanecer en el Punto Cero,
--  con el vehículo o con su equipo).
--
--      es_caminante  =  NOT especialidad.es_recurso_critico
--
--  Al ser una columna NOT NULL, toda especialidad nueva obliga a clasificarla
--  explícitamente en vez de heredar un default silencioso y equivocado.
--
--  Idempotente: seguro de re-ejecutar.
-- ============================================================================

BEGIN;

-- ############################################################################
-- [1] Nueva columna en el catálogo
-- ############################################################################

ALTER TABLE public.cat_especialidades
    ADD COLUMN IF NOT EXISTS es_recurso_critico boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.cat_especialidades.es_recurso_critico IS
    'TRUE si la funcion especializada se perderia al salir a caminar el poligono (debe permanecer en Punto Cero, con el vehiculo o con su equipo). Determina la inferencia por defecto de agentes_operativo.es_caminante: es_caminante = NOT es_recurso_critico. El Coordinador puede sobrescribirlo por operativo, con advertencia (CU-17).';


-- ############################################################################
-- [2] Clasificación del catálogo actual
-- ############################################################################
--  Se aplica por nombre (case-insensitive y tolerante a la falta de acento,
--  ya que el catálogo tiene 'Paramedico' sin tilde).
--  Sólo toca las filas existentes; no inserta especialidades nuevas.

-- 2.a · CRÍTICOS: su función los ancla a un punto fijo
UPDATE public.cat_especialidades
   SET es_recurso_critico = true
 WHERE lower(translate(nombre, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) IN ('paramedico', 'dron');

-- 2.b · NO CRÍTICOS: su función ES rastrillar el terreno
UPDATE public.cat_especialidades
   SET es_recurso_critico = false
 WHERE lower(translate(nombre, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) IN ('bombero', 'bombero voluntario', 'canes', 'defensa civil');

COMMIT;

-- ============================================================================
--  VERIFICACIÓN
-- ----------------------------------------------------------------------------
--  SELECT nombre, es_recurso_critico,
--         NOT es_recurso_critico AS caminante_por_defecto
--    FROM cat_especialidades
--   ORDER BY es_recurso_critico DESC, nombre;
--
--  Esperado:
--    Dron               | t | f   <- opera equipo desde punto fijo
--    Paramedico         | t | f   <- debe estar disponible para asistir heridos
--    Bombero            | f | t
--    Bombero Voluntario | f | t
--    Canes              | f | t   <- el binomio guia-perro rastrilla
--    Defensa Civil      | f | t
-- ============================================================================
