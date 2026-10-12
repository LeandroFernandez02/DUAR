# Diseño del Módulo 5 (Mapa Operacional)

Prototipo del mapa hecho en Claude Design (proyecto "Colores sistema DUAR"),
descargado el 12/10/2026. **No es código de la aplicación**: es la referencia
visual y de comportamiento contra la que se va a programar el Módulo 5.

- Pantalla principal: `ui_kits/mapa/index.html` (componentes en `ui_kits/mapa/*.jsx`,
  datos de ejemplo en `ui_kits/mapa/data.js`).
- Componentes del mapa: `components/map/`; base visual: `components/core/`, `tokens/`.
- Los datos son inventados (sectores, grupos, tracks) y la elevación sale de una
  fórmula de prueba.

Las reglas de negocio NO salen de este prototipo sino de los CU del Módulo 5
(documento "Casos de Uso — Módulo 5: Mapa Operacional"). Donde el prototipo y los
CU no coinciden, mandan los CU: por ejemplo, los sectores no tienen estado, un
sector admite un grupo de rastrillaje más grupos especiales, y eliminar es una
baja con registro.

Para verlo: el preview "Diseño del mapa" de `.claude/launch.json` (sirve esta
carpeta en http://localhost:4321) y abrir `/ui_kits/mapa/index.html`. Abierto como
archivo suelto queda en blanco, porque necesita cargar sus scripts por HTTP.

`HANDOFF.md` y `readme.md` son los textos originales de la exportación.
