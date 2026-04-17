# Backlog implementation handoff (TDD)

This note is for an agent (or developer) picking up work from **[Backlog (UX / polish / bugs)](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#backlog-ux--polish--bugs)** in the EDGE plan. It does **not** replace [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md), [TEST_PLAN.md](../../TEST_PLAN.md), or [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) — follow those for commands and test-first discipline.

## Preconditions

- Read the backlog bullets in the EDGE plan (same numbering as below).
- Run `npm run ci` on current `main` before changing behavior; keep it green before merge.
- **Tier 1:** Vitest — `npm test` — for pure logic, parsers, and helpers.
- **Tier 2:** Playwright — `npm run build && npm run test:e2e` — for extension pages, content scripts, shadow DOM, and `chrome.*` flows. See [TEST_PLAN.md](../../TEST_PLAN.md).

Suggested order: **7** (global rebind); **8** (overlay position) as UX allows. **4** (idle **Play**) is **on hold** until reproducible — see §4. Items **1–3**, **#5**, and **#6** are shipped (see below). Treat the EDGE plan as the acceptance checklist.

---

## 1) Side panel — “Open in a tab” (full dashboard) — **shipped**

**Normative spec:** [EDGE plan — Epic **5.3**](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) (unified UI / cross-links). This handoff section is historical context only.

**Tests:** [`e2e/epic-5.spec.ts`](../../e2e/epic-5.spec.ts) — Epic 5.3 + “Backlog 1” assertions; `npm run ci` green.

---

## 2) Overlay timer — compact layout — **shipped**

**Implementation:** [`src/content/page-overlay.ts`](../../src/content/page-overlay.ts) — single `.timer-compact-row` (Pause + `.timer-readout`), no Min/Sec labels, smaller digit tiles.

**Tests:** [`e2e/extension.spec.ts`](../../e2e/extension.spec.ts) — same seed as overlay visibility test; shadow assertions (no `Min`/`Sec` tokens, Pause, digits, colon, row class).

---

## 3) Overlay paused state — compact — **shipped**

**Implementation:** [`src/content/page-overlay.ts`](../../src/content/page-overlay.ts) — `.paused-compact-row` with copy + smaller **Play** (~75% padding/font vs prior).

**Tests:** [`e2e/extension.spec.ts`](../../e2e/extension.spec.ts) — seeds `overlayPaused: true` on fixture-tab individual job; shadow asserts `.card--paused`, row DOM, and **Play** to the right of the label with vertical overlap (same row).

---

## 4) Play (resume) no-ops after long idle — **on hold**

### Status

**On hold** until the team can **reproduce reliably** or confirm root cause. Behavior is **hard to replicate**. When picked up, **treat as a suspected bug** (idle / SW / messaging), not a dismissed report. **Not item 5:** “Extension context invalidated” after extension reload is **§5** below (shipped).

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

## 5) Page overlay — “Extension context invalidated” — **shipped**

**Implementation:** [`src/lib/extension-runtime-send.ts`](../../src/lib/extension-runtime-send.ts) + [`src/content/page-overlay.ts`](../../src/content/page-overlay.ts) — guard `chrome.runtime?.id`, **try/catch** around `sendMessage` (sync throw), async helper for `PAGE_OVERLAY_GET_STATE`; overlay + blip watcher cleared when pause/resume cannot send.

**Tests:** [`src/lib/extension-runtime-send.test.ts`](../../src/lib/extension-runtime-send.test.ts) (Tier 1).

**Manual:** Reload extension at `edge://extensions`, return to a tab with overlay, **Pause** / **Play** — no uncaught at `page-overlay.js`; overlay may disappear until page reload (expected).

---

## 6) Global group — edit: add / remove member URLs (tabs) — **shipped**

**Implementation:** [`src/lib/global-group-list-row.ts`](../../src/lib/global-group-list-row.ts) — **Member tabs** section, **`+`** (`data-global-edit-add-target`), per-row **`×`** (`data-global-edit-remove-target`); [`src/dashboard/dashboard-app.ts`](../../src/dashboard/dashboard-app.ts) — collect targets from `[data-global-edit-target-row]`, `refreshCachedTabs` for tab picker; [`buildGlobalGroupUpdateFromForm`](../../src/lib/global-group-form.ts) — variable membership; filters `pausedTabIds` / `tabNextFireAt` when tabs removed.

**Tests:** Tier 1 — [`src/lib/global-group-form.test.ts`](../../src/lib/global-group-form.test.ts); Tier 2 — [`e2e/epic-4-2.spec.ts`](../../e2e/epic-4-2.spec.ts) **Epic 4.2b** (add second tab via Edit).

---

## 7) Global group — rebind `tabId` when same URL opens in a new tab

### Goal

Stored targets use **`tabId`**. If the user **closes** a grouped tab and **opens the same URL** again, the new tab must be **adopted** so alarms/refresh apply to the visible tab.

### User scenario

Example: a Twitch tab is in a global group (with or without URL patterns). User closes `twitch.tv/me` and opens the same URL in a **new** tab. The extension should **rebind** membership to that new `tabId` so auto-refresh resumes (subject to group Start/Stop), and per-tab state (`pausedTabIds`, jitter, overlay) follows the new tab as the replacement member — without requiring dashboard edits.

### Relation to P9.1

**P9.1** matches tabs by URL pattern for inclusion; it does not fully solve **stale `tabId`** after close/reopen. This backlog item is the explicit **lifecycle rebind** when a matching tab shows up again.

### TDD / tests

- **Tier 1:** Pure helpers for URL equality / pattern match + “orphan old tab id” rules if extracted.
- **Tier 2 / manual:** Close fixture tab, open same URL, confirm group still refreshes the new tab (may need harness tab IDs).

### Acceptance

- Closing and reopening the same URL does not strand the group on a dead `tabId`.
- Document chosen behavior when **multiple** tabs share the same URL (which `tabId` is bound; avoid surprising “steals”).
- No regression on mutual exclusion or group Start/Stop semantics.

---

## 8) Page overlay — position (left/right vs drag)

### Goal

Avoid blocking underlying page controls: **snap** card left/right and/or **drag** to reposition; decide **persistence** (remember vs reset on refresh).

### User story

Sometimes the auto-refresh **overlay hides** site content or controls. **Example (Twitch):** chat is **minimized** to the side; the control to **unhide** chat can sit **under** the fixed **top-right** overlay. The user **cannot move** the overlay, so they struggle to reach the control. **Outcome:** user can reposition the card (snap and/or drag) so host UI stays usable; optional persistence per origin or global pref.

### TDD / tests

- **Tier 2** if behavior is DOM-heavy; **Tier 1** for pure position/prefs helpers if extracted.

### Acceptance

- Document chosen UX in EDGE backlog / PR (snap vs drag vs both; persistence behavior); no regression on overlay pause/resume.

---

## Files reference (quick)

| Area | Files |
|------|--------|
| Overlay UI | `src/content/page-overlay.ts` |
| Overlay messages + handlers | `src/lib/messages.ts`, `src/background/page-overlay-handler.ts` |
| Scheduler / pause state | `src/background/scheduler.ts`, `src/lib/types.ts` |
| Global groups (targets, lifecycle) | `src/lib/global-group-targets.ts`, `src/lib/tab-lifecycle.ts`, `src/lib/global-groups.ts`, dashboard global forms / rows |
| Side panel + dashboard UI | `sidepanel/sidepanel.html`, `dashboard/dashboard.html`, `src/dashboard/dashboard-app.ts`, `Scripts/build.mjs` |
| E2E | `e2e/*.spec.ts`, `e2e/extension-helpers.ts` |

---

## Done when

- EDGE plan backlog items are updated (checked off, reworded as shipped, or split into new stories). Items **1–3**, overlay **#5**, and **#6** are documented as shipped in the EDGE plan and [PM_PLAN.md](../../PM_PLAN.md).
- `npm run ci` passes.
- [PM_PLAN.md](../../PM_PLAN.md) “Later” section reflects backlog status when items ship or scope changes.
