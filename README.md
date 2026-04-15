# URL Auto Refresher (Edge extension)

Chromium Manifest V3 extension for Edge: scheduled refreshes to a **configured target URL** per tab (e.g. original Twitch channel after a raid), with optional **global synchronized groups**, **individual** timers, interval **jitter**, and a **focus-aware** toolbar badge.

**Project folder (canonical):** `Development\URLAutoRefresher` (correct spelling).

**Agentic workflow:** This repo includes the [AgenticTemplate](https://github.com/pbuckles22/AgenticTemplate) layer — Cursor **rules**, **skills**, **handoff** protocol, and **test discipline** ([AGENT_HANDOFF.md](AGENT_HANDOFF.md), [PM_PLAN.md](PM_PLAN.md), [TEST_PLAN.md](TEST_PLAN.md), `.cursor/`).

## Documentation

- [Documentation index (`doc/`)](doc/README.md)
- [Project plan and epics](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md)
- [Agent handoff & source of truth](AGENT_HANDOFF.md)
- [Handoff: move repo from UNC to a local disk (Windows)](doc/handoff/HANDOFF_MOVE_TO_LOCAL.md)

## What’s included (agentic)

| Area | Contents |
|------|----------|
| **.cursor/rules** | `always.mdc`, `handoff-checklist.mdc`, `testing.mdc` |
| **.cursor/skills** | DEV_GUIDE, TEST_TDD, DESIGN_SYSTEM, techwriter, tester, code-reviewer, tech-debt-evaluator, pm-governance, ui-ux, visual-match |
| **.cursor/handoff** | Handoff note template and README |
| **doc/** | Plan, requirements, UI references; **`doc/handoff/`** on `main` is only the [UNC → local move guide](doc/handoff/HANDOFF_MOVE_TO_LOCAL.md) — see [index](doc/README.md) |
| **examples/** | Placeholder for reference UI/specs |
| **script/** | README — add your own test runner scripts |

## Development

1. Install Node.js (LTS) and run **`npm install`** in this folder.

   **If the project lives on a UNC path** (`\\server\...`) and `npm install` fails with `UNC paths are not supported` or **esbuild** `Cannot find module ... install.js`: Windows `cmd.exe` (used by some package install scripts) cannot use a UNC path as the current directory. Use one of:
   - **Map a drive letter** for the session, then install from that letter (paths are no longer UNC):
     ```powershell
     subst Z: "\\chaosnas.local\buckles\My.Documents\Development"
     Set-Location Z:\URLAutoRefresher
     npm install
     ```
     (`subst Z: /d` when done removes the mapping.)
   - Or **clone/copy the repo** to a local folder under `C:\Users\...` and run `npm` there.

   If you see **EPERM** during cleanup, close editors/terminals using `node_modules`, delete `node_modules` manually if needed, and retry.

2. **`npm test`** — Vitest (Tier 1).
3. **`npm run build`** — produces `dist/background.js`, `dist/page-overlay.js` (content script), `dashboard/dashboard.js`, and placeholder `icons/*.png`.
4. **`npm run ci`** — runs tests then build; same check as GitHub Actions — use before PRs.
5. Edge → **Extensions** → **Developer mode** → **Load unpacked** → select this folder (the one containing `manifest.json`).

### GitHub (`URLAutoRefresher`)

Default branch is **`main`** (`HEAD` → `refs/heads/main`).

**Option A — GitHub CLI** (creates `https://github.com/<your-user>/URLAutoRefresher`, sets `origin`, pushes):

```powershell
Set-Location "\\chaosnas.local\buckles\My.Documents\Development\URLAutoRefresher"
git branch -M main
pwsh -File .\Scripts\setup-github.ps1
```

Requires [GitHub CLI](https://cli.github.com/) and a one-time `gh auth login`.

**Option B — empty repo on the website**, then:

```powershell
git branch -M main
git remote add origin https://github.com/<your-username>/URLAutoRefresher.git
git push -u origin main
```

## What not to put in the repo

- **No secrets** — API keys, tokens, credentials. Use environment variables or a local config that is gitignored.
- **Local agent session notes** — `.cursor/handoff/handoff-*.md` and **`doc/handoff/HANDOFF-*.md`** are gitignored (not on `main`). **`doc/handoff/HANDOFF_MOVE_TO_LOCAL.md`** is the **only** tracked file in that folder (generic UNC → local guide). **Committed:** `.cursor/handoff/_template.md` and `README.md` (process only). **No secrets** in docs.

## Git on a UNC / network path (dubious ownership)

Git may refuse commands when the repo is on a NAS (`\\server\...`). Trust **this** directory:

```powershell
git config --global --add safe.directory "//chaosnas.local/buckles/My.Documents/Development/URLAutoRefresher"
```

If Git still complains, use the exact `safe.directory` line it prints, or as a last resort on a trusted PC only:

```powershell
git config --global --add safe.directory '*'
```

Then:

```powershell
Set-Location "\\chaosnas.local\buckles\My.Documents\Development\URLAutoRefresher"
git add .
git status
git commit -m "Describe your change"
```

## Status

Epics through **7** (ship notes for Edge — install, permissions, limits, manual QA) are implemented per [doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md). The toolbar badge is **focus-aware:** it shows the countdown to the nearest refresh among jobs in the **last-focused** browser window (tabs resolved live via `chrome.tabs.query`). If that window has no enrolled tabs, the badge **falls back** to the nearest refresh among all jobs so you still see activity. **Platform limit:** `chrome.action` exposes **one** badge per profile — every window’s toolbar shows the same text; the value tracks the focused window’s jobs, not a separate number per tiled window.

## Permissions (Edge / Chromium)

The extension requests: **`storage`**, **`alarms`**, **`tabs`**, **`windows`**, **`sidePanel`**, and broad **`http*://*/*`** host access so scheduled refreshes can navigate tabs to your configured target URLs.

## Manual QA (releases)

After `npm run build`, load this repo **unpacked** in Edge: **Extensions** → **Developer mode** → **Load unpacked** → select the folder that contains `manifest.json` (same as [Development](#development) step 5). Then walk the **same** cases as [Testing checklist (manual)](doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md#testing-checklist-manual):

- Two windows, two different `targetUrl`s in **one global group** → both refresh **together**; live URL may differ until refresh.
- **Individual** in window A while **global** runs in B/C → independent timers.
- Service worker restarts → alarms still fire; `nextFireAt` matches alarms.
- Tab closed → job disabled or removed; no error on `tabs.update`.

**Multi-window / badge:** Open a second window, switch focus between windows, and confirm the badge follows the **focused** window (and fallback when that window has no jobs), and that globals/individuals behave as expected across windows — see **Status** above.

Automated Tier 2 tests use Chromium with Playwright (`npm run test:e2e`); validate in **Edge** before publishing to [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/Microsoft-Edge-Extensions-Home) if you rely on browser-specific behavior.
