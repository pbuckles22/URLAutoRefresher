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
9. **Overlay must not re-bind sched hint on detour** — `page-overlay-handler` `rememberSchedTabId` only when tab has no hint or same `memberKey`; otherwise fav→fav raids flip-flop home (hint poison). Gate 2 regression: repeated raid to another favourite.

## Step B (Epic 14) — proactive raid guard

When a TwitchFavs tab is on its **home channel**, watch for Twitch’s raid banner and auto-click **Leave Raid / Cancel** so the tab never navigates away. Step A snap-back remains fallback.

## Out of scope on Step A branch (historical)

- ~~**Epic 14** — proactive raid block~~ — now Step B / Epic 14.
- **Backlog #9** precision-volume auto-apply WIP — stays in stash or a separate branch off `main`.
- **Backlog #8** — overlay drag.

## Manual UAT (Epic 12.2)

See [DAILY-TWITCHFAVS-ROLLOUT.md](../uat/DAILY-TWITCHFAVS-ROLLOUT.md). Enable **Show snap-back debug on overlay** in dashboard prefs.

### Automation vs manual (Gates 2–3)

| Gate  | What                                                                                                      | When you run it                      |
| ----- | --------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **2** | [`e2e/epic-12-gate2-snap-back.spec.ts`](../../e2e/epic-12-gate2-snap-back.spec.ts) (part of `npm run ci`) | Every merge candidate                |
| **3** | [TEST_PLAN.md Gate 3](../../TEST_PLAN.md#gate-3--manual-ship-step-a-real-twitch) — 2–3 real favs, ~10 min | Once before merging Step A to `main` |

Gate 2 covers stub snap-back, multi-tab overlay, homepage, and Backlog **#10** close/reopen. Gate 3 is the only required real-Twitch check before ship.

## Stash reference

Original mixed WIP: `git stash list` → `WIP snap-back+volume mixed 2026-06-03` (precision volume files not replayed here).
