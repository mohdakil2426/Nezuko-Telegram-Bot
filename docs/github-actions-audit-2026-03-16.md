# GitHub Actions Audit Report

Date: 2026-03-16
Repository: `mohdakil2426/Nezuko-Telegram-Bot`
Audited area: `.github/workflows/*`, `.github/dependabot.yml`, release/commitlint config, deploy linkage to `.do/app.yaml`

## Executive Summary

The repository has a solid CI/CD foundation for a two-app monorepo:

- Path-scoped workflows keep `apps/web` and `apps/grammy` isolated.
- Both main CI pipelines enforce type-check, lint, formatting, and build gates.
- Security automation exists through CodeQL and Dependabot.
- Release automation exists through Release Please.

The biggest weaknesses are not missing workflows, but trust and correctness gaps inside the existing ones:

1. The auto-fix strategy pushes commits from CI in a way that does not trigger a fresh workflow run, even though the workflow comments say it will.
2. Bun is intentionally unpinned as `latest`, which makes CI and cache behavior non-reproducible.
3. Third-party actions are pinned only to moving major tags, not immutable SHAs.
4. The Vercel deploy hook step can succeed even if the hook returns a failing HTTP status.
5. Some workflow documentation and comments no longer match real behavior.

Overall grade before fixes: `B`

- Strong structure and coverage
- Moderate security hardening debt
- A few real reliability issues that are worth fixing soon

## Audit Scope And Method

I reviewed:

- Local workflow files in `.github/workflows/`
- Local supporting config in `.github/dependabot.yml`, `commitlint.config.mjs`, `release-please-config.json`, `.release-please-manifest.json`
- Package scripts in [apps/grammy/package.json](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/package.json) and [apps/web/package.json](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/web/package.json)
- Active bot deployment contract in [.do/app.yaml](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.do/app.yaml)
- Public GitHub workflow pages for this repository
- Current GitHub documentation for `GITHUB_TOKEN`, least-privilege permissions, SHA pinning, dependency review, and reusable workflows

## Codebase Context

This repo is a monorepo with:

- `apps/grammy`: Bun + TypeScript + grammY bot runtime
- `apps/web`: Next.js 16 dashboard
- Bot deployment handled by DigitalOcean App Platform, not by a live GitHub deploy workflow

That architecture matters because the workflows are correctly split along app boundaries:

- Bot CI maps cleanly to [apps/grammy/package.json](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/package.json)
- Web CI maps cleanly to [apps/web/package.json](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/web/package.json)
- The real bot deploy path is [app.yaml](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.do/app.yaml), where `deploy_on_push: true` is enabled

## Workflow Inventory

Active functional workflows:

- [web-ci.yml](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/web-ci.yml)
- [grammy-ci.yml](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/grammy-ci.yml)
- [bundle-size.yml](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/bundle-size.yml)
- [codeql.yml](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/codeql.yml)
- [commitlint.yml](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/commitlint.yml)
- [release-please.yml](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/release-please.yml)

Present at audit time but removed during remediation:

- `grammy-deploy.yml` (archived workflow deleted after the audit pass)

Support automation:

- [dependabot.yml](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/dependabot.yml)

## What Is Already Good

### 1. Workflow boundaries are sensible

- Bot CI only watches `apps/grammy/**` and its own workflow file.
- Web CI and bundle analysis only watch `apps/web/**` and their workflow files.
- This is appropriate for the repo structure and avoids unnecessary runs.

Evidence:

- [web-ci.yml:17](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/web-ci.yml#L17)
- [grammy-ci.yml:16](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/grammy-ci.yml#L16)
- [bundle-size.yml:18](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/bundle-size.yml#L18)

### 2. Quality gates reflect the codebase well

- Bot CI matches the bot package scripts: type-check, lint, format, knip, test, build.
- Web CI matches the web package behavior and includes a real production build.
- Bot CI also validates the Docker image build, which is valuable because the bot deploys from Docker.

Evidence:

- [grammy-ci.yml:113](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/grammy-ci.yml#L113)
- [web-ci.yml:124](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/web-ci.yml#L124)
- [grammy-ci.yml:142](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/grammy-ci.yml#L142)
- [apps/grammy/package.json:7](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/package.json#L7)
- [apps/web/package.json:9](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/web/package.json#L9)

### 3. Security coverage is better than average for a solo-maintained repo

- CodeQL is enabled with `security-extended`.
- Dependabot covers `apps/web`, `apps/grammy`, and GitHub Actions.
- Release Please and commitlint enforce a disciplined commit/release model.

Evidence:

- [codeql.yml:51](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/codeql.yml#L51)
- [dependabot.yml:10](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/dependabot.yml#L10)
- [release-please.yml:27](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/release-please.yml#L27)
- [commitlint.yml:21](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/commitlint.yml#L21)

## Findings

### High 1. Auto-fix pushes do not trigger a fresh workflow run, despite the workflow claiming they do

Why this matters:

- Both CI workflows push formatting/lint commits back to `main`.
- The web workflow explicitly claims that this push triggers a fresh CI run.
- GitHub documents that events created with `GITHUB_TOKEN` do not create a new workflow run, except for `workflow_dispatch` and `repository_dispatch`.
- The auto-fix commit message also includes `[skip ci]`, which makes the new commit intentionally less observable.

Impact:

- The workflow comments are factually wrong.
- The new bot-created commit can land without having its own independent CI run.
- This weakens auditability on `main` and makes the true “tested SHA” ambiguous.

Evidence in repo:

- [web-ci.yml:11](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/web-ci.yml#L11)
- [web-ci.yml:61](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/web-ci.yml#L61)
- [web-ci.yml:93](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/web-ci.yml#L93)
- [web-ci.yml:115](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/web-ci.yml#L115)
- [grammy-ci.yml:83](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/grammy-ci.yml#L83)
- [grammy-ci.yml:105](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/grammy-ci.yml#L105)

GitHub doc:

- `GITHUB_TOKEN` docs: https://docs.github.com/en/actions/concepts/security/github_token

Recommendation:

- Best option: stop pushing auto-fixes directly from `main` CI.
- Prefer failing the check and letting contributors run formatting locally.
- If you want automation, move auto-fix into a separate PR-oriented workflow that opens or updates a branch/PR, then lets normal CI validate that resulting SHA.
- At minimum, remove the incorrect comment and document that the current run validates the modified workspace, not a new workflow run for the pushed commit.

### High 2. Vercel deploy hook is not fail-fast on HTTP errors

Why this matters:

- The deploy step prints the HTTP status code but does not use `--fail` or inspect the response code.
- A rejected hook request can still leave the job green.

Impact:

- False-positive deploy success.
- Operators may assume production deployment started when it actually did not.

Evidence:

- [web-ci.yml:190](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/web-ci.yml#L190)
- [web-ci.yml:194](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/web-ci.yml#L194)

Recommendation:

- Use `curl --fail-with-body --show-error --silent`.
- Treat non-2xx as a hard failure.
- Optionally record the returned deployment ID/response body in the job summary.

### Medium 3. CI reproducibility is weakened by `BUN_VERSION: "latest"` plus cache keys that do not include the Bun version

Why this matters:

- `web-ci`, `grammy-ci`, and `bundle-size` all install Bun as `latest`.
- Their dependency cache keys only include OS and `bun.lock`.
- This means the CI runtime can change without the cache key changing.

Impact:

- Non-deterministic failures after Bun releases.
- Harder-to-reproduce CI differences between yesterday and today.
- Cache reuse can hide toolchain drift.

Evidence:

- [web-ci.yml:37](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/web-ci.yml#L37)
- [web-ci.yml:76](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/web-ci.yml#L76)
- [grammy-ci.yml:36](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/grammy-ci.yml#L36)
- [grammy-ci.yml:67](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/grammy-ci.yml#L67)
- [bundle-size.yml:33](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/bundle-size.yml#L33)
- [bundle-size.yml:60](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/bundle-size.yml#L60)

Related codebase context:

- [apps/grammy/package.json:50](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/grammy/package.json#L50)
- [apps/web/package.json:5](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/apps/web/package.json#L5)

Recommendation:

- Pin Bun to a specific version via a repo-level source of truth such as `.bun-version` or an exact workflow value.
- Include the Bun version in the cache key.
- Consider always running `bun install --frozen-lockfile` and caching Bun’s package cache rather than `node_modules`.

### Medium 4. Third-party actions are pinned to moving tags, not immutable SHAs

Why this matters:

- The workflows use major tags such as `actions/checkout@v6`, `actions/cache@v5`, `oven-sh/setup-bun@v2`, `actions/upload-artifact@v7`, and `wagoid/commitlint-github-action@v6`.
- GitHub’s security guidance says full-length commit SHA pinning is the only immutable form.

Impact:

- You inherit upstream tag movement risk.
- This is mostly a supply-chain hardening gap, not an immediate failure.

Evidence:

- [web-ci.yml:57](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/web-ci.yml#L57)
- [grammy-ci.yml:50](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/grammy-ci.yml#L50)
- [bundle-size.yml:48](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/bundle-size.yml#L48)
- [commitlint.yml:44](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/commitlint.yml#L44)
- [codeql.yml:52](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/codeql.yml#L52)

GitHub doc:

- Security hardening for GitHub Actions: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions

Recommendation:

- Pin critical third-party actions to full commit SHAs.
- Keep Dependabot enabled for `github-actions` so SHA bumps are still easy to review.
- If full SHA pinning feels heavy, start with write-capable or release/deploy workflows first.

### Medium 5. Token permission hardening is inconsistent

Why this matters:

- Some workflows set explicit permissions well, such as CodeQL and Release Please.
- Others rely on defaults, especially `bundle-size` and `commitlint`.
- GitHub recommends least-privilege `GITHUB_TOKEN` permissions.

Impact:

- Unclear effective permissions.
- Harder security review.
- More room for accidental privilege creep if repo defaults change.

Evidence:

- Good examples:
  - [codeql.yml:35](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/codeql.yml#L35)
  - [release-please.yml:27](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/release-please.yml#L27)
- Missing explicit permissions:
  - [bundle-size.yml:40](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/bundle-size.yml#L40)
  - [commitlint.yml:27](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/commitlint.yml#L27)

GitHub doc:

- Workflow permissions guidance: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#permissions

Recommendation:

- Add explicit `permissions:` blocks to every workflow.
- Use `contents: read` for read-only jobs.
- Add only the minimal writes needed for each job.
- Consider `permissions: {}` for jobs that only call an external webhook and do not need repository access.

### Medium 6. Bundle-size workflow behavior does not match its own header comments

Why this matters:

- The comments say it uses `hashicorp/nextjs-bundle-analysis`, comments on PRs, and fails chunk budgets.
- The workflow actually just builds, uploads `.next`, and prints file sizes.
- `ANALYZE` is set to `"false"`, so the comment about explicit analysis output is also misleading.

Impact:

- Maintainer confusion.
- False confidence that budget checks and PR diffs exist.

Evidence:

- [bundle-size.yml:4](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/bundle-size.yml#L4)
- [bundle-size.yml:11](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/bundle-size.yml#L11)
- [bundle-size.yml:68](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/bundle-size.yml#L68)
- [bundle-size.yml:73](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/bundle-size.yml#L73)

Recommendation:

- Either implement the promised behavior, or rewrite the header to reflect reality.
- If you keep the lightweight version, rename it to something like “Bundle Snapshot”.

### Low 7. Archived deploy workflow still exists and creates documentation drift

Why this matters:

- The archived bot deploy workflow is manually triggerable and guaranteed to fail.
- The active deploy path is DigitalOcean App Platform in [.do/app.yaml](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.do/app.yaml#L27).
- Project docs still describe a live `grammy-deploy` workflow in some places.

Impact:

- Confusing contributor experience.
- Unnecessary Actions UI clutter.

Evidence:

- Archived workflow existed during the initial audit and was manually triggerable despite the active deploy path already living in [app.yaml:27](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.do/app.yaml#L27)

Recommendation:

- Delete the archived workflow, or disable it in GitHub and move the fallback notes into `/docs`.
- Update docs so there is one canonical deployment story.

### Low 8. Missing dependency review enforcement on PRs

Why this matters:

- Dependabot keeps dependencies updated, but there is no PR-time dependency review gate.
- GitHub’s dependency review action can fail PRs that introduce vulnerable dependency versions.

Impact:

- Vulnerable dependency additions may only be noticed later.
- This is especially relevant in a monorepo with two separate Bun/Node app trees.

Evidence:

- [dependabot.yml:10](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/dependabot.yml#L10)
- No dedicated dependency review workflow exists in `.github/workflows/`

GitHub doc:

- About dependency review: https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review
- Configuring dependency review action: https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/configuring-the-dependency-review-action

Recommendation:

- Add a PR-only dependency review workflow using `actions/dependency-review-action`.
- Run it only when manifests or lockfiles change.

### Low 9. Workflow duplication is starting to become a maintenance tax

Why this matters:

- `web-ci`, `grammy-ci`, and `bundle-size` all repeat Bun setup, cache setup, install logic, and similar stubs.
- GitHub recommends reusable workflows or composite actions to reduce duplication.

Impact:

- More places to update when Bun versioning or caching strategy changes.
- More comment drift over time.

Evidence:

- [web-ci.yml:55](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/web-ci.yml#L55)
- [grammy-ci.yml:48](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/grammy-ci.yml#L48)
- [bundle-size.yml:46](/c:/Users/akila/OneDrive/Desktop/OSS/WebsitesBots/Telegram/GroupManagerBot/Nezuko-Telegram-Bot/.github/workflows/bundle-size.yml#L46)

GitHub doc:

- Reusing workflows: https://docs.github.com/en/actions/using-workflows/reusing-workflows

Recommendation:

- Extract a reusable Bun setup workflow or composite action for:
  - checkout
  - Bun setup
  - cache setup
  - install

## Prioritized Improvement Plan

### Immediate

1. Remove or redesign auto-fix push-back on `main`.
2. Make the Vercel deploy hook fail on non-2xx responses.
3. Pin Bun to an exact version and include it in cache keys.

### Next

4. Add explicit `permissions:` to every workflow.
5. Pin third-party actions to full SHAs, starting with write-capable workflows.
6. Clean up `bundle-size.yml` comments or implement the missing behavior.

### Later

7. Add dependency review on PRs.
8. Delete or fully retire the archived deploy workflow.
9. Extract shared Bun workflow logic into a reusable workflow or composite action.

## Suggested Target State

If you want a clean, maintainable GitHub Actions setup for this repo, the target state should look like this:

- `web-ci.yml`
  - no direct push-back auto-fix on `main`
  - exact Bun version
  - explicit token permissions
  - fail-fast deploy hook
- `grammy-ci.yml`
  - same exact Bun version and cache strategy
  - no push-back auto-fix on `main`
  - SHA-pinned third-party actions
- `bundle-size.yml`
  - either true bundle diffing with thresholds, or a renamed lightweight snapshot workflow
- `dependency-review.yml`
  - PR-only security gate for dependency changes
- archived deploy workflow removed

## Research Sources

- GitHub `GITHUB_TOKEN` behavior:
  - https://docs.github.com/en/actions/concepts/security/github_token
- GitHub workflow permissions:
  - https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#permissions
- GitHub Actions security hardening:
  - https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
- GitHub reusable workflows:
  - https://docs.github.com/en/actions/using-workflows/reusing-workflows
- GitHub dependency review:
  - https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review
  - https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/configuring-the-dependency-review-action

## Remediation Status

Implemented in repo after this audit:

- CI push-back auto-fix removed from `web-ci` and `grammy-ci`
- exact Bun version pinned via `.bun-version` and workflows
- shared Bun setup composite action added for workflow reuse
- Vercel deploy hook changed to fail on bad HTTP responses
- explicit permissions added to read-only workflows
- PR dependency review workflow added
- archived `grammy-deploy.yml` removed from the Actions set
- bot Docker builder image pinned to the same Bun version

Still best handled manually in GitHub settings:

- optionally enforce full-length SHA pinning through repository or organization policy
- add `Dependency Review / Review Dependency Changes` as a required status check if you want it blocking merges

## Bottom Line

This repo does not need a GitHub Actions rebuild from scratch.

It needs a focused hardening pass:

- fix the auto-fix commit model
- make deploy reporting truthful
- pin the toolchain
- tighten permissions
- reduce workflow drift

Once those are done, the workflow stack will move from “good and functional” to “trustworthy and production-hardened.”
