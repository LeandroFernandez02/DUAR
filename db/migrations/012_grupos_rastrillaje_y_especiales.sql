-- ============================================================================
-- 012 · Grupos de rastrillaje y grupos especiales (26/09)
-- ============================================================================
-- Decisión del 26/09 ("opción 2"): un grupo es gente que sale, trabaja y vuelve
-- junta. Los recursos que trabajan a otro ritmo o en otro sector (drones,
-- canes, paramédicos, caballería, buzos) no van mezclados en la cuadrilla que
-- camina el polígono: van en su propio grupo, y un polígono puede recibir
-- varios grupos (Módulo 5).
--
--   · Grupo de RASTRILLAJE: sólo agentes que caminan (bombero, bombero
--     voluntario, defensa civil, policía…). Líder del DUAR, al menos dos
--     integrantes y binomio de caminantes, como hasta ahora.
--   · Grupo ESPECIAL: recursos especiales, con agentes de apoyo si hace falta
--     (el observador del dron, el apoyo del guía). Lo lidera cualquiera — si
--     no es del DUAR, el coordinador lo acepta explícitamente — y no tiene
--     binomio ni mínimo de integrantes.
--
-- La clase se elige al crear el grupo y no cambia: define sus reglas. Que un
-- grupo de rastrillaje no tenga recursos especiales adentro lo garantiza
-- grupo.model.js con las filas bloqueadas (está en otra tabla: no es un CHECK).
--
-- "Recurso especial" es `cat_especialidades.es_recurso_critico` de la
-- especialidad TÁCTICA del agente (`agentes_operativo.especialidad_id`), la que
-- el coordinador puede cambiar en CU-17. Idempotente.
-- ============================================================================

-- ── 1. Catálogo de especialidades ───────────────────────────────────────────
-- Canes pasa a recurso especial: el 27/08 se lo había marcado "camina" porque
-- el guía recorre el terreno, pero trabaja a su ritmo (el perro trabaja por
-- tandas) y en su sector. Se suman Caballería y Buzos. Los id son fijos para
-- que el espejo del frontend (mockData.ts#catEspecialidades) coincida siempre.
UPDATE public.cat_especialidades SET es_recurso_critico = true WHERE nombre = 'Canes';

INSERT INTO public.cat_especialidades (id, nombre, es_recurso_critico) VALUES
  ('eb016aa1-0c17-4fd3-add0-b31becf1d1b2', 'Caballería', true),
  ('3b25c85b-483c-43c0-b8a9-596d09468855', 'Buzos',      true)
ON CONFLICT (nombre) DO UPDATE SET es_recurso_critico = true;

-- ── 2. Clase del grupo ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.clase_grupo AS ENUM ('RASTRILLAJE', 'ESPECIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.grupos ADD COLUMN IF NOT EXISTS clase public.clase_grupo;

-- Grupos existentes: especial si alguna vez tuvo un recurso especial adentro
-- (por su composición actual o por los eventos de quienes se sumaron, así los
-- disueltos también quedan bien clasificados); si no, de rastrillaje.
UPDATE public.grupos g
   SET clase = CASE WHEN EXISTS (
         SELECT 1
           FROM public.agentes_operativo ao
           JOIN public.cat_especialidades ce ON ce.id = ao.especialidad_id
          WHERE ce.es_recurso_critico
            AND (ao.grupo_id = g.id
                 OR ao.id IN (SELECT e.agente_operativo_id FROM public.eventos_estado e
                               WHERE e.grupo_id = g.id AND e.entidad = 'AGENTE' AND e.accion = 'agrupar'))
       ) THEN 'ESPECIAL'::public.clase_grupo ELSE 'RASTRILLAJE'::public.clase_grupo END
 WHERE clase IS NULL;

ALTER TABLE public.grupos ALTER COLUMN clase SET DEFAULT 'RASTRILLAJE';
ALTER TABLE public.grupos ALTER COLUMN clase SET NOT NULL;

COMMENT ON COLUMN public.grupos.clase IS
  'RASTRILLAJE: sólo agentes que caminan; Líder DUAR, mínimo 2 y binomio. ESPECIAL: recursos especiales (dron, canes, paramédico, caballería, buzos) con agentes de apoyo; Líder libre (si no es DUAR, aceptado por el coordinador), sin binomio. Se elige al crear y no cambia (migración 012).';
