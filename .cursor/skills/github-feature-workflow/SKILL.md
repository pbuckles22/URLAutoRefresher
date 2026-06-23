---
name: github-feature-workflow
description: >-
  Short-lived feature branches only — never commit on main; merge then push.
  TDD + lint + npm run ci as exit criteria before commit on the branch.
  Do not default to asking the user to open a PR. Use when implementing a
  feature or non-trivial fix, when the user asks for branch/git workflow, or
  after substantial edits that should not stay uncommitted.
---

# GitHub / feature branch workflow (this repo)

**Product policy** (source of truth): [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) — `main` is the integration branch (**no direct commits**; merge only); **`npm run ci`** is the quality bar. This skill defines **how work is finished**: branch → tests (TDD where the tier applies) → lint → format → CI green → **commit on the branch** → merge → **push** per AGENT_HANDOFF. **Pull requests are not part of the default exit** for this repo unless the user explicitly asks for a PR or GitHub-based review.

## Do not prompt for PRs (agents)

- **Do not** tell the user to “open a PR,” paste `github.com/.../pull/new/...` links, or treat opening a PR as the normal end-of-task step.
- **Do** treat **green local `npm run ci`** as **commit-ready**, and **green GitHub Actions CI on `main`** as **ship-complete** (see [Post-push gate](#post-push-gate-github-actions-mandatory)).
- **If** the user says they want a PR, GitHub review, or external reviewers: then describe or open the PR as they asked.

**Completion mental model:** one branch ≈ one purpose → **local** `npm run ci` green → **commit on the branch** (never on **`main`**) → merge to **`main`** → **`npm run push:main`** (or push then **`npm run ci:watch-gh`**) → **GitHub CI green** → delete feature branch → update PM_PLAN/EDGE. **Ship complete** only after **both** local and GitHub CI pass. No roundabout “please open a PR” unless they chose that path.

## When to apply

- User asks for a **feature branch**, **commit**, **push**, or **merge** (or explicitly **PR**).
- A **coherent slice** of work is done (e.g. one epic story, one bugfix) and should be **recorded in git** before the session ends.
- **Every** slice that gets a **`git commit`** uses a branch — including doc-only and typo fixes. **`main` never receives direct commits.**

## Branch naming

- Prefer: `feature/<short-kebab-topic>` (e.g. `feature/epic-10-3-pause-keys`) or `fix/<issue-or-topic>`.
- Avoid ultra-long names; include epic/story id if it helps **PM_PLAN** / EDGE traceability.

## Branch-first rule (agents) — mandatory

- **Never `git commit` on `main`.** **`main` advances only via merge** from a feature or fix branch (local merge or GitHub merge/PR when the user opts in).
- **Do not** implement on **`main`** then branch only to “check in.” Start the branch **before** the first commit of the slice.
- **Do** start **every** slice on a **new branch**: `git fetch origin`, `git checkout main`, `git pull`, `git checkout -b feature/<topic>` (or `fix/<topic>`), then implement, **`npm run ci`**, commit on that branch, merge to `main` per [Standard sequence](#standard-sequence) (no default PR step).
- If commits already landed on **`main`** without a branch, recover discipline on the **next** slice; do not treat that as permission to commit on **`main`** again.

## Exit criteria before commit (ship bar)

Treat these as satisfied **before** `git commit` on the **feature branch** (adjust if the user narrows scope):

0. **Version** — When shipping an EDGE story or epic closure, bump **`package.json`** to **`MAJOR.EPIC.STORY`** per [doc/VERSIONING.md](../../doc/VERSIONING.md); run **`npm run build`** (syncs **`manifest.json`**). Skip for doc-only commits with no checkbox change.
1. **TDD / tests** — [TEST_TDD.md](../TEST_TDD.md) + [tester](../tester/SKILL.md): failing test first when the changed surface is covered by Tier 1 or Tier 2; suite green for what you touched.
2. **Lint + format** — covered by **`npm run ci`** (`eslint`, Prettier check).
3. **Full CI** — **`npm run ci`** green (Vitest, build, Playwright E2E for this repo).
4. **Quality** — For non-trivial edits, use [code-quality-gate](../code-quality-gate/SKILL.md) as appropriate (readability, complexity, obvious foot-guns).

When 1–4 are green: **commit**. **Push / merge** per AGENT_HANDOFF. **Ship-complete** only after [Post-push gate](#post-push-gate-github-actions-mandatory) — not merely after local CI.

## Pre-checkin and pre-next-feature checks

- **Before commits** on the feature branch: run **`npm run ci`** — Vitest, production build, Playwright E2E — same gate as [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) before merge to **`main`**.
- **Before merging** to **`main`**: **`npm run ci`** green on the feature branch.
- **Before starting the next feature** after a merged story: run **`npm run ci`** on updated **`main`** (`git checkout main && git pull`) so Tier 1 + Tier 2 still pass against **origin/main** before new work begins (catches drift if the final gate was skipped).

## Post-push gate (GitHub Actions — mandatory)

After **`git push origin main`** (directly or after merging a feature branch):

1. **Default (automated):** **`npm install`** sets local **`git config alias.push`** → **`Scripts/git-push-wrapper.mjs`**. A normal **`git push`** while on **`main`** (or **`git push origin main`**) runs **`push-main-watch-ci.mjs`**: local **`npm run ci`** → push → **`gh run watch --exit-status`**. **`.husky/pre-push`** also runs **`npm run ci`** if someone bypasses the alias.
2. **Manual equivalents:** **`npm run push:main`**, **`npm run ci:watch-gh`** (watch only).
3. If GitHub CI fails: fix, commit, **`git push`** again (full cycle reruns).
4. **Agents:** do **not** mark shipped or write “ship complete” until GitHub CI is green (unless push/`gh` failed — say so explicitly).

Escape hatches: **`URLAR_SKIP_CI=1`**, **`URLAR_SKIP_GH_WATCH=1`**, or **`git -c alias.push= push --no-verify origin main`**.

## Standard sequence

1. **Start from current `main` (or agreed base):** `git fetch origin` when remote exists; `git status` (clean or intentional WIP).
2. **Create branch:** `git checkout -b <name>` — **before** writing production code for the slice.
3. **Implement** with tests as required by [tester skill](../tester/SKILL.md) and [TEST_TDD.md](../TEST_TDD.md) (**red → green** when that tier applies).
4. **Gate before commit:** meet **[Exit criteria before commit](#exit-criteria-before-commit-ship-bar)** (version bump **first** when shipping a story); **`npm run ci`** is the all-in-one gate here. Locally, **Husky** runs **lint-staged** on commit to apply Prettier + ESLint `--fix` to staged files.
5. **Commit on the branch** (never on **`main`**): clear, imperative subject line; body only if context helps (what/why, not noise). One logical commit per slice is fine; multiple small commits are fine if they tell a story.
6. **Push:** `git push -u origin <branch>` (first time); later `git push` on that branch.
7. **Integrate to `main`:** Prefer what the user asked for: **local merge** (`git checkout main && git pull && git merge <branch> && npm run ci`) when they want work on **`main`** without a PR, or **they** handle GitHub merge if they use the web UI. **Do not** nudge them toward opening a PR by default.
8. **Push + GitHub CI (automated on `main`):** merge to **`main`**, then **`git push origin main`** (alias runs local CI + push + GH watch). Or **`npm run push:main`**. See [Post-push gate](#post-push-gate-github-actions-mandatory).
9. **After merge to `main`:** checkout `main`, `git pull`, **delete the local feature branch** (`git branch -d <branch>`). Delete remote: `git push origin --delete <branch>` when the user wants the remote branch removed.
10. **Update product state** if scope shipped: [PM_PLAN.md](../../PM_PLAN.md) and [EDGE plan](../../doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) checkboxes — not only git history.

**PR (explicit opt-in only):** If and only if the user asked for a PR or GitHub review, add a PR with a short title and note **`npm run ci` green**. Otherwise skip PR language entirely.

## What this skill does _not_ do

- Replace **code review** or **handoff** — see [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) and `.cursor/rules/handoff-checklist.mdc` when the user wants a handoff.
- **Invent a PR step** — PRs are not the default completion signal; **local CI + GitHub CI green + push** is.
