# URL Auto Refresher (Edge extension)

Chromium Manifest V3 extension for Edge: scheduled refreshes to a **configured target URL** per tab (e.g. original Twitch channel after a raid), with optional **global synchronized groups**, **individual** timers, interval **jitter**, and a **focus-aware** toolbar badge.

**Project folder (canonical):** `Development\URLAutoRefresher` (correct spelling).

**Agentic workflow:** This repo includes the [AgenticTemplate](https://github.com/pbuckles22/AgenticTemplate) layer — Cursor **rules**, **skills**, **handoff** protocol, and **test discipline** ([AGENT_HANDOFF.md](AGENT_HANDOFF.md), [PM_PLAN.md](PM_PLAN.md), [TEST_PLAN.md](TEST_PLAN.md), `.cursor/`).

## Documentation

- [Project plan and epics](Docs/EDGE_URL_AUTO_REFRESHER_PLAN.md)
- [Agent handoff & source of truth](AGENT_HANDOFF.md)
- [Handoff: move repo to local disk (UNC → `C:\Users\pbuck\Dev`)](Docs/HANDOFF_MOVE_TO_LOCAL.md)

## What’s included (agentic)

| Area | Contents |
|------|----------|
| **.cursor/rules** | `always.mdc`, `handoff-checklist.mdc`, `testing.mdc` |
| **.cursor/skills** | DEV_GUIDE, TEST_TDD, DESIGN_SYSTEM, techwriter, tester, code-reviewer, tech-debt-evaluator, pm-governance, ui-ux, game-readiness, visual-match |
| **.cursor/handoff** | Handoff note template and README |
| **doc/** | Placeholder for requirements |
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
3. **`npm run build`** — produces `dist/background.js`, `dashboard/dashboard.js`, and placeholder `icons/*.png`.
4. Edge → **Extensions** → **Developer mode** → **Load unpacked** → select this folder (the one containing `manifest.json`).

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
- **Handoff notes** — `.cursor/handoff/handoff-*.md` are gitignored so local handoff notes are not pushed. The template `_template.md` and `README.md` there are committed.

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

Epics **0** (shell) and **1** (storage + validation) are in progress; alarms and UI flows follow [Docs/EDGE_URL_AUTO_REFRESHER_PLAN.md](Docs/EDGE_URL_AUTO_REFRESHER_PLAN.md). The toolbar badge uses one shared `chrome.action` state across windows (see plan — focus-aware countdown).
