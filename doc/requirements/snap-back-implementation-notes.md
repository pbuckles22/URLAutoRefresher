# Snap-back implementation notes (Step A learnings)

Captured after mixed WIP on `feature/backlog-9-active-tab-precision-volume` (2026-06-03). Rebuilt on `feature/snap-back-uat` in small commits.

## Product goal (Backlog #10 / Step A)

When a TwitchFavs tab is on its **home channel**, the scheduler remembers that tab for refresh/snap-back. If the user is **raided** or navigates to another channel on that tab, restore the home URL. Overlay debug strip validates Tab vs Sched vs refresh URL during UAT.

## Learnings (do not repeat)

1. **Seed `memberNextFireAt`** when a fav channel tab is open even if `applyTwitchFavsUpsertFromTabUrl` is a no-op (`rescheduleIfMemberTabOpen` + `shouldBootstrapSchedulingForTabUrl`).
2. **Site root must not match channels** — `twitch.tv` homepage must not prefix-match every channel (`pageMatchesExplicitTarget`).
3. **Sched hints survive MV3 sleep** — store in `chrome.storage.session`, rehydrate on alarm and navigation.
4. **Snap-back triggers** — `?referrer=raid` **or** previous URL was the home channel; do not snap when user browses away from homepage/directory (`isTwitchBrowseUrl` clears hints).
5. **Do not overwrite hints on fav→fav detour** — `maybeRememberSchedTabFromFavHome` skips when tab already has a hint for a different home.
6. **Overlay matches `urlPatterns`** — not only explicit `targets` rows (`findTwitchFavsMemberForPageUrl`).
7. **Never re-inject `page-overlay.js` on routine SW wake** — use `PAGE_OVERLAY_SYNC_REQUEST`; inject only on `onInstalled` when message fails. Reuse existing shadow root on attach.
8. **Commit after each slice** — run `npm run ci` + manual 2–3 Twitch tab check before the next change.

## Out of scope on this branch

- **Epic 14** — proactive raid block (before navigation completes).
- **Backlog #9** precision-volume auto-apply WIP — stays in stash or a separate branch off `main`.
- **Backlog #8** — overlay drag.

## Manual UAT (Epic 12.2)

See [DAILY-TWITCHFAVS-ROLLOUT.md](../uat/DAILY-TWITCHFAVS-ROLLOUT.md). Enable **Show snap-back debug on overlay** in dashboard prefs.

## Stash reference

Original mixed WIP: `git stash list` → `WIP snap-back+volume mixed 2026-06-03` (precision volume files not replayed here).
