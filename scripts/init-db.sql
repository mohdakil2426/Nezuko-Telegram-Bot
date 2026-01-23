-- ============================================================
-- GMBot v2.0 - Database Initialization Script
-- ============================================================
-- This script runs on first PostgreSQL container startup
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges (tables will be created by Alembic migrations)
GRANT ALL PRIVILEGES ON DATABASE gmbot TO gmbot;

-- Create schema if using separate schemas for multi-tenancy
-- CREATE SCHEMA IF NOT EXISTS gmbot;

-- Informational comment
COMMENT ON DATABASE gmbot IS 'GMBot v2.0 - Multi-tenant Telegram Group Manager Bot';