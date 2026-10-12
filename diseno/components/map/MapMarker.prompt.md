Pin / chip / mini swatch for map points and SCI installations. Colours from PuntoDetailPanel MARKER_CFG; all SCI installations are blue (#2563eb) squares with their SCI letter (PC shows a flag).
```jsx
<MapMarker tipo="puntoCero" label="Punto 0" />
<MapMarker tipo="helipunto" label="Helipunto" />
<MapMarker tipo="poi" variant="chip" />
<MapMarker tipo="base" variant="mini" />
```
For Leaflet, render into a div and pass it as `L.divIcon({ html: el })`. `TIPOS_SCI` lists the installation types in order.
