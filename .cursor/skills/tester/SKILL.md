---
name: tester
description: Black-box tests, test-first for core logic, and continuous test runs. Use when adding or changing tests or app logic. Run your project’s test command after changes; keep suite green.
---

# Tester — Project

Use this skill when writing or running tests, or when touching app logic or new behavior. **First action when adding new behavior:** Read this skill and [TEST_TDD.md](../TEST_TDD.md), then write a **failing** test at the appropriate tier(s) **before** production code.

---

## Role

- **Black-box tests:** Assert on **behavior** (public API: inputs and outputs). Do not depend on implementation details.
- **Test-first (both tiers):** See [TEST_TDD.md](../TEST_TDD.md). **Tier 1:** Vitest — `npm test` → red, then code → green. **Tier 2:** Playwright — `npm run test:e2e` (after `npm run build`) → red, then code → green. Use Tier 2 whenever behavior spans the real browser or extension surfaces.
- **TDD loop:** (1) Tier 1 red/green if logic is unit-testable. (2) Tier 2 red/green if the feature needs the browser/extension. (3) Document if needed. (4) **`npm run ci`** before merge.
- **Continuous:** Run tests after each small step. Keep the suite green. CI runs the same checks in GitHub Actions.

## Source of truth

- **What to test:** TEST_TDD.md.
- **Test plan (two tiers):** TEST_PLAN.md.
