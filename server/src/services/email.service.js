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

/**
 * Marca de los correos (diseño CALÍVAR, 25/10): la aplicación es CALÍVAR y la institución sigue
 * siendo el DUAR, así que el remitente y el encabezado dicen «CALÍVAR - DUAR».
 * Paleta del diseño: azul noche #0B1E2D, turquesa #00C2B3, acero #5B6B7A, niebla #E6E9EE.
 * El logo va por URL pública (los clientes de correo no muestran SVG ni imágenes locales) y
 * siempre desde producción, aunque el correo salga desde un servidor local.
 */
const NOMBRE_MARCA = 'CALÍVAR - DUAR';
const LOGO_URL = 'https://tesis-duar.vercel.app/calivar/calivar-icono-180.png';
const FUENTE = "'Segoe UI',Helvetica,Arial,sans-serif";

export function layout(tituloInterno, cuerpoHtml) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>${tituloInterno}</title></head>
<body style="margin:0;padding:0;background:#E6E9EE;font-family:${FUENTE};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#E6E9EE;padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(11,30,45,0.10);">
        <tr><td style="background:#0B1E2D;padding:22px 32px;border-bottom:3px solid #00C2B3;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;">
              <img src="${LOGO_URL}" width="44" height="44" alt="CALÍVAR" style="display:block;border:0;border-radius:10px;">
            </td>
            <td style="padding-left:14px;vertical-align:middle;">
              <div style="color:#ffffff;font-size:19px;font-weight:bold;letter-spacing:0.5px;">${NOMBRE_MARCA}</div>
              <div style="color:#B9C3CD;font-size:12px;margin-top:2px;">Sistema de Búsqueda y Rastreo · Córdoba</div>
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

export function botonHtml(url, texto) {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="background:#00C2B3;color:#0B1E2D;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
      ${texto}
    </a>
  </div>
  <p style="color:#5B6B7A;font-size:12px;line-height:1.6;margin:0;">
    Si no podés usar el botón, copiá este enlace en tu navegador:<br>
    <a href="${url}" style="color:#0A7A72;word-break:break-all;">${url}</a>
  </p>`;
}

/**
 * Envío base: NUNCA lanza. Un correo que no sale no puede tumbar el registro
 * ni el alta en el operativo — mismo criterio que `auditoria.model.js`. La
 * falla queda en el log del servidor para que se note, pero no en la respuesta
 * al cliente.
 */
async function enviar({ para, asunto, html }) {
  // Las cuentas de las pruebas automáticas usan un dominio inventado: mandarles
  // correo sólo generaría rebotes en la casilla del sistema.
  if (String(para).toLowerCase().endsWith('@prueba.duar')) {
    return { enviado: false, omitido: true };
  }
  if (!transporte) {
    console.warn(`[email] GMAIL_USER/GMAIL_APP_PASSWORD sin configurar — no se envió "${asunto}" a ${para}`);
    return { enviado: false };
  }
  try {
    await transporte.sendMail({
      from: `"${NOMBRE_MARCA}" <${GMAIL_USER}>`,
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
    ? `<p style="color:#33414E;font-size:14px;">Te registraste para participar en el operativo: <strong>${operativoNombre}</strong></p>`
    : '';
  const html = layout('Confirmá tu cuenta — CALÍVAR - DUAR', `
    <h2 style="color:#0B1E2D;margin:0 0 8px;font-size:22px;">Confirmá tu cuenta</h2>
    <p style="color:#33414E;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Hola <strong>${nombre}</strong>,<br>
      Para activar tu cuenta en el sistema CALÍVAR del DUAR, hacé clic en el botón a continuación.
    </p>
    ${operativoLinea}
    ${botonHtml(url, 'Confirmar mi cuenta')}
    <hr style="border:none;border-top:1px solid #E6E9EE;margin:24px 0;">
    <p style="color:#5B6B7A;font-size:11px;margin:0;">
      Este enlace expira en 24 horas. Si no creaste esta cuenta, ignorá este correo.<br>
      © 2026 CALÍVAR - DUAR Córdoba · Dirección de Unidades de Alto Riesgo
    </p>
  `);
  // Se dispara sin esperar la respuesta HTTP: el registro y el alta en el
  // operativo son lo urgente en un rescate real, el correo puede tardar unos
  // segundos de más sin que el agente lo note.
  return enviar({ para, asunto: 'Confirmá tu cuenta CALÍVAR - DUAR', html });
}

/** CU-03 paso 5. */
export function enviarRecuperacion({ para, nombre, url }) {
  const html = layout('Recuperá tu contraseña — CALÍVAR - DUAR', `
    <h2 style="color:#0B1E2D;margin:0 0 8px;font-size:22px;">Recuperá tu contraseña</h2>
    <p style="color:#33414E;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Hola <strong>${nombre}</strong>,<br>
      Recibimos un pedido para restablecer tu contraseña del sistema CALÍVAR del DUAR. Si no fuiste vos, podés ignorar este correo.
    </p>
    ${botonHtml(url, 'Elegir nueva contraseña')}
    <hr style="border:none;border-top:1px solid #E6E9EE;margin:24px 0;">
    <p style="color:#5B6B7A;font-size:11px;margin:0;">
      Este enlace expira en 60 minutos y sólo puede usarse una vez.<br>
      © 2026 CALÍVAR - DUAR Córdoba · Dirección de Unidades de Alto Riesgo
    </p>
  `);
  return enviar({ para, asunto: 'Recuperá tu contraseña — CALÍVAR - DUAR', html });
}
