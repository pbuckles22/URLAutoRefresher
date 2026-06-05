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
- **Epic 11:** **11.1–11.7 done** — see EDGE [Epic 11](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#epic-11--precision-volume-web-audio). Optional follow-ups only (**G3** on hot files).
- **Epic 12:** **done (12.1–12.4)** — URL-first tester notes, TwitchFavs manual checklist, **TF.5/TF.6** requirements sync, **12.4** CI-safe Playwright + Vitest ([Epic 12](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#epic-12--twitchfavs--url-first-qa--ci-confidence), [twitch-favs-managed-membership.md](doc/requirements/twitch-favs-managed-membership.md)).
- **Epic 13:** **13.A1–13.A3**, **13.B1–13.B5 shipped** — scheduler modular slices + **dashboard Phase B** complete (**shell → individuals → tab picker → globals → storage sync**); **G1–G5** in EDGE ([Parallel work](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#parallel-work--epics-11-13)); **`npm run ci`** after each slice was the Phase **13.B** gate (**G4**).

## Next (see EDGE plan)

- **Parallel (multi-capacity):** **L12** ∥ **L13A** ∥ **L113** allowed (distinct paths); **13.A** slices **serial** on scheduler files (**G5**); **13.B** slices **serial** (**G4**); **one owner** for [`dashboard-app.ts`](src/dashboard/dashboard-app.ts) across epics (**G3**). Still **merge to `main` one PR at a time** through CI.
- **Single agent:** Use the **linear order** in EDGE [Parallel work — Epics 11–13](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#parallel-work--epics-11-13) (single-stream bullet).
- **[Epic 12](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#epic-12--twitchfavs--url-first-qa--ci-confidence):** **12.1–12.4 shipped** — CI-safe Twitch stub E2E + `persistTwitchFavsUpsertFromTabUrl` Vitest; optional live Twitch remains backlog only.
- **[Epic 13](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#epic-13--scheduler--dashboard-modularization):** **Phase 13.B shipped** (**13.B1–13.B5**); Epic **13** scheduler (**13.A**) + dashboard modularization complete — **`npm run ci`** remains the merge gate. ESLint / complexity: [.cursor/skills/code-quality-gate/SKILL.md](.cursor/skills/code-quality-gate/SKILL.md).
- **Epic 11:** **done (11.1–11.7)** on **`main`** — precision volume + OSD + tests; UAT: [doc/uat/DAILY-TWITCHFAVS-ROLLOUT.md](doc/uat/DAILY-TWITCHFAVS-ROLLOUT.md).

## In flight (branch `feature/snap-back-uat` — **not on `main`**)

**Execution order:** **A** Step A snap-back UAT (Backlog **#10**) → **B** Epic **14** proactive no-raid → **C** Epic **15** viewing layout → **D** Backlog **#8** overlay drag.

| Step    | Scope                                                                                 | Status                                                                                                                                                                                                          |
| ------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A**   | TwitchFavs snap-back after raid/detour; overlay debug strip; sched-tab hints          | **Gate 2 green** (5/5 Playwright incl. fav→fav hint-poison regression); version **0.2.0**. **Gate 3 not recorded** — ~10 min real Twitch before merge to `main`; see `doc/handoff/HANDOFF-2026-06-05-105500.md` |
| **B**   | Epic **14** — block raid navigation on TwitchFavs home tabs (before detour completes) | **Next** after Step A Gate 3 pass; normative spec **not yet** in EDGE plan — see [snap-back-implementation-notes.md](doc/requirements/snap-back-implementation-notes.md)                                        |
| **C–D** | Theater/chat layout (partial port), overlay drag                                      | **C** partial — theater/chat one-shot on overlay attach; no pref toggle yet. **D** backlog                                                                                                                      |

Handoff: `doc/handoff/HANDOFF-2026-06-05-105500.md` (local, latest). Gates: [TEST_PLAN.md](TEST_PLAN.md#release-gates-twitchfavs--snap-back). Branch: `feature/snap-back-uat`.

## Later (see EDGE plan)

- **Backlog:** [EDGE plan — Backlog](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#backlog-ux--polish--bugs). **Shipped:** items **1–3**, **5**, **6** (see EDGE plan). **Open:** **4** (Play after long idle — **on hold**); **7** _(superseded by Epic 10 — traceability only)_; **8** (overlay snap/drag); **9** (precision volume defaults to **active tab**, not manual target picker — user-requested); **10** (TwitchFavs snap-back — **Step A**, in flight above). TDD handoff: [doc/requirements/backlog-tdd-handoff.md](doc/requirements/backlog-tdd-handoff.md).
- New epics/stories should still be added to the EDGE plan and [doc/requirements/](doc/requirements/) when you formalize scope.

Keep this file in sync with [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) checkboxes when scope changes. Session handoff notes use `doc/handoff/HANDOFF-*.md` (gitignored — not on `main`); prefer **timestamped** names (`HANDOFF-YYYY-MM-DD-HHmmss.md`) and a **Recorded** line — [AGENT_HANDOFF.md](AGENT_HANDOFF.md). Add `doc/requirements/` when you use it.
