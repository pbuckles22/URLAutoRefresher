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
- **Session notes (local only):** `doc/handoff/HANDOFF-YYYY-MM-DD-next-agent.md` + dot revisions, or `.cursor/handoff/handoff-YYYY-MM-DD_HHmm.md` — see [.gitignore](.gitignore).
- **Skills:** [.cursor/skills/](.cursor/skills/) — DEV_GUIDE.md, TEST_TDD.md, DESIGN_SYSTEM.md, techwriter, tester, code-reviewer, tech-debt-evaluator, pm-governance, ui-ux, visual-match

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

## Handoff protocol

When ending a session: (1) Run the handoff checklist (code review, tech debt, tests/coverage). (2) Update **[PM_PLAN.md](PM_PLAN.md)** and epic checkboxes in the **EDGE plan** if shipped scope changed — that is what **`main`** carries for **product** state. (3) Write a **local** session note under **`doc/handoff/`** (`HANDOFF-*.md`) and/or **`.cursor/handoff/handoff-*.md`** (both gitignored). (4) Include Code review, Tech debt, Tests / CI, Done this session, Next up. Anything the team must see on GitHub should land in **PM_PLAN**, the **EDGE plan**, **README**, or the **PR** — not in tracked `doc/handoff/` session files.
