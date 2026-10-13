-- =====================================================================
-- TutorApp — Diagnóstico y arreglo del error al registrar usuarios
--   "Database error saving new user"
--
-- Ejecuta TODO este script en:  Supabase -> SQL Editor -> Run
-- =====================================================================


-- =====================================================================
-- PARTE 1 — DIAGNÓSTICO (mira los resultados de estas 5 consultas)
-- =====================================================================

-- 1.1  ¿Qué triggers hay sobre auth.users?
SELECT tgname                                   AS trigger_name,
       pg_get_triggerdef(t.oid)                 AS definicion
FROM pg_trigger t
WHERE tgrelid = 'auth.users'::regclass
  AND NOT tgisinternal;

-- 1.2  Definición real de handle_new_user
--      (¿prosecdef = true? ¿tiene search_path? ¿quién es el dueño?)
SELECT p.proname                                     AS funcion,
       p.prosecdef                                   AS es_security_definer,
       p.proowner::regrole::text                     AS propietario,
       COALESCE(array_to_string(p.proconfig, ', '),
                '(SIN search_path)')                 AS configuracion,
       p.prosrc                                      AS cuerpo
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'handle_new_user';

-- 1.3  ¿Dónde está instalada la extensión uuid-ossp? (importa para los DEFAULT)
SELECT e.extname, e.extnamespace::regnamespace::text AS esquema
FROM pg_extension e
WHERE e.extname IN ('uuid-ossp', 'pgcrypto');

-- 1.4  search_path efectivo de la base
SHOW search_path;

-- 1.5  Columnas de app_settings (para ver si hay algún NOT NULL sin default)
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'app_settings'
ORDER BY ordinal_position;


-- =====================================================================
-- PARTE 2 — ARREGLO
-- =====================================================================

-- 2.1  Recrear la función de forma robusta:
--      - SECURITY DEFINER  -> se ejecuta con permisos de su dueño (postgres)
--      - search_path fijo  -> siempre encuentra public.app_settings
--        (incluimos 'extensions' por si uuid_generate_v4() vive ahí)
--      - nombres cualificados (public.app_settings)
--      - ON CONFLICT para no fallar si la fila ya existe
--      - EXCEPTION final  -> un fallo aquí NUNCA bloquea el registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
BEGIN
  INSERT INTO public.app_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user fallo (no bloquea el registro): %', SQLERRM;
  RETURN NEW;
END;
$fn$;

-- 2.2  Asegurar que el dueño sea postgres (rol con privilegios)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 2.3  Recrear el trigger apuntando a la función pública
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2.4  (Recomendado) Dejar instaladas las extensiones en el esquema correcto
CREATE EXTENSION IF NOT EXISTS pgcrypto  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


-- =====================================================================
-- PARTE 3 — VERIFICACIÓN
-- =====================================================================
-- Vuelve a ejecutar 1.1 y 1.2: ahora "configuracion" debe decir
-- "search_path=public, extensions" y "es_security_definer" = true.
-- Después intenta registrar de nuevo el usuario desde la app.
