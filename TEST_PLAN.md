# Test plan (TEST_PLAN.md)

Define **Tier 1** (fast feedback: unit, headless, or local) and **Tier 2** (integration, browser, device, or E2E) for this Edge extension.

---

## Tier 1: Fast feedback

```bash
npm test
```

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

### Not covered by Tier 1 (by design)

These run in a **real browser** and are **not** executed by Vitest:

- **`src/content/page-overlay.ts`** — Shadow DOM, `attachShadow`, `innerHTML` updates, `chrome.runtime.sendMessage` from a content script context.
- **Service worker** scheduling side effects beyond what unit tests mock (`src/background/scheduler.ts` integration with real `chrome.alarms`).

**Regression risk:** e.g. shadow mode (`open` vs `closed`) and double-`attachShadow` behavior must be validated in **Tier 2** or manual smoke, not by `npm test`.

### CI gate (tests + build)

Run before opening a PR and whenever you change logic, tests, or build scripts:

```bash
npm run ci
```

This runs **`npm test`** then **`npm run build`** (service worker, dashboard, **page-overlay** content script, icons). **GitHub Actions** runs the same on every push/PR to `main` / `master` (see `.github/workflows/ci.yml`). A green workflow is the project’s **enforced** red/green bar for Tier 1.

---

## Tier 2: Integration / E2E

Use when behavior spans a real browser, extension APIs, or the content script / service worker together.

### Option A — Manual (always valid)

- Load unpacked in **Edge** from the repo root after `npm run build`.
- Smoke: dashboard opens, service worker has no startup errors, toggle overlay pref, confirm overlay on a tab with an enabled job (see `AGENT_HANDOFF.md`).

Use a short checklist in release notes or handoff when Tier 2 automation is not wired yet.

### Option B — Automated browser tests (headless-capable)

You do **not** have to stay 100% manual. Common approach:

1. **Playwright** (or **Puppeteer**) driving **Chromium** or **Microsoft Edge** with the extension loaded via `--load-extension` / `--disable-extensions-except` (see Playwright docs: *Chrome extensions* / persistent context with extension path).
2. **Headless:** Edge (Chromium) supports headless modes similar to Chrome (`--headless=new`). Playwright can launch **`channel: 'msedge'`** on Windows/macOS so tests run against **real Edge**, including headless where the channel supports it.
3. **CI:** Linux runners often use **Chromium** + the same load-extension flags as a **stand-in** for Edge, or install **Microsoft Edge** / use a Windows runner if you require Edge-specific behavior. Many teams accept Chromium-in-CI and run Edge manually or on a scheduled job.

**Not in repo yet:** There is no `npm run test:e2e` until Playwright (or similar) is added and a minimal spec exists (e.g. open fixture page, assert shadow host present when state is seeded). When added, document the exact command here and in `AGENT_HANDOFF.md`.

### What to automate first (when you add Tier 2)

- Content script **injects once**, overlay visible when storage says show + job exists (seed storage from test).
- Optional: message handler returns expected shape for `PAGE_OVERLAY_GET_STATE` (can also stay unit-tested with mocked `chrome` in the service worker if extracted).

---

## Handoff

Document the exact Tier 2 commands you adopt in **AGENT_HANDOFF.md** so agents run them consistently.
