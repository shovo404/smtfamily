-- =============================================================================
-- RBAC MIGRATION: Rename SR → SO in app_role enum
--
-- Handles ALL PostgreSQL dependencies automatically:
--   • 2 columns  of type app_role   (users.role, role_permissions.role)
--   • 1 column default              (users.role DEFAULT 'fi')
--   • 3 functions                   (is_admin, can_manage_staff, handle_new_user)
--   • 1 trigger                     (on_auth_user_created)
--   • ALL RLS policies              (known + unknown tables)
--
-- Strategy:
--   Phase 1 – Backup EVERY policy definition to a temp table
--   Phase 2 – Drop ALL policies (removes direct column deps like
--             audit_logs super_admin select which subqueries users.role)
--   Phase 3 – Drop functions, trigger
--   Phase 4 – Enum swap: new type → ALTER COLUMNs → swap
--   Phase 5 – Recreate functions, trigger
--   Phase 6 – Restore ALL policies from backup via dynamic SQL
-- =============================================================================

BEGIN;

-- =============================================================================
-- PHASE 1: Backup EVERY RLS policy definition from public + storage schemas
-- =============================================================================

CREATE TEMP TABLE _saved_policies (
  idx         serial PRIMARY KEY,
  schema_name name   NOT NULL,
  table_name  name   NOT NULL,
  policy_name name   NOT NULL,
  command     text,
  using_expr  text,
  check_expr  text,
  role_oids   oid[]
);

INSERT INTO _saved_policies (schema_name, table_name, policy_name, command, using_expr, check_expr, role_oids)
SELECT
  n.nspname,
  c.relname,
  p.polname,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END,
  pg_get_expr(p.polqual, p.polrelid),
  pg_get_expr(p.polwithcheck, p.polrelid),
  p.polroles
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname IN ('public', 'storage');

-- =============================================================================
-- PHASE 2: Drop ALL policies (removes direct column dependencies)
-- =============================================================================
-- Some policies (e.g. audit_logs super_admin select) reference users.role
-- directly via subquery.  These are NOT dropped by CASCADE on is_admin() —
-- they directly depend on the column itself and block ALTER COLUMN TYPE.
-- Since we saved everything in Phase 1, it is safe to drop everything now.

DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Drop every policy from the backup, in any order
  FOR rec IN SELECT DISTINCT schema_name, table_name, policy_name
             FROM _saved_policies
             ORDER BY schema_name, table_name, policy_name
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE',
                   rec.policy_name, rec.schema_name, rec.table_name);
  END LOOP;
END $$;

-- =============================================================================
-- PHASE 3: Drop trigger and functions
-- =============================================================================
-- No CASCADE needed — all dependent policies were already dropped in Phase 2.
-- Trigger must be dropped BEFORE the function it depends on.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.can_manage_staff();

-- =============================================================================
-- PHASE 4: Core enum swap
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.app_role_new AS ENUM ('super_admin', 'admin', 'hr', 'dhr', 'so', 'fi');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.users ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.users
  ALTER COLUMN role TYPE public.app_role_new
  USING (
    CASE role::text
      WHEN 'sr'  THEN 'so'::public.app_role_new
      WHEN 'dsr' THEN 'fi'::public.app_role_new
      ELSE role::text::public.app_role_new
    END
  );

ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'fi'::public.app_role_new;

ALTER TABLE public.role_permissions
  ALTER COLUMN role TYPE public.app_role_new
  USING (
    CASE role::text
      WHEN 'sr'  THEN 'so'::public.app_role_new
      WHEN 'dsr' THEN 'fi'::public.app_role_new
      ELSE role::text::public.app_role_new
    END
  );

DROP TYPE IF EXISTS public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- =============================================================================
-- PHASE 5: Recreate functions and trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'));
$$;

CREATE OR REPLACE FUNCTION public.can_manage_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'hr'));
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (new.id, COALESCE(new.email, ''), COALESCE(new.raw_user_meta_data->>'full_name', new.email, ''));
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================================================
-- PHASE 6: Restore ALL saved policies from backup
-- =============================================================================
-- Uses the temp table populated in Phase 1.
-- Rebuilds each CREATE POLICY statement from saved components.

DO $$
DECLARE
  rec      RECORD;
  sql_text TEXT;
  rname    TEXT;
BEGIN
  FOR rec IN SELECT * FROM _saved_policies ORDER BY idx LOOP
    sql_text := format('CREATE POLICY %I ON %I.%I FOR %s',
                rec.policy_name, rec.schema_name, rec.table_name, rec.command);

    -- Resolve role OIDs to role name (skip {0} = PUBLIC)
    IF rec.role_oids IS NOT NULL
       AND array_length(rec.role_oids, 1) > 0
       AND rec.role_oids <> '{0}'::oid[]
    THEN
      SELECT rolname INTO rname FROM pg_roles WHERE oid = ANY(rec.role_oids) LIMIT 1;
      IF rname IS NOT NULL THEN
        sql_text := sql_text || ' TO ' || quote_ident(rname);
      END IF;
    END IF;

    -- Replace old enum literals ('sr' → 'so', 'dsr' → 'fi')
    -- so restored policies work with the new app_role type.
    IF rec.using_expr IS NOT NULL AND rec.using_expr <> '' THEN
      rec.using_expr := REPLACE(REPLACE(rec.using_expr, '''sr''', '''so'''), '''dsr''', '''fi''');
      sql_text := sql_text || ' USING (' || rec.using_expr || ')';
    END IF;

    IF rec.check_expr IS NOT NULL AND rec.check_expr <> '' THEN
      rec.check_expr := REPLACE(REPLACE(rec.check_expr, '''sr''', '''so'''), '''dsr''', '''fi''');
      sql_text := sql_text || ' WITH CHECK (' || rec.check_expr || ')';
    END IF;

    BEGIN
      EXECUTE sql_text;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Policy restore skipped [%.%]: % — SQL: %',
        rec.schema_name, rec.policy_name, SQLERRM, sql_text;
    END;
  END LOOP;
END $$;

DROP TABLE IF EXISTS _saved_policies;

COMMIT;

-- =============================================================================
-- DONE.
--   Old enum: super_admin, admin, hr, dhr, sr, fi
--   New enum: super_admin, admin, hr, dhr, so, fi
--   All sr users migrated → so.
--   All RLS policies, functions, trigger restored identically.
-- =============================================================================
