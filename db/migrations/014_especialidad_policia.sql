-- ═════════════════════════════════════════════════════════════════════════
-- 014 · Especialidad "Policía" (29/09)
--
-- Hasta ahora el policía se cargaba sólo por institución ("Policía de
-- Córdoba") y quedaba sin especialidad. El usuario pidió tenerla en el
-- catálogo, como especialidad de RASTRILLAJE (no es recurso especial).
--
-- Es sólo un dato nuevo del catálogo: la versión publicada no se rompe (no lo
-- ofrece hasta que se suba el front, que lo espeja en mockData.ts con este
-- mismo UUID).
-- ═════════════════════════════════════════════════════════════════════════

INSERT INTO public.cat_especialidades (id, nombre, es_recurso_critico) VALUES
  ('0c55b9bf-f8fe-4651-a813-c612718b1ba9', 'Policía', false)
ON CONFLICT (nombre) DO UPDATE SET es_recurso_critico = false;
