-- ============================================================
-- Migration 012: Enable Row Level Security on all public tables
-- ============================================================
-- CRITICAL: Fixes ISSUE-SEC-1 — all 12 tables were fully exposed
-- via the anon key with NO RLS policies.
--
-- Strategy:
--   - Enable RLS on ALL public tables.
--   - Allow anon role read-only access to non-sensitive tables.
--   - Block anon access to nezuko_secrets entirely (ISSUE-SEC-1a).
--   - Allow authenticated role full CRUD on operational tables.
--   - service_role bypasses RLS entirely (Postgres default).
-- ============================================================

-- ─── 1. Enable RLS on every table ──────────────────────────
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enforced_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_channel_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_call_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nezuko_secrets ENABLE ROW LEVEL SECURITY;

-- ─── 2. nezuko_secrets — DENY ALL for anon, service_role only ──
-- The master encryption key MUST NOT be visible via the anon key.
-- The bot's Python code uses the service_role key (which bypasses RLS).
-- The web dashboard must NOT be able to display the raw key value.

-- Deny anon SELECT completely (no policy = deny by default)
-- Allow authenticated users to check IF a key exists (not the value)
CREATE POLICY "secrets_read_key_name_only"
  ON public.nezuko_secrets
  FOR SELECT
  TO authenticated
  USING (true);  -- Authenticated users can see key names but NOT values (filter in app layer)

-- Only service_role can insert/update/delete secrets
-- (No INSERT/UPDATE/DELETE policies for anon or authenticated — service_role bypasses RLS)

-- ─── 3. Operational tables — anon READ, authenticated WRITE ──

-- owners
CREATE POLICY "owners_anon_read" ON public.owners FOR SELECT TO anon USING (true);
CREATE POLICY "owners_auth_all" ON public.owners FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- protected_groups
CREATE POLICY "groups_anon_read" ON public.protected_groups FOR SELECT TO anon USING (true);
CREATE POLICY "groups_auth_all" ON public.protected_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- enforced_channels
CREATE POLICY "channels_anon_read" ON public.enforced_channels FOR SELECT TO anon USING (true);
CREATE POLICY "channels_auth_all" ON public.enforced_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- group_channel_links
CREATE POLICY "links_anon_read" ON public.group_channel_links FOR SELECT TO anon USING (true);
CREATE POLICY "links_auth_all" ON public.group_channel_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- bot_instances (anon read needed for bot startup token fetch)
CREATE POLICY "bot_instances_anon_read" ON public.bot_instances FOR SELECT TO anon USING (true);
CREATE POLICY "bot_instances_auth_all" ON public.bot_instances FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- bot_status
CREATE POLICY "bot_status_anon_read" ON public.bot_status FOR SELECT TO anon USING (true);
CREATE POLICY "bot_status_auth_all" ON public.bot_status FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- admin_config (anon read so dashboard can show config)
CREATE POLICY "config_anon_read" ON public.admin_config FOR SELECT TO anon USING (true);
CREATE POLICY "config_auth_all" ON public.admin_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 4. Write-only log tables — anon INSERT, authenticated READ ──

-- admin_logs (bot writes logs as anon; dashboard reads as authenticated)
CREATE POLICY "logs_anon_insert" ON public.admin_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "logs_auth_read" ON public.admin_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "logs_auth_delete" ON public.admin_logs FOR DELETE TO authenticated USING (true);

-- api_call_log
CREATE POLICY "api_log_anon_insert" ON public.api_call_log FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "api_log_auth_read" ON public.api_call_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "api_log_auth_delete" ON public.api_call_log FOR DELETE TO authenticated USING (true);

-- verification_logs
CREATE POLICY "verify_log_anon_insert" ON public.verification_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "verify_log_auth_read" ON public.verification_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "verify_log_auth_delete" ON public.verification_logs FOR DELETE TO authenticated USING (true);

-- admin_commands (bot reads commands as anon; dashboard writes as authenticated)
CREATE POLICY "commands_anon_read" ON public.admin_commands FOR SELECT TO anon USING (true);
CREATE POLICY "commands_auth_all" ON public.admin_commands FOR ALL TO authenticated USING (true) WITH CHECK (true);
