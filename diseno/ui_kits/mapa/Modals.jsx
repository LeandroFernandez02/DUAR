/* Modales del mapa: nuevo polígono (CU-27), cargar GPX (CU-29), eliminar (CU-36), Punto Cero (CU-34). */
const { useState: useStateM, useRef: useRefM, useEffect: useEffectM } = React;
const NSM = window.DUARDiseOMapa_7e942c;

function NuevoPoligonoModal({ vertices, grupos, n, onCancel, onSave }) {
  const { Modal, Button, TextField, SelectField } = NSM;
  const [nombre, setNombre] = useStateM('Sector ' + n + ' — ');
  const [grupoId, setGrupoId] = useStateM('');
  const [notas, setNotas] = useStateM('');
  const [err, setErr] = useStateM(false);
  const guardar = () => { if (nombre.replace(/ — ?$/, '').trim().length < 3) { setErr(true); return; } onSave({ nombre: nombre.replace(/ — $/, ''), grupoId: grupoId || null, notas }); };
  return (
    <Modal title="Nuevo polígono" subtitle={'Sector de rastrillaje · ' + vertices.length + ' vértices · ' + window.Geo.fmtArea(window.Geo.area(vertices))} icon="pentagon" onClose={onCancel}
      footer={<><Button variant="outline" size="md" onClick={onCancel}>Cancelar</Button><Button size="md" icon="check" onClick={guardar}>Guardar polígono</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField label="Nombre" required value={nombre} onChange={v => { setNombre(v); setErr(false); }} />
        {err && <p style={{ margin: '-8px 0 0', fontSize: 12, color: 'var(--destructive)' }}>Ingresá un nombre para el polígono.</p>}
        <SelectField label="Asignar a grupo" value={grupoId} onChange={setGrupoId} options={[{ value: '', label: '— Asignar más tarde —' }, ...grupos.map(g => ({ value: g.id, label: g.nombre + ' · ' + g.integrantes + ' integrantes' }))]} />
        <TextField label="Notas" multiline rows={3} value={notas} onChange={setNotas} placeholder="Tipo de terreno, accesos, riesgos…" />
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>{grupoId ? 'El polígono queda en estado Asignado y el grupo pasa a Asignado.' : 'El polígono queda en estado Pendiente hasta que le asignes un grupo.'}</p>
      </div>
    </Modal>
  );
}

function parseGpx(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const pts = [...doc.querySelectorAll('trkpt, rtept')].map(n => [parseFloat(n.getAttribute('lat')), parseFloat(n.getAttribute('lon'))]).filter(p => !isNaN(p[0]));
  const name = (doc.querySelector('trk > name, metadata > name') || {}).textContent;
  const tiempos = [...doc.querySelectorAll('trkpt > time, rtept > time')].map(n => n.textContent.trim()).filter(Boolean);
  return { pts, name, inicio: tiempos[0] || null, fin: tiempos[tiempos.length - 1] || null };
}

function GpxModal({ grupos, poligonos, onCancel, onUpload }) {
  const { Modal, Button, TextField, SelectField, Icon } = NSM;
  const fileRef = useRefM(null);
  const [archivo, setArchivo] = useStateM(null);
  const [err, setErr] = useStateM('');
  const [etiqueta, setEtiqueta] = useStateM('');
  const todos = grupos.flatMap(g => (g.agentes || []).map(a => ({ ...a, grupoId: g.id, grupo: g })));
  const [agenteDni, setAgenteDni] = useStateM('');
  const [qa, setQa] = useStateM('');
  const [lista, setLista] = useStateM(false);
  const agente = todos.find(a => a.dni === agenteDni);
  const grupo = agente && agente.grupo;
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const sugeridos = todos.filter(a => !qa.trim() || norm(a.nombre + ' ' + a.dni + ' ' + a.grupo.nombre + ' ' + a.dotacion).includes(norm(qa.trim()))).slice(0, 8);
  const detectar = pts => {
    const c = poligonos.map(p => ({ p, n: pts.filter(x => window.Geo.inside(x, p.vertices)).length })).sort((a, b) => b.n - a.n)[0];
    return c && c.n / pts.length >= 0.3 ? { pol: c.p, pct: Math.round(c.n / pts.length * 100) } : { pol: null, pct: 0 };
  };
  const sector = archivo ? detectar(archivo.pts) : null;
  const [poligonoId, setPoligonoId] = useStateM('');
  const [fecha, setFecha] = useStateM('2026-03-02');
  const [over, setOver] = useStateM(false);

  const cargar = file => {
    if (!file) return;
    if (!/\.gpx$/i.test(file.name)) { setErr('El archivo tiene que ser .gpx'); return; }
    file.text().then(t => {
      const { pts, name, inicio, fin } = parseGpx(t);
      if (pts.length < 2) { setErr('No se encontraron puntos de recorrido en el archivo.'); return; }
      setErr(''); setArchivo({ nombre: file.name, pts, inicio, fin }); if (!etiqueta) setEtiqueta(name || file.name.replace(/\.gpx$/i, ''));
    });
  };
  const ejemplo = () => {
    const pol = poligonos.find(p => p.id === poligonoId) || poligonos.find(p => p.grupoId) || poligonos[0];
    const pts = window.MapaData.barrido(pol.vertices.map(v => [v[0] - 0.0035, v[1]]), 0.45, 16, 17).filter(p => window.Geo.inside(p, pol.vertices));
    setArchivo({ nombre: 'bravo_0203_pm.gpx', pts, inicio: '2026-03-02T14:20:05', fin: '2026-03-02T17:02:44' }); setErr('');
    if (!agenteDni && pol.grupoId) { const g = grupos.find(x => x.id === pol.grupoId); if (g && g.agentes) setAgenteDni(g.agentes[0].dni); } if (!etiqueta) setEtiqueta('Bravo — Tarde');
  };
  return (
    <Modal title="Cargar traza GPX" subtitle="Archivo exportado desde Wikiloc u otro GPS" icon="route" onClose={onCancel} width={540}
      footer={<><Button variant="outline" size="md" onClick={onCancel}>Cancelar</Button><Button size="md" icon="upload" disabled={!archivo || !agente} onClick={() => onUpload({ archivo: archivo.nombre, puntos: archivo.pts, inicio: archivo.inicio, fin: archivo.fin, etiqueta: (etiqueta || archivo.nombre.replace(/\.gpx$/i, '')).trim(), grupoId: agente.grupoId, agente: agente.nombre, agenteDni: agente.dni, poligonoId: sector && sector.pol ? sector.pol.id : null, fecha })}>Cargar traza</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input ref={fileRef} type="file" accept=".gpx" style={{ display: 'none' }} onChange={e => cargar(e.target.files[0])} />
        {archivo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 'var(--radius)', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)' }}>
            <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, rgba(22,163,74,0.18) var(--tinte-oscuro, 0%), #dcfce7)', color: 'color-mix(in srgb, #86efac var(--tinte-oscuro, 0%), #15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="file-check" size={17} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{archivo.nombre}</p>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-foreground)' }}>{archivo.pts.length} puntos · {window.Geo.fmtKm(window.Geo.length(archivo.pts))}</p>
            </div>
            <Button variant="ghost" icon="x" onClick={() => setArchivo(null)}>Quitar</Button>
          </div>
        ) : (
          <div onClick={() => fileRef.current.click()} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); cargar(e.dataTransfer.files[0]); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '26px 16px', borderRadius: 'var(--radius-lg)', cursor: 'pointer', border: '2px dashed ' + (over ? 'var(--primary)' : 'var(--border)'), background: over ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : 'var(--muted)', color: 'var(--muted-foreground)' }}>
            <Icon name="file-up" size={28} style={{ opacity: 0.6 }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>Arrastrá el archivo .gpx o hacé clic para buscarlo</p>
            <p style={{ margin: 0, fontSize: 11.5 }}>Se lee el recorrido (trkpt) y se dibuja sobre el mapa</p>
            <button type="button" onClick={e => { e.stopPropagation(); ejemplo(); }} style={{ marginTop: 4, background: 'none', border: 'none', color: 'var(--primary)', fontFamily: 'var(--font-family-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Usar archivo de ejemplo</button>
          </div>
        )}
        {err && <p style={{ margin: '-6px 0 0', fontSize: 12, color: 'var(--destructive)' }}>{err}</p>}
        {sector && <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius)', marginTop: -4, background: sector.pol ? 'var(--muted)' : 'color-mix(in srgb, rgba(217,119,6,0.16) var(--tinte-oscuro, 0%), #fef3c7)', border: '1px solid ' + (sector.pol ? 'var(--border)' : 'color-mix(in srgb, rgba(217,119,6,0.5) var(--tinte-oscuro, 0%), #fcd34d)') }}>
          <Icon name={sector.pol ? 'pentagon' : 'triangle-alert'} size={15} color={sector.pol ? 'var(--primary)' : 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #b45309)'} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-foreground)' }}>Sector detectado por coordenadas</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: sector.pol ? 'var(--foreground)' : 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #92400e)' }}>{sector.pol ? sector.pol.nombre : 'Fuera de los sectores del operativo'}{sector.pol && <span style={{ fontWeight: 400, color: 'var(--muted-foreground)', fontSize: 11.5 }}> · {sector.pct}% del recorrido dentro</span>}</p>
          </div>
        </div>}
        <div style={{ position: 'relative' }}>
          {agente ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--foreground)', fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 1.5 }}>Agente *</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-input)', background: 'var(--input-background)', border: '1px solid var(--primary)' }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: grupo.color, color: '#fff' }}><Icon name="footprints" size={14} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{agente.nombre}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted-foreground)' }}><span style={{ fontFamily: 'var(--font-data)' }}>DNI {agente.dni}</span> · {grupo.nombre}{agente.lider ? ' (líder)' : ''} · {agente.dotacion}</p>
              </div>
              <Button variant="ghost" icon="x" onClick={() => { setAgenteDni(''); setQa(''); }}>Cambiar</Button>
            </div>
          </div> : <>
            <div onFocus={() => setLista(true)}><TextField label="Agente" required value={qa} onChange={v => { setQa(v); setLista(true); }} placeholder="Buscar agente asignado por nombre, DNI o grupo…" /></div>
            {lista && <>
              <div onClick={() => setLista(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }}></div>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 2, maxHeight: 240, overflowY: 'auto', padding: 4, borderRadius: 'var(--radius-md)', background: 'var(--popover)', border: '1px solid var(--border)', boxShadow: 'var(--elevation-md)' }}>
                {sugeridos.map(a => <button key={a.dni} type="button" onClick={() => { setAgenteDni(a.dni); setLista(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 8px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-family-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: a.grupo.color }}></span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500, color: 'var(--popover-foreground)' }}>{a.nombre}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{a.grupo.nombre} · <span style={{ fontFamily: 'var(--font-data)' }}>{a.dni}</span></span>
                </button>)}
                {!sugeridos.length && <p style={{ margin: 0, padding: '8px', fontSize: 12, color: 'var(--muted-foreground)' }}>Ningún agente asignado coincide con "{qa}".</p>}
              </div>
            </>}
          </>}
        </div>
      </div>
    </Modal>
  );
}

function EliminarModal({ tipo, nombre, extra, onCancel, onConfirm }) {
  const { Modal, Button, Icon } = NSM;
  return (
    <Modal title={'Eliminar ' + tipo} onClose={onCancel} width={440}
      footer={<><Button variant="outline" size="md" onClick={onCancel}>Cancelar</Button><Button variant="danger" size="md" icon="trash-2" onClick={onConfirm}>Eliminar</Button></>}>
      <div style={{ display: 'flex', gap: 12 }}>
        <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, rgba(220,38,38,0.18) var(--tinte-oscuro, 0%), #fee2e2)', color: 'color-mix(in srgb, #fca5a5 var(--tinte-oscuro, 0%), #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="triangle-alert" size={17} /></span>
        <div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--foreground)', lineHeight: 1.55 }}>¿Eliminar <strong>{nombre}</strong> del mapa?</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.55 }}>{extra || 'Deja de verse en el mapa. El registro queda en la auditoría del operativo.'}</p>
        </div>
      </div>
    </Modal>
  );
}

function PuntoCeroModal({ from, to, nRadios, onCancel, onConfirm, onChange }) {
  const { Modal, Button, TextField } = NSM;
  const [lat, setLat] = useStateM(String(to[0].toFixed(5)));
  const [lng, setLng] = useStateM(String(to[1].toFixed(5)));
  const num = s => parseFloat(String(s).replace(',', '.'));
  const la = num(lat), lo = num(lng);
  const ok = isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
  useEffectM(() => { if (ok) onChange([la, lo]); }, [lat, lng]);
  const d = ok ? window.Geo.length([[from.lat, from.lng], [la, lo]]) : 0;
  return (
    <Modal title="Actualizar Punto Cero" subtitle="Último punto de avistamiento (LSP)" icon="crosshair" onClose={onCancel} width={480}
      footer={<><Button variant="outline" size="md" onClick={onCancel}>Cancelar</Button><Button size="md" icon="check" disabled={!ok} onClick={() => onConfirm([la, lo])}>Confirmar punto</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--muted)', border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-foreground)' }}>Actual</p>
          <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-family-mono)', fontSize: 12, color: 'var(--foreground)' }}>{window.Geo.fmtCoord(from.lat, from.lng)}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <TextField overline label="Nueva latitud" value={lat} onChange={setLat} placeholder="-31.98120" />
          <TextField overline label="Nueva longitud" value={lng} onChange={setLng} placeholder="-64.92620" />
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: ok ? 'var(--muted-foreground)' : 'var(--destructive)', lineHeight: 1.55 }}>{ok ? <>El marcador se mueve {window.Geo.fmtKm(d)}. Todos los usuarios del operativo van a ver el nuevo centro de operaciones.{nRadios ? ` Los ${nRadios} radios se recentran en el nuevo punto (vista previa punteada en el mapa).` : ''}</> : 'Ingresá coordenadas válidas en grados decimales (latitud entre -90 y 90, longitud entre -180 y 180).'}</p>
      </div>
    </Modal>
  );
}

Object.assign(window, { NuevoPoligonoModal, GpxModal, EliminarModal, PuntoCeroModal });
