# PM_PLAN — URL Auto Refresher

High-level phases stay aligned with [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md).

## Current

- **Epic 0:** Done — MV3 manifest, background bundle, dashboard + side panel stubs, build scripts.
- **Epic 1:** Done — `AppState`, `chrome.storage.local` helpers, validation, mutual exclusion (Vitest).
- **Epic 2:** Done — alarms, refresh + reschedule, `nextFireAt`, tab lifecycle (`scheduler.ts`).
- **Epic 3 (partial):** **3.0–3.2** — overlay; add individual job; start/stop, edit, delete; countdown row per job.
- **Next:** Epic **3.3** — shared list row component before Global UI.

## Later (see EDGE plan)

- **Epic 8** — Live-aware pause/resume (Twitch-first): pause refresh while live, resume when offline. Details: [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md).
- **Epic 9** — Blip / error-text triggered refresh (user-defined phrases or regex). Same doc.

Keep this file in sync with AGENT_HANDOFF "Current state" and `doc/requirements/` when you add them.
