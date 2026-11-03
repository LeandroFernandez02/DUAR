-- ============================================================================
-- 030 · Rol «jefe de operativo», Jefe de cada operativo y puestos del turno (02/11)
-- ============================================================================
-- Pedido del usuario (02/11):
--   · Rol nuevo «jefe de operativo»: ve todo el sistema (sólo consulta) y saca informes.
--   · Cada operativo tiene un Jefe de Operativo (opcional). Es omnipresente: no marca
--     ingreso ni egreso, y puede ser Jefe de varios operativos a la vez. Lo asigna él
--     mismo, un coordinador o un administrador; se cambia o se quita desde el puesto
--     de comando o desde «Modificar operativo».
--   · El Jefe REEMPLAZA al «coordinador a cargo» de la 016: mando_operativo deja de
--     escribirse (queda para los informes ya emitidos). Los mandos abiertos los cierra la 031.
--   · En el puesto de comando el ingreso y el egreso al turno se registran por puesto:
--     «Coordinador» u «Operador Mesa Coordinadora» (los dos, con rol coordinador).
-- Aditiva: el código anterior no la nombra (se puede aplicar antes de publicar). Idempotente.
-- ============================================================================

INSERT INTO cat_roles (nombre)
SELECT 'jefe de operativo'
 WHERE NOT EXISTS (SELECT 1 FROM cat_roles WHERE lower(nombre) = 'jefe de operativo');

ALTER TABLE presencias_mando ADD COLUMN IF NOT EXISTS puesto varchar(20) NOT NULL DEFAULT 'COORDINADOR';
DO $$ BEGIN
  ALTER TABLE presencias_mando ADD CONSTRAINT presencia_mando_puesto CHECK (puesto IN ('COORDINADOR', 'OPERADOR_MESA'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
COMMENT ON COLUMN presencias_mando.puesto IS
  'Puesto del turno (030): COORDINADOR u OPERADOR_MESA (Operador Mesa Coordinadora). Los dos, con rol coordinador.';

-- Períodos del Jefe de Operativo: quién fue Jefe, de cuándo a cuándo y quién lo asignó.
CREATE TABLE IF NOT EXISTS public.jefes_operativo (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operativo_id  uuid NOT NULL REFERENCES public.operativos(id),
  usuario_id    uuid NOT NULL REFERENCES public.usuarios(id),
  desde         timestamptz NOT NULL DEFAULT clock_timestamp(),
  asignado_por  uuid NOT NULL REFERENCES public.usuarios(id),
  hasta         timestamptz,
  cerrado_por   uuid REFERENCES public.usuarios(id),
  motivo_fin    text,
  CONSTRAINT jefe_operativo_periodo CHECK (hasta IS NULL OR hasta >= desde),
  CONSTRAINT jefe_operativo_cierre  CHECK ((hasta IS NULL) = (cerrado_por IS NULL))
);
-- Uno solo por operativo; la misma persona puede ser Jefe de varios (sin índice por usuario).
CREATE UNIQUE INDEX IF NOT EXISTS jefe_operativo_unico_activo ON public.jefes_operativo (operativo_id) WHERE hasta IS NULL;
CREATE INDEX IF NOT EXISTS idx_jefes_operativo_usuario ON public.jefes_operativo (usuario_id) WHERE hasta IS NULL;
ALTER TABLE public.jefes_operativo ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.jefes_operativo IS
  'Jefe de Operativo de cada operativo, por períodos (030). Reemplaza al coordinador a cargo (mando_operativo).';
