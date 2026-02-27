-- ============================================================
-- Migration 015: Fix nezuko_secrets RLS policies
-- Date: 2026-02-27
-- ============================================================
-- Root cause: Migration 012 only assigned:
--   - project_admin: ALL
--   - authenticated: SELECT
--
-- The anon role had NO policies, so:
--   1. Web Server Action (anon key) → INSERT blocked (code 42501)
--   2. Bot startup (anon key) → SELECT also blocked → None returned
--   3. is_encryption_configured() returned False → bot refused to start
--
-- Fix: Grant anon SELECT + INSERT + UPDATE on nezuko_secrets.
--
-- Security note: The anon key is NEVER browser-exposed. It only lives in:
--   - apps/bot/.env (server-side bot process)
--   - apps/web/.env.local (Next.js Server Actions — never sent to client)
-- So granting anon write access here is safe.
-- ============================================================

-- Drop all old policies to start fresh
DROP POLICY IF EXISTS "secrets_read_key_name_only" ON public.nezuko_secrets;
DROP POLICY IF EXISTS "secrets_authenticated_read" ON public.nezuko_secrets;
DROP POLICY IF EXISTS "secrets_anon_read" ON public.nezuko_secrets;
DROP POLICY IF EXISTS "secrets_anon_write" ON public.nezuko_secrets;
DROP POLICY IF EXISTS "project_admin_policy" ON public.nezuko_secrets;
DROP POLICY IF EXISTS "secrets_anon_insert" ON public.nezuko_secrets;
DROP POLICY IF EXISTS "secrets_anon_update" ON public.nezuko_secrets;
DROP POLICY IF EXISTS "secrets_authenticated_write" ON public.nezuko_secrets;
DROP POLICY IF EXISTS "secrets_project_admin_all" ON public.nezuko_secrets;

-- anon role: SELECT (bot reads master_key on startup)
CREATE POLICY "secrets_anon_read"
  ON public.nezuko_secrets
  FOR SELECT
  TO anon
  USING (true);

-- anon role: INSERT (web Server Action saves new key)
CREATE POLICY "secrets_anon_insert"
  ON public.nezuko_secrets
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- anon role: UPDATE (web Server Action regenerates/updates key)
CREATE POLICY "secrets_anon_update"
  ON public.nezuko_secrets
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- authenticated role: SELECT (dashboard can check vault status)
CREATE POLICY "secrets_authenticated_read"
  ON public.nezuko_secrets
  FOR SELECT
  TO authenticated
  USING (true);

-- authenticated role: ALL (future-proof if dashboard auth is enabled)
CREATE POLICY "secrets_authenticated_write"
  ON public.nezuko_secrets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- project_admin: full access (unchanged)
CREATE POLICY "secrets_project_admin_all"
  ON public.nezuko_secrets
  FOR ALL
  TO project_admin
  USING (true)
  WITH CHECK (true);
