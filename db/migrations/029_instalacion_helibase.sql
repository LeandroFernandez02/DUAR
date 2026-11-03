-- ============================================================================
-- 029 · Instalación SCI «Helibase» (Módulo 5 · CU-34/35) — 27/10
-- ============================================================================
-- Pedido del usuario: agregar la helibase a las instalaciones del mapa. En el SCI
-- es distinta del helipunto: la helibase es la base de las aeronaves (estacionan,
-- cargan combustible, se mantienen); el helipunto, un lugar de aterrizaje.
-- Aditiva: el código viejo no la nombra. Idempotente.
-- ============================================================================

ALTER TABLE marcadores DROP CONSTRAINT IF EXISTS marcador_tipo_chk;
ALTER TABLE marcadores ADD CONSTRAINT marcador_tipo_chk CHECK (
    (clase = 'INSTALACION') = (tipo_instalacion IS NOT NULL)
    AND (tipo_instalacion IS NULL OR tipo_instalacion IN
        ('PUESTO_COMANDO', 'BASE', 'CAMPAMENTO', 'HELIBASE', 'HELIPUNTO', 'AREA_ESPERA', 'AREA_CONCENTRACION_VICTIMAS')));
