# plugin Integration Plan: Nezuko Telegram Bot

This document outlines the systematic research, analysis, and implementation plan for integrating advanced grammY plugins to improve the bot's reliability, user experience (UX), and maintainability.

## 1. Project Analysis Summary

### Current Architecture
- **Framework**: grammY v1.41.1 with Bun runtime.
- **Scaling**: Using `@grammyjs/runner` for concurrent update handling.
- **Caching**: L1 (memory via `@grammyjs/chat-members`) and L2 (Redis via `ioredis`).
- **Database**: 2-tier BaaS with InsForge (PostgreSQL).
- **Core Logic**: Centralized in `src/services/verification.ts` and `src/composers/verify.ts`.
- **Middleware Order**: `sequentialize` -> `hydrate` -> `chatMembers` -> `contextEnricher`.

### Identified Gaps
1. **Reactive Rate Limiting**: The bot only reacts to 429 errors via `auto-retry`, which can lead to temporary bans under high load.
2. **Hardcoded UI**: Messages are hardcoded in `src/utils/messages.ts`, making maintenance and localization difficult.
3. **Static Interaction**: Admin features like `/settings` use text messages with static buttons instead of reactive menus.
4. **Group Noise**: Bot responses in busy groups often lack the context of which message they are replying to.

---

## 2. Recommended Plugins & Implementation Strategy

### Phase 1: Reliability & Performance (High Priority)
| Plugin | Goal | Status | Implementation File |
| :--- | :--- | :--- | :--- |
| **`@grammyjs/transformer-throttler`** | Proactive outgoing rate limiting per chat/user/global. | Proposed | `src/core/bot-factory.ts` |
| **`@roziscoding/grammy-autoquote`** | Automatically quote the user's message in replies for clarity. | Proposed | `src/core/bot-factory.ts` |

**Reasoning**: These are "invisible" improvements that significantly boost production stability and UI legibility with virtually zero logic changes.

### Phase 2: Content & Localization (Architectural)
| Plugin | Goal | Status | Implementation File |
| :--- | :--- | :--- | :--- |
| **`@grammyjs/i18n` (Fluent)** | Extract all messages to `.ftl` files. Support placeholders and pluralization. | Proposed | `src/locales/en.ftl`, `src/types.ts` |

**Reasoning**: Moving to Fluent allows for much richer message logic (e.g., "Join 1 channel" vs "Join 5 channels" handled by Fluent logic instead of TS string interpolation).

### Phase 3: Enhanced UX (Feature-Level)
| Plugin | Goal | Status | Implementation File |
| :--- | :--- | :--- | :--- |
| **`@grammyjs/menu`** | Reactive, multi-page administrative dashboards. | Proposed | `src/composers/admin.ts` |
| **`@grammyjs/conversations`** | Manage complex multi-step user flows (e.g., bot setup wizard). | Proposed | `src/composers/setup.ts` |

**Reasoning**: `/settings` can become a clickable dashboard where admins toggle options without seeing a stream of new messages.

---

## 3. Step-by-Step Implementation Plan

### Step 1: Baseline Hardening
1. Install `@grammyjs/transformer-throttler` and `@roziscoding/grammy-autoquote`.
2. Update `bot-factory.ts` to include these in the `bot.api.config` and global middleware chain.
3. **Verification**: Verify that the bot still responds and that replies quote the original user message.

### Step 2: Internationalization (i18n) Migration
1. Install `@grammyjs/i18n`.
2. Create `locales/en.ftl` and migrate all strings from `src/utils/messages.ts`.
3. Update `NezukoContext` type definitions to include `I18nFlavor`.
4. Replace `ctx.reply(CONST_MESSAGE)` with `ctx.t("message-key")`.
5. **Verification**: Confirm all commands still display the correct text.

### Step 3: Menu System Implementation
1. Create a new directory `src/menus/`.
2. Implement `adminMenu` for group settings.
3. Replace the static text-based `/settings` output with `reply_markup: adminMenu`.
4. **Verification**: Test toggling settings and navigating sub-menus.

### Step 4: Logic Modularization (Conversations)
1. Add `@grammyjs/conversations`.
2. Implement an onboarding conversation for new groups to help admins set up their first linked channel.
3. **Verification**: Test the setup flow from start to finish.

---

## 4. Risks & Mitigations
- **Rate Limit Conflicts**: The throttler and `auto-retry` must play nicely. Throttler should sit "internal" to `auto-retry`.
- **Context Flavor Proliferation**: Ensure `NezukoContext` doesn't become too bloated; use explicit type intersections.
- **Migration Overhead**: Migrating all 150+ lines of messages to Fluent is a manual task; requires a "one-to-one" verification check.

---
_Plan created on 2026-03-09 for Nezuko Bot Platform Phase 117+_
