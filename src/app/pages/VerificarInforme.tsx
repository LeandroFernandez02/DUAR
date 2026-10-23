import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Shield, Search, FileUp, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { informesApi, InformeVerificableApi } from '../services/api';

/**
 * Verificar un informe (CU-41 N1). Pública, sin sesión: la abre quien recibió el
 * PDF (por ejemplo la Fiscalía), escaneando el QR o escribiendo el código.
 *
 * La huella SHA-256 se calcula en el navegador: el archivo no viaja a ningún
 * lado. Se compara con la que el sistema guardó al emitirlo. La página no
 * muestra datos personales ni el contenido del informe.
 */

const fecha = (iso: string) => new Date(iso).toLocaleString('es-AR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});

async function huella(archivo: File) {
  const digest = await crypto.subtle.digest('SHA-256', await archivo.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function VerificarInforme() {
  const { codigo: codigoUrl } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState(codigoUrl ?? '');
  const [informe, setInforme] = useState<InformeVerificableApi | null>(null);
  const [error, setError] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; archivo: string; calculada: string } | null>(null);
  const [calculando, setCalculando] = useState(false);

  useEffect(() => {
    if (!codigoUrl) return;
    setBuscando(true); setInforme(null); setResultado(null); setError('');
    informesApi.verificar(codigoUrl)
      .then(r => setInforme(r.informe))
      .catch(e => setError(e instanceof Error ? e.message : 'No se pudo consultar el código.'))
      .finally(() => setBuscando(false));
  }, [codigoUrl]);

  async function comprobar(archivo: File | undefined) {
    if (!archivo || !informe) return;
    setCalculando(true);
    try {
      const calculada = await huella(archivo);
      setResultado({ ok: calculada === informe.sha256, archivo: archivo.name, calculada });
    } finally {
      setCalculando(false);
    }
  }

  const texto = { fontSize: 'var(--text-base)', color: 'var(--foreground)', lineHeight: 1.5 } as const;
  const tenue = { fontSize: 'var(--text-label)', color: 'var(--muted-foreground)', lineHeight: 1.45 } as const;
  const mono = { fontFamily: 'ui-monospace, Consolas, monospace' } as const;

  return (
    <div className="min-h-screen flex justify-center px-4 py-10" style={{ background: 'var(--background)', fontFamily: 'var(--font-family-primary)' }}>
      <div className="w-full flex flex-col gap-6" style={{ maxWidth: 560 }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <Shield size={20} color="var(--primary-foreground)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>DUAR</div>
            <div style={tenue}>Dirección de Unidades de Alto Riesgo</div>
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>Verificar un informe</h1>
          <p style={tenue}>Comprobá que un informe en PDF es idéntico al que emitió el sistema y no fue modificado.</p>
        </div>

        <form
          className="flex gap-2"
          onSubmit={e => { e.preventDefault(); if (codigo.trim()) navigate(`/verificar/${codigo.trim().toUpperCase()}`); }}
        >
          <input
            id="codigo-informe"
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            placeholder="Código del informe, por ejemplo INF-2026-0003"
            autoComplete="off"
            className="flex-1 px-3 py-2.5 rounded-lg border outline-none"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)', fontSize: 'var(--text-base)', minWidth: 0, ...mono }}
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 rounded-[var(--radius-button)]"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--text-base)' }}
          >
            <Search size={15} /> Buscar
          </button>
        </form>

        {buscando && <p className="flex items-center gap-2" style={tenue}><Loader2 size={14} className="animate-spin" /> Buscando el informe…</p>}
        {error && <p style={{ ...texto, color: 'var(--destructive)' }}>{error}</p>}

        {informe && (
          <section className="rounded-xl p-5 flex flex-col gap-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <dl className="grid gap-x-4 gap-y-1.5" style={{ gridTemplateColumns: 'max-content 1fr', fontSize: 'var(--text-base)' }}>
              <dt style={tenue}>Código</dt><dd style={{ ...texto, ...mono }}>{informe.codigo}</dd>
              <dt style={tenue}>Tipo</dt><dd style={texto}>{informe.tipo === 'FINAL' ? 'Informe final' : 'Informe parcial'}</dd>
              <dt style={tenue}>Operativo</dt><dd style={{ ...texto, ...mono }}>{informe.operativoCodigo}</dd>
              <dt style={tenue}>Datos al</dt><dd style={texto}>{fecha(informe.corteEn)}</dd>
              <dt style={tenue}>Emitido</dt><dd style={texto}>{fecha(informe.generadoEn)}</dd>
              <dt style={tenue}>Huella SHA-256</dt><dd style={{ ...mono, fontSize: 'calc(12px * var(--escala-texto))', color: 'var(--foreground)', wordBreak: 'break-all' }}>{informe.sha256}</dd>
            </dl>

            <label
              htmlFor="archivo-informe"
              className="flex flex-col items-center gap-2 px-4 py-6 rounded-lg cursor-pointer text-center"
              style={{ border: '1.5px dashed var(--border)', background: 'var(--muted)' }}
            >
              {calculando ? <Loader2 size={20} className="animate-spin" /> : <FileUp size={20} style={{ color: 'var(--muted-foreground)' }} />}
              <span style={texto}>Elegí el archivo PDF del informe</span>
              <span style={tenue}>Se revisa en tu navegador: el archivo no se envía a ningún lado.</span>
              <input id="archivo-informe" type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => comprobar(e.target.files?.[0])} />
            </label>

            {resultado && (
              <div
                className="flex items-start gap-3 p-4 rounded-lg"
                style={{ background: resultado.ok ? 'rgba(34,139,84,0.10)' : 'color-mix(in srgb, var(--destructive) 10%, transparent)', border: `1px solid ${resultado.ok ? 'rgba(34,139,84,0.35)' : 'color-mix(in srgb, var(--destructive) 35%, transparent)'}` }}
              >
                {resultado.ok
                  ? <CheckCircle2 size={22} className="flex-shrink-0" style={{ color: '#228b54' }} />
                  : <XCircle size={22} className="flex-shrink-0" style={{ color: 'var(--destructive)' }} />}
                <div className="flex flex-col gap-1" style={{ minWidth: 0 }}>
                  <strong style={texto}>
                    {resultado.ok
                      ? `Este archivo es idéntico al informe ${informe.codigo} emitido por el sistema.`
                      : `Este archivo NO coincide con el informe ${informe.codigo}: fue modificado o es otro documento.`}
                  </strong>
                  <span style={tenue}>Archivo: {resultado.archivo}</span>
                  {!resultado.ok && <span style={{ ...tenue, ...mono, wordBreak: 'break-all' }}>Huella del archivo: {resultado.calculada}</span>}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
