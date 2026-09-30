-- ═════════════════════════════════════════════════════════════════════════
-- 013 · Se elimina "caminante" (decisión del 29/09)
--
-- ⚠️  PENDIENTE: APLICAR RECIÉN AL SUBIR A PRODUCCIÓN, junto con el código.
--     La base es compartida con Vercel y la versión publicada todavía lee y
--     escribe `es_caminante` (alta por QR incluida): borrarla antes la rompe.
--     El código local ya no la usa, así que puede quedar hasta ese momento.
--
-- Por qué: quién rastrilla ya lo dicen la especialidad y el papel.
--   · Especialidad (`cat_especialidades.es_recurso_critico`): agente de
--     rastrillaje o recurso especial. Decide a qué clase de grupo entra.
--   · Conductor (`agentes_operativo.es_conductor`): no rastrilla, espera al
--     grupo en la camioneta, y entra a cualquier grupo aunque su especialidad
--     sea de recurso especial.
--   · Rastrilla todo integrante que no es conductor. El binomio de un grupo de
--     rastrillaje cuenta a ésos, y la Regla 1 deja al conductor DESPLEGADO
--     mientras el grupo rastrilla.
-- Reemplaza la Regla C del 24/08 (caminante inferido con override del
-- Coordinador), que ya no tenía casos que no cubrieran estas dos columnas.
-- ═════════════════════════════════════════════════════════════════════════

ALTER TABLE agentes_operativo DROP COLUMN IF EXISTS es_caminante;

COMMENT ON COLUMN agentes_operativo.es_conductor IS
  'Maneja la camioneta en este operativo: no rastrilla (queda DESPLEGADO mientras el grupo rastrilla) y entra a cualquier grupo, aunque su especialidad sea de recurso especial (29/09).';
