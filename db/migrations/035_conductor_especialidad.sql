-- ═════════════════════════════════════════════════════════════════════════
-- 035 · "Conductor" pasa a ser una especialidad (07/11)
--
-- Decisión del usuario: un agente es UNA cosa a la vez en el operativo. El
-- conductor deja de ser una marca aparte (que se combinaba con cualquier
-- especialidad) y pasa a ser la especialidad "Conductor", sincronizada con el
-- perfil como todas las demás (migración 034).
--
-- Las reglas del conductor quedan TAL CUAL: entra a cualquier grupo, no
-- rastrilla (queda Desplegado mientras el grupo rastrilla), no cuenta para el
-- binomio, no puede ser Líder de un grupo de rastrillaje y el armado
-- automático no lo reparte. Para no tocar esas reglas, la columna
-- `agentes_operativo.es_conductor` se conserva, pero ahora la calcula la base:
-- es verdadera sólo si la especialidad tiene `es_conductor` en el catálogo.
-- Nadie la escribe a mano (el trigger pisa cualquier valor).
--
-- Datos: quien HOY está marcado como conductor en un operativo vigente pasa a
-- la especialidad Conductor (en el operativo y en su perfil), y queda en la
-- línea de tiempo. Las participaciones cerradas no se tocan: su foto legal ya
-- dice cómo fueron.
--
-- ⚠️  Aplicar JUSTO cuando se publica el código que la acompaña: el código
--     anterior todavía deja marcar "conductor" aparte, y con el trigger esa
--     marca no se guardaría. Idempotente.
-- ═════════════════════════════════════════════════════════════════════════

BEGIN;

-- [1] Catálogo
ALTER TABLE public.cat_especialidades
    ADD COLUMN IF NOT EXISTS es_conductor boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.cat_especialidades.es_conductor IS
  'TRUE sólo para "Conductor": maneja el vehículo, no rastrilla y entra a cualquier grupo. Determina agentes_operativo.es_conductor (migración 035).';

INSERT INTO public.cat_especialidades (id, nombre, es_recurso_critico, es_conductor) VALUES
  ('39c9654d-b11c-487d-a3ca-45636957d599', 'Conductor', false, true)
ON CONFLICT (nombre) DO UPDATE SET es_recurso_critico = false, es_conductor = true;

-- [2] es_conductor se deriva de la especialidad
CREATE OR REPLACE FUNCTION public.agente_conductor_segun_especialidad()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.es_conductor := COALESCE(
    (SELECT e.es_conductor FROM public.cat_especialidades e WHERE e.id = NEW.especialidad_id), false);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS agente_conductor_segun_especialidad ON public.agentes_operativo;
CREATE TRIGGER agente_conductor_segun_especialidad
  BEFORE INSERT OR UPDATE OF especialidad_id, es_conductor ON public.agentes_operativo
  FOR EACH ROW EXECUTE FUNCTION public.agente_conductor_segun_especialidad();

-- [3] Los conductores de hoy (participaciones vigentes) pasan a la especialidad Conductor
DO $$
DECLARE
  v_conductor uuid := '39c9654d-b11c-487d-a3ca-45636957d599';
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT ao.id, ao.operativo_id, ao.usuario_id, ao.grupo_id,
           COALESCE(e.nombre, 'sin especialidad') AS antes
      FROM public.agentes_operativo ao
      LEFT JOIN public.cat_especialidades e ON e.id = ao.especialidad_id
     WHERE ao.fecha_egreso IS NULL AND ao.es_conductor
       AND ao.especialidad_id IS DISTINCT FROM v_conductor
     FOR UPDATE OF ao
  LOOP
    UPDATE public.agentes_operativo
       SET especialidad_id = v_conductor, especialidad_nombre = 'Conductor'
     WHERE id = r.id;
    UPDATE public.usuarios
       SET especialidad_id = v_conductor, actualizado_en = CURRENT_TIMESTAMP
     WHERE id = r.usuario_id;
    INSERT INTO public.eventos_estado
      (operativo_id, entidad, grupo_id, agente_operativo_id, accion, ocurrido_en, fuente, motivo)
    VALUES (r.operativo_id, 'AGENTE', r.grupo_id, r.id, 'especialidad', CURRENT_TIMESTAMP, 'SISTEMA',
            'De ' || r.antes || ' a Conductor (el conductor pasó a ser una especialidad)');
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'conductores pasados a la especialidad Conductor: %', n;
END $$;

COMMIT;

-- ============================================================================
--  VERIFICACIÓN
--  SELECT nombre, es_recurso_critico, es_conductor FROM cat_especialidades ORDER BY 1;
--  -- Conductor: f / t. El resto: es_conductor = f.
--  SELECT count(*) FROM agentes_operativo ao JOIN cat_especialidades e ON e.id = ao.especialidad_id
--   WHERE ao.fecha_egreso IS NULL AND ao.es_conductor <> e.es_conductor;
--  -- 0
-- ============================================================================
