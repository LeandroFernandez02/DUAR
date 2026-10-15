import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { FileText, Download, Loader2, ShieldCheck, AlertCircle, Clock, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { OperativoOutletContext } from './OperativoLayout';
import { informesApi, InformeApi, TipoInformeApi, DescargaInformeApi } from '../../services/api';

/**
 * Informe del operativo (CU-41). El botón «Informe» del encabezado trae acá:
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

export default function Informe() {
  const { operativo } = useOutletContext<OperativoOutletContext>();
  const [proximo, setProximo] = useState<{ tipo: TipoInformeApi; yaEmitido: boolean } | null>(null);
  const [informes, setInformes] = useState<InformeApi[]>([]);
  const [error, setError] = useState('');
  const [generando, setGenerando] = useState(false);
  const [bajando, setBajando] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => new Date());

  const cargar = useCallback(async () => {
    try {
      const r = await informesApi.listar(operativo.id);
      setProximo(r.proximo);
      setInformes(r.informes);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los informes.');
    }
  }, [operativo.id]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { const t = setInterval(() => setAhora(new Date()), 30_000); return () => clearInterval(t); }, []);

  async function generar() {
    setGenerando(true);
    try {
      const r = await informesApi.generar(operativo.id);
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
      bajar(await informesApi.descargar(operativo.id, inf.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo descargar el informe.');
    } finally {
      setBajando(null);
    }
  }

  const final = proximo?.tipo === 'FINAL';
  const etiqueta = { fontSize: 'var(--text-label)', color: 'var(--muted-foreground)' } as const;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5" style={{ fontFamily: 'var(--font-family-primary)', maxWidth: 920 }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--muted)' }}>
          <FileText size={18} style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>Informe del operativo</h1>
          <p style={etiqueta}>Un PDF con todo lo que pasó en el operativo, pensado para la Fiscalía.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: 'rgba(229,75,75,0.08)', color: 'var(--primary)', fontSize: 'var(--text-base)' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Paso 2: qué se va a emitir */}
      <section className="rounded-xl p-5 flex flex-col gap-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
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
            <p className="flex items-start gap-1.5" style={{ ...etiqueta, lineHeight: 1.45 }}>
              <ShieldCheck size={14} className="flex-shrink-0 mt-0.5" />
              El sistema guarda una copia idéntica de cada informe con un código. Con ese código, en /verificar, cualquiera puede comprobar que el archivo no fue modificado.
            </p>
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
  );
}
