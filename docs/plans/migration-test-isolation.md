# Migration Plan: Test Isolation — `tests/grammy/` → `apps/grammy/tests/`

> **Status**: Pending
> **Commit target**: `refactor(grammy): move tests into apps/grammy for full package isolation`

---

## Why

`tests/grammy/` sitting at the repo root is inconsistent with monorepo conventions.
`apps/grammy/` should be a fully self-contained, independently runnable package.
Moving tests in removes all `../../..` path hacks and makes every tool config simpler.

---

## Impact: Complete File Change List

| #   | File                               | Change Type                                   |
| --- | ---------------------------------- | --------------------------------------------- |
| 1   | `tests/grammy/` (entire directory) | **MOVE** → `apps/grammy/tests/`               |
| 2   | `apps/grammy/tests/tsconfig.json`  | **UPDATE** — 6 path fixes                     |
| 3   | `apps/grammy/package.json`         | **UPDATE** — 5 script path fixes              |
| 4   | `apps/grammy/knip.json`            | **UPDATE** — 2 path fixes                     |
| 5   | All 31 `*.ts` test files           | **UPDATE** — import path shortening           |
| 6   | `.github/workflows/grammy-ci.yml`  | **UPDATE** — remove `tests/grammy/**` trigger |
| 7   | `GEMINI.md`                        | **UPDATE** — File Locations table row         |
| 8   | `memory-bank/activeContext.md`     | **UPDATE** — standards note                   |
| 9   | `memory-bank/techContext.md`       | **UPDATE** — CI comment                       |
| 10  | `.gitignore`                       | **UPDATE** — fix misleading comment           |
| 11  | `tests/grammy/` directory          | **DELETE** after move                         |
| 12  | `tests/` root directory            | **DELETE** (will be empty)                    |

---

## Step 0 — Baseline (Run Before Anything)

```bash
cd apps/grammy
bun run type-check   # must be 0 errors
bun run lint         # must be 0 warnings
bun run format:check # must be clean
bun run knip         # must be 0 issues
bun run test         # must be 163/163 pass
bun run build        # must succeed
```

Confirm all pass. Do not proceed if any fail.

---

## Step 1 — Copy `tests/grammy/` into `apps/grammy/tests/`

```bash
# Windows PowerShell
Copy-Item -Path "tests/grammy" -Destination "apps/grammy/tests" -Recurse
```

Result: `apps/grammy/tests/` now exists alongside `apps/grammy/src/`.
Do NOT delete `tests/grammy/` yet — verify first.

---

## Step 2 — Update `apps/grammy/tests/tsconfig.json`

**File**: `apps/grammy/tests/tsconfig.json` (was `tests/grammy/tsconfig.json`)

All `../../apps/grammy/` references reduce to `../` because the file now lives inside `apps/grammy/`.

```json
// BEFORE
{
  "compilerOptions": {
    "typeRoots": ["../../apps/grammy/node_modules/@types"],
    "paths": {
      "grammy":        ["../../apps/grammy/node_modules/grammy"],
      "grammy/types":  ["../../apps/grammy/node_modules/grammy/out/types.d.ts"],
      "@grammyjs/*":   ["../../apps/grammy/node_modules/@grammyjs/*"],
      "@/*":           ["../../apps/grammy/src/*"]
    }
  },
  "include": ["**/*.ts", "../../apps/grammy/src/**/*.ts"]
}

// AFTER
{
  "compilerOptions": {
    "typeRoots": ["../node_modules/@types"],
    "paths": {
      "grammy":        ["../node_modules/grammy"],
      "grammy/types":  ["../node_modules/grammy/out/types.d.ts"],
      "@grammyjs/*":   ["../node_modules/@grammyjs/*"],
      "@/*":           ["../src/*"]
    }
  },
  "include": ["**/*.ts", "../src/**/*.ts"]
}
```

Full updated file:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["esnext"],
    "types": ["bun", "node"],
    "typeRoots": ["../node_modules/@types"],
    "strict": true,
    "noImplicitAny": false,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "grammy": ["../node_modules/grammy"],
      "grammy/types": ["../node_modules/grammy/out/types.d.ts"],
      "@grammyjs/*": ["../node_modules/@grammyjs/*"],
      "@/*": ["../src/*"]
    }
  },
  "include": ["**/*.ts", "../src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Step 3 — Update `apps/grammy/package.json` Scripts

5 scripts reference `../../tests/grammy`. Replace all with local `tests/`.

```json
// BEFORE
"format":         "bun x prettier src/ ../../tests/grammy --write",
"format:check":   "bun x prettier src/ ../../tests/grammy --check",
"test":           "bun test ../../tests/grammy",
"test:watch":     "bun test ../../tests/grammy --watch",
"test:coverage":  "bun test ../../tests/grammy --coverage",

// AFTER
"format":         "bun x prettier src/ tests/ --write",
"format:check":   "bun x prettier src/ tests/ --check",
"test":           "bun test tests/",
"test:watch":     "bun test tests/ --watch",
"test:coverage":  "bun test tests/ --coverage",
```

---

## Step 4 — Update `apps/grammy/knip.json`

```json
// BEFORE
{
  "entry":   ["../../tests/grammy/**/*.ts"],
  "project": ["src/**/*.ts", "../../tests/grammy/**/*.ts"]
}

// AFTER
{
  "entry":   ["tests/**/*.ts"],
  "project": ["src/**/*.ts", "tests/**/*.ts"]
}
```

---

## Step 5 — Update Import Paths in All 31 Test Files

Every test file currently imports from source using a deep relative path.
After moving inside `apps/grammy/`, the path shortens.

### Pattern A — Files at depth `tests/unit/*/` or `tests/integration/composers/`

These are 3 folders deep inside `tests/`, so they need `../../../src/`.

**Replace**: `../../../../apps/grammy/src/` → `../../../src/`

Affected files (25 files):

```
tests/unit/core/bot-commands.test.ts
tests/unit/core/bot-factory.test.ts
tests/unit/core/cache.test.ts
tests/unit/core/config.test.ts
tests/unit/core/encryption.test.ts
tests/unit/database/group-contract.repo.test.ts
tests/unit/database/group-repo.test.ts
tests/unit/database/insforge-client.test.ts
tests/unit/database/verification-repo.test.ts
tests/unit/middleware/admin-guard.test.ts
tests/unit/middleware/context-enricher.test.ts
tests/unit/middleware/group-only.test.ts
tests/unit/middleware/permission-check.test.ts
tests/unit/middleware/sequentialize.test.ts
tests/unit/multi-bot/bot-lifecycle.test.ts
tests/unit/services/batch-verification.test.ts
tests/unit/services/channel-linker.test.ts
tests/unit/services/command-worker.test.ts
tests/unit/services/member-sync.test.ts
tests/unit/services/protection.test.ts
tests/unit/services/status-writer.test.ts
tests/unit/services/verification.test.ts
tests/integration/composers/admin.test.ts
tests/integration/composers/delayed-verification-prompt.test.ts
tests/integration/composers/events.test.ts
tests/integration/composers/verify.test.ts
```

### Pattern B — Files at depth `tests/integration/` or `tests/helpers/`

These are 1 folder deep inside `tests/`, so they need `../../src/`.

**Replace**: `../../../apps/grammy/src/` → `../../src/`

Affected files (5 files):

```
tests/helpers/mock-deps.ts
tests/helpers/mock-update.ts
tests/helpers/test-bot.ts
tests/integration/bot-factory-runtime.test.ts
tests/integration/bot-factory.test.ts
```

> **Note**: Imports between test files (e.g., `../helpers/mock-deps.js`) do NOT change
> because they are relative within the `tests/` folder — depth from each other is unchanged.

---

## Step 6 — Update `.github/workflows/grammy-ci.yml`

Remove the separate `tests/grammy/**` path trigger on both `push` and `pull_request`.
After migration, `apps/grammy/**` covers everything including `apps/grammy/tests/`.

```yaml
# BEFORE
on:
  push:
    branches: [main]
    paths:
      - "apps/grammy/**"
      - "tests/grammy/**"          # ← REMOVE
      - ".github/workflows/grammy-ci.yml"
  pull_request:
    branches: [main]
    paths:
      - "apps/grammy/**"
      - "tests/grammy/**"          # ← REMOVE
      - ".github/workflows/grammy-ci.yml"

# AFTER
on:
  push:
    branches: [main]
    paths:
      - "apps/grammy/**"
      - ".github/workflows/grammy-ci.yml"
  pull_request:
    branches: [main]
    paths:
      - "apps/grammy/**"
      - ".github/workflows/grammy-ci.yml"
```

Also update the auto-fix comment (line 90):

```yaml
# BEFORE
# 1. Prettier (root .prettierrc, covers src/ + ../../tests/grammy/)

# AFTER
# 1. Prettier (root .prettierrc, covers src/ + tests/)
```

---

## Step 7 — Update `GEMINI.md`

In the **File Locations** table under `## Critical Rules`:

```markdown
# BEFORE

| grammY tests | `tests/grammy/` | `apps/grammy/tests/` |

# AFTER

| grammY tests | `apps/grammy/tests/` | `tests/grammy/` (deleted) |
```

Also update the **Quality Gates** section — any reference to `../../tests/grammy` in code snippets:

```bash
# BEFORE
cd apps/grammy && bun run format  # prettier --write src/ + ../../tests/grammy/

# AFTER
cd apps/grammy && bun run format  # prettier --write src/ + tests/
```

---

## Step 8 — Update `.gitignore`

Fix the misleading comment that says "tests should be in tests/ folders":

```gitignore
# BEFORE
# Debug scripts in app roots (tests should be in tests/ folders)
apps/*/test_*.py

# AFTER
# Debug Python scripts in app roots
apps/*/test_*.py
```

---

## Step 9 — Update Memory Bank

### `memory-bank/activeContext.md` — Coding Standards Reminders section

No direct path references to `tests/grammy/` — no change needed.

### `memory-bank/techContext.md` — CI/CD section

Find and update any mention of `tests/grammy/**` in the CI path triggers description. None currently — no change needed.

---

## Step 10 — Delete Old Directories

Only do this AFTER Step 11 (verify) passes.

```bash
# Delete the old test directory
Remove-Item -Path "tests/grammy" -Recurse -Force

# Delete the now-empty root tests/ directory
Remove-Item -Path "tests" -Recurse -Force
```

---

## Step 11 — Verify All Quality Gates Pass

Run from `apps/grammy/`:

```bash
cd apps/grammy

bun run type-check    # MUST: 0 errors
bun run lint          # MUST: 0 warnings
bun run format        # auto-fix any prettier issues
bun run format:check  # MUST: all clean
bun run knip          # MUST: 0 issues
bun run test          # MUST: 163/163 pass (same count as before)
bun run build         # MUST: produces dist/ cleanly
```

If ANY gate fails, fix before proceeding. Do not delete `tests/grammy/` until all pass.

---

## Step 12 — Commit

```bash
git add -A
git commit -m "refactor(grammy): move tests into apps/grammy for full package isolation

- tests/grammy/ → apps/grammy/tests/ (31 files)
- Updated tsconfig paths: ../../apps/grammy/ → ../
- Updated package.json scripts: 5 path references
- Updated knip.json: entry + project paths
- Updated 31 test files: ../../../../apps/grammy/src/ → ../../../src/
- Removed tests/grammy/** from grammy-ci.yml path trigger
- Deleted empty tests/ root directory"
```

---

## Quick Reference: Import Path Mapping

| Old location                              | New location                                   | Old import prefix              | New import prefix |
| ----------------------------------------- | ---------------------------------------------- | ------------------------------ | ----------------- |
| `tests/grammy/helpers/*.ts`               | `apps/grammy/tests/helpers/*.ts`               | `../../../apps/grammy/src/`    | `../../src/`      |
| `tests/grammy/integration/*.ts`           | `apps/grammy/tests/integration/*.ts`           | `../../../apps/grammy/src/`    | `../../src/`      |
| `tests/grammy/integration/composers/*.ts` | `apps/grammy/tests/integration/composers/*.ts` | `../../../../apps/grammy/src/` | `../../../src/`   |
| `tests/grammy/unit/*/*.ts`                | `apps/grammy/tests/unit/*/*.ts`                | `../../../../apps/grammy/src/` | `../../../src/`   |

> **Imports between test files** (e.g., `../helpers/mock-deps.js`) — **NO CHANGE NEEDED**.
> The relative depth between files within `tests/` stays the same.

---

_Created: 2026-03-16_
