# TwitchFavs managed membership

Drives **[Epic 10.6](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#epic-10--url-first-membership-phased)** in the EDGE plan. Global group **name** must be **`TwitchFavs`** (case-insensitive).

## Functional requirements

| ID | Requirement | Outcome |
|----|-------------|---------|
| **TF.1** | **Reserved group:** Behavior applies only when `GlobalGroup.name` normalizes to **`twitchfavs`**. | No accidental mode on other groups. |
| **TF.2** | **Name list input:** **Auto-include URL patterns** accepts **bare streamer names**, **newline** or **comma** separated; optional full `http(s)` URLs still allowed. | Matches user workflow (names-only text box). |
| **TF.3** | **Expand names to Twitch:** Each bare token maps to **`https://www.twitch.tv/{login}`** for matching (and stored pattern expansion as implemented). | Refresh targets canonical channel URLs. |
| **TF.4** | **Case-insensitive** channel identity everywhere (list, URLs, tab matching). | `CO1azo` matches `co1azo`. |
| **TF.5** | **Prune targets:** Stored **`targets`** rows whose channel is **not** in the current favorites list are **removed** (and **`tabNextFireAt`** / **`pausedTabIds`** cleaned for dropped `tabId`s). | Tab list only reflects fav channels. |
| **TF.6** | **Rebind per channel:** When an **allowed** fav channel appears in an open tab (including a **new** tab), **upsert** that channel’s **`tabId`** / **`windowId`** / **`targetUrl`** and **remove** the **previous `tabId`** for the **same** channel. | One row per streamer; newest tab wins. |
| **TF.7** | **Background sync:** Run reconciliation on **`tabs.onUpdated`** (Twitch http(s) only, throttle if needed) and on **save** of the TwitchFavs group from the dashboard. | Storage stays fresh without manual checkbox juggling. |
| **TF.8** | **UX hint:** Pattern textarea shows short help when group is TwitchFavs (names → Twitch URLs). | Discoverability. |

## Relationship to Epic 10 core

- Uses **`memberKeyFromTargetUrl`** / channel-key helpers from [`src/lib/member-url.ts`](../../src/lib/member-url.ts) where applicable.
- **10.6** depends on **10.1** (library keys). **Recommended:** implement **after 10.2** so **`scheduler.ts`** refresh path already resolves live `tabId`s from URLs; otherwise rebinding may fix overlay but refresh could still hit stale ids until 10.2 ships.
