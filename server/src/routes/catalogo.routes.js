import { Router } from 'express';
import * as catalogo from '../controllers/catalogo.controller.js';

const router = Router();
// Público: el formulario de registro por QR (CU-02) los necesita antes de haber
// iniciado sesión, para poder elegir institución, dotación y especialidad.
router.get('/', catalogo.todos);

export default router;
