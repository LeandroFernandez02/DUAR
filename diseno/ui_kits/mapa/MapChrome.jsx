/* Elementos flotantes sobre el mapa: grupos, banner de modo, aviso y globos de información. */
const NSC = window.DUARDiseOMapa_7e942c;
const corto = n => n.split(' — ')[0];
const fecha = f => f ? f.split('-').reverse().join('/') : '—';

function BasePopover({ base, onBase }) {
  const { Icon } = NSC;
  return (
    <div style={{ display: 'flex', gap: 6, padding: 6, background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)', fontFamily: 'var(--font-family-primary)' }}>
      {window.MapaData.bases.map(b => { const on = b.id === base; return (
        <button key={b.id} type="button" onClick={() => onBase(b.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 72, padding: '8px 4px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1.5px solid ' + (on ? 'var(--primary)' : 'var(--border)'), background: on ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent', color: on ? 'var(--primary)' : 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 11, fontWeight: 600 }}>
          <Icon name={b.icon} size={16} />{b.label}
        </button>); })}
    </div>
  );
}

function GruposFloat({ grupos, poligonos, open, setOpen, onGrupo }) {
  const { Icon, StatusBadge } = NSC;
  const terreno = grupos.filter(g => ['rastrillando', 'desplegado'].includes(g.estado)).length;
  return (
    <div style={{ width: 290, background: 'var(--card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)', overflow: 'hidden', fontFamily: 'var(--font-family-primary)' }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-family-primary)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 0 3px color-mix(in srgb, rgba(22,163,74,0.3) var(--tinte-oscuro, 0%), #dcfce7)', flexShrink: 0 }}></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--foreground)' }}>Grupos operativos</span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)' }}>{terreno} en terreno · {grupos.length - terreno} en base</span>
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{grupos.length}</span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={15} color="var(--muted-foreground)" />
      </button>
      {open && <div style={{ borderTop: '1px solid var(--border)', padding: 6, maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {grupos.map(g => { const pol = poligonos.find(p => p.grupoId === g.id); return (
          <button key={g.id} type="button" onClick={() => onGrupo(g, pol)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-family-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: g.color, flexShrink: 0 }}></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--foreground)' }}>{g.nombre}</span>
              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pol ? corto(pol.nombre) : 'Sin sector'} · {g.integrantes} integrantes</span>
            </span>
            <StatusBadge estado={g.estado} size="sm" />
          </button>); })}
      </div>}
    </div>
  );
}

function ModoBanner({ tool, draft, measure, editing, moving, onUndo, onFinish, onCancel, onSaveGeom, onSaveMove, onClearMeasure }) {
  const { Button, Icon } = NSC;
  const w = { color: '#fff' };
  let txt = null, acc = null;
  if (moving) { txt = 'Arrastrá el marcador o hacé clic donde se trasladó la instalación'; acc = <Button icon="check" onClick={onSaveMove}>Guardar ubicación</Button>; }
  else if (editing) { txt = 'Arrastrá los vértices para modificar el sector'; acc = <Button icon="check" onClick={onSaveGeom}>Guardar geometría</Button>; }
  else if (tool === 'poligono') { txt = draft.length < 3 ? `Hacé clic para marcar vértices (${draft.length}/3 mínimo)` : 'Doble clic o clic en el primer vértice para cerrar'; acc = <><Button variant="ghost" icon="undo-2" disabled={!draft.length} onClick={onUndo} style={w}>Deshacer</Button><Button icon="check" disabled={draft.length < 3} onClick={onFinish}>Terminar</Button></>; }
  else if (tool === 'circulo' || tool === 'cuadrado') txt = 'Pulsá y arrastrá en el mapa para dibujar el sector ' + (tool === 'circulo' ? 'circular' : 'cuadrado') + ' · Esc cancela';
  else if (tool === 'medir') { txt = measure.length > 1 ? 'Distancia total: ' + window.Geo.fmtDist(window.Geo.length(measure)) + ' · ' + (measure.length - 1) + ' tramos' : 'Hacé clic en el mapa para medir una distancia'; acc = measure.length ? <Button variant="ghost" icon="eraser" onClick={onClearMeasure} style={w}>Limpiar</Button> : null; }
  else if (tool === 'poi') txt = 'Hacé clic en el mapa para marcar el punto de interés';
  else if (tool === 'hallazgo') txt = 'Hacé clic en el mapa donde se encontró la pista';
  else if (tool === 'instalacion') txt = 'Hacé clic en el mapa para ubicar la instalación';
  else if (tool === 'puntoCero') txt = 'Hacé clic en el mapa para colocar el nuevo Punto Cero / LSP';
  if (!txt) return null;
  return (
    <div style={{ position: 'absolute', top: 12, left: 68, zIndex: 950, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 6px 6px 14px', borderRadius: 'var(--radius)', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', color: '#fff', fontFamily: 'var(--font-family-primary)', fontSize: 12, width: 'max-content', maxWidth: 'calc(100% - 390px)' }}>
      <Icon name="info" size={14} /><span style={{ flex: '1 1 auto' }}>{txt}</span>{acc}
      <Button variant="ghost" icon="x" onClick={onCancel} style={{ color: '#fff', padding: '6px 8px' }} title="Cancelar (Esc)"></Button>
    </div>
  );
}

function Toast({ t }) {
  const { Icon } = NSC;
  if (!t) return null;
  return (
    <div style={{ position: 'absolute', left: '50%', bottom: 72, transform: 'translateX(-50%)', zIndex: 1200, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 'var(--radius)', background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)', fontFamily: 'var(--font-family-primary)', fontSize: 13, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
      <Icon name={t.icon || 'circle-check'} size={16} color={t.color || '#16a34a'} />{t.msg}
    </div>
  );
}

const stat = (l, v) => <div><p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>{l}</p><p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{v}</p></div>;

const fechaHora = iso => { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d)) return '—'; const z = n => String(n).padStart(2, '0'); return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()); };
const duracionGpx = (a, b) => { const ms = new Date(b) - new Date(a); if (!a || !b || isNaN(ms) || ms < 0) return '—'; const min = Math.round(ms / 60000), h = Math.floor(min / 60); return h ? h + ' h ' + String(min % 60).padStart(2, '0') + ' min' : min + ' min'; };
const filaDato = (l, v) => <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>{l} <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{v}</span></p>;

function TrazaPopup({ t, grupo, pol, onClose, onEliminar, onPoligono }) {
  const { MapPopup, ElevationProfile, Button } = NSC;
  const c = grupo ? grupo.color : '#444140', pf = window.Geo.perfil(t.puntos);
  return (
    <MapPopup icon="route" color={c} kicker="Track GPX" centrado onClose={onClose}
      actions={<>{pol && <Button variant="ghost" icon="pentagon" onClick={onPoligono}>{corto(pol.nombre)}</Button>}<button type="button" title="Eliminar track" aria-label="Eliminar track" onClick={onEliminar} onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--destructive) 10%, transparent)'; e.currentTarget.style.color = 'var(--destructive)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)'; }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, marginLeft: 'auto', borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer' }}><NSC.Icon name="trash-2" size={15} /></button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: -4 }}>
        {filaDato('Recorrido de', t.agente || 'Sin agente')}
        {filaDato('Inicio:', <span style={{ fontFamily: 'var(--font-data)', fontWeight: 400, color: '#2A2F2AE6' }}>{fechaHora(t.inicio)}</span>)}
        {filaDato('Fin:', <span style={{ fontFamily: 'var(--font-data)', fontStyle: 'normal', fontWeight: 400, color: '#2A2F2AE6' }}>{fechaHora(t.fin)}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {stat('Distancia', window.Geo.fmtKm(pf.dist[pf.dist.length - 1]))}{stat('Duración', duracionGpx(t.inicio, t.fin))}{stat('Desnivel', '↑ ' + window.Geo.fmtM(pf.up))}
      </div>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5 }}><span style={{ color: '#2A2F2A9E' }}>Cargado por</span> <span style={{ color: '#2A2F2A9E', fontWeight: 400 }}>{t.agente || '—'}</span>{t.cargado && <> · <span style={{ fontFamily: 'var(--font-data)' }}>{t.cargado}</span></>}</p>
    </MapPopup>
  );
}

function PuntoPopup({ p, onClose, onEditar }) {
  const { MapPopup, MapMarker, Button, TIPOS_MARCADOR } = NSC;
  const c = TIPOS_MARCADOR[p.tipo];
  return (
    <MapPopup chip={<MapMarker tipo={p.tipo} variant="chip" />} color={c.color} kicker={c.label} title={p.nombre} subtitle={window.Geo.fmtCoord(p.lat, p.lng)} onClose={onClose}
      actions={<Button variant="muted" icon="pencil" onClick={onEditar}>Ver y editar</Button>}>
      {p.descripcion && <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)' }}>{p.descripcion}</p>}
      {p.detalle && <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.detalle}</p>}
      {!p.descripcion && !p.detalle && <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>Sin descripción cargada.</p>}
    </MapPopup>
  );
}

function InstalacionPopup({ i, onClose, onEditar, onReubicar }) {
  const { MapPopup, MapMarker, Button, TIPOS_MARCADOR } = NSC;
  const c = TIPOS_MARCADOR[i.tipo];
  return (
    <MapPopup chip={<MapMarker tipo={i.tipo} variant="chip" />} color={c.color} kicker={'Instalación SCI · ' + c.glyph} title={i.nombre} subtitle={window.Geo.fmtCoord(i.lat, i.lng)} onClose={onClose}
      actions={<><Button variant="ghost" icon="move" onClick={onReubicar}>Reubicar</Button><Button variant="muted" icon="pencil" onClick={onEditar}>Editar</Button></>}>
      {i.notas && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--foreground)', lineHeight: 1.5 }}>{i.notas}</p>}
      {i.responsable && <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>Responsable: <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>{i.responsable}</strong></p>}
    </MapPopup>
  );
}

function PuntoCeroPopup({ pc, onClose, onActualizar }) {
  const { MapPopup, MapMarker, Button } = NSC;
  return (
    <MapPopup chip={<MapMarker tipo="puntoCero" variant="chip" />} color="var(--marker-punto-cero)" kicker="Punto Cero · LSP" title="Último punto de avistamiento" subtitle={window.Geo.fmtCoord(pc.lat, pc.lng)} onClose={onClose}
      actions={<Button variant="muted" icon="crosshair" onClick={onActualizar}>Actualizar Punto Cero</Button>}>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--foreground)', lineHeight: 1.5 }}>{pc.descripcion}</p>
      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-foreground)' }}>Actualizado {pc.actualizado}</p>
    </MapPopup>
  );
}

Object.assign(window, { BasePopover, GruposFloat, ModoBanner, Toast, TrazaPopup, PuntoPopup, InstalacionPopup, PuntoCeroPopup });
