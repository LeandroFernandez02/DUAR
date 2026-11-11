/**
 * CONTROLADOR · Paneles de control (11/11): una sola respuesta liviana por panel.
 */
import * as Panel from '../models/panel.model.js';

/** Panel general (CU-43): todos los operativos no eliminados, con lo que muestra el panel. */
export async function general(req, res, next) {
  try {
    res.json({ operativos: await Panel.panelGeneral() });
  } catch (err) { next(err); }
}

/** Panel del operativo: personal, grupos, polígonos (sin forma), marcadores, radios, tracks (sin trazado), despliegue y cobertura. */
export async function operativo(req, res, next) {
  try {
    res.json(await Panel.panelOperativo(req.params.id));
  } catch (err) { next(err); }
}
