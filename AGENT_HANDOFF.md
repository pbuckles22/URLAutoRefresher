# Agent handoff — URL Auto Refresher

## Purpose

**URL Auto Refresher** is a Chromium Manifest V3 **Edge extension**: scheduled refreshes to a configured target URL per tab, with optional synchronized groups, individual timers, jitter, and a focus-aware toolbar badge.

This repo also uses the **[AgenticTemplate](https://github.com/pbuckles22/AgenticTemplate)** layer: Cursor rules, skills, handoff protocol, and testing discipline (stack-agnostic).

## Scope of this file

**AGENT_HANDOFF.md** is **generic process**: commands, conventions, where documentation lives, and how to hand off. It does **not** duplicate a full epic inventory — that lives in the **EDGE product plan** (checkboxes) and **[PM_PLAN.md](PM_PLAN.md)** (phase summary) on **`main`**.

**Session handoff narratives** (reviews, CI, done / next) are **not** part of the published repo: use **`doc/handoff/HANDOFF-*.md`** (gitignored) or **`.cursor/handoff/handoff-*.md`** (gitignored). The **only** tracked file under `doc/handoff/` is **[HANDOFF_MOVE_TO_LOCAL.md](doc/handoff/HANDOFF_MOVE_TO_LOCAL.md)** (UNC → local disk, for contributors).

## Source of truth

- **Relocating the repo (UNC → local):** [doc/handoff/HANDOFF_MOVE_TO_LOCAL.md](doc/handoff/HANDOFF_MOVE_TO_LOCAL.md)
- **Product spec and epic checklist:** [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) — epic/story checkboxes are authoritative for shipped behavior; the plan’s **Backlog** defers to epics when the same scope is spelled out there (one spec, no drift).
- **Phase summary (done / next):** [PM_PLAN.md](PM_PLAN.md)
- **Session notes (local only):** see [.gitignore](.gitignore). **Filename (recommended):** `doc/handoff/HANDOFF-YYYY-MM-DD-HHmmss.md` — **date + local time (24h)** in the name so multiple handoffs **per day** do not collide. Example: `HANDOFF-2026-04-17-143022.md`. Alternative: `.cursor/handoff/handoff-YYYY-MM-DD_HHmm.md`. **Inside the file:** put an ISO-style **Recorded** line under the title (e.g. `Recorded: 2026-04-17T14:30:22-05:00` or UTC) for humans and search.
- **Skills:** [.cursor/skills/](.cursor/skills/) — DEV_GUIDE.md, TEST_TDD.md, DESIGN_SYSTEM.md, techwriter, tester, code-reviewer, code-quality-gate, tech-debt-evaluator, pm-governance, ui-ux, visual-match, chromium-mv3-extension, extension-architect, tech-lead, web-audio-dsp. **Globs (when to read them):** [.cursor/rules/skill-context-extension-architect.mdc](.cursor/rules/skill-context-extension-architect.mdc), [.cursor/rules/skill-context-tech-lead.mdc](.cursor/rules/skill-context-tech-lead.mdc).

## Pod (agents always working)

- **Techwriter:** Use when editing README, AGENT_HANDOFF, or internal docs.
- **Tester:** Black-box tests; run your **documented** test command after changes; keep the suite green. See [TEST_PLAN.md](TEST_PLAN.md).
- **Handoff (mandatory):** When the user wants a handoff, run code review (code-reviewer), tech debt (tech-debt-evaluator), and your **tests or coverage** as documented below; record results in a **local** handoff note (see above), not in this file. See [.cursor/rules/handoff-checklist.mdc](.cursor/rules/handoff-checklist.mdc).

## Run and test

```bash
npm install
npm run ci
```

`npm run ci` runs **`npm run lint`** (ESLint — see `eslint.config.mjs`), **`npm run format:check`** (Prettier — see `.prettierrc.json`), then **`npm test`**, **`npm run build`**, and **`npm run test:e2e`** (Playwright with the unpacked extension). Run it **before every push to `main`** (or merge into `main`); the same command runs in **GitHub Actions** on push and PR (`.github/workflows/ci.yml`, with **xvfb** on Linux). For local iteration you can run `npm run lint`, `npm run format:check`, `npm test`, `npm run build`, or `npm run test:e2e` separately. **`npm run format`** applies Prettier to the tree (use before commit if you skipped the hook).

Load unpacked in Edge from this repo root after a successful build (needs `dist/background.js`, `dist/page-overlay.js`, `dashboard/dashboard.js`, and `icons/`).

**Tier 2 (browser / content script):** Automated via **`npm run test:e2e`** — see [TEST_PLAN.md](TEST_PLAN.md). Additional manual smoke in Edge is still useful for release confidence.

## Conventions

- Prefer pure functions for business logic where possible.
- **Docs:** Use the **techwriter** skill when editing README, AGENT_HANDOFF, or internal docs.
- **Tests:** Black-box; run **`npm run ci`** after logic or test changes. **TDD:** test-first for **Tier 1 (Vitest)** and **Tier 2 (Playwright)** before production code when that tier applies — see [.cursor/skills/TEST_TDD.md](.cursor/skills/TEST_TDD.md) and the tester skill.

---

## Git workflow (how work lands on `main`)

This repo is **not** using a mandatory GitHub **pull-request / approval** gate—no “person in the middle” between you and `main`. **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) remains the quality bar.

1. **`main` is the integration branch.** Commit locally, run **`npm run ci`**, then **`git push origin main`** when green. For any **coherent slice** (feature, fix, or refactor worth recording), prefer a short-lived **`feature/<topic>`** branch first, then merge into **`main`** after CI is green — see [.cursor/skills/github-feature-workflow/SKILL.md](.cursor/skills/github-feature-workflow/SKILL.md). Trivial one-line typos can stay on **`main`** if you prefer.
2. **Before push:** Run **`npm run ci`** (lint, Prettier check, Vitest, build, Playwright E2E). Fix failures before pushing.
3. **Before commit (summaries + your OK):** After **`npm run ci`** is green, **before** `git commit` (and before push), use **[.cursor/skills/techwriter/SKILL.md](.cursor/skills/techwriter/SKILL.md)** for tone and structure. Treat the next two bullets as **two fixed audiences**—not one paragraph that tries to do both.
   - **Maintainers / plan language (first blurb):** Short **what changed** tied to **[PM_PLAN.md](PM_PLAN.md)** and the **[EDGE plan](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md)** (epic or story, outcomes, risks). File or module names are fine here when they help navigation.
   - **Extension user (second blurb):** One short paragraph as if **release notes for someone who only installs the extension and uses the UI**—what is better, safer, or unchanged in everyday words. **Do not** mention code structure or toolchain: no file paths, type or variable names, HTML/CSS/DOM wording, browser or Chrome API names, test runners, branches, or commit hashes unless the user explicitly asked for technical detail. If you cannot say it without those words, describe the **user-visible effect** instead (e.g. “the timer list still behaves the same” rather than “we refactored the list binder”).
   - **Habit check:** Before sending, ask: _Would a teammate who does not ship code understand the second paragraph without looking at the repo?_ If not, rewrite the user blurb only.
   - **Unless** the user already said to commit/ship/check in (or “don’t wait”), **stop and wait for their explicit OK** before running `git commit`. They may reply with scope edits; only then commit.
4. **Review (optional):** Use **code-reviewer**, **tech-debt-evaluator**, or **extension-architect** / **tech-lead** when useful—tools for you and agents, not a merge blocker.
5. **Lint + format:** **`npm run lint`** and **`npm run format:check`** are the first two steps of **`npm run ci`**. **`eslint-config-prettier`** disables ESLint rules that fight Prettier. After `npm install`, **Husky** runs **`lint-staged`** on **`git commit`** (Prettier write + ESLint `--fix` on staged files). For **change-aware** review, use **code-quality-gate** (`.cursor/skills/code-quality-gate/SKILL.md`) with **code-reviewer**. To install dependencies without Git hooks (e.g. tarball extract), set **`HUSKY=0`** for that `npm install`.

**GitHub (optional gate before `main`):** The repo does **not** require a PR to ship, but you **can** use GitHub so summaries appear **before** anything lands on **`main`**: push a **feature branch** (with commits), put the **same two summaries** (plan + regular user) in the **PR description** or first comment, and **do not merge** until you approve. Your “allow check-in” is then **Merge** on GitHub. That still allows commits on the branch; it adds review **before `main`**. For **no `git commit` at all** until you say so, use step 3’s **chat OK** (agent stages, runs CI, posts summaries, waits for your **“commit”**).

**GitHub:** Optional PRs or **`gh`** still work if you want a diff view; they are **not** required to ship. **Agents:** default is **summaries + wait for OK** (step 3); if the user chose the **PR gate**, push the branch, put summaries in the PR, merge only when they approve. Otherwise **`npm run ci` green**, then **commit** and **push / merge** per above; see [.cursor/skills/github-feature-workflow/SKILL.md](.cursor/skills/github-feature-workflow/SKILL.md).

---

## Handoff protocol

When ending a session: (1) Run the handoff checklist (code review, tech debt, tests/coverage). (2) Update **[PM_PLAN.md](PM_PLAN.md)** and epic checkboxes in the **EDGE plan** if shipped scope changed — that is what **`main`** carries for **product** state. (3) Write a **local** session note under **`doc/handoff/`** (`HANDOFF-*.md`) and/or **`.cursor/handoff/handoff-*.md`** (both gitignored). Use a **timestamped filename** (`HANDOFF-YYYY-MM-DD-HHmmss.md`) and a **Recorded** line in the body when more than one handoff per day is possible. (4) Include Code review, Tech debt, Tests / CI, Done this session, Next up. Anything others must see on GitHub should land in **PM_PLAN**, the **EDGE plan**, or **README** — not only in gitignored handoff notes.
