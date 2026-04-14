# Agent handoff — URL Auto Refresher

## Purpose

**URL Auto Refresher** is a Chromium Manifest V3 **Edge extension**: scheduled refreshes to a configured target URL per tab, with optional synchronized groups, individual timers, jitter, and a focus-aware toolbar badge.

This repo also uses the **[AgenticTemplate](https://github.com/pbuckles22/AgenticTemplate)** layer: Cursor rules, skills, handoff protocol, and testing discipline (stack-agnostic).

## Source of truth

- **Relocating the repo (UNC → local):** [Docs/HANDOFF_MOVE_TO_LOCAL.md](Docs/HANDOFF_MOVE_TO_LOCAL.md)
- **Product / epics:** [Docs/EDGE_URL_AUTO_REFRESHER_PLAN.md](Docs/EDGE_URL_AUTO_REFRESHER_PLAN.md)
- **Scope / phases:** [PM_PLAN.md](PM_PLAN.md)
- **Skills:** [.cursor/skills/](.cursor/skills/) — DEV_GUIDE.md, TEST_TDD.md, DESIGN_SYSTEM.md, techwriter, tester, code-reviewer, tech-debt-evaluator, pm-governance, ui-ux, game-readiness, visual-match

## Pod (agents always working)

- **Techwriter:** Use when editing README, AGENT_HANDOFF, or internal docs.
- **Tester:** Black-box tests; run your **documented** test command after changes; keep the suite green. See [TEST_PLAN.md](TEST_PLAN.md).
- **Handoff (mandatory):** When the user wants a handoff, run code review (code-reviewer), tech debt (tech-debt-evaluator), and your **tests or coverage** as documented below; record in the handoff note. See [.cursor/rules/handoff-checklist.mdc](.cursor/rules/handoff-checklist.mdc).

## Current state

- **Epic 0:** Done — MV3 shell, `manifest.json`, service worker build (`dist/background.js`), full-page `dashboard/`, `sidepanel/` stub, toolbar opens dashboard.
- **Epic 1:** Done — `AppState` types (`src/lib/types.ts`), `loadAppState` / `saveAppState` (`src/lib/storage.ts`), URL/interval/jitter validation, unique ids, enabled enrollment + field validation (`src/lib/state.ts`). In-dashboard error messaging for conflicts ships with Epic 3+ UI.
- **Epic 2:** Done — `src/background/scheduler.ts`: `chrome.alarms` (names `urlar:i:*` / `urlar:g:*`), `tabs.update` on fire, `nextFireAt` persisted, `tabs.onRemoved` + `applyTabRemoved`, storage debounce resync. In-dashboard enable/save for jobs still Epic 3 (state today via devtools or future UI).
- **Next:** Epic 3 — Dashboard UI for individual jobs (add/edit/start/stop) — [Docs/EDGE_URL_AUTO_REFRESHER_PLAN.md](Docs/EDGE_URL_AUTO_REFRESHER_PLAN.md).

## Run and test

```bash
npm install
npm run ci
```

`npm run ci` runs **`npm test`** then **`npm run build`** — use it before every PR; the same command runs in **GitHub Actions** (`.github/workflows/ci.yml`). For local iteration only, you can run `npm test` and `npm run build` separately.

Load unpacked in Edge from this repo root after a successful build (needs `dist/background.js`, `dashboard/dashboard.js`, and `icons/`).

## Conventions

- Prefer pure functions for business logic where possible.
- **Docs:** Use the **techwriter** skill when editing README, AGENT_HANDOFF, or internal docs.
- **Tests:** Black-box; run your project test command after logic or test changes; keep the suite green (see .cursor/skills/tester/SKILL.md). Prefer writing a failing test before new production code (TDD) where applicable.

---

## Handoff protocol

When ending a session: (1) Run the handoff checklist (code review, tech debt, tests/coverage). (2) Update "Current state" above if needed. (3) Write a handoff note in `.cursor/handoff/` (filename: `handoff-YYYY-MM-DD_HHmm.md`). (4) Include Code review, Tech debt, Code coverage / tests, Done this session, Next up. Use `.cursor/handoff/_template.md` as a starting point.
