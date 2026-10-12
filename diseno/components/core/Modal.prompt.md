Centered dialog over a dark scrim — header with title/subtitle + X, scroll body, footer with Cancelar + primary.
```jsx
<Modal title="Nuevo polígono" subtitle="Sector de rastrillaje" icon="pentagon" onClose={close}
  footer={<><Button variant="outline" size="md">Cancelar</Button><Button size="md">Guardar</Button></>}>…</Modal>
```
