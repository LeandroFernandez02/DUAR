-- ============================================================================
--  MIGRACIÓN 005 · INSTITUCIONES Y DOTACIONES
--  Sistema DUAR · Fecha: 2026-08-28
-- ----------------------------------------------------------------------------
--  ORDEN: 00_tipos → bd.sql → 002 → 003 → 004 → ESTE ARCHIVO
--
--  PROBLEMA QUE RESUELVE
--  La regla de negocio central dice que el Líder de un grupo debe ser SIEMPRE
--  personal del DUAR (son los capacitados para conducir una cuadrilla). Pero el
--  sistema no tenía forma de saber quién es del DUAR: `usuarios.dotacion` era
--  TEXTO LIBRE y el código resolvía la regla así:
--        dotacion.toLowerCase().includes('duar')
--  Frágil por diseño. Los propios datos de prueba ya mostraban el problema:
--  figuraban "DUAR Champaquí" y "DUAR Traslasierra", que NO son dotaciones
--  reales del organismo.
--
--  SOLUCIÓN — dos catálogos encadenados
--    · cat_instituciones  → a QUÉ fuerza pertenece (DUAR, Policía, Defensa Civil…)
--                           con el booleano `es_duar` que gobierna la regla del Líder.
--    · cat_dotaciones     → a QUÉ destacamento, DENTRO de esa institución.
--
--  La dotación NO es un concepto exclusivo del DUAR: cualquier institución puede
--  tener destacamentos. Hoy sólo el DUAR tiene los suyos cargados, así que en la
--  práctica el desplegable de dotación aparece únicamente al elegir DUAR — pero
--  sin ningún "if DUAR" escrito en el código. Mañana se cargan comisarías para
--  la Policía y funciona igual, sin tocar una línea.
--
--  Idempotente: seguro de re-ejecutar.
-- ============================================================================

BEGIN;

-- ############################################################################
-- [1] Catálogo de instituciones
-- ############################################################################

CREATE TABLE IF NOT EXISTS public.cat_instituciones
(
    id      uuid         NOT NULL DEFAULT gen_random_uuid(),
    nombre  varchar(150) NOT NULL,
    -- Gobierna la regla del Líder. Es un DATO, no se infiere del nombre.
    es_duar boolean      NOT NULL DEFAULT false,
    CONSTRAINT cat_instituciones_pkey PRIMARY KEY (id),
    CONSTRAINT cat_instituciones_nombre_key UNIQUE (nombre)
);

COMMENT ON TABLE public.cat_instituciones IS
    'Fuerzas que participan de un operativo. El sistema lo usa el DUAR, pero intervienen tambien Policia, Defensa Civil, etc.';
COMMENT ON COLUMN public.cat_instituciones.es_duar IS
    'TRUE solo para el DUAR. Unico criterio valido para determinar quien puede ser Lider de un grupo de rastrillaje. Nunca inferirlo del nombre.';

INSERT INTO public.cat_instituciones (nombre, es_duar) VALUES
    ('DUAR',                 true),
    ('ETAC',                 false),
    ('Bomberos Voluntarios', false),
    ('Policía de Córdoba',   false),
    ('Defensa Civil',        false),
    ('Otra',                 false)
ON CONFLICT (nombre) DO NOTHING;


-- ############################################################################
-- [2] La dotación pasa a depender de la institución
-- ############################################################################

ALTER TABLE public.cat_dotaciones
    ADD COLUMN IF NOT EXISTS institucion_id uuid;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cat_dotaciones_institucion_fkey') THEN
        ALTER TABLE public.cat_dotaciones
            ADD CONSTRAINT cat_dotaciones_institucion_fkey
            FOREIGN KEY (institucion_id) REFERENCES public.cat_instituciones (id)
            ON UPDATE NO ACTION ON DELETE NO ACTION;
    END IF;
END $$;

-- El nombre del destacamento sólo tiene que ser único DENTRO de su institución:
-- dos fuerzas distintas bien podrían tener una base llamada "Central".
ALTER TABLE public.cat_dotaciones DROP CONSTRAINT IF EXISTS cat_dotaciones_nombre_key;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cat_dotaciones_institucion_nombre_key') THEN
        ALTER TABLE public.cat_dotaciones
            ADD CONSTRAINT cat_dotaciones_institucion_nombre_key UNIQUE (institucion_id, nombre);
    END IF;
END $$;

-- Clave candidata necesaria para la FK compuesta del punto [4]
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cat_dotaciones_id_institucion_key') THEN
        ALTER TABLE public.cat_dotaciones
            ADD CONSTRAINT cat_dotaciones_id_institucion_key UNIQUE (id, institucion_id);
    END IF;
END $$;


-- ############################################################################
-- [3] Las 11 dotaciones reales del DUAR
-- ############################################################################

INSERT INTO public.cat_dotaciones (nombre, institucion_id)
SELECT d.nombre, i.id
  FROM public.cat_instituciones i
 CROSS JOIN (VALUES
    ('DUAR Capital (Cuartel Central)'),
    ('Miramar'),
    ('Cruz del Eje'),
    ('Villa Cura Brochero (San Javier)'),
    ('Dique La Viña'),
    ('Carlos Paz (Villa Carlos Paz)'),
    ('Potrero de Garay'),
    ('Dique Embalse (Río Tercero)'),
    ('Río Cuarto'),
    ('Dique La Quebrada'),
    -- "Otros" = otra base del DUAR no listada. Sigue siendo DUAR a todos los
    -- efectos, incluida la habilitación para liderar un grupo.
    ('Otros')
 ) AS d(nombre)
 WHERE i.nombre = 'DUAR'
ON CONFLICT (institucion_id, nombre) DO NOTHING;


-- ############################################################################
-- [4] usuarios.institucion_id  (+ coherencia con la dotación)
-- ############################################################################
--  Hace falta la columna propia porque el personal NO DUAR no tiene dotación:
--  su institución no se podría deducir de un dotacion_id nulo.

ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS institucion_id uuid;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_institucion_id_fkey') THEN
        ALTER TABLE public.usuarios
            ADD CONSTRAINT usuarios_institucion_id_fkey
            FOREIGN KEY (institucion_id) REFERENCES public.cat_instituciones (id)
            ON UPDATE NO ACTION ON DELETE NO ACTION;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_usuarios_institucion
    ON public.usuarios (institucion_id);

--  COHERENCIA SIN TRIGGERS: FK compuesta.
--  Impide que alguien quede con institución "Policía" y una dotación del DUAR.
--  Al ser MATCH SIMPLE, si dotacion_id es NULL la restricción no se evalúa, que
--  es justo lo que necesitamos: el personal no DUAR va sin dotación.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_dotacion_coherente_fkey') THEN
        ALTER TABLE public.usuarios
            ADD CONSTRAINT usuarios_dotacion_coherente_fkey
            FOREIGN KEY (dotacion_id, institucion_id)
            REFERENCES public.cat_dotaciones (id, institucion_id)
            ON UPDATE NO ACTION ON DELETE NO ACTION;
    END IF;
END $$;

COMMENT ON COLUMN public.usuarios.institucion_id IS
    'Fuerza a la que pertenece. Determina, via cat_instituciones.es_duar, si puede ser Lider de grupo. Declarada por el propio usuario al registrarse (CU-02).';

COMMIT;

-- ============================================================================
--  VERIFICACIÓN
-- ----------------------------------------------------------------------------
--  SELECT i.nombre AS institucion, i.es_duar, count(d.id) AS dotaciones
--    FROM cat_instituciones i
--    LEFT JOIN cat_dotaciones d ON d.institucion_id = i.id
--   GROUP BY i.nombre, i.es_duar
--   ORDER BY i.es_duar DESC, i.nombre;
--  -- Esperado: DUAR/true/11 y el resto con 0.
--
--  -- La FK compuesta debe RECHAZAR esta combinación incoherente:
--  --   institución = Policía  +  dotación = una base del DUAR
-- ============================================================================
