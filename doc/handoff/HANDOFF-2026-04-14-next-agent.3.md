# Handoff — next agent (URL Auto Refresher)

**Revision:** `.3` — supersedes **[`.2`](./HANDOFF-2026-04-14-next-agent.2.md)** (post–Epic 3.2 baseline). Add **`.4`** when this content is superseded.

**Last updated:** 2026-04-14 — baseline after **Epic 3.3** (shared individual-job list row: `createIndividualJobListRow` in `src/lib/individual-job-list-row.ts`; dashboard delegates; Tier 1 jsdom tests; Playwright **9** E2E tests). **`npm run ci`** was green when this note was written.

This file lives under **`doc/handoff/`** so it can be committed. (Optional duplicate: `.cursor/handoff/handoff-YYYY-MM-DD_HHmm.md` is gitignored per [.gitignore](../../.gitignore).)

**Canonical agent entry:** [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) — **Current state** should match this handoff.

---

## Mandatory first steps (before deep coding)

1. Read [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) — **Epic 4** next (global groups).
2. Read [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) — **TDD for Tier 1 (Vitest) and Tier 2 (Playwright)** before production code when that tier applies.
3. Read [TEST_PLAN.md](../../TEST_PLAN.md) — commands, coverage (`test:coverage` vs `test:coverage:lib`), E2E extension load.

---

## Code review (handoff pass)

**PASS** — Epic **3.3** extracts row DOM into **`createIndividualJobListRow(job, nowMs)`** with unchanged **`data-*`** contracts for Epic 3.2 flows. Dashboard passes a single **`now`** per **`renderIndividualJobs`** so initial countdowns stay consistent. **`jsdom`** is a devDependency for **`@vitest-environment jsdom`** on `individual-job-list-row.test.ts` only.

**WARN (minor):** `dashboard.ts` still owns tab picker, add form, and list event delegation; further splits can wait until Epic 4/5 need them.

---

## Tech debt

| Priority | Category | Note |
|----------|----------|------|
| Do first (Epic 4) | Product | **4.1** — Window/tab browser for globals — [plan](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md). |
| Medium | Tests | Optional branch coverage on `saveAppState` throw paths / `parseAlarmName` edge cases; `npm run test:coverage:lib` for `src/lib`. |
| Medium | Tier 2 | Real alarms / `tabs.update` still not in automated E2E (timing / flakiness). |
| Low | Lib | **`messages.ts`** — tiny file; add tests if messaging grows. |
| Low | Docs | **Ref.1** in plan (reference PNGs) still open. |
| Low | CI | Consider Playwright **shard** or shared fixture if E2E count grows. |

---

## Code coverage / tests

| Gate | Result |
|------|--------|
| **`npm run ci`** | **Green** — Vitest **77** tests (**15** files), production **build**, Playwright **9** E2E tests. |
| Tier 1 | `npm test` — includes **`individual-job-list-row.test.ts`** (jsdom). |
| Tier 2 | `npm run test:e2e` — **`e2e/epic-3-3.spec.ts`** added (row contract); existing Epic 3.1 / 3.2 / extension specs unchanged in intent. |

**Optional:** `npm run test:coverage:lib` — use for `src/lib` statement/branch headline.

**GitHub Actions:** `.github/workflows/ci.yml` — `xvfb-run -a npm run ci` on Ubuntu.

---

## Project readiness

**N/A** — Not a release milestone; Epic **4** (global groups) is the next product slice.

---

## Repository state (for a fresh clone)

- **Epics shipped in plan checkboxes:** **0–2** complete; **Epic 3.0–3.3** complete; **4+** open.
- **Individual jobs:** Shared row — [`src/lib/individual-job-list-row.ts`](../../src/lib/individual-job-list-row.ts); dashboard wiring — [`src/dashboard/dashboard.ts`](../../src/dashboard/dashboard.ts), [`dashboard/dashboard.html`](../../dashboard/dashboard.html).
- **E2E:** [`e2e/epic-3-3.spec.ts`](../../e2e/epic-3-3.spec.ts) plus [`e2e/epic-3-2.spec.ts`](../../e2e/epic-3-2.spec.ts), [`e2e/epic-3-1.spec.ts`](../../e2e/epic-3-1.spec.ts), [`e2e/extension.spec.ts`](../../e2e/extension.spec.ts).
- **Docs:** `PM_PLAN.md`, `AGENT_HANDOFF.md`, `TEST_PLAN.md`, plan checkbox **3.3** **[x]**.

---

## Done through 2026-04-14 (summary)

- **Epic 3.3** — **`createIndividualJobListRow`** in `src/lib/`; **`dashboard.js`** rebuilt via **`npm run build`**; **`jsdom`** for unit DOM tests; **`e2e/epic-3-3.spec.ts`**; plan + PM/AGENT/TEST_PLAN updated; **`npm run ci`** green.

---

## Next up

1. **Epic 4.1** — Per [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md): **`windows.getAll({ populate: true })`**, checklist of tabs, per-row `targetUrl` for global groups.
2. **Epic 4.2–4.3** — Globals CRUD, mutual exclusion with individuals.
3. Run **`npm run ci`** after each logical step; manual Edge smoke still useful.

---

## Open questions / blockers

- None for environment. **Product:** Tab-picker UX at scale; mutual-exclusion errors surface from `saveAppState` / `validateEnabledEnrollment`.

---

## Key files

| Area | Path |
|------|------|
| Plan | [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) |
| TDD policy | [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) |
| Tests | [TEST_PLAN.md](../../TEST_PLAN.md) |
| Shared row | [src/lib/individual-job-list-row.ts](../../src/lib/individual-job-list-row.ts) |
| Dashboard | [src/dashboard/dashboard.ts](../../src/dashboard/dashboard.ts) |
| E2E | [e2e/epic-3-3.spec.ts](../../e2e/epic-3-3.spec.ts), [e2e/extension-helpers.ts](../../e2e/extension-helpers.ts) |

---

## Older revisions (same calendar note)

- **`.2`** — [HANDOFF-2026-04-14-next-agent.2.md](./HANDOFF-2026-04-14-next-agent.2.md) — post–Epic **3.2**.
- **`.1`** — [HANDOFF-2026-04-14-next-agent.1.md](./HANDOFF-2026-04-14-next-agent.1.md) — earlier **2026-04-14** archive.
- **Index** — [HANDOFF-2026-04-14-next-agent.md](./HANDOFF-2026-04-14-next-agent.md) — lists revisions and points to the latest.
