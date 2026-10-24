-- ============================================================================
-- 028 · Color propio de cada polígono (Módulo 5 · CU-37) — 24/10
-- ============================================================================
-- Pedido del usuario: tiene que haber una opción para cambiar el color de los polígonos.
-- Hasta ahora un polígono tomaba el color de su grupo de rastrillaje (o gris punteado sin
-- grupo). Ahora puede tener el suyo: si lo tiene, manda; si no (NULL), sigue como antes.
-- El cambio queda en el historial del polígono (tipo COLOR).
-- Aditiva: el código viejo no la nombra. Idempotente.
-- ============================================================================

ALTER TABLE poligonos ADD COLUMN IF NOT EXISTS color varchar(7);

DO $$ BEGIN
  ALTER TABLE poligonos ADD CONSTRAINT poligonos_color_hex CHECK (color IS NULL OR color ~ '^#[0-9a-fA-F]{6}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN poligonos.color IS
  'Color elegido para dibujarlo (#RRGGBB). NULL = el de su grupo de rastrillaje, o gris punteado si no tiene grupo (028).';

ALTER TABLE poligono_eventos DROP CONSTRAINT IF EXISTS poligono_evento_tipo_chk;
ALTER TABLE poligono_eventos ADD CONSTRAINT poligono_evento_tipo_chk CHECK (tipo IN (
    'CREADO', 'NOMBRE', 'GEOMETRIA', 'NOTAS', 'COLOR', 'ELIMINADO',
    'GRUPO_ASIGNADO', 'GRUPO_CAMBIADO', 'GRUPO_QUITADO', 'GRUPO_REPLEGADO', 'GRUPO_SALIO',
    'TRACK_CARGADO', 'TRACK_REASIGNADO', 'TRACK_ELIMINADO'));
