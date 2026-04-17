# PM_PLAN — URL Auto Refresher

High-level phases stay aligned with [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md).

## Current

- **Epic 0:** Done — MV3 manifest, background bundle, dashboard + side panel stubs, build scripts.
- **Epic 1:** Done — `AppState`, `chrome.storage.local` helpers, validation, mutual exclusion (Vitest).
- **Epic 2:** Done — alarms, refresh + reschedule, `nextFireAt`, tab lifecycle (`scheduler.ts`).
- **Epic 3:** Done — **3.0–3.3** — overlay; add individual job; full individual lifecycle; **shared list row** (`createIndividualJobListRow` in `src/lib/individual-job-list-row.ts`) for reuse (Epic 5+).
- **Epic 4:** **4.1–4.3 done** — tab browser + globals list + mutual exclusion UX in dashboard (`e2e/epic-4-3.spec.ts`).
- **Epic 5:** **5.1–5.4 done** — shared [`src/dashboard/dashboard-app.ts`](src/dashboard/dashboard-app.ts); dashboard browse grid + **Individual (M)** header; side panel HTML generated from dashboard in build; **5.3** cross-links include **Open in a tab** (side panel → full `dashboard/dashboard.html`) and **Open side panel** (dashboard); 1s countdown polling (`e2e/epic-5.spec.ts`).
- **Epic 6:** **6.1–6.3 done** — focused-window subset via live `tabs.query` for the last-focused window; `chrome.action` badge + optional global fallback; `src/lib/focused-window-badge.ts`, `src/background/badge.ts` (listeners + `urlar:badge:tick` alarm); refresh on schedule + storage + tab attach/detach.
- **Epic 7:** Done — README install, permissions, badge limits + fallback; manual QA pointer + multi-window note ([doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md)).
- **Epic 8:** Done — live-aware pause/resume (Twitch-first); content bridge + scheduler integration ([doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md)).
- **Epic 9:** Done — blip / phrase–regex triggered refresh; rate limits ([doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md)).
- **Post–Epic 9:** Done — URL patterns for globals, per-tab pause/jitter, dashboard order, overlay polish, Twitch bridge hardening ([doc/requirements/post-epic-9.md](doc/requirements/post-epic-9.md)).

## Later (see EDGE plan)

- **Backlog:** [EDGE plan — Backlog](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#backlog-ux--polish--bugs). **Shipped:** items **1–3**, **5** (see EDGE plan). **Open:** **4**, **6**, **7**, **8** (overlay position — snap left/right vs drag + persistence). TDD handoff: [doc/requirements/backlog-tdd-handoff.md](doc/requirements/backlog-tdd-handoff.md).
- New epics/stories should still be added to the EDGE plan and [doc/requirements/](doc/requirements/) when you formalize scope.

Keep this file in sync with [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) checkboxes when scope changes. Session handoff notes use `doc/handoff/HANDOFF-*.md` (gitignored — not on `main`). Add `doc/requirements/` when you use it.
