-- Migration: 011_add_nezuko_secrets_table.sql
-- Description: Create a secure vault table for encryption keys
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.nezuko_secrets (
    id SERIAL PRIMARY KEY,
    key_name TEXT UNIQUE NOT NULL, -- e.g. 'master_key'
    key_value TEXT NOT NULL,      -- AES-256 base64 key
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grant privileges for both public and authenticated (Dev mode)
GRANT ALL ON TABLE public.nezuko_secrets TO anon;
GRANT ALL ON TABLE public.nezuko_secrets TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE nezuko_secrets_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE nezuko_secrets_id_seq TO authenticated;

-- Comment for documentation
COMMENT ON TABLE public.nezuko_secrets IS 'Secure vault for storing platform-wide encryption keys.';
