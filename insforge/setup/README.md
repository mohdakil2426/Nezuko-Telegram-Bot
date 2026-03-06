# Nezuko InsForge Setup

This folder contains the manual first-time InsForge database setup for Nezuko.

## Files

| File | Purpose |
| --- | --- |
| `001_bootstrap_nezuko.sql` | Single all-in-one SQL bootstrap for the current Nezuko database schema |

## When To Use This

Use this setup when:

- creating a fresh InsForge project for Nezuko
- rebuilding the Nezuko database from scratch
- provisioning the current schema without replaying the full migration history

Do not use this file on an already-running production database unless you explicitly want a destructive reset.

## What The SQL File Includes

`001_bootstrap_nezuko.sql` provisions the current database contract for Nezuko:

- tables
- indexes
- foreign keys and constraints
- views
- trigger functions
- realtime trigger wiring
- analytics RPC functions
- verification contract RPC
- grants
- RLS enablement and policies

It also reflects the current verification behavior:

- `get_group_verification_contract(...)` exists
- `protected_groups.params` defaults to `{"join_request_preferred": true}`
- current bot telemetry and verification tables are included

## What The SQL File Does Not Include

This SQL file does not provision non-database InsForge resources:

- storage buckets
- edge functions
- auth provider configuration
- project secrets outside SQL-managed tables

Those must still be configured manually in InsForge.

## Official Manual Flow

Follow the standard InsForge manual setup flow, then use this SQL file for the database step.

### 1. Create an InsForge project

Create a fresh InsForge project in the InsForge dashboard.

### 2. Open the SQL editor

Open your project’s SQL editor in InsForge.

### 3. Run the Nezuko bootstrap SQL

Paste the full contents of:

[001_bootstrap_nezuko.sql](C:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/insforge/setup/001_bootstrap_nezuko.sql)

and execute it.

Important:

- this is intended for fresh setup
- it drops and recreates the Nezuko schema objects in `public`
- it is not a non-destructive upgrade script

### 4. Create storage buckets manually

Create these buckets in InsForge storage:

- `bot-assets` → public
- `bot-exports` → private

### 5. Deploy edge functions manually

Deploy the function assets from:

- [manage-bot.js](C:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/insforge/functions/manage-bot.js)
- [index.js](C:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/insforge/functions/test-webhook/index.js)

Recommended deployed function slugs:

- `manage-bot`
- `test-webhook`

### 6. Get your project URL and anon key

After backend setup, use the InsForge project URL and anon key in:

- `apps/grammy/.env`
- `apps/web/.env.local`

## Validation Checklist

After running the SQL file, verify:

- the main app tables exist
- `get_group_verification_contract` exists
- RLS is enabled on app tables
- realtime triggers exist
- `bot_instances_safe` view exists

Then verify manually:

- storage buckets exist
- edge functions are deployed
- bot and web env files are configured

## Current Notes

- this bootstrap reflects the current Nezuko schema, not the historical migration path
- live fallback logic exists in the bot if the verification contract RPC is missing, but fresh installs should still include it from the start
- if you need the historical upgrade path, use `insforge/migrations/` instead of this setup folder
