-- ═════════════════════════════════════════════════════════════════════════
-- 036 · El Conductor es un recurso crítico (13/11)
--
-- Decisión del usuario: el único que no es recurso crítico es el Caminante.
-- El Conductor sí lo es: puede estar en cualquier grupo y por lo general no
-- rastrilla.
--
-- Sus reglas NO cambian, porque todas miran primero `es_conductor`:
--   · entra a cualquier grupo, también de rastrillaje (estados.js#entraARastrillaje
--     deja pasar al recurso crítico que es conductor);
--   · no cuenta para el binomio y queda Desplegado mientras el grupo rastrilla;
--   · no puede ser Líder de un grupo de rastrillaje (sigue el aviso «es conductor»);
--   · el armado automático no lo reparte.
-- Lo que sí cambia: en las pantallas pasa a contarse entre los recursos críticos
-- (por ejemplo, entre los candidatos «especiales» al armar un grupo).
--
-- Se puede aplicar antes o después del deploy. Idempotente.
-- ═════════════════════════════════════════════════════════════════════════

BEGIN;

UPDATE public.cat_especialidades
   SET es_recurso_critico = true
 WHERE es_conductor = true
   AND es_recurso_critico = false;

COMMIT;

-- Verificación: sólo Caminante queda como no crítico.
-- SELECT nombre, es_recurso_critico, es_conductor FROM cat_especialidades ORDER BY es_recurso_critico, nombre;
