-- ═════════════════════════════════════════════════════════════════════════
-- 015 · Índices del tablero de grupos (auditoría del 30/09)
--
-- El analizador de Supabase marcó claves foráneas sin índice. Estas dos se
-- leen en CADA refresco del tablero (cada 10 s por coordinador conectado):
--   · agentes_operativo.grupo_id → integrantes de cada grupo (JOIN del listado,
--     bloqueo de miembros, cascada de estados).
--   · grupos.lider_id            → quién lidera (portal del Líder, sucesión).
-- Con los datos de prueba no se nota; con un operativo real de cien agentes,
-- sin índice cada refresco recorre la tabla completa.
--
-- Sólo agrega índices: no cambia datos ni afecta a la versión publicada.
-- ═════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_agentes_operativo_grupo ON public.agentes_operativo (grupo_id);
CREATE INDEX IF NOT EXISTS idx_grupos_lider            ON public.grupos (lider_id);
