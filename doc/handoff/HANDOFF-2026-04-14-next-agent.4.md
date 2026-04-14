# Handoff — next agent (URL Auto Refresher)

**Revision:** `.4` — supersedes **[`.3`](./HANDOFF-2026-04-14-next-agent.3.md)** (post–Epic 3.3 baseline). Add **`.5`** when this content is superseded.

**Last updated:** 2026-04-14 — baseline after **Epic 4.1** (dashboard **window/tab browser**: `chrome.windows.getAll({ populate: true })`, per-tab include checkbox + **per-row `targetUrl`**, **`buildGlobalGroupFromForm`** in `src/lib/global-group-form.ts`, **`tabRowsFromWindowsSnapshot`** in `src/lib/window-tab-browser.ts`; Tier 1 tests; Playwright **`e2e/epic-4-1.spec.ts`**). **`npm run ci`** was green when this note was written.

This file lives under **`doc/handoff/`** so it can be committed. (Optional duplicate: `.cursor/handoff/handoff-YYYY-MM-DD_HHmm.md` is gitignored per [.gitignore](../../.gitignore).)

**Canonical agent entry:** [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) — **Current state** should match this handoff.

---

## Mandatory first steps (before deep coding)

1. Read [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) — **Epic 4.2–4.3** next (globals lifecycle + mutual exclusion); **4.1** is done.
2. Read [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) — **TDD for Tier 1 (Vitest) and Tier 2 (Playwright)** before production code when that tier applies.
3. Read [TEST_PLAN.md](../../TEST_PLAN.md) — commands, coverage (`test:coverage` vs `test:coverage:lib`), E2E extension load.

---

## Code review (handoff pass)

**PASS** — Epic **4.1** adds testable seams: **`tabRowsFromWindowsSnapshot`** (sorting / filtering) and **`buildGlobalGroupFromForm`** (validation aligned with `saveAppState`). Dashboard builds rows from **`windows.getAll({ populate: true })`**, optional **`label`** on targets from the title chip; **`saveAppState`** remains the enforcement point for enrollment conflicts.

**WARN (minor):** **`src/dashboard/dashboard.ts`** continues to grow (individual list + global browser + prefs); expect further splits in **Epic 4.2+** or **5**. **4.1** only **appends** new global groups; there is **no** in-dashboard list/edit/delete for globals yet (by design until **4.2**).

---

## Tech debt

| Priority | Category | Note |
|----------|----------|------|
| Do first (Epic 4) | Product | **4.2** — Create / edit / delete globals; **Global (N)** header, shared countdown, group start/stop — [plan](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md). **4.3** — Mutual exclusion when moving a tab between individual and global. |
| Medium | Code | **`dashboard.ts`** size / responsibilities; extract global list row factory when mirroring **3.3** pattern. |
| Medium | Tests | Optional branch coverage on `saveAppState` throw paths / `parseAlarmName` edge cases; `npm run test:coverage:lib` for `src/lib`. |
| Medium | Tier 2 | Real alarms / `tabs.update` still not in automated E2E (timing / flakiness). |
| Low | Lib | **`messages.ts`** — add tests if messaging grows. |
| Low | Docs | **Ref.1** in plan (reference PNGs) still open. |
| Low | CI | Consider Playwright **shard** or shared fixture if E2E count grows. |

---

## Code coverage / tests

| Gate | Result |
|------|--------|
| **`npm run ci`** | **Green** — Vitest **85** tests (**17** files), production **build**, Playwright **10** E2E tests. |
| Tier 1 | `npm test` — includes **`window-tab-browser.test.ts`**, **`global-group-form.test.ts`**. |
| Tier 2 | `npm run test:e2e` — includes **`e2e/epic-4-1.spec.ts`**. |

**Optional:** `npm run test:coverage:lib` — use for `src/lib` statement/branch headline.

**GitHub Actions:** `.github/workflows/ci.yml` — `xvfb-run -a npm run ci` on Ubuntu.

---

## Project readiness

**N/A** — Not a release milestone; Epic **4.2** (globals CRUD + UX) is the next product slice.

---

## Repository state (for a fresh clone)

- **Epics shipped in plan checkboxes:** **0–3** complete; **Epic 4.1** complete; **4.2–4.3** open.
- **Global 4.1:** [`src/lib/window-tab-browser.ts`](../../src/lib/window-tab-browser.ts), [`src/lib/global-group-form.ts`](../../src/lib/global-group-form.ts); dashboard — [`src/dashboard/dashboard.ts`](../../src/dashboard/dashboard.ts), [`dashboard/dashboard.html`](../../dashboard/dashboard.html).
- **E2E:** [`e2e/epic-4-1.spec.ts`](../../e2e/epic-4-1.spec.ts) plus prior Epic 3 / extension specs.
- **Docs:** Plan story **4.1** **[x]** in [EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md); **PM_PLAN** / **AGENT_HANDOFF** aligned with this note.

---

## Done through 2026-04-14 (summary)

- **Epic 4.1** — Multi-window tab browser on dashboard; **`buildGlobalGroupFromForm`**; Tier 1 + Tier 2; plan checkbox; **`npm run ci`** green; committed and pushed with this handoff.

---

## Next up

1. **Epic 4.2** — Per [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md): globals **CRUD**, **Global (N)** header, shared countdown, group **start/stop**. Reuse or mirror **`createIndividualJobListRow`** patterns where helpful.
2. **Epic 4.3** — Mutual exclusion UX when moving tabs between individual and global (errors already come from **`saveAppState`**; surface clearly in UI).
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
| Global form (pure) | [src/lib/global-group-form.ts](../../src/lib/global-group-form.ts) |
| Dashboard | [src/dashboard/dashboard.ts](../../src/dashboard/dashboard.ts) |
| E2E 4.1 | [e2e/epic-4-1.spec.ts](../../e2e/epic-4-1.spec.ts) |
| Scheduler | [src/background/scheduler.ts](../../src/background/scheduler.ts) |

---

## Older revisions (same calendar note)

- **`.3`** — [HANDOFF-2026-04-14-next-agent.3.md](./HANDOFF-2026-04-14-next-agent.3.md) — post–Epic **3.3**.
- **`.2`** — [HANDOFF-2026-04-14-next-agent.2.md](./HANDOFF-2026-04-14-next-agent.2.md) — post–Epic **3.2**.
- **`.1`** — [HANDOFF-2026-04-14-next-agent.1.md](./HANDOFF-2026-04-14-next-agent.1.md) — earlier **2026-04-14** archive.
- **Index** — [HANDOFF-2026-04-14-next-agent.md](./HANDOFF-2026-04-14-next-agent.md) — lists revisions and points to the latest.
