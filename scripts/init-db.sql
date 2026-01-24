-- ============================================================
-- Nezuko v1.0.0 - Database Initialization Script
-- ============================================================
-- This script runs on first PostgreSQL container startup
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges (tables will be created by Alembic migrations)
GRANT ALL PRIVILEGES ON DATABASE nezuko TO nezuko;

-- Create schema if using separate schemas for multi-tenancy
-- CREATE SCHEMA IF NOT EXISTS nezuko;

-- Informational comment
COMMENT ON DATABASE nezuko IS 'Nezuko v1.0.0 - The Ultimate All-In-One Telegram Bot';
