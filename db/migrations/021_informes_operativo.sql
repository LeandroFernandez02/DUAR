-- ═════════════════════════════════════════════════════════════════════════
-- 021 · Informes del operativo (CU-41), 14/10
--
-- Cada vez que se descarga el informe de un operativo, el PDF se guarda tal
-- cual en Storage (bucket privado «informes») y acá queda su registro: código,
-- tipo, hora de corte, quién lo generó y la huella SHA-256 del archivo. Con el
-- código (impreso en el PDF y en su QR) cualquiera puede comprobar en
-- /verificar que un archivo es idéntico al que emitió el sistema.
--
-- Decisiones (14/10):
--   · Parcial: el operativo sigue abierto; cada descarga es un informe nuevo.
--   · Final: uno solo por operativo, emitido al finalizar (CU-10); después se
--     descarga siempre esa copia.
--   · Los registros no se modifican ni se borran (trigger). La única excepción
--     es el script de limpieza de datos de prueba, que lo habilita para su
--     propia transacción con  SET LOCAL duar.limpieza_pruebas = 'si'.
--   · Código legible para la Fiscalía: INF-<año>-<número correlativo>.
-- ═════════════════════════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS public.informes_numero_seq;

CREATE TABLE IF NOT EXISTS public.informes_operativo (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo              varchar(20)  NOT NULL UNIQUE,
  operativo_id        uuid         NOT NULL REFERENCES public.operativos(id),
  numero_en_operativo int          NOT NULL CHECK (numero_en_operativo > 0),
  tipo                varchar(10)  NOT NULL CHECK (tipo IN ('PARCIAL', 'FINAL')),
  corte_en            timestamptz  NOT NULL,
  generado_por        uuid         NOT NULL REFERENCES public.usuarios(id),
  generado_en         timestamptz  NOT NULL DEFAULT clock_timestamp(),
  sha256              char(64)     NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  tamano_bytes        int          NOT NULL CHECK (tamano_bytes > 0),
  archivo_ruta        varchar(300) NOT NULL,
  UNIQUE (operativo_id, numero_en_operativo)
);

-- Un solo informe final por operativo.
CREATE UNIQUE INDEX IF NOT EXISTS informes_operativo_final_unico
    ON public.informes_operativo (operativo_id) WHERE tipo = 'FINAL';

COMMENT ON TABLE public.informes_operativo IS
  'CU-41: cada informe emitido (parcial o final), con la huella SHA-256 del PDF guardado en Storage. No se modifica ni se borra.';
COMMENT ON COLUMN public.informes_operativo.corte_en IS
  'Hasta qué momento cubre el informe: la hora de emisión (parcial) o la de fin del operativo (final).';

CREATE OR REPLACE FUNCTION public.informe_inalterable() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('duar.limpieza_pruebas', true) = 'si' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Los informes emitidos no se modifican ni se borran (CU-41).'
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS informe_inalterable ON public.informes_operativo;
CREATE TRIGGER informe_inalterable BEFORE UPDATE OR DELETE ON public.informes_operativo
    FOR EACH ROW EXECUTE FUNCTION public.informe_inalterable();

-- Regla del proyecto: RLS habilitada sin políticas (la API REST de Supabase no la ve).
ALTER TABLE public.informes_operativo ENABLE ROW LEVEL SECURITY;
