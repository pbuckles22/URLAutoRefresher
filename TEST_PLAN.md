# Test plan (TEST_PLAN.md)

Define **Tier 1** (fast feedback: unit, headless, or local) and **Tier 2** (integration, browser, device, or E2E) for this Edge extension. Replace the placeholders below when the toolchain exists.

---

## Tier 1: Fast feedback

```bash
npm test
```

Vitest covers pure logic: schedule jitter (`src/lib/schedule.test.ts`), URL/interval/jitter validation (`src/lib/validation.test.ts`), app state + enrollment (`src/lib/state.test.ts`), storage round-trip with a mocked `chrome.storage.local` (`src/lib/storage.test.ts`), alarm names (`src/lib/alarm-names.test.ts`), alarm `when` computation (`src/lib/alarm-schedule.test.ts`), tab close pruning (`src/lib/tab-lifecycle.test.ts`).

---

## Tier 2: Integration / E2E

Use when behavior spans a real browser, extension APIs, or network.

```bash
# Example: playwright test
# Example: manual checklist in browser
```

---

**Handoff:** Document the exact commands you use for coverage in AGENT_HANDOFF.md so agents can run them consistently.
