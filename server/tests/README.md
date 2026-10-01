# Pruebas automatizadas

```bash
cd server
npm run dev            # en otra terminal: la API local tiene que estar levantada
npm test               # corre todo
npm run test:unidad    # sólo las reglas puras (no necesita la API ni la base)
npm run test:informe   # corre todo y escribe tests/INFORME-PRUEBAS.md (tabla para la tesis)
```

## Qué hay

| Carpeta | Qué prueba | Necesita |
|---|---|---|
| `unidad/` | Reglas puras de `src/models/estados.js`: estados, Regla 1, quién entra a qué clase de grupo, quién lidera, binomio | Nada |
| `api/` | Casos de uso de los Módulos 1, 2 y 4 contra la API real (CU-01, 04–07, 17, 21–26, portal del Líder, línea de tiempo) | API local + base |

Cada prueba empieza con el CU o la regla que verifica (`CU-21 · ...`): de ahí sale la columna "CU / regla" del informe.

## Aislamiento (no hay una base aparte)

Las pruebas de API corren sobre la base compartida, pero sólo sobre lo suyo:

- 8 usuarios `auto.<nombre>@prueba.duar` (7 agentes y 1 coordinador), que se crean solos la primera vez;
- el operativo **"PRUEBAS AUTOMÁTICAS - no tocar"**.

Cada archivo arranca con `preparar()` (`ayudantes/entorno.js`), que deja ese operativo en un punto de partida conocido usando la propia API. Antes de escribir nada verifica que en el operativo no haya nadie que no sea de las pruebas, y que ningún usuario de prueba esté en otro operativo: si algo no cierra, **se detiene sin tocar nada**.

Los archivos corren de a uno (`--test-concurrency=1`) porque comparten ese operativo.

## Credenciales

En `server/.env` (no se sube al repositorio). Ver `server/.env.example`:

- `TEST_API_URL`: por defecto `http://localhost:3001/api`.
- `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD`: un administrador, sólo para preparar el entorno.
- `TEST_USUARIOS_PASSWORD`: la clave de los usuarios de prueba.
