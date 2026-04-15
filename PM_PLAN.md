# PM_PLAN — URL Auto Refresher

High-level phases stay aligned with [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md).

## Current

- **Epic 0:** Done — MV3 manifest, background bundle, dashboard + side panel stubs, build scripts.
- **Epic 1:** Done — `AppState`, `chrome.storage.local` helpers, validation, mutual exclusion (Vitest).
- **Epic 2:** Done — alarms, refresh + reschedule, `nextFireAt`, tab lifecycle (`scheduler.ts`).
- **Epic 3:** Done — **3.0–3.3** — overlay; add individual job; full individual lifecycle; **shared list row** (`createIndividualJobListRow` in `src/lib/individual-job-list-row.ts`) for reuse (Epic 5+).
- **Epic 4:** **4.1–4.3 done** — tab browser + globals list + mutual exclusion UX in dashboard (`e2e/epic-4-3.spec.ts`).
- **Next:** Epic **5** — unified UI / side panel (see EDGE plan).

## Later (see EDGE plan)

- **Epic 8** — Live-aware pause/resume (Twitch-first): pause refresh while live, resume when offline. Details: [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md).
- **Epic 9** — Blip / error-text triggered refresh (user-defined phrases or regex). Same doc.

Keep this file in sync with AGENT_HANDOFF "Current state" and `doc/requirements/` when you add them.
