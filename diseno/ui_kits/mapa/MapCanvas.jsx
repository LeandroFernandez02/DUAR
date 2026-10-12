/* Lienzo Leaflet del mapa operacional. Redibuja las capas ante cada cambio (pocos elementos). */
const { useEffect: useEffectMC, useRef: useRefMC, useState: useStateMC } = React;

const cssC = (n, f) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
const PRI = () => cssC('--primary', '#E0662B'), FG = () => cssC('--foreground', '#444140');
function markerIcon(tipo, label, selected) {
  const { MapMarker, TIPOS_MARCADOR } = window.DUARDiseOMapa_7e942c;
  const c = TIPOS_MARCADOR[tipo] || {};
  const el = document.createElement('div');
  el.style.cssText = 'width:140px;display:flex;justify-content:center;';
  ReactDOM.createRoot(el).render(<MapMarker tipo={tipo} label={label} selected={selected} />);
  const h = tipo === 'puntoCero' ? 40 : c.sci ? 36 : 34;
  return L.divIcon({ html: el, className: 'duar-divicon', iconSize: [140, h + 24], iconAnchor: [70, h] });
}
const vertexIcon = color => L.divIcon({ className: 'duar-divicon', html: `<div style="width:12px;height:12px;border-radius:50%;background:#fff;border:2.5px solid ${color};box-shadow:0 1px 4px rgba(0,0,0,.35);box-sizing:border-box"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] });

function MapCanvas(props) {
  const elRef = useRefMC(null), mapRef = useRefMC(null), g = useRefMC({}), cb = useRefMC(props);
  const [escala, setEscala] = useStateMC({ px: 80, label: '' });
  const coordRef = useRefMC(null), elevRef = useRefMC(null), popRef = useRefMC(null), popEl = useRefMC(null);
  if (!popEl.current) popEl.current = document.createElement('div');
  cb.current = props;
  const D = window.MapaData, G = window.Geo;

  useEffectMC(() => {
    const map = L.map(elRef.current, { zoomControl: false, preferCanvas: true, doubleClickZoom: false }).setView(D.centro, 14);
    // Radios: debajo de los polígonos (overlayPane = 400) pero sobre el mapa base
    map.createPane('radios').style.zIndex = 350; map.getPane('radios').style.pointerEvents = 'none';
    map.createPane('radiosLbl').style.zIndex = 390; map.getPane('radiosLbl').style.pointerEvents = 'none';
    g.current.radR = L.svg({ pane: 'radios' });
    g.current.rad = L.layerGroup().addTo(map);
    ['gap', 'pol', 'tr', 'pts', 'meas', 'draft'].forEach(k => (g.current[k] = L.layerGroup().addTo(map)));
    g.current.rubber = L.polyline([], { color: PRI(), weight: 2, dashArray: '4 6', interactive: false }).addTo(map);
    map.on('click', e => cb.current.onMapClick([e.latlng.lat, e.latlng.lng]));
    map.on('dblclick', () => cb.current.onMapDblClick());
    const esForma = () => cb.current.tool === 'circulo' || cb.current.tool === 'cuadrado';
    map.on('mousedown', e => { if (!esForma() || e.originalEvent.button !== 0) return; g.current.forma = [e.latlng.lat, e.latlng.lng]; g.current.rubber.setStyle({ color: PRI(), dashArray: null }); });
    const soltar = e => {
      const c = g.current.forma; if (!c) return; g.current.forma = null; g.current.rubber.setStyle({ dashArray: '4 6' }); g.current.rubber.setLatLngs([]);
      if (e && e.latlng && cb.current.onShapeDrawn) cb.current.onShapeDrawn(cb.current.tool, c, [e.latlng.lat, e.latlng.lng]);
    };
    map.on('mouseup', soltar);
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && g.current.forma) { g.current.forma = null; g.current.rubber.setLatLngs([]); } });
    const upd = () => {
      const y = map.getSize().y / 2, mpp = map.distance(map.containerPointToLatLng([0, y]), map.containerPointToLatLng([100, y])) / 100;
      const pasos = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
      const d = pasos.filter(s => s / mpp <= 130).pop() || 1;
      setEscala({ px: Math.round(d / mpp), label: d >= 1000 ? (d / 1000) + ' km' : d + ' m' });
    };
    map.on('zoomend moveend', upd); upd();
    map.on('mousemove', e => {
      const ll = [e.latlng.lat, e.latlng.lng];
      if (coordRef.current && elevRef.current) { coordRef.current.textContent = 'Lat ' + ll[0].toFixed(5) + '°  Lon ' + ll[1].toFixed(5) + '°'; elevRef.current.textContent = 'Elev. ' + G.fmtM(G.elev(ll)); }
      const p = cb.current, d = p.tool === 'poligono' ? p.draft : p.tool === 'medir' ? p.measure : null;
      if (p.tool === 'circulo' || p.tool === 'cuadrado') { const c = g.current.forma; if (c) { const v = window.formaArrastre(p.tool, c, ll); g.current.rubber.setLatLngs(v.concat([v[0]])); } else g.current.rubber.setLatLngs([]); return; }
      if (d && d.length) { g.current.rubber.setStyle({ color: p.tool === 'medir' ? FG() : PRI() }); g.current.rubber.setLatLngs(p.tool === 'poligono' ? [d[d.length - 1], ll, d[0]] : [d[d.length - 1], ll]); }
      else g.current.rubber.setLatLngs([]);
    });
    popRef.current = L.popup({ closeButton: false, autoClose: false, closeOnClick: false, closeOnEscapeKey: false, autoPanPaddingTopLeft: L.point(80, 90), autoPanPaddingBottomRight: L.point(80, 70), maxWidth: 360, minWidth: 280, className: 'duar-popup' });
    mapRef.current = map;
    map.fitBounds(L.latLngBounds(D.poligonos.flatMap(p => p.vertices)).pad(0.12));
    props.onReady && props.onReady(map);
    return () => map.remove();
  }, []);

  useEffectMC(() => {
    const map = mapRef.current, b = D.bases.find(x => x.id === props.base) || D.bases[0];
    if (g.current.tiles) map.removeLayer(g.current.tiles);
    g.current.tiles = L.tileLayer(b.url, { attribution: b.attr, maxZoom: 18, subdomains: 'abc' }).addTo(map);
    g.current.tiles.bringToBack();
  }, [props.base]);

  useEffectMC(() => {
    const f = props.flyTo, map = mapRef.current; if (!f || !map) return;
    const w = map.getSize().x, opts = { maxZoom: 16, paddingTopLeft: [80, 80], paddingBottomRight: [f.panel ? Math.min(380, w * 0.45) : 80, 60] };
    const one = f.pts.length === 1, z = Math.max(map.getZoom(), 15);
    let done = false;
    const fin = () => { if (done) return; done = true; f.then && f.then(); };
    map.once('moveend', fin);
    setTimeout(() => { if (!done) { map.stop(); one ? map.setView(f.pts[0], z, { animate: false }) : map.fitBounds(L.latLngBounds(f.pts), { ...opts, animate: false }); fin(); } }, 1200);
    if (one) map.flyTo(f.pts[0], z, { duration: 0.6 }); else map.flyToBounds(L.latLngBounds(f.pts), { ...opts, duration: 0.6 });
  }, [props.flyTo]);

  useEffectMC(() => {
    const map = mapRef.current, pop = popRef.current, p = props.popup;
    if (p) {
      pop.options.offset = L.point(0, p.offset != null ? p.offset : -36);
      pop.setLatLng(p.latlng).setContent(popEl.current);
      if (!map.hasLayer(pop)) pop.openOn(map); else pop.update();
    } else if (map.hasLayer(pop)) map.closePopup(pop);
  }, [props.popup]);
  const { poligonos, trazas, puntos, instalaciones, grupos, sel, popup, overlays, tool, editVerts, moving, puntoCero } = props;
  useEffectMC(() => {
    const { pol, tr, pts, gap } = g.current; [pol, tr, pts, gap].forEach(l => l.clearLayers());
    const colorDe = id => (grupos.find(x => x.id === id) || {}).color;
    const inter = tool === 'select' && !editVerts && !moving;
    const isSel = (t, id) => (sel && sel.type === t && sel.id === id) || (popup && popup.type === t && popup.id === id);
    const ev = e => [e.latlng.lat, e.latlng.lng];

    if (overlays.brechas) poligonos.forEach(p => {
      if (!p.cobertura || !p.visible || !overlays.poligonos) return;
      const { gaps, dLat, dLng } = p.cobertura;
      gaps.forEach(([la, ln]) => L.rectangle([[la - dLat / 2, ln - dLng / 2], [la + dLat / 2, ln + dLng / 2]], { stroke: false, fillColor: '#dc2626', fillOpacity: 0.38, interactive: false }).addTo(gap));
    });

    if (overlays.poligonos) poligonos.forEach(p => {
      if (!p.visible || (editVerts && editVerts.id === p.id)) return;
      const c = colorDe(p.grupoId) || '#475569', s = isSel('poligono', p.id);
      const shape = L.polygon(p.vertices, { color: c, weight: s ? 3.5 : 2, fillColor: c, fillOpacity: s ? 0.26 : overlays.brechas && p.cobertura ? 0.06 : 0.14, dashArray: !p.grupoId ? '7 6' : null, interactive: inter, bubblingMouseEvents: false });
      if (overlays.etiquetas) shape.bindTooltip(`<span class="dot" style="background:${c}"></span>${p.nombre.split(' — ')[0]}${p.cobertura ? ' · ' + Math.round(p.cobertura.pct) + '%' : ''}`, { permanent: true, direction: 'center', className: 'duar-tip' });
      shape.on('click', e => cb.current.onSelect({ type: 'poligono', id: p.id }, ev(e)));
      shape.addTo(pol);
    });

    if (overlays.trazas) trazas.forEach(t => {
      if (!t.visible || t.puntos.length < 2) return;
      const c = colorDe(t.grupoId) || FG(), s = isSel('traza', t.id);
      L.polyline(t.puntos, { color: '#fff', weight: s ? 8 : 5, opacity: 0.85, interactive: false }).addTo(tr);
      const line = L.polyline(t.puntos, { color: c, weight: s ? 4.5 : 2.5, opacity: 0.95, interactive: inter, bubblingMouseEvents: false });
      line.on('click', e => cb.current.onSelect({ type: 'traza', id: t.id }, ev(e)));
      line.addTo(tr);
      L.circleMarker(t.puntos[0], { radius: 4, color: '#fff', weight: 2, fillColor: c, fillOpacity: 1, interactive: false }).addTo(tr);
      L.circleMarker(t.puntos[t.puntos.length - 1], { radius: 4, color: c, weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(tr);
    });

    if (overlays.marcadores) {
      puntos.forEach(p => {
        if (p.visible === false || (p.tipo === 'poi' && !overlays.poi) || (p.tipo === 'hallazgo' && !overlays.hallazgos)) return;
        const m = L.marker([p.lat, p.lng], { icon: markerIcon(p.tipo, null, isSel('punto', p.id)), interactive: inter, bubblingMouseEvents: false, zIndexOffset: isSel('punto', p.id) ? 500 : 0 });
        m.on('click', () => cb.current.onSelect({ type: 'punto', id: p.id }, [p.lat, p.lng])); m.addTo(pts);
      });
      if (overlays.instalaciones) instalaciones.forEach(i => {
        if (i.visible === false) return;
        const mv = moving && moving.id === i.id, pos = mv ? moving.ll : [i.lat, i.lng];
        const m = L.marker(pos, { icon: markerIcon(i.tipo, i.nombre, isSel('instalacion', i.id) || mv), draggable: mv, interactive: inter || mv, bubblingMouseEvents: false, zIndexOffset: mv ? 2000 : 200 });
        if (mv) m.on('dragend', e => cb.current.onMoveDrag([e.target.getLatLng().lat, e.target.getLatLng().lng]));
        else m.on('click', () => cb.current.onSelect({ type: 'instalacion', id: i.id }, pos));
        m.addTo(pts);
      });
      if (overlays.puntoCero) {
        const p0 = L.marker([puntoCero.lat, puntoCero.lng], { icon: markerIcon('puntoCero', 'Punto 0', isSel('puntoCero', 'p0')), interactive: inter, bubblingMouseEvents: false, zIndexOffset: 1000 });
        p0.on('click', () => cb.current.onSelect({ type: 'puntoCero', id: 'p0' }, [puntoCero.lat, puntoCero.lng])); p0.addTo(pts);
      }
    }
  }, [poligonos, trazas, puntos, instalaciones, grupos, sel, popup, overlays, tool, editVerts, moving, puntoCero, props.rev]);

  const { radios, radiosCentro, radiosPreview } = props;
  useEffectMC(() => {
    const r = g.current.rad; if (!r) return; r.clearLayers();
    if (!overlays.radios || !radios || !radiosCentro) return;
    const c = [radiosCentro.lat, radiosCentro.lng];
    radios.filter(x => x.visible).sort((a, b) => b.km - a.km).forEach(x => {
      const m = x.km * 1000;
      L.circle(c, { radius: m, renderer: g.current.radR, pane: 'radios', color: x.color, weight: 2, opacity: 0.9, fillColor: x.color, fillOpacity: radiosPreview ? 0.03 : 0.07, dashArray: radiosPreview ? '6 6' : null, interactive: false }).addTo(r);
      L.marker([c[0] + m / 110540, c[1]], { pane: 'radiosLbl', interactive: false, keyboard: false, icon: L.divIcon({ className: 'duar-divicon', html: '<div class="duar-ring-lbl" style="color:' + x.color + ';border-color:' + x.color + '">' + G.fmtRadio(x.km) + '</div>', iconSize: [70, 18], iconAnchor: [35, 9] }) }).addTo(r);
    });
  }, [radios, radiosCentro, radiosPreview, overlays.radios]);

  const { draft, measure } = props;
  useEffectMC(() => {
    const d = g.current.draft; d.clearLayers();
    if ((tool === 'poligono' || tool === 'circulo' || tool === 'cuadrado') && draft.length) {
      L.polyline(draft, { color: PRI(), weight: 2.5, interactive: false }).addTo(d);
      if (draft.length > 2) L.polygon(draft, { stroke: false, fillColor: PRI(), fillOpacity: 0.12, interactive: false }).addTo(d);
      draft.forEach((p, i) => L.marker(p, { icon: vertexIcon(i === 0 ? FG() : PRI()), interactive: i === 0 && draft.length > 2 }).on('click', () => cb.current.onMapDblClick()).addTo(d));
    }
    if (tool !== 'poligono' && tool !== 'medir' && tool !== 'circulo' && tool !== 'cuadrado') g.current.rubber.setLatLngs([]);
    const mp = mapRef.current; if (mp) { if (tool === 'circulo' || tool === 'cuadrado') mp.dragging.disable(); else mp.dragging.enable(); }
    if (editVerts) {
      const pol = poligonos.find(p => p.id === editVerts.id);
      const c = (grupos.find(x => x.id === (pol && pol.grupoId)) || {}).color || '#475569';
      const shape = L.polygon(editVerts.verts, { color: c, weight: 2.5, fillColor: c, fillOpacity: 0.2, dashArray: '4 4', interactive: false }).addTo(d);
      editVerts.verts.forEach((p, i) => {
        const m = L.marker(p, { icon: vertexIcon(c), draggable: true }).addTo(d);
        m.on('drag', e => { const v = editVerts.verts.slice(); v[i] = [e.latlng.lat, e.latlng.lng]; shape.setLatLngs(v); });
        m.on('dragend', e => cb.current.onVertexMove(i, [e.target.getLatLng().lat, e.target.getLatLng().lng]));
      });
    }
    const ms = g.current.meas; ms.clearLayers();
    if (tool === 'medir' && measure.length) {
      L.polyline(measure, { color: '#fff', weight: 6, opacity: 0.8, interactive: false }).addTo(ms);
      L.polyline(measure, { color: FG(), weight: 2.5, dashArray: '6 5', interactive: false }).addTo(ms);
      measure.forEach(p => L.circleMarker(p, { radius: 4.5, color: FG(), weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(ms));
      if (measure.length > 1) L.marker(measure[measure.length - 1], { opacity: 0, interactive: false }).bindTooltip(G.fmtDist(G.length(measure)), { permanent: true, direction: 'right', offset: [8, 0], className: 'duar-tip' }).addTo(ms);
    }
  }, [draft, measure, tool, editVerts, props.rev]);

  useEffectMC(() => { if (elRef.current) elRef.current.style.cursor = tool === 'select' && !moving ? '' : 'crosshair'; }, [tool, moving]);

  const sep = <span style={{ width: 1, height: 12, background: 'var(--border)' }}></span>;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={elRef} style={{ position: 'absolute', inset: 0, background: '#e8e4df' }}></div>
      <div style={{ position: 'absolute', left: 12, bottom: 26, zIndex: 500, display: 'flex', alignItems: 'flex-end', gap: 8, pointerEvents: 'none', height: 30 }}>
        {props.overlays.coords !== false && <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 10px', borderRadius: 'var(--radius-md)', background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-sm)', color: 'var(--foreground)', fontFamily: 'var(--font-family-mono)', fontSize: 11, whiteSpace: 'pre', height: 19 }}>
          <span ref={coordRef}>{'Lat ' + D.centro[0].toFixed(5) + '°  Lon ' + D.centro[1].toFixed(5) + '°'}</span>{sep}<span ref={elevRef}>{'Elev. ' + G.fmtM(G.elev(D.centro))}</span>
        </div>}
        {props.overlays.escala !== false && <div style={{ display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center', padding: '5px 10px', borderRadius: 'var(--radius-md)', background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-sm)', color: 'var(--foreground)', fontFamily: 'var(--font-family-mono)', fontSize: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: escala.px, lineHeight: 1 }}><span>0</span><span>{escala.label}</span></div>
          <div style={{ display: 'flex', width: escala.px, height: 5, border: '1px solid var(--foreground)', boxSizing: 'border-box' }}>{[0, 1, 2, 3].map(i => <span key={i} style={{ flex: 1, background: i % 2 ? 'transparent' : 'var(--foreground)' }}></span>)}</div>
        </div>}
      </div>
      {ReactDOM.createPortal(props.popupNode || null, popEl.current)}
    </div>
  );
}

window.MapCanvas = MapCanvas;
