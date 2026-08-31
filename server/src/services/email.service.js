/**
 * SERVICIO · Envío de correo (Gmail SMTP)
 *   · CU-02 paso 7 — confirmación de cuenta
 *   · CU-03 — recuperación de contraseña
 *
 * Vive en el BACKEND a propósito: la versión anterior de este servicio corría
 * en el frontend, lo que habría obligado a poner la credencial de envío en el
 * bundle de JS que baja al navegador — cualquiera con las devtools abiertas
 * podría leerla y mandar correo con esta cuenta.
 *
 * Gmail en vez de un proveedor transaccional (Resend, SendGrid...) porque no
 * hay presupuesto ni dominio propio verificable para la tesis. El correo va a
 * llegar mostrando la casilla de Gmail real como remitente — es una limitación
 * conocida y aceptada, no un descuido.
 */
import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

/**
 * Sin `pool`: cada envío abre y cierra su propia conexión SMTP. En un
 * servidor tradicional pool:true tendría sentido (reusar el handshake TLS
 * entre envíos), pero en Vercel serverless cada invocación puede correr en
 * un contenedor distinto o uno recién "descongelado" — un socket pooleado de
 * una invocación anterior llega muerto del otro lado, y Gmail lo corta con
 * "Client network socket disconnected before secure TLS connection was
 * established" apenas se intenta reusar. Abrir conexión nueva por envío es
 * un poco más lento pero confiable, y el volumen de correo de esta app no
 * justifica el pooling igual.
 */
const transporte = GMAIL_USER && GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })
  : null;

function layout(tituloInterno, cuerpoHtml) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>${tituloInterno}</title></head>
<body style="margin:0;padding:0;background:#f5f0ee;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0ee;padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#444140;padding:24px 32px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:#E54B4B;border-radius:8px;padding:8px 12px;">
              <span style="color:#fff;font-size:18px;font-weight:bold;">DUAR</span>
            </td>
            <td style="padding-left:12px;color:rgba(255,255,255,0.7);font-size:13px;">
              Sistema de Búsqueda y Rastreo · Córdoba
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px;">${cuerpoHtml}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function botonHtml(url, texto) {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="background:#E54B4B;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
      ${texto}
    </a>
  </div>
  <p style="color:#888;font-size:12px;line-height:1.6;margin:0;">
    Si no podés usar el botón, copiá este enlace en tu navegador:<br>
    <a href="${url}" style="color:#E54B4B;word-break:break-all;">${url}</a>
  </p>`;
}

/**
 * Envío base: NUNCA lanza. Un correo que no sale no puede tumbar el registro
 * ni el alta en el operativo — mismo criterio que `auditoria.model.js`. La
 * falla queda en el log del servidor para que se note, pero no en la respuesta
 * al cliente.
 */
async function enviar({ para, asunto, html }) {
  if (!transporte) {
    console.warn(`[email] GMAIL_USER/GMAIL_APP_PASSWORD sin configurar — no se envió "${asunto}" a ${para}`);
    return { enviado: false };
  }
  try {
    await transporte.sendMail({
      from: `"DUAR — Búsqueda y Rastreo" <${GMAIL_USER}>`,
      to: para,
      subject: asunto,
      html,
    });
    return { enviado: true };
  } catch (err) {
    console.error('[email] Falló el envío:', err.message);
    return { enviado: false, error: err.message };
  }
}

/** CU-02 paso 7. */
export function enviarConfirmacion({ para, nombre, url, operativoNombre }) {
  const operativoLinea = operativoNombre
    ? `<p style="color:#555;font-size:14px;">Te registraste para participar en el operativo: <strong>${operativoNombre}</strong></p>`
    : '';
  const html = layout('Confirmá tu cuenta DUAR', `
    <h2 style="color:#444140;margin:0 0 8px;font-size:22px;">Confirmá tu cuenta</h2>
    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Hola <strong>${nombre}</strong>,<br>
      Para activar tu cuenta en el sistema DUAR, hacé clic en el botón a continuación.
    </p>
    ${operativoLinea}
    ${botonHtml(url, 'Confirmar mi cuenta')}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="color:#aaa;font-size:11px;margin:0;">
      Este enlace expira en 24 horas. Si no creaste esta cuenta, ignorá este correo.<br>
      © 2026 DUAR Córdoba · Dirección de Unidades de Alto Riesgo
    </p>
  `);
  // Se dispara sin esperar la respuesta HTTP: el registro y el alta en el
  // operativo son lo urgente en un rescate real, el correo puede tardar unos
  // segundos de más sin que el agente lo note.
  return enviar({ para, asunto: 'Confirmá tu cuenta DUAR', html });
}

/** CU-03 paso 5. */
export function enviarRecuperacion({ para, nombre, url }) {
  const html = layout('Recuperá tu contraseña — DUAR', `
    <h2 style="color:#444140;margin:0 0 8px;font-size:22px;">Recuperá tu contraseña</h2>
    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Hola <strong>${nombre}</strong>,<br>
      Recibimos un pedido para restablecer tu contraseña del sistema DUAR. Si no fuiste vos, podés ignorar este correo.
    </p>
    ${botonHtml(url, 'Elegir nueva contraseña')}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="color:#aaa;font-size:11px;margin:0;">
      Este enlace expira en 60 minutos y sólo puede usarse una vez.<br>
      © 2026 DUAR Córdoba · Dirección de Unidades de Alto Riesgo
    </p>
  `);
  return enviar({ para, asunto: 'Recuperá tu contraseña — DUAR', html });
}
