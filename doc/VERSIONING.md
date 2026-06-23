# Versioning — Media Control Suite

Extension version follows the **[EDGE plan](plan/EDGE_URL_AUTO_REFRESHER_PLAN.md)** epic/story checklist.

## Format

**`MAJOR.EPIC.STORY`** (three numeric segments)

| Segment   | Meaning                                             | Example                     |
| --------- | --------------------------------------------------- | --------------------------- |
| **MAJOR** | Product generation / breaking milestone (see below) | `0` while pre–store publish |
| **EPIC**  | Epic number from the EDGE plan                      | Epic 14 → `14`              |
| **STORY** | Story suffix within that epic                       | Story **14.4** → `4`        |

**Current shipped version:** **`0.15.1`** — Epic **15** story **15.1** (Twitch live/offline watch layout pref).

## When to bump

1. **Before `git commit`** when the commit ships checked-off EDGE scope (story or epic closure). See [AGENT_HANDOFF.md](../AGENT_HANDOFF.md) → _Git workflow_ step **4**.
2. Edit **`package.json`** `"version"` only (source of truth). Run **`npm run build`** — it syncs **`manifest.json`**.
3. **Doc-only / typo commits** with no story checkbox change: **no version bump**.

### Story number rules

- **Standard stories (`N.M`):** use **`M`** as the third segment (story **10.6** → **`0.10.6`**).
- **Post–Epic 9 (`P9.x`):** treat as Epic **9**, story **`3 + x`** (Epic 9 ends at **9.3**; **P9.1** → **`0.9.4`**, **P9.6** → **`0.9.9`**).
- **Phased stories (`13.A*`, `13.B*`):** use ship order in the EDGE plan — **A1→1, A2→2, A3→3, B1→4, …, B5→8** (Epic 13 complete → **`0.13.8`**).
- **Backlog work** folded into an epic: use that **epic + story** when the checkbox lands in the plan (do not invent a separate backlog version).
- **Behavior fix on `main` without a new story line:** increment the third segment by **1** from the last ship (e.g. **`0.14.4` → `0.14.5`**).

## Major releases (`MAJOR` segment)

Stay on **`0.EPIC.STORY`** during continuous delivery on **`main`**.

Bump **MAJOR** (and reset to **`N.0.0`** or the next epic story as agreed in PM_PLAN) when **any** of these apply:

| Trigger                                                                                               | Example                                                                                                               |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **First Microsoft Edge Add-ons store publish**                                                        | `0.14.4` → **`1.0.0`** (or **`1.14.4`** if you want epic traceability — pick once at publish and document in PM_PLAN) |
| **Breaking persisted state** — `schemaVersion` / storage shape change **without** automatic migration | `1.x.y` → **`2.0.0`**                                                                                                 |
| **Manifest permission change** that forces users to re-approve the extension                          | coordinated major bump                                                                                                |
| **PM-declared product generation** (e.g. rename to Media Control Suite as a marketed v2)              | recorded in PM_PLAN + EDGE                                                                                            |

**Recommended default for store publish:** **`1.0.0`** at first public listing; keep **`0.EPIC.STORY`** until then so UAT builds map directly to plan progress.

## Files

| File                                | Role                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [`package.json`](../package.json)   | **Source of truth** — bump here                                                                               |
| [`manifest.json`](../manifest.json) | Synced on **`npm run build`** via [`Scripts/sync-manifest-version.mjs`](../Scripts/sync-manifest-version.mjs) |

## Supersedes

Ad-hoc **`v0.2.0` / `v0.2.1`** (Backlog #10 Step A / Epic 14 Step B) are retired. Use **`0.EPIC.STORY`** only going forward.
