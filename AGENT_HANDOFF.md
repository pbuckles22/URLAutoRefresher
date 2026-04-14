# Agent handoff — URL Auto Refresher

## Purpose

**URL Auto Refresher** is a Chromium Manifest V3 **Edge extension**: scheduled refreshes to a configured target URL per tab, with optional synchronized groups, individual timers, jitter, and a focus-aware toolbar badge.

This repo also uses the **[AgenticTemplate](https://github.com/pbuckles22/AgenticTemplate)** layer: Cursor rules, skills, handoff protocol, and testing discipline (stack-agnostic).

## Source of truth

- **Relocating the repo (UNC → local):** [doc/handoff/HANDOFF_MOVE_TO_LOCAL.md](doc/handoff/HANDOFF_MOVE_TO_LOCAL.md)
- **Product / epics:** [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md)
- **Scope / phases:** [PM_PLAN.md](PM_PLAN.md)
- **Skills:** [.cursor/skills/](.cursor/skills/) — DEV_GUIDE.md, TEST_TDD.md, DESIGN_SYSTEM.md, techwriter, tester, code-reviewer, tech-debt-evaluator, pm-governance, ui-ux, visual-match

## Pod (agents always working)

- **Techwriter:** Use when editing README, AGENT_HANDOFF, or internal docs.
- **Tester:** Black-box tests; run your **documented** test command after changes; keep the suite green. See [TEST_PLAN.md](TEST_PLAN.md).
- **Handoff (mandatory):** When the user wants a handoff, run code review (code-reviewer), tech debt (tech-debt-evaluator), and your **tests or coverage** as documented below; record in the handoff note. See [.cursor/rules/handoff-checklist.mdc](.cursor/rules/handoff-checklist.mdc).

## Current state

- **Epic 0:** Done — MV3 shell, `manifest.json`, service worker build (`dist/background.js`), full-page `dashboard/`, `sidepanel/` stub, toolbar opens dashboard.
- **Epic 1:** Done — `AppState` types (`src/lib/types.ts`), `loadAppState` / `saveAppState` (`src/lib/storage.ts`), URL/interval/jitter validation, unique ids, enabled enrollment + field validation (`src/lib/state.ts`). In-dashboard error messaging for conflicts ships with Epic 3+ UI.
- **Epic 2:** Done — `src/background/scheduler.ts`: `chrome.alarms` (names `urlar:i:*` / `urlar:g:*`), `tabs.update` on fire, `nextFireAt` persisted, `tabs.onRemoved` + `applyTabRemoved`, storage debounce resync.
- **Epic 3 (partial):** **3.0–3.2 done** — Overlay + prefs; add job form (`buildIndividualJobFromForm`); per-job rows with **Start/Stop**, **Delete**, **Edit** (`buildIndividualJobUpdateFromForm`, `individual-jobs` helpers), `[data-job-countdown]` + 1s tick + `storage.onChanged`; Playwright `e2e/epic-3-2.spec.ts`.
- **Next:** Epic **3.3** — shared list row component (ahead of Global UI) — [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md).
- **Latest handoff:** [doc/handoff/HANDOFF-2026-04-14-next-agent.md](doc/handoff/HANDOFF-2026-04-14-next-agent.md) (index). **Current baseline:** [doc/handoff/HANDOFF-2026-04-14-next-agent.2.md](doc/handoff/HANDOFF-2026-04-14-next-agent.2.md) — post–Epic **3.2**, **`Last updated:` 2026-04-14**. Older dot revisions (`.1`) and the separate **2026-04-15** snapshot remain in `doc/handoff/` without overwriting.

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

When ending a session: (1) Run the handoff checklist (code review, tech debt, tests/coverage). (2) Update "Current state" above if needed. (3) Write a handoff note in `.cursor/handoff/` (filename: `handoff-YYYY-MM-DD_HHmm.md`). (4) Include Code review, Tech debt, Code coverage / tests, Done this session, Next up. Use `.cursor/handoff/_template.md` as a starting point.
