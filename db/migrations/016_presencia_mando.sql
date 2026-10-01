-- ═════════════════════════════════════════════════════════════════════════
-- 016 · Presencia de mando: coordinadores en el puesto de comando (01/10)
--
-- Hasta ahora se sabía QUIÉN registró cada cambio (eventos_estado.registrado_por,
-- logs_auditoria.usuario_id), pero no si estaba en el puesto de comando o lo
-- hizo a distancia, ni quién estaba a cargo del operativo en cada momento.
--
-- Decisiones del usuario (01/10):
--   · El coordinador NO es un agente: no va en agentes_operativo, no tiene
--     estados tácticos ni aparece en el tablero. Tiene su propio registro.
--   · Hay UNO a cargo por operativo y además se sabe quiénes están presentes.
--   · Cualquier coordinador (o un administrador) puede registrar el ingreso o
--     el retiro de otro; queda quién lo registró.
--   · La presencia no limita permisos (mando compartido): sirve para la
--     trazabilidad ("lo registró a distancia") y para el Informe.
--   · Si un coordinador se registra como agente, se cierra su presencia de mando.
--
-- Dos tablas de PERÍODOS (no de eventos), porque el Informe necesita responder
-- "quién estaba presente / a cargo a tal hora" con una consulta simple:
--   · presencias_mando → cada vez que un coordinador estuvo en el puesto.
--   · mando_operativo  → quién estuvo a cargo, de cuándo a cuándo (traspasos).
-- Las reglas que cruzan tablas (el que está a cargo tiene que estar presente,
-- sucesión al retirarse) las valida mando.model.js con el operativo bloqueado.
-- ═════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.presencias_mando (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operativo_id   uuid NOT NULL REFERENCES public.operativos(id),
  usuario_id     uuid NOT NULL REFERENCES public.usuarios(id),
  ingreso_en     timestamptz NOT NULL DEFAULT clock_timestamp(),
  ingreso_por    uuid NOT NULL REFERENCES public.usuarios(id),
  egreso_en      timestamptz,
  egreso_por     uuid REFERENCES public.usuarios(id),
  motivo_egreso  text,
  CONSTRAINT presencia_mando_periodo CHECK (egreso_en IS NULL OR egreso_en >= ingreso_en),
  CONSTRAINT presencia_mando_cierre  CHECK ((egreso_en IS NULL) = (egreso_por IS NULL))
);

-- Ubicuidad del mando: un coordinador está presente en un solo operativo a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS presencia_mando_unica_activa
  ON public.presencias_mando (usuario_id) WHERE egreso_en IS NULL;
CREATE INDEX IF NOT EXISTS idx_presencias_mando_operativo ON public.presencias_mando (operativo_id, ingreso_en);
-- Para marcar "a distancia" en la línea de tiempo: ¿estaba presente este usuario a esta hora?
CREATE INDEX IF NOT EXISTS idx_presencias_mando_usuario   ON public.presencias_mando (usuario_id, ingreso_en);

CREATE TABLE IF NOT EXISTS public.mando_operativo (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operativo_id  uuid NOT NULL REFERENCES public.operativos(id),
  usuario_id    uuid NOT NULL REFERENCES public.usuarios(id),
  desde         timestamptz NOT NULL DEFAULT clock_timestamp(),
  asignado_por  uuid NOT NULL REFERENCES public.usuarios(id),
  hasta         timestamptz,
  cerrado_por   uuid REFERENCES public.usuarios(id),
  motivo_fin    text,
  CONSTRAINT mando_periodo CHECK (hasta IS NULL OR hasta >= desde),
  CONSTRAINT mando_cierre  CHECK ((hasta IS NULL) = (cerrado_por IS NULL))
);

-- Uno solo a cargo por operativo.
CREATE UNIQUE INDEX IF NOT EXISTS mando_unico_activo
  ON public.mando_operativo (operativo_id) WHERE hasta IS NULL;
CREATE INDEX IF NOT EXISTS idx_mando_operativo ON public.mando_operativo (operativo_id, desde);

-- Regla del proyecto: RLS deny-all (sólo la API, con su usuario de servicio, entra).
ALTER TABLE public.presencias_mando ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mando_operativo  ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.presencias_mando IS
  'Períodos en que un coordinador estuvo presente en el puesto de comando de un operativo (01/10). No es un agente: no tiene estados tácticos ni grupo.';
COMMENT ON TABLE public.mando_operativo IS
  'Quién estuvo a cargo del operativo y de cuándo a cuándo; uno solo a la vez. El que está a cargo tiene que estar presente (lo valida la API).';
COMMENT ON COLUMN public.presencias_mando.ingreso_por IS
  'Quién registró el ingreso: el propio coordinador, otro coordinador o un administrador.';
COMMENT ON COLUMN public.presencias_mando.motivo_egreso IS
  'Ej.: Se retiró del puesto de comando · Pasó a rastrillar como agente · Se presentó en otro operativo · Operativo finalizado.';
