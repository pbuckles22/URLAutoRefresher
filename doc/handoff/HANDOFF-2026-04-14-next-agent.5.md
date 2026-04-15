# Handoff — next agent (URL Auto Refresher)

**Revision:** `.5` — supersedes **[`.4`](./HANDOFF-2026-04-14-next-agent.4.md)** (post–Epic 4.1 baseline). Add **`.6`** when this content is superseded.

**Last updated:** 2026-04-14 — baseline after **Epic 4.2** (saved **global groups** list: **Global (N)** heading `[data-global-section-heading]`, **`formatGlobalGroupCountdown`**, **`createGlobalGroupListRow`**, **`src/lib/global-groups.ts`** (remove / replace / set enabled), **`buildGlobalGroupUpdateFromForm`** for row edit; dashboard delegated events for delete, start/stop, save edit; Tier 1 + Playwright **`e2e/epic-4-2.spec.ts`**). **`npm run ci`** was green when this note was written.

This file lives under **`doc/handoff/`** so it can be committed. (Optional duplicate: `.cursor/handoff/handoff-YYYY-MM-DD_HHmm.md` is gitignored per [.gitignore](../../.gitignore).)

**Canonical agent entry:** [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) — **Current state** should match this handoff.

---

## Mandatory first steps (before deep coding)

1. Read [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) — **Epic 4.3** next (mutual exclusion UX); **4.1–4.2** are done.
2. Read [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) — **TDD for Tier 1 (Vitest) and Tier 2 (Playwright)** before production code when that tier applies.
3. Read [TEST_PLAN.md](../../TEST_PLAN.md) — commands, coverage (`test:coverage` vs `test:coverage:lib`), E2E extension load.

---

## Code review (handoff pass)

**PASS** — Epic **4.2** mirrors the **3.3** pattern: pure **`global-groups`** updates, **`buildGlobalGroupUpdateFromForm`** aligned with **`saveAppState`**, DOM isolated in **`createGlobalGroupListRow`**. **`saveAppState`** remains the enforcement point for enrollment conflicts; row edit only changes name, interval, jitter, and per-tab **target URLs** (tab membership still comes from the **4.1** tab browser at create time).

**WARN (minor):** **`src/dashboard/dashboard.ts`** is still a thick orchestrator (prefs, individual list, global browser + **global groups list**, two countdown ticks, two delegated lists, storage listener). Further extraction is optional until **Epic 5** or a dedicated refactor.

---

## Tech debt

| Priority | Category | Note |
|----------|----------|------|
| Do first (Epic 4) | Product | **4.3** — Mutual exclusion when moving a tab between individual and global — surface **`saveAppState`** errors clearly in dashboard UI — [plan](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md). |
| Medium | Code | **`dashboard.ts`** size / responsibilities; optional split of global vs individual init modules. |
| Medium | Tests | Optional branch coverage on `saveAppState` throw paths / `parseAlarmName` edge cases; `npm run test:coverage:lib` for `src/lib`. |
| Medium | Tier 2 | Real alarms / `tabs.update` still not in automated E2E (timing / flakiness). |
| Low | Lib | **`messages.ts`** — add tests if messaging grows. |
| Low | Docs | **Ref.1** in plan (reference PNGs) still open. |
| Low | CI | Consider Playwright **shard** or shared fixture if E2E count grows. |

---

## Code coverage / tests

| Gate | Result |
|------|--------|
| **`npm run ci`** | **Green** — Vitest **99** tests (**19** files), production **build**, Playwright **11** E2E tests. |
| Tier 1 | `npm test` — includes **`global-groups.test.ts`**, **`global-group-form.test.ts`** (incl. update), **`dashboard-countdown.test.ts`** (global), **`global-group-list-row.test.ts`**. |
| Tier 2 | `npm run test:e2e` — includes **`e2e/epic-4-1.spec.ts`**, **`e2e/epic-4-2.spec.ts`**. |

**Optional:** `npm run test:coverage:lib` — use for `src/lib` statement/branch headline.

**GitHub Actions:** `.github/workflows/ci.yml` — `xvfb-run -a npm run ci` on Ubuntu.

---

## Project readiness

**N/A** — Not a release milestone; Epic **4.3** (mutual exclusion UX) is the next product slice in Epic 4.

---

## Repository state (for a fresh clone)

- **Epics shipped in plan checkboxes:** **0–3** complete; **Epic 4.1–4.2** complete; **4.3** open (Epic **4** row in the overview table stays open until **4.3** ships).
- **Global 4.1–4.2:** [`src/lib/window-tab-browser.ts`](../../src/lib/window-tab-browser.ts), [`src/lib/global-group-form.ts`](../../src/lib/global-group-form.ts), [`src/lib/global-groups.ts`](../../src/lib/global-groups.ts), [`src/lib/global-group-list-row.ts`](../../src/lib/global-group-list-row.ts), [`src/lib/dashboard-countdown.ts`](../../src/lib/dashboard-countdown.ts); dashboard — [`src/dashboard/dashboard.ts`](../../src/dashboard/dashboard.ts), [`dashboard/dashboard.html`](../../dashboard/dashboard.html).
- **E2E:** [`e2e/epic-4-1.spec.ts`](../../e2e/epic-4-1.spec.ts), [`e2e/epic-4-2.spec.ts`](../../e2e/epic-4-2.spec.ts), plus Epic 3 / extension specs.
- **Docs:** Plan story **4.2** **[x]** in [EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md); **PM_PLAN** / **AGENT_HANDOFF** / **TEST_PLAN** aligned with this note.

---

## Done through 2026-04-14 (summary)

- **Epic 4.2** — Globals list CRUD (start/stop, edit, delete), **Global (N)** header, shared per-group countdown; Tier 1 + Tier 2; plan checkbox; **`npm run ci`** green.

---

## Next up

1. **Epic 4.3** — Per [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md): mutual exclusion UX when moving tabs between individual and global (**`saveAppState`** already throws; show actionable messages on add forms and row saves).
2. **Epic 5** (later) — Unified UI / side panel sharing modules — see plan.
3. Run **`npm run ci`** after each logical step; manual Edge smoke still useful.

---

## Open questions / blockers

- None for environment. **Product:** Large tab lists — **Refresh tab list** + scrollable grid; tab-picker-at-scale remains a **5+** concern.

---

## Key files

| Area | Path |
|------|------|
| Plan | [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) |
| TDD policy | [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) |
| Tests | [TEST_PLAN.md](../../TEST_PLAN.md) |
| Tab browser (pure) | [src/lib/window-tab-browser.ts](../../src/lib/window-tab-browser.ts) |
| Global form + update (pure) | [src/lib/global-group-form.ts](../../src/lib/global-group-form.ts) |
| Global state helpers (pure) | [src/lib/global-groups.ts](../../src/lib/global-groups.ts) |
| Global list row (DOM) | [src/lib/global-group-list-row.ts](../../src/lib/global-group-list-row.ts) |
| Countdown (individual + global) | [src/lib/dashboard-countdown.ts](../../src/lib/dashboard-countdown.ts) |
| Dashboard | [src/dashboard/dashboard.ts](../../src/dashboard/dashboard.ts) |
| E2E 4.2 | [e2e/epic-4-2.spec.ts](../../e2e/epic-4-2.spec.ts) |
| Scheduler | [src/background/scheduler.ts](../../src/background/scheduler.ts) |

---

## Older revisions (same calendar note)

- **`.4`** — [HANDOFF-2026-04-14-next-agent.4.md](./HANDOFF-2026-04-14-next-agent.4.md) — post–Epic **4.1**.
- **`.3`** — [HANDOFF-2026-04-14-next-agent.3.md](./HANDOFF-2026-04-14-next-agent.3.md) — post–Epic **3.3**.
- **`.2`** — [HANDOFF-2026-04-14-next-agent.2.md](./HANDOFF-2026-04-14-next-agent.2.md) — post–Epic **3.2**.
- **`.1`** — [HANDOFF-2026-04-14-next-agent.1.md](./HANDOFF-2026-04-14-next-agent.1.md) — earlier **2026-04-14** archive.
- **Index** — [HANDOFF-2026-04-14-next-agent.md](./HANDOFF-2026-04-14-next-agent.md) — lists revisions and points to the latest.
