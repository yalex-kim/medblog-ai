-- Defense-in-depth: the app only ever talks to Supabase through the service
-- role key (supabaseAdmin), which bypasses RLS entirely, so none of this
-- changes application behavior. It only matters if the anon key is ever used
-- against these tables (client-side bug, key leak, future feature) — with RLS
-- on and no permissive policies, the anon/authenticated roles get zero access
-- by default instead of an open table.

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- No policies are created for anon/authenticated roles on purpose: hospital
-- accounts, admin accounts, and blog post content should never be readable
-- or writable except through the server-side API using the service role key.
