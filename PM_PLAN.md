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
- **Backlog #10 / Step A (0.12.x snap-back gate):** **Shipped on `main`** — TwitchFavs snap-back after raid/detour; sched-tab session hints; overlay debug strip + minimize badge; DOM-first live detect; stream **On/Off** toggle; **45m** safety refresh when live-paused; theater/chat layout (partial, no pref toggle). **Gate 2** (7/7 Playwright) + **Gate 3** real-Twitch pass (2026-06-08; 45m safety + override reset verified). Handoff: `doc/handoff/HANDOFF-2026-06-08-153200.md` (local).
- **Epic 14 / Step B (`0.14.4`–`0.14.5`):** **Shipped on `main`** — proactive raid guard on TwitchFavs home tabs (auto-decline before detour); overlay debug **Raid blocks** / **Snap-backs** counters; Step A snap-back remains fallback. **Gate 2** (1/1 Playwright) + **Gate 3** real-Twitch pass (2026-06-16; `whistleface` raid, **Raid blocks: 1**). **`0.14.5`** — tech-debt patch: late bridge armed re-sync, group-toggle re-arm, raid-block counter dedupe. UAT soak continues in production. Version scheme: [doc/VERSIONING.md](doc/VERSIONING.md).
- **Epic 15 / Step C (`0.15.1`–`0.15.2`):** **Shipped on `main`** — dashboard **Twitch** pref for automatic watch layout: **live** = theater + chat open; **offline** = theater + chat collapsed (default on). **`0.15.2`** — tech-debt patch: pref hydration gate (no layout flash when off), automation reset on re-enable without reload.
- **Backlog #8 / Step D (`0.16.1`):** **Shipped on `main`** — overlay **snap** (⇄ top-left ↔ top-right) + **drag** (⋮⋮ handle); global **`overlayPosition`** pref persists across refresh.
- **Backlog #9 (`0.16.2`):** **Shipped on `main`** — precision volume fader defaults to **active tab** in the focused window (optional tab override picker).
- **Backlog #8 polish:** **Shipped on `main`** — drag E2E, MV3 storage guard on overlay prefs, drag-handle keyboard nudge + focus ring (still **`0.16.2`**).
- **CI Node 24:** **Shipped on `main`** — GitHub Actions **`node-version: '24'`** in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (silences Node 20 deprecation annotation).

## Next (see EDGE plan)

**Execution order:** Backlog **#11** when scoped.

| Step   | Scope                                        | Status                 |
| ------ | -------------------------------------------- | ---------------------- |
| **D**  | Backlog **#8** — overlay drag                | **Shipped** (`0.16.1`) |
| **#9** | Backlog **#9** — active-tab precision volume | **Shipped** (`0.16.2`) |

- **Parallel (multi-capacity):** **L12** ∥ **L13A** ∥ **L113** allowed (distinct paths); **13.A** slices **serial** on scheduler files (**G5**); **13.B** slices **serial** (**G4**); **one owner** for [`dashboard-app.ts`](src/dashboard/dashboard-app.ts) across epics (**G3**). Still **merge to `main` one PR at a time** through CI.
- **Single agent:** Use the **linear order** in EDGE [Parallel work — Epics 11–13](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#parallel-work--epics-11-13) (single-stream bullet).
- **[Epic 12](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#epic-12--twitchfavs--url-first-qa--ci-confidence):** **12.1–12.4 shipped** — CI-safe Twitch stub E2E + Gate 2 snap-back; optional live Twitch E2E remains backlog only.
- **[Epic 13](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#epic-13--scheduler--dashboard-modularization):** **Phase 13.B shipped** (**13.B1–13.B5**); Epic **13** scheduler (**13.A**) + dashboard modularization complete — **`npm run ci`** remains the merge gate. ESLint / complexity: [.cursor/skills/code-quality-gate/SKILL.md](.cursor/skills/code-quality-gate/SKILL.md).
- **Epic 11:** **done (11.1–11.7)** on **`main`** — precision volume + OSD + tests; UAT: [doc/uat/DAILY-TWITCHFAVS-ROLLOUT.md](doc/uat/DAILY-TWITCHFAVS-ROLLOUT.md).

## Later (see EDGE plan)

- **Backlog:** [EDGE plan — Backlog](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#backlog-ux--polish--bugs). **Shipped:** items **1–3**, **5**, **6**, **8**, **9**, **10** (see EDGE plan). **Open:** **4** (Play after long idle — **on hold**); **7** _(superseded by Epic 10 — traceability only)_; **11** (per-chatter live chat history — opt-in capture, IndexedDB, 3-hour window — design deferred to epic); **12** (Twitch channel points bonus auto-click — opt-in, TwitchFavs-shaped, design deferred to epic). TDD handoff: [doc/requirements/backlog-tdd-handoff.md](doc/requirements/backlog-tdd-handoff.md).
- New epics/stories should still be added to the EDGE plan and [doc/requirements/](doc/requirements/) when you formalize scope.

Keep this file in sync with [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) checkboxes when scope changes. Session handoff notes use `doc/handoff/HANDOFF-*.md` (gitignored — not on `main`); prefer **timestamped** names (`HANDOFF-YYYY-MM-DD-HHmmss.md`) and a **Recorded** line — [AGENT_HANDOFF.md](AGENT_HANDOFF.md). Add `doc/requirements/` when you use it.
