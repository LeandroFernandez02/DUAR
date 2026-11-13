# CALÍVAR · Sistema DUAR

Sistema de gestión de operativos de búsqueda y rastrillaje (tesis). Publicado en
https://tesis-duar.vercel.app (front y API en Vercel, base PostgreSQL en Supabase).

## Carpetas

| Carpeta | Qué tiene |
|---|---|
| `src/` | Front: React + Vite (`src/app/pages` pantallas, `src/app/components` piezas, `src/app/services/api.ts` cliente de la API). |
| `server/` | API: Node/Express en MVC (`src/routes`, `src/controllers`, `src/models`), pruebas en `tests/`, fuentes del informe PDF en `assets/`. |
| `api/` | Punto de entrada de la API como función de Vercel. |
| `db/` | Esquema base y migraciones numeradas (`db/migrations`); se aplican a mano, en orden. |
| `public/` | Íconos y logos de CALÍVAR (la app es instalable en el celular). |
| `diseno/` | Prototipo del Mapa (Módulo 5) hecho en Claude Design: referencia visual, no es código de la app. |

## Comandos

```bash
npm install && npm --prefix server install
npm run dev                 # front en http://localhost:5173
npm --prefix server run dev # API en http://localhost:3001 (necesita server/.env, ver server/.env.example)
npm --prefix server test    # pruebas de la API (con la API levantada)
```

El despliegue está explicado en [DEPLOY.md](DEPLOY.md) y la base en [db/README.md](db/README.md).
