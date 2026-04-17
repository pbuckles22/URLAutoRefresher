# Post–Epic 9 requirements (shipped)

Incremental product behavior after [Epic 8](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#epic-8--live-aware-scheduling-twitch-first) and [Epic 9](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#epic-9--blip--error-text-triggered-refresh) in the [EDGE plan](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md). All items below are implemented on `main` and marked complete for planning purposes.

| ID | Requirement | Outcome |
|----|----------------|---------|
| **P9.1** | Global groups may define optional **URL patterns** (newline-separated, `*` wildcards). Matching `http`/`https` tabs are included automatically; explicit tab checkboxes remain; save-time validation prevents overlap with other jobs/groups. | e.g. all `twitch.tv/*` tabs without re-checking each new tab. |
| **P9.2** | **Per-tab pause** for tabs in a global group: user can pause refresh for one tab while others continue (`pausedTabIds`). Page overlay shows paused state and **Play** to resume. | Watch one stream without disabling the whole group. |
| **P9.3** | **Per-tab jitter** for global groups: each tab has its own `tabNextFireAt` and alarm (`urlar:gt:{groupId}:{tabId}`); dashboard shows a **time range** when next fires differ. | Staggered refreshes instead of one synchronized wall-clock for the group. |
| **P9.4** | Dashboard: list of saved **global groups** appears **above** the “Add a new group” form. | Active groups visible first. |
| **P9.5** | Page overlay: timer **Min/Sec** presentation, card position, optional **Pause** for applicable global-group tabs. | Clearer countdown UX aligned with reference styling. |
| **P9.6** | Twitch **live bridge**: after extension reload, avoid noisy **Extension context invalidated** (guards, teardown, unhandled rejection handling). | DevTools stays clean during development. |

**Related:** Epic **2.4** “one alarm per global group / synchronized refresh” is superseded by P9.3 for globals; individuals remain one alarm per job.

**P9.1 and tab lifecycle:** URL patterns auto-include matching **open** tabs; they do not replace **[Backlog 7](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#backlog-ux--polish--bugs)** — rebinding stored **`tabId`** when the user closes a grouped tab and opens the same URL again (new tab id).
