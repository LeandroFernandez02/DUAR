DUAR button — one primary (red) action per area; grey "muted" for secondary header actions; "outline" for Cancelar.
```jsx
<Button icon="target" variant="soft">Objetivo</Button>
<Button icon="qr-code" variant="muted">QR Agentes</Button>
<Button variant="outline" size="md">Cancelar</Button> <Button size="md" icon="check">Confirmar punto</Button>
```
Hover: primary/danger → opacity .88; soft → stronger tint; muted → border-colored bg. Disabled: grey, opacity .55.
