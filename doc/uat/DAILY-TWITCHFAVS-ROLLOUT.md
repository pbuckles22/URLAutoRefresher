# Daily guide — Twitch favorites snap-back

Use this when you want **scheduled tabs to return to your Twitch channel URL** after raids, browsing, or other detours. It matches what ships on **`main`** today (refresh scheduler + **TwitchFavs**). Precision volume is optional and called out separately.

---

## What you are deploying

| Piece                           | What it does for you                                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Scheduled refresh**           | On a timer, the extension opens the **saved channel URL** in the matching tab—not “whatever URL is showing now.”                                                                                                         |
| **TwitchFavs group**            | A global group named **TwitchFavs** plus a list of streamer logins. Opening `https://www.twitch.tv/<login>` adds that channel to the group automatically.                                                                |
| **Live tab lookup**             | The extension does **not** remember a tab ID from when you opened a favorite. When the timer fires, it finds an **open tab** that matches the channel URL and navigates **that** tab home.                               |
| **Precision volume** (optional) | Shortcuts use the **active** tab. Dashboard fader still needs **Target tab** today — [Backlog #9](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#9-precision-volume--default-to-active-focused-tab) will align with active tab. |

---

## Deploy and update in Microsoft Edge

### Which folder Edge needs

Choose the **repository root** — the folder that contains **`manifest.json`**.

Examples:

- `C:\Users\pbuck\Dev\URLAutoRefresher`
- Or your NAS copy after mapping a drive (see [README.md](../../README.md) if `npm` fails on a UNC path)

Do **not** select only the `dist` folder.

### Build commands

From that folder in PowerShell:

```powershell
Set-Location C:\Users\pbuck\Dev\URLAutoRefresher
git checkout main
git pull origin main
npm run build
```

Stay on **`main`** for day-to-day use. If `git checkout main` complains about local changes, commit or stash first.

### Load or reload the extension

1. Open **`edge://extensions`**
2. Turn on **Developer mode** (you already have this)
3. **If this is the first time:** **Load unpacked** → select the repo root (folder with `manifest.json`)
4. **If the extension is already loaded from that same folder:** click **Reload** on the **URL Auto Refresher** card after every `npm run build`

Reload keeps your settings. You only use **Load unpacked** again if you moved the project to a different directory.

### Quick smoke check

1. Click the extension icon → side panel opens
2. Click **Open in a tab** → full dashboard title is **URL Auto Refresher**
3. You see **Global** and **Individual** sections

If that works, the build you just made is what Edge is running.

---

## One-time setup (about five minutes)

Open the dashboard (toolbar icon → **Open in a tab**).

### Create the TwitchFavs group

| Field                         | What to enter                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Group name**                | `TwitchFavs` (case does not matter)                                                                            |
| **Auto-include URL patterns** | One Twitch **login** per line, e.g. `yourchannel` and `friendchannel`. Full URLs are allowed but not required. |
| **Interval (seconds)**        | `120` for your first test; later use `300`–`900` (5–15 minutes) for normal use                                 |
| **Jitter (seconds)**          | `0` for testing; `10`–`30` later so refreshes are not perfectly aligned                                        |
| **Save**                      | Group appears under **Global (N)**                                                                             |
| **Start** on the row          | Group must be **running** (countdown visible)                                                                  |

You do **not** need to check every tab in the browser grid for channels listed in the pattern box. Opening the Twitch tab is enough for membership to sync.

### Display preference

Under **Display**, **Show large refresh countdown on the page** is useful while learning the product (small timer on enrolled tabs). Turn it off anytime in the dashboard.

### Volume (optional)

Skip the **Precision volume** section if you only want snap-back. To avoid accidental shortcuts, open **`edge://extensions/shortcuts`** and clear the three **precision volume** chords.

---

## Daily routine (about two minutes)

1. **After you changed the repo:** run `npm run build`, then **Reload** the extension on `edge://extensions`.
2. **Open** each favorited Twitch channel in its own tab (`https://www.twitch.tv/<login>`).
3. **Glance** at the dashboard or side panel: **TwitchFavs** is **enabled** and the countdown is moving.
4. **Use Twitch as usual.** If a tab wanders off the channel URL, wait for the next tick—it should load the saved channel again.

The toolbar **badge** shows time until the next refresh in the **focused** window (one badge for the whole profile; that is a browser limit).

---

## User acceptance tests — “this is done”

Use a **short interval (60–120 seconds)** for these tests, then lengthen the interval for real use.

### Test 1 — Extension is alive

| Step                                      | Pass when                                                           |
| ----------------------------------------- | ------------------------------------------------------------------- |
| Run `npm run build`, **Reload** extension | No error on the extension card                                      |
| Open dashboard                            | Title **URL Auto Refresher**; **Global** and **Individual** visible |

### Test 2 — TwitchFavs learns your channel

| Step                                                                 | Pass when                                                                                      |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Save **TwitchFavs** with your login in **Auto-include URL patterns** | Group saved                                                                                    |
| Open `https://www.twitch.tv/<yourLogin>`                             | Page loads                                                                                     |
| Check the group in the dashboard (edit or refresh list)              | Target includes `https://www.twitch.tv/<yourLogin>` (may take about a second after navigation) |
| Press **Start** on the group                                         | Countdown appears and counts down                                                              |

### Test 3 — Snap-back (main value)

| Step                                                                             | Pass when                                                 |
| -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| On that tab, go somewhere else (another stream, **Directory**, **Videos**, etc.) | Address bar is **not** your home channel                  |
| Wait until the countdown reaches zero (or overlay shows `0:00`)                  | Tab navigates back to `https://www.twitch.tv/<yourLogin>` |
| Repeat on a second favorited channel if you use several                          | Same behavior per tab                                     |

**You are done** when Test 3 passes reliably for every channel you care about.

### Test 4 — Page overlay (optional)

| Step                                                                     | Pass when                                   |
| ------------------------------------------------------------------------ | ------------------------------------------- |
| Overlay preference **on**, group **running**, tab on an enrolled channel | Small countdown card, top-right on the page |
| Overlay preference **off**, reload the tab                               | Card gone                                   |

### Test 5 — Volume (optional; skip if unused)

| Step                                                                           | Pass when                                                       |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| On a page with video, press default **Ctrl+Shift+Up** (or your remapped chord) | Loudness changes (first hook may start from silence—raise once) |
| Dashboard **Precision volume** → select tab → move fader                       | Same tab’s volume changes                                       |

Shortcut **on-screen toasts** need a newer build than bare `main` if you have not merged the OSD branch; they are not required to pass snap-back UAT.

---

## Recommended settings after UAT

| Setting          | Suggestion                                                       |
| ---------------- | ---------------------------------------------------------------- |
| Interval         | **300–900 s** so you are not refreshing Twitch too often         |
| Jitter           | **10–30 s**                                                      |
| Overlay          | On if you like the reminder; off if it feels cluttered           |
| Volume shortcuts | Unassign at `edge://extensions/shortcuts` if you do not use them |

---

## Troubleshooting

| What you see                                       | What to try                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Same old behavior after editing code               | **Reload** the extension, not only `npm run build`                                                |
| No countdown                                       | Group **Start** vs **Stop**; at least one channel in patterns or targets                          |
| Timer runs but tab never goes “home”               | Tab still open? Login spelled correctly in patterns? Interval not extremely long during the test? |
| Wrong channel refreshed                            | Fix the name list in **Auto-include URL patterns**                                                |
| **Save TwitchFavs blocked** (individual job error) | **Stop** or **delete** enabled **Individual** jobs for the same channels, then save again         |
| `npm` errors on a network path                     | Map a drive letter or clone to a local disk — [README.md](../../README.md)                        |

---

## Out of scope for this guide

- Remembering **tab ID** when you open a favorite (the product uses **URL + find open tab** instead).
- Refreshing on every click (only on the **timer**).
- Features not yet on your loaded build (always **Reload** after `git pull` on **`main`**).

---

## Related docs

- [README.md](../../README.md) — install, permissions, shortcuts
- [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) — full epic list
- [doc/requirements/twitch-favs-managed-membership.md](../requirements/twitch-favs-managed-membership.md) — TwitchFavs rules in detail
