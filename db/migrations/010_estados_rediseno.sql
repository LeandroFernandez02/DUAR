-- ============================================================================
--  MIGRACIÓN 010 · REDISEÑO DE LOS ESTADOS DE AGENTE Y GRUPO + LÍNEA DE TIEMPO
--  Sistema DUAR · Fecha: 2026-09-24
-- ----------------------------------------------------------------------------
--  ORDEN: ... → 009_grupos_modulo4 → ESTE ARCHIVO
--
--  DECISIÓN (equipo de tesis, 2026-09-24): no se veía la trazabilidad de
--  "el agente llega → lo agrupan → el grupo recibe polígono → salen a
--  rastrillar". Se redefinieron los dos catálogos:
--
--    AGENTE (7)                           GRUPO (8)
--    DISPONIBLE   sin grupo, en la base   EN_FORMACION  armándose
--    AGRUPADO     en un grupo que no salió CONFIRMADO   composición cerrada
--    DESPLEGADO   en el terreno sin        ASIGNADO     tiene zona / polígono
--                 rastrillar (yendo, o     DESPLEGADO   yendo al polígono
--                 en apoyo: el conductor)  RASTRILLANDO trabajando el polígono
--    RASTRILLANDO                          REPLEGADO    volviendo
--    REPLEGADO    volviendo                EN_ESPERA    de vuelta en el puesto
--    EN_ESPERA    de vuelta, en su grupo                de comando, sin decisión
--    NO_DISPONIBLE sin grupo, no asignable DISUELTO     baja lógica
--
--  Salen DESCANSANDO (agente), EN_APRESTO y EN_PAUSA (grupo). En pausa se
--  descartó porque en el terreno casi nunca hay señal: el Líder no puede ir
--  actualizando estados. EN_ESPERA vuelve con OTRO significado que el que se
--  eliminó en la 008 (aquel era el conductor esperando con el vehículo).
--
--  REGLA 1 — un agente en un grupo nunca contradice a su grupo:
--    EN_FORMACION / CONFIRMADO / ASIGNADO → AGRUPADO
--    DESPLEGADO   → DESPLEGADO
--    RASTRILLANDO → RASTRILLANDO; el conductor puro (es_conductor y no
--                   caminante) queda DESPLEGADO, con el vehículo
--    REPLEGADO    → REPLEGADO
--    EN_ESPERA    → EN_ESPERA
--    DISUELTO     → DISPONIBLE, sin grupo
--  Nadie está NO_DISPONIBLE dentro de un grupo: primero sale.
--
--  Esta migración además crea `eventos_estado`, la línea de tiempo del
--  terreno (ver el bloque [5]).
--
--  Idempotente: seguro de re-ejecutar.
-- ============================================================================

BEGIN;

-- ############################################################################
-- [1] Recrear estado_grupo (8 valores)
-- ############################################################################
--  Mapeo con sentido de negocio:
--    EN_APRESTO → CONFIRMADO   (estaba completo, listo para salir)
--    EN_PAUSA   → RASTRILLANDO (seguía en el terreno)
--    REPLEGADO  → EN_ESPERA    (en el modelo viejo "replegado" era "ya volvió
--                               a la base"; ahora es el viaje de vuelta)

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'estado_grupo' AND e.enumlabel = 'CONFIRMADO'
    ) THEN
        RAISE NOTICE 'estado_grupo ya tiene el catálogo nuevo: nada que migrar.';
        RETURN;
    END IF;

    EXECUTE $q$ UPDATE public.grupos SET estado = 'EN_FORMACION' WHERE estado IS NULL $q$;

    EXECUTE 'ALTER TABLE public.grupos ALTER COLUMN estado DROP DEFAULT';
    EXECUTE 'ALTER TYPE public.estado_grupo RENAME TO estado_grupo_v1';
    EXECUTE $q$
        CREATE TYPE public.estado_grupo AS ENUM (
            'EN_FORMACION', 'CONFIRMADO', 'ASIGNADO', 'DESPLEGADO',
            'RASTRILLANDO', 'REPLEGADO', 'EN_ESPERA', 'DISUELTO'
        )
    $q$;
    EXECUTE $q$
        ALTER TABLE public.grupos ALTER COLUMN estado TYPE public.estado_grupo
        USING (CASE estado::text
                 WHEN 'EN_APRESTO' THEN 'CONFIRMADO'
                 WHEN 'EN_PAUSA'   THEN 'RASTRILLANDO'
                 WHEN 'REPLEGADO'  THEN 'EN_ESPERA'
                 ELSE estado::text
               END)::public.estado_grupo
    $q$;
    EXECUTE $q$ ALTER TABLE public.grupos ALTER COLUMN estado SET DEFAULT 'EN_FORMACION' $q$;
    EXECUTE 'ALTER TABLE public.grupos ALTER COLUMN estado SET NOT NULL';
    EXECUTE 'DROP TYPE public.estado_grupo_v1';

    RAISE NOTICE 'estado_grupo recreado con 8 valores.';
END $$;


-- ############################################################################
-- [2] Recrear estado_agente (7 valores)
-- ############################################################################
--  El USING no puede consultar otra tabla, así que va en dos pasos: primero un
--  mapeo directo (DESCANSANDO no existe más → NO_DISPONIBLE) y después, en [3],
--  se recalcula a quien tiene grupo a partir del estado nuevo de su grupo.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'estado_agente' AND e.enumlabel = 'AGRUPADO'
    ) THEN
        RAISE NOTICE 'estado_agente ya tiene el catálogo nuevo: nada que migrar.';
        RETURN;
    END IF;

    EXECUTE 'ALTER TABLE public.agentes_operativo ALTER COLUMN estado DROP DEFAULT';
    EXECUTE 'ALTER TYPE public.estado_agente RENAME TO estado_agente_v2';
    EXECUTE $q$
        CREATE TYPE public.estado_agente AS ENUM (
            'DISPONIBLE', 'AGRUPADO', 'DESPLEGADO', 'RASTRILLANDO',
            'REPLEGADO', 'EN_ESPERA', 'NO_DISPONIBLE'
        )
    $q$;
    EXECUTE $q$
        ALTER TABLE public.agentes_operativo ALTER COLUMN estado TYPE public.estado_agente
        USING (CASE estado::text
                 WHEN 'DESCANSANDO' THEN 'NO_DISPONIBLE'
                 ELSE estado::text
               END)::public.estado_agente
    $q$;
    EXECUTE $q$ ALTER TABLE public.agentes_operativo ALTER COLUMN estado SET DEFAULT 'DISPONIBLE' $q$;
    EXECUTE 'DROP TYPE public.estado_agente_v2';

    RAISE NOTICE 'estado_agente recreado con 7 valores.';
END $$;


-- ############################################################################
-- [3] Poner los datos en regla antes de las restricciones
-- ############################################################################

-- 3.a · Alguien NO_DISPONIBLE dentro de un grupo (el modelo viejo lo permitía:
--       la cascada lo respetaba). Sale del grupo, salvo que sea el Líder.
UPDATE public.agentes_operativo ao
   SET grupo_id = NULL
  FROM public.grupos g
 WHERE ao.grupo_id = g.id
   AND ao.fecha_egreso IS NULL
   AND ao.estado = 'NO_DISPONIBLE'
   AND g.lider_id IS DISTINCT FROM ao.id;

UPDATE public.agentes_grupo_historial h
   SET fecha_fin = CURRENT_TIMESTAMP, motivo_salida = 'Migración 010: no disponible dentro de un grupo'
  FROM public.agentes_operativo ao
 WHERE h.agente_operativo_id = ao.id
   AND h.fecha_fin IS NULL
   AND ao.grupo_id IS NULL;

-- 3.b · Integrantes: el estado que manda la Regla 1.
UPDATE public.agentes_operativo ao
   SET estado = (CASE g.estado
                   WHEN 'EN_FORMACION' THEN 'AGRUPADO'
                   WHEN 'CONFIRMADO'   THEN 'AGRUPADO'
                   WHEN 'ASIGNADO'     THEN 'AGRUPADO'
                   WHEN 'DESPLEGADO'   THEN 'DESPLEGADO'
                   WHEN 'RASTRILLANDO' THEN CASE WHEN ao.es_conductor AND NOT ao.es_caminante
                                                 THEN 'DESPLEGADO' ELSE 'RASTRILLANDO' END
                   WHEN 'REPLEGADO'    THEN 'REPLEGADO'
                   WHEN 'EN_ESPERA'    THEN 'EN_ESPERA'
                 END)::public.estado_agente
  FROM public.grupos g
 WHERE ao.grupo_id = g.id
   AND ao.fecha_egreso IS NULL
   AND g.estado <> 'DISUELTO';

-- 3.c · Sin grupo sólo existen DISPONIBLE, NO_DISPONIBLE y REPLEGADO (el
--       retirado por CU-26 que vuelve). Cualquier otro valor viene de una
--       edición manual del modelo viejo.
UPDATE public.agentes_operativo
   SET estado = 'DISPONIBLE'
 WHERE grupo_id IS NULL
   AND fecha_egreso IS NULL
   AND estado NOT IN ('DISPONIBLE', 'NO_DISPONIBLE', 'REPLEGADO');


-- ############################################################################
-- [4] Las reglas, hechas restricción de la base
-- ############################################################################
--  Como agente_unico_activo_idx con la Regla de Ubicuidad: no dependen de que
--  la aplicación se acuerde. No pueden comparar contra el estado del grupo
--  (otra tabla) — eso lo garantiza la cascada — pero hacen imposible
--  "Disponible con grupo" o "Agrupado sin grupo".

ALTER TABLE public.agentes_operativo DROP CONSTRAINT IF EXISTS agente_estado_segun_grupo_chk;
ALTER TABLE public.agentes_operativo ADD CONSTRAINT agente_estado_segun_grupo_chk CHECK (
    fecha_egreso IS NOT NULL
    OR (grupo_id IS NULL     AND estado IN ('DISPONIBLE', 'NO_DISPONIBLE', 'REPLEGADO'))
    OR (grupo_id IS NOT NULL AND estado IN ('AGRUPADO', 'DESPLEGADO', 'RASTRILLANDO', 'REPLEGADO', 'EN_ESPERA'))
);

-- CU-25 paso 5: DISUELTO y la baja lógica van siempre juntos.
ALTER TABLE public.grupos DROP CONSTRAINT IF EXISTS grupo_disuelto_con_baja_chk;
ALTER TABLE public.grupos ADD CONSTRAINT grupo_disuelto_con_baja_chk CHECK (
    (estado = 'DISUELTO') = (eliminado_en IS NOT NULL)
);


-- ############################################################################
-- [5] eventos_estado — la línea de tiempo del terreno
-- ############################################################################
--  ¿Por qué no alcanza con logs_auditoria (Decisión D)? Porque responden a
--  preguntas distintas:
--    · logs_auditoria  → quién tocó la base, cuándo y desde qué IP (forense).
--    · eventos_estado  → qué pasó en el terreno y cuándo pasó.
--  En el terreno casi nunca hay señal: el Líder toca "Llegamos" a las 08:40 y
--  el evento llega al servidor a las 12:30, o lo informa por radio y lo carga
--  el Coordinador. Hace falta guardar la hora del hecho y la del registro por
--  separado, de dónde vino, y también los avisos que no cambian nada (el mismo
--  hecho informado dos veces, o uno viejo que llega tarde). logs_auditoria
--  sigue registrando cada modificación, igual que siempre.

CREATE TABLE IF NOT EXISTS public.eventos_estado (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operativo_id         uuid NOT NULL REFERENCES public.operativos(id),
    entidad              varchar(10) NOT NULL CHECK (entidad IN ('GRUPO', 'AGENTE')),
    grupo_id             uuid REFERENCES public.grupos(id),
    agente_operativo_id  uuid REFERENCES public.agentes_operativo(id),
    accion               varchar(30) NOT NULL,
    estado_anterior      varchar(20),
    estado_nuevo         varchar(20),
    ocurrido_en          timestamptz NOT NULL,
    registrado_en        timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registrado_por       uuid REFERENCES public.usuarios(id),
    fuente               varchar(20) NOT NULL CHECK (fuente IN
                           ('PORTAL_LIDER', 'PORTAL_AGENTE', 'COORDINADOR', 'RADIO', 'CASCADA', 'SISTEMA', 'QR')),
    resultado            varchar(15) NOT NULL DEFAULT 'APLICADO' CHECK (resultado IN
                           ('APLICADO', 'CONFIRMACION', 'SUPERADO', 'RECHAZADO')),
    evento_origen_id     uuid REFERENCES public.eventos_estado(id),
    confirma_evento_id   uuid REFERENCES public.eventos_estado(id),
    motivo               varchar(200),
    nota                 varchar(200),
    hora_confiable       boolean NOT NULL DEFAULT true,
    cliente_evento_id    uuid UNIQUE,
    CONSTRAINT evento_entidad_chk CHECK (
        (entidad = 'GRUPO'  AND grupo_id IS NOT NULL) OR
        (entidad = 'AGENTE' AND agente_operativo_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_eventos_estado_agente    ON public.eventos_estado (agente_operativo_id, ocurrido_en);
CREATE INDEX IF NOT EXISTS idx_eventos_estado_grupo     ON public.eventos_estado (grupo_id, ocurrido_en);
CREATE INDEX IF NOT EXISTS idx_eventos_estado_operativo ON public.eventos_estado (operativo_id, ocurrido_en);

-- Regla del proyecto: toda tabla nueva con RLS (deny-all). El backend entra
-- como dueño de las tablas y no se ve afectado.
ALTER TABLE public.eventos_estado ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.eventos_estado IS
    'Linea de tiempo del terreno (2026-09-24): cada cambio de estado de un grupo o de un agente, con la hora en que OCURRIO y la hora en que se REGISTRO por separado (sin senal pueden diferir horas), la fuente (celular del Lider, radio, cascada del grupo...) y el resultado. Complementa a logs_auditoria (Decision D), que sigue registrando quien modifico la base.';
COMMENT ON COLUMN public.eventos_estado.ocurrido_en IS
    'Hora del hecho: la del celular del Lider al tocar el boton, o la que carga el Coordinador al registrar un aviso de radio. La linea de tiempo se ordena por esta columna.';
COMMENT ON COLUMN public.eventos_estado.resultado IS
    'APLICADO: cambio el estado. CONFIRMACION: el mismo hecho, informado por otra via (confirma_evento_id). SUPERADO: llego tarde y el estado ya habia avanzado; queda en la historia sin mover el tablero. RECHAZADO: invalido (p. ej. ya no era el Lider).';
COMMENT ON COLUMN public.eventos_estado.evento_origen_id IS
    'En los eventos de un agente, el evento del grupo que los provoco por cascada.';
COMMENT ON COLUMN public.eventos_estado.cliente_evento_id IS
    'Id que genera el celular del Lider para cada evento de su cola sin senal: reenviarlo no lo duplica.';


-- ############################################################################
-- [6] Punto de partida de la línea de tiempo
-- ############################################################################
--  Para que ninguna línea de tiempo arranque vacía: el alta de cada agente
--  vigente, su estado actual si no es DISPONIBLE, y el estado de cada grupo vivo.

INSERT INTO public.eventos_estado
    (operativo_id, entidad, agente_operativo_id, accion, estado_nuevo, ocurrido_en, registrado_en, fuente, motivo)
SELECT ao.operativo_id, 'AGENTE', ao.id, 'alta', 'DISPONIBLE',
       COALESCE(ao.fecha_ingreso, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP, 'SISTEMA',
       'Alta anterior a la línea de tiempo (migración 010)'
  FROM public.agentes_operativo ao
 WHERE ao.fecha_egreso IS NULL
   AND NOT EXISTS (SELECT 1 FROM public.eventos_estado e WHERE e.agente_operativo_id = ao.id);

INSERT INTO public.eventos_estado
    (operativo_id, entidad, agente_operativo_id, grupo_id, accion, estado_anterior, estado_nuevo, ocurrido_en, registrado_en, fuente, motivo)
SELECT ao.operativo_id, 'AGENTE', ao.id, ao.grupo_id, 'estado_inicial', 'DISPONIBLE', ao.estado::text,
       GREATEST(ao.estado_actualizado_en, COALESCE(ao.fecha_ingreso, ao.estado_actualizado_en)),
       CURRENT_TIMESTAMP, 'SISTEMA', 'Estado al migrar (migración 010)'
  FROM public.agentes_operativo ao
 WHERE ao.fecha_egreso IS NULL
   AND ao.estado <> 'DISPONIBLE'
   AND NOT EXISTS (SELECT 1 FROM public.eventos_estado e
                    WHERE e.agente_operativo_id = ao.id AND e.accion = 'estado_inicial');

INSERT INTO public.eventos_estado
    (operativo_id, entidad, grupo_id, accion, estado_nuevo, ocurrido_en, registrado_en, fuente, motivo)
SELECT g.operativo_id, 'GRUPO', g.id, 'estado_inicial', g.estado::text,
       g.estado_actualizado_en, CURRENT_TIMESTAMP, 'SISTEMA', 'Estado al migrar (migración 010)'
  FROM public.grupos g
 WHERE g.eliminado_en IS NULL
   AND NOT EXISTS (SELECT 1 FROM public.eventos_estado e WHERE e.grupo_id = g.id AND e.entidad = 'GRUPO');

COMMIT;

-- ============================================================================
--  VERIFICACIÓN POST-MIGRACIÓN
-- ----------------------------------------------------------------------------
--  SELECT t.typname, string_agg(e.enumlabel, ' · ' ORDER BY e.enumsortorder)
--    FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
--   WHERE t.typname IN ('estado_agente', 'estado_grupo') GROUP BY 1;
--
--  -- Debe fallar: Disponible con grupo
--  -- UPDATE agentes_operativo SET estado = 'DISPONIBLE' WHERE grupo_id IS NOT NULL;
--
--  SELECT entidad, accion, count(*) FROM eventos_estado GROUP BY 1, 2;
-- ============================================================================
