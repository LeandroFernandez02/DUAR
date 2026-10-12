White floating card of 36px icon tools; active tool is solid red. Use `{sep:true}` between groups.
```jsx
<MapToolbar active="poligono" onSelect={setTool} tools={[{id:'sel',icon:'mouse-pointer-2',label:'Seleccionar'},{sep:true},{id:'poligono',icon:'pentagon',label:'Dibujar polígono'}]} />
```
