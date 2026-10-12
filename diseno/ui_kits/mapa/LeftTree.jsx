/* Panel izquierdo "Gestión del mapa": buscador + árbol de secciones al estilo Google Earth. */
const NST = window.DUARDiseOMapa_7e942c;

const swPol = (c, dashed) => <span style={{ width: 12, height: 12, borderRadius: 3, background: c + '40', border: '1.5px ' + (dashed ? 'dashed ' : 'solid ') + c, flexShrink: 0, boxSizing: 'border-box' }}></span>;
const swLine = c => <span style={{ width: 14, height: 3, borderRadius: 2, background: c, flexShrink: 0 }}></span>;

const chkR = { accentColor: 'var(--primary)', margin: 0, width: 14, height: 14, flexShrink: 0, cursor: 'pointer' };
const kmTxt = km => String(km).replace('.', ',');
function RadioRow({ r, onChange, onDelete }) {
  const { Icon } = NST;
  const [v, setV] = React.useState(kmTxt(r.km));
  React.useEffect(() => setV(kmTxt(r.km)), [r.km]);
  const pal = window.MapaData.paletaRadios;
  const commit = () => { const n = parseFloat(v.replace(',', '.')); if (n > 0 && n <= 50) onChange({ km: Math.round(n * 100) / 100 }); else setV(kmTxt(r.km)); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 'var(--radius-sm)', opacity: r.visible ? 1 : 0.55 }}>
      <input type="checkbox" checked={r.visible} onChange={() => onChange({ visible: !r.visible })} style={chkR} />
      <button type="button" title="Cambiar color" onClick={() => onChange({ color: pal[(pal.indexOf(r.color) + 1) % pal.length] })} style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid ' + r.color, background: r.color + '2e', padding: 0, cursor: 'pointer', flexShrink: 0, boxSizing: 'border-box' }}></button>
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: 'var(--foreground)' }}>Radio</span>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--input-background)' }}>
        <input value={v} inputMode="decimal" onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} style={{ width: 36, border: 'none', outline: 'none', background: 'transparent', textAlign: 'right', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 12.5, fontWeight: 600, padding: 0 }} />
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>km</span>
      </label>
      <button type="button" title="Quitar radio" onClick={onDelete} style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><Icon name="x" size={13} /></button>
    </div>
  );
}

function LeftTree(p) {
  const { TreeSection, TreeRow, MapMarker, Icon, ESTADOS } = NST;
  const { radios, p0 } = p;
  const { q, setQ, open, setOpen, pols, trazas, puntos, inst, grupos, overlays, setOv, base, setBase, tool, onTool, sel, popup } = p;
  const m = s => !q || s.toLowerCase().includes(q.toLowerCase());
  const G = id => grupos.find(g => g.id === id);
  const on = (t, id) => (sel && sel.type === t && sel.id === id) || (popup && popup.type === t && popup.id === id);
  const fPols = pols.filter(x => m(x.nombre)), fTr = trazas.filter(x => m(x.etiqueta + ' ' + (x.agente || ''))), fInst = inst.filter(x => m(x.nombre));
  const fPoi = puntos.filter(x => x.tipo === 'poi' && m(x.nombre)), fHal = puntos.filter(x => x.tipo === 'hallazgo' && m(x.nombre));
  const showP0 = m('Punto Cero LSP');
  const [cerrados, setCerrados] = React.useState({});
  const trPorGrupo = [...pols.map(pl => ({ id: pl.id, nombre: pl.nombre, color: (G(pl.grupoId) || {}).color || '#94a3b8', items: fTr.filter(t => t.poligonoId === pl.id) })), { id: '_sin', nombre: 'Sin sector', color: '#94a3b8', items: fTr.filter(t => !t.poligonoId || !pols.some(pl => pl.id === t.poligonoId)) }].filter(b => b.items.length);
  const isOpen = (k, n) => (q ? n > 0 : open[k]);
  const tog = k => v => setOpen(o => ({ ...o, [k]: v }));
  // Un hijo sólo aparece tildado si su grupo (y la sección) están visibles
  const sub = (grupo, it) => overlays.marcadores && overlays[grupo] && it.visible !== false;
  const child = (grupo, kind, it) => {
    if (!overlays.marcadores || !overlays[grupo]) { setOv('marcadores', true); setOv(grupo, true); if (it.visible === false) p.onToggleItem(kind, it.id); }
    else p.onToggleItem(kind, it.id);
  };
  const nMarc = puntos.length + inst.length + 1;
  const vacio = txt => <p style={{ margin: '4px 8px', fontSize: 11.5, color: 'var(--muted-foreground)' }}>{txt}</p>;

  return (
    <div style={{ width: 320, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--card)', borderRight: '1px solid var(--border)', fontFamily: 'var(--font-family-primary)', position: 'relative', zIndex: 2 }}>
      <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="layers" size={15} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.3 }}>Gestión del mapa</p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)' }}>{pols.length} sectores · {trazas.length} tracks · {nMarc} marcadores</p>
          </div>
          <button type="button" onClick={p.onClose} title="Ocultar panel" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><Icon name="chevron-left" size={17} /></button>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--input-background)' }}>
          <Icon name="search" size={14} color="var(--muted-foreground)" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar sectores, tracks, marcadores…" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 12.5 }} />
          {q && <button type="button" onClick={() => setQ('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><Icon name="x" size={13} /></button>}
        </label>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {!q && <TreeSection title="Radios desde Punto Cero" icon="circle-dot" badge={radios.filter(r => r.visible).length + '/' + radios.length} open={open.radios} onToggle={tog('radios')} checked={overlays.radios} onCheck={v => setOv('radios', v)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 8px 6px' }}>
            <MapMarker tipo="puntoCero" variant="mini" />
            <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Centro {window.Geo.fmtCoord(p0.lat, p0.lng)}</span>
          </div>
          {radios.slice().sort((a, b) => a.km - b.km).map(r => <RadioRow key={r.id} r={r} onChange={patch => p.onRadio(r.id, patch)} onDelete={() => p.onDelRadio(r.id)} />)}
          {!radios.length && vacio('Sin radios. Agregá uno para guiarte desde el Punto Cero.')}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, rowGap: 6, flexWrap: 'wrap', padding: '8px 8px 0' }}>
            <span style={{ flexBasis: '100%', fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>Agregar</span>
            {[0.5, 1, 2, 3, 5, 10].map(km => { const ya = radios.some(r => r.km === km); return <button key={km} type="button" disabled={ya} onClick={() => p.onAddRadio(km)} style={{ whiteSpace: 'nowrap', flexShrink: 0, padding: '2px 8px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'transparent', color: ya ? 'var(--muted-foreground)' : 'var(--foreground)', opacity: ya ? 0.45 : 1, cursor: ya ? 'default' : 'pointer', fontFamily: 'var(--font-family-primary)', fontSize: 11, fontWeight: 600 }}>{window.Geo.fmtRadio(km)}</button>; })}
            <button type="button" onClick={() => { const max = radios.reduce((m, r) => Math.max(m, r.km), 0); p.onAddRadio(max ? Math.round(max * 1.5 * 10) / 10 : 1); }} style={{ whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 999, border: '1.5px solid color-mix(in srgb, var(--primary) 35%, transparent)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'var(--font-family-primary)', fontSize: 11, fontWeight: 600 }}><Icon name="plus" size={11} />Otro</button>
          </div>
          <p style={{ margin: '8px 8px 0', fontSize: 10.5, color: 'var(--muted-foreground)', lineHeight: 1.45 }}>Se recentran solos cuando el coordinador actualiza el Punto Cero. Quedan debajo de los sectores.</p>
        </TreeSection>}

        <TreeSection title="Sectores y polígonos" icon="pentagon" badge={pols.length} open={isOpen('sectores', fPols.length)} onToggle={tog('sectores')} checked={overlays.poligonos} onCheck={v => setOv('poligonos', v)}>
          {fPols.map(x => {
            const gr = G(x.grupoId), c = gr ? gr.color : '#475569';
            return <TreeRow key={x.id} checked={x.visible} onCheck={() => p.onToggleItem('pols', x.id)} swatch={swPol(c, !x.grupoId)} label={x.nombre} selected={on('poligono', x.id)} onClick={() => p.onPol(x)}
              meta={x.cobertura ? Math.round(x.cobertura.pct) + '%' : null} />;
          })}
          {!fPols.length && vacio(q ? 'Sin coincidencias.' : 'Aún no hay sectores dibujados.')}
        </TreeSection>

        <TreeSection title="Marcadores tácticos / POI" icon="map-pin" badge={nMarc} open={isOpen('marcadores', fInst.length + fPoi.length + fHal.length + (showP0 ? 1 : 0))} onToggle={tog('marcadores')} checked={overlays.marcadores} onCheck={v => setOv('marcadores', v)}>
          {showP0 && <TreeRow checked={overlays.marcadores && overlays.puntoCero} onCheck={v => { if (v && !overlays.marcadores) setOv('marcadores', true); setOv('puntoCero', v); }} swatch={<MapMarker tipo="puntoCero" variant="mini" />} label="Punto Cero (LSP)" selected={on('puntoCero', 'p0')} onClick={p.onP0} />}
          {(!q || fInst.length > 0) && <TreeRow strong label="Instalaciones SCI" checked={overlays.marcadores && overlays.instalaciones} onCheck={v => { if (v && !overlays.marcadores) setOv('marcadores', true); setOv('instalaciones', v); }} meta={inst.length} />}
          {fInst.map(i => <TreeRow key={i.id} indent={1} checked={sub('instalaciones', i)} onCheck={() => child('instalaciones', 'inst', i)} swatch={<MapMarker tipo={i.tipo} variant="mini" />} label={i.nombre} selected={on('instalacion', i.id)} onClick={() => p.onInst(i)} />)}
          {(!q || fHal.length > 0) && <TreeRow strong label="Hallazgos" checked={overlays.marcadores && overlays.hallazgos} onCheck={v => { if (v && !overlays.marcadores) setOv('marcadores', true); setOv('hallazgos', v); }} meta={puntos.filter(x => x.tipo === 'hallazgo').length} />}
          {fHal.map(x => <TreeRow key={x.id} indent={1} checked={sub('hallazgos', x)} onCheck={() => child('hallazgos', 'puntos', x)} swatch={<MapMarker tipo="hallazgo" variant="mini" />} label={x.nombre} selected={on('punto', x.id)} onClick={() => p.onPunto(x)} />)}
          {(!q || fPoi.length > 0) && <TreeRow strong label="Puntos de interés" checked={overlays.marcadores && overlays.poi} onCheck={v => { if (v && !overlays.marcadores) setOv('marcadores', true); setOv('poi', v); }} meta={puntos.filter(x => x.tipo === 'poi').length} />}
          {fPoi.map(x => <TreeRow key={x.id} indent={1} checked={sub('poi', x)} onCheck={() => child('poi', 'puntos', x)} swatch={<MapMarker tipo="poi" variant="mini" />} label={x.nombre} selected={on('punto', x.id)} onClick={() => p.onPunto(x)} />)}
        </TreeSection>

        <TreeSection title="Trazabilidad y tracks GPX" icon="route" badge={trazas.length} open={isOpen('tracks', fTr.length)} onToggle={tog('tracks')} checked={overlays.trazas} onCheck={v => setOv('trazas', v)}>
          {trPorGrupo.map(b => { const abierto = q || !cerrados[b.id]; const vis = b.items.every(t => t.visible); return (
            <React.Fragment key={b.id}>
              <TreeRow checked={vis} onCheck={v => b.items.filter(t => !!t.visible !== v).forEach(t => p.onToggleItem('trazas', t.id))} onClick={() => setCerrados(c => ({ ...c, [b.id]: !c[b.id] }))}
                swatch={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="chevron-right" size={12} color="var(--muted-foreground)" style={{ transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} /><Icon name={b.id === '_sin' ? 'route' : 'pentagon'} size={13} color={b.color} /></span>}
                label={<span style={{ fontWeight: 600 }}>{b.nombre}</span>} />
              {abierto && b.items.map(t => <TreeRow key={t.id} indent={1} checked={t.visible} onCheck={() => p.onToggleItem('trazas', t.id)} swatch={swLine((G(t.grupoId) || {}).color || '#444140')} label={t.agente || 'Sin agente'} meta={(t.fecha ? t.fecha.split('-').reverse().join('/') : '—') + (t.horaInicio ? ' · ' + t.horaInicio + ' h' : '')} selected={on('traza', t.id)} onClick={() => p.onTraza(t)} />)}
            </React.Fragment>); })}
          {!fTr.length && vacio(q ? 'Sin coincidencias.' : 'Sin tracks cargados.')}
          {!q && <button type="button" onClick={() => onTool('gpx')} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 8px 0', padding: 0, background: 'none', border: 'none', color: 'var(--primary)', fontFamily: 'var(--font-family-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><Icon name="upload" size={13} />Cargar archivo GPX</button>}
        </TreeSection>

        {!q && <TreeSection title="Ajustes de mapa" icon="settings" open={open.capas} onToggle={tog('capas')}>
          <TreeRow strong label="Superposiciones" />
          <TreeRow indent={1} checked={overlays.etiquetas} onCheck={v => setOv('etiquetas', v)} swatch={<Icon name="tag" size={13} color="var(--muted-foreground)" />} label="Etiquetas de sectores" />
          <TreeRow indent={1} checked={overlays.brechas} onCheck={v => setOv('brechas', v)} swatch={<Icon name="scan" size={13} color="#dc2626" />} label="Análisis de brechas" meta={pols.filter(x => x.cobertura).length || null} />
          <TreeRow strong label="Ventanas del mapa" />
          <TreeRow indent={1} checked={overlays.herramientas !== false} onCheck={v => setOv('herramientas', v)} swatch={<Icon name="pencil-ruler" size={13} color="var(--muted-foreground)" />} label="Herramientas" />
          <TreeRow indent={1} checked={overlays.zoom !== false} onCheck={v => setOv('zoom', v)} swatch={<Icon name="zoom-in" size={13} color="var(--muted-foreground)" />} label="Zoom y vista" />
          <TreeRow indent={1} checked={overlays.leyenda} onCheck={v => setOv('leyenda', v)} swatch={<Icon name="list" size={13} color="var(--muted-foreground)" />} label="Simbología táctica" />
          <TreeRow indent={1} checked={overlays.coords} onCheck={v => setOv('coords', v)} swatch={<Icon name="locate-fixed" size={13} color="var(--muted-foreground)" />} label="Lat / Long / Elevación" />
          <TreeRow indent={1} checked={overlays.escala !== false} onCheck={v => setOv('escala', v)} swatch={<Icon name="ruler" size={13} color="var(--muted-foreground)" />} label="Escala gráfica" />
          <TreeRow indent={1} checked={overlays.gruposFlot} onCheck={v => setOv('gruposFlot', v)} swatch={<Icon name="users" size={13} color="var(--muted-foreground)" />} label="Grupos operativos" />
        </TreeSection>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a' }}></span>Servidor GIS en línea</span>
        <button type="button" onClick={p.onReset} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', fontFamily: 'var(--font-family-primary)', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>Restablecer vista</button>
      </div>
    </div>
  );
}

window.LeftTree = LeftTree;
