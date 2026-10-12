The operativo context header — every module inside an operativo sits below it.
```jsx
<OperativoHeader nombre="Búsqueda Cerro Champaquí" estado="activo" ubicacion="Cerro Champaquí, Córdoba" fechaInicio="28/2/2026" dia={3}
  aCargo="Miguel Giménez" clima={{temperatura:14,descripcion:'Parcialmente nublado'}} />
```
- `aCargo` empty → amber "Sin coordinador a cargo" chip (radio-tower icon).
- The chevron at the start of the actions toggles compact mode (icons only, slightly larger icons). The product remembers it per browser (`localStorage['duar-encabezado-compacto']`).
