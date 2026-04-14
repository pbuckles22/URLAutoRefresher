# Handoff — next agent (URL Auto Refresher)

**Last updated:** 2026-04-15 — baseline after **Epic 3.1** (dashboard add individual job), Tier 1/2 TDD policy, coverage split, Playwright CI. **`npm run ci`** was green when this note was written.

This file lives under **`doc/handoff/`** so it can be committed. (Optional duplicate: `.cursor/handoff/handoff-YYYY-MM-DD_HHmm.md` is gitignored per [.gitignore](../../.gitignore).)

**Canonical agent entry:** [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) — **Current state** is aligned with this handoff.

---

## Mandatory first steps (before deep coding)

1. Read [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) — **Epic 3.2–3.3** next for the individual-jobs vertical slice.
2. Read [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) — **TDD for Tier 1 (Vitest) and Tier 2 (Playwright)** before production code when that tier applies.
3. Read [TEST_PLAN.md](../../TEST_PLAN.md) — commands, coverage (`test:coverage` vs `test:coverage:lib`), E2E setup.

---

## Code review (handoff pass)

**PASS** — Epic **3.1** follows existing patterns: `buildIndividualJobFromForm` in `src/lib/` with unit tests; dashboard uses `loadAppState` / `saveAppState` so validation + mutual exclusion stay centralized; scheduler already resyncs on `chrome.storage` changes.

**WARN (minor):** Two Playwright files each call `launchExtensionContext` (`e2e/extension.spec.ts`, `e2e/epic-3-1.spec.ts`) — acceptable; could later share a global setup to shave CI time. Dashboard tab `<select>` will grow unwieldy with many tabs (Epic 3.2+ UX).

---

## Tech debt

| Priority | Category | Note |
|----------|----------|------|
| Do first (Epic 3) | Product / UX | **3.2** — start/stop, edit, delete individuals; **one countdown row** per job ([plan](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md)). TDD per TEST_TDD.md. |
| Medium | Tests | **Branch coverage** on `saveAppState` throw paths and `parseAlarmName` empty-id arms — optional; statements ~92% on `src/lib` with `npm run test:coverage:lib`. |
| Medium | Tier 2 | **Real alarms / `tabs.update`** still not in automated E2E (timing / flakiness); manual or future hook. |
| Low | Docs | **Ref.1** in plan (reference PNGs under `doc/ui-reference/auto-refresh-plus/`) still open. |
| Low | CI | Consider Playwright **shard** or **shared browser fixture** if E2E count grows. |

---

## Code coverage / tests

| Gate | Result |
|------|--------|
| **`npm run ci`** | **Green** — Vitest **64** tests (12 files), production **build**, Playwright **4** E2E tests. |
| Tier 1 | `npm test` — includes `src/lib/individual-job-form.test.ts`, manifest, prefs, overlay, state, etc. |
| Tier 2 | `npm run test:e2e` — overlay + pref (`extension.spec.ts`); **Epic 3.1** add-job form (`epic-3-1.spec.ts`). |
| Coverage (optional) | `npm run test:coverage:lib` for **~92%** headline on `src/lib` only (see TEST_PLAN). |

**GitHub Actions:** `.github/workflows/ci.yml` — `xvfb-run -a npm run ci` on Ubuntu.

---

## Project readiness

**N/A** — Not a release milestone; Epic **3.2** is the next product slice.

---

## Repository state (for a fresh clone)

- **Epics shipped in plan checkboxes:** **0–2** complete; **Epic 3.0–3.1** complete; **3.2–3.3** open.
- **Add individual job:** [dashboard/dashboard.html](../../dashboard/dashboard.html) — section **Individual job**; [src/dashboard/dashboard.ts](../../src/dashboard/dashboard.ts); [src/lib/individual-job-form.ts](../../src/lib/individual-job-form.ts).
- **E2E:** [e2e/epic-3-1.spec.ts](../../e2e/epic-3-1.spec.ts).
- **Docs:** TDD — `TEST_TDD.md`, `TEST_PLAN.md`, `.cursor/rules/testing.mdc`, `always.mdc`; `PM_PLAN.md` updated.

---

## Done through 2026-04-15 (summary)

- **Epic 3.1** — Dashboard form: tab picker (`chrome.tabs.query`), target URL, interval, jitter, Save → `individualJobs` via `saveAppState`; simple list of jobs; Playwright E2E; plan checkbox **[x]**.
- **Testing discipline** — Documented **two-tier TDD** (Vitest + Playwright) before code; coverage commands (`test:coverage`, `test:coverage:lib`).
- **Automation** — Playwright in CI (Chromium + xvfb); prior work: overlay E2E, manifest tests, `page-overlay-ui`, etc.

---

## Next up

1. **Epic 3.2** — Per [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md): Start / Stop, edit, delete individuals; **one countdown row** per job. **TDD:** failing Vitest for any new pure logic; failing Playwright for dashboard behaviors that need the browser.
2. **Epic 3.3** — Extract shared list row component (ahead of Global UI).
3. Run **`npm run ci`** after each logical step; manual Edge smoke still valuable for non-Chromium differences.

---

## Open questions / blockers

- None for environment. **Product:** Tab picker UX at scale; mutual-exclusion errors already surface from `saveAppState` / `validateEnabledEnrollment`.

---

## Key files

| Area | Path |
|------|------|
| Plan | [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) |
| TDD policy | [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) |
| Tests | [TEST_PLAN.md](../../TEST_PLAN.md) |
| Scheduler | [src/background/scheduler.ts](../../src/background/scheduler.ts) |
| Add-job logic | [src/lib/individual-job-form.ts](../../src/lib/individual-job-form.ts) |
| Dashboard | [dashboard/dashboard.html](../../dashboard/dashboard.html), [src/dashboard/dashboard.ts](../../src/dashboard/dashboard.ts) |
| E2E | [e2e/extension.spec.ts](../../e2e/extension.spec.ts), [e2e/epic-3-1.spec.ts](../../e2e/epic-3-1.spec.ts) |
