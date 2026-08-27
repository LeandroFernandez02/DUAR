-- ============================================================================
--  MIGRACIÓN 002 · CORRECTIVO MÓDULO 4 — Personal y Grupos
--  Sistema DUAR · Fecha: 2026-08-19
-- ----------------------------------------------------------------------------
--  ORDEN DE EJECUCIÓN:  00_tipos_y_extensiones.sql  →  bd.sql  →  ESTE ARCHIVO
--
--  Qué corrige (trazado a CU / Decisión de arquitectura):
--    [1] Regla de Ubicuidad realmente enforzada .... Decisión B · CU-15/16/20
--    [2] Historial de pertenencia a grupo .......... CU-26 (trazabilidad judicial)
--    [3] rasgos_particulares -> detalles_adicionales  Nota docx (APP y BD)
--    [4] Índices faltantes en Foreign Keys ......... Performance M4
--    [5] es_caminante con DEFAULT explícito ........ Decisión C
--
--  NO incluido a pedido del usuario (se tratará por separado con su lógica):
--    · usuarios.conductor  -> requiere definir antes la regla de transición
--      "grupo pasa a RASTRILLANDO => conductor pasa a EN_ESPERA".
--
--  Idempotente: seguro de re-ejecutar.
-- ============================================================================

BEGIN;

-- ############################################################################
-- [1] REGLA DE UBICUIDAD (Decisión B) — el corazón de esta migración
-- ############################################################################
--
--  PROBLEMA: bd.sql:214 crea el índice así:
--      CREATE INDEX agente_solo_un_operativo_activo_idx ON agentes_operativo(usuario_id);
--  Es un índice B-tree COMÚN: ni UNIQUE ni parcial. Acelera búsquedas pero
--  NO impide nada. Hoy un mismo efectivo puede figurar RASTRILLANDO en dos
--  operativos simultáneos, que es exactamente lo que la Decisión B prohíbe.
--
--  SOLUCIÓN: índice ÚNICO PARCIAL sobre las filas activas (fecha_egreso IS NULL).
--
--  Por qué parcial y no UNIQUE total: la condición WHERE hace que las filas
--  con fecha_egreso ya cargado (agentes dados de baja, CU-20) SALGAN del índice.
--  Eso permite el reingreso: un agente retirado puede volver a escanear el QR
--  y darse de alta de nuevo, incluso en el MISMO operativo, sin conflicto.
--
--  NOTA sobre el duplicado dentro del mismo operativo:
--  no hace falta un segundo índice UNIQUE(usuario_id, operativo_id). Este índice
--  ya limita a UNA fila activa por usuario en TODO el sistema, por lo que la
--  unicidad dentro de un operativo queda satisfecha por implicación lógica.
--  Agregar el segundo índice sería redundante y penalizaría cada INSERT/UPDATE.

-- 1.a · Verificación previa: abortar con mensaje claro si los datos actuales
--       ya violan la regla (en vez de un error críptico de clave duplicada).
DO $$
DECLARE
    v_infractores text;
    v_cantidad    integer;
BEGIN
    SELECT count(*), string_agg(DISTINCT usuario_id::text, ', ')
      INTO v_cantidad, v_infractores
      FROM (
          SELECT usuario_id
            FROM public.agentes_operativo
           WHERE fecha_egreso IS NULL
           GROUP BY usuario_id
          HAVING count(*) > 1
      ) AS duplicados;

    IF v_cantidad > 0 THEN
        RAISE EXCEPTION
            'REGLA DE UBICUIDAD: % usuario(s) tienen mas de un alta activa y deben depurarse antes de aplicar el indice. usuario_id: %',
            v_cantidad, v_infractores;
    END IF;
END $$;

-- 1.b · Reemplazo del índice inefectivo por el índice que sí enforza la regla.
DROP INDEX IF EXISTS public.agente_solo_un_operativo_activo_idx;

CREATE UNIQUE INDEX IF NOT EXISTS agente_unico_activo_idx
    ON public.agentes_operativo (usuario_id)
    WHERE fecha_egreso IS NULL;

COMMENT ON INDEX public.agente_unico_activo_idx IS
    'Decision B (Regla de Ubicuidad): un efectivo no puede estar activo en dos operativos a la vez. Parcial sobre fecha_egreso IS NULL para permitir el reingreso tras una baja (CU-20).';


-- ############################################################################
-- [2] HISTORIAL DE PERTENENCIA A GRUPO (CU-26)
-- ############################################################################
--
--  PROBLEMA: agentes_operativo.grupo_id es un único campo mutable. El paso 7
--  de CU-26 hace grupo_id = NULL al extraer un agente, lo que DESTRUYE el dato
--  de su permanencia. Pero las Observaciones del mismo CU-26 exigen conservar
--  "que el agente estuvo en ese poligono desde la hora X hasta la hora Y,
--  garantizando trazabilidad judicial".
--
--  SOLUCIÓN: tabla de PERIODOS. Mismo patrón que ya usa agentes_operativo con
--  fecha_ingreso/fecha_egreso para el operativo completo, aplicado un nivel más
--  abajo (el grupo). grupo_id se conserva como "estado actual" para consultas
--  rápidas; esta tabla es el registro forense inmutable.

CREATE TABLE IF NOT EXISTS public.agentes_grupo_historial
(
    id                  uuid         NOT NULL DEFAULT gen_random_uuid(),
    agente_operativo_id uuid         NOT NULL,
    grupo_id            uuid         NOT NULL,
    fecha_inicio        timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin           timestamptz,            -- NULL = sigue integrando el grupo
    motivo_salida       varchar(100),           -- CU-26 paso 3: Lesion / Emergencia Personal / Reasignacion
    registrado_por      uuid,                   -- Coordinador que ejecutó la extracción
    CONSTRAINT agentes_grupo_historial_pkey PRIMARY KEY (id),
    CONSTRAINT agentes_grupo_historial_periodo_valido
        CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

COMMENT ON TABLE public.agentes_grupo_historial IS
    'CU-26: periodos de pertenencia de cada agente a cada grupo. Registro forense: permite reconstruir en el informe final quien integro que grupo y entre que horas.';

-- FKs con NO ACTION (no CASCADE) de forma deliberada: el historial forense NO
-- debe poder destruirse por un borrado en cascada. La baja de grupos y operativos
-- es lógica (eliminado_en), así que no se esperan borrados físicos.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agentes_grupo_historial_agente_fkey') THEN
        ALTER TABLE public.agentes_grupo_historial
            ADD CONSTRAINT agentes_grupo_historial_agente_fkey
            FOREIGN KEY (agente_operativo_id) REFERENCES public.agentes_operativo (id)
            ON UPDATE NO ACTION ON DELETE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agentes_grupo_historial_grupo_fkey') THEN
        ALTER TABLE public.agentes_grupo_historial
            ADD CONSTRAINT agentes_grupo_historial_grupo_fkey
            FOREIGN KEY (grupo_id) REFERENCES public.grupos (id)
            ON UPDATE NO ACTION ON DELETE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agentes_grupo_historial_registrado_por_fkey') THEN
        ALTER TABLE public.agentes_grupo_historial
            ADD CONSTRAINT agentes_grupo_historial_registrado_por_fkey
            FOREIGN KEY (registrado_por) REFERENCES public.usuarios (id)
            ON UPDATE NO ACTION ON DELETE NO ACTION;
    END IF;
END $$;

-- Invariante clave: un agente integra 0..1 grupo a la vez. Este índice parcial
-- lo garantiza y mantiene la tabla coherente con el campo agentes_operativo.grupo_id.
CREATE UNIQUE INDEX IF NOT EXISTS agente_un_solo_grupo_activo_idx
    ON public.agentes_grupo_historial (agente_operativo_id)
    WHERE fecha_fin IS NULL;

-- Consulta del informe final (Módulo 6): todos los que pasaron por este grupo.
CREATE INDEX IF NOT EXISTS idx_agentes_grupo_historial_grupo
    ON public.agentes_grupo_historial (grupo_id);

CREATE INDEX IF NOT EXISTS idx_agentes_grupo_historial_agente
    ON public.agentes_grupo_historial (agente_operativo_id);


-- ############################################################################
-- [3] RENOMBRE rasgos_particulares -> detalles_adicionales
-- ############################################################################
--  Nota del docx: "Cambiar rasgos particulares por detalles adicionales. APP y BD".
--  El frontend ya usa el nombre nuevo (DatosPersonaBuscada.detallesAdicionales),
--  así que hoy existe una desalineación real entre capas.
--  RENAME preserva los datos existentes (no es DROP + ADD).

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = 'objetivo_buscado'
           AND column_name  = 'rasgos_particulares'
    ) THEN
        ALTER TABLE public.objetivo_buscado
            RENAME COLUMN rasgos_particulares TO detalles_adicionales;
    END IF;
END $$;


-- ############################################################################
-- [4] ÍNDICES FALTANTES EN FOREIGN KEYS
-- ############################################################################
--  PostgreSQL NO crea índices automáticamente en las FKs. Sin ellos, la consulta
--  más frecuente del Módulo 4 (traer el personal de este operativo) hace un
--  Seq Scan de toda la tabla. En un sistema de tiempo real no es aceptable.

CREATE INDEX IF NOT EXISTS idx_agentes_operativo_operativo
    ON public.agentes_operativo (operativo_id);

CREATE INDEX IF NOT EXISTS idx_grupos_operativo
    ON public.grupos (operativo_id);


-- ############################################################################
-- [5] DEFAULT EXPLÍCITO EN es_caminante (Decisión C)
-- ############################################################################
--  Hoy la columna es nullable y sin default, así que un alta sin especificar
--  deja NULL = "caminante desconocido", un tercer estado que el negocio no tiene.
--  Se fija en false (no caminante) como valor conservador y seguro: es preferible
--  que el sistema NO envíe a rastrillar a alguien por omisión.
--
--  La inferencia real por especialidad (Bombero = true, Conductor/Paramédico = false)
--  y el override del Coordinador viven en la capa de aplicación / trigger.

ALTER TABLE public.agentes_operativo
    ALTER COLUMN es_caminante SET DEFAULT false;

COMMENT ON COLUMN public.agentes_operativo.es_caminante IS
    'Decision C: aptitud TACTICA de caminante dentro de este operativo. Se infiere por especialidad al dar el alta y el Coordinador puede sobrescribirla localmente sin alterar el perfil global del usuario.';

COMMIT;

-- ============================================================================
--  VERIFICACIÓN POST-MIGRACIÓN (ejecutar aparte para confirmar el resultado)
-- ----------------------------------------------------------------------------
--  -- ¿El índice de ubicuidad quedó UNIQUE y parcial?
--  SELECT indexname, indexdef FROM pg_indexes
--   WHERE tablename = 'agentes_operativo' AND indexname LIKE '%activo%';
--  -- Se espera: CREATE UNIQUE INDEX ... WHERE (fecha_egreso IS NULL)
--
--  -- Prueba de la Regla de Ubicuidad (debe fallar el segundo INSERT):
--  --   INSERT INTO agentes_operativo (usuario_id, operativo_id) VALUES (u, op1);
--  --   INSERT INTO agentes_operativo (usuario_id, operativo_id) VALUES (u, op2);  -- ERROR esperado
--
--  -- Prueba de reingreso (debe funcionar):
--  --   UPDATE agentes_operativo SET fecha_egreso = now(), estado = 'REPLEGADO' WHERE ...;
--  --   INSERT INTO agentes_operativo (usuario_id, operativo_id) VALUES (u, op1);  -- OK
-- ============================================================================
