# UI kit — Módulo 5: Mapa operacional

Diseño nuevo (el módulo no existe todavía en el código), organizado como Google Earth —la herramienta que usa hoy el cliente— pero con la estética DUAR.

Estructura de pantalla:
- **Izquierda — "Gestión del mapa"**: buscador + árbol con secciones Sectores y polígonos · Herramientas y dibujo · Trazabilidad y tracks GPX · Marcadores tácticos / POI (Punto Cero, Instalaciones SCI, Hallazgos, POI) · Capas de mapa. Casillas de visibilidad por sección y por elemento.
- **Sobre el mapa**: barra de navegación (zoom, mapa base, medir, encuadrar, ir al Punto Cero, pantalla completa, imprimir); "Grupos operativos" arriba a la derecha; coordenadas + elevación + escala abajo a la izquierda; "Simbología táctica" abajo a la derecha.
- **Radios desde Punto Cero**: sección propia en el árbol. Múltiples radios (presets 500 m–10 km u "Otro"), km editable, color, visibilidad. Se dibujan en un pane debajo de los sectores y se recentran solos al actualizar el Punto Cero (vista previa punteada en el modal de confirmación).
- **Globos de información** al hacer clic en un track (perfil de elevación, distancia, duración, desnivel), un marcador, una instalación o el Punto Cero.
- **Derecha — detalle del sector** al hacer clic en un polígono: sólo muestra el grupo asignado (con Cambiar / Quitar), estado, cobertura GPX y tracks del sector.

Archivos: `data.js` (datos + geometría), `MapCanvas.jsx` (Leaflet), `LeftTree.jsx`, `MapChrome.jsx` (flotantes y globos), `Panels.jsx` (paneles de detalle + nueva instalación), `Modals.jsx`, `App.jsx`.

Flujos para probar: Herramientas → Dibujar polígono · Instalación SCI (clic en el mapa → tipo) · Reubicar una instalación desde su globo (arrastrar o clic) · Medir distancia · Cargar GPX (archivo propio o de ejemplo) · Calcular cobertura desde el panel del sector · Capas de mapa → Político / Físico / Satelital.
