# DUAR Design System

Sistema de diseño del **Software de Búsqueda y Rastreo** del D.U.A.R. (Departamento de Unidades de Alto Riesgo, Dirección de Bomberos de la Policía de la Provincia de Córdoba). La aplicación centraliza los operativos de búsqueda de personas u objetos: operativos, objetivo buscado, agentes y grupos de rastrillaje, mapa operacional, clima e informe final. Reemplaza el trabajo en papel + WhatsApp + Wikiloc + Google Earth.

El foco de este proyecto es el **Módulo 5 — Mapa Operacional** (CU-26 a CU-38), que en el código está como "Esta sección todavía no está disponible". El resto del sistema ya tiene diseño establecido y acá se documenta para que el mapa lo respete.

## Paletas en evaluación (octubre 2026)
El equipo está reemplazando el rojo primario porque comunica peligro/alerta. Las paletas viven en `tokens/palettes.css` como `:root[data-paleta="…"]` (y su variante `.dark`) y sólo redefinen tokens semánticos (`--primary`, `--accent`, `--background`, `--sidebar`, `--marker-punto-cero`…). Los colores de estado (verde/amarillo/rojo/azul/gris) no cambian, y los errores usan `--destructive`, nunca `--primary`.
- **Original** — sin atributo: naranja `#E0662B` (reemplazó al rojo `#E54B4B`), salmón `#FFA987`, crema `#F7EBE8`, gris oscuro `#444140`.

- **Paleta 2 · Táctico** — `data-paleta="tactico"`, colores del DESIGN.md "SAR Tactical Command" con la tipografía del sistema (Inter). Clara por defecto: fondo `#efe8da`, tarjetas `#fbf8f1`, sidebar y texto carbón `#2a2f2a`; primario ámbar `#c07a4a` con texto oscuro; verde `#4c5a46` secundario; caqui `#8a7c53` acento y bordes. Esquinas de 4px y contornos de 1px. En `.dark` vuelve la versión oscura (`#232723` / `#2a2f2a` / `#343b34`).
- **Paleta 3 · Marino** — `data-paleta="marino"`, según la referencia visual "Sistema de Búsqueda y Rastreo": marino `#023047` (sidebar, texto), naranja `#FB8500` (primario: CTA, ítem activo, filtros activos, Punto Cero), petróleo `#1f7a8c` (acento), celeste `#8ECAE6` (secundario), fondo neutro `#F8FAFC` con grilla de puntos (`--fondo-patron`). Misma tipografía y estructura.

Tokens que una paleta puede redefinir además del color: `--font-display`, `--font-data`, `--font-label`, `--button-font-family/-transform/-tracking`, `--chip-font-family/-transform/-tracking`, radios (`--radius-*`), elevaciones, `--card-border` y `--tinte-oscuro` (0% = badges pastel para fondos claros; 100% = tinte translúcido + borde para fondos oscuros).

`ui_kits/paleta.js` elige la paleta (`?paleta=` › `window.DUAR_PALETA` › última elegida) y la sincroniza con el mapa embebido. Para sumar una paleta: un bloque en `palettes.css`, una entrada en `DUAR_PALETAS` y un `ui_kits/sistema/paleta-<id>.html`.

## Logo
`assets/logo-escudo.png` (escudo con radar y casco, recortado del arte original con fondo transparente) + texto "Sistema Integral de / Búsqueda y Rescate" en Inter. En componentes se usa con la clase `.duar-logo-escudo` (tokens/base.css). Sólo sobre fondos oscuros.

## Fuentes
- Código local: `Sistema DUAR/` (React 18 + Vite + Tailwind 4 + shadcn/ui + lucide-react + react-leaflet; backend Node/Express + PostgreSQL). Archivos clave: `src/styles/theme.css`, `components/layout/Sidebar.tsx`, `pages/operativo/OperativoHeader.tsx`, `components/shared/StatusBadge.tsx`, `components/map/PuntoDetailPanel.tsx`, `components/shared/MapPickerModal.tsx`, `pages/operativo/GruposDnD.tsx`, `server/src/models/grupo.model.js` (paleta de grupos).
- GitHub: https://github.com/LeandroFernandez02/DUAR — explorá el repo para profundizar en pantallas y reglas de negocio.
- Google Drive: "Lista de Casos de Uso" (lista maestra de 42 CU), "Plantilla trazo Casos de Uso.xlsx" (trazos detallados), "Tesis final.docx" (relevamiento, SCI, requerimientos RF-19 a RF-22).
- `src/imports/figma-prompt-maestro.md`: brief original de UI (paleta estricta, Inter, "Modern SaaS", rojo/amarillo/verde sólo para estados, modo oscuro).

## Productos
1. **App web de coordinación** (Admin / Coordinador, desktop-tablet; se usa en notebooks de 1366×768 y proyectada en TV en el Puesto de Comando). Contexto global (Panel, Operativos, Usuarios) y contexto de operativo (Panel, Agentes, Mapa + encabezado con Objetivo, QR, Informe, día y clima).
2. **Portal del agente** (mobile-first, se entra por QR). No cubierto en este kit.

## Módulo 5 — casos de uso cubiertos por el UI kit
CU-26 Ver mapa · CU-27 Dibujar polígono · CU-28 Asignar polígono a grupo · CU-29 Cargar traza GPX · CU-30 Modificar etiqueta/datos de traza · CU-31 Visualizar capas (político / físico / satelital + elementos) · CU-32 Marcar POI · CU-33 Modificar POI · CU-34 Definir/actualizar Punto Cero (LSP) · Instalaciones SCI (Puesto de Comando, Base, Campamento, Helipunto, Área de Espera, ACV) marcables y reubicables · Radios concéntricos desde el Punto Cero (múltiples, editables, se recentran al mover el Punto Cero; dibujados debajo de los polígonos) · CU-35 Modificar geometría · CU-36 Eliminar elemento · CU-37 Cambiar estado de polígono · CU-38 Calcular cobertura por GPX (análisis de brechas).

## CONTENT FUNDAMENTALS
- **Idioma:** todo en español rioplatense, incluido código y base de datos. Voseo en instrucciones: "Hacé clic en el mapa…", "Arrastrá imágenes aquí", "Ingresá información detallada…", "Sumá personal desde la pestaña Agentes".
- **Tono:** operativo, claro, sin adornos. Mensajes que dicen qué pasó y qué sigue: "Aún no hay agentes asignados a este operativo", "Sin conexión con el servidor: el tablero puede estar desactualizado.", "Código de acceso vencido. Solicite el QR actualizado".
- **Casing:** Title Case en nombres de módulos y estados ("Punto de Interés", "En Planificación", "Puesto de Comando", "QR Agentes"); oraciones normales en ayudas. Rótulos de panel en MAYÚSCULAS pequeñas ("DESCRIPCIÓN", "FOTOS DE PISTA").
- **Vocabulario del dominio:** operativo, objetivo buscado, Punto 0 / Punto Cero / LSP, Puesto de Comando, polígono / sector de rastrillaje, rastrillar, traza GPX, grupo (Alfa, Bravo, Charlie… alfabeto fonético), líder, caminante, dotación, desplegado, replegado.
- **Datos:** fechas es-AR (`28/2/2026`), coordenadas con 5 decimales y `°`, "Día 3 del operativo", km con coma decimal.
- **Separadores:** punto medio `·` para metadatos ("Grupo Bravo · 1,8 km²"); flecha en links ("Ver detalles →", "Acceder al Panel →").
- **Emoji:** no. Sólo aparece un emoji de clima en un mock (`climaMock.icono`); el kit usa el ícono `cloud` en su lugar.

## VISUAL FOUNDATIONS
- **Paleta estricta de 4 hex:** rojo `#E0662B` (primario, activo, foco), salmón `#FFA987` (acento, avatares no-DUAR), crema `#F7EBE8` (fondo), charcoal `#444140` (texto, sidebar). **Rojo/amarillo/verde sólo para estados** (StatusBadge, cobertura, estados de agente).
- **Colores de grupo:** paleta fija de 10 (`--grupo-1…10`); el grupo tiñe su tarjeta, su polígono y sus trazas en el mapa. Polígono sin grupo = gris pizarra `#475569` con borde punteado.
- **Tipografía:** Inter única. h1 24/700, h2 20/600, h3 16/600, base 14, label 12/600, meta 11–12 muted, micro 10. Coordenadas en monospace 11px.
- **Fondos:** crema plano, sin imágenes, texturas ni gradientes. Cards blancas encima. Sidebar charcoal sólido.
- **Cards:** blancas, radio 14, sombra suave `0 4px 24px rgba(68,65,64,.10)`, sin borde. Vacíos con borde punteado 1px. Tarjeta de grupo: fondo muted + sombra más marcada.
- **Bordes:** 1px `rgba(68,65,64,.15)`; botones y pills 1.5px.
- **Radios:** 8 botones/inputs, 10 genérico, 14 cards/modales, 999 pills/badges.
- **Sombras:** sólo exteriores, teñidas de charcoal; md `0 8px 32px /.14` para popovers y paneles; modal `0 24px 64px rgba(0,0,0,.35)`.
- **Transparencia:** tintes del rojo al 7–18% para estados seleccionados ("soft"); scrim negro 50–65% en modales; hints sobre el mapa en cápsula `rgba(0,0,0,.55)` con `blur(4px)`.
- **Hover:** primario → opacity .88; muted → fondo = color de borde; nav del sidebar → `--sidebar-accent` y opacity 1; eliminar → texto rojo. **Press:** sin shrink. **Disabled:** muted + opacity .55.
- **Animación:** mínima. `transition: all .15–.2s`, spin en íconos de carga, fade del "Ver detalles →". Sin rebotes.
- **Layout:** sidebar fijo 260px (colapsable a 80), encabezado de operativo siempre visible, contenido con padding 24. En el mapa: panel lateral 320px, panel de detalle superpuesto 340px a la derecha (patrón de `PuntoDetailPanel`), herramientas flotantes en cards blancas.
- **Imágenes:** sólo fotos de pistas cargadas por el usuario; mosaicos de mapa (OSM / OpenTopoMap / Esri) como única imagen "full-bleed".
- **Modo oscuro:** clase `.dark` (fondo `#1c1917`, cards `#2a2725`, sidebar `#111010`).

## ICONOGRAPHY
- **Lucide** (lucide-react 0.487) en todo el producto, trazo 2, tamaños 11–13 en metadatos/botones, 15–18 en navegación, 26–32 en estados vacíos. El kit carga el UMD `https://unpkg.com/lucide@0.487.0/dist/umd/lucide.min.js` y usa el componente `Icon`.
- Íconos del mapa: `crosshair` Punto Cero, `flag` Puesto de Comando, `map-pin` POI, `triangle-alert` Hallazgo, `pentagon` polígono, `route` traza, `layers` capas, `scan` cobertura.
- Sin icon font propia, sin PNG/SVG de marca. Sin emoji. Caracteres unicode sólo `·`, `→`, `●`.
- **Sin logo:** el código no incluye logotipo. La marca es el ícono Shield blanco sobre cuadrado rojo + "DUAR" en Inter 700 con tracking. No se dibujó un logo.

## Components
Core: `Icon`, `Button`, `StatusBadge`, `FilterPill`, `FiltroDesplegable`, `TextField`, `SelectField`, `Card`, `Modal`.
Layout: `Sidebar`, `OperativoHeader`.
Agentes: `AvatarAgente`, `EstadoAgenteBadge`.
Mapa: `MapMarker` (puntos + instalaciones SCI), `MapToolbar`, `TreeSection` / `TreeRow`, `MapPopup`, `ElevationProfile`, `MapLegend`, `LayerPanel`, `ElementRow`, `CoverageBar`.

### Intentional additions
- `Icon` — wrapper del UMD de Lucide (el producto usa lucide-react).
- `MapToolbar`, `TreeSection`, `MapPopup`, `ElevationProfile`, `MapLegend`, `LayerPanel`, `ElementRow`, `CoverageBar` — piezas nuevas del Módulo 5, que no existe en el código. Siguen los patrones de `PuntoDetailPanel`, `MapPickerModal` y `GruposDnD`, con la organización tipo Google Earth que pidió el equipo (árbol de capas, globos de información, simbología).
- `SelectField` — el producto usa `<select>` nativo con el estilo de input.

## Índice
- `styles.css` → `tokens/{fonts,colors,typography,spacing,base}.css`
- `components/core`, `components/layout`, `components/map` (+ una card por carpeta)
- `guidelines/` — cards de fundamentos (colores, tipo, espaciado, marca)
- `ui_kits/sistema/` — sistema completo: Operativos, Usuarios, operativo (Agentes/Grupos con arrastrar y soltar, Mapa embebido). `index.html` con selector de paleta en Tweaks; `paleta-<id>.html` fija una paleta
- `ui_kits/paleta.js` — selección y sincronización de paleta
- `ui_kits/mapa/` — Módulo 5 interactivo, organización tipo Google Earth (`index.html`; `?embed=1` lo muestra sin sidebar ni encabezado)
- `ui_kits/mapa-v1/` — primera propuesta archivada (panel con pestañas)
- `SKILL.md`, `thumbnail.html`, `github.md`
