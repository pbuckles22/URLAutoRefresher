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
- **Skills:** [.cursor/skills/](.cursor/skills/) — DEV_GUIDE.md, TEST_TDD.md, DESIGN_SYSTEM.md, techwriter, tester, code-reviewer, tech-debt-evaluator, pm-governance, ui-ux, visual-match, chromium-mv3-extension, extension-architect, tech-lead, web-audio-dsp. **Globs (when to read them):** [.cursor/rules/skill-context-extension-architect.mdc](.cursor/rules/skill-context-extension-architect.mdc), [.cursor/rules/skill-context-tech-lead.mdc](.cursor/rules/skill-context-tech-lead.mdc).

## Pod (agents always working)

- **Techwriter:** Use when editing README, AGENT_HANDOFF, or internal docs.
- **Tester:** Black-box tests; run your **documented** test command after changes; keep the suite green. See [TEST_PLAN.md](TEST_PLAN.md).
- **Handoff (mandatory):** When the user wants a handoff, run code review (code-reviewer), tech debt (tech-debt-evaluator), and your **tests or coverage** as documented below; record results in a **local** handoff note (see above), not in this file. See [.cursor/rules/handoff-checklist.mdc](.cursor/rules/handoff-checklist.mdc).

## Run and test

```bash
npm install
npm run ci
```

`npm run ci` runs **`npm test`**, **`npm run build`**, and **`npm run test:e2e`** (Playwright with the unpacked extension). Use it before every PR; the same command runs in **GitHub Actions** (`.github/workflows/ci.yml`, with **xvfb** on Linux). For local iteration you can run `npm test`, `npm run build`, or `npm run test:e2e` separately.

Load unpacked in Edge from this repo root after a successful build (needs `dist/background.js`, `dist/page-overlay.js`, `dashboard/dashboard.js`, and `icons/`).

**Tier 2 (browser / content script):** Automated via **`npm run test:e2e`** — see [TEST_PLAN.md](TEST_PLAN.md). Additional manual smoke in Edge is still useful for release confidence.

## Conventions

- Prefer pure functions for business logic where possible.
- **Docs:** Use the **techwriter** skill when editing README, AGENT_HANDOFF, or internal docs.
- **Tests:** Black-box; run **`npm run ci`** after logic or test changes. **TDD:** test-first for **Tier 1 (Vitest)** and **Tier 2 (Playwright)** before production code when that tier applies — see [.cursor/skills/TEST_TDD.md](.cursor/skills/TEST_TDD.md) and the tester skill.

---

## Branch and pull request (how work lands on `main`)

**Goal:** Small, reviewable units; **every change** reaches `main` through an **approved PR** (you read **Files changed** on GitHub and merge when satisfied—treat the PR as the black-box boundary).

1. **Branch** from up-to-date `main` — one **story or coherent slice** per branch when possible (e.g. `epic-10/10.1-member-key-helpers`, `fix/overlay-pause-copy`). Short-lived branches are fine; **check in (push) often** on the branch so the PR stays small and easy to re-read.
2. **Before push / open PR:** Run **`npm run ci`** locally (same as [`.github/workflows/ci.yml`](.github/workflows/ci.yml): Vitest, build, Playwright E2E). Fix failures before requesting review.
3. **Review:** Use the **code-reviewer** skill (`.cursor/skills/code-reviewer/SKILL.md`) on the diff—agent or self—before or alongside the human PR review. Optionally **tech-debt-evaluator** or **extension-architect** / **tech-lead** for larger slices.
4. **Lead approval → auto-merge (automated):** [`.github/workflows/lead-auto-merge.yml`](.github/workflows/lead-auto-merge.yml) runs when someone submits **Approve** on a PR. If their GitHub username is listed in the **lead** allowlist, the workflow runs **`gh pr merge --auto`**, so GitHub **merges to `main` automatically** once **CI** and **branch protection** rules are satisfied (no extra local `git push` to `main`). **One-time repo setup:** enable **Allow auto-merge** (Settings → General → Pull Requests). Optionally set Actions variable **`LEAD_APPROVER_LOGINS`** to comma-separated usernames; if unset, the workflow default is **`pbuckles22`**—edit the workflow file to change the default. Add branch protection on **`main`** requiring the **`ci`** check (and extra required reviewers if you want more than the lead gate).
5. **Direct push to `main`:** Avoid for product or behavior changes; reserve for true emergencies or repo hygiene you explicitly allow.
6. **Linting:** This repo has **no separate ESLint/Prettier** skill or script today. **Quality gate** = TypeScript (via build), **Vitest**, **Playwright**, and **code-reviewer** discipline. If you add ESLint later, document the command here and optionally add a **`lint`** npm script + CI step.

**GitHub:** There is no Cursor **GitHub skill** in `.cursor/skills/`. Use the GitHub **web UI** (PR, **Files changed**, checks) or [GitHub CLI](https://cli.github.com/) (`gh pr create`, `gh pr checks`). Same **`npm run ci`** runs on **`pull_request`** to `main` / `master`.

---

## Handoff protocol

When ending a session: (1) Run the handoff checklist (code review, tech debt, tests/coverage). (2) Update **[PM_PLAN.md](PM_PLAN.md)** and epic checkboxes in the **EDGE plan** if shipped scope changed — that is what **`main`** carries for **product** state. (3) Write a **local** session note under **`doc/handoff/`** (`HANDOFF-*.md`) and/or **`.cursor/handoff/handoff-*.md`** (both gitignored). Use a **timestamped filename** (`HANDOFF-YYYY-MM-DD-HHmmss.md`) and a **Recorded** line in the body when more than one handoff per day is possible. (4) Include Code review, Tech debt, Tests / CI, Done this session, Next up. Anything the team must see on GitHub should land in **PM_PLAN**, the **EDGE plan**, **README**, or the **PR** — not in tracked `doc/handoff/` session files.
