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

Después del baseline, cada cambio queda como archivo en `migrations/` y se
aplica al proyecto Supabase con el mismo nombre:

| Archivo | Qué hace |
|---------|----------|
| `007_objetivo_buscado_tipo_objeto.sql` | Objetivo Buscado: persona u objeto (CU-12..14) |
| `008_estados_agente_sin_en_espera.sql` | Primer ajuste de `estado_agente` (20/09), superado por la `010` |
| `009_grupos_modulo4.sql` | Nombre de grupo único por operativo y color del grupo (Módulo 4) |
| `010_estados_rediseno.sql` | Modelo de estados del 24/09: los dos ENUM, sus CHECK y la tabla `eventos_estado` |
| `011_eventos_orden_en_transaccion.sql` | `eventos_estado.registrado_en` con `clock_timestamp()` para ordenar eventos de una misma transacción |
| `012_grupos_rastrillaje_y_especiales.sql` | Clase del grupo (`clase_grupo`), Canes pasa a recurso especial y se agregan Caballería y Buzos |
| `013_sin_caminante.sql` | ⚠️ **Pendiente: aplicar al subir a producción.** Borra `agentes_operativo.es_caminante` (la versión publicada todavía la usa) |
| `014_especialidad_policia.sql` | Especialidad **Policía** en el catálogo, de rastrillaje |
| `015_indices_tablero.sql` | Índices en `agentes_operativo.grupo_id` y `grupos.lider_id` (se leen en cada refresco del tablero) |
| `016_presencia_mando.sql` | Puesto de comando: `presencias_mando` (coordinadores presentes) y `mando_operativo` (quién está a cargo) |

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
| `estado_agente` | DISPONIBLE · AGRUPADO · DESPLEGADO · RASTRILLANDO · REPLEGADO · EN_ESPERA · NO_DISPONIBLE |
| `estado_grupo` | EN_FORMACION · CONFIRMADO · ASIGNADO · DESPLEGADO · RASTRILLANDO · REPLEGADO · EN_ESPERA · DISUELTO |
| `clase_grupo` | RASTRILLAJE · ESPECIAL |
| `genero` | MASCULINO · FEMENINO · OTRO |
| `tipo_sangre` | A+ · A- · B+ · B- · AB+ · AB- · O+ · O- · DESCONOCIDO |

### Estados de agente y de grupo (modelo del 24/09, migración `010`)

El grupo recorre su ciclo y sus integrantes lo siguen. Qué significa cada uno:

| Grupo | Significa | Sus integrantes quedan |
|-------|-----------|------------------------|
| EN_FORMACION | Se está armando; la composición se puede cambiar | AGRUPADO |
| CONFIRMADO | Composición cerrada (de rastrillaje: Líder del DUAR y al menos 2 que rastrillen) | AGRUPADO |
| ASIGNADO | Tiene zona; listo para salir. Hasta el CU-28 la zona es una descripción | AGRUPADO |
| DESPLEGADO | En el terreno sin rastrillar: yendo, o en apoyo | DESPLEGADO |
| RASTRILLANDO | Rastrillando el polígono | RASTRILLANDO; el conductor queda DESPLEGADO (espera con la camioneta) |
| REPLEGADO | Volviendo | REPLEGADO |
| EN_ESPERA | Volvió al puesto de comando; sigue siendo un grupo | EN_ESPERA |
| DISUELTO | Terminó (sólo desde la base, sólo el coordinador) | DISPONIBLE, sin grupo |

Reglas que la base y el backend garantizan:

- **Un agente en un grupo nunca contradice al grupo** (tabla de arriba). Nadie
  está NO_DISPONIBLE dentro de un grupo. Sin grupo sólo existen DISPONIBLE,
  NO_DISPONIBLE y REPLEGADO (el retirado por CU-26 que vuelve a la base).
- **Hechos vs. reportes**: AGRUPADO, CONFIRMADO, ASIGNADO y DISUELTO los escribe
  sólo su acción. Los estados del terreno los informa el Líder desde su celular
  o el coordinador por radio, y el coordinador puede corregirlos con motivo.
- El agente elige su estado (DISPONIBLE / NO_DISPONIBLE) sólo cuando no tiene grupo.
- La baja de un agente no es un estado: es `agentes_operativo.fecha_egreso`.

Historia: el 20/09 (`008`) se había quitado un EN_ESPERA de agente que era
redundante con DISPONIBLE; el 24/09 (`010`) EN_ESPERA volvió con otro
significado (volvió a la base y sigue en su grupo) y se quitaron DESCANSANDO,
EN_APRESTO y EN_PAUSA. `00_tipos_y_extensiones.sql` conserva los valores del
baseline histórico: en una instalación desde cero, las migraciones los corrigen.

### Grupos de rastrillaje y grupos especiales (migración `012`)

Un grupo es gente que sale, trabaja y vuelve junta, y un polígono puede recibir
varios grupos. Los recursos que trabajan a otro ritmo o en otro sector no van
mezclados en la cuadrilla que camina: van en su propio grupo. `grupos.clase` se
elige al crear y no cambia.

| | RASTRILLAJE | ESPECIAL |
|---|---|---|
| Integrantes | Agentes (bombero, bombero voluntario, defensa civil, policía…) y conductores | Recursos especiales, con agentes de apoyo y conductores |
| Líder | Del DUAR, no recurso especial y no conductor (camina con su grupo) | Cualquiera |
| Para confirmar | Al menos 2 que rastrillen (el conductor no cuenta) | Sin requisitos |
| Alerta de binomio en el terreno | Sí | No |
| Asignación automática (CU-22) | La arma, sólo con agentes (sin conductores) | No los toca |

**Sin "caminante" (29/09).** Rastrilla todo integrante que no es conductor. El
**conductor** (`agentes_operativo.es_conductor`) espera al grupo con la camioneta,
no cuenta para el binomio y entra a cualquier grupo, aunque su especialidad sea de
recurso especial: en el operativo, su papel es manejar.

**Recurso especial** = `cat_especialidades.es_recurso_critico` de la especialidad
**táctica** del agente (`agentes_operativo.especialidad_id`, editable en CU-17):
Dron, Paramedico, Canes, Caballería y Buzos. Que un grupo de rastrillaje no
tenga recursos especiales adentro lo garantiza `grupo.model.js` con las filas
bloqueadas (es otra tabla: no es un CHECK).

### Línea de tiempo: `eventos_estado`

Responde "qué pasó en el terreno y cuándo", que `logs_auditoria` no puede
responder (esa tabla dice quién tocó la base). Cada fila es un evento de un
grupo o de un agente:

- `ocurrido_en` (cuándo pasó: la hora del celular del Líder o la que cargó el
  coordinador) y `registrado_en` (cuándo llegó al servidor). Sin señal pueden
  estar horas separadas.
- `fuente`: PORTAL_LIDER, PORTAL_AGENTE, COORDINADOR, RADIO, CASCADA, SISTEMA, QR.
- `resultado`: APLICADO, CONFIRMACION (el mismo hecho llegó por otra vía, p. ej.
  radio y celular), SUPERADO (llegó tarde y el grupo ya estaba en otro estado:
  queda en la historia sin mover nada) o RECHAZADO.
- `evento_origen_id`: el evento del grupo que causó el cambio de cada agente.
- `cliente_evento_id` UNIQUE: el id que genera el celular, para que un reenvío
  sin señal no se registre dos veces.

Tiene RLS habilitada sin políticas, como el resto de las tablas.

## Índices y restricciones que sostienen reglas de negocio

No son optimizaciones: si se caen, se cae la regla.

- **`agente_unico_activo_idx`** — UNIQUE parcial sobre
  `agentes_operativo(usuario_id) WHERE fecha_egreso IS NULL`. Es la **Regla de
  Ubicuidad** (Decisión B): un efectivo no puede estar activo en dos operativos
  a la vez. Parcial para permitir el reingreso tras una baja (CU-20).
- **`agente_un_solo_grupo_activo_idx`** — UNIQUE parcial sobre
  `agentes_grupo_historial(agente_operativo_id) WHERE fecha_fin IS NULL`: no se
  pueden tener dos períodos de grupo abiertos al mismo tiempo.
- **`agente_estado_segun_grupo_chk`** — CHECK en `agentes_operativo`: con grupo,
  el estado es uno de los que puede tener un integrante; sin grupo, DISPONIBLE,
  NO_DISPONIBLE o REPLEGADO. Hace imposible "Disponible con grupo" o "Agrupado
  sin grupo" (la correspondencia exacta con el estado del grupo la mantiene el
  backend, porque está en otra tabla).
- **`grupo_disuelto_con_baja_chk`** — CHECK en `grupos`: `estado = DISUELTO` si
  y sólo si `eliminado_en` tiene fecha (CU-25 paso 5).

## Pendientes conocidos

- **Doble especialidad**: coexisten `usuarios.especialidad_id` (global) y
  `agentes_operativo.especialidad_id` (táctico). Falta fijar la regla de
  resolución en la capa de API (`COALESCE(tactica, global)`).
- **Sincronía historial ↔ `grupo_id`**: hoy la coherencia entre
  `agentes_operativo.grupo_id` y el periodo abierto en `agentes_grupo_historial`
  depende de la capa de aplicación. Se puede blindar con un trigger.
- **DNI/email de usuarios ELIMINADOS**: el CU-07 dice que se puede reutilizar el
  DNI/email de un usuario dado de baja, pero las constraints `usuarios_dni_key` y
  `usuarios_email_key` son UNIQUE plenas y lo impiden. Se resolvería con índices
  UNIQUE parciales `WHERE eliminado_en IS NULL`.

### Presencia de mando: el puesto de comando (migración `016`)

Qué coordinadores están presentes en el puesto de comando de cada operativo y
quién está a cargo. El coordinador **no es un agente**: no va en
`agentes_operativo`, no tiene estados tácticos ni aparece en el tablero.

| Tabla | Qué guarda | Garantía en la base |
|---|---|---|
| `presencias_mando` | Cada período en que un coordinador estuvo presente: ingreso, retiro, quién registró cada uno y el motivo del retiro | Un coordinador presente en un solo operativo a la vez (índice único parcial) |
| `mando_operativo` | Quién estuvo a cargo, de cuándo a cuándo (traspasos incluidos) | Uno solo a cargo por operativo (índice único parcial) |

Reglas (las valida `server/src/models/mando.model.js` con el operativo bloqueado):
el primero que llega queda a cargo; el mando lo pasa quien está a cargo o un
administrador; si se retira el que está a cargo y quedan otros, elige sucesor;
cualquier gestor registra el ingreso o el retiro de otro (con motivo); un
coordinador que se registra como agente deja el puesto; finalizar el operativo
cierra todo. La presencia **no limita permisos**: sirve para la trazabilidad
(la línea de tiempo marca "a distancia" lo que registró un coordinador ausente)
y para el Informe.
