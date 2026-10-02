-- ═════════════════════════════════════════════════════════════════════════
-- 017 · Límite de intentos de login (02/10)
--
-- Antes de publicar: el login no frenaba la prueba de contraseñas. Esta tabla
-- cuenta los intentos fallidos por clave:
--   · "email:<correo>" → 5 fallos en 15 minutos bloquean ese correo 15 minutos;
--   · "ip:<dirección>" → 30 fallos en 15 minutos bloquean esa IP 15 minutos.
-- Se cuentan también los correos que no existen, con la misma respuesta, para
-- que el bloqueo no revele qué cuentas existen. Un login correcto borra el
-- contador del correo.
--
-- Es una tabla (y no memoria del servidor) porque en Vercel cada pedido puede
-- caer en una instancia distinta: un contador en memoria no cuenta nada.
--
-- Sólo agrega una tabla: no afecta a la versión publicada, que no la usa.
-- ═════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.intentos_login (
  clave              text PRIMARY KEY,
  intentos           integer     NOT NULL DEFAULT 0,
  ultimo_intento_en  timestamptz NOT NULL DEFAULT now(),
  bloqueado_hasta    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_intentos_login_ultimo ON public.intentos_login (ultimo_intento_en);

-- Regla del proyecto: RLS deny-all (sólo la API entra).
ALTER TABLE public.intentos_login ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.intentos_login IS
  'Intentos de login fallidos por correo o IP, para bloquear la prueba de contraseñas (02/10). Se limpia sola: lo vencido se borra al registrar un fallo.';
