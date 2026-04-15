# Handoff — next agent (URL Auto Refresher)

**Revision:** `.8` — supersedes **[`.7`](./HANDOFF-2026-04-14-next-agent.7.md)**. Superseded by **[`.9`](./HANDOFF-2026-04-14-next-agent.9.md)** (build mkdir note).

**Last updated:** 2026-04-14 — **Epic 5 shipped** (unified UI + side panel). Tier 2 multi-window note remains in **`.7`** if you need it.

This file lives under **`doc/handoff/`** so it can be committed.

**Canonical agent entry:** [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) — **Current state** should match the **latest** dot revision in [HANDOFF-2026-04-14-next-agent.md](./HANDOFF-2026-04-14-next-agent.md).

---

## Done this session

- **Epic 5 (5.1–5.4)** — Shared [`src/dashboard/dashboard-app.ts`](../../src/dashboard/dashboard-app.ts); dashboard **browse grid** + **Individual (M)** header; **`sidepanel/sidepanel.html`** generated from [`dashboard/dashboard.html`](../../dashboard/dashboard.html) in [`Scripts/build.mjs`](../../Scripts/build.mjs); cross-surface buttons (`data-open-side-panel` / `data-open-dashboard-tab`); countdown polling unchanged (~1s).
- **Tier 2:** [`e2e/epic-5.spec.ts`](../../e2e/epic-5.spec.ts); [`e2e/extension-helpers.ts`](../../e2e/extension-helpers.ts) — `sidepanelUrl()`.
- **Docs:** [EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) Epic **5** checked; [PM_PLAN.md](../../PM_PLAN.md), [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md), [TEST_PLAN.md](../../TEST_PLAN.md) aligned.

---

## Code review (handoff pass)

**PASS** — Shared init keeps one bundle for dashboard + side panel; cross-links use `chrome.sidePanel.open` / `chrome.tabs.create` with surface-specific visibility via CSS. Build-time HTML generation avoids drift between stub and dashboard. New E2E covers headings, layout container, and nav visibility.

**WARN (minor):** [`dashboard-app.ts`](../../src/dashboard/dashboard-app.ts) is still a large orchestrator (pre-existing pattern); optional split when touching Epic **6** or a follow-up refactor.

---

## Tech debt

| Priority | Category | Note |
|----------|----------|------|
| Do next (product) | **Epic 6** | Focus-aware toolbar badge — [plan](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) **6.1–6.3**. |
| Medium | Code | `dashboard-app.ts` size / responsibilities. |
| Medium | Tests | Optional: E2E click **Open side panel** / **Open full dashboard** (API availability in headed Chromium). |
| Low | Docs | Ref.1 in plan (reference PNGs) still open. |

---

## Code coverage / tests

| Gate | Result |
|------|--------|
| **`npm run ci`** | **Green** — Vitest **100** tests (**19** files), production **build** (incl. side panel HTML gen), Playwright **17** E2E tests. |

---

## Mandatory first steps (before deep coding)

1. Read [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) — **Epic 6** next (toolbar badge); **Epic 5** complete.
2. Read [.cursor/skills/TEST_TDD.md](../../.cursor/skills/TEST_TDD.md) — TDD for Tier 1 / Tier 2 when applicable.
3. Read [TEST_PLAN.md](../../TEST_PLAN.md) — commands, E2E extension load.

---

## Next up

1. **Epic 6** — Focused-window job subset, badge text from nearest `nextFireAt`, subscribe to focus/tab/alarm paths without busy loops — [EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) **§ Epic 6**.
2. Run **`npm run ci`** after each logical step.

---

## Repository snapshot (for orientation)

- **Shared UI:** [`src/dashboard/dashboard-app.ts`](../../src/dashboard/dashboard-app.ts), [`src/dashboard/dashboard.ts`](../../src/dashboard/dashboard.ts) (entry only).
- **Side panel HTML:** [`sidepanel/sidepanel.html`](../../sidepanel/sidepanel.html) — **generated**; edit [`dashboard/dashboard.html`](../../dashboard/dashboard.html) + rebuild.
- **E2E Epic 5:** [`e2e/epic-5.spec.ts`](../../e2e/epic-5.spec.ts).

---

## Older revisions

- **`.7`** — [HANDOFF-2026-04-14-next-agent.7.md](./HANDOFF-2026-04-14-next-agent.7.md) — Tier 2 multi-window scope note.
- **`.6`** — [HANDOFF-2026-04-14-next-agent.6.md](./HANDOFF-2026-04-14-next-agent.6.md) — post–**4.3** detail.
- **Index** — [HANDOFF-2026-04-14-next-agent.md](./HANDOFF-2026-04-14-next-agent.md)
