# Handoff — next agent (URL Auto Refresher)

**Revision:** `.7` — supersedes **[`.6`](./HANDOFF-2026-04-14-next-agent.6.md)**. Add **`.8`** when this content is superseded.

**Last updated:** 2026-04-14 — addendum on **Tier 2 scope** (multi-window). **Baseline product narrative** (Epic **4.3**, CI, tech debt, next **Epic 5**) remains in **[`.6`](./HANDOFF-2026-04-14-next-agent.6.md)**; read **`.6`** first unless you only need the test-scope note below.

This file lives under **`doc/handoff/`** so it can be committed.

**Canonical agent entry:** [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) — **Current state** should match the **latest** dot revision in [HANDOFF-2026-04-14-next-agent.md](./HANDOFF-2026-04-14-next-agent.md).

---

## Tier 2 E2E: multiple browser windows

**Decision:** Do **not** add a Playwright scenario that opens **two top-level Chromium windows** solely to regression-test the global tab browser across windows.

**Rationale:** The dashboard uses **`chrome.windows.getAll({ populate: true })`**; that path is **trusted** for multi-window listing. Current Tier 2 tests exercise the tab browser and save flows with the tabs the harness creates (typically one window, multiple tabs). **Gap:** automated E2E does not assert two separate `windowId` groups in the UI. **Mitigation:** manual smoke (e.g. release / Epic **7** manual QA in [EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md)) if multi-window behavior matters for a release.

**Not a merge blocker** unless product priority changes.

---

## Repository / CI

- **`main`** includes **`feat(epic-4): global groups list, mutual exclusion UX, E2E and handoff`** (Epic **4.2–4.3**, handoff **`.5` / `.6`**, epic-3-2 edit stabilization). Run **`npm run ci`** after changes; expect green before PR.

---

## Next up

Unchanged from **`.6`:** **Epic 5** — unified UI / side panel — [EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) and [`.6` Next up](./HANDOFF-2026-04-14-next-agent.6.md#next-up).

---

## Older revisions

- **`.6`** — [HANDOFF-2026-04-14-next-agent.6.md](./HANDOFF-2026-04-14-next-agent.6.md) — full post–**4.3** handoff.
- **Index** — [HANDOFF-2026-04-14-next-agent.md](./HANDOFF-2026-04-14-next-agent.md)
