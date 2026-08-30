import { useState, useRef, useCallback, useEffect } from 'react';
import {
  QrCode, X, Download, Copy, Check,
  RefreshCw, ShieldAlert, AlertTriangle, Clock,
} from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { formatTimeRemaining, getExpiryProgress, QRTokenInfo } from '../../utils/qrToken';
import { qrApi, ApiError } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { Operativo } from '../../data/mockData';

interface Props {
  operativo: Operativo;
  onClose: () => void;
}

function getExpiryColor(progress: number): { color: string; bg: string; border: string } {
  if (progress < 0.7) return { color: '#15803d', bg: 'rgba(21,128,61,0.08)', border: 'rgba(21,128,61,0.25)' };
  if (progress < 0.9) return { color: '#ca8a04', bg: 'rgba(202,138,4,0.08)', border: 'rgba(202,138,4,0.25)' };
  return { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.3)' };
}

export function QRModal({ operativo, onClose }: Props) {
  const { usuario } = useApp();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [tokenInfo, setTokenInfo] = useState<QRTokenInfo | null>(null);
  const [errorQR, setErrorQR] = useState('');
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showConfirmRegen, setShowConfirmRegen] = useState(false);

  const canRegenerate = usuario?.rol === 'coordinador' || usuario?.rol === 'administrador';

  const qrUrl = tokenInfo
    ? `${window.location.origin}/registro/${operativo.id}?qr=${tokenInfo.token}`
    : '';

  /**
   * El token viene del backend, no de localStorage. Es la corrección de fondo del
   * CU-15: el agente escanea con SU celular, así que el código tiene que vivir en
   * un lugar que ambos dispositivos puedan consultar — la base.
   */
  useEffect(() => {
    let vigente = true;
    qrApi.obtener(operativo.id)
      .then(({ qr }) => {
        if (!vigente) return;
        setTokenInfo({
          token: qr.token,
          generatedAt: new Date(qr.creadoEn).getTime(),
          expiresAt: new Date(qr.expiraEn).getTime(),
        });
      })
      .catch((err) => {
        if (!vigente) return;
        setErrorQR(err instanceof ApiError ? err.message : 'No se pudo generar el QR.');
      });
    return () => { vigente = false; };
  }, [operativo.id]);

  // Cuenta regresiva. Al vencer no se genera nada acá: se le vuelve a pedir al
  // backend, que es el único que decide cuándo emitir un token nuevo (CU-15 2.1).
  useEffect(() => {
    if (!tokenInfo) return;
    const iv = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= tokenInfo.expiresAt) {
        qrApi.obtener(operativo.id).then(({ qr }) => setTokenInfo({
          token: qr.token,
          generatedAt: new Date(qr.creadoEn).getTime(),
          expiresAt: new Date(qr.expiraEn).getTime(),
        })).catch(() => {});
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [tokenInfo, operativo.id]);

  // keep `now` used to force re-renders every second
  void now;

  const progress = tokenInfo ? getExpiryProgress(tokenInfo.generatedAt, tokenInfo.expiresAt) : 0;
  const timeLeft = tokenInfo ? formatTimeRemaining(tokenInfo.expiresAt) : '—';
  const expiryColor = getExpiryColor(progress);
  const isExpiringSoon = progress >= 0.9;

  /** "Control de Puerta" (CU-15 Observaciones): invalida el QR filtrado. */
  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    setShowConfirmRegen(false);
    try {
      const { qr } = await qrApi.refrescar(operativo.id);
      setTokenInfo({
        token: qr.token,
        generatedAt: new Date(qr.creadoEn).getTime(),
        expiresAt: new Date(qr.expiraEn).getTime(),
      });
      setNow(Date.now());
    } catch (err) {
      setErrorQR(err instanceof ApiError ? err.message : 'No se pudo refrescar el QR.');
    } finally {
      setRegenerating(false);
    }
  }, [operativo.id]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `QR-${operativo.nombre.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [operativo.nombre]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = qrUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [qrUrl]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-[var(--radius-card)] overflow-hidden flex flex-col"
        style={{
          maxWidth: 400,
          background: 'var(--card)',
          boxShadow: 'var(--elevation-md)',
          maxHeight: '95vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(229,75,75,0.1)' }}
            >
              <QrCode size={17} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p style={{
                color: 'var(--foreground)', fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
              }}>
                QR de Acceso — Agentes
              </p>
              <p style={{
                color: 'var(--muted-foreground)', fontSize: 'var(--text-label)',
                fontFamily: 'var(--font-family-primary)',
              }}>
                Escaneá para registrarse al operativo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={17} />
          </button>
        </div>

        {/* Expiry progress bar */}
        <div style={{ height: 3, background: 'var(--muted)', flexShrink: 0 }}>
          <div
            style={{
              height: '100%',
              width: `${(1 - progress) * 100}%`,
              background: isExpiringSoon
                ? progress >= 0.95 ? '#dc2626' : '#ca8a04'
                : '#15803d',
              transition: 'width 1s linear, background 0.5s ease',
            }}
          />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

          {/* Expiry badge */}
          <div
            className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-input)]"
            style={{ background: expiryColor.bg, border: `1px solid ${expiryColor.border}` }}
          >
            <div className="flex items-center gap-2">
              {isExpiringSoon
                ? <AlertTriangle size={13} style={{ color: expiryColor.color, flexShrink: 0 }} />
                : <ShieldAlert size={13} style={{ color: expiryColor.color, flexShrink: 0 }} />
              }
              <span style={{
                color: expiryColor.color, fontSize: 'var(--text-label)',
                fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
              }}>
                {isExpiringSoon ? '¡Próximo a expirar!' : 'QR activo'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={11} style={{ color: expiryColor.color }} />
              <span style={{
                color: expiryColor.color, fontSize: 'var(--text-label)',
                fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {timeLeft}
              </span>
            </div>
          </div>

          {/* QR Card */}
          <div
            className="flex flex-col items-center gap-3 p-4 rounded-[var(--radius-card)]"
            style={{
              background: 'var(--muted)', border: '1px solid var(--border)',
              opacity: regenerating ? 0.5 : 1,
              transition: 'opacity 0.3s ease',
            }}
          >
            <div
              className="px-3 py-1.5 rounded-lg w-full text-center"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <p style={{
                color: 'var(--foreground)', fontSize: 'var(--text-label)',
                fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {operativo.nombre}
              </p>
            </div>

            <div
              className="p-3 rounded-xl relative flex items-center justify-center"
              style={{ background: '#fff', boxShadow: 'var(--elevation-sm)', minWidth: 214, minHeight: 214 }}
            >
              {/* Sin token todavía no hay QR que mostrar: dibujar uno con la URL
                  vacía generaría un código que no lleva a ningún lado. */}
              {errorQR ? (
                <div className="flex flex-col items-center gap-2 px-3 text-center">
                  <ShieldAlert size={26} style={{ color: '#dc2626' }} />
                  <p style={{ color: '#b91c1c', fontSize: 'var(--text-label)', fontFamily: 'var(--font-family-primary)' }}>
                    {errorQR}
                  </p>
                </div>
              ) : !tokenInfo ? (
                <RefreshCw size={28} style={{ color: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <QRCodeSVG value={qrUrl} size={190} fgColor="#444140" bgColor="#ffffff" level="M" />
              )}
              {regenerating && (
                <div
                  className="absolute inset-0 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.85)' }}
                >
                  <RefreshCw size={28} style={{ color: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
                </div>
              )}
            </div>

            <div ref={canvasRef} style={{ display: 'none' }}>
              {tokenInfo && (
                <QRCodeCanvas value={qrUrl} size={400} fgColor="#444140" bgColor="#ffffff" level="M" />
              )}
            </div>
          </div>

          {/* Confirm regen dialog */}
          {showConfirmRegen && (
            <div
              className="flex flex-col gap-3 p-4 rounded-[var(--radius-input)]"
              style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)' }}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} style={{ color: '#dc2626', marginTop: 1, flexShrink: 0 }} />
                <div>
                  <p style={{
                    color: 'var(--foreground)', fontSize: 'var(--text-label)',
                    fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                    marginBottom: 2,
                  }}>
                    ¿Confirmar regeneración?
                  </p>
                  <p style={{
                    color: 'var(--muted-foreground)', fontSize: '11px',
                    fontFamily: 'var(--font-family-primary)', lineHeight: 1.5,
                  }}>
                    El QR actual quedará inválido de inmediato. Cualquier enlace compartido previamente dejará de funcionar.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmRegen(false)}
                  className="flex-1 py-1.5 rounded-[var(--radius-button)] transition-colors"
                  style={{
                    background: 'var(--muted)', border: '1px solid var(--border)',
                    color: 'var(--foreground)', fontSize: 'var(--text-label)',
                    fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--muted)')}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRegenerate}
                  className="flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-[var(--radius-button)] transition-opacity hover:opacity-88"
                  style={{
                    background: '#dc2626', color: '#fff',
                    fontSize: 'var(--text-label)',
                    fontWeight: 'var(--font-weight-semibold)', fontFamily: 'var(--font-family-primary)',
                  }}
                >
                  <RefreshCw size={12} /> Refrescar QR
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={regenerating}
              className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-[var(--radius-button)] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background: 'var(--primary)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)',
                fontFamily: 'var(--font-family-primary)',
              }}
            >
              <Download size={14} /> Descargar PNG
            </button>
            <button
              onClick={handleCopy}
              disabled={regenerating}
              className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-[var(--radius-button)] transition-all disabled:opacity-50"
              style={{
                background: copied ? 'rgba(22,163,74,0.08)' : 'var(--card)',
                border: `1px solid ${copied ? '#16a34a' : 'var(--border)'}`,
                color: copied ? '#16a34a' : 'var(--foreground)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)',
                fontFamily: 'var(--font-family-primary)',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '¡Copiado!' : 'Copiar URL'}
            </button>
          </div>

          {/* Regenerate button (coordinador/admin only) */}
          {canRegenerate && !showConfirmRegen && (
            <button
              onClick={() => setShowConfirmRegen(true)}
              disabled={regenerating}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[var(--radius-button)] transition-all disabled:opacity-50"
              style={{
                background: 'var(--muted)',
                border: '1.5px solid var(--border)',
                color: 'var(--muted-foreground)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)',
                fontFamily: 'var(--font-family-primary)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#dc2626';
                (e.currentTarget as HTMLElement).style.color = '#dc2626';
                (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.05)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)';
                (e.currentTarget as HTMLElement).style.background = 'var(--muted)';
              }}
            >
              <RefreshCw size={14} />
              Refrescar QR
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
