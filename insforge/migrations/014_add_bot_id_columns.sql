-- ============================================================
-- Migration 014: Add bot_id column to log tables
-- ============================================================
-- Fixes ISSUE-IF-7: admin_logs and api_call_log lack bot_id,
-- preventing per-bot log filtering in multi-tenant dashboard mode.
-- ============================================================

-- ─── 1. admin_logs.bot_id ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_logs' AND column_name = 'bot_id'
  ) THEN
    ALTER TABLE public.admin_logs
      ADD COLUMN bot_id INTEGER DEFAULT NULL
      REFERENCES public.bot_instances(id) ON DELETE SET NULL;

    -- Index for efficient per-bot log queries
    CREATE INDEX IF NOT EXISTS idx_admin_logs_bot_id
      ON public.admin_logs (bot_id)
      WHERE bot_id IS NOT NULL;
  END IF;
END $$;

-- ─── 2. api_call_log.bot_id ──────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_call_log' AND column_name = 'bot_id'
  ) THEN
    ALTER TABLE public.api_call_log
      ADD COLUMN bot_id INTEGER DEFAULT NULL
      REFERENCES public.bot_instances(id) ON DELETE SET NULL;

    -- Index for efficient per-bot API call queries
    CREATE INDEX IF NOT EXISTS idx_api_call_log_bot_id
      ON public.api_call_log (bot_id)
      WHERE bot_id IS NOT NULL;
  END IF;
END $$;
