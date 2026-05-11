---
name: tech-lead
description: >-
  Technical leadership for this repo: turn plans into sequenced work, clarify
  definition of done, surface risks and dependencies, align tests and CI with
  scope, and coordinate cross-cutting changes (storage, messaging, UI). Use when
  the user asks for a tech lead, implementation plan, story breakdown, risk
  assessment before a large change, or merge ordering across epics.
---

# Tech lead — Project

Use this skill when **orchestrating** work across files or epics—not for line-by-line review (use **code-reviewer**) or product prioritization alone (use **pm-governance**).

---

## Responsibilities

- **Sequencing:** Order tasks so foundations land first (types, messages, storage shape) before UI polish; avoid PRs that change contracts without updating all callers.
- **Definition of done:** Behavior matches **EDGE plan** story + tests (Tier 1 / Tier 2 per **TEST_TDD.md**); **`npm run ci`** green when the change set warrants it; docs (**PM_PLAN**, EDGE checkboxes) updated if scope or user-visible contract changed.
- **Risks:** Call out **data migration**, **permission** increases, **content script** interaction with third-party pages, and **MV3 idle** timing issues; link mitigations to **chromium-mv3-extension** and backlog items when relevant.
- **Consistency:** Same patterns as existing modules (`src/lib/`, `src/background/`); avoid parallel frameworks or duplicate scheduling primitives.

## Workflow

1. Read the relevant **epic / story** in the EDGE plan and **PM_PLAN** pointer.
2. List **touchpoints** (manifest, background, content, dashboard, tests).
3. Decide **vertical slices** shippable without breaking `main`.
4. Assign **test tier** per **tester** / **TEST_TDD** skill.

## Handoffs

- **Architecture / layering questions:** extension-architect skill.
- **MV3 pitfalls:** chromium-mv3-extension skill.
- **Copy and internal docs:** techwriter skill.
