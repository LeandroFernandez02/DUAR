/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  DUAR — Servicio de Email (Stub de Desarrollo)                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Este archivo es la BASE para la integración real de emails.               ║
 * ║  Actualmente simula el envío: logea en consola y devuelve la URL de         ║
 * ║  confirmación para poder testear el flujo completo sin servidor real.       ║
 * ║                                                                              ║
 * ║  PARA INTEGRAR UN SERVICIO REAL, reemplazá el cuerpo de                    ║
 * ║  `enviarEmailConfirmacion` con una de las siguientes opciones:             ║
 * ║                                                                              ║
 * ║  ── OPCIÓN A: Supabase Auth (recomendado si usás Supabase) ──              ║
 * ║     Supabase maneja la confirmación automáticamente al usar signUp().      ║
 * ║     Ver: https://supabase.com/docs/guides/auth/email-confirmation           ║
 * ║                                                                              ║
 * ║  ── OPCIÓN B: Resend (recomendado para Vite/React) ──                      ║
 * ║     import { Resend } from 'resend';                                        ║
 * ║     const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);        ║
 * ║     await resend.emails.send({                                              ║
 * ║       from: 'noreply@duar.cba.gob.ar',                                     ║
 * ║       to: payload.destinatario,                                             ║
 * ║       subject: 'Confirmá tu cuenta DUAR',                                  ║
 * ║       html: generarHtmlConfirmacion(payload),                               ║
 * ║     });                                                                     ║
 * ║                                                                              ║
 * ║  ── OPCIÓN C: SendGrid ──                                                  ║
 * ║     await fetch('https://api.sendgrid.com/v3/mail/send', {                 ║
 * ║       method: 'POST',                                                       ║
 * ║       headers: {                                                            ║
 * ║         Authorization: `Bearer ${import.meta.env.VITE_SENDGRID_API_KEY}`, ║
 * ║         'Content-Type': 'application/json',                                ║
 * ║       },                                                                    ║
 * ║       body: JSON.stringify({                                                ║
 * ║         personalizations: [{ to: [{ email: payload.destinatario }] }],     ║
 * ║         from: { email: 'noreply@duar.cba.gob.ar' },                        ║
 * ║         subject: 'Confirmá tu cuenta DUAR',                                ║
 * ║         content: [{ type: 'text/html', value: generarHtmlConfirmacion(payload) }], ║
 * ║       }),                                                                   ║
 * ║     });                                                                     ║
 * ║                                                                              ║
 * ║  ── OPCIÓN D: AWS SES (vía endpoint propio) ──                            ║
 * ║     Llamar a tu propio backend/lambda que use AWS SDK.                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface EmailConfirmacionPayload {
  /** Dirección de correo destino */
  destinatario: string;
  /** Nombre del usuario para personalizar el saludo */
  nombreUsuario: string;
  /** Token único de confirmación (48 hex chars) */
  tokenConfirmacion: string;
  /** Nombre del operativo al que se unió, si aplica */
  operativoNombre?: string;
}

export interface EmailResult {
  /** true si el envío fue (o simuló ser) exitoso */
  enviado: boolean;
  /** Token generado */
  token: string;
  /**
   * Solo presente en modo development (import.meta.env.DEV === true).
   * Contiene la URL de confirmación completa para testear sin servidor real.
   */
  urlConfirmacionDev?: string;
}

// ─── Generador de tokens ─────────────────────────────────────────────────────

/**
 * Genera un token de confirmación criptográficamente aleatorio (48 hex chars = 192 bits).
 * En producción, este token se guardaría también en el backend/base de datos.
 */
export function generarTokenConfirmacion(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Generador de HTML del email ─────────────────────────────────────────────

/**
 * Genera el HTML del correo de confirmación.
 * Usar esto con el servicio real de envío.
 */
export function generarHtmlConfirmacion(payload: EmailConfirmacionPayload, urlConfirmacion: string): string {
  const operativoLinea = payload.operativoNombre
    ? `<p style="color:#555;font-size:14px;">Te registraste para participar en el operativo: <strong>${payload.operativoNombre}</strong></p>`
    : '';

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Confirmá tu cuenta DUAR</title></head>
<body style="margin:0;padding:0;background:#f5f0ee;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0ee;padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#444140;padding:24px 32px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:#E54B4B;border-radius:8px;padding:8px 12px;margin-right:12px;">
              <span style="color:#fff;font-size:18px;font-weight:bold;">DUAR</span>
            </td>
            <td style="padding-left:12px;color:rgba(255,255,255,0.7);font-size:13px;">
              Sistema de Búsqueda y Rastreo · Córdoba
            </td>
          </tr></table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="color:#444140;margin:0 0 8px;font-size:22px;">Confirmá tu cuenta</h2>
          <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px;">
            Hola <strong>${payload.nombreUsuario}</strong>,<br>
            Para activar tu cuenta en el sistema DUAR, hacé clic en el botón a continuación.
          </p>
          ${operativoLinea}
          <div style="text-align:center;margin:28px 0;">
            <a href="${urlConfirmacion}"
               style="background:#E54B4B;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
              Confirmar mi cuenta
            </a>
          </div>
          <p style="color:#888;font-size:12px;line-height:1.6;margin:0;">
            Si no podés usar el botón, copiá este enlace en tu navegador:<br>
            <a href="${urlConfirmacion}" style="color:#E54B4B;word-break:break-all;">${urlConfirmacion}</a>
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <p style="color:#aaa;font-size:11px;margin:0;">
            Este enlace expira en 24 horas. Si no creaste esta cuenta, ignorá este correo.<br>
            © 2026 DUAR Córdoba · Dirección de Unidades de Alto Riesgo
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Envía (o simula enviar) el correo de confirmación de cuenta.
 *
 * En modo desarrollo (`import.meta.env.DEV`):
 *   - Imprime todos los detalles en consola.
 *   - Devuelve `urlConfirmacionDev` con el link completo para testear.
 *
 * En producción:
 *   - TODO: Reemplazar el cuerpo con la integración real (ver opciones A–D arriba).
 *   - `urlConfirmacionDev` no se devuelve.
 */
export async function enviarEmailConfirmacion(
  payload: EmailConfirmacionPayload
): Promise<EmailResult> {
  const baseUrl = window.location.origin;
  const urlConfirmacion = `${baseUrl}/confirmar-email/${payload.tokenConfirmacion}`;

  // ══════════════════════════════════════════════════════════════════════════
  // 👇  REEMPLAZAR ESTE BLOQUE CON LA INTEGRACIÓN REAL EN PRODUCCIÓN
  // ══════════════════════════════════════════════════════════════════════════

  if (import.meta.env.DEV) {
    // Simular latencia de red (~300ms)
    await new Promise(r => setTimeout(r, 300));

    console.group('%c📧 [emailService] Correo de confirmación simulado', 'color:#E54B4B;font-weight:bold;');
    console.log('%cPara:', 'font-weight:bold', payload.destinatario);
    console.log('%cNombre:', 'font-weight:bold', payload.nombreUsuario);
    console.log('%cAsunto:', 'font-weight:bold', 'Confirmá tu cuenta DUAR');
    console.log('%cToken:', 'font-weight:bold', payload.tokenConfirmacion);
    if (payload.operativoNombre) {
      console.log('%cOperativo:', 'font-weight:bold', payload.operativoNombre);
    }
    console.log(
      '%c🔗 URL de confirmación (solo dev):',
      'color:#16a34a;font-weight:bold',
      urlConfirmacion
    );
    console.groupEnd();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 👆  FIN DEL BLOQUE A REEMPLAZAR
  // ══════════════════════════════════════════════════════════════════════════

  return {
    enviado: true,
    token: payload.tokenConfirmacion,
    urlConfirmacionDev: import.meta.env.DEV ? urlConfirmacion : undefined,
  };
}
