# Handoff — YYYY-MM-DD HHmm

(Filename: `HANDOFF-YYYY-MM-DD-HHmmss.md` under `doc/handoff/` — date and 24h time required.)

**Before writing this note:** Run code review (code-reviewer skill), tech debt (tech-debt-evaluator skill), and your **tests/coverage** commands documented in AGENT_HANDOFF.md. Then fill the sections below.

## Chat mirror (paste into the user-facing reply)

Copy this block into chat after the local note is saved — **required**, not optional:

```
**{version}** is shipped on `main` with green GitHub CI.   ← or **WIP** / **Not pushed**

Recorded
Local note: doc/handoff/HANDOFF-YYYY-MM-DD-HHmmss.md (gitignored)
{PM_PLAN / EDGE bullet if tracked docs changed on main}

Ship status
| Item | Status |
| Commit | … |
| Branch | … |
| GitHub CI | Run #… — success / pending / failed |

Done this session
Maintainers: …
Extension users: …

Next up (from handoff)
1. …
2. …
```

## Code review

(Required. Summary from code-reviewer: PASS/WARN/FAIL + brief.)

## Tech debt

(Required. Summary from tech-debt-evaluator: "Do first" or short list.)

## Code coverage

(Required. Your documented test/coverage command — green? one-line summary if useful.)

## Project readiness

(Optional. Summary from your project's readiness skill, or N/A.)

## Done this session

-
-

## Next up

-

## Open questions / blockers

- ( none )

## Key files (optional)

-
-
