/**
 * Globos de información al hacer clic en un elemento del mapa (CU-33): track
 * (con perfil de elevación), punto de interés o hallazgo, instalación SCI y
 * Punto Cero.
 */
import { useState } from 'react';
import { Route, Pentagon, Pencil, Move, Crosshair, Trash2, ImageIcon } from 'lucide-react';
import type { MarcadorApi, MovimientoPuntoCeroApi } from '../../../services/api';
import { Boton, Globo, PerfilElevacion, Simbolo, SIMBOLOS, dato } from './piezas';
import { fmtCoord, fmtKm, perfil } from './geo';
import { duracion, fechaCorta, type TrackVista } from './modelo';

const fila = (l: string, v: React.ReactNode) => (
  <p style={{ margin: 0, fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>{l} <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{v}</span></p>
);

function BotonEliminar({ titulo, onClick }: { titulo: string; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button type="button" title={titulo} aria-label={titulo} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, marginLeft: 'auto', borderRadius: 'var(--radius-md)', border: 'none', background: h ? 'rgba(220,38,38,0.1)' : 'transparent', color: h ? '#dc2626' : 'var(--muted-foreground)', cursor: 'pointer' }}>
      <Trash2 size={15} />
    </button>
  );
}

export function GloboTrack({ t, soloLectura, onClose, onEliminar, onPoligono, onCorregir }: {
  t: TrackVista; soloLectura: boolean; onClose: () => void; onEliminar: () => void; onPoligono: (() => void) | null; onCorregir: () => void;
}) {
  const coords = t.geometria?.coordinates ?? [];
  const pf = t.conElevacion && coords.length > 1 ? perfil(coords) : null;
  return (
    <Globo chip={<span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${t.color} 12%, transparent)`, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Route size={14} /></span>}
      color={t.color} rotuloSup="Track GPX" centrado onClose={onClose}
      acciones={<>
        {onPoligono && <Boton variante="ghost" icono={Pentagon} onClick={onPoligono}>{t.poligonoNombre}</Boton>}
        {!soloLectura && <Boton variante="muted" icono={Pencil} onClick={onCorregir}>Corregir</Boton>}
        {!soloLectura && <BotonEliminar titulo="Eliminar track" onClick={onEliminar} />}
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: -4 }}>
        {fila('Recorrido de', t.agente)}
        {fila('Inicio:', fechaCorta(t.inicio))}
        {fila('Fin:', fechaCorta(t.fin))}
        {!t.poligonoId && fila('Polígono:', 'Fuera de polígono')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {dato('Distancia', fmtKm(t.distanciaM))}
        {dato('Duración', duracion(t.duracionS))}
        {dato('Desnivel', t.conElevacion ? `↑ ${t.desnivelPositivoM ?? 0} m` : '—')}
      </div>
      {pf && <PerfilElevacion valores={pf.el} distancias={pf.dist} color={t.color} />}
      <p style={{ margin: 0, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>Cargado por {t.cargadoPor} · {fechaCorta(t.cargadoEn)}</p>
    </Globo>
  );
}

export function GloboMarcador({ m, soloLectura, onClose, onEditar }: { m: MarcadorApi; soloLectura: boolean; onClose: () => void; onEditar: () => void }) {
  const tipo = m.clase === 'HALLAZGO' ? 'HALLAZGO' : 'POI';
  const c = SIMBOLOS[tipo];
  return (
    <Globo chip={<Simbolo tipo={tipo} variante="chip" />} color={c.color} rotuloSup={c.label} titulo={m.nombre} subtitulo={fmtCoord(m.lat, m.lng)} onClose={onClose}
      acciones={<Boton variante="muted" icono={Pencil} onClick={onEditar}>{soloLectura ? 'Ver detalle' : 'Ver y editar'}</Boton>}>
      {m.descripcion && <p style={{ margin: 0, fontSize: 'calc(13px * var(--escala-texto))', color: 'var(--foreground)' }}>{m.descripcion}</p>}
      {m.detalle && <p style={{ margin: 0, fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.detalle}</p>}
      {!m.descripcion && !m.detalle && <p style={{ margin: 0, fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>Sin descripción cargada.</p>}
      <p style={{ margin: 0, fontSize: 'calc(11px * var(--escala-texto))', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 5 }}>
        {m.fotos.length > 0 && <><ImageIcon size={12} />{m.fotos.length} {m.fotos.length === 1 ? 'foto' : 'fotos'} · </>}
        Marcado por {m.creadoPor ?? '—'} · {fechaCorta(m.creadoEn)}
      </p>
    </Globo>
  );
}

export function GloboInstalacion({ m, soloLectura, onClose, onEditar, onReubicar }: { m: MarcadorApi; soloLectura: boolean; onClose: () => void; onEditar: () => void; onReubicar: () => void }) {
  const c = SIMBOLOS[m.tipoInstalacion!];
  return (
    <Globo chip={<Simbolo tipo={m.tipoInstalacion!} variante="chip" />} color={c.color} rotuloSup={`Instalación SCI · ${c.glifo}`} titulo={m.nombre} subtitulo={fmtCoord(m.lat, m.lng)} onClose={onClose}
      acciones={<>
        {!soloLectura && <Boton variante="ghost" icono={Move} onClick={onReubicar}>Reubicar</Boton>}
        <Boton variante="muted" icono={Pencil} onClick={onEditar}>{soloLectura ? 'Ver detalle' : 'Editar'}</Boton>
      </>}>
      {m.notas && <p style={{ margin: 0, fontSize: 'calc(12.5px * var(--escala-texto))', color: 'var(--foreground)', lineHeight: 1.5 }}>{m.notas}</p>}
      {m.responsable && <p style={{ margin: 0, fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>Responsable: <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>{m.responsable}</strong></p>}
      {!m.notas && !m.responsable && <p style={{ margin: 0, fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>{c.label}.</p>}
    </Globo>
  );
}

export function GloboPuntoCero({ lat, lng, ultimo, soloLectura, onClose, onActualizar }: {
  lat: number; lng: number; ultimo: MovimientoPuntoCeroApi | null; soloLectura: boolean; onClose: () => void; onActualizar: () => void;
}) {
  return (
    <Globo chip={<Simbolo tipo="puntoCero" variante="chip" />} color="var(--primary)" rotuloSup="Punto Cero · LSP" titulo="Último punto de avistamiento" subtitulo={fmtCoord(lat, lng)} onClose={onClose}
      acciones={!soloLectura ? <Boton variante="muted" icono={Crosshair} onClick={onActualizar}>Actualizar Punto Cero</Boton> : undefined}>
      {ultimo?.motivo && <p style={{ margin: 0, fontSize: 'calc(12.5px * var(--escala-texto))', color: 'var(--foreground)', lineHeight: 1.5 }}>{ultimo.motivo}</p>}
      <p style={{ margin: 0, fontSize: 'calc(11.5px * var(--escala-texto))', color: 'var(--muted-foreground)' }}>
        {ultimo ? `${ultimo.desdeLat === null ? 'Definido' : 'Actualizado'} ${fechaCorta(ultimo.registradoEn)}${ultimo.registradoPor ? ` por ${ultimo.registradoPor}` : ''}` : 'Definido al crear el operativo.'}
      </p>
    </Globo>
  );
}
