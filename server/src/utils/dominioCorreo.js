/**
 * UTILIDAD · ¿Existe el dominio de un correo? (Testeo 15/10, punto 23: «mail de dudosa procedencia»)
 *
 * La forma del correo no alcanza: «alguien@dominioinventado.com» tiene forma de correo y no llega
 * a ningún lado. Se consulta el DNS: un dominio que recibe correo tiene registros MX o, como
 * dice el estándar del correo, al menos una dirección (A/AAAA).
 *
 * Sólo se rechaza cuando el DNS responde «ese dominio no existe» o «no tiene nada». Si la
 * consulta falla por otra causa (sin red, tiempo agotado, servidor DNS caído), se deja pasar:
 * no se le niega el registro a nadie por un problema de la red del servidor.
 */
import { Resolver } from 'node:dns/promises';

/** Dominios que sólo existen en las pruebas automáticas: el correo nunca sale (ver email.service.js). */
const DOMINIOS_DE_PRUEBA = new Set(['prueba.duar']);


export async function dominioDelCorreoExiste(email) {
  const dominio = String(email ?? '').split('@')[1]?.trim().toLowerCase();
  if (!dominio) return false;
  if (DOMINIOS_DE_PRUEBA.has(dominio)) return true;

  const dns = new Resolver({ timeout: 3000, tries: 1 });
  let inconcluso = false;
  for (const consultar of [() => dns.resolveMx(dominio), () => dns.resolve4(dominio), () => dns.resolve6(dominio)]) {
    try {
      if ((await consultar()).length) return true;
    } catch (err) {
      if (err.code === 'ENOTFOUND') return false;   // el dominio no existe (para ningún tipo de registro)
      if (err.code !== 'ENODATA') inconcluso = true; // tiempo agotado o DNS caído: se prueba con la siguiente consulta
    }
  }
  // Existe pero no tiene dónde recibir correo (todo «sin datos»): no sirve. Si alguna consulta no
  // pudo resolverse y ninguna dio datos, no se sabe: no se le niega el registro a nadie por eso.
  return inconcluso;
}

export const MENSAJE_DOMINIO_INEXISTENTE = 'El dominio de ese correo no existe. Revisá que esté bien escrito.';
