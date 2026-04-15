---
name: techwriter
description: Creates and edits project documentation for both public and internal audiences. Use when writing or updating README.md, AGENT_HANDOFF (or AGENTS.md), CONTRIBUTING, or internal docs (e.g. PM_PLAN, DEV_GUIDE, TEST_TDD, DESIGN_SYSTEM). Covers structure, tone, and what to include for each doc type.
---

# Techwriter — Project Documentation

Use this skill when creating or revising project docs so they stay consistent and useful for humans and agents.

---

## Doc types and audience

| Doc | Audience | Goal |
|-----|----------|------|
| **README.md** | Users, contributors, new devs | Orient quickly; run and contribute. |
| **AGENT_HANDOFF.md** / **AGENTS.md** | AI agents, devs resuming work | Stable process and pointers; **product** on **`main`** in **PM_PLAN** + product plan; **session** notes local (`doc/handoff/HANDOFF-*.md` or `.cursor/handoff/` — gitignored). |
| **Internal** (PM_PLAN in root; .cursor/skills/: DEV_GUIDE, TEST_TDD, DESIGN_SYSTEM) | Team and agents | Single source of truth for scope, tech, tests, design. |

---

## README.md (public-facing)

**Include:** Project name and one-line description; how to run; main stack; link to more docs.

**Style:** Clear, scannable. Short paragraphs, bullets, code blocks for commands.

---

## AGENT_HANDOFF.md (agent and handoff)

**Include:** Repo purpose; source-of-truth links (plan, PM_PLAN, move guide in `doc/handoff/`); run and test commands; handoff protocol. Put **what shipped** in **PM_PLAN** / plan on **`main`**; **session** narrative stays **local** (`HANDOFF-*.md` gitignored) — not in AGENT_HANDOFF.

**Style:** Dense but structured. Headings and bullets so agents can jump to the right section.

---

## Internal docs

Keep in sync with the code. Update when behavior, stack, or process changes. Use the same tone: concise, actionable, one concern per section.
