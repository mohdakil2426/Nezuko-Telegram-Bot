-- 027_dashboard_admin_rls.sql
--
-- Purpose:
--   Introduce an explicit dashboard admin allowlist keyed by auth.uid(),
--   then scope authenticated dashboard access through that allowlist instead
--   of broad USING (TRUE) authenticated policies.

BEGIN;

CREATE TABLE IF NOT EXISTS public.dashboard_admins (
    auth_user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_admins_email ON public.dashboard_admins (email);

GRANT SELECT ON public.dashboard_admins TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER TABLE public.dashboard_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dashboard_admins_project_admin_all ON public.dashboard_admins;
DROP POLICY IF EXISTS dashboard_admins_auth_read_self ON public.dashboard_admins;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'project_admin') THEN
        EXECUTE '
            CREATE POLICY dashboard_admins_project_admin_all
            ON public.dashboard_admins
            FOR ALL
            TO project_admin
            USING (TRUE)
            WITH CHECK (TRUE)';
    END IF;
END;
$$;

CREATE POLICY dashboard_admins_auth_read_self
ON public.dashboard_admins
FOR SELECT
TO authenticated
USING (auth_user_id = (SELECT auth.uid())::TEXT);

CREATE OR REPLACE FUNCTION public.is_dashboard_admin(user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.dashboard_admins
        WHERE auth_user_id = user_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_dashboard_admin(TEXT) TO authenticated;

DROP POLICY IF EXISTS groups_auth_all ON public.protected_groups;
DROP POLICY IF EXISTS channels_auth_all ON public.enforced_channels;
DROP POLICY IF EXISTS links_auth_all ON public.group_channel_links;
DROP POLICY IF EXISTS bot_instances_auth_all ON public.bot_instances;
DROP POLICY IF EXISTS bot_status_auth_all ON public.bot_status;
DROP POLICY IF EXISTS commands_auth_all ON public.admin_commands;
DROP POLICY IF EXISTS config_auth_all ON public.admin_config;
DROP POLICY IF EXISTS secrets_authenticated_read ON public.nezuko_secrets;
DROP POLICY IF EXISTS secrets_authenticated_write ON public.nezuko_secrets;
DROP POLICY IF EXISTS logs_auth_read ON public.admin_logs;
DROP POLICY IF EXISTS logs_auth_delete ON public.admin_logs;
DROP POLICY IF EXISTS api_log_auth_read ON public.api_call_log;
DROP POLICY IF EXISTS api_log_auth_delete ON public.api_call_log;
DROP POLICY IF EXISTS verify_log_auth_read ON public.verification_log;
DROP POLICY IF EXISTS verify_log_auth_delete ON public.verification_log;

CREATE POLICY groups_dashboard_admin_all ON public.protected_groups
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY channels_dashboard_admin_all ON public.enforced_channels
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY links_dashboard_admin_all ON public.group_channel_links
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY bot_instances_dashboard_admin_all ON public.bot_instances
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY bot_status_dashboard_admin_all ON public.bot_status
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY commands_dashboard_admin_all ON public.admin_commands
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY config_dashboard_admin_all ON public.admin_config
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY secrets_dashboard_admin_read ON public.nezuko_secrets
FOR SELECT TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY secrets_dashboard_admin_write ON public.nezuko_secrets
FOR ALL TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT))
WITH CHECK (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY logs_dashboard_admin_read ON public.admin_logs
FOR SELECT TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY logs_dashboard_admin_delete ON public.admin_logs
FOR DELETE TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY api_log_dashboard_admin_read ON public.api_call_log
FOR SELECT TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY api_log_dashboard_admin_delete ON public.api_call_log
FOR DELETE TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY verify_log_dashboard_admin_read ON public.verification_log
FOR SELECT TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

CREATE POLICY verify_log_dashboard_admin_delete ON public.verification_log
FOR DELETE TO authenticated
USING (public.is_dashboard_admin((SELECT auth.uid())::TEXT));

COMMIT;
