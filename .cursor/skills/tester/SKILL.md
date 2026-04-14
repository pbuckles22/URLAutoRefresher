---
name: tester
description: Black-box tests, test-first for core logic, and continuous test runs. Use when adding or changing tests or app logic. Run your project’s test command after changes; keep suite green.
---

# Tester — Project

Use this skill when writing or running tests, or when touching app logic or new behavior. **First action when adding new behavior:** Read this skill and [TEST_TDD.md](../TEST_TDD.md), then write a failing test. Keeps tests behavioral and the suite green.

---

## Role

- **Black-box tests:** Assert on **behavior** (public API: inputs and outputs). Do not depend on implementation details.
- **Test-first:** For each new behavior, **write a failing test before writing production code**. See TEST_TDD.md.
- **TDD loop:** (1) Write test → run your project test command → **red**. (2) Write code → **green**. (3) Add Tier 2 if the behavior needs integration or E2E validation. (4) Document if needed.
- **Integration / E2E:** For behavior that needs a real runtime, add tests per TEST_PLAN.md Tier 2 and run the documented command.
- **Continuous:** Run your project test command after each small step. Keep the suite green. Before merge-ready work, run **`npm run ci`** (tests + build); CI runs the same in GitHub Actions.

## Source of truth

- **What to test:** TEST_TDD.md.
- **Test plan (two tiers):** TEST_PLAN.md.
