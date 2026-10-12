/* Paneles de detalle a la derecha (polígono, traza, punto, instalación, Punto Cero) + modal de nueva instalación. */
const { useState: useStateP, useEffect: useEffectP } = React;
const NSP = window.DUARDiseOMapa_7e942c;
const ovP = { color: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 };
const cortoP = n => n.split(' — ')[0];

function DetailShell({ chip, title, badge, onClose, sub, children, footer }) {
  const { Icon } = NSP;
  return (
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 340, maxWidth: '100%', zIndex: 800, display: 'flex', flexDirection: 'column', background: 'var(--card)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--elevation-md)', fontFamily: 'var(--font-family-primary)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
          <span style={{ marginTop: 2, display: 'flex' }}>{chip}</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.25 }}>{title}</p>
            <div style={{ marginTop: 5 }}>{badge}</div>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><Icon name="x" size={16} /></button>
      </div>
      {sub && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--muted)', borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono)', fontSize: 11 }}><Icon name="crosshair" size={12} />{sub}</div>}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
      {footer && <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>{footer}</div>}
    </div>
  );
}
const iconChip = (icon, color) => { const { Icon } = NSP; return <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: color + '1f', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={14} /></span>; };
const pill = (txt, color) => <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: color + '1f', color, fontSize: 10, fontWeight: 600 }}>{txt}</span>;
const delBtn = onClick => { const { Button } = NSP; return <Button variant="ghost" icon="trash-2" onClick={onClick} style={{ color: '#dc2626' }}>Eliminar</Button>; };

function GrupoAsignado({ pol, grupos, poligonos, onAsignar, onQuitar, onSimularRepliegue }) {
  const { Icon, StatusBadge, Button, SelectField } = NSP;
  const [cambiar, setCambiar] = useStateP(false);
  const [nuevo, setNuevo] = useStateP('');
  useEffectP(() => { setCambiar(false); setNuevo(''); }, [pol.id]);
  const gr = grupos.find(g => g.id === pol.grupoId);
  const puedeCambiar = gr && gr.estado === 'asignado';
  const enTerreno = gr && ['desplegado', 'rastrillando'].includes(gr.estado);
  const opciones = [{ value: '', label: 'Elegí un grupo…' }, ...grupos.filter(g => g.id !== pol.grupoId).map(g => { const otro = poligonos.find(p => p.grupoId === g.id); return { value: g.id, label: g.nombre + (otro ? ' · en ' + cortoP(otro.nombre) : ' · libre') }; })];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={ovP}>Grupo asignado</p>
      {gr ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 'var(--radius)', background: gr.color + '10', border: '1.5px solid ' + gr.color + '55' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: gr.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={gr.especial ? 'dog' : 'users'} size={16} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--foreground)' }}>{gr.nombre}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)' }}>{gr.integrantes} integrantes</p>
            </div>
            <StatusBadge estado={gr.estado} size="sm" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><Icon name="user-round" size={13} color="var(--muted-foreground)" /><span style={{ color: 'var(--muted-foreground)' }}>Líder</span><span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{gr.lider}</span></div>
          {!cambiar && <div style={{ display: 'flex', gap: 6 }}>{puedeCambiar && <Button variant="outline" icon="repeat" onClick={() => setCambiar(true)}>Cambiar grupo</Button>}<Button variant="ghost" icon="x" onClick={() => onQuitar(gr, enTerreno)}>Quitar</Button></div>}
          {enTerreno && <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.45 }}><Icon name="info" size={12} style={{ marginTop: 2, flexShrink: 0 }} /><span>El grupo está en terreno: no se puede cambiar. Al pasar a Replegado sale solo del sector. <button type="button" onClick={onSimularRepliegue} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--primary)', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Simular repliegue (demo)</button></span></div>}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
          <Icon name="users" size={18} color="var(--muted-foreground)" />
          <div><p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--foreground)' }}>Sin grupo asignado</p><p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)' }}>El sector queda Pendiente hasta asignarle un grupo.</p></div>
        </div>
      )}
      {(cambiar && puedeCambiar || !gr) && <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
        <SelectField style={{ flex: 1, minWidth: 0 }} value={nuevo} onChange={setNuevo} options={opciones} />
        <Button size="md" disabled={!nuevo} onClick={() => { onAsignar(nuevo); setCambiar(false); setNuevo(''); }}>Asignar</Button>
        {cambiar && <Button variant="ghost" size="md" icon="x" onClick={() => setCambiar(false)} title="Cancelar"></Button>}
      </div>}
    </div>
  );
}

function NotasSector({ notas, onSave }) {
  const { Button, TextField } = NSP;
  const [ed, setEd] = useStateP(false);
  const [v, setV] = useStateP(notas || '');
  useEffectP(() => { setEd(false); setV(notas || ''); }, [notas]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={ovP}>Notas</p>
        {!ed && <Button variant="ghost" icon={notas ? 'pencil' : 'plus'} onClick={() => setEd(true)}>{notas ? 'Editar nota' : 'Agregar nota'}</Button>}
      </div>
      {ed ? <>
        <TextField multiline rows={4} value={v} onChange={setV} placeholder="Terreno, accesos, riesgos, indicaciones para el grupo…" />
        <div style={{ display: 'flex', gap: 6 }}><Button icon="save" disabled={v === (notas || '')} onClick={() => onSave(v.trim())}>Guardar nota</Button><Button variant="ghost" onClick={() => { setEd(false); setV(notas || ''); }}>Cancelar</Button></div>
      </> : notas ? <p style={{ margin: 0, fontSize: 12.5, color: 'var(--foreground)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{notas}</p>
        : <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>Sin notas para este sector.</p>}
    </div>
  );
}

const claveFecha = f => { const [dd, hh] = (f || '').split(' '); const [d, m, y] = (dd || '').split('/'); return (y || '') + (m || '') + (d || '') + (hh || ''); };
function HistorialSector({ pol, grupos, trazas }) {
  const { Icon } = NSP;
  const G = id => grupos.find(g => g.id === id);
  const evs = [
    ...(pol.historial || []).map(e => ({ ...e })),
    ...trazas.filter(t => t.poligonoId === pol.id && t.cargado).map(t => ({ ev: 'track', grupoId: t.grupoId, fecha: t.cargado, agente: t.agente, etiqueta: t.etiqueta })),
  ].sort((a, b) => claveFecha(b.fecha).localeCompare(claveFecha(a.fecha)));
  const asistieron = [...new Set((pol.historial || []).filter(e => e.ev === 'asignado').map(e => e.grupoId))].map(G).filter(Boolean);
  const txt = e => { const g = G(e.grupoId), n = g ? g.nombre : 'Grupo'; return e.ev === 'asignado' ? n + ' asignado al sector' : e.ev === 'quitado' ? n + ' quitado del sector' : e.ev === 'replegado' ? n + ' se replegó y salió del sector' : 'Track cargado por ' + (e.agente || '—'); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={ovP}>Historial del sector</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Grupos que asistieron</span>
        {asistieron.length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{asistieron.map(g => <span key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 999, border: '1px solid ' + g.color + '66', background: g.color + '14', fontSize: 11.5, fontWeight: 600, color: 'var(--foreground)' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: g.color }}></span>{g.nombre}</span>)}</div>
          : <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Ningún grupo trabajó todavía en este sector.</span>}
      </div>
      {evs.length > 0 && <div style={{ display: 'flex', flexDirection: 'column' }}>
        {evs.map((e, i) => { const g = G(e.grupoId), c = g ? g.color : '#64748b'; return (
          <div key={i} style={{ display: 'flex', gap: 10, position: 'relative', paddingBottom: i < evs.length - 1 ? 12 : 0 }}>
            {i < evs.length - 1 && <span style={{ position: 'absolute', left: 10, top: 22, bottom: 0, width: 1, background: 'var(--border)' }}></span>}
            <span style={{ width: 21, height: 21, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c + '1f', color: c }}><Icon name={e.ev === 'track' ? 'upload' : e.ev === 'asignado' ? 'log-in' : 'log-out'} size={11} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.35 }}>{txt(e)}</p>
              <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--muted-foreground)' }}><span style={{ fontFamily: 'var(--font-data)' }}>{e.fecha}</span>{e.ev === 'track' ? ' · ' + (g ? g.nombre + ' · ' : '') + e.etiqueta : ''}</p>
            </div>
          </div>); })}
      </div>}
    </div>
  );
}

function NombreSector({ nombre, onSave }) {
  const { Button, TextField } = NSP;
  const [ed, setEd] = useStateP(false);
  const [v, setV] = useStateP(nombre);
  useEffectP(() => { setEd(false); setV(nombre); }, [nombre]);
  const ok = v.trim() && v.trim() !== nombre;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={ovP}>Nombre</p>
        {!ed && <Button variant="ghost" icon="pencil" onClick={() => setEd(true)}>Editar nombre</Button>}
      </div>
      {ed ? <>
        <TextField value={v} onChange={setV} onKeyDown={e => { if (e.key === 'Enter' && ok) onSave(v.trim()); if (e.key === 'Escape') { setEd(false); setV(nombre); } }} />
        <div style={{ display: 'flex', gap: 6 }}><Button icon="save" disabled={!ok} onClick={() => onSave(v.trim())}>Guardar nombre</Button><Button variant="ghost" onClick={() => { setEd(false); setV(nombre); }}>Cancelar</Button></div>
      </> : <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--foreground)', lineHeight: 1.5 }}>{nombre}</p>}
    </div>
  );
}

function PoligonoPanel({ pol, grupos, poligonos, trazas, onClose, onPatch, onAsignar, onQuitar, onSimularRepliegue, onCalcular, calculando, onEditGeom, onDelete, brechas, onToggleBrechas, onSelectTraza }) {
  const { StatusBadge, CoverageBar, Button, TextField, Icon, ESTADOS } = NSP;
  const [nombre, setNombre] = useStateP(pol.nombre);
  useEffectP(() => setNombre(pol.nombre), [pol.id]);
  const gr = grupos.find(g => g.id === pol.grupoId), color = gr ? gr.color : '#475569';
  const tz = trazas.filter(t => t.poligonoId === pol.id);
  return (
    <DetailShell chip={iconChip('pentagon', color)} title={pol.nombre} onClose={onClose}
      sub={'Área ' + window.Geo.fmtArea(window.Geo.area(pol.vertices)) + ' · Perímetro ' + window.Geo.fmtKm(window.Geo.length(pol.vertices, true))}
      footer={<><Button variant="muted" icon="spline" onClick={onEditGeom} style={{ flex: 1 }}>Editar geometría</Button>{delBtn(onDelete)}</>}>
      <NombreSector key={'nombre-' + pol.id} nombre={pol.nombre} onSave={nombre => onPatch({ nombre })} />
      <GrupoAsignado pol={pol} grupos={grupos} poligonos={poligonos} onAsignar={onAsignar} onQuitar={onQuitar} onSimularRepliegue={onSimularRepliegue} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={ovP}>Cobertura por GPX</p>
        {pol.cobertura ? <>
          <CoverageBar value={pol.cobertura.pct} label="" />
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-foreground)' }}>{window.Geo.fmtKm(pol.cobertura.kmDentro * 1000)} recorridos dentro del sector · {pol.cobertura.gaps.length} celdas sin cubrir · calculado {pol.cobertura.hora}</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--foreground)', cursor: 'pointer' }}><input type="checkbox" checked={brechas} onChange={onToggleBrechas} style={{ accentColor: 'var(--primary)', margin: 0 }} />Mostrar brechas en el mapa</label>
          <div><Button variant="muted" icon="refresh-cw" onClick={onCalcular} disabled={calculando || !tz.length}>{calculando ? 'Calculando…' : 'Recalcular'}</Button></div>
        </> : <>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>{tz.length ? 'Cruza los tracks GPX con el área del sector y marca las zonas que quedaron sin recorrer.' : 'Este sector todavía no tiene tracks GPX asociados.'}</p>
          <div><Button icon={calculando ? 'loader-circle' : 'scan'} onClick={onCalcular} disabled={calculando || !tz.length}>{calculando ? 'Calculando…' : 'Calcular cobertura'}</Button></div>
        </>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={ovP}>Tracks en este sector · {tz.length}</p>
        {tz.map(t => <button key={t.id} type="button" onClick={() => onSelectTraza(t)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-family-primary)', textAlign: 'left' }}>
          <Icon name="route" size={13} color={color} /><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{t.etiqueta}</span>{t.agente && <span style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-foreground)' }}>Cargado por {t.agente}</span>}</span><span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{window.Geo.fmtKm(window.Geo.length(t.puntos))}</span>
        </button>)}
      </div>
      <NotasSector key={'notas-' + pol.id} notas={pol.notas} onSave={notas => onPatch({ notas })} />
      <HistorialSector pol={pol} grupos={grupos} trazas={trazas} />
    </DetailShell>
  );
}

function TrazaPanel({ t, grupos, poligonos, onClose, onSave, onDelete }) {
  const { TextField, SelectField, Button } = NSP;
  const [f, setF] = useStateP(t);
  useEffectP(() => setF(t), [t.id]);
  const gr = grupos.find(g => g.id === f.grupoId), color = gr ? gr.color : '#444140';
  const dirty = ['etiqueta', 'grupoId', 'poligonoId', 'fecha', 'notas'].some(k => f[k] !== t[k]);
  return (
    <DetailShell chip={iconChip('route', color)} title={t.etiqueta} badge={pill('Track GPX · ' + t.archivo, color)} onClose={onClose} sub={'Inicio ' + window.Geo.fmtCoord(t.puntos[0][0], t.puntos[0][1])}
      footer={<><Button size="md" icon="save" disabled={!dirty} onClick={() => onSave(f)} style={{ flex: 1 }}>Guardar cambios</Button>{delBtn(onDelete)}</>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius)', background: 'var(--muted)' }}>
        <NSP.Icon name="user-round" size={15} color="var(--muted-foreground)" />
        <div><p style={ovP}>Cargado por</p><p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{t.agente || '—'}{t.cargado && <span style={{ fontWeight: 400, color: 'var(--muted-foreground)', fontFamily: 'var(--font-data)', fontSize: 11.5 }}> · {t.cargado}</span>}</p></div>
      </div>
      <TextField overline label="Etiqueta" value={f.etiqueta} onChange={v => setF({ ...f, etiqueta: v })} />
      <SelectField overline label="Grupo" value={f.grupoId || ''} onChange={v => setF({ ...f, grupoId: v || null })} options={[{ value: '', label: '— Sin grupo —' }, ...grupos.map(g => ({ value: g.id, label: g.nombre }))]} />
      <SelectField overline label="Sector" value={f.poligonoId || ''} onChange={v => setF({ ...f, poligonoId: v || null })} options={[{ value: '', label: '— Fuera de sector —' }, ...poligonos.map(p => ({ value: p.id, label: p.nombre }))]} />
      <TextField overline label="Fecha" type="date" value={f.fecha} onChange={v => setF({ ...f, fecha: v })} />
      <TextField overline label="Notas" multiline rows={3} value={f.notas} onChange={v => setF({ ...f, notas: v })} placeholder="Observaciones del líder sobre el recorrido…" />
    </DetailShell>
  );
}

function PuntoPanel({ p, onClose, onSave, onDelete }) {
  const { TextField, Button, Icon, MapMarker, TIPOS_MARCADOR } = NSP;
  const [f, setF] = useStateP(p);
  useEffectP(() => setF(p), [p.id]);
  const c = TIPOS_MARCADOR[f.tipo];
  const dirty = ['tipo', 'nombre', 'descripcion', 'detalle'].some(k => f[k] !== p[k]);
  return (
    <DetailShell chip={<MapMarker tipo={f.tipo} variant="chip" />} title={f.nombre || 'Sin nombre'} badge={pill(c.label, c.color)} onClose={onClose} sub={window.Geo.fmtCoord(p.lat, p.lng)}
      footer={<><Button size="md" icon="save" disabled={!dirty} onClick={() => onSave(f)} style={{ flex: 1 }}>Guardar cambios</Button>{delBtn(onDelete)}</>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={ovP}>Tipo</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {['poi', 'hallazgo'].map(tp => { const k = TIPOS_MARCADOR[tp], on = f.tipo === tp; return <button key={tp} type="button" onClick={() => setF({ ...f, tipo: tp })} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: on ? '1.5px solid ' + k.color : '1.5px solid var(--border)', background: on ? k.bg : 'transparent', color: on ? k.color : 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 12, fontWeight: 600 }}><Icon name={k.icon} size={13} />{k.label}</button>; })}
        </div>
      </div>
      <TextField overline label="Nombre" value={f.nombre} onChange={v => setF({ ...f, nombre: v })} />
      <TextField overline label="Descripción" value={f.descripcion} onChange={v => setF({ ...f, descripcion: v })} placeholder="Descripción breve…" />
      <TextField overline label="Detalle / Notas de pista" multiline rows={5} value={f.detalle} onChange={v => setF({ ...f, detalle: v })} placeholder="Ingresá información detallada: condiciones del lugar, evidencias encontradas, observaciones, hora de hallazgo…" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={ovP}>Fotos de pista</p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 22, borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border)', background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
          <Icon name="image-off" size={26} style={{ opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: 12, textAlign: 'center' }}>Sin fotos cargadas.<br />Hacé clic o arrastrá imágenes aquí</p>
        </div>
      </div>
    </DetailShell>
  );
}

function TipoSciGrid({ value, onChange }) {
  const { MapMarker, TIPOS_MARCADOR, TIPOS_SCI } = NSP;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {TIPOS_SCI.map(tp => { const on = value === tp; return (
        <button key={tp} type="button" onClick={() => onChange(tp)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', border: on ? '1.5px solid #2563eb' : '1.5px solid var(--border)', background: on ? '#dbeafe' : 'transparent', color: on ? '#1d4ed8' : 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 11.5, fontWeight: 600, lineHeight: 1.2 }}>
          <MapMarker tipo={tp} variant="mini" />{TIPOS_MARCADOR[tp].label}
        </button>); })}
    </div>
  );
}

function InstalacionPanel({ i, onClose, onSave, onReubicar, onDelete }) {
  const { TextField, Button, MapMarker, TIPOS_MARCADOR } = NSP;
  const [f, setF] = useStateP(i);
  useEffectP(() => setF(i), [i.id, i.lat, i.lng]);
  const dirty = ['tipo', 'nombre', 'notas', 'responsable'].some(k => f[k] !== i[k]);
  return (
    <DetailShell chip={<MapMarker tipo={f.tipo} variant="chip" />} title={f.nombre || 'Sin nombre'} badge={pill('Instalación SCI · ' + TIPOS_MARCADOR[f.tipo].glyph, '#2563eb')} onClose={onClose} sub={window.Geo.fmtCoord(i.lat, i.lng)}
      footer={<><Button size="md" icon="save" disabled={!dirty} onClick={() => onSave(f)} style={{ flex: 1 }}>Guardar cambios</Button>{delBtn(onDelete)}</>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><p style={ovP}>Tipo de instalación</p><TipoSciGrid value={f.tipo} onChange={tp => setF({ ...f, tipo: tp })} /></div>
      <TextField overline label="Nombre" value={f.nombre} onChange={v => setF({ ...f, nombre: v })} />
      <TextField overline label="Responsable" value={f.responsable} onChange={v => setF({ ...f, responsable: v })} placeholder="Quién está a cargo" />
      <TextField overline label="Notas" multiline rows={3} value={f.notas} onChange={v => setF({ ...f, notas: v })} placeholder="Accesos, recursos disponibles, frecuencia de radio…" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={ovP}>Ubicación</p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>Si la instalación se trasladó, reubicala en el mapa. El cambio queda en la auditoría del operativo.</p>
        <div><Button variant="outline" icon="move" onClick={onReubicar}>Reubicar en el mapa</Button></div>
      </div>
    </DetailShell>
  );
}

function PuntoCeroPanel({ pc, onClose, onMover }) {
  const { Button, MapMarker } = NSP;
  return (
    <DetailShell chip={<MapMarker tipo="puntoCero" variant="chip" />} title="Punto Cero (LSP)" badge={pill('Último punto de avistamiento', NSP.TIPOS_MARCADOR.puntoCero.color)} onClose={onClose} sub={window.Geo.fmtCoord(pc.lat, pc.lng)}
      footer={<Button size="md" icon="crosshair" onClick={onMover} fullWidth>Actualizar Punto Cero</Button>}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6 }}>{pc.descripcion}</p>
      <div><p style={ovP}>Última actualización</p><p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--foreground)' }}>{pc.actualizado}</p></div>
      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-foreground)' }}>Es el centro del operativo: el clima y las distancias se toman desde este punto.</p>
    </DetailShell>
  );
}

function NuevaInstalacionModal({ ll, onCancel, onSave }) {
  const { Modal, Button, TextField, TIPOS_MARCADOR } = NSP;
  const [tipo, setTipo] = useStateP('base');
  const [nombre, setNombre] = useStateP(TIPOS_MARCADOR.base.label);
  const [tocado, setTocado] = useStateP(false);
  const [responsable, setResponsable] = useStateP('');
  const [notas, setNotas] = useStateP('');
  const elegir = tp => { setTipo(tp); if (!tocado) setNombre(TIPOS_MARCADOR[tp].label); };
  return (
    <Modal title="Nueva instalación" subtitle={'Sistema de Comando de Incidentes · ' + window.Geo.fmtCoord(ll[0], ll[1])} icon="flag" onClose={onCancel}
      footer={<><Button variant="outline" size="md" onClick={onCancel}>Cancelar</Button><Button size="md" icon="check" disabled={!nombre.trim()} onClick={() => onSave({ tipo, nombre: nombre.trim(), responsable, notas })}>Guardar instalación</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>Tipo *</span><TipoSciGrid value={tipo} onChange={elegir} /></div>
        <TextField label="Nombre" required value={nombre} onChange={v => { setNombre(v); setTocado(true); }} />
        <TextField label="Responsable" value={responsable} onChange={setResponsable} placeholder="Quién está a cargo" />
        <TextField label="Notas" multiline rows={3} value={notas} onChange={setNotas} placeholder="Accesos, recursos disponibles, frecuencia de radio…" />
      </div>
    </Modal>
  );
}

Object.assign(window, { PoligonoPanel, TrazaPanel, PuntoPanel, InstalacionPanel, PuntoCeroPanel, NuevaInstalacionModal });
