-- Captures the updated_at trigger function, which existed in the database but
-- not in this repository, and pins its search_path.
--
-- Supabase's database linter flags it as function_search_path_mutable: a
-- function with a mutable search_path lets whoever can influence search_path
-- decide which schema an unqualified reference resolves to. That only becomes
-- privilege escalation for SECURITY DEFINER functions, and this one is
-- SECURITY INVOKER (prosecdef = false), so the practical risk here is low —
-- but pinning it is one clause and clears the warning.
--
-- search_path = '' is safe for this body: NOW() lives in pg_catalog, which
-- Postgres always searches first regardless of search_path. Any future edit
-- that references a table or a custom function must schema-qualify it
-- (public.foo), or it will fail to resolve.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
$function$;

-- Note: the triggers that call this function are not recreated here, because
-- they were also created outside this repository. To see which tables use it:
--
--   SELECT c.relname AS table_name, t.tgname AS trigger_name
--   FROM pg_trigger t
--   JOIN pg_class c ON c.oid = t.tgrelid
--   JOIN pg_proc p ON p.oid = t.tgfoid
--   WHERE p.proname = 'update_updated_at_column' AND NOT t.tgisinternal;
