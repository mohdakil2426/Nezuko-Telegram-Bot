-- 026_lock_down_anon_policies.sql
--
-- Purpose:
--   Tighten public access so the browser's anon key cannot mutate or read
--   privileged control-plane, vault, runtime, or analytics tables directly.
--
-- Notes:
--   - The web dashboard uses authenticated InsForge sessions for interactive access.
--   - The bot runtime should use a server-only key (INSFORGE_SERVICE_KEY) for DB access.
--   - This migration intentionally removes anon access from privileged tables.

BEGIN;

-- Security Vault
DROP POLICY IF EXISTS secrets_anon_read ON public.nezuko_secrets;
DROP POLICY IF EXISTS secrets_anon_insert ON public.nezuko_secrets;
DROP POLICY IF EXISTS secrets_anon_update ON public.nezuko_secrets;

-- Bot control plane
DROP POLICY IF EXISTS bot_instances_anon_read ON public.bot_instances;
DROP POLICY IF EXISTS bot_instances_anon_insert ON public.bot_instances;
DROP POLICY IF EXISTS bot_instances_anon_update ON public.bot_instances;

DROP POLICY IF EXISTS commands_anon_read ON public.admin_commands;
DROP POLICY IF EXISTS commands_anon_update ON public.admin_commands;

DROP POLICY IF EXISTS bot_status_anon_read ON public.bot_status;
DROP POLICY IF EXISTS bot_status_anon_insert ON public.bot_status;
DROP POLICY IF EXISTS bot_status_anon_update ON public.bot_status;

-- Admin entities
DROP POLICY IF EXISTS groups_anon_select ON public.protected_groups;
DROP POLICY IF EXISTS groups_anon_insert ON public.protected_groups;
DROP POLICY IF EXISTS groups_anon_update ON public.protected_groups;

DROP POLICY IF EXISTS channels_anon_select ON public.enforced_channels;
DROP POLICY IF EXISTS channels_anon_insert ON public.enforced_channels;
DROP POLICY IF EXISTS channels_anon_update ON public.enforced_channels;

DROP POLICY IF EXISTS links_anon_select ON public.group_channel_links;
DROP POLICY IF EXISTS links_anon_insert ON public.group_channel_links;
DROP POLICY IF EXISTS links_anon_update ON public.group_channel_links;
DROP POLICY IF EXISTS links_anon_delete ON public.group_channel_links;

-- Analytics/logging
DROP POLICY IF EXISTS verify_log_anon_read ON public.verification_log;
DROP POLICY IF EXISTS verify_log_anon_insert ON public.verification_log;

DROP POLICY IF EXISTS api_log_anon_read ON public.api_call_log;
DROP POLICY IF EXISTS api_log_anon_insert ON public.api_call_log;

DROP POLICY IF EXISTS logs_anon_read ON public.admin_logs;
DROP POLICY IF EXISTS logs_anon_insert ON public.admin_logs;

COMMIT;
