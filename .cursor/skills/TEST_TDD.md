# TEST_TDD — URL Auto Refresher

## How to test

- **Black-box:** Assert on behavior (public API: inputs and outputs). Do not depend on implementation details. See [tester/SKILL.md](tester/SKILL.md).
- **Continuous:** Run your project’s test command after adding or changing logic or tests; keep the suite green.
- **Hybrid (TEST_PLAN.md):** **Tier 1** — fast feedback. **Tier 2** — integration or E2E when needed (e.g. real browser / extension APIs). Run both when validating.

## Test-first (mandatory for new behavior)

**Before writing production code for new behavior:** Read this file and [tester/SKILL.md](tester/SKILL.md), then write a failing test.

1. **Write test** — Add a black-box test. Run your test command → **red**.
2. **Write code** — Implement until **green**.
3. **Tier 2 if needed** — Add integration or E2E test(s) per TEST_PLAN.md.
4. **Document** — Update AGENT_HANDOFF or docs if contract/scope changed.

Never leave failing tests in the tree.
