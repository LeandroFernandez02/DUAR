Popover card for map layers — base map tiles as a 3-up segmented grid, overlays as checkboxes with counts.
```jsx
<LayerPanel base="politico" bases={[{id:'politico',label:'Político',icon:'map'},{id:'fisico',label:'Físico',icon:'mountain'},{id:'satelital',label:'Satelital',icon:'satellite'}]}
  overlays={[{id:'poligonos',label:'Polígonos',checked:true,count:4}]} />
```
