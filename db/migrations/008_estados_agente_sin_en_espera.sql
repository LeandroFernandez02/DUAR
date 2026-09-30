-- ============================================================================
--  MIGRACIÓN 008 · SE ELIMINA EL ESTADO "EN_ESPERA" DEL AGENTE
--  Sistema DUAR · Fecha: 2026-09-20
-- ----------------------------------------------------------------------------
--  ORDEN: ... → 007_objetivo_buscado_tipo_objeto → ESTE ARCHIVO
--
--  DECISIÓN (equipo de tesis, 2026-09-20): EN_ESPERA era redundante con
--  DISPONIBLE y se elimina. El catálogo del agente queda en 6 estados:
--
--    DISPONIBLE    · en el Puesto de Comando o una base, listo para que lo
--                    asignen a un grupo. Es también el estado del alta (CU-02:
--                    escanear el QR es el "Control de Puerta", así que estar
--                    registrado equivale a estar presente).
--    DESPLEGADO    · salió con su grupo hacia el polígono, todavía no rastrilla.
--    RASTRILLANDO  · trabajando el polígono.
--    DESCANSANDO   · en descanso, sea en el polígono, en la base o donde sea.
--    REPLEGADO     · volvió del polígono a la base.
--    NO_DISPONIBLE · no puede rastrillar (se fue, lesión, enfermedad).
--
--  QUÉ PASA CON EL CONDUCTOR (reabre la Decisión 3 del 2026-08-27):
--  antes, cuando el grupo pasaba a RASTRILLANDO, el conductor puro pasaba a
--  EN_ESPERA. Ahora queda en DESPLEGADO, que describe exactamente su situación:
--  salió con el grupo y está en posición, pero no camina el polígono. La misma
--  regla cubre a todo recurso crítico (paramédico, dron) que sale con el grupo
--  sin rastrillar. El Binomio Mínimo (CU-26) NO se ve afectado: cuenta por
--  es_caminante, nunca por el estado.
--
--  PostgreSQL no permite quitar un valor de un ENUM (no existe
--  ALTER TYPE ... DROP VALUE), así que hay que recrear el tipo entero.
--
--  DE PASO, dos correcciones al catálogo:
--   · `estado` era NULLABLE: "sin estado" era un octavo estado de hecho que
--     ningún CU documenta. Pasa a NOT NULL DEFAULT 'DISPONIBLE'.
--   · Se agrega `estado_actualizado_en` a agentes_operativo y a grupos. El
--     Coordinador necesita leer "rastrillando hace 3 h" para saber si el dato
--     del panel es fresco o quedó viejo porque nadie lo actualizó desde el
--     campo. logs_auditoria (Decisión D) permite reconstruir el historial, pero
--     no sirve para pintar una grilla que refresca por polling.
--
--  Idempotente: seguro de re-ejecutar.
-- ============================================================================

BEGIN;

-- ############################################################################
-- [1] Recrear estado_agente sin EN_ESPERA
-- ############################################################################

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'estado_agente'
           AND e.enumlabel = 'EN_ESPERA'
    ) THEN
        RAISE NOTICE 'estado_agente ya no contiene EN_ESPERA: nada que migrar.';
        RETURN;
    END IF;

    -- 1.a · Conversión con sentido de negocio, ANTES de tocar el tipo.
    --       El conductor que estaba esperando con el vehículo salió con el
    --       grupo: eso es DESPLEGADO.
    EXECUTE $q$
        UPDATE public.agentes_operativo
           SET estado = 'DESPLEGADO'::estado_agente
         WHERE estado = 'EN_ESPERA'::estado_agente
    $q$;

    -- 1.b · El estado fantasma (NULL) pasa a DISPONIBLE, que es el default.
    EXECUTE $q$
        UPDATE public.agentes_operativo
           SET estado = 'DISPONIBLE'::estado_agente
         WHERE estado IS NULL
    $q$;

    -- 1.c · Recrear el tipo. El default se quita antes del cambio de tipo
    --       porque PostgreSQL no puede recastear la expresión del DEFAULT sola.
    EXECUTE 'ALTER TYPE public.estado_agente RENAME TO estado_agente_v1';

    EXECUTE $q$
        CREATE TYPE public.estado_agente AS ENUM (
            'DISPONIBLE',
            'DESPLEGADO',
            'RASTRILLANDO',
            'DESCANSANDO',
            'REPLEGADO',
            'NO_DISPONIBLE'
        )
    $q$;

    EXECUTE 'ALTER TABLE public.agentes_operativo ALTER COLUMN estado DROP DEFAULT';
    EXECUTE 'ALTER TABLE public.agentes_operativo ALTER COLUMN estado TYPE public.estado_agente USING estado::text::public.estado_agente';
    EXECUTE $q$ ALTER TABLE public.agentes_operativo ALTER COLUMN estado SET DEFAULT 'DISPONIBLE' $q$;
    EXECUTE 'ALTER TABLE public.agentes_operativo ALTER COLUMN estado SET NOT NULL';

    EXECUTE 'DROP TYPE public.estado_agente_v1';

    RAISE NOTICE 'estado_agente recreado con 6 valores (sin EN_ESPERA).';
END $$;

COMMENT ON COLUMN public.agentes_operativo.estado IS
    'Estado TACTICO del agente en ESTE operativo (CU-18). 6 valores desde 2026-09-20 (se elimino EN_ESPERA por redundante con DISPONIBLE). Varios los escribe la cascada del grupo: cuando el grupo pasa a DESPLEGADO / RASTRILLANDO / REPLEGADO, sus integrantes lo siguen. La cascada respeta NO_DISPONIBLE y nunca lo pisa. A RASTRILLANDO solo pasan los caminantes: el conductor y los recursos criticos quedan en DESPLEGADO.';


-- ############################################################################
-- [2] Marca de tiempo del último cambio de estado
-- ############################################################################
--  Se crea nullable, se rellena con una fecha que NO miente (el alta del agente
--  / la creación del grupo, no el momento de correr esta migración) y recién
--  después se le pone el NOT NULL.

ALTER TABLE public.agentes_operativo
    ADD COLUMN IF NOT EXISTS estado_actualizado_en timestamptz;

UPDATE public.agentes_operativo
   SET estado_actualizado_en = COALESCE(fecha_ingreso, CURRENT_TIMESTAMP)
 WHERE estado_actualizado_en IS NULL;

ALTER TABLE public.agentes_operativo
    ALTER COLUMN estado_actualizado_en SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.agentes_operativo
    ALTER COLUMN estado_actualizado_en SET NOT NULL;

COMMENT ON COLUMN public.agentes_operativo.estado_actualizado_en IS
    'Momento del ultimo cambio de `estado`. Alimenta el "disponible hace 30 min" de la grilla del Coordinador: sin esto no hay forma de distinguir un RASTRILLANDO de hace 5 minutos de uno de hace 4 horas que nadie actualizo desde el campo.';

ALTER TABLE public.grupos
    ADD COLUMN IF NOT EXISTS estado_actualizado_en timestamptz;

UPDATE public.grupos
   SET estado_actualizado_en = COALESCE(creado_en, CURRENT_TIMESTAMP)
 WHERE estado_actualizado_en IS NULL;

ALTER TABLE public.grupos
    ALTER COLUMN estado_actualizado_en SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.grupos
    ALTER COLUMN estado_actualizado_en SET NOT NULL;

COMMENT ON COLUMN public.grupos.estado_actualizado_en IS
    'Momento del ultimo cambio de `estado`. El Lider de Grupo es quien mueve el estado desde el campo (Modulo 4): esta marca es la que le dice al Coordinador hace cuanto que no llegan novedades de esa cuadrilla.';


-- ############################################################################
-- [3] Comentario desactualizado de 003_conductor_tactico
-- ############################################################################
--  Mencionaba EN_ESPERA, que ya no existe.

COMMENT ON COLUMN public.agentes_operativo.es_conductor IS
    'Estado logistico TACTICO: en ESTE operativo cumple la funcion de conductor del vehiculo. Exclusivo del Coordinador (CU-17). Cuando el grupo pasa a RASTRILLANDO el conductor NO lo sigue: queda en DESPLEGADO, con el vehiculo, y no cuenta como rastrillador efectivo (CU-26, Binomio Minimo, que cuenta por es_caminante).';

COMMIT;

-- ============================================================================
--  VERIFICACIÓN POST-MIGRACIÓN
-- ----------------------------------------------------------------------------
--  -- 6 valores, sin EN_ESPERA:
--  SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
--   WHERE t.typname = 'estado_agente' ORDER BY e.enumsortorder;
--
--  -- estado NOT NULL con default, + la columna nueva:
--  SELECT column_name, is_nullable, column_default
--    FROM information_schema.columns
--   WHERE table_name = 'agentes_operativo'
--     AND column_name IN ('estado', 'estado_actualizado_en');
--
--  -- ningún agente quedó sin estado ni con marca de tiempo futura:
--  SELECT count(*) FROM agentes_operativo
--   WHERE estado IS NULL OR estado_actualizado_en > CURRENT_TIMESTAMP;
-- ============================================================================
