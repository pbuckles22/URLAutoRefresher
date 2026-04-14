---
name: pm-governance
description: Project management and governance. Use when planning sprints, making scope decisions, enforcing quality gates, or identifying risks.
---

# PM governance — Project

Use this skill when doing sprint planning, scope tradeoffs, quality gates, or risk mitigation. Keep in sync with doc/requirements/ if present.

---

## Tactical oversight

- **Risk mitigation:** Identify blocking dependencies or risks early.
- **Scope management:** Focus on MVP first; when adding scope, note whether it's MVP or later.
- **Quality gates:** Define what "done" means (e.g. tests green, coverage, no known blockers).

## Communication

- **Developer sync:** Flag performance or architecture risks (e.g. UI thread load).
- **UX/requirements:** Point to doc/requirements/ or DESIGN_SYSTEM when UX is in scope.

## When to apply

- User asks for sprint planning, scope review, or "what's MVP."
- Deciding whether a feature belongs in current vs next sprint.
- Before marking a build or feature "done."

## Output

- **Scope:** Clear MVP vs later; which sprint a change belongs to.
- **Risks:** Listed with mitigation.
- **Quality:** Gates stated; link to PM_PLAN.md and doc/requirements/.
