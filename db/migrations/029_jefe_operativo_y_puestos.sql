-- ============================================================================
-- 029 · Rol «Jefe de operativo» y puestos del puesto de comando — 29/10
-- ============================================================================
-- Relevamiento del 29/10:
--   · Nuevo rol JEFE DE OPERATIVO: ve todo el sistema y extrae informes, pero
--     no modifica nada (los permisos los aplica la API).
--   · En el puesto de comando se registra el ingreso y el egreso al turno en
--     uno de tres puestos: Jefe de operativo (usuarios con ese rol),
--     Coordinador o Encargado (el que está en el campo); estos dos, usuarios
--     con rol coordinador. Lo registran coordinadores y administradores.
--   · Se elimina el «coordinador a cargo»: no hay un responsable único, sólo
--     quién está en cada puesto. `mando_operativo` queda como registro
--     histórico (no se borra); los períodos abiertos se cierran acá.
-- Aditiva para el código anterior: la columna nueva tiene valor por defecto.
-- Idempotente.
-- ============================================================================

INSERT INTO cat_roles (nombre) VALUES ('jefe_operativo') ON CONFLICT (nombre) DO NOTHING;

DO $$ BEGIN
  CREATE TYPE puesto_mando AS ENUM ('JEFE_OPERATIVO', 'COORDINADOR', 'ENCARGADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Lo registrado hasta hoy eran coordinadores en el puesto de comando.
ALTER TABLE presencias_mando ADD COLUMN IF NOT EXISTS puesto puesto_mando NOT NULL DEFAULT 'COORDINADOR';

COMMENT ON COLUMN presencias_mando.puesto IS
  'Puesto del turno (029): JEFE_OPERATIVO (rol jefe_operativo), COORDINADOR o ENCARGADO (en el campo; ambos rol coordinador). '
  'Un cambio de puesto cierra el período y abre otro con la misma hora.';
COMMENT ON TABLE presencias_mando IS
  'Turnos en el puesto de comando de un operativo: quién estuvo, en qué puesto y de cuándo a cuándo (016, puestos desde la 029). '
  'Una persona está en un solo puesto de un solo operativo a la vez.';

-- Sin «a cargo»: se cierran los períodos abiertos y la tabla queda como historia.
UPDATE mando_operativo
   SET hasta = clock_timestamp(), cerrado_por = usuario_id,
       motivo_fin = 'Se dejó de registrar el coordinador a cargo (029: puestos del puesto de comando)'
 WHERE hasta IS NULL;

COMMENT ON TABLE mando_operativo IS
  'HISTÓRICO (016 → 029): quién estuvo a cargo del operativo hasta el 29/10. Desde la 029 no se registra un responsable único; '
  'el puesto de comando se describe con presencias_mando.puesto.';
