-- ============================================================
-- Migration 013: Add Missing Foreign Key Constraints
-- ============================================================
-- Fixes ISSUE-IF-6: bot_status and admin_commands were missing
-- FK constraints to bot_instances, allowing orphaned records.
-- ============================================================

-- ─── 1. bot_status.bot_instance_id → bot_instances.id ──────
-- First ensure the column is named consistently
-- (Some deployments may have bot_id instead of bot_instance_id)

-- Add FK if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'bot_status'
      AND constraint_name = 'bot_status_bot_instance_id_fkey'
  ) THEN
    ALTER TABLE public.bot_status
      ADD CONSTRAINT bot_status_bot_instance_id_fkey
      FOREIGN KEY (bot_instance_id) REFERENCES public.bot_instances(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- ─── 2. admin_commands.bot_id → bot_instances.id ─────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'admin_commands'
      AND constraint_name = 'admin_commands_bot_id_fkey'
  ) THEN
    ALTER TABLE public.admin_commands
      ADD CONSTRAINT admin_commands_bot_id_fkey
      FOREIGN KEY (bot_id) REFERENCES public.bot_instances(id)
      ON DELETE CASCADE;
  END IF;
END $$;
