# Base de Datos — Sistema DUAR

## Dónde vive la base

Desde el **29/08/2026** la base de referencia es **Supabase** (PostgreSQL 17.6,
proyecto `DUAR-sa`, ref `gnzrrsalzhkspnejaymz`, región **sa-east-1 / São Paulo**).

Hubo un proyecto anterior en `us-west-2` (Oregón): medido, cada consulta tardaba
~227 ms sólo de ida y vuelta (10.000 km de distancia). Se migró a São Paulo
(~42 ms) apenas se detectó, porque la base todavía estaba casi vacía. El
proyecto de Oregón se da de baja una vez confirmado que todo funciona acá.

**Importante — usar el host del POOLER, no el directo:**
el host directo (`db.<ref>.supabase.co`) es **sólo IPv6**, y algunos ISP
argentinos no lo rutean bien hacia `sa-east-1` (conecta el DNS, pero el TCP
nunca responde — "connection timeout"). El pooler
(`aws-0-sa-east-1.pooler.supabase.com`, usuario `postgres.<project-ref>`) usa
IPv4 y una red distinta (Supavisor de Supabase) y sí funciona. Medido:
`/api/usuarios` pasó de 708 ms (Oregón) a **99 ms** (São Paulo vía pooler).

El motivo es de despliegue, no de diseño: Vercel corre en la nube y no puede
alcanzar un PostgreSQL que vive en `localhost` de una PC. Se necesitaba una base
accesible por red.

> **Supabase acá es sólo PostgreSQL alojado.** El sistema NO usa `supabase-js`,
> ni PostgREST, ni Supabase Auth. Todo el acceso pasa por el backend Express
> (`server/`), que se conecta con `pg` igual que contra la base local. Esto es
> deliberado: las reglas de negocio (autobloqueo, último administrador, Binomio
> Mínimo, sucesión de mando, Regla de Ubicuidad, auditoría forense) viven en los
> Controladores y no son expresables como políticas RLS.

La base local `duar-test` sigue sirviendo para desarrollo offline. El backend
elige una u otra según haya o no `DATABASE_URL` (ver `server/.env.example`).

## Cómo se reconstruye desde cero

El esquema consolidado está registrado como migraciones **en el propio proyecto
Supabase** (`supabase_migrations.schema_migrations`):

| # | Migración | Qué hace |
|---|-----------|----------|
| 1 | `habilitar_postgis` | Extensión PostGIS en el esquema `extensions` |
| 2 | `duar_baseline_tipos_y_tablas` | 6 tipos ENUM + las 16 tablas |
| 3 | `duar_baseline_constraints_indices_fks` | PKs, UNIQUEs, índices y 23 FKs |
| 4 | `cerrar_api_publica_postgrest` | Blindaje: REVOKE + RLS deny-all |

Ese baseline consolida el histórico previo (`00_tipos_y_extensiones.sql`,
`bd.sql` y las migraciones `002`→`006` de `migrations/`), que se conservan como
registro de la evolución del modelo.

### PostGIS: diferencia con la instalación local

En la PC, PostGIS quedó instalado en el esquema `public`, así que la columna era
`public.geometry(Point,4326)`. Supabase instala las extensiones en `extensions`.
Por eso en el baseline la columna es `extensions.geometry(Point,4326)` y el
índice GIST se crea con `search_path = public, extensions`.

## Blindaje de la API REST (importante)

Supabase publica el esquema `public` por PostgREST usando la clave `anon`, que
es **pública por diseño** (viaja en el frontend). Al portar el esquema, todas las
tablas quedaron legibles por `anon` — incluidas `usuarios.password_hash`,
`sesiones_activas.token_hash` y `logs_auditoria`.

Se cerró con doble candado:

1. `REVOKE` de todos los permisos a `anon` y `authenticated` (+ `ALTER DEFAULT
   PRIVILEGES`, para que las tablas futuras también nazcan cerradas).
2. `ENABLE ROW LEVEL SECURITY` en las 16 tablas **sin ninguna política**, que en
   PostgreSQL significa denegar todo.

El backend no se ve afectado: se conecta como `postgres`, dueño de las tablas, y
los dueños saltean RLS mientras no se use `FORCE ROW LEVEL SECURITY`.

**Regla:** si mañana se agrega una tabla, hay que habilitarle RLS. Sin eso, queda
expuesta a internet.

## Catálogo de tipos ENUM

| Tipo | Valores |
|------|---------|
| `estado_usuario` | ACTIVO · INACTIVO · ELIMINADO |
| `estado_operativo` | NUEVO · ACTIVO · INACTIVO · EN_PLANIFICACION · EN_PROCESO · FINALIZADO · ELIMINADO |
| `estado_agente` | DISPONIBLE · EN_ESPERA · DESPLEGADO · RASTRILLANDO · DESCANSANDO · REPLEGADO · NO_DISPONIBLE |
| `estado_grupo` | EN_FORMACION · EN_APRESTO · DESPLEGADO · RASTRILLANDO · EN_PAUSA · REPLEGADO · DISUELTO |
| `genero` | MASCULINO · FEMENINO · OTRO |
| `tipo_sangre` | A+ · A- · B+ · B- · AB+ · AB- · O+ · O- · DESCONOCIDO |

## Índices que sostienen reglas de negocio

No son optimizaciones: si se caen, se cae la regla.

- **`agente_unico_activo_idx`** — UNIQUE parcial sobre
  `agentes_operativo(usuario_id) WHERE fecha_egreso IS NULL`. Es la **Regla de
  Ubicuidad** (Decisión B): un efectivo no puede estar activo en dos operativos
  a la vez. Parcial para permitir el reingreso tras una baja (CU-20).
- **`agente_un_solo_grupo_activo_idx`** — UNIQUE parcial sobre
  `agentes_grupo_historial(agente_operativo_id) WHERE fecha_fin IS NULL`: no se
  pueden tener dos períodos de grupo abiertos al mismo tiempo.

## Pendientes conocidos

- **Doble especialidad**: coexisten `usuarios.especialidad_id` (global) y
  `agentes_operativo.especialidad_id` (táctico). Falta fijar la regla de
  resolución en la capa de API (`COALESCE(tactica, global)`).
- **Disolución de grupo**: `grupos` tiene a la vez `estado = DISUELTO` y
  `eliminado_en`. Definir cuál es la fuente de verdad al cerrar CU-25.
- **Sincronía historial ↔ `grupo_id`**: hoy la coherencia entre
  `agentes_operativo.grupo_id` y el periodo abierto en `agentes_grupo_historial`
  depende de la capa de aplicación. Se puede blindar con un trigger.
- **DNI/email de usuarios ELIMINADOS**: el CU-07 dice que se puede reutilizar el
  DNI/email de un usuario dado de baja, pero las constraints `usuarios_dni_key` y
  `usuarios_email_key` son UNIQUE plenas y lo impiden. Se resolvería con índices
  UNIQUE parciales `WHERE eliminado_en IS NULL`.
