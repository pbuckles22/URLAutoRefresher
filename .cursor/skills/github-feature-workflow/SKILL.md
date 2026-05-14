---
name: github-feature-workflow
description: >-
  Short-lived feature branches, green CI before commit, push, optional PR, and
  branch cleanup. Use when implementing a feature or non-trivial fix, when the
  user asks for a branch/PR workflow, or after substantial edits that should
  not land only as uncommitted local work.
---

# GitHub / feature branch workflow (this repo)

**Product policy** (source of truth): [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) — `main` is the integration branch; **CI** is the quality bar; **PRs are optional** (no mandatory approval gate). This skill adds a **disciplined optional ritual** so work is **named, committed, pushed**, and **branches are not left to rot**.

## When to apply

- User asks for a **feature branch**, **PR**, **commit**, or **push**.
- A **coherent slice** of work is done (e.g. one epic story, one bugfix) and should be **recorded in git** before the session ends.
- **Do not** create branches for one-line typo fixes unless the user wants it.

## Branch naming

- Prefer: `feature/<short-kebab-topic>` (e.g. `feature/epic-10-3-pause-keys`) or `fix/<issue-or-topic>`.
- Avoid ultra-long names; include epic/story id if it helps **PM_PLAN** / EDGE traceability.

## Branch-first rule (agents)

- **Do not** stack substantial implementation on **`main`** and only then create a feature branch to “check in.” That bypasses a proper branch history, optional PRs, and the usual review surface.
- **Do** start each non-trivial slice on a **new branch**: `git fetch origin`, `git checkout main`, `git pull`, `git checkout -b feature/<topic>`, then implement, **`npm run ci`**, commit, push, merge (or open a PR).
- If work already landed on **`main`** without a branch, recover discipline going forward; optionally **`git checkout -b feature/<topic>`** from **`main`** before the _next_ slice so new commits are branch-first.

## Pre-checkin and pre-next-feature checks

- **Before commits** that change behavior or tests (not one-line doc typos): run **`npm run ci`** — Vitest, production build, Playwright E2E — same gate as [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) for **`main`**.
- **Before merging** to **`main`**: **`npm run ci`** green on the feature branch.
- **Before starting the next feature** after a merged story: run **`npm run ci`** on updated **`main`** (`git checkout main && git pull`) so Tier 1 + Tier 2 still pass against **origin/main** before new work begins (catches drift if the final gate was skipped).

## Standard sequence

1. **Start from current `main` (or agreed base):** `git fetch origin` when remote exists; `git status` (clean or intentional WIP).
2. **Create branch:** `git checkout -b <name>` — **before** writing production code for the slice.
3. **Implement** with tests as required by [tester skill](../tester/SKILL.md) and [TEST_TDD.md](../TEST_TDD.md).
4. **Gate before commit:** `npm run ci` (runs **`npm run lint`**, **`npm run format:check`**, Vitest, production build, Playwright E2E — same gate as [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) for **`main`**). Locally, **Husky** runs **lint-staged** on commit to apply Prettier + ESLint `--fix` to staged files.
5. **Commit:** clear, imperative subject line; body only if context helps (what/why, not noise). One logical commit per slice is fine; multiple small commits are fine if they tell a story.
6. **Push:** `git push -u origin <branch>` (first time); later `git push` on that branch.
7. **Optional PR:** If the user uses GitHub for review or diff, open a PR with a short title and **Test plan: `npm run ci` green** (or note what ran). This repo does not _require_ a PR to ship; merging locally to `main` and pushing is valid per AGENT_HANDOFF.
8. **After merge to `main`:** checkout `main`, `git pull`, **delete the local feature branch** (`git branch -d <branch>`). Delete remote branch if it was only for the PR: `git push origin --delete <branch>` when appropriate.
9. **Update product state** if scope shipped: [PM_PLAN.md](../../PM_PLAN.md) and [EDGE plan](../../doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) checkboxes — not only git history.

## What this skill does _not_ do

- Replace **code review** or **handoff** — see [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) and `.cursor/rules/handoff-checklist.mdc` when the user wants a handoff.
- Force a PR: follow the user’s preference and AGENT_HANDOFF’s **optional PR** model.
