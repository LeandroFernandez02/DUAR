-- ============================================================================
-- 026 · Ciclo de estados del operativo (24/10)
-- ============================================================================
-- Decisiones del usuario (24/10):
--   · El estado «Activo» pasa a llamarse «Iniciado». El cambio del ENUM está
--     aparte (027, al publicar): esta migración es aditiva y el código viejo
--     la ignora.
--   · Los estados se mueven solos:
--       Nuevo → Iniciado               al entrar al panel por primera vez
--       Iniciado → En planificación    cuando ingresa el primer agente (QR o manual)
--       → En proceso                   cuando hay un grupo en el terreno (y se queda así)
--       → Inactivo                     por pausa manual (con motivo) o a las 48 h sin actividad
--       Inactivo → el de antes         al reanudar, o solo si fue automático y hay actividad
--   · Cada cambio queda en logs_auditoria con su motivo (cronología del informe).
--
-- Qué guarda:
--   estado_actualizado_en  cuándo cambió el estado por última vez
--   estado_motivo          por qué (texto que se muestra en pantalla)
--   pausa_manual           true si lo pausó una persona (no se reactiva solo)
--   estado_previo_pausa    el estado al que vuelve al reanudar
--
-- «Actividad» = lo último que se registró en el operativo, calculado desde las
-- tablas (no hace falta avisar desde cada endpoint): ver ultima_actividad_operativo.
-- Idempotente.
-- ============================================================================

ALTER TABLE operativos ADD COLUMN IF NOT EXISTS estado_actualizado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE operativos ADD COLUMN IF NOT EXISTS estado_motivo text;
ALTER TABLE operativos ADD COLUMN IF NOT EXISTS pausa_manual boolean NOT NULL DEFAULT false;
ALTER TABLE operativos ADD COLUMN IF NOT EXISTS estado_previo_pausa estado_operativo;

COMMENT ON COLUMN operativos.estado_motivo IS
  'Por qué tiene el estado actual (entrada al panel, primer agente, grupos en el terreno, pausa con su motivo, 48 h sin actividad).';
COMMENT ON COLUMN operativos.pausa_manual IS
  'true = lo pausó una persona: sólo se reanuda a mano. false = Inactivo por 48 h sin actividad: se reanuda solo con la próxima actividad.';

-- Los operativos que ya existen toman como «último cambio» su última modificación.
UPDATE operativos SET estado_actualizado_en = actualizado_en
 WHERE estado_actualizado_en > actualizado_en AND estado_motivo IS NULL;

-- Último movimiento del operativo: el más reciente de todo lo que se registra en él.
-- Los cambios de estado automáticos NO tocan `actualizado_en`, así que pausar o
-- marcar Inactivo no cuenta como actividad (si no, se reactivaría en el acto).
CREATE OR REPLACE FUNCTION ultima_actividad_operativo(p_id uuid) RETURNS timestamptz
LANGUAGE sql STABLE AS $$
  SELECT GREATEST(
    o.creado_en,
    o.actualizado_en,
    COALESCE((SELECT max(registrado_en) FROM eventos_estado WHERE operativo_id = p_id), o.creado_en),
    COALESCE((SELECT max(GREATEST(fecha_ingreso, COALESCE(fecha_egreso, fecha_ingreso))) FROM agentes_operativo WHERE operativo_id = p_id), o.creado_en),
    COALESCE((SELECT max(GREATEST(creado_en, actualizado_en)) FROM grupos WHERE operativo_id = p_id), o.creado_en),
    COALESCE((SELECT max(GREATEST(creado_en, actualizado_en)) FROM poligonos WHERE operativo_id = p_id), o.creado_en),
    COALESCE((SELECT max(GREATEST(creado_en, actualizado_en)) FROM marcadores WHERE operativo_id = p_id), o.creado_en),
    COALESCE((SELECT max(cargado_en) FROM tracks_gpx WHERE operativo_id = p_id), o.creado_en),
    COALESCE((SELECT max(GREATEST(ingreso_en, COALESCE(egreso_en, ingreso_en))) FROM presencias_mando WHERE operativo_id = p_id), o.creado_en),
    COALESCE((SELECT max(registrado_en) FROM punto_cero_historial WHERE operativo_id = p_id), o.creado_en)
  )
  FROM operativos o WHERE o.id = p_id;
$$;

COMMENT ON FUNCTION ultima_actividad_operativo(uuid) IS
  'Último movimiento registrado en el operativo (agentes, grupos, estados, polígonos, marcadores, tracks, presencia, Punto Cero). Base del Inactivo automático a las 48 h.';
