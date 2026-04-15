# Handoff — next agent (URL Auto Refresher)

**Revision:** `.9` — supersedes **[`.8`](./HANDOFF-2026-04-14-next-agent.8.md)**. Add **`.10`** when this content is superseded.

**Last updated:** 2026-04-14 — **Build robustness:** [`Scripts/build.mjs`](../../Scripts/build.mjs) creates the **`sidepanel/`** directory with `mkdirSync(..., { recursive: true })` before writing **`sidepanel.html`**, so a clean clone or sparse checkout cannot fail on missing folder. Product baseline unchanged from **`.8`** (Epic **5** done; next **Epic 6**).

This file lives under **`doc/handoff/`** so it can be committed.

**Canonical agent entry:** [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) — **Current state** should match the **latest** dot revision in [HANDOFF-2026-04-14-next-agent.md](./HANDOFF-2026-04-14-next-agent.md).

---

## Repository / CI

- Run **`npm run ci`** after changes; expect green before PR.

---

## Next up

Unchanged from **`.8`:** **Epic 6** — focus-aware toolbar badge — [EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) and [`.8` Next up](./HANDOFF-2026-04-14-next-agent.8.md#next-up).

---

## Older revisions

- **`.8`** — [HANDOFF-2026-04-14-next-agent.8.md](./HANDOFF-2026-04-14-next-agent.8.md) — Epic **5** ship note (full detail).
- **Index** — [HANDOFF-2026-04-14-next-agent.md](./HANDOFF-2026-04-14-next-agent.md)
