-- =============================================================================
--  018 · DNI y correo de un usuario ELIMINADO se pueden volver a usar (CU-07)
-- =============================================================================
--  Problema (detectado en producción el 02/10): al eliminar un usuario y querer
--  darlo de alta de nuevo con el mismo DNI o correo, el sistema lo rechazaba.
--  El borrado es LÓGICO (la fila queda con estado ELIMINADO para que su
--  historial operativo siga en los informes), y `usuarios_dni_key` y
--  `usuarios_email_key` eran UNIQUE sobre TODA la tabla, incluidas esas filas.
--  Ya figuraba como pendiente en db/README.md: el CU-07 permite reutilizarlos.
--
--  Solución: la unicidad pasa a valer sólo entre los usuarios NO eliminados
--  (índices UNIQUE parciales). El usuario eliminado conserva su fila, su id y
--  todo lo que cuelga de él; el nuevo alta es otra fila con otro id.
--
--  El correo se compara sin distinguir mayúsculas (lower(email)), igual que el
--  login y los chequeos de la API: antes la base dejaba pasar "Juan@x.com" y
--  "juan@x.com" como distintos aunque la aplicación los tratara como el mismo.
--
--  Además, un CHECK fija la coherencia en la que se apoyan los índices:
--  ELIMINADO si y sólo si tiene `eliminado_en` (igual que grupos y DISUELTO).
--
--  Idempotente. Compatible con el código anterior (no rompe lo publicado).
-- =============================================================================

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_dni_key;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_dni_vigente_key
    ON usuarios (dni) WHERE eliminado_en IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_vigente_key
    ON usuarios (lower(email)) WHERE eliminado_en IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuario_eliminado_con_fecha_chk') THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuario_eliminado_con_fecha_chk
            CHECK ((estado = 'ELIMINADO') = (eliminado_en IS NOT NULL));
    END IF;
END $$;

COMMENT ON INDEX usuarios_dni_vigente_key IS
    'DNI único entre los usuarios no eliminados: el de un usuario ELIMINADO se puede reutilizar (CU-07).';
COMMENT ON INDEX usuarios_email_vigente_key IS
    'Correo único (sin distinguir mayúsculas) entre los usuarios no eliminados (CU-07).';
