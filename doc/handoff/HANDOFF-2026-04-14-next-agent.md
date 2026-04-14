# Handoff — 2026-04-14 (next agent)

**Before this note:** Code review and tech-debt passes (per [.cursor/rules/handoff-checklist.mdc](../../.cursor/rules/handoff-checklist.mdc)); **`npm run ci`** run 2026-04-14.

This file lives under **`doc/handoff/`** so it can be committed. (Optional duplicate: `.cursor/handoff/handoff-YYYY-MM-DD_HHmm.md` is gitignored per [.gitignore](../../.gitignore).)

---

## First steps (mandatory): requirements vs TDD — before reading the codebase in depth

**Do this before** spelunking `src/` or “fixing” behavior from memory alone.

1. **Read the detailed requirements** — Primary spec: [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) (epic/story text, outcomes, data sketch, reference UI notes). Add [doc/requirements/](../requirements/) if present. Skim [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) and the **tester** skill for project test rules.

2. **Scope of “done” for this pass** — Align tests with requirements for everything **marked complete** in the plan through the **latest finished epic/story** at handoff time (currently **Epics 0–2** and **Epic 3.0**; not 3.1+ until those stories ship).

3. **Gap analysis** — For each finished story, ask: *Is there a test (or small set of tests) that would fail if that outcome regressed?* Cover **behavior the plan promises** (storage, validation, scheduling math, tab lifecycle, overlay schedule/prefs where testable without a browser). Do **not** assume the existing suite is sufficient because it is green.

4. **If gaps exist** — **Add tests first** to encode the requirement (prefer pure functions / mocked `chrome` per existing patterns, e.g. `src/lib/storage.test.ts`). Then run **`npm run ci`** and only then adjust production code if tests reveal a bug. For logic that cannot be unit-tested cleanly, document the gap in **TEST_PLAN.md** Tier 2 / manual and keep Tier 1 as strong as possible.

5. **Intent** — This closes the loop between **written epics** and **TDD**; prior work did not always follow strict red → green. The next agent should **repair coverage to match requirements** for shipped scope before building **Epic 3.1+**.

---

## Code review

**PASS** — Recent work is coherent for an MV3 extension: prefs and schedule math stay in `src/lib/` with tests; service worker handles overlay state via `chrome.runtime.onMessage` and does not trust client-supplied tab ids (uses `sender.tab.id`). Content script uses closed Shadow DOM to limit style bleed. No secrets in repo. **WARN (minor):** `page-overlay.ts` rebuilds digit `innerHTML` every 500ms; acceptable at current scale; revisit if profiling shows cost on heavy pages.

---

## Tech debt

| Priority | Category | Note |
|----------|----------|------|
| Do first (Epic 3) | Tests / UX | **Individual job CRUD** still missing from dashboard — users cannot create jobs from UI yet; overlay only appears when storage already has an enabled job for the tab. Add **3.1** with **TDD** if the user wants red-before-green discipline. |
| Medium | Tier 2 | **TEST_PLAN.md** — no Playwright/E2E; browser validation of overlay + alarms is manual. |
| Medium | Integration | **Message contract** (dashboard ↔ background) will grow with Epic 3; consider thin typed handlers + tests (mock `chrome.runtime`). |
| Low | Docs | Keep **AGENT_HANDOFF.md** “Current state” in sync after each epic; **Ref.1** in [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) (UI reference PNGs) still open until assets are added. |

---

## Code coverage / tests

**`npm run ci`** — **green** (2026-04-14). Vitest: **42 tests**, 9 files. Build: `dist/background.js`, **`dist/page-overlay.js`**, `dashboard/dashboard.js`, `icons/*.png`.

---

## Project readiness

**N/A** — Not a release milestone; Epic 3.1+ in progress.

---

## Repository state (for a fresh clone)

- **Docs:** Single tree **`doc/`** — plan at [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md); **`Docs/`** at repo root removed (historical; see [doc/README.md](../README.md)).
- **Product epics:** 0–2 done; **Epic 3.0** (page overlay + dashboard toggle) implemented and marked **[x]** in the plan; **3.1–3.3** remain.
- **Prefs:** `urlAutoRefresher_prefs_v1` — `showPageOverlayTimer` defaults **`true`** ([src/lib/prefs.ts](../../src/lib/prefs.ts)).
- **Overlay:** Content script [src/content/page-overlay.ts](../../src/content/page-overlay.ts); handler [src/background/page-overlay-handler.ts](../../src/background/page-overlay-handler.ts); [manifest.json](../../manifest.json) lists `dist/page-overlay.js`.

---

## Done before this handoff (summary)

- Consolidated documentation under **`doc/`** (plan, ui-reference, handoff notes); updated links across README, `.cursor/` skills, **PM_PLAN**, etc.
- Removed Flutter-only rule text and **game-readiness** skill; trimmed **`.gitignore`** template comments.
- Implemented **large on-page Min/Sec countdown** (Epic **3.0**): default on, dashboard checkbox, storage-backed prefs.
- Added unit tests for **`prefs`** parsing and **`page-overlay-schedule`** (tab → `nextFireAt`).

---

## Next up

1. Follow the **First steps (mandatory): requirements vs TDD** section above (requirements read-through, gap analysis, extra tests for finished epics/stories, then green CI).
2. Re-read **Epic 3.1–3.3** in [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md).
3. Implement **3.1** — add individual job from dashboard (tab pick, `targetUrl`, interval, jitter, Save) with **failing tests first** if following TDD.
4. Run **`npm run ci`** after each logical step; manual Edge smoke once jobs can be created from UI (overlay should show on scheduled tabs when pref is on).

---

## Open questions / blockers

- None for environment. **Product:** Tab-picker UX and error surfacing follow the plan and mutual-exclusion rules in **`src/lib/state.ts`**.

---

## Key files

| Area | Path |
|------|------|
| Plan / checkboxes | [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) |
| Agent entry | [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md), [PM_PLAN.md](../../PM_PLAN.md) |
| Scheduler | [src/background/scheduler.ts](../../src/background/scheduler.ts) |
| Overlay | [src/content/page-overlay.ts](../../src/content/page-overlay.ts), [src/background/page-overlay-handler.ts](../../src/background/page-overlay-handler.ts) |
| State / storage | [src/lib/state.ts](../../src/lib/state.ts), [src/lib/storage.ts](../../src/lib/storage.ts) |
| Dashboard | [dashboard/dashboard.html](../../dashboard/dashboard.html), [src/dashboard/dashboard.ts](../../src/dashboard/dashboard.ts) |
| Build | [Scripts/build.mjs](../../Scripts/build.mjs) (background, dashboard, **page-overlay** bundles) |
