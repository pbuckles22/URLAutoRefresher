# Backlog implementation handoff (TDD)

This note is for an agent (or developer) picking up work from **[Backlog (UX / polish / bugs)](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#backlog-ux--polish--bugs)** in the EDGE plan. It does **not** replace [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md), [TEST_PLAN.md](../../TEST_PLAN.md), or [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) — follow those for commands and test-first discipline.

## Preconditions

- Read the backlog bullets in the EDGE plan (same numbering as below).
- Run `npm run ci` on current `main` before changing behavior; keep it green before merge.
- **Tier 1:** Vitest — `npm test` — for pure logic, parsers, and helpers.
- **Tier 2:** Playwright — `npm run build && npm run test:e2e` — for extension pages, content scripts, shadow DOM, and `chrome.*` flows. See [TEST_PLAN.md](../../TEST_PLAN.md).

Suggested order: **5** (context invalidated) can pair with **4** (idle messaging); **4 → 5 → (verify 2–3)**. Item **1** is shipped (see below). Items 2–3 may already be partially implemented in `src/content/page-overlay.ts`; treat the EDGE plan as the acceptance checklist and close gaps with tests first.

---

## 1) Side panel — “Open in a tab” (full dashboard) — **shipped**

**Normative spec:** [EDGE plan — Epic **5.3**](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) (unified UI / cross-links). This handoff section is historical context only.

**Tests:** [`e2e/epic-5.spec.ts`](../../e2e/epic-5.spec.ts) — Epic 5.3 + “Backlog 1” assertions; `npm run ci` green.

---

## 2) Overlay timer — compact layout

### Goal

Reduce height and visual noise of the in-page countdown: **no separate “Min” / “Sec” labels**, **~75% scale** for digit tiles, **Pause** at **top-left**, time readout **beside** it. See [`src/content/page-overlay.ts`](../../src/content/page-overlay.ts) (shadow DOM + inline `shadowCss()`).

### TDD / tests

- **Tier 1:** Only if you extract layout constants (sizes, class names) into `src/lib/` with unit tests — optional.
- **Tier 2 (recommended):** Extend [`e2e/extension.spec.ts`](../../e2e/extension.spec.ts) (or a focused spec) to:
  - Seed storage with an enabled individual job for the fixture tab (existing pattern).
  - Evaluate in the page: shadow root contains **no** “Min”/“Sec” label text (or whatever you remove).
  - Assert **Pause** exists and timer digits/colon exist (selectors via `page.evaluate` into shadow root — see existing `#url-auto-refresher-overlay-root` checks).

### Acceptance

- Card is noticeably shorter; labels removed; pause + digits on one compact row (or equivalent minimal height).
- Pause/resume messaging still works (regression: run overlay-related tests).

---

## 3) Overlay paused state — compact

### Goal

When paused, **smaller Play (~75%)**, **inline to the right** of “Auto refresh paused”, not stacked below. Same file as item 2: `buildPausedHtml()` + CSS in `page-overlay.ts`.

### TDD / tests

- **Tier 2:** With global or individual paused state, assert paused card layout: **Play** is not below the only text line (e.g. single row flex, or snapshot of computed structure via `evaluate`).
- Regression: resume still clears paused state (existing message types in [`src/lib/messages.ts`](../../src/lib/messages.ts)).

### Acceptance

- One compact row (or equivalent): copy + small Play; white card height reduced.

---

## 4) Play (resume) no-ops after long idle

### Goal

**Investigate and fix** intermittent failure: after **several minutes** paused, **Play** does nothing. Likely MV3 **service worker** lifecycle / **message delivery** from content script to background.

### Hypotheses (for the next agent)

- SW terminated; first `chrome.runtime.sendMessage` from content script fails silently (current code uses `.catch(() => {})` in [`src/content/page-overlay.ts`](../../src/content/page-overlay.ts)).
- Need **retry**, **`chrome.runtime.connect`** keep-alive, or a **ping** to wake the worker before pause/resume handlers in [`src/background/page-overlay-handler.ts`](../../src/background/page-overlay-handler.ts).

### TDD / tests

- **Tier 1:** Where possible, unit-test **pure** helpers (e.g. “retry N times with delay”) without mocking the entire extension.
- **Tier 2:** Full idle reproduction is **slow/flaky** in CI. Prefer:
  - **Manual QA** steps documented in the PR, and/or
  - A **targeted** test that simulates failure (mock or inject) if the harness allows — do not block CI on a 5-minute sleep.
- **Do not** ship noisy `console.log` in production without a guard; follow project conventions.

### Acceptance

- After extended idle, **Play** reliably resumes (global group or individual job).
- No regression on normal pause/resume latency.
- Document root cause briefly in the EDGE plan backlog bullet or a short comment in the PR.

---

## 5) Page overlay — “Extension context invalidated” on pause (after reload)

### Goal

Avoid **uncaught** `Extension context invalidated` when the overlay calls `chrome.runtime.sendMessage` (e.g. **Pause** → `INDIVIDUAL_JOB_OVERLAY_PAUSE` / `GLOBAL_GROUP_TAB_PAUSE`) after the **extension** was reloaded or updated but the **page** was not. See [`src/content/page-overlay.ts`](../../src/content/page-overlay.ts) (`dist/page-overlay.js` in traces).

### Relation to Post–Epic 9

[EDGE plan — **P9.6**](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#postepic-9--incremental-enhancements-shipped) (Twitch **live bridge**) already targeted similar **context invalidated** noise; this backlog item covers the **overlay** pause path specifically.

### TDD / tests

- **Tier 1:** Pure helpers (e.g. safe send wrapper that checks `chrome.runtime?.id` before messaging) if extracted.
- **Tier 2 / manual:** Repro = reload extension at `edge://extensions`, return to an open tab with overlay, click **Pause** — should not surface an uncaught error in DevTools.

### Acceptance

- No uncaught exception from overlay messaging when the extension context is gone; user-visible behavior degrades gracefully (e.g. inactive overlay or prompt to refresh the page).

---

## Files reference (quick)

| Area | Files |
|------|--------|
| Overlay UI | `src/content/page-overlay.ts` |
| Overlay messages + handlers | `src/lib/messages.ts`, `src/background/page-overlay-handler.ts` |
| Scheduler / pause state | `src/background/scheduler.ts`, `src/lib/types.ts` |
| Side panel + dashboard UI | `sidepanel/sidepanel.html`, `dashboard/dashboard.html`, `src/dashboard/dashboard-app.ts`, `Scripts/build.mjs` |
| E2E | `e2e/*.spec.ts`, `e2e/extension-helpers.ts` |

---

## Done when

- EDGE plan backlog items are updated (checked off, reworded as shipped, or split into new stories). Item **1** is documented as shipped in the EDGE plan and [PM_PLAN.md](../../PM_PLAN.md).
- `npm run ci` passes.
- [PM_PLAN.md](../../PM_PLAN.md) “Later” section reflects backlog status when items ship or scope changes.
