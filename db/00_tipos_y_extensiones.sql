-- ============================================================================
--  00 · TIPOS Y EXTENSIONES · Sistema DUAR
-- ----------------------------------------------------------------------------
--  ORDEN DE EJECUCIÓN: este script va PRIMERO, antes de bd.sql.
--
--  Motivo: el export del ERD de pgAdmin 4 (bd.sql) declara columnas con tipos
--  ENUM y con geometry(Point,4326), pero NO incluye ni los CREATE TYPE ni el
--  CREATE EXTENSION. Sin este archivo, bd.sql falla en la primera tabla.
--
--  Los valores son los definidos por el equipo (catálogo oficial de estados).
--  Todos en MAYÚSCULAS por convención del proyecto.
-- ============================================================================

-- PostGIS: requerido por operativos.punto_cero geometry(Point,4326) — "Punto Cero" (LSP)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ----------------------------------------------------------------------------
--  ENUMs. Se usan bloques DO para que el script sea idempotente:
--  CREATE TYPE no admite IF NOT EXISTS en PostgreSQL.
-- ----------------------------------------------------------------------------

-- Estado administrativo GLOBAL del usuario (Decisión A · borrado lógico puro)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_usuario') THEN
    CREATE TYPE estado_usuario AS ENUM (
      'ACTIVO',
      'INACTIVO',
      'ELIMINADO'
    );
  END IF;
END $$;

-- Ciclo de vida del operativo (CU-08 a CU-11)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_operativo') THEN
    CREATE TYPE estado_operativo AS ENUM (
      'NUEVO',
      'ACTIVO',
      'INACTIVO',
      'EN_PLANIFICACION',
      'EN_PROCESO',
      'FINALIZADO',
      'ELIMINADO'
    );
  END IF;
END $$;

-- Estado TÁCTICO del agente dentro de un operativo (CU-18 · Decisión A)
--   DESPLEGADO y RASTRILLANDO son automáticos; DESCANSANDO y REPLEGADO manuales.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_agente') THEN
    CREATE TYPE estado_agente AS ENUM (
      'DISPONIBLE',
      'EN_ESPERA',
      'DESPLEGADO',
      'RASTRILLANDO',
      'DESCANSANDO',
      'REPLEGADO',
      'NO_DISPONIBLE'
    );
  END IF;
END $$;

-- Ciclo de vida del grupo de rastrillaje (CU-21 a CU-26)
--   EN_PAUSA se activa automáticamente si el grupo queda con 1 integrante (CU-26, Binomio Mínimo).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_grupo') THEN
    CREATE TYPE estado_grupo AS ENUM (
      'EN_FORMACION',
      'EN_APRESTO',
      'DESPLEGADO',
      'RASTRILLANDO',
      'EN_PAUSA',
      'REPLEGADO',
      'DISUELTO'
    );
  END IF;
END $$;

-- Género (usuarios y objetivo_buscado — ficha fisonómica, CU-12)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'genero') THEN
    CREATE TYPE genero AS ENUM (
      'MASCULINO',
      'FEMENINO',
      'OTRO'
    );
  END IF;
END $$;

-- Grupo sanguíneo del personal (dato médico crítico en operativos de alto riesgo)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_sangre') THEN
    CREATE TYPE tipo_sangre AS ENUM (
      'A+', 'A-',
      'B+', 'B-',
      'AB+', 'AB-',
      'O+', 'O-',
      'DESCONOCIDO'
    );
  END IF;
END $$;
