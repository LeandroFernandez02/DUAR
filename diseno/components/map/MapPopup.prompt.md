Popup/balloon body for a clicked map element: kicker + title + meta, body, footer actions. Polygons open the right-side detail panel instead.
```jsx
<MapPopup icon="route" color="#2563EB" kicker="Traza GPX" title="Bravo — Mañana" subtitle="Grupo Bravo · 02/03/2026" onClose={close}
  actions={<Button variant="muted" icon="pencil">Editar datos</Button>}>
  <ElevationProfile values={elev} distances={dist} color="#2563EB" />
</MapPopup>
```
