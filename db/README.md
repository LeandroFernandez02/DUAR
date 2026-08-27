# Base de Datos — Sistema DUAR

## Orden de ejecución

Los scripts deben correrse **en este orden**. `bd.sql` es el export del ERD de
pgAdmin 4 y no es autosuficiente: declara columnas con tipos ENUM y con
`geometry(Point,4326)` pero no crea ni los tipos ni la extensión PostGIS.

| # | Archivo | Qué hace |
|---|---------|----------|
| 1 | `00_tipos_y_extensiones.sql` | Extensión PostGIS + los 6 tipos ENUM |
| 2 | `bd.sql` *(en el Escritorio)* | Las 14 tablas, FKs e índices base |
| 3 | `migrations/002_correctivo_modulo4.sql` | Correctivo del Módulo 4 |

```bash
psql -d duar -f db/00_tipos_y_extensiones.sql
psql -d duar -f "../bd.sql"
psql -d duar -f db/migrations/002_correctivo_modulo4.sql
```

## Catálogo de tipos ENUM

| Tipo | Valores |
|------|---------|
| `estado_usuario` | ACTIVO · INACTIVO · ELIMINADO |
| `estado_operativo` | NUEVO · ACTIVO · INACTIVO · EN_PLANIFICACION · EN_PROCESO · FINALIZADO · ELIMINADO |
| `estado_agente` | DISPONIBLE · EN_ESPERA · DESPLEGADO · RASTRILLANDO · DESCANSANDO · REPLEGADO · NO_DISPONIBLE |
| `estado_grupo` | EN_FORMACION · EN_APRESTO · DESPLEGADO · RASTRILLANDO · EN_PAUSA · REPLEGADO · DISUELTO |
| `genero` | MASCULINO · FEMENINO · OTRO |
| `tipo_sangre` | A+ · A- · B+ · B- · AB+ · AB- · O+ · O- · DESCONOCIDO |

## Pendientes conocidos

- **`usuarios.conductor`**: campo pedido en las notas del docx. Se posterga hasta
  definir la regla "el grupo pasa a RASTRILLANDO ⇒ el conductor pasa a EN_ESPERA".
- **Doble especialidad**: coexisten `usuarios.especialidad_id` (global) y
  `agentes_operativo.especialidad_id` (táctico). Falta fijar la regla de
  resolución en la capa de API (`COALESCE(tactica, global)`).
- **Disolución de grupo**: `grupos` tiene a la vez `estado = DISUELTO` y
  `eliminado_en`. Definir cuál es la fuente de verdad al cerrar CU-25.
- **Sincronía historial ↔ `grupo_id`**: hoy la coherencia entre
  `agentes_operativo.grupo_id` y el periodo abierto en `agentes_grupo_historial`
  depende de la capa de aplicación. Se puede blindar con un trigger.
