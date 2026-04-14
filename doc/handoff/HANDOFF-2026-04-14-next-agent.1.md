# Handoff — next agent (URL Auto Refresher)

**Revision:** `.1` — dot-versioned archive. Content restored from git **`8c90ebe`** (state of `HANDOFF-2026-04-14-next-agent.md` before it was superseded by revision **`.2`**). For the **current** baseline, read [**HANDOFF-2026-04-14-next-agent.2.md**](./HANDOFF-2026-04-14-next-agent.2.md) or the [index](./HANDOFF-2026-04-14-next-agent.md).

**Last updated (original body):** 2026-04-15 — extends the 2026-04-14 baseline with post-push fixes and test documentation. **`npm run ci`** was green when this note was refreshed.

This file lives under **`doc/handoff/`** so it can be committed. (Optional duplicate: `.cursor/handoff/handoff-YYYY-MM-DD_HHmm.md` is gitignored per [.gitignore](../../.gitignore).)

**Canonical agent entry:** [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) — keep **Current state** in sync when epics move.

---

## First steps (mandatory): requirements vs TDD — before reading the codebase in depth

**Do this before** spelunking `src/` or “fixing” behavior from memory alone.

1. **Read the detailed requirements** — Primary spec: [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) (epic/story text, outcomes, data sketch, reference UI notes). Add [doc/requirements/](../requirements/) if present. Skim [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) and the **tester** skill for project test rules.

2. **Read [TEST_PLAN.md](../../TEST_PLAN.md)** — Tier 1 vs Tier 2, what Vitest **does not** cover (`src/content/page-overlay.ts`, real service worker integration), and optional Playwright/Edge automation path.

3. **Scope of “done” for the gap-analysis pass** — Align tests with requirements for everything **marked complete** in the plan through the **latest finished epic/story** (currently **Epics 0–2** and **Epic 3.0**; not 3.1+ until those stories ship).

4. **Gap analysis** — For each finished story, ask: *Is there a test (or small set of tests) that would fail if that outcome regressed?* Cover **behavior the plan promises** (storage, validation, scheduling math, tab lifecycle, overlay **schedule** / prefs parsing — testable without a browser). Do **not** assume the existing suite is sufficient because it is green.

5. **If gaps exist** — **Add tests first** to encode the requirement (prefer pure functions / mocked `chrome` per existing patterns, e.g. `src/lib/storage.test.ts`). Then run **`npm run ci`** and only then adjust production code if tests reveal a bug. For logic that cannot be unit-tested cleanly, document the gap in **TEST_PLAN.md** Tier 2 / manual.

6. **Intent** — Close the loop between **written epics** and **TDD** for Tier-1-testable behavior; prior work did not always follow strict red → green. **Content script DOM** remains Tier 2 / manual until Playwright (or similar) is added per **TEST_PLAN.md**.

---

## Code review (refreshed)

**PASS** — MV3 layout is sound: prefs and overlay **schedule** live in `src/lib/` with tests; service worker resolves overlay state via `chrome.runtime.onMessage` using **`sender.tab.id`** (not client-supplied ids). **Content script** [src/content/page-overlay.ts](../../src/content/page-overlay.ts) uses **`attachShadow({ mode: 'open' })`** so a **second** `showOverlay()` can reuse `host.shadowRoot` (closed mode exposed `null` from script and could cause a **double `attachShadow` throw** — fixed in commit `5b4ea1f`).

**WARN (minor):** `paintDigits()` sets `innerHTML` on an interval; acceptable unless profiling says otherwise.

---

## Tech debt

| Priority | Category | Note |
|----------|----------|------|
| Do first (Epic 3) | Tests / UX | **Individual job CRUD** still missing from dashboard — users cannot create jobs from UI yet; overlay only appears when storage already has an enabled job for the tab. Implement **3.1** with **TDD** if the user wants red-before-green discipline. |
| Medium | Tier 2 | **[TEST_PLAN.md](../../TEST_PLAN.md)** documents manual vs **Playwright + extension load** (Chromium or Edge channel, headless where supported). **No `npm run test:e2e` in repo yet** — add when you wire automation. |
| Medium | Integration | **Message contract** (dashboard ↔ background) will grow with Epic 3; consider thin typed handlers + tests (mock `chrome.runtime`). |
| Low | Docs | **Ref.1** in [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) (UI reference PNGs under `doc/ui-reference/auto-refresh-plus/`) still open until assets are added. |

---

## Code coverage / tests

**`npm run ci`** — must stay **green** before merge. Vitest: **42 tests**, 9 files. Build: `dist/background.js`, **`dist/page-overlay.js`**, `dashboard/dashboard.js`, `icons/*.png`.

**Vitest does not execute** the content script or real `chrome.alarms` — see **TEST_PLAN.md** Tier 1 “Not covered” table.

---

## Project readiness

**N/A** — Not a release milestone; Epic 3.1+ next.

---

## Repository state (for a fresh clone)

- **Docs:** Single tree **`doc/`** — plan at [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md); see [doc/README.md](../README.md).
- **Product epics:** 0–2 done; **Epic 3.0** (page overlay + dashboard toggle) **[x]** in plan; **3.1–3.3** open.
- **Prefs:** `urlAutoRefresher_prefs_v1` — `showPageOverlayTimer` defaults **`true`** ([src/lib/prefs.ts](../../src/lib/prefs.ts)).
- **Overlay:** [src/content/page-overlay.ts](../../src/content/page-overlay.ts), [src/background/page-overlay-handler.ts](../../src/background/page-overlay-handler.ts), [manifest.json](../../manifest.json) → `dist/page-overlay.js`.

---

## Done through 2026-04-15 (summary)

- Consolidated **`doc/`**, removed root **`Docs/`**, updated cross-links; template cleanup (Flutter line, **game-readiness** skill removed).
- Epic **3.0**: on-page Min/Sec overlay, prefs, dashboard checkbox; unit tests for **prefs** + **page-overlay-schedule** (tab → `nextFireAt`).
- **Fix:** Shadow root **`open`** mode to avoid double-`attachShadow` when overlay stays visible across storage updates (`5b4ea1f`).
- **Docs:** [TEST_PLAN.md](../../TEST_PLAN.md) expanded (Tier 1 gaps, Tier 2 manual vs Playwright/Edge headless notes); [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) links Tier 2 (`6fb30a8` and related).

---

## Next up

1. Follow **First steps (mandatory)** and **TEST_PLAN.md** above.
2. Re-read **Epic 3.1–3.3** in [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md).
3. Implement **3.1** — add individual job from dashboard (tab pick, `targetUrl`, interval, jitter, Save); **failing tests first** if using TDD.
4. Run **`npm run ci`** after each step; manual Edge smoke (or future Playwright) for overlay + alarms end-to-end.

---

## Open questions / blockers

- None for environment. **Product:** Tab-picker UX and mutual-exclusion errors follow **`src/lib/state.ts`** and the plan.

---

## Key files

| Area | Path |
|------|------|
| Plan / checkboxes | [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) |
| Tests (tiers) | [TEST_PLAN.md](../../TEST_PLAN.md) |
| Agent entry | [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md), [PM_PLAN.md](../../PM_PLAN.md) |
| Scheduler | [src/background/scheduler.ts](../../src/background/scheduler.ts) |
| Overlay | [src/content/page-overlay.ts](../../src/content/page-overlay.ts), [src/background/page-overlay-handler.ts](../../src/background/page-overlay-handler.ts) |
| State / storage | [src/lib/state.ts](../../src/lib/state.ts), [src/lib/storage.ts](../../src/lib/storage.ts) |
| Dashboard | [dashboard/dashboard.html](../../dashboard/dashboard.html), [src/dashboard/dashboard.ts](../../src/dashboard/dashboard.ts) |
| Build | [Scripts/build.mjs](../../Scripts/build.mjs) |
