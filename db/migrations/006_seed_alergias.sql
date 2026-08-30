-- ============================================================================
--  MIGRACIÓN 006 · CATÁLOGO DE ALERGIAS
--  Sistema DUAR · Fecha: 2026-08-28
-- ----------------------------------------------------------------------------
--  Siembra las 9 alergias reales que definió el usuario (relevantes para
--  personal de campo en operativos de alto riesgo). `usuarios_alergias` es la
--  relación N:M real que ya existía en el modelo (un agente puede tener más de
--  una alergia); lo que faltaba era el contenido del catálogo — hasta ahora el
--  frontend usaba una lista de opciones inventada que no correspondía a nada.
--
--  Idempotente: ON CONFLICT (nombre) evita duplicar si se re-ejecuta.
-- ============================================================================

BEGIN;

INSERT INTO public.cat_alergias (nombre) VALUES
    ('Penicilina (Amoxicilina)'),
    ('Antiinflamatorios'),
    ('Anestesia local (Lidocaína)'),
    ('Yodo / Pervinox'),
    ('Corticoides'),
    ('Picadura de abejas o avispas'),
    ('Picadura de hormigas o arañas'),
    ('Látex (Guantes médicos)'),
    ('Cintas adhesivas o apósitos')
ON CONFLICT (nombre) DO NOTHING;

COMMIT;

-- ============================================================================
--  VERIFICACIÓN
--  SELECT id, nombre FROM cat_alergias ORDER BY nombre;  -- deben ser 9
-- ============================================================================
