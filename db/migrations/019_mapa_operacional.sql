-- =============================================================================
--  019 · Módulo 5: Mapa Operacional (CU-27 a CU-38)
-- =============================================================================
--  Estructura aprobada el 12/10. Terminología: siempre «polígono» (nunca
--  «sector»), en los CU, en la pantalla y en la base.
--
--  Reglas que garantiza la base (las demás las valida la API, en transacción):
--   · El polígono NO tiene estado: lo describe su cobertura (CU-38).
--   · Nombre único entre los polígonos vigentes del operativo; forma válida
--     (sin bordes cruzados).
--   · Un grupo está en un solo polígono a la vez (poligono_grupos).
--     «A lo sumo un grupo de rastrillaje por polígono» lo controla la API con
--     el polígono bloqueado: la base no ve la clase del grupo desde esa tabla.
--   · Un hallazgo no se da de baja ni pasa a ser otra clase de marcador.
--   · Eliminar = baja con registro (eliminado_en / eliminado_por) en todo; lo
--     eliminado se recupera a pedido.
--   · El mismo recorrido de la misma persona no se carga dos veces.
--
--  Geometrías en WGS84 (SRID 4326), como operativos.punto_cero. Áreas,
--  perímetros y distancias en metros, calculados como geography.
--  Idempotente. RLS deny-all en todas las tablas nuevas (regla del proyecto).
-- =============================================================================

-- ── Polígonos (CU-27, CU-35, CU-36, CU-37, CU-38) ───────────────────────────
CREATE TABLE IF NOT EXISTS poligonos (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operativo_id            uuid NOT NULL REFERENCES operativos(id),
    nombre                  varchar(120) NOT NULL,
    geom                    geometry(Polygon, 4326) NOT NULL,
    area_m2                 double precision NOT NULL,
    perimetro_m             double precision NOT NULL,
    notas                   text,
    -- Última cobertura calculada (CU-38): porcentaje, km recorridos dentro y
    -- lo que quedó sin revisar.
    cobertura_pct           numeric(5,2) NOT NULL DEFAULT 0,
    cobertura_km            numeric(10,3) NOT NULL DEFAULT 0,
    brechas                 geometry(Geometry, 4326),
    cobertura_calculada_en  timestamptz,
    creado_por              uuid REFERENCES usuarios(id),
    creado_en               timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en          timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en            timestamptz,
    eliminado_por           uuid REFERENCES usuarios(id),
    CONSTRAINT poligono_nombre_chk     CHECK (length(btrim(nombre)) >= 3),
    CONSTRAINT poligono_geom_valida    CHECK (ST_IsValid(geom)),
    CONSTRAINT poligono_cobertura_chk  CHECK (cobertura_pct BETWEEN 0 AND 100)
);
CREATE UNIQUE INDEX IF NOT EXISTS poligono_nombre_unico_vigente
    ON poligonos (operativo_id, lower(btrim(nombre))) WHERE eliminado_en IS NULL;
CREATE INDEX IF NOT EXISTS poligonos_operativo_idx ON poligonos (operativo_id);
CREATE INDEX IF NOT EXISTS poligonos_geom_idx ON poligonos USING gist (geom);

-- Área y perímetro los calcula la base cada vez que cambia la forma: nunca
-- pueden quedar desactualizados respecto de geom.
CREATE OR REPLACE FUNCTION poligono_medidas() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.area_m2     := ST_Area(NEW.geom::geography);
    NEW.perimetro_m := ST_Perimeter(NEW.geom::geography);
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS poligono_medidas ON poligonos;
CREATE TRIGGER poligono_medidas BEFORE INSERT OR UPDATE OF geom ON poligonos
    FOR EACH ROW EXECUTE FUNCTION poligono_medidas();

-- ── Grupos en cada polígono, con su historia (CU-28) ────────────────────────
-- Cada fila = un período: cuándo entró el grupo y cuándo salió y por qué.
CREATE TABLE IF NOT EXISTS poligono_grupos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poligono_id     uuid NOT NULL REFERENCES poligonos(id),
    grupo_id        uuid NOT NULL REFERENCES grupos(id),
    asignado_en     timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    asignado_por    uuid REFERENCES usuarios(id),
    salida_en       timestamptz,
    salida_por      uuid REFERENCES usuarios(id),
    motivo_salida   varchar(25),
    CONSTRAINT poligono_grupo_motivo_chk CHECK (motivo_salida IN
        ('QUITADO', 'CAMBIADO', 'REPLEGADO', 'DISUELTO', 'POLIGONO_ELIMINADO', 'OPERATIVO_FINALIZADO')),
    CONSTRAINT poligono_grupo_salida_chk CHECK ((salida_en IS NULL) = (motivo_salida IS NULL)),
    CONSTRAINT poligono_grupo_orden_chk  CHECK (salida_en IS NULL OR salida_en >= asignado_en)
);
-- Un grupo en un solo polígono a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS poligono_grupo_unico_vigente
    ON poligono_grupos (grupo_id) WHERE salida_en IS NULL;
CREATE INDEX IF NOT EXISTS poligono_grupos_poligono_idx ON poligono_grupos (poligono_id);

-- ── Tracks GPX (CU-29, CU-30, CU-36, CU-38) ─────────────────────────────────
-- El recorrido, las horas y la elevación salen del archivo y no se editan;
-- sólo se corrigen el polígono y las notas (CU-30). El .gpx original queda en
-- un bucket privado de Storage (archivo_ruta) como prueba de lo recorrido.
CREATE TABLE IF NOT EXISTS tracks_gpx (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operativo_id          uuid NOT NULL REFERENCES operativos(id),
    poligono_id           uuid REFERENCES poligonos(id),
    agente_operativo_id   uuid NOT NULL REFERENCES agentes_operativo(id),
    grupo_id              uuid REFERENCES grupos(id),
    cargado_por           uuid NOT NULL REFERENCES usuarios(id),
    cargado_en            timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archivo_nombre        varchar(255) NOT NULL,
    archivo_ruta          varchar(500),
    geom                  geometry(LineStringZ, 4326) NOT NULL,
    con_elevacion         boolean NOT NULL DEFAULT false,
    inicio                timestamptz,
    fin                   timestamptz,
    distancia_m           double precision NOT NULL,
    desnivel_positivo_m   double precision,
    desnivel_negativo_m   double precision,
    deteccion_pct         numeric(5,2),
    notas                 text,
    eliminado_en          timestamptz,
    eliminado_por         uuid REFERENCES usuarios(id),
    CONSTRAINT track_horas_chk     CHECK (fin IS NULL OR inicio IS NULL OR fin >= inicio),
    CONSTRAINT track_deteccion_chk CHECK (deteccion_pct IS NULL OR deteccion_pct BETWEEN 0 AND 100)
);
-- El mismo recorrido de la misma persona no se carga dos veces (CU-29, 3.3).
CREATE UNIQUE INDEX IF NOT EXISTS track_unico_vigente
    ON tracks_gpx (agente_operativo_id, inicio, fin)
    WHERE eliminado_en IS NULL AND inicio IS NOT NULL AND fin IS NOT NULL;
CREATE INDEX IF NOT EXISTS tracks_gpx_operativo_idx ON tracks_gpx (operativo_id);
CREATE INDEX IF NOT EXISTS tracks_gpx_poligono_idx ON tracks_gpx (poligono_id) WHERE eliminado_en IS NULL;
CREATE INDEX IF NOT EXISTS tracks_gpx_geom_idx ON tracks_gpx USING gist (geom);

-- ── Marcadores: puntos de interés, hallazgos e instalaciones SCI (CU-32, CU-33)
CREATE TABLE IF NOT EXISTS marcadores (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operativo_id       uuid NOT NULL REFERENCES operativos(id),
    clase              varchar(12) NOT NULL,
    tipo_instalacion   varchar(30),
    nombre             varchar(120) NOT NULL,
    descripcion        varchar(300),
    detalle            text,
    responsable        varchar(120),
    notas              text,
    geom               geometry(Point, 4326) NOT NULL,
    creado_por         uuid REFERENCES usuarios(id),
    creado_en          timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en     timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en       timestamptz,
    eliminado_por      uuid REFERENCES usuarios(id),
    CONSTRAINT marcador_clase_chk CHECK (clase IN ('POI', 'HALLAZGO', 'INSTALACION')),
    CONSTRAINT marcador_tipo_chk  CHECK (
        (clase = 'INSTALACION') = (tipo_instalacion IS NOT NULL)
        AND (tipo_instalacion IS NULL OR tipo_instalacion IN
            ('PUESTO_COMANDO', 'BASE', 'CAMPAMENTO', 'HELIPUNTO', 'AREA_ESPERA', 'AREA_CONCENTRACION_VICTIMAS'))),
    CONSTRAINT marcador_nombre_chk CHECK (length(btrim(nombre)) >= 1),
    -- Un hallazgo es evidencia: nunca se da de baja (CU-36).
    CONSTRAINT hallazgo_no_se_elimina CHECK (clase <> 'HALLAZGO' OR eliminado_en IS NULL)
);
CREATE INDEX IF NOT EXISTS marcadores_operativo_idx ON marcadores (operativo_id);
CREATE INDEX IF NOT EXISTS marcadores_geom_idx ON marcadores USING gist (geom);

-- Un hallazgo no pasa a ser otra clase de marcador (CU-33, 3.2): sería una
-- forma de quitarle el valor de evidencia y después poder eliminarlo.
CREATE OR REPLACE FUNCTION marcador_hallazgo_fijo() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.clase = 'HALLAZGO' AND NEW.clase <> 'HALLAZGO' THEN
        RAISE EXCEPTION 'Un hallazgo no puede pasar a ser otra clase de marcador'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS marcador_hallazgo_fijo ON marcadores;
CREATE TRIGGER marcador_hallazgo_fijo BEFORE UPDATE OF clase ON marcadores
    FOR EACH ROW EXECUTE FUNCTION marcador_hallazgo_fijo();

-- Fotos de pista de un marcador (igual que fotos_objetivo: Storage privado).
CREATE TABLE IF NOT EXISTS marcador_fotos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    marcador_id     uuid NOT NULL REFERENCES marcadores(id),
    url_foto        varchar(500) NOT NULL,
    subido_por      uuid REFERENCES usuarios(id),
    creado_en       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en    timestamptz
);
CREATE INDEX IF NOT EXISTS marcador_fotos_marcador_idx ON marcador_fotos (marcador_id);

-- ── Radios desde el Punto Cero (CU-34) ──────────────────────────────────────
-- Son del operativo: siempre centrados en operativos.punto_cero, lo siguen.
CREATE TABLE IF NOT EXISTS radios_operativo (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operativo_id    uuid NOT NULL REFERENCES operativos(id),
    radio_m         integer NOT NULL,
    color           varchar(7) NOT NULL,
    creado_por      uuid REFERENCES usuarios(id),
    creado_en       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en    timestamptz,
    eliminado_por   uuid REFERENCES usuarios(id),
    CONSTRAINT radio_valor_chk CHECK (radio_m BETWEEN 50 AND 100000),
    CONSTRAINT radio_color_chk CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS radio_unico_vigente
    ON radios_operativo (operativo_id, radio_m) WHERE eliminado_en IS NULL;

-- ── Historial del Punto Cero (CU-34, CU-08, CU-09) ──────────────────────────
-- operativos.punto_cero sigue siendo el punto vigente; acá queda cada movimiento.
-- El motivo es obligatorio con el operativo en curso: lo exige la API (al
-- crear el operativo no hay motivo, es la definición inicial).
CREATE TABLE IF NOT EXISTS punto_cero_historial (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operativo_id     uuid NOT NULL REFERENCES operativos(id),
    desde            geometry(Point, 4326),
    hasta            geometry(Point, 4326) NOT NULL,
    distancia_m      double precision,
    motivo           text,
    registrado_por   uuid REFERENCES usuarios(id),
    registrado_en    timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS punto_cero_historial_operativo_idx
    ON punto_cero_historial (operativo_id, registrado_en);

-- ── Historial de cada polígono (CU-37, Informe CU-39) ───────────────────────
-- Sólo se agregan filas: es la línea de tiempo de lo que pasó en el polígono.
CREATE TABLE IF NOT EXISTS poligono_eventos (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    poligono_id      uuid NOT NULL REFERENCES poligonos(id),
    operativo_id     uuid NOT NULL REFERENCES operativos(id),
    tipo             varchar(30) NOT NULL,
    grupo_id         uuid REFERENCES grupos(id),
    track_id         uuid REFERENCES tracks_gpx(id),
    detalle          jsonb,
    registrado_por   uuid REFERENCES usuarios(id),
    registrado_en    timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT poligono_evento_tipo_chk CHECK (tipo IN (
        'CREADO', 'NOMBRE', 'GEOMETRIA', 'NOTAS', 'ELIMINADO',
        'GRUPO_ASIGNADO', 'GRUPO_CAMBIADO', 'GRUPO_QUITADO', 'GRUPO_REPLEGADO', 'GRUPO_SALIO',
        'TRACK_CARGADO', 'TRACK_REASIGNADO', 'TRACK_ELIMINADO'))
);
CREATE INDEX IF NOT EXISTS poligono_eventos_poligono_idx ON poligono_eventos (poligono_id, registrado_en);

-- ── RLS deny-all (la API entra con su propio usuario; nadie más) ────────────
ALTER TABLE poligonos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE poligono_grupos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks_gpx            ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcadores            ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcador_fotos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE radios_operativo      ENABLE ROW LEVEL SECURITY;
ALTER TABLE punto_cero_historial  ENABLE ROW LEVEL SECURITY;
ALTER TABLE poligono_eventos      ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE poligonos IS 'Polígonos de rastrillaje del operativo (CU-27). Sin estado: lo describe su cobertura (CU-38).';
COMMENT ON TABLE poligono_grupos IS 'Períodos de cada grupo en un polígono (CU-28). Un grupo en un solo polígono a la vez.';
COMMENT ON TABLE tracks_gpx IS 'Recorridos GPX (CU-29). Recorrido, horas y elevación no se editan; sólo polígono y notas (CU-30).';
COMMENT ON TABLE marcadores IS 'Puntos de interés, hallazgos e instalaciones SCI (CU-32/33). Un hallazgo no se elimina.';
COMMENT ON TABLE radios_operativo IS 'Radios desde el Punto Cero (CU-34): del operativo, centrados en operativos.punto_cero.';
COMMENT ON TABLE punto_cero_historial IS 'Cada movimiento del Punto Cero, con motivo (CU-34). Dato forense para el Informe.';
COMMENT ON TABLE poligono_eventos IS 'Historial de cada polígono (CU-37). Sólo se agregan filas.';
