-- ═════════════════════════════════════════════════════════════════════════
-- 034 · Foto de cada participación en un operativo (07/11)
--
-- Pedido del usuario: la especialidad se edita desde el perfil o desde el
-- operativo y queda igual en los dos lados; pero el informe es un documento
-- legal para la Fiscalía y tiene que mostrar las cosas TAL CUAL SUCEDIERON,
-- aunque después la persona cambie de especialidad, de institución o de
-- dependencia, o el catálogo cambie de nombre.
--
-- Hasta ahora el informe leía esos nombres en el momento de generarlo (del
-- perfil y de los catálogos actuales). Desde acá cada fila de
-- `agentes_operativo` guarda su propia FOTO en texto:
--   · mientras la participación está vigente (fecha_egreso IS NULL), el
--     sistema la mantiene al día con cada cambio;
--   · cuando la persona deja el operativo o el operativo finaliza, queda
--     congelada para siempre: nada la vuelve a tocar.
--
-- Los cambios de especialidad durante el operativo quedan además en la línea
-- de tiempo (`eventos_estado`, acción 'especialidad'): quién, cuándo y de qué
-- a qué.
--
-- ⚠️  Los operativos anteriores a esta migración se completan con los nombres
--     de HOY: lo que tenían antes de la migración 033 (Bombero, DUAR…) ya no
--     se puede recuperar porque no se guardaba. Los PDF ya descargados sí
--     conservan lo que decían.
--
-- Aditiva: el código anterior no lee estas columnas. Aplicar junto con el
-- deploy de la rama `especialidad-sincronizada` (o antes: no rompe nada).
-- Idempotente.
-- ═════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.agentes_operativo
    ADD COLUMN IF NOT EXISTS especialidad_nombre varchar(100),
    ADD COLUMN IF NOT EXISTS institucion_nombre  varchar(150),
    ADD COLUMN IF NOT EXISTS dependencia_nombre  varchar(150);

COMMENT ON COLUMN public.agentes_operativo.especialidad_nombre IS
  'Foto: nombre de la especialidad con la que trabajó en este operativo. Se congela al egresar (migración 034).';
COMMENT ON COLUMN public.agentes_operativo.institucion_nombre IS
  'Foto: institución de la persona durante este operativo. Se congela al egresar (migración 034).';
COMMENT ON COLUMN public.agentes_operativo.dependencia_nombre IS
  'Foto: dependencia (cat_dotaciones) de la persona durante este operativo. Se congela al egresar (migración 034).';

-- Completar las filas que todavía no tienen foto, con los datos de hoy.
UPDATE public.agentes_operativo ao
   SET especialidad_nombre = (SELECT e.nombre FROM public.cat_especialidades e WHERE e.id = ao.especialidad_id),
       institucion_nombre  = (SELECT i.nombre FROM public.usuarios u
                                JOIN public.cat_instituciones i ON i.id = u.institucion_id WHERE u.id = ao.usuario_id),
       dependencia_nombre  = (SELECT d.nombre FROM public.usuarios u
                                JOIN public.cat_dotaciones d ON d.id = u.dotacion_id WHERE u.id = ao.usuario_id)
 WHERE ao.especialidad_nombre IS NULL
   AND ao.institucion_nombre  IS NULL
   AND ao.dependencia_nombre  IS NULL;

COMMIT;

-- ============================================================================
--  VERIFICACIÓN
--  SELECT count(*) FILTER (WHERE institucion_nombre IS NULL) AS sin_foto, count(*)
--    FROM agentes_operativo;
--  -- sin_foto = sólo quienes no tienen institución cargada en su perfil.
-- ============================================================================
