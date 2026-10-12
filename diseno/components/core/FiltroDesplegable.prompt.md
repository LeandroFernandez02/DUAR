Dropdown filter pill (multi-select) for list toolbars. Active = primary outline + tint and the selection summary in the label.
```jsx
<FiltroDesplegable titulo="Estado" seleccion={sel} onCambiar={setSel}
  atajos={[{ label: 'Vigentes', valores: ['nuevo','planificación','en_proceso','activo'] }]}
  opciones={[{ value: 'activo', label: 'Activo', dot: '#16a34a', count: 3 }]} />
```
