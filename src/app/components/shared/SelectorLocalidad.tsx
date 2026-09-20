import { useEffect, useState } from 'react';
import { PROVINCIAS, listarLocalidades, separarLocalidad, unirLocalidad } from '../../services/geoService';

/**
 * Provincia + Localidad en dos listas desplegables. El valor que entrega es el
 * mismo string de siempre — "Localidad, Provincia" — así que la columna
 * `operativos.localidad` y todo lo que la lee (búsqueda, tarjetas) no cambia.
 *
 * Tres casos que hay que sostener, no sólo el camino feliz:
 *  - Valor anterior en texto libre ("Barrio Maipu"): no se puede saber la
 *    provincia, así que se conserva tal cual y se avisa; se reemplaza recién
 *    cuando el usuario elige provincia y localidad.
 *  - Sin conexión (Georef caído): la localidad pasa a texto libre en vez de
 *    bloquear la carga de un operativo.
 *  - Localidad guardada que la lista ya no trae: se agrega como opción para no
 *    perderla al abrir la edición.
 */
interface Props {
  value: string;
  onChange: (valor: string) => void;
  readOnly?: boolean;
  errorProvincia?: boolean;
  errorLocalidad?: boolean;
  labelStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  errStyle: (base: React.CSSProperties, hasError: boolean) => React.CSSProperties;
  readOnlyStyle: React.CSSProperties;
}

export default function SelectorLocalidad({
  value, onChange, readOnly, errorProvincia, errorLocalidad,
  labelStyle, inputStyle, errStyle, readOnlyStyle,
}: Props) {
  const separado = separarLocalidad(value);
  const esTextoAnterior = value.trim() !== '' && !separado;

  const [provId, setProvId] = useState(separado?.provincia.id ?? '');
  const [localidades, setLocalidades] = useState<string[]>([]);
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'ok' | 'error'>('idle');

  const provincia = PROVINCIAS.find(p => p.id === provId);

  useEffect(() => {
    if (!provId) { setEstado('idle'); setLocalidades([]); return; }
    let vigente = true;
    setEstado('cargando');
    listarLocalidades(provId)
      .then(lista => { if (vigente) { setLocalidades(lista); setEstado('ok'); } })
      .catch(() => { if (vigente) setEstado('error'); });
    return () => { vigente = false; };
  }, [provId]);

  const cambiarProvincia = (id: string) => {
    setProvId(id);
    onChange(''); // la localidad anterior pertenecía a otra provincia
  };

  const localidadActual = separado && separado.provincia.id === provId ? separado.localidad : '';
  const opciones = localidadActual && !localidades.includes(localidadActual)
    ? [localidadActual, ...localidades]
    : localidades;

  const estiloSelect = (error?: boolean): React.CSSProperties =>
    readOnly ? readOnlyStyle : errStyle(inputStyle, !!error);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={labelStyle}>Provincia *</label>
          <select
            value={provId}
            disabled={readOnly}
            onChange={e => cambiarProvincia(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border outline-none"
            style={estiloSelect(errorProvincia)}
          >
            <option value="">— Seleccioná —</option>
            {PROVINCIAS.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Localidad *</label>
          {estado === 'error' ? (
            <input
              type="text"
              value={localidadActual}
              readOnly={readOnly}
              maxLength={100}
              placeholder="Escribí la localidad"
              onChange={e => onChange(e.target.value.trim() ? unirLocalidad(e.target.value.slice(0, 100), provincia!.nombre) : '')}
              className="w-full px-3 py-2.5 rounded-lg border outline-none"
              style={estiloSelect(errorLocalidad)}
            />
          ) : (
            <select
              value={localidadActual}
              disabled={readOnly || !provId || estado === 'cargando'}
              onChange={e => onChange(e.target.value ? unirLocalidad(e.target.value, provincia!.nombre) : '')}
              className="w-full px-3 py-2.5 rounded-lg border outline-none"
              style={estiloSelect(errorLocalidad)}
            >
              <option value="">
                {!provId ? 'Elegí primero la provincia' : estado === 'cargando' ? 'Cargando…' : '— Seleccioná —'}
              </option>
              {opciones.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
        </div>
      </div>

      {estado === 'error' && (
        <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
          No se pudo traer la lista de localidades (¿sin conexión?). Escribí la localidad a mano.
        </p>
      )}
      {esTextoAnterior && (
        <p style={{ color: '#b45309', fontSize: '11px', fontFamily: 'var(--font-family-primary)' }}>
          Valor cargado antes de existir la lista: «{value}». Elegí provincia y localidad para reemplazarlo.
        </p>
      )}
    </div>
  );
}
