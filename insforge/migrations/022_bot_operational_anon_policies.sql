-- ============================================================
-- Migration 022: Add Bot Operational Anon RLS Policies
-- Date: 2026-03-02
-- Description: The bot accesses InsForge via REST using the anon key.
--              While SELECT permissions were added in 012, 
--              it lacked INSERT/UPDATE policies causing operations
--              like bot_status heartbeat and group syncing to silently fail
--              and the bot's uptime to remain at 0 on the dashboard.
-- ============================================================

-- 1. Bot Status Updates (Heartbeat via PATCH-then-POST pattern)
CREATE POLICY "bot_status_anon_insert" ON public.bot_status FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "bot_status_anon_update" ON public.bot_status FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 2. Command Worker Processing (Marking admin commands as processing/success/failed)
-- (Note: 019 added "commands_anon_update", but added here gracefully using 'CREATE POLICY IF NOT EXISTS' syntax if PG version allows, or dropping first)
DROP POLICY IF EXISTS "commands_anon_update" ON public.admin_commands;
CREATE POLICY "commands_anon_update" ON public.admin_commands FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 3. Member Sync and Group/Channel Link Updates (Denormalized counters)
CREATE POLICY "groups_anon_update" ON public.protected_groups FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "channels_anon_update" ON public.enforced_channels FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "links_anon_insert" ON public.group_channel_links FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "links_anon_update" ON public.group_channel_links FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "links_anon_delete" ON public.group_channel_links FOR DELETE TO anon USING (true);
