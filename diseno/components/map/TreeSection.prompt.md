Collapsible tree section + row for the map side panel, modelled on the Google Earth "Capas" tree the client already uses.
```jsx
<TreeSection title="Sectores y polígonos" icon="pentagon" badge="4 sect." checked onCheck={setVis} defaultOpen>
  <TreeRow checked onCheck={...} swatch={<span style={{width:12,height:12,background:'#2563EB'}}/>} label="Sector 2 — Quebrada" meta="62%" onClick={select} />
</TreeSection>
```
`TreeRow strong` = uppercase sub-header; `radio` for exclusive options (mapa base).
