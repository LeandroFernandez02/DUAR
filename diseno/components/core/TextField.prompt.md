Labelled input / textarea. Forms use a 12px semibold label with "*" for required; side panels use the uppercase overline label.
```jsx
<TextField label="Nombre" required value={v} onChange={setV} />
<TextField overline label="Detalle / Notas de pista" multiline rows={6} />
```
