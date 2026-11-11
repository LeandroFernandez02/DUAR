import { useOutletContext } from 'react-router';
import { Users, Footprints, UserX, Compass, Waypoints, MapPin } from 'lucide-react';
import type { OperativoOutletContext } from './OperativoLayout';
import { ACENTO, Kpi, Seccion, num } from '../panel/comunes';
import { useDatosPanel, fuerza, coberturaMedia } from './panel/datosPanel';
import { RelojTactico, MiniRadio, GruposActivos, RecursosCriticos, Avance, Poligonos, EvolucionDespliegue } from './panel/Tarjetas';

/**
 * Panel de Control Operativo (diseño v2 aprobado, 11/11, «handoff-dashboards»): tablero de la
 * diaria del operativo. Dos bloques simétricos —Estado de fuerza y personal; Georreferenciación
 * y sectores tácticos— y la evolución del despliegue a lo ancho. Todo con los datos reales del
 * operativo (ver panel/datosPanel.ts), refrescados cada 30 s.
 */
export default function PanelOperativo() {
  const { operativo } = useOutletContext<OperativoOutletContext>();
  const { datos, error } = useDatosPanel(operativo.id);
  const fin = operativo.estado === 'finalizado' ? operativo.fechaFin : undefined;

  const cabecera = (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ margin: '0 0 4px', fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--foreground)' }}>Panel de Control Operativo</h1>
        <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--muted-foreground)' }}>Resumen táctico de despliegue, cobertura espacial y flujo de recursos</p>
      </div>
      <RelojTactico inicio={operativo.fechaInicio} fin={fin} />
    </div>
  );

  if (!datos) {
    return (
      <div className="panel-raiz">
        {cabecera}
        <p style={{ color: 'var(--muted-foreground)', fontSize: 'var(--text-base)' }}>{error ? 'No se pudieron cargar los datos del operativo. Se reintenta en unos segundos.' : 'Cargando datos del operativo…'}</p>
      </div>
    );
  }

  const f = fuerza(datos.personal);
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const pol = datos.poligonos;
  const completos = pol.filter(p => p.coberturaPct >= 100).length;
  const conGrupo = pol.filter(p => p.grupos.length > 0).length;
  const radioKm = datos.radios.length ? Math.max(...datos.radios) / 1000 : null;
  const { poi: pois, hallazgos } = datos.marcadores;

  return (
    <div className="panel-raiz">
      {cabecera}

      <div className="cc-bloque" style={{ marginBottom: 8 }}>
        <Seccion icono={Users} color={ACENTO.celeste}>Estado de fuerza y personal</Seccion>
        <div className="cc-grid">
          <div className="cc-izq">
            <div className="cc-kpis">
              <Kpi icono={Users} color={ACENTO.celeste} valor={f.total} etiqueta="Agentes totales"
                tip={`Dinámica: ▲ +${f.hoy} agente${f.hoy === 1 ? '' : 's'} ingresado${f.hoy === 1 ? '' : 's'} hoy al operativo`} />
              <Kpi icono={Footprints} color={ACENTO.verde} valor={f.terreno} etiqueta="En terreno"
                tip={`Distribución: ${pct(f.terreno, f.total)}% desplegados · ${f.base} agente${f.base === 1 ? '' : 's'} en base`} />
              <Kpi icono={UserX} color={ACENTO.naranja} valor={f.sinGrupo} etiqueta="Sin asignar"
                tip={`Estado: ${pct(f.sinGrupo, f.total)}% del total · ${f.conGrupo} agente${f.conGrupo === 1 ? '' : 's'} ya asignado${f.conGrupo === 1 ? '' : 's'} a grupos`} />
            </div>
            <GruposActivos grupos={datos.grupos} />
          </div>
          <div className="cc-der"><RecursosCriticos personal={datos.personal} /></div>
        </div>
      </div>

      <div className="cc-bloque">
        <Seccion icono={Compass} color={ACENTO.violeta}>Georreferenciación y sectores tácticos</Seccion>
        <div className="cc-grid">
          <div className="cc-izq">
            <div className="cc-kpis">
              <Kpi icono={Waypoints} color={ACENTO.verde} valor={pol.length} unidad={pol.length === 1 ? 'sector' : 'sectores'} etiqueta="Polígonos de rastrillaje"
                tip={`Desglose: ${completos} completo${completos === 1 ? '' : 's'} · ${pol.length - completos} en curso · ${conGrupo} con grupo asignado`} />
              <Kpi destacado color={ACENTO.violeta} valor={radioKm === null ? '—' : num(radioKm)} unidad="km" etiqueta="Radio de búsqueda" extra={<MiniRadio />}
                tip={radioKm === null ? 'Todavía no se trazó ningún radio desde el Punto 0 (se hace desde el Mapa)' : `Distancia máxima desde el Punto 0 (${datos.radios.length} radio${datos.radios.length === 1 ? '' : 's'} trazado${datos.radios.length === 1 ? '' : 's'})`} />
              <Kpi icono={MapPin} color={ACENTO.naranja} valor={pois} unidad="poi" etiqueta="Puntos de Interés"
                tip={`Marcadores de alta probabilidad de hallazgo o evidencia${hallazgos ? ` · ${hallazgos} hallazgo${hallazgos === 1 ? '' : 's'} registrado${hallazgos === 1 ? '' : 's'}` : ''}`} />
            </div>
            <Avance poligonos={pol} tracks={datos.tracks} eventos={datos.cobertura} inicioOp={operativo.fechaInicio} actual={coberturaMedia(pol)} />
          </div>
          <div className="cc-der"><Poligonos poligonos={pol} grupos={datos.grupos} /></div>
        </div>
      </div>

      <EvolucionDespliegue participaciones={datos.participaciones} inicio={operativo.fechaInicio} fin={fin} />
    </div>
  );
}
