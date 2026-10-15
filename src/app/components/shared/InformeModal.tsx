import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Download, Loader2, AlertCircle, Clock, Lock, X } from 'lucide-react';
import { toast } from 'sonner';
import { informesApi, InformeApi, TipoInformeApi, DescargaInformeApi } from '../../services/api';

/**
 * Informe del operativo (CU-41), en un modal: el botón «Informe» del encabezado
 * lo abre sobre la pantalla en la que esté el coordinador, sin sacarlo de ahí.
 *   · paso 2: qué se va a emitir (parcial con corte ahora, o el final) y los ya emitidos;
 *   · pasos 3-7: «Generar y descargar» arma el PDF en el servidor, lo guarda con su
 *     código y huella, y lo descarga;
 *   · N2: cualquier informe anterior se vuelve a bajar idéntico (la copia guardada).
 * El PDF se baja desde Storage con una URL firmada que vence en 5 minutos.
 */

const fecha = (iso: string) => new Date(iso).toLocaleString('es-AR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});

function bajar({ url }: DescargaInformeApi) {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function InformeModal({ operativoId, onClose }: { operativoId: string; onClose: () => void }) {
  const [proximo, setProximo] = useState<{ tipo: TipoInformeApi; yaEmitido: boolean } | null>(null);
  const [informes, setInformes] = useState<InformeApi[]>([]);
  const [error, setError] = useState('');
  const [generando, setGenerando] = useState(false);
  const [bajando, setBajando] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => new Date());

  const cargar = useCallback(async () => {
    try {
      const r = await informesApi.listar(operativoId);
      setProximo(r.proximo);
      setInformes(r.informes);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los informes.');
    }
  }, [operativoId]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { const t = setInterval(() => setAhora(new Date()), 30_000); return () => clearInterval(t); }, []);

  async function generar() {
    setGenerando(true);
    try {
      const r = await informesApi.generar(operativoId);
      bajar(r);
      toast.success(r.nuevo === false ? `Se descargó el informe final ${r.informe.codigo}.` : `Informe ${r.informe.codigo} generado y guardado.`);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo generar el informe. Intentá de nuevo.');
    } finally {
      setGenerando(false);
    }
  }

  async function descargar(inf: InformeApi) {
    setBajando(inf.id);
    try {
      bajar(await informesApi.descargar(operativoId, inf.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo descargar el informe.');
    } finally {
      setBajando(null);
    }
  }

  const final = proximo?.tipo === 'FINAL';
  const etiqueta = { fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' } as const;

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape' && !generando) onClose(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onClose, generando]);

  // En un portal: dentro del encabezado, un ancestro con transform/filtro hace que
  // `fixed` se mida contra él y no contra la ventana.
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      // Por encima del mapa: los paneles y controles de Leaflet usan z-index de 400 a 1000.
      style={{ zIndex: 2000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', fontFamily: 'var(--font-family-primary)' }}
      onClick={() => { if (!generando) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-informe"
        className="w-full rounded-[var(--radius-card)] overflow-hidden flex flex-col"
        style={{ maxWidth: 760, background: 'var(--card)', boxShadow: 'var(--elevation-md)', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
      <div className="flex items-center justify-between gap-3 px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(229,75,75,0.1)' }}>
            <FileText size={17} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <p id="titulo-informe" style={{ color: 'var(--foreground)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)' }}>Informe del operativo</p>
            <p style={etiqueta}>Un PDF con todo lo que pasó en el operativo, pensado para la Fiscalía.</p>
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={generando}
          aria-label="Cerrar"
          className="p-1.5 rounded-lg flex-shrink-0"
          style={{ color: 'var(--muted-foreground)', opacity: generando ? 0.4 : 1 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-5 flex flex-col gap-5 overflow-y-auto">

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: 'rgba(229,75,75,0.08)', color: 'var(--primary)', fontSize: 'var(--text-base)' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Paso 2: qué se va a emitir */}
      <section className="rounded-xl p-4 flex flex-col gap-4" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5" style={{ minWidth: 0, flex: '1 1 320px' }}>
            <span
              className="self-start px-2 py-0.5 rounded"
              style={{ border: '1.5px solid var(--primary)', color: 'var(--primary)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}
            >
              {final ? 'INFORME FINAL' : 'INFORME PARCIAL'}
            </span>
            {final ? (
              <p style={{ fontSize: 'var(--text-base)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                El operativo está finalizado. {proximo?.yaEmitido
                  ? 'Su informe final ya fue emitido: se descarga siempre esa misma copia.'
                  : 'Todavía no se emitió su informe final: se genera ahora, con la hora de fin como corte.'}
              </p>
            ) : (
              <p style={{ fontSize: 'var(--text-base)', color: 'var(--foreground)', lineHeight: 1.5 }}>
                El operativo sigue abierto. El informe va a reunir lo registrado hasta ahora
                (<b>{fecha(ahora.toISOString())}</b>); lo que pase después no va a figurar. Al finalizar el operativo se emite el informe final.
              </p>
            )}
          </div>
          <button
            onClick={generar}
            disabled={generando || !proximo}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-button)] transition-opacity"
            style={{
              background: 'var(--primary)', color: 'var(--primary-foreground)', fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-weight-semibold)', opacity: generando || !proximo ? 0.6 : 1, whiteSpace: 'nowrap',
            }}
          >
            {generando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {generando ? 'Generando…' : final && proximo?.yaEmitido ? 'Descargar informe final' : 'Generar y descargar'}
          </button>
        </div>
      </section>

      {/* Informes ya emitidos (N2) */}
      <section className="flex flex-col gap-2">
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>Informes emitidos</h2>
        {informes.length === 0 ? (
          <p style={etiqueta}>Todavía no se emitió ningún informe de este operativo.</p>
        ) : (
          <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
            <table className="w-full" style={{ fontSize: 'var(--text-label)', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', textAlign: 'left' }}>
                  {['Código', 'Tipo', 'Datos al', 'Generado por', ''].map(h => (
                    <th key={h} className="px-3 py-2" style={{ fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {informes.map(inf => (
                  <tr key={inf.id} style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground)' }}>
                    <td className="px-3 py-2.5" style={{ fontFamily: 'ui-monospace, Consolas, monospace' }}>{inf.codigo}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1">
                        {inf.tipo === 'FINAL' ? <Lock size={12} /> : <Clock size={12} />}
                        {inf.tipo === 'FINAL' ? 'Final' : 'Parcial'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{fecha(inf.corteEn)}</td>
                    <td className="px-3 py-2.5">{inf.generadoPor}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => descargar(inf)}
                        disabled={bajando === inf.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-button)]"
                        style={{ border: '1px solid var(--border)', background: 'var(--muted)', color: 'var(--foreground)' }}
                      >
                        {bajando === inf.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Descargar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
      </div>
    </div>,
    document.body,
  );
}
