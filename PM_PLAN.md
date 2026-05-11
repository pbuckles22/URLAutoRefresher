# PM_PLAN — Media Control Suite

High-level phases stay aligned with [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) (**Media Control Suite** — user-facing working name; internal package keys may still read `url-auto-refresher` until renamed deliberately).

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
- **Epic 10:** Done — URL-first membership (**10.1–10.6**): member-key schedule, URL-only targets / schema v3, sweep + TwitchFavs ([doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#epic-10--url-first-membership-phased), [`src/lib/twitch-favs.ts`](src/lib/twitch-favs.ts)). **Backlog #7** superseded per EDGE plan.

## Next (see EDGE plan)

- **[Epic 11](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#epic-11--precision-volume-web-audio) — Precision volume (Web Audio):** **[11.1 done](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md)** — `chrome.commands` + background → content stub ([`manifest.json`](manifest.json), [`src/background/volume-commands.ts`](src/background/volume-commands.ts)). **Next:** **11.2** content hook (GainNode, zero-blast), then **11.3** mutation observer, **11.4** messaging ramps, **11.5** dashboard fader, **11.6** OSD. Requirements: [doc/requirements/precision-volume-controller.md](doc/requirements/precision-volume-controller.md).

## Later (see EDGE plan)

- **Backlog:** [EDGE plan — Backlog](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#backlog-ux--polish--bugs). **Shipped:** items **1–3**, **5**, **6** (see EDGE plan). **Open:** **4** (Play after long idle — **on hold**, hard to repro; suspected SW/messaging bug); **7** *(superseded by [Epic 10](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#epic-10--url-first-membership-phased) — keep for traceability only)*; **8** (overlay — e.g. Twitch chat unhide behind fixed card; snap/drag + persistence — see EDGE #8). TDD handoff: [doc/requirements/backlog-tdd-handoff.md](doc/requirements/backlog-tdd-handoff.md).
- New epics/stories should still be added to the EDGE plan and [doc/requirements/](doc/requirements/) when you formalize scope.

Keep this file in sync with [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) checkboxes when scope changes. Session handoff notes use `doc/handoff/HANDOFF-*.md` (gitignored — not on `main`); prefer **timestamped** names (`HANDOFF-YYYY-MM-DD-HHmmss.md`) and a **Recorded** line — [AGENT_HANDOFF.md](AGENT_HANDOFF.md). Add `doc/requirements/` when you use it.
