/**
 * RUTAS · Autenticación
 *   · CU-01 Iniciar Sesión · CU-02 Registro de Usuario · CU-03 Recuperar Contraseña
 * Las rutas sólo mapean URL → controlador. Ninguna lógica de negocio acá.
 */
import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import * as registro from '../controllers/registro.controller.js';
import { requiereSesion } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login',  auth.login);
router.post('/logout', requiereSesion, auth.logout);
router.get('/me',      requiereSesion, auth.yo);

// CU-02: sin sesión (todavía no tiene cuenta), pero el controlador exige un
// token de QR válido — no se puede crear una cuenta desde fuera del operativo.
router.post('/registro', registro.registrar);

// CU-02 paso 7: confirmación de cuenta. Público — llega por un link de correo.
router.get('/confirmar-email/:token', auth.confirmarEmail);

// Reenvío de confirmación, a pedido del propio agente. Requiere sesión (ya
// tiene cuenta, sólo le falta confirmarla) — el cooldown lo valida el controlador.
router.post('/reenviar-confirmacion', requiereSesion, auth.reenviarConfirmacion);

// CU-03: recuperar contraseña. Todo público — es justamente para quien no
// puede loguearse.
router.post('/recuperar-contrasena',        auth.solicitarRecuperacion);
router.get('/recuperar-contrasena/:token',  auth.chequearTokenRecuperacion);
router.post('/restablecer-contrasena',      auth.restablecerContrasena);

export default router;
