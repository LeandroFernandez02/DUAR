/* Módulo 5 — Mapa Operacional (CU-26 a CU-38). Organización tipo Google Earth: árbol a la izquierda, controles sobre el mapa, globos de información y detalle de sector a la derecha. */
const { useState, useEffect, useRef } = React;
const NS = window.DUARDiseOMapa_7e942c;
const D = window.MapaData;
const uid = p => p + Math.random().toString(36).slice(2, 7);
const hora = () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
window.formaDesde = (tipo, c, ll) => {
  const kx = 111320 * Math.cos(c[0] * Math.PI / 180), dy = (ll[0] - c[0]) * 111320, dx = (ll[1] - c[1]) * kx;
  const m = ([y, x]) => [c[0] + y / 111320, c[1] + x / kx];
  if (tipo === 'circulo') { const r = Math.hypot(dx, dy); return Array.from({ length: 48 }, (_, i) => m([r * Math.sin(i * Math.PI / 24), r * Math.cos(i * Math.PI / 24)])); }
  const h = Math.max(Math.abs(dx), Math.abs(dy));
  return [[h, -h], [h, h], [-h, h], [-h, -h]].map(m);
};
// Forma por arrastre libre: desde el punto donde se pulsa hasta donde se suelta (no hace falta pulsar en el centro)
window.formaArrastre = (tipo, a, b) => {
  const kx = 111320 * Math.cos(a[0] * Math.PI / 180), dy = (b[0] - a[0]) * 111320, dx = (b[1] - a[1]) * kx;
  if (tipo === 'circulo') return window.formaDesde('circulo', [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b);
  const l = Math.max(Math.abs(dx), Math.abs(dy)), sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
  const m = ([y, x]) => [a[0] + y / 111320, a[1] + x / kx];
  return [[0, 0], [0, sx * l], [sy * l, sx * l], [sy * l, 0]].map(m);
};
const ahora = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()); };
const OV0 = { herramientas: true, zoom: true, escala: true, poligonos: true, trazas: true, marcadores: true, puntoCero: true, instalaciones: true, poi: true, hallazgos: true, etiquetas: true, brechas: false, leyenda: true, radios: true, coords: true, gruposFlot: true };
const LEYENDA = [
  { kind: 'line', color: '#2563EB', label: 'Track GPX (color del grupo)' }, { kind: 'area', color: '#16A34A', label: 'Sector asignado' },
  { kind: 'areaDashed', color: '#475569', label: 'Sector pendiente' }, { kind: 'ring', color: '#7C3AED', label: 'Radio desde Punto Cero' }, { kind: 'gap', label: 'Brecha sin cubrir' },
  { kind: 'marker', tipo: 'puntoCero', label: 'Punto Cero (LSP)' }, { kind: 'marker', tipo: 'puestoComando', label: 'Puesto de Comando' },
  { kind: 'marker', tipo: 'base', label: 'Otras instalaciones SCI' }, { kind: 'marker', tipo: 'hallazgo', label: 'Hallazgo' }, { kind: 'marker', tipo: 'poi', label: 'Punto de interés' },
];

function Placeholder({ label, icon }) {
  const { Icon } = NS;
  return (
    <div style={{ padding: 24, fontFamily: 'var(--font-family-primary)' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>{label}</h1>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 56, borderRadius: 'var(--radius-card)', background: 'var(--card)', border: '1px dashed var(--border)' }}>
        <Icon name={icon} size={32} color="var(--muted-foreground)" style={{ opacity: 0.5 }} />
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Fuera del alcance de este kit</p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>Este UI kit cubre el Módulo 5 (Mapa). Volvé a "Mapa" en el menú.</p>
      </div>
    </div>
  );
}

const EMBED = new URLSearchParams(location.search).get('embed') === '1' || (() => { try { return !!(window.frameElement && window.frameElement.hasAttribute('data-embed')); } catch (e) { return false; } })();
function App() {
  const { Sidebar, OperativoHeader, MapToolbar, MapLegend, Icon, ESTADOS } = NS;
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [rev, setRev] = useState(0);
  useEffect(() => { const f = () => { setDark(document.documentElement.classList.contains('dark')); setRev(r => r + 1); }; window.addEventListener('duar-paleta', f); return () => window.removeEventListener('duar-paleta', f); }, []);
  const [modulo, setModulo] = useState('Mapa');
  const [pols, setPols] = useState(D.poligonos);
  const [trazas, setTrazas] = useState(D.trazas);
  const [puntos, setPuntos] = useState(D.puntos);
  const [inst, setInst] = useState(D.instalaciones);
  const [grupos, setGrupos] = useState(D.grupos);
  const [p0, setP0] = useState(D.puntoCero);
  const [radios, setRadios] = useState(D.radios);
  const [base, setBase] = useState('satelital');
  const [overlays, setOverlays] = useState(OV0);
  const [tool, setTool] = useState('select');
  const [sel, setSel] = useState(null);
  const [popup, setPopup] = useState(null);
  const [draft, setDraft] = useState([]);
  const [measure, setMeasure] = useState([]);
  const [editVerts, setEditVerts] = useState(null);
  const [moving, setMoving] = useState(null);
  const [modal, setModal] = useState(null);
  const [left, setLeft] = useState(true);
  const [inmersivo, setInmersivo] = useState(false);
  const [open, setOpen] = useState({ sectores: true, radios: true, tracks: false, marcadores: false, capas: false });
  const [q, setQ] = useState('');
  const [gruposOpen, setGruposOpen] = useState(false);
  const [basePop, setBasePop] = useState(false);
  const [toast, setToast] = useState(null);
  const [calc, setCalc] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  useEffect(() => { setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 230); }, [left, modulo, inmersivo]);
  const avisar = (msg, icon, color) => { setToast({ msg, icon, color }); clearTimeout(window.__t); window.__t = setTimeout(() => setToast(null), 2600); };
  const setOv = (k, v) => setOverlays(o => ({ ...o, [k]: v }));
  const patchRadio = (id, patch) => setRadios(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
  const delRadio = id => { const r = radios.find(x => x.id === id); setRadios(rs => rs.filter(x => x.id !== id)); avisar('Radio de ' + window.Geo.fmtRadio(r.km) + ' quitado', 'circle-dot', 'var(--muted-foreground)'); };
  const addRadio = km => {
    if (radios.some(r => r.km === km)) { avisar('Ya existe un radio de ' + window.Geo.fmtRadio(km), 'info', 'var(--muted-foreground)'); return; }
    const pal = D.paletaRadios, usados = radios.map(r => r.color);
    const color = pal.find(c => !usados.includes(c)) || pal[radios.length % pal.length];
    setRadios(rs => [...rs, { id: uid('r'), km, color, visible: true }]); setOv('radios', true);
    avisar('Radio de ' + window.Geo.fmtRadio(km) + ' agregado', 'circle-dot', color);
  };
  const fly = (pts, extra) => setFlyTo({ pts, k: Math.random(), ...extra });
  const abrirPopup = (type, id, latlng, conVuelo) => {
    const off = type === 'traza' ? -4 : type === 'puntoCero' ? -42 : -38;
    const go = () => setPopup({ type, id, latlng, offset: off, k: Math.random() });
    if (conVuelo) { setPopup(null); fly([latlng], { then: go }); } else go();
  };

  const cancelarModo = () => { setTool('select'); setDraft([]); setMeasure([]); setEditVerts(null); setMoving(null); };
  const elegirTool = id => {
    if (id === 'gpx') { setModal({ type: 'gpx' }); return; }
    cancelarModo(); setTool(id); if (id !== 'select') setPopup(null);
  };
  const terminarPoligono = () => {
    const v = draft.filter((p, i) => i === 0 || window.Geo.length([draft[i - 1], p]) > 5);
    if (v.length >= 3) setModal({ type: 'nuevoPoligono', vertices: v });
  };
  useEffect(() => {
    const k = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape' && !modal) { cancelarModo(); setPopup(null); setBasePop(false); }
      if (e.key === 'Enter' && tool === 'poligono' && !modal) terminarPoligono();
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });

  const onMapClick = ll => {
    setBasePop(false);
    if (moving) { setMoving(m => ({ ...m, ll })); return; }
    if (tool === 'poligono') setDraft(d => [...d, ll]);
    else if (tool === 'circulo' || tool === 'cuadrado') return;
    else if (tool === 'medir') setMeasure(m => [...m, ll]);
    else if (tool === 'poi' || tool === 'hallazgo') {
      const p = { id: uid('i'), tipo: tool, nombre: tool === 'poi' ? 'Nuevo punto de interés' : 'Nuevo hallazgo', lat: ll[0], lng: ll[1], descripcion: '', detalle: '', visible: true };
      setPuntos(x => [...x, p]); setSel({ type: 'punto', id: p.id }); setTool('select'); setOpen(o => ({ ...o, marcadores: true })); avisar('Marcador creado. Completá sus datos en el panel.');
    } else if (tool === 'instalacion') setModal({ type: 'instalacion', ll });
    else if (tool === 'puntoCero') setModal({ type: 'puntoCero', to: ll });
    else if (!editVerts) { setPopup(null); setSel(null); }
  };
  const onSelectMap = (s, ll) => {
    if (s.type === 'poligono') { setSel(s); setPopup(null); } else abrirPopup(s.type, s.id, ll);
  };

  const patchPol = (id, patch) => setPols(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));
  const asignar = (pol, gid) => {
    const prev = pol.grupoId, f = ahora();
    const hist = [...(pol.historial || []), ...(prev ? [{ ev: 'quitado', grupoId: prev, fecha: f }] : []), ...(gid ? [{ ev: 'asignado', grupoId: gid, fecha: f }] : [])];
    patchPol(pol.id, { grupoId: gid, historial: hist, estado: gid ? (pol.estado === 'pendiente' ? 'asignado' : pol.estado) : 'pendiente' });
    setGrupos(gs => gs.map(g => g.id === gid && ['en_formacion', 'confirmado', 'en_espera'].includes(g.estado) ? { ...g, estado: 'asignado' } : g.id === prev && g.estado === 'asignado' ? { ...g, estado: 'confirmado' } : g));
    avisar(gid ? `${pol.nombre.split(' — ')[0]} asignado a ${grupos.find(x => x.id === gid).nombre}` : 'Sector sin grupo asignado');
  };
  // Al pasar a Replegado el grupo sale solo del sector
  useEffect(() => {
    const salen = pols.filter(p => p.grupoId && (grupos.find(g => g.id === p.grupoId) || {}).estado === 'replegado');
    if (!salen.length) return;
    const f = ahora();
    setPols(ps => ps.map(p => salen.some(s => s.id === p.id) ? { ...p, grupoId: null, historial: [...(p.historial || []), { ev: 'replegado', grupoId: p.grupoId, fecha: f }] } : p));
    avisar(salen.map(s => grupos.find(g => g.id === s.grupoId).nombre).join(', ') + ' se replegó y salió de ' + salen.map(s => s.nombre.split(' — ')[0]).join(', '), 'log-out', 'var(--muted-foreground)');
  }, [grupos]);
  const calcular = pol => {
    setCalc(pol.id);
    setTimeout(() => {
      const r = window.Geo.coverage(pol.vertices, trazas.filter(t => t.poligonoId === pol.id));
      patchPol(pol.id, { cobertura: { ...r, hora: hora() } }); setOv('brechas', true); setCalc(null);
      avisar(`Cobertura de ${pol.nombre.split(' — ')[0]}: ${Math.round(r.pct)}%`, 'scan', 'var(--primary)');
    }, 700);
  };
  const toggleItem = (kind, id) => {
    const f = xs => xs.map(x => x.id === id ? { ...x, visible: x.visible === false } : x);
    ({ pols: setPols, trazas: setTrazas, puntos: setPuntos, inst: setInst })[kind](f);
  };
  const encuadrar = () => mapRef.current && mapRef.current.flyToBounds(L.latLngBounds(pols.flatMap(p => p.vertices).concat(inst.map(i => [i.lat, i.lng]))).pad(0.1), { duration: 0.6 });
  const DIBUJO = ['select', 'poligono', 'circulo', 'cuadrado', 'poi', 'hallazgo', 'instalacion', 'puntoCero', 'medir', 'gpx'];
  useEffect(() => { const f = () => { if (!document.fullscreenElement) setInmersivo(false); }; document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f); }, []);
  const pantallaCompleta = () => {
    if (inmersivo) { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); setInmersivo(false); }
    else { const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); setInmersivo(true); }
  };
  const onRail = id => {
    const m = mapRef.current; if (!m) return;
    if (DIBUJO.includes(id)) elegirTool(tool === id && id !== 'select' ? 'select' : id);
    if (id === 'zin') m.zoomIn(); if (id === 'zout') m.zoomOut();
    if (id === 'capas') setBasePop(b => !b);
    if (id === 'home') encuadrar();
    if (id === 'p0') abrirPopup('puntoCero', 'p0', [p0.lat, p0.lng], true);
    if (id === 'full') pantallaCompleta();
  };
  const rail = [
    { id: 'select', icon: 'mouse-pointer-2', label: 'Seleccionar' }, { id: 'medir', icon: 'ruler', label: 'Medir distancia' }, { sep: true },
    { id: 'poligono', icon: 'pentagon', label: 'Dibujar sector (Enter cierra · Esc cancela)' }, { id: 'circulo', icon: 'circle', label: 'Sector circular (pulsar y arrastrar)' }, { id: 'cuadrado', icon: 'square', label: 'Sector cuadrado (pulsar y arrastrar)' }, { sep: true },
    { id: 'poi', icon: 'map-pin-plus', label: 'Punto de interés' },
    { id: 'instalacion', icon: 'flag', label: 'Instalación SCI' }, { id: 'puntoCero', icon: 'crosshair', label: 'Mover Punto Cero' }, { sep: true },
    { id: 'home', icon: 'house', label: 'Encuadrar operativo' },
  ];
  const railVista = [
    { id: 'capas', icon: 'layers', label: 'Capas · mapa base' }, { sep: true },
    { id: 'zin', icon: 'plus', label: 'Acercar' }, { id: 'zout', icon: 'minus', label: 'Alejar' }, { sep: true },
    { id: 'full', icon: inmersivo ? 'minimize' : 'maximize', label: inmersivo ? 'Salir de pantalla completa' : 'Pantalla completa' },
  ];

  const selPol = sel && sel.type === 'poligono' && pols.find(p => p.id === sel.id);
  const selTr = sel && sel.type === 'traza' && trazas.find(t => t.id === sel.id);
  const selPt = sel && sel.type === 'punto' && puntos.find(p => p.id === sel.id);
  const selIn = sel && sel.type === 'instalacion' && inst.find(i => i.id === sel.id);
  const selP0 = sel && sel.type === 'puntoCero';
  const panel = !!(selPol || selTr || selPt || selIn || selP0) && !editVerts;
  const editar = (type, id) => { setSel({ type, id }); setPopup(null); };
  const reubicar = i => { cancelarModo(); setPopup(null); setSel(null); setMoving({ id: i.id, ll: [i.lat, i.lng] }); };

  let popupNode = null;
  if (popup) {
    const close = () => setPopup(null);
    if (popup.type === 'traza') { const t = trazas.find(x => x.id === popup.id); if (t) { const pol = pols.find(p => p.id === t.poligonoId); popupNode = <TrazaPopup t={t} grupo={grupos.find(g => g.id === t.grupoId)} pol={pol} onClose={close} onEliminar={() => { setPopup(null); setModal({ type: 'eliminar', kind: 'traza', id: t.id, nombre: t.etiqueta, extra: 'Se eliminará este track del mapa. Esta acción no podrá ser revertida.' }); }} onPoligono={() => { setSel({ type: 'poligono', id: pol.id }); setPopup(null); fly(pol.vertices, { panel: true }); }} />; } }
    if (popup.type === 'punto') { const p = puntos.find(x => x.id === popup.id); if (p) popupNode = <PuntoPopup p={p} onClose={close} onEditar={() => editar('punto', p.id)} />; }
    if (popup.type === 'instalacion') { const i = inst.find(x => x.id === popup.id); if (i) popupNode = <InstalacionPopup i={i} onClose={close} onEditar={() => editar('instalacion', i.id)} onReubicar={() => reubicar(i)} />; }
    if (popup.type === 'puntoCero') popupNode = <PuntoCeroPopup pc={p0} onClose={close} onActualizar={() => { setPopup(null); setModal({ type: 'puntoCero', to: [p0.lat, p0.lng] }); }} />;
  }

  const eliminar = () => {
    const m = modal;
    if (m.kind === 'poligono') { setPols(ps => ps.filter(p => p.id !== m.id)); setTrazas(ts => ts.map(t => t.poligonoId === m.id ? { ...t, poligonoId: null } : t)); }
    if (m.kind === 'traza') { setTrazas(ts => ts.filter(t => t.id !== m.id)); setPols(ps => ps.map(p => p.cobertura ? { ...p, cobertura: null } : p)); }
    if (m.kind === 'punto') setPuntos(ps => ps.filter(p => p.id !== m.id));
    if (m.kind === 'instalacion') setInst(is => is.filter(i => i.id !== m.id));
    setModal(null); setSel(null); setPopup(null); avisar(m.nombre + ' eliminado', 'trash-2', '#dc2626');
  };

  const navItems = [{ icon: 'layout-dashboard', label: 'Panel' }, { icon: 'user-check', label: 'Agentes' }, { icon: 'map', label: 'Mapa' }].map(i => ({ ...i, active: i.label === modulo }));
  const derecha = panel ? 352 : 12;

  return (
    <div style={{ display: 'flex', height: '100vh', background: EMBED ? 'transparent' : 'var(--background)', color: 'var(--foreground)', overflow: 'hidden' }}>
      {!inmersivo && !EMBED && <Sidebar context="operativo" items={navItems} user={D.usuario} isDark={dark} onToggleDark={() => setDark(d => !d)} onNavigate={it => setModulo(it.label)} onLogout={() => avisar('Cerrar sesión no forma parte de este kit', 'log-out', 'var(--muted-foreground)')} onBack={() => avisar('Volver a Operativos no forma parte de este kit', 'info', 'var(--muted-foreground)')} defaultCollapsed />}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {!inmersivo && !EMBED && <OperativoHeader {...D.operativo} hasObjetivo aCargo="Miguel Giménez" defaultCompacto={(() => { try { return localStorage.getItem('duar-encabezado-compacto') === '1'; } catch (e) { return false; } })()} onCompacto={v => { try { localStorage.setItem('duar-encabezado-compacto', v ? '1' : '0'); } catch (e) {} }} onPuestoComando={() => avisar('Puesto de comando: coordinadores presentes y a cargo (ver encabezado)', 'radio-tower', 'var(--foreground)')} onObjetivo={() => avisar('Objetivo buscado: ver módulo 3', 'target', 'var(--primary)')} onQR={() => avisar('QR de agentes: ver módulo 4', 'qr-code', 'var(--foreground)')} onInforme={() => avisar('Informe: ver módulo 6', 'file-text', 'var(--foreground)')} />}
        {modulo !== 'Mapa' ? <div style={{ flex: 1, overflowY: 'auto' }}><Placeholder label={modulo === 'Panel' ? 'Panel de Control' : 'Agentes y Grupos'} icon={modulo === 'Panel' ? 'layout-dashboard' : 'users'} /></div> :
        <div style={{ flex: 1, minHeight: 0, display: 'flex', position: 'relative' }}>
          {left && <LeftTree radios={radios} p0={p0} onRadio={patchRadio} onDelRadio={delRadio} onAddRadio={addRadio} q={q} setQ={setQ} open={open} setOpen={setOpen} pols={pols} trazas={trazas} puntos={puntos} inst={inst} grupos={grupos} overlays={overlays} setOv={setOv} base={base} setBase={setBase}
            tool={moving ? null : tool} onTool={elegirTool} sel={sel} popup={popup} onToggleItem={toggleItem} onClose={() => setLeft(false)}
            onPol={p => { setSel({ type: 'poligono', id: p.id }); setPopup(null); fly(p.vertices, { panel: true }); }}
            onTraza={t => { setSel(null); abrirPopup('traza', t.id, t.puntos[Math.floor(t.puntos.length / 2)], true); }}
            onPunto={p => abrirPopup('punto', p.id, [p.lat, p.lng], true)} onInst={i => abrirPopup('instalacion', i.id, [i.lat, i.lng], true)} onP0={() => abrirPopup('puntoCero', 'p0', [p0.lat, p0.lng], true)}
            onReset={() => { setOverlays(OV0); setBase('satelital'); setQ(''); setPopup(null); setSel(null); cancelarModo(); encuadrar(); }} />}
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <MapCanvas rev={rev} radios={radios} radiosCentro={modal && modal.type === 'puntoCero' ? { lat: modal.to[0], lng: modal.to[1] } : p0} radiosPreview={!!(modal && modal.type === 'puntoCero')} base={base} overlays={overlays} poligonos={pols} trazas={trazas} puntos={puntos} instalaciones={inst} grupos={grupos} puntoCero={p0} sel={sel} popup={popup} popupNode={popupNode}
              tool={tool} draft={draft} measure={measure} editVerts={editVerts} moving={moving} flyTo={flyTo} onReady={m => (mapRef.current = m)}
              onMapClick={onMapClick} onShapeDrawn={(t, c, ll) => { if (window.Geo.length([c, ll]) > 5) setModal({ type: 'nuevoPoligono', vertices: window.formaArrastre(t, c, ll) }); }} onMapDblClick={() => tool === 'poligono' && terminarPoligono()} onSelect={onSelectMap} onMoveDrag={ll => setMoving(m => ({ ...m, ll }))}
              onVertexMove={(i, ll) => setEditVerts(ev => { const v = ev.verts.slice(); v[i] = ll; return { ...ev, verts: v }; })} />
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 900, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!left && <button type="button" onClick={() => setLeft(true)} title="Mostrar panel" style={{ width: 44, height: 44, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--card)', boxShadow: 'var(--elevation-md)', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="panel-left-open" size={16} /></button>}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                {overlays.herramientas && <MapToolbar tools={rail} active={moving ? null : tool} onSelect={onRail} />}
              </div>
            </div>
            <div style={{ position: 'absolute', top: 12, right: derecha, zIndex: 900, transition: 'right .2s' }}>
              {overlays.gruposFlot && <GruposFloat grupos={grupos} poligonos={pols} open={gruposOpen} setOpen={setGruposOpen} onGrupo={(g, pol) => { if (pol) { setSel({ type: 'poligono', id: pol.id }); setPopup(null); fly(pol.vertices, { panel: true }); setGruposOpen(false); } else avisar(g.nombre + ' no tiene sector asignado', 'info', 'var(--muted-foreground)'); }} />}
            </div>
            <div style={{ position: 'absolute', bottom: 26, right: derecha, zIndex: 900, transition: 'right .2s' }}>
              {overlays.zoom && <MapToolbar tools={railVista} active={basePop ? 'capas' : inmersivo ? 'full' : null} onSelect={onRail} />}
              {overlays.zoom && basePop && <div style={{ position: 'absolute', right: 54, top: 0 }}><BasePopover base={base} onBase={b => { setBase(b); setBasePop(false); }} /></div>}
            </div>
            {overlays.leyenda && <div style={{ position: 'absolute', bottom: 26, right: derecha + (overlays.zoom ? 58 : 0), zIndex: 900, transition: 'right .2s' }}><MapLegend items={LEYENDA} defaultOpen={window.innerHeight > 820} /></div>}
            <ModoBanner tool={tool} draft={draft} measure={measure} editing={!!editVerts} moving={moving} onUndo={() => setDraft(d => d.slice(0, -1))} onFinish={terminarPoligono} onCancel={cancelarModo} onClearMeasure={() => setMeasure([])}
              onSaveGeom={() => { patchPol(editVerts.id, { vertices: editVerts.verts, cobertura: null }); setSel({ type: 'poligono', id: editVerts.id }); setEditVerts(null); avisar('Geometría actualizada. Recalculá la cobertura.'); }}
              onSaveMove={() => { setInst(is => is.map(i => i.id === moving.id ? { ...i, lat: moving.ll[0], lng: moving.ll[1] } : i)); const n = inst.find(i => i.id === moving.id).nombre; setMoving(null); avisar(n + ' reubicado'); }} />
            {selPol && !editVerts && <PoligonoPanel pol={selPol} grupos={grupos} poligonos={pols} trazas={trazas} onClose={() => setSel(null)} onPatch={p => { patchPol(selPol.id, p); avisar(p.notas !== undefined ? 'Nota guardada' : 'Cambios guardados'); }}
              onAsignar={g => asignar(selPol, g)} onQuitar={(gr, enTerreno) => enTerreno ? setModal({ type: 'quitarGrupo', polId: selPol.id, grupo: gr }) : asignar(selPol, null)} onSimularRepliegue={() => setGrupos(gs => gs.map(g => g.id === selPol.grupoId ? { ...g, estado: 'replegado' } : g))} onCalcular={() => calcular(selPol)} calculando={calc === selPol.id} brechas={overlays.brechas} onToggleBrechas={() => setOv('brechas', !overlays.brechas)}
              onEditGeom={() => { cancelarModo(); setEditVerts({ id: selPol.id, verts: selPol.vertices.slice() }); }} onDelete={() => setModal({ type: 'eliminar', kind: 'poligono', id: selPol.id, nombre: selPol.nombre, extra: 'Los tracks asociados se conservan pero quedan fuera de sector.' })}
              onSelectTraza={t => abrirPopup('traza', t.id, t.puntos[Math.floor(t.puntos.length / 2)], true)} />}
            {selTr && <TrazaPanel t={selTr} grupos={grupos} poligonos={pols} onClose={() => setSel(null)} onSave={f => { setTrazas(ts => ts.map(t => t.id === f.id ? f : t)); avisar('Track actualizado'); }} onDelete={() => setModal({ type: 'eliminar', kind: 'traza', id: selTr.id, nombre: selTr.etiqueta, extra: 'Se eliminará este track del mapa. Esta acción no podrá ser revertida.' })} />}
            {selPt && <PuntoPanel p={selPt} onClose={() => setSel(null)} onSave={f => { setPuntos(ps => ps.map(p => p.id === f.id ? f : p)); avisar('Marcador actualizado'); }} onDelete={() => setModal({ type: 'eliminar', kind: 'punto', id: selPt.id, nombre: selPt.nombre })} />}
            {selIn && !moving && <InstalacionPanel i={selIn} onClose={() => setSel(null)} onSave={f => { setInst(is => is.map(i => i.id === f.id ? f : i)); avisar('Instalación actualizada'); }} onReubicar={() => reubicar(selIn)} onDelete={() => setModal({ type: 'eliminar', kind: 'instalacion', id: selIn.id, nombre: selIn.nombre })} />}
            {selP0 && <PuntoCeroPanel pc={p0} onClose={() => setSel(null)} onMover={() => { setSel(null); setModal({ type: 'puntoCero', to: [p0.lat, p0.lng] }); }} />}
            <Toast t={toast} />
          </div>
        </div>}
      </div>

      {modal && modal.type === 'nuevoPoligono' && <NuevoPoligonoModal vertices={modal.vertices} grupos={grupos} n={pols.length + 1} onCancel={() => setModal(null)}
        onSave={f => { const p = { id: uid('p'), ...f, estado: f.grupoId ? 'asignado' : 'pendiente', vertices: modal.vertices, visible: true, historial: f.grupoId ? [{ ev: 'asignado', grupoId: f.grupoId, fecha: ahora() }] : [] }; setPols(ps => [...ps, p]); if (f.grupoId) setGrupos(gs => gs.map(g => g.id === f.grupoId && ['en_formacion', 'confirmado', 'en_espera'].includes(g.estado) ? { ...g, estado: 'asignado' } : g)); setModal(null); cancelarModo(); setSel({ type: 'poligono', id: p.id }); setOpen(o => ({ ...o, sectores: true })); avisar('Sector creado'); }} />}
      {modal && modal.type === 'gpx' && <GpxModal grupos={grupos} poligonos={pols} onCancel={() => setModal(null)}
        onUpload={f => { const t = { id: uid('t'), horaInicio: hora(), ...f, fecha: f.inicio ? f.inicio.slice(0, 10) : f.fecha, notas: '', visible: true, agente: f.agente || (D.usuario.nombre + ' ' + D.usuario.apellido), cargado: ahora() }; setTrazas(ts => [...ts, t]); if (f.poligonoId) patchPol(f.poligonoId, { cobertura: null }); setModal(null); setOpen(o => ({ ...o, tracks: true })); abrirPopup('traza', t.id, t.puntos[Math.floor(t.puntos.length / 2)], true); avisar('Track cargado: ' + window.Geo.fmtKm(window.Geo.length(t.puntos))); }} />}
      {modal && modal.type === 'instalacion' && <NuevaInstalacionModal ll={modal.ll} onCancel={() => setModal(null)}
        onSave={f => { const i = { id: uid('s'), ...f, lat: modal.ll[0], lng: modal.ll[1], visible: true }; setInst(is => [...is, i]); setModal(null); setTool('select'); setOpen(o => ({ ...o, marcadores: true })); abrirPopup('instalacion', i.id, [i.lat, i.lng]); avisar(i.nombre + ' marcado en el mapa'); }} />}
      {modal && modal.type === 'quitarGrupo' && (() => { const { Modal, Button } = NS; const pol = pols.find(x => x.id === modal.polId); return (
        <Modal title="Quitar grupo del sector" icon="triangle-alert" width={440} onClose={() => setModal(null)}
          footer={<><Button variant="outline" size="md" onClick={() => setModal(null)}>Cancelar</Button><Button variant="danger" size="md" icon="x" onClick={() => { asignar(pol, null); setModal(null); }}>Quitar igualmente</Button></>}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.55 }}><strong style={{ color: 'var(--foreground)' }}>{modal.grupo.nombre}</strong> está <strong style={{ color: 'var(--foreground)' }}>{ESTADOS[modal.grupo.estado].label.toLowerCase()}</strong> en {pol.nombre.split(' — ')[0]}. Si lo quitás, el sector queda sin grupo mientras el personal sigue en terreno. Queda registrado en el historial del sector.</p>
        </Modal>); })()}
      {modal && modal.type === 'eliminar' && <EliminarModal tipo={{ poligono: 'sector', traza: 'track GPX', punto: 'marcador', instalacion: 'instalación' }[modal.kind]} nombre={modal.nombre} extra={modal.extra} onCancel={() => setModal(null)} onConfirm={eliminar} />}
      {modal && modal.type === 'puntoCero' && <PuntoCeroModal nRadios={overlays.radios ? radios.filter(r => r.visible).length : 0} from={p0} to={modal.to} onChange={to => setModal(mm => mm && mm.type === 'puntoCero' ? { ...mm, to } : mm)} onCancel={() => { setModal(null); cancelarModo(); }}
        onConfirm={to => { setP0({ ...p0, lat: to[0], lng: to[1], actualizado: new Date().toLocaleDateString('es-AR') + ' ' + hora() }); setModal(null); setTool('select'); abrirPopup('puntoCero', 'p0', to); avisar('Punto Cero actualizado'); }} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
