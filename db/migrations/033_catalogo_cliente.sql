-- ═════════════════════════════════════════════════════════════════════════
-- 033 · Catálogo de instituciones y especialidades del cliente (05/11)
--
-- ⚠️  APLICAR EN SUPABASE JUSTO CUANDO SE PUBLICA EL CÓDIGO que lo acompaña
--     (commit "Tarjeta del tablero de grupos…" en adelante): la versión
--     anterior del código deja de funcionar con este catálogo y la nueva no
--     funciona sin él. Se pega entero en el SQL Editor de Supabase.
--     Probada en un Postgres local; idempotente (se puede correr dos veces).
--
-- QUÉ CAMBIA
--   · Especialidad = lo que la persona HACE en el operativo. Queda una sola de
--     rastrillaje, "Caminante", y el resto son recursos especiales (van a un
--     grupo especial). Las que en realidad eran instituciones (Bombero,
--     Bombero Voluntario, Defensa Civil, Policía) pasan a Caminante: de dónde
--     viene la persona ya lo dice su institución.
--   · Institución = de dónde viene. Lista del cliente; Policía y Bomberos
--     Voluntarios tienen DEPENDENCIAS (en la base siguen siendo
--     `cat_dotaciones`; en pantalla se llaman "Dependencia", 06/11). El
--     desplegable aparece sólo si la institución tiene dependencias cargadas.
--   · El DUAR deja de ser institución: es la dependencia "DUAR" de Policía.
--     Quien era DUAR pasa a Policía · DUAR; las 11 bases dejan de existir.
--
-- QUÉ NO CAMBIA
--   · `es_recurso_critico` sigue gobernando la clase de grupo y el binomio.
--   · `es_conductor` sigue siendo la función por operativo.
--   · La regla del Líder se muda a `cat_dotaciones.es_duar`: lidera un grupo
--     de rastrillaje quien es Policía · DUAR (06/11).
--
-- Se reutilizan los UUID existentes al renombrar (Bombero→Caminante,
-- Dron→Drones, Canes→K-9, Buzos→Buceo, Policía de Córdoba→Policía, Otra→Otros)
-- para no romper ninguna FK. Los UUID nuevos son fijos porque el frontend los
-- espeja en mockData.ts. Idempotente.
-- ═════════════════════════════════════════════════════════════════════════

BEGIN;

-- ############################################################################
-- [1] Especialidades
-- ############################################################################

-- 1.a · Renombres que conservan el id
UPDATE public.cat_especialidades SET nombre = 'Caminante', es_recurso_critico = false WHERE id = '788ad70e-d044-48e3-b6b2-5b7f265ee106'; -- era Bombero
UPDATE public.cat_especialidades SET nombre = 'Drones',    es_recurso_critico = true  WHERE id = '328cf95c-6ee2-446a-bba7-197e0f00b322'; -- era Dron
UPDATE public.cat_especialidades SET nombre = 'K-9',       es_recurso_critico = true  WHERE id = 'eb010f9d-406e-4248-ba27-d88ca045ca4f'; -- era Canes
UPDATE public.cat_especialidades SET nombre = 'Buceo',     es_recurso_critico = true  WHERE id = '3b25c85b-483c-43c0-b8a9-596d09468855'; -- era Buzos
UPDATE public.cat_especialidades SET es_recurso_critico = true WHERE id = 'eb016aa1-0c17-4fd3-add0-b31becf1d1b2';                       -- Caballería

-- 1.b · Nuevas (todas recurso especial)
INSERT INTO public.cat_especialidades (id, nombre, es_recurso_critico) VALUES
  ('70bd0656-4b02-4f96-8448-da34e31eb4de', 'Motos',         true),
  ('d7aff1de-3fde-448e-a3c5-8bcc0d9513bf', 'Investigación', true),
  ('ed422a17-c6c4-4918-b409-e39f5a94a1b6', 'Altura',        true),
  ('4ff8d2fe-647c-4fda-b036-3d315c43d7e9', 'Acuático',      true)
ON CONFLICT (nombre) DO UPDATE SET es_recurso_critico = true;

-- 1.c · Las que salen del catálogo pasan a Caminante (perfil y operativos).
--       Paramédico no está en la lista del cliente: también pasa a Caminante.
DO $$
DECLARE
  v_caminante uuid := '788ad70e-d044-48e3-b6b2-5b7f265ee106';
  v_salen     uuid[] := ARRAY[
    '515dcdee-7b3b-4c4e-8161-c070254df8de',  -- Bombero Voluntario
    'e0322446-d6eb-4335-85e3-558d484e2334',  -- Defensa Civil
    '0c55b9bf-f8fe-4651-a813-c612718b1ba9',  -- Policía
    'b99b79b0-6eac-4fd0-83b3-f2296ef5e89d',  -- Otra
    'f9152846-4fe6-4cbe-9cb2-69e2549a5fae'   -- Paramedico
  ]::uuid[];
  n integer;
BEGIN
  UPDATE public.usuarios          SET especialidad_id = v_caminante WHERE especialidad_id = ANY (v_salen);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'usuarios pasados a Caminante: %', n;
  UPDATE public.agentes_operativo SET especialidad_id = v_caminante WHERE especialidad_id = ANY (v_salen);
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'agentes_operativo pasados a Caminante: %', n;
  DELETE FROM public.cat_especialidades WHERE id = ANY (v_salen);
END $$;


-- ############################################################################
-- [2] Instituciones
-- ############################################################################

-- 2.a · Renombres que conservan el id
UPDATE public.cat_instituciones SET nombre = 'Policía' WHERE id = '80ac6de6-9133-45f1-85c3-d3099894a45a'; -- era Policía de Córdoba
UPDATE public.cat_instituciones SET nombre = 'Otros'   WHERE id = '14a0e83e-3e0c-40b8-9cb9-5401bdad9c47'; -- era Otra

-- 2.b · Nuevas
INSERT INTO public.cat_instituciones (id, nombre) VALUES
  ('fcc3e594-5ce6-44d7-8aa9-a6f5beb174e6', 'Guardia Local'),
  ('87e29fe7-ccfa-47e9-89eb-21b81dc7cb52', 'Gendarmería'),
  ('162f5957-16b5-4619-b49f-b2a09b8f42c0', 'Policía Federal'),
  ('1a88c42e-682f-4ade-aaea-cf30d9c185fd', 'Secretaría Gestión de Riesgo')
ON CONFLICT (nombre) DO NOTHING;

-- 2.c · ETAC no está en la lista del cliente: su gente pasa a "Otros".
--       ETAC no tiene dotaciones, así que la FK compuesta no se ve afectada.
UPDATE public.usuarios SET institucion_id = '14a0e83e-3e0c-40b8-9cb9-5401bdad9c47'
 WHERE institucion_id = '7c6d12ff-3af1-417f-b295-27f661281bbc';
DELETE FROM public.cat_dotaciones   WHERE institucion_id = '7c6d12ff-3af1-417f-b295-27f661281bbc';
DELETE FROM public.cat_instituciones WHERE id = '7c6d12ff-3af1-417f-b295-27f661281bbc';


-- ############################################################################
-- [3] Dotaciones de Policía y de Bomberos Voluntarios
-- ############################################################################

INSERT INTO public.cat_dotaciones (id, nombre, institucion_id) VALUES
  -- Policía
  ('d77c4166-5a55-4f44-aacc-43f69399ffd9', 'Investigaciones', '80ac6de6-9133-45f1-85c3-d3099894a45a'),
  ('c4816e1e-a8df-4c71-a7f5-55575a443450', 'DUAR',            '80ac6de6-9133-45f1-85c3-d3099894a45a'),
  ('4d7a2645-3f00-4b68-81f4-3f33c8365e78', 'Canes',           '80ac6de6-9133-45f1-85c3-d3099894a45a'),
  ('218c4c2f-54ed-4009-b103-1b19749b04f3', 'Drones',          '80ac6de6-9133-45f1-85c3-d3099894a45a'),
  ('7710eb28-4f2a-4811-9adf-7d5a5af8b9be', 'Caballería',      '80ac6de6-9133-45f1-85c3-d3099894a45a'),
  ('639d9a43-b25c-41e1-88b6-3c22d32ab89a', 'URD',             '80ac6de6-9133-45f1-85c3-d3099894a45a'),
  ('7805c1f7-a9bf-42d5-a848-fa6114f84388', 'Patrulla Rural',  '80ac6de6-9133-45f1-85c3-d3099894a45a'),
  ('9a80486a-d61b-49ae-af86-0fe8413421b2', 'Caminera',        '80ac6de6-9133-45f1-85c3-d3099894a45a'),
  ('ff79ae43-b2a9-4d45-a5a2-87bb7222f8bd', 'Motos',           '80ac6de6-9133-45f1-85c3-d3099894a45a'),
  -- Bomberos Voluntarios: las cuatro propias + las del DUAR menos Capital
  ('b244f207-9dc1-4ddd-8a9a-3ceaca0dbc85', 'Villa Allende',                    'e9abb177-b4ff-4beb-9200-7c06f07deb5a'),
  ('1f0a2915-7969-4b5e-ba06-747785c643a6', 'Mendiolaza',                       'e9abb177-b4ff-4beb-9200-7c06f07deb5a'),
  ('dbd0b0cc-6c64-4cdb-a856-eb00788f9e33', 'Saldán',                           'e9abb177-b4ff-4beb-9200-7c06f07deb5a'),
  ('bab0371e-c2e0-4b12-b408-1da0af216e20', 'La Caldera',                       'e9abb177-b4ff-4beb-9200-7c06f07deb5a'),
  ('0935c5fc-e92d-4a89-869b-7bcca8560819', 'Miramar',                          'e9abb177-b4ff-4beb-9200-7c06f07deb5a'),
  ('79ab4b3d-f8ae-485c-8c45-fb486acf029a', 'Cruz del Eje',                     'e9abb177-b4ff-4beb-9200-7c06f07deb5a'),
  ('a1139295-a804-4ff5-bf13-6f2ffe727244', 'Villa Cura Brochero (San Javier)', 'e9abb177-b4ff-4beb-9200-7c06f07deb5a'),
  ('af2d22f3-3496-4d97-8604-c11989e997d6', 'Dique La Viña',                    'e9abb177-b4ff-4beb-9200-7c06f07deb5a'),
  ('5b0c0d1e-6a2f-4e8b-9c3d-1f2a3b4c5d61', 'Carlos Paz (Villa Carlos Paz)',    'e9abb177-b4ff-4beb-9200-7c06f07deb5a'),
  ('5b0c0d1e-6a2f-4e8b-9c3d-1f2a3b4c5d62', 'Potrero de Garay',                 'e9abb177-b4ff-4beb-9200-7c06f07deb5a'),
  ('5b0c0d1e-6a2f-4e8b-9c3d-1f2a3b4c5d63', 'Dique Embalse (Río Tercero)',      'e9abb177-b4ff-4beb-9200-7c06f07deb5a'),
  ('5b0c0d1e-6a2f-4e8b-9c3d-1f2a3b4c5d64', 'Río Cuarto',                       'e9abb177-b4ff-4beb-9200-7c06f07deb5a'),
  ('5b0c0d1e-6a2f-4e8b-9c3d-1f2a3b4c5d65', 'Dique La Quebrada',                'e9abb177-b4ff-4beb-9200-7c06f07deb5a'),
  ('5b0c0d1e-6a2f-4e8b-9c3d-1f2a3b4c5d66', 'Otros',                            'e9abb177-b4ff-4beb-9200-7c06f07deb5a')
ON CONFLICT (institucion_id, nombre) DO NOTHING;


-- ############################################################################
-- [4] El DUAR pasa a ser la dependencia "DUAR" de Policía (06/11)
-- ############################################################################

-- 4.a · La regla del Líder se lee de la dependencia
ALTER TABLE public.cat_dotaciones ADD COLUMN IF NOT EXISTS es_duar boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.cat_dotaciones.es_duar IS
  'TRUE sólo para Policía · DUAR. Único criterio para liderar un grupo de rastrillaje. Nunca inferirlo del nombre (migración 033).';
UPDATE public.cat_dotaciones SET es_duar = (id = 'c4816e1e-a8df-4c71-a7f5-55575a443450');

-- 4.b · Quien era DUAR (con cualquiera de sus bases) pasa a Policía · DUAR.
--       Se cambian las dos columnas en la misma sentencia: la FK compuesta
--       (dotación coherente con la institución) se evalúa con la fila final.
DO $$
DECLARE n integer;
BEGIN
  UPDATE public.usuarios
     SET institucion_id = '80ac6de6-9133-45f1-85c3-d3099894a45a',
         dotacion_id    = 'c4816e1e-a8df-4c71-a7f5-55575a443450'
   WHERE institucion_id = '11c7a8ed-de50-4f54-a62a-ff170b67a10f';
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'usuarios pasados de DUAR a Policía · DUAR: %', n;
END $$;

-- 4.c · Fuera las bases del DUAR y la institución DUAR
DELETE FROM public.cat_dotaciones    WHERE institucion_id = '11c7a8ed-de50-4f54-a62a-ff170b67a10f';
DELETE FROM public.cat_instituciones WHERE id             = '11c7a8ed-de50-4f54-a62a-ff170b67a10f';

-- 4.d · La institución ya no decide el Líder
ALTER TABLE public.cat_instituciones DROP COLUMN IF EXISTS es_duar;

COMMIT;

-- ============================================================================
--  VERIFICACIÓN
--  SELECT nombre, es_recurso_critico FROM cat_especialidades ORDER BY es_recurso_critico, nombre;
--  -- Caminante (f) y 8 recursos especiales (t).
--  SELECT i.nombre, count(d.id), bool_or(d.es_duar) FROM cat_instituciones i
--    LEFT JOIN cat_dotaciones d ON d.institucion_id = i.id GROUP BY 1 ORDER BY 1;
--  -- Policía 9 (una con es_duar) · Bomberos Voluntarios 14 · el resto 0. Sin DUAR.
-- ============================================================================
