-- E02: permisos y RLS.
-- 1) public.users (tabla del curso, con columna password): vacía y sin dependencias.
DROP TABLE IF EXISTS public.users CASCADE;

-- 2) _migrations: solo el rol dueño debe poder tocarla.
ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._migrations FROM anon, authenticated;

-- 3) exchange_rates: solo lectura para autenticados; escribe el rol dueño (cron).
DROP POLICY IF EXISTS exchange_rates_insert ON exchange_rates;
DROP POLICY IF EXISTS exchange_rates_update ON exchange_rates;
