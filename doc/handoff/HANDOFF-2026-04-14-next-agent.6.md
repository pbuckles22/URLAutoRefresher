# Handoff — next agent (URL Auto Refresher)

**Revision:** `.6` — supersedes **[`.5`](./HANDOFF-2026-04-14-next-agent.5.md)** (post–Epic **4.2** baseline). Add **`.7`** when this content is superseded.

**Last updated:** 2026-04-14 — baseline after **Epic 4.3** (mutual exclusion UX: **`validateEnabledEnrollment`** user-facing strings in [`src/lib/state.ts`](../../src/lib/state.ts); dashboard **`[data-job-row-error]`** / **`[data-global-group-row-error]`** on Start/Stop; forms and edit saves already surfaced **`saveAppState`** errors); Tier 2 **[`e2e/epic-4-3.spec.ts`](../../e2e/epic-4-3.spec.ts)**; Epic **3.2** edit E2E hardened ([`e2e/epic-3-2.spec.ts`](../../e2e/epic-3-2.spec.ts) — open `<details>` in-page + native **`click()`** on Save to avoid headed Playwright flakes). **`npm run ci`** was green when this note was written.

This file lives under **`doc/handoff/`** so it can be committed. (Optional duplicate: `.cursor/handoff/handoff-YYYY-MM-DD_HHmm.md` is gitignored per [.gitignore](../../.gitignore).)

**Canonical agent entry:** [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) — **Current state** should match this handoff.

---

## Mandatory first steps (before deep coding)

1. Read [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) — **Epic 5** next (unified UI / side panel); **Epic 4** (including **4.3**) is complete.
2. Read [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) — **TDD for Tier 1 (Vitest) and Tier 2 (Playwright)** before production code when that tier applies.
3. Read [TEST_PLAN.md](../../TEST_PLAN.md) — commands, coverage (`test:coverage` vs `test:coverage:lib`), E2E extension load.

---

## Code review (handoff pass)

**PASS** — Enrollment copy is **symmetric** for global vs individual (avoids misleading “enable individual” wording when the user is adding a global). Row-level errors use the same **`Error.message`** path as forms and edit panels. **`e2e/epic-3-2.spec.ts`** edit scenario uses **`details.open = true`** and **`button.click()`** in **`locator.evaluate`** so Tier 2 does not depend on headed viewport hit-testing for `<details>` (still exercises real delegated handlers).

**WARN (minor):** **`src/dashboard/dashboard.ts`** remains a large orchestrator; optional split in **Epic 5** or a follow-up refactor.

---

## Tech debt

| Priority | Category | Note |
|----------|----------|------|
| Do next (product) | **Epic 5** | Unified UI / side panel sharing modules — [plan](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md). |
| Medium | Code | **`dashboard.ts`** size / responsibilities. |
| Medium | Tests | Optional branch coverage on `saveAppState` throw paths / `parseAlarmName` edge cases; `npm run test:coverage:lib` for `src/lib`. |
| Medium | Tier 2 | Real alarms / `tabs.update` still not in automated E2E (timing / flakiness). |
| Low | Lib | **`messages.ts`** — add tests if messaging grows. |
| Low | Docs | **Ref.1** in plan (reference PNGs) still open. |
| Low | CI | Consider Playwright **shard** or shared fixture if E2E count grows. |

---

## Code coverage / tests

| Gate | Result |
|------|--------|
| **`npm run ci`** | **Green** — Vitest **100** tests (**19** files), production **build**, Playwright **14** E2E tests. |
| Tier 1 | `npm test` — includes **`state.test.ts`** (enrollment messages), **`global-groups`**, **`global-group-form`**, list rows, **`dashboard-countdown`**. |
| Tier 2 | `npm run test:e2e` — **`e2e/epic-4-3.spec.ts`** + Epic 3 / 4.1 / 4.2 / extension specs. |

**Optional:** `npm run test:coverage:lib` — use for `src/lib` statement/branch headline.

**GitHub Actions:** `.github/workflows/ci.yml` — `xvfb-run -a npm run ci` on Ubuntu.

---

## Project readiness

**N/A** — Routine epic delivery; **Epic 5** is the next product slice.

---

## Repository state (for a fresh clone)

- **Epics shipped in plan checkboxes:** **0–4** complete (overview table **Epic 4** row **[x]**); **5+** open.
- **Global + mutual exclusion:** [`src/lib/window-tab-browser.ts`](../../src/lib/window-tab-browser.ts), [`src/lib/global-group-form.ts`](../../src/lib/global-group-form.ts), [`src/lib/global-groups.ts`](../../src/lib/global-groups.ts), [`src/lib/global-group-list-row.ts`](../../src/lib/global-group-list-row.ts), [`src/lib/state.ts`](../../src/lib/state.ts) (`validateEnabledEnrollment`); dashboard — [`src/dashboard/dashboard.ts`](../../src/dashboard/dashboard.ts), [`dashboard/dashboard.html`](../../dashboard/dashboard.html).
- **E2E:** [`e2e/epic-4-3.spec.ts`](../../e2e/epic-4-3.spec.ts), [`e2e/epic-4-2.spec.ts`](../../e2e/epic-4-2.spec.ts), [`e2e/epic-4-1.spec.ts`](../../e2e/epic-4-1.spec.ts), Epic 3, [`e2e/extension.spec.ts`](../../e2e/extension.spec.ts).
- **Docs:** **PM_PLAN** / **AGENT_HANDOFF** / **TEST_PLAN** / plan checklist aligned with **4.3** shipped.

---

## Done through 2026-04-14 (summary)

- **Epic 4.3** — Actionable mutual exclusion messaging; row errors on toggles; Tier 1 + Tier 2; plan **4.3** **[x]**; Epic **4** overview **[x]**.
- **E2E** — **`epic-3-2`** “Edit saves updated URL to storage” stabilized for headed Chromium (details + in-page click).

---

## Next up

1. **Epic 5** — Per [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md): unified UI (both section headers, browse-all layout); side panel sharing modules (**5.1–5.2**).
2. Run **`npm run ci`** after each logical step; manual Edge smoke still useful.

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
| Enrollment validation | [src/lib/state.ts](../../src/lib/state.ts) |
| Dashboard | [src/dashboard/dashboard.ts](../../src/dashboard/dashboard.ts) |
| E2E 4.3 | [e2e/epic-4-3.spec.ts](../../e2e/epic-4-3.spec.ts) |
| Scheduler | [src/background/scheduler.ts](../../src/background/scheduler.ts) |

---

## Older revisions (same calendar note)

- **`.5`** — [HANDOFF-2026-04-14-next-agent.5.md](./HANDOFF-2026-04-14-next-agent.5.md) — post–Epic **4.2**.
- **`.4`** — [HANDOFF-2026-04-14-next-agent.4.md](./HANDOFF-2026-04-14-next-agent.4.md) — post–Epic **4.1**.
- **`.3`** — [HANDOFF-2026-04-14-next-agent.3.md](./HANDOFF-2026-04-14-next-agent.3.md) — post–Epic **3.3**.
- **`.2`** — [HANDOFF-2026-04-14-next-agent.2.md](./HANDOFF-2026-04-14-next-agent.2.md) — post–Epic **3.2**.
- **`.1`** — [HANDOFF-2026-04-14-next-agent.1.md](./HANDOFF-2026-04-14-next-agent.1.md) — earlier **2026-04-14** archive.
- **Index** — [HANDOFF-2026-04-14-next-agent.md](./HANDOFF-2026-04-14-next-agent.md) — lists revisions and points to the latest.
