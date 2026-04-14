# Test plan (TEST_PLAN.md)

Define **Tier 1** (fast feedback: unit, headless, or local) and **Tier 2** (integration, browser, device, or E2E) for this Edge extension.

## TDD for both tiers (before coding)

**Policy:** Treat **Tier 1** (Vitest) and **Tier 2** (Playwright) as separate test-first gates. See [.cursor/skills/TEST_TDD.md](.cursor/skills/TEST_TDD.md) for the full loop.

| Tier | Command | When to use TDD here |
|------|---------|----------------------|
| **1** | `npm test` | New or changed behavior in `src/lib/**`, or other code covered by unit tests (mocked `chrome`). **Red → green** before merging. |
| **2** | `npm run build && npm run test:e2e` | Behavior that must hold in a **real** Chromium + unpacked extension (dashboard, content script, overlay, storage from extension pages, etc.). **Red → green** before merging. |

**Typical order:** Tier 1 first for extractable logic; Tier 2 for the browser/extension slice. If the work is browser-only, Tier 2 can lead; add Tier 1 when you pull logic into `src/lib`.

---

## Tier 1: Fast feedback

```bash
npm test
```

**Coverage (optional):**

| Command | What you see |
|---------|----------------|
| `npm run test:coverage` | Full `src/**` instrumentation; headline % is low because `background/`, `content/`, and `dashboard/` are not executed in Vitest. |
| `npm run test:coverage:lib` | **Only `src/lib/**`** — headline % matches unit-tested logic (~90%+). |
| Open `coverage/index.html` | After either command: HTML report with **per-folder** drill-down (same full-repo mix unless you used `:lib`). |

Vitest covers **pure logic** with mocked `chrome` where needed:

| Area | Files (examples) |
|------|-------------------|
| Schedule / jitter | `src/lib/schedule.test.ts` |
| URL / interval / jitter validation | `src/lib/validation.test.ts` |
| App state + enrollment | `src/lib/state.test.ts` |
| Storage round-trip | `src/lib/storage.test.ts` |
| Alarm names / `when` / tab lifecycle | `src/lib/alarm-*.test.ts`, `tab-lifecycle.test.ts` |
| Prefs parsing | `src/lib/prefs.test.ts` |
| Overlay **schedule** (which tab gets which `nextFireAt`) | `src/lib/page-overlay-schedule.test.ts` |
| Add individual job form (validation → `IndividualJob`) | `src/lib/individual-job-form.test.ts` |

### Not covered by Tier 1 (by design)

Vitest does **not** execute the real browser or extension host:

- **`src/content/page-overlay.ts`** — full DOM / shadow / messaging path is exercised by **Tier 2** Playwright (see below), not by Vitest.
- **Service worker** scheduling side effects beyond what unit tests mock (`src/background/scheduler.ts` integration with real `chrome.alarms`) — still **manual or future E2E** (alarm fire + `tabs.update` timing).

**Regression risk:** e.g. shadow mode (`open` vs `closed`) and double-`attachShadow` behavior: Tier 2 overlay checks complement `npm test`; deeper alarm timing remains a gap until automated.

### CI gate (Tier 1 + build + Tier 2 E2E)

Run before opening a PR and whenever you change logic, tests, or build scripts:

```bash
npm run ci
```

This runs **`npm test`** (Vitest), **`npm run build`** (service worker, dashboard, **page-overlay** content script, icons), then **`npm run test:e2e`** (Playwright: unpacked extension + HTTP fixture page). **GitHub Actions** runs the same on every push/PR to `main` / `master` (see `.github/workflows/ci.yml`; Linux uses **xvfb** so headed Chromium can load the extension).

**Linux without a display:** run E2E under a virtual framebuffer, e.g. `xvfb-run -a npm run test:e2e` (CI does this automatically).

---

## Tier 2: Integration / E2E

Use when behavior spans a real browser, extension APIs, or the content script / service worker together.

### Option A — Manual (always valid)

- Load unpacked in **Edge** from the repo root after `npm run build`.
- Smoke: dashboard opens, service worker has no startup errors, toggle overlay pref, confirm overlay on a tab with an enabled job (see `AGENT_HANDOFF.md`).

Use a short checklist in release notes or handoff when Tier 2 automation is not wired yet.

### Option B — Automated browser tests (Playwright)

```bash
npm run build
npm run test:e2e
```

Implementation:

- **`playwright.config.ts`** — starts **`e2e/fixture-server.mjs`** (HTTP fixture so content scripts match `http://*/*`).
- **`e2e/extension-helpers.ts`** — `chromium.launchPersistentContext` with `--load-extension=<repo root>` (see Playwright docs: *Chrome extensions*).
- **`e2e/extension.spec.ts`** — dashboard loads; seeds `chrome.storage.local` from an extension page; asserts overlay **shadow** `.card` after reload; toggles **Display** pref and asserts overlay removed.
- **`e2e/epic-3-1.spec.ts`** — dashboard **Individual job** form: tab picker, URL, interval, jitter, Save → `individualJobs` persisted in storage.
- **`e2e/epic-3-2.spec.ts`** — per-job **Start/Stop**, **Delete**, **Edit** (storage), two **countdown** rows; uses `[data-individual-job-row]`, `[data-job-toggle]`, `[data-job-delete]`, `[data-job-countdown]`, edit fields.
- **`e2e/epic-3-3.spec.ts`** — shared row module contract: summary line text, visible countdown/toggle/delete, edit fields present (inside closed `<details>`).

**Headed Chromium:** MV3 extensions are exercised with **`headless: false`** (Playwright `channel: 'chromium'`). **CI (Linux)** runs under **xvfb** so no physical display is required.

**Edge vs Chromium:** CI uses **Chromium** as a stand-in; validate in **Edge** manually or add a `channel: 'msedge'` project later if needed.

### Further automation (optional)

- **Alarms + `tabs.update`:** add E2E or integration tests that wait for a short alarm (flaky/slow) or use a test-only hook — not wired yet.
- **Message contract:** `getPageOverlayUiState` is unit-tested; E2E covers the full content ↔ background path.

---

## Handoff

Document the exact Tier 2 commands you adopt in **AGENT_HANDOFF.md** so agents run them consistently.
