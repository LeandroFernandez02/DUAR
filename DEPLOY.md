# Deploy — Sistema DUAR

Todo el sistema vive en **dos** servicios:

| Pieza | Dónde | Qué es |
|---|---|---|
| Frontend (React + Vite) | Vercel | Sitio estático servido desde `dist/` |
| Backend (Express) | Vercel | Una función serverless en `api/index.js` |
| Base de datos | Supabase `sa-east-1` (São Paulo) | PostgreSQL 17 + PostGIS |

## Cómo está armado

El backend **no** se reescribió para serverless. La app Express vive en
`server/src/app.js` sin arrancarse, y se usa de dos formas:

- **Local:** `server/src/index.js` le hace `listen(3001)`.
- **Vercel:** `api/index.js` la exporta; la plataforma la invoca por request.

`vercel.json` reescribe todo `/api/*` hacia esa **única** función. Es a
propósito: un archivo por ruta serían funciones separadas, cada una con su
arranque en frío y su propio pool de conexiones.

Las dependencias del backend (`express`, `pg`, `bcryptjs`, `cors`, `dotenv`)
están en el `package.json` **raíz**, no sólo en `server/`, porque Vercel instala
desde la raíz.

## Región de la función (importante)

`vercel.json` fija `"regions": ["gru1"]` — São Paulo. **No es un detalle
cosmético:** por defecto las funciones del plan Hobby corren en `iad1`
(Washington). Con la base en São Paulo, eso pondría el backend a ~120 ms de su
propia base y tiraría abajo toda la mejora de latencia que se hizo.

Con la función en `gru1`, backend y base quedan en el mismo datacenter: las
consultas cuestan milisegundos y el único viaje largo es el del usuario hasta
Vercel, una sola vez por request.

## Variables de entorno en Vercel

Cargar en *Project Settings → Environment Variables*:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Connection string del **Transaction pooler** (puerto **6543**) |
| `SESION_HORAS` | `12` |

⚠️ **En Vercel usar el Transaction pooler (6543), no el Session pooler (5432).**
Una función serverless se invoca y muere; el pooler de transacción devuelve la
conexión apenas termina cada transacción. Con el de sesión se agota el límite de
conexiones de PostgreSQL. `withTransaction` (BEGIN/COMMIT sobre un cliente
dedicado) funciona igual en modo transacción.

En desarrollo local se usa el **Session pooler (5432)**, que es lo que conviene
para un proceso de vida larga. Eso está en `server/.env` (gitignoreado).

`db.js` detecta el entorno por `process.env.VERCEL` y achica el pool a 2
conexiones por instancia cuando corre en serverless.

## Rendimiento — decisiones ya tomadas y medidas

Estos números salieron de mediciones reales, no de estimaciones:

| Cambio | Antes | Después |
|---|---|---|
| Región de la base (Oregón → São Paulo) | 227 ms por consulta | **42 ms** |
| Consultas por request autenticada | 3 | **2** |
| `/api/usuarios` end-to-end | 708 ms | **~52 ms** |
| Bundle inicial del frontend | 360 kB gzip | **108 kB gzip** |

- **Región:** el primer proyecto quedó en `us-west-2` sin pensarlo. Son 10.000 km
  desde Córdoba: 227 ms por consulta, sólo de viaje. No hay optimización de SQL
  que arregle eso.
- **Consultas:** el middleware de sesión validaba el token y después pedía el
  usuario en una segunda consulta. Ahora es una sola (`sesion.model.js` reusa
  `CAMPOS`/`JOINS` de `usuario.model.js`).
- **Bundle:** `routes.tsx` carga las rutas pesadas con `lazy`. Leaflet (Mapa,
  Clima) y Recharts (dashboards) ya no viajan en la carga inicial; alguien que
  sólo se loguea no los descarga.
- **Conexiones:** el pool las mantiene vivas 5 minutos con `keepAlive`, porque
  abrir una contra la nube cuesta TCP + TLS + auth. Medido: la primera request
  que estrenaba conexiones tardaba 2,7 s contra 0,24 s de las siguientes.

## Seguridad

La base está blindada contra la API REST pública de Supabase: `REVOKE` a
`anon`/`authenticated` + RLS activada en las 16 tablas **sin políticas**
(deny-all). Ver `db/README.md`.

**Toda tabla nueva necesita RLS habilitada.** Sin eso queda expuesta a internet
con la clave `anon`, que es pública por diseño.
