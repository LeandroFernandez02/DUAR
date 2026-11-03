-- ============================================================================
-- 032 · Puntos de interés y hallazgos cargados por el Líder de Grupo (03/11)
-- ============================================================================
-- Pedido del cliente: el Líder del grupo, desde el portal, marca puntos de interés y
-- hallazgos en el polígono asignado a su grupo, con fotos sacadas con el celular. Los demás
-- integrantes no pueden. En el terreno casi nunca hay señal: el celular guarda el punto con
-- la hora en que se marcó y lo manda al volver la señal (reenviar no duplica).
--
-- Aditiva: el código anterior no lee estas columnas. Idempotente.
-- ============================================================================

ALTER TABLE marcadores
    -- De qué grupo y de qué polígono salió (sólo los que carga el Líder; el coordinador no).
    ADD COLUMN IF NOT EXISTS grupo_id          uuid REFERENCES grupos(id),
    ADD COLUMN IF NOT EXISTS poligono_id       uuid REFERENCES poligonos(id),
    -- La hora en que se marcó en el celular (puede ser anterior a creado_en, la de la carga).
    ADD COLUMN IF NOT EXISTS ocurrido_en       timestamptz,
    -- Precisión del GPS del celular, en metros (null si se ubicó a mano en el mapa).
    ADD COLUMN IF NOT EXISTS precision_m       integer,
    -- null = dentro del polígono (o no aplica); si quedó afuera, metros hasta el borde.
    ADD COLUMN IF NOT EXISTS fuera_poligono_m  integer,
    -- Id que genera el celular: si el envío se repite (sin señal), no se duplica.
    ADD COLUMN IF NOT EXISTS cliente_id        uuid;

ALTER TABLE marcadores DROP CONSTRAINT IF EXISTS marcador_lider_chk;
ALTER TABLE marcadores ADD CONSTRAINT marcador_lider_chk CHECK (
    (precision_m IS NULL OR precision_m >= 0)
    AND (fuera_poligono_m IS NULL OR fuera_poligono_m >= 0)
    -- Un Líder sólo carga puntos de interés y hallazgos, siempre de un polígono.
    AND (grupo_id IS NULL OR (clase IN ('POI', 'HALLAZGO') AND poligono_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS marcadores_cliente_unico
    ON marcadores (cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS marcadores_poligono_idx
    ON marcadores (poligono_id) WHERE poligono_id IS NOT NULL;

-- Lo mismo para cada foto: se suben de a una y reenviarla no la duplica.
ALTER TABLE marcador_fotos ADD COLUMN IF NOT EXISTS cliente_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS marcador_fotos_cliente_unico
    ON marcador_fotos (cliente_id) WHERE cliente_id IS NOT NULL;

COMMENT ON COLUMN marcadores.grupo_id IS 'Grupo cuyo Líder cargó el marcador desde el portal (null: lo cargó un coordinador).';
COMMENT ON COLUMN marcadores.ocurrido_en IS 'Hora en que el Líder lo marcó en el celular; creado_en es la hora de carga.';
COMMENT ON COLUMN marcadores.fuera_poligono_m IS 'Si el Líder lo guardó fuera de su polígono: metros hasta el borde. null = dentro.';
