# TEST_TDD — URL Auto Refresher

## How to test

- **Black-box:** Assert on behavior (public API: inputs and outputs). Do not depend on implementation details. See [tester/SKILL.md](tester/SKILL.md).
- **Continuous:** Run your project’s test command after adding or changing logic or tests; keep the suite green.
- **Two tiers ([TEST_PLAN.md](../../TEST_PLAN.md)):** **Tier 1** — Vitest (`npm test`). **Tier 2** — Playwright (`npm run test:e2e`) when behavior spans the real browser, extension pages, or content scripts.

---

## TDD for both tiers (before production code)

**Default:** Do not land production changes until the right tier(s) have a **failing test → passing test** sequence. Order matters.

### Tier 1 (Vitest)

Use for `src/lib/**`, manifest checks, and any logic testable with mocked `chrome`.

1. **Red** — Add or extend a test in `src/**/*.test.ts` that describes the new behavior and **fails** with the current code.
2. **Green** — Implement (or adjust) production code until **`npm test`** passes.
3. Refine if needed; keep the suite green at each step.

### Tier 2 (Playwright)

Use when the user-visible or browser-only path must hold (dashboard, content script, service worker ↔ page messaging, overlay DOM, etc.).

1. **Red** — Add or extend a spec under **`e2e/*.spec.ts`** (or the right file) that **fails** until the feature exists. Run **`npm run build && npm run test:e2e`** (or `test:e2e` alone if already built).
2. **Green** — Implement extension / page / content script code until **`npm run test:e2e`** passes.

**When both tiers apply:** Typically **Tier 1 first** (pure logic, fast feedback), then **Tier 2** for the real extension path. For a change that is **only** reachable in the browser (no useful unit seam), start with Tier 2 red, then green; add Tier 1 later if you extract testable logic.

### Exceptions (no strict red-first)

- **Docs-only, config-only, or comment-only** changes.
- **Trivial one-line fixes** with no behavior change (still run **`npm run ci`** before merge).
- **Pure refactor** preserving behavior: keep tests green; adjust tests only if contracts stay the same.

Never leave failing tests on `main`.

---

## Merge-ready

1. **Document** — Update AGENT_HANDOFF or TEST_PLAN if commands or contracts changed.
2. **CI gate** — Run **`npm run ci`** (Vitest + build + Playwright E2E). Same command runs in GitHub Actions on push/PR to `main` / `master`.
