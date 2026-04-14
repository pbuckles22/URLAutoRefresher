# Test plan (TEST_PLAN.md)

Define **Tier 1** (fast feedback: unit, headless, or local) and **Tier 2** (integration, browser, device, or E2E) for this Edge extension. Replace the placeholders below when the toolchain exists.

---

## Tier 1: Fast feedback

```bash
npm test
```

Vitest covers pure logic: schedule jitter (`src/lib/schedule.test.ts`), URL/interval/jitter validation (`src/lib/validation.test.ts`), app state + enrollment (`src/lib/state.test.ts`), storage round-trip with a mocked `chrome.storage.local` (`src/lib/storage.test.ts`), alarm names (`src/lib/alarm-names.test.ts`), alarm `when` computation (`src/lib/alarm-schedule.test.ts`), tab close pruning (`src/lib/tab-lifecycle.test.ts`).

### CI gate (tests + build)

Run before opening a PR and whenever you change logic, tests, or build scripts:

```bash
npm run ci
```

This runs **`npm test`** then **`npm run build`** (service worker bundle, dashboard bundle, placeholder icons). **GitHub Actions** runs the same on every push/PR to `main` / `master` (see `.github/workflows/ci.yml`). A green workflow is the project’s **enforced** red/green bar for Tier 1.

---

## Tier 2: Integration / E2E

Use when behavior spans a real browser, extension APIs, or network.

```bash
# Example: playwright test
# Example: manual checklist in browser
```

---

**Handoff:** Document the exact commands you use for coverage in AGENT_HANDOFF.md so agents can run them consistently.
