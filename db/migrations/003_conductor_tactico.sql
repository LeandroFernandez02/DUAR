-- ============================================================================
--  MIGRACIÓN 003 · CONDUCTOR COMO ESTADO LOGÍSTICO TÁCTICO
--  Sistema DUAR · Fecha: 2026-08-24
-- ----------------------------------------------------------------------------
--  ORDEN: 00_tipos → bd.sql → 002_correctivo_modulo4 → ESTE ARCHIVO
--
--  MODELO CONCEPTUAL (decidido con el usuario):
--    · Especialidad Técnica (especialidad_id) = lo que el agente SABE HACER.
--      Una sola por operativo. FK a cat_especialidades.
--    · Estado Logístico Físico (booleanos) = qué FUNCIÓN FÍSICA cumple en el
--      terreno: es_caminante, es_conductor. Viven en agentes_operativo.
--
--  DECISIÓN DE ALCANCE: el flag de conductor es SOLO TÁCTICO.
--  No se agrega usuarios.conductor. Consecuencia asumida: el Coordinador debe
--  marcar quién conduce en cada operativo; el sistema no arrastra esa aptitud
--  desde el perfil global. (La nota del docx pedía un campo global en el alta
--  de usuario; se descartó a favor del modelo puramente táctico.)
--
--  "Conductor" deja de ser una especialidad. En esta BD cat_especialidades está
--  vacía (0 filas), así que no hay datos que convertir: el DELETE de abajo es
--  defensivo, para el caso de que el catálogo se haya sembrado en otro entorno.
--
--  Idempotente: seguro de re-ejecutar.
-- ============================================================================

BEGIN;

-- ############################################################################
-- [1] Nuevo estado logístico: es_conductor
-- ############################################################################

ALTER TABLE public.agentes_operativo
    ADD COLUMN IF NOT EXISTS es_conductor boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.agentes_operativo.es_conductor IS
    'Estado logistico TACTICO: en ESTE operativo cumple la funcion de conductor del vehiculo. Exclusivo del Coordinador (CU-17). Cuando el grupo pasa a RASTRILLANDO, el conductor pasa automaticamente a EN_ESPERA y deja de contar como rastrillador efectivo (CU-26, Binomio Minimo).';


-- ############################################################################
-- [2] "Conductor" deja de ser una Especialidad Técnica
-- ############################################################################
--  Antes de borrar la fila del catálogo hay que desreferenciar a quien la use,
--  o el FK (ON DELETE SET NULL en agentes_operativo, NO ACTION en usuarios)
--  bloquearía el borrado desde usuarios.
--
--  Conversión con sentido de negocio: quien tenía la ESPECIALIDAD "Conductor"
--  pasa a tener el BOOLEANO es_conductor = true. No se pierde información.

DO $$
DECLARE
    v_conductor_id uuid;
    v_convertidos  integer := 0;
BEGIN
    SELECT id INTO v_conductor_id
      FROM public.cat_especialidades
     WHERE lower(nombre) = 'conductor';

    IF v_conductor_id IS NULL THEN
        RAISE NOTICE 'cat_especialidades no contiene "Conductor": nada que convertir.';
        RETURN;
    END IF;

    -- 2.a · Los agentes que la tenían como especialidad táctica pasan al booleano
    UPDATE public.agentes_operativo
       SET es_conductor    = true,
           especialidad_id = NULL
     WHERE especialidad_id = v_conductor_id;
    GET DIAGNOSTICS v_convertidos = ROW_COUNT;
    RAISE NOTICE 'agentes_operativo convertidos a es_conductor=true: %', v_convertidos;

    -- 2.b · Los usuarios con esa especialidad global quedan sin especialidad.
    --       (No hay flag global de conductor por la decisión de alcance de arriba.)
    UPDATE public.usuarios
       SET especialidad_id = NULL
     WHERE especialidad_id = v_conductor_id;
    GET DIAGNOSTICS v_convertidos = ROW_COUNT;
    RAISE NOTICE 'usuarios desreferenciados de la especialidad Conductor: %', v_convertidos;

    -- 2.c · Recién ahora se puede eliminar del catálogo
    DELETE FROM public.cat_especialidades WHERE id = v_conductor_id;
    RAISE NOTICE 'Especialidad "Conductor" eliminada de cat_especialidades.';
END $$;

COMMIT;

-- ============================================================================
--  VERIFICACIÓN POST-MIGRACIÓN
-- ----------------------------------------------------------------------------
--  SELECT column_name, data_type, column_default, is_nullable
--    FROM information_schema.columns
--   WHERE table_name = 'agentes_operativo'
--     AND column_name IN ('es_caminante', 'es_conductor', 'especialidad_id');
--
--  SELECT nombre FROM cat_especialidades ORDER BY nombre;  -- no debe figurar Conductor
--
--  -- Rastrilladores efectivos de un grupo (CU-26, Binomio Minimo):
--  -- el conductor puro (es_conductor AND NOT es_caminante) NO cuenta.
--  -- SELECT count(*) FROM agentes_operativo
--  --  WHERE grupo_id = '<grupo>' AND fecha_egreso IS NULL AND es_caminante = true;
-- ============================================================================
