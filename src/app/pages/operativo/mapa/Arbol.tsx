/**
 * Panel izquierdo «Gestión del mapa» (CU-33), al estilo Google Earth: buscador
 * y árbol por secciones (radios, polígonos, marcadores, tracks, ajustes), con
 * casillas para mostrar u ocultar cada sección y cada elemento.
 */
import { Fragment, useEffect, useState } from 'react';
import {
  Layers, ChevronLeft, ChevronRight, Search, X, CircleDot, Pentagon, MapPin, Route, Settings, Tag, Scan, PencilRuler,
  ZoomIn, List, LocateFixed, Ruler, Users, Upload, Plus,
} from 'lucide-react';
import type { MarcadorApi, RadioApi } from '../../../services/api';
import { SeccionArbol, FilaArbol, Simbolo } from './piezas';
import { fmtCoord, fmtRadio, type LatLng } from './geo';
import { PALETA_RADIOS, fechaCorta, type PoligonoVista, type TrackVista } from './modelo';
import type { Overlays } from './Lienzo';

export type Abiertas = { radios: boolean; poligonos: boolean; marcadores: boolean; tracks: boolean; ajustes: boolean };

const chk = { accentColor: 'var(--primary)', margin: 0, width: 14, height: 14, flexShrink: 0, cursor: 'pointer' } as const;
const kmTexto = (m: number) => String(m / 1000).replace('.', ',');
const ATAJOS_M = [500, 1000, 2000, 3000, 5000, 10000];

function FilaRadio({ r, visible, soloLectura, onVisible, onCambiar, onQuitar }: {
  r: RadioApi; visible: boolean; soloLectura: boolean; onVisible: () => void;
  onCambiar: (d: { radioM?: number; color?: string }) => void; onQuitar: () => void;
}) {
  const [v, setV] = useState(kmTexto(r.radioM));
  useEffect(() => setV(kmTexto(r.radioM)), [r.radioM]);
  const confirmar = () => {
    const n = Math.round(parseFloat(v.replace(',', '.')) * 1000);
    if (Number.isFinite(n) && n >= 50 && n <= 100000 && n !== r.radioM) onCambiar({ radioM: n });
    else setV(kmTexto(r.radioM));
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 'var(--radius-sm)', opacity: visible ? 1 : 0.55 }}>
      <input type="checkbox" checked={visible} onChange={onVisible} style={chk} aria-label={`Mostrar el radio de ${fmtRadio(r.radioM)}`} />
      <button type="button" title="Cambiar color" aria-label="Cambiar color" disabled={soloLectura}
        onClick={() => onCambiar({ color: PALETA_RADIOS[(PALETA_RADIOS.indexOf(r.color) + 1) % PALETA_RADIOS.length] })}
        style={{ width: 15, height: 15, borderRadius: '50%', border: `2px solid ${r.color}`, background: `${r.color}2e`, padding: 0, cursor: soloLectura ? 'default' : 'pointer', flexShrink: 0, boxSizing: 'border-box' }} />
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: 'var(--foreground)' }}>Radio</span>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--input-background)' }}>
        <input value={v} inputMode="decimal" readOnly={soloLectura} aria-label="Kilómetros del radio"
          onChange={e => setV(e.target.value)} onBlur={confirmar} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          style={{ width: 36, border: 'none', outline: 'none', background: 'transparent', textAlign: 'right', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 12.5, fontWeight: 600, padding: 0 }} />
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>km</span>
      </label>
      {!soloLectura && (
        <button type="button" title="Quitar radio" aria-label="Quitar radio" onClick={onQuitar} style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><X size={13} /></button>
      )}
    </div>
  );
}

interface Props {
  q: string; setQ: (v: string) => void;
  abiertas: Abiertas; setAbiertas: (f: (a: Abiertas) => Abiertas) => void;
  overlays: Overlays; setOv: (k: keyof Overlays, v: boolean) => void;
  ocultos: Set<string>; alternar: (id: string) => void; mostrar: (ids: string[], v: boolean) => void;
  radios: RadioApi[]; puntoCero: LatLng | null;
  poligonos: PoligonoVista[]; tracks: TrackVista[]; marcadores: MarcadorApi[];
  esSel: (clave: string) => boolean;
  soloLectura: boolean;
  actualizado: string | null;
  onPoligono: (p: PoligonoVista) => void; onTrack: (t: TrackVista) => void; onMarcador: (m: MarcadorApi) => void; onPuntoCero: () => void;
  onAgregarRadio: (m: number) => void; onRadio: (id: string, d: { radioM?: number; color?: string }) => void; onQuitarRadio: (r: RadioApi) => void;
  onCargarGpx: () => void; onRestablecer: () => void; onCerrar: () => void;
}

export default function Arbol(p: Props) {
  const { q, overlays, setOv, ocultos } = p;
  const [otro, setOtro] = useState<string | null>(null);
  const [cerrados, setCerrados] = useState<Record<string, boolean>>({});
  const coincide = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
  const visible = (id: string) => !ocultos.has(id);

  const fPols = p.poligonos.filter(x => coincide(x.nombre));
  const fTr = p.tracks.filter(x => coincide(`${x.agente} ${x.archivoNombre} ${x.poligonoNombre ?? ''}`));
  const inst = p.marcadores.filter(m => m.clase === 'INSTALACION');
  const hall = p.marcadores.filter(m => m.clase === 'HALLAZGO');
  const poi = p.marcadores.filter(m => m.clase === 'POI');
  const fInst = inst.filter(x => coincide(x.nombre)), fHal = hall.filter(x => coincide(x.nombre)), fPoi = poi.filter(x => coincide(x.nombre));
  const verP0 = !!p.puntoCero && coincide('Punto Cero LSP');
  const nMarc = p.marcadores.length + (p.puntoCero ? 1 : 0);
  const abierta = (k: keyof Abiertas, n: number) => (q ? n > 0 : p.abiertas[k]);
  const tog = (k: keyof Abiertas) => (v: boolean) => p.setAbiertas(a => ({ ...a, [k]: v }));
  const porPoligono = [
    ...p.poligonos.map(pl => ({ id: pl.id, nombre: pl.nombre, color: pl.color, items: fTr.filter(t => t.poligonoId === pl.id) })),
    { id: '_fuera', nombre: 'Fuera de polígono', color: '#94a3b8', items: fTr.filter(t => !t.poligonoId || !p.poligonos.some(pl => pl.id === t.poligonoId)) },
  ].filter(b => b.items.length);
  const vacio = (txt: string) => <p style={{ margin: '4px 8px', fontSize: 11.5, color: 'var(--muted-foreground)' }}>{txt}</p>;
  const grupoMarc = (k: 'instalaciones' | 'hallazgos' | 'poi') => (v: boolean) => { if (v && !overlays.marcadores) setOv('marcadores', true); setOv(k, v); };
  const hijo = (k: 'instalaciones' | 'hallazgos' | 'poi', id: string) => () => {
    if (!overlays.marcadores || !overlays[k]) { setOv('marcadores', true); setOv(k, true); if (!visible(id)) p.alternar(id); }
    else p.alternar(id);
  };
  const subMarcado = (k: 'instalaciones' | 'hallazgos' | 'poi', id: string) => overlays.marcadores && overlays[k] && visible(id);
  const agregarOtro = () => {
    const n = Math.round(parseFloat((otro ?? '').replace(',', '.')) * 1000);
    if (Number.isFinite(n) && n >= 50 && n <= 100000) { p.onAgregarRadio(n); setOtro(null); }
  };

  return (
    <div style={{ width: 320, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--card)', borderRight: '1px solid var(--border)', fontFamily: 'var(--font-family-primary)', position: 'relative', zIndex: 2 }}>
      <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Layers size={15} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.3 }}>Gestión del mapa</p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)' }}>{p.poligonos.length} polígonos · {p.tracks.length} tracks · {nMarc} marcadores</p>
          </div>
          <button type="button" onClick={p.onCerrar} title="Ocultar panel" aria-label="Ocultar panel" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><ChevronLeft size={17} /></button>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--input-background)' }}>
          <Search size={14} color="var(--muted-foreground)" />
          <input value={q} onChange={e => p.setQ(e.target.value)} placeholder="Buscar polígonos, tracks, marcadores…" aria-label="Buscar en el mapa"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--foreground)', fontFamily: 'var(--font-family-primary)', fontSize: 12.5 }} />
          {q && <button type="button" onClick={() => p.setQ('')} aria-label="Borrar búsqueda" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><X size={13} /></button>}
        </label>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {!q && (
          <SeccionArbol titulo="Radios desde Punto Cero" icono={CircleDot} insignia={`${p.radios.filter(r => visible(r.id)).length}/${p.radios.length}`}
            abierta={p.abiertas.radios} onToggle={tog('radios')} marcada={overlays.radios} onMarcar={v => setOv('radios', v)}>
            {p.puntoCero && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 8px 6px' }}>
                <Simbolo tipo="puntoCero" />
                <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-mono, monospace)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Centro {fmtCoord(p.puntoCero[0], p.puntoCero[1])}</span>
              </div>
            )}
            {p.radios.map(r => (
              <FilaRadio key={r.id} r={r} visible={visible(r.id)} soloLectura={p.soloLectura} onVisible={() => p.alternar(r.id)}
                onCambiar={d => p.onRadio(r.id, d)} onQuitar={() => p.onQuitarRadio(r)} />
            ))}
            {!p.radios.length && vacio('Sin radios. Agregá uno para guiarte desde el Punto Cero.')}
            {!p.soloLectura && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, rowGap: 6, flexWrap: 'wrap', padding: '8px 8px 0' }}>
                <span style={{ flexBasis: '100%', fontSize: 11, color: 'var(--muted-foreground)' }}>Agregar</span>
                {ATAJOS_M.map(m => {
                  const ya = p.radios.some(r => r.radioM === m);
                  return (
                    <button key={m} type="button" disabled={ya} onClick={() => p.onAgregarRadio(m)} style={{ whiteSpace: 'nowrap', padding: '2px 8px', borderRadius: 999, border: '1.5px solid var(--border)', background: 'transparent', color: ya ? 'var(--muted-foreground)' : 'var(--foreground)', opacity: ya ? 0.45 : 1, cursor: ya ? 'default' : 'pointer', fontFamily: 'var(--font-family-primary)', fontSize: 11, fontWeight: 600 }}>{fmtRadio(m)}</button>
                  );
                })}
                {otro === null ? (
                  <button type="button" onClick={() => setOtro('')} style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 999, border: '1.5px solid color-mix(in srgb, var(--primary) 35%, transparent)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'var(--font-family-primary)', fontSize: 11, fontWeight: 600 }}><Plus size={11} />Otro</button>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input autoFocus value={otro} inputMode="decimal" placeholder="km" aria-label="Kilómetros del radio nuevo" onChange={e => setOtro(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') agregarOtro(); if (e.key === 'Escape') setOtro(null); }}
                      style={{ width: 48, padding: '2px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--input-background)', color: 'var(--foreground)', fontSize: 11.5 }} />
                    <button type="button" onClick={agregarOtro} style={{ padding: '2px 8px', borderRadius: 999, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Agregar</button>
                    <button type="button" aria-label="Cancelar" onClick={() => setOtro(null)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted-foreground)', cursor: 'pointer', display: 'flex' }}><X size={12} /></button>
                  </span>
                )}
              </div>
            )}
            <p style={{ margin: '8px 8px 0', fontSize: 10.5, color: 'var(--muted-foreground)', lineHeight: 1.45 }}>Son del operativo: todos los coordinadores ven los mismos. Siguen al Punto Cero y quedan debajo de los polígonos. Ocultarlos es sólo en tu pantalla.</p>
          </SeccionArbol>
        )}

        <SeccionArbol titulo="Polígonos" icono={Pentagon} insignia={p.poligonos.length} abierta={abierta('poligonos', fPols.length)} onToggle={tog('poligonos')} marcada={overlays.poligonos} onMarcar={v => setOv('poligonos', v)}>
          {fPols.map(x => (
            <FilaArbol key={x.id} marcada={visible(x.id)} onMarcar={() => p.alternar(x.id)}
              muestra={<span style={{ width: 12, height: 12, borderRadius: 3, background: `${x.color}40`, border: `1.5px ${x.grupos.length ? 'solid' : 'dashed'} ${x.color}`, flexShrink: 0, boxSizing: 'border-box' }} />}
              etiqueta={x.nombre} seleccionada={p.esSel(`poligono:${x.id}`)} onClick={() => p.onPoligono(x)}
              meta={x.tracks ? `${x.coberturaPct.toLocaleString('es-AR', { maximumFractionDigits: x.coberturaPct < 10 ? 1 : 0 })} %` : null} />
          ))}
          {!fPols.length && vacio(q ? 'Sin coincidencias.' : 'Todavía no hay polígonos dibujados.')}
        </SeccionArbol>

        <SeccionArbol titulo="Marcadores tácticos / POI" icono={MapPin} insignia={nMarc} abierta={abierta('marcadores', fInst.length + fHal.length + fPoi.length + (verP0 ? 1 : 0))} onToggle={tog('marcadores')} marcada={overlays.marcadores} onMarcar={v => setOv('marcadores', v)}>
          {verP0 && <FilaArbol marcada={overlays.marcadores && overlays.puntoCero} onMarcar={v => { if (v && !overlays.marcadores) setOv('marcadores', true); setOv('puntoCero', v); }} muestra={<Simbolo tipo="puntoCero" />} etiqueta="Punto Cero (LSP)" seleccionada={p.esSel('puntoCero:p0')} onClick={p.onPuntoCero} />}
          {(!q || fInst.length > 0) && <FilaArbol fuerte etiqueta="Instalaciones SCI" marcada={overlays.marcadores && overlays.instalaciones} onMarcar={grupoMarc('instalaciones')} meta={inst.length} />}
          {fInst.map(i => <FilaArbol key={i.id} sangria={1} marcada={subMarcado('instalaciones', i.id)} onMarcar={hijo('instalaciones', i.id)} muestra={<Simbolo tipo={i.tipoInstalacion!} />} etiqueta={i.nombre} seleccionada={p.esSel(`marcador:${i.id}`)} onClick={() => p.onMarcador(i)} />)}
          {(!q || fHal.length > 0) && <FilaArbol fuerte etiqueta="Hallazgos" marcada={overlays.marcadores && overlays.hallazgos} onMarcar={grupoMarc('hallazgos')} meta={hall.length} />}
          {fHal.map(x => <FilaArbol key={x.id} sangria={1} marcada={subMarcado('hallazgos', x.id)} onMarcar={hijo('hallazgos', x.id)} muestra={<Simbolo tipo="HALLAZGO" />} etiqueta={x.nombre} seleccionada={p.esSel(`marcador:${x.id}`)} onClick={() => p.onMarcador(x)} />)}
          {(!q || fPoi.length > 0) && <FilaArbol fuerte etiqueta="Puntos de interés" marcada={overlays.marcadores && overlays.poi} onMarcar={grupoMarc('poi')} meta={poi.length} />}
          {fPoi.map(x => <FilaArbol key={x.id} sangria={1} marcada={subMarcado('poi', x.id)} onMarcar={hijo('poi', x.id)} muestra={<Simbolo tipo="POI" />} etiqueta={x.nombre} seleccionada={p.esSel(`marcador:${x.id}`)} onClick={() => p.onMarcador(x)} />)}
        </SeccionArbol>

        <SeccionArbol titulo="Trazabilidad y tracks GPX" icono={Route} insignia={p.tracks.length} abierta={abierta('tracks', fTr.length)} onToggle={tog('tracks')} marcada={overlays.trazas} onMarcar={v => setOv('trazas', v)}>
          {porPoligono.map(b => {
            const abierto = !!q || !cerrados[b.id];
            const todos = b.items.every(t => visible(t.id));
            const I = b.id === '_fuera' ? Route : Pentagon;
            return (
              <Fragment key={b.id}>
                <FilaArbol marcada={todos} onMarcar={v => p.mostrar(b.items.map(t => t.id), v)} onClick={() => setCerrados(c => ({ ...c, [b.id]: !c[b.id] }))}
                  muestra={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ChevronRight size={12} color="var(--muted-foreground)" style={{ transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} /><I size={13} color={b.color} /></span>}
                  etiqueta={<span style={{ fontWeight: 600 }}>{b.nombre}</span>} />
                {abierto && b.items.map(t => (
                  <FilaArbol key={t.id} sangria={1} marcada={visible(t.id)} onMarcar={() => p.alternar(t.id)}
                    muestra={<span style={{ width: 14, height: 3, borderRadius: 2, background: t.color, flexShrink: 0 }} />}
                    etiqueta={t.agente} meta={t.inicio ? fechaCorta(t.inicio) : 'sin horas'} seleccionada={p.esSel(`track:${t.id}`)} onClick={() => p.onTrack(t)} />
                ))}
              </Fragment>
            );
          })}
          {!fTr.length && vacio(q ? 'Sin coincidencias.' : 'Sin tracks cargados.')}
          {!q && !p.soloLectura && (
            <button type="button" onClick={p.onCargarGpx} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 8px 0', padding: 0, background: 'none', border: 'none', color: 'var(--primary)', fontFamily: 'var(--font-family-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><Upload size={13} />Cargar archivo GPX</button>
          )}
        </SeccionArbol>

        {!q && (
          <SeccionArbol titulo="Ajustes de mapa" icono={Settings} abierta={p.abiertas.ajustes} onToggle={tog('ajustes')}>
            <FilaArbol fuerte etiqueta="Superposiciones" />
            <FilaArbol sangria={1} marcada={overlays.etiquetas} onMarcar={v => setOv('etiquetas', v)} muestra={<Tag size={13} color="var(--muted-foreground)" />} etiqueta="Etiquetas de polígonos" />
            <FilaArbol sangria={1} marcada={overlays.brechas} onMarcar={v => setOv('brechas', v)} muestra={<Scan size={13} color="#dc2626" />} etiqueta="Análisis de brechas" meta={p.poligonos.filter(x => x.brechas).length || null} />
            <FilaArbol fuerte etiqueta="Ventanas del mapa" />
            <FilaArbol sangria={1} marcada={overlays.herramientas} onMarcar={v => setOv('herramientas', v)} muestra={<PencilRuler size={13} color="var(--muted-foreground)" />} etiqueta="Herramientas" />
            <FilaArbol sangria={1} marcada={overlays.zoom} onMarcar={v => setOv('zoom', v)} muestra={<ZoomIn size={13} color="var(--muted-foreground)" />} etiqueta="Zoom y vista" />
            <FilaArbol sangria={1} marcada={overlays.leyenda} onMarcar={v => setOv('leyenda', v)} muestra={<List size={13} color="var(--muted-foreground)" />} etiqueta="Simbología táctica" />
            <FilaArbol sangria={1} marcada={overlays.coords} onMarcar={v => setOv('coords', v)} muestra={<LocateFixed size={13} color="var(--muted-foreground)" />} etiqueta="Lat / Long / Elevación" />
            <FilaArbol sangria={1} marcada={overlays.escala} onMarcar={v => setOv('escala', v)} muestra={<Ruler size={13} color="var(--muted-foreground)" />} etiqueta="Escala gráfica" />
            <FilaArbol sangria={1} marcada={overlays.gruposFlot} onMarcar={v => setOv('gruposFlot', v)} muestra={<Users size={13} color="var(--muted-foreground)" />} etiqueta="Grupos operativos" />
          </SeccionArbol>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.actualizado ? '#16a34a' : '#d97706' }} />
          {p.actualizado ? `Datos al día · ${p.actualizado}` : 'Sin conexión con el servidor'}
        </span>
        <button type="button" onClick={p.onRestablecer} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', fontFamily: 'var(--font-family-primary)', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>Restablecer vista</button>
      </div>
    </div>
  );
}

