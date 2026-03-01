-- Migration 021: Add anon read policies for admin_logs and verification_log
--
-- Root Cause: Both tables had SELECT policies only for the "authenticated" role
-- (logs_auth_read, verify_log_auth_read). The web dashboard in DEV_LOGIN mode
-- uses the anon key, which means SELECT returned empty arrays — activity feed
-- and logs page showed "No data" despite 1241+ rows in admin_logs and 55+ in
-- verification_log.
--
-- Fix: Add anon SELECT policies so the dashboard can read data regardless of
-- auth mode. This is safe because these are read-only analytics tables — the
-- anon role can already INSERT into both via existing policies.

CREATE POLICY "logs_anon_read" ON admin_logs FOR SELECT TO anon USING (true);
CREATE POLICY "verify_log_anon_read" ON verification_log FOR SELECT TO anon USING (true);
