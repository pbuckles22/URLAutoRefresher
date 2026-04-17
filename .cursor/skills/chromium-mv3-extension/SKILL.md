---
name: chromium-mv3-extension
description: >-
  Manifest V3 Chromium/Edge extension engineering for this repo: ephemeral
  service workers, chrome.storage rehydration, chrome.alarms, message passing
  (sendMessage, onMessage + sendResponse), extension context invalidation in
  content scripts, idle-first-message failures, and overlay/background wiring.
  Use when editing manifest.json, src/background/, src/content/page-overlay.ts,
  messaging, or when the user mentions MV3, service worker sleep, idle resume,
  Extension context invalidated, sendMessage, or runtime.connect.
---

# Chromium MV3 engineering (URL Auto Refresher)

## 1. Service worker lifecycle and persistence

The MV3 **background service worker** is **ephemeral**; do not assume in-memory globals survive.

- **State:** Rehydrate persistent state from **`chrome.storage.*`** on the startup paths you control.
- **Fire-after-idle work:** Prefer **`chrome.alarms`** over `setInterval` / long `setTimeout` chains for scheduling that must survive sleep (align with **`src/background/scheduler.ts`**).
- **Idle / first message (#4):** After long idle the worker may be gone; the first **`sendMessage`** from a tab can fail. Use **retry with backoff**, a **`chrome.runtime.connect`** port where a long-lived channel is justified, or a **ping** before critical messages—see [backlog TDD handoff](../../doc/requirements/backlog-tdd-handoff.md) item **4**.

## 2. Messaging and async replies

- If **`chrome.runtime.onMessage`** calls **`sendResponse` asynchronously**, the listener must **`return true`** so the port stays open.
- Use typed contracts in **`src/lib/messages.ts`**; register handlers from **`src/background/index.ts`** and sibling modules under **`src/background/`**.

## 3. Extension context invalidated (#5)

Occurs when the **extension reloads** (or updates) while a tab still runs an **old** content script or overlay.

- **Guard:** `if (!chrome.runtime?.id) { /* stop timers, degrade UI */ return; }` before relying on the extension APIs.
- **`sendMessage`:** Handle both **synchronous throws** (try/catch around the call) and **promise rejection** (`.catch` / `await` in try/catch). Silent `.catch(() => {})` alone does not fix every uncaught path—see backlog item **5** in the [EDGE plan backlog](../../doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#backlog-ux--polish--bugs) and [backlog-tdd-handoff](../../doc/requirements/backlog-tdd-handoff.md).
- **Teardown:** Remove listeners and timers when the overlay or bridge detects invalid context.

## 4. Project map

| Area | Path |
|------|------|
| Background entry | `src/background/index.ts` → `dist/background.js` |
| Overlay ↔ background | `src/content/page-overlay.ts`, `src/background/page-overlay-handler.ts` |
| Scheduler / pause | `src/background/scheduler.ts` |

## 5. Quality gate

- Run **`npm run ci`** before merge-boundary work; Tier 1 vs Tier 2 per **[TEST_PLAN.md](../../TEST_PLAN.md)**.
- Do **not** block CI on multi-minute idle sleeps; use **deterministic** tests/mocks or **manual QA** steps (document on the PR or in **[DEV_GUIDE.md](../DEV_GUIDE.md)**).
- For MV3 scheduling in **this** codebase, avoid ad-hoc **`setInterval`** in the background worker for work that should survive idle; prefer **`chrome.alarms`** and existing scheduler patterns—verify against **`src/background/`** (there is **no** root `background.ts` in this repo).

## 6. Normative platform docs

- [Migrate to a service worker](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers)
- [Message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
