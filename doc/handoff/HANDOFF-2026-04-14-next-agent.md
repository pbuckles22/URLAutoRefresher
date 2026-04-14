# Handoff — next agent (URL Auto Refresher)

**Last updated:** 2026-04-14 — baseline after **Epic 3.2** (individual job start/stop, edit, delete, countdown rows), Tier 1/2 coverage, Playwright **8** E2E tests. **`npm run ci`** and **`npm run test:coverage:lib`** were green when this note was written.

This file lives under **`doc/handoff/`** so it can be committed. (Optional duplicate: `.cursor/handoff/handoff-YYYY-MM-DD_HHmm.md` is gitignored per [.gitignore](../../.gitignore).)

**Canonical agent entry:** [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) — **Current state** should match this handoff.

---

## Mandatory first steps (before deep coding)

1. Read [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) — **Epic 3.3** next (shared list row); **Epic 4** follows for globals.
2. Read [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) — **TDD for Tier 1 (Vitest) and Tier 2 (Playwright)** before production code when that tier applies.
3. Read [TEST_PLAN.md](../../TEST_PLAN.md) — commands, coverage (`test:coverage` vs `test:coverage:lib`), E2E extension load.

---

## Code review (handoff pass)

**PASS** — Epic **3.2** follows existing patterns: pure helpers in `src/lib/` (`individual-jobs`, `dashboard-countdown`, `buildIndividualJobUpdateFromForm`) with unit tests; dashboard mutations go through `loadAppState` / `saveAppState` so validation and mutual exclusion stay centralized; rows expose stable **`data-*` hooks** used by `e2e/epic-3-2.spec.ts`. Countdown uses a 1s tick plus `chrome.storage.onChanged` so `nextFireAt` updates from the service worker refresh the UI.

**WARN (minor):** [src/dashboard/dashboard.ts](../../src/dashboard/dashboard.ts) is a large single module (row DOM, event delegation, add form) — **Epic 3.3** explicitly calls out extracting a **shared list row**; good fit. Three Playwright specs each use **`launchExtensionContext`** in `beforeAll` — acceptable; a shared global setup could reduce CI time later. Tab `<select>` on the add form will still scale poorly with many tabs (known product note).

---

## Tech debt

| Priority | Category | Note |
|----------|----------|------|
| Do first (Epic 3) | Product / structure | **3.3** — Extract **shared list row** component before Global UI ([plan](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md)). Reduces duplication before Epic 4–5. |
| Medium | Tests | **Branch coverage** on `saveAppState` throw paths and `parseAlarmName` edge cases — optional; `src/lib` statements **~94%** with `npm run test:coverage:lib` (see coverage table below). |
| Medium | Tier 2 | **Real alarms / `tabs.update`** still not in automated E2E (timing / flakiness); manual or future test hook. |
| Low | Lib | **`messages.ts`** — tiny file, 0% in lib coverage report; add tests if messaging grows. |
| Low | Docs | **Ref.1** in plan (reference PNGs under `doc/ui-reference/auto-refresh-plus/`) still open. |
| Low | CI | Consider Playwright **shard** or **shared browser fixture** if E2E count grows. |

---

## Code coverage / tests

| Gate | Result |
|------|--------|
| **`npm run ci`** | **Green** — Vitest **75** tests (**14** files), production **build**, Playwright **8** E2E tests. |
| Tier 1 | `npm test` — includes `individual-job-form`, `individual-jobs`, `dashboard-countdown`, state, storage, overlay schedule/UI, etc. |
| Tier 2 | `npm run test:e2e` — `extension.spec.ts` (overlay + prefs); **Epic 3.1** `epic-3-1.spec.ts`; **Epic 3.2** `epic-3-2.spec.ts` (toggle, delete, countdown rows, edit). |
| Coverage (optional) | `npm run test:coverage:lib` — **~94%** statements / **~91%** branches on `src/lib` (see run below). |

**Last `test:coverage:lib` snapshot:** All files **93.87%** statements (383/408), **90.62%** branches (145/160). Notable gaps: `storage.ts` throw branches (~73% statements), `state.ts` tail (~90%), `page-overlay-schedule.ts` partial lines (~83%).

**GitHub Actions:** `.github/workflows/ci.yml` — `xvfb-run -a npm run ci` on Ubuntu.

---

## Project readiness

**N/A** — Not a release milestone; Epic **3.3** (shared row component) is the next slice in the individual-jobs vertical track.

---

## Repository state (for a fresh clone)

- **Epics shipped in plan checkboxes:** **0–2** complete; **Epic 3.0–3.2** complete; **3.3** open; **4+** open.
- **Individual jobs (dashboard):** [dashboard/dashboard.html](../../dashboard/dashboard.html), [src/dashboard/dashboard.ts](../../src/dashboard/dashboard.ts); add form — `buildIndividualJobFromForm`; row actions — `individual-jobs.ts`, `buildIndividualJobUpdateFromForm`, `formatIndividualJobCountdown`.
- **E2E:** [e2e/epic-3-1.spec.ts](../../e2e/epic-3-1.spec.ts), [e2e/epic-3-2.spec.ts](../../e2e/epic-3-2.spec.ts), [e2e/extension.spec.ts](../../e2e/extension.spec.ts).
- **Docs:** TDD — `TEST_TDD.md`, `TEST_PLAN.md`, `.cursor/rules/testing.mdc`; `PM_PLAN.md` / `AGENT_HANDOFF.md` updated for **3.2** done.

---

## Done through 2026-04-14 (summary)

- **Epic 3.2** — Dashboard per-job **Start/Stop** (enabled + `nextFireAt` clear on stop), **Delete**, **Edit** (URL / interval / jitter) with validation; **`[data-job-countdown]`** per row; **`npm run ci`** green; plan checkbox **[x]**.
- **Tier 1** — `dashboard-countdown.ts`, `buildIndividualJobUpdateFromForm`, existing `individual-jobs` tests.
- **Tier 2** — `epic-3-2.spec.ts` unskipped; four scenarios + Epic 3.1 + extension smoke = **8** tests.

---

## Next up

1. **Epic 3.3** — Per [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md): extract **shared list row** component so dashboard (and later side panel / Epic 5) reuse the same module. Prefer **test-first** for any new pure render/format helpers; Playwright only if stable **`data-*`** contracts change.
2. **Epic 4** — Global groups (window/tab browser, mutual exclusion with individuals).
3. Run **`npm run ci`** after each logical step; manual Edge smoke still useful for non-Chromium differences.

---

## Open questions / blockers

- None for environment. **Product:** Tab-picker UX at scale; mutual-exclusion errors already surface from `saveAppState` / `validateEnabledEnrollment`.

---

## Key files

| Area | Path |
|------|------|
| Plan | [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) |
| TDD policy | [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) |
| Tests | [TEST_PLAN.md](../../TEST_PLAN.md) |
| Scheduler | [src/background/scheduler.ts](../../src/background/scheduler.ts) |
| Individual job logic | [src/lib/individual-job-form.ts](../../src/lib/individual-job-form.ts), [src/lib/individual-jobs.ts](../../src/lib/individual-jobs.ts), [src/lib/dashboard-countdown.ts](../../src/lib/dashboard-countdown.ts) |
| Dashboard | [dashboard/dashboard.html](../../dashboard/dashboard.html), [src/dashboard/dashboard.ts](../../src/dashboard/dashboard.ts) |
| E2E | [e2e/extension-helpers.ts](../../e2e/extension-helpers.ts), [e2e/epic-3-2.spec.ts](../../e2e/epic-3-2.spec.ts) |

---

## Older handoff note

[HANDOFF-2026-04-15-next-agent.md](./HANDOFF-2026-04-15-next-agent.md) — historical snapshot (post–Epic **3.1**); use **this file** for current baseline.
