# Handoff — move repo to local disk (2026-04-14)

Use this note **after** you move the folder and **reopen** the project in Cursor. It replaces scattered UNC-path instructions for day-to-day work.

## Why move

The repo was on a **UNC path** (`\\chaosnas.local\...`). **npm** (and packages like **esbuild**) often fail on UNC because Windows `cmd` cannot use a UNC path as the current directory (`UNC paths are not supported`). A **local folder** under `C:\Users\pbuck\Dev` avoids that.

## Target location

**`C:\Users\pbuck\Dev\URLAutoRefresher`**

(Create `Dev` if it does not exist.)

---

## 1. Before you move

1. **Save / commit** anything you care about (this handoff file is safe to commit).
2. **Close Cursor** (or at least close the workspace that points at the UNC folder) so files are not locked.
3. Close any **terminal** whose current directory is inside the old path.

---

## 2. Move the folder (PowerShell)

Run **on your PC** (adjust source if your UNC path differs):

```powershell
New-Item -ItemType Directory -Force -Path "C:\Users\pbuck\Dev" | Out-Null

Move-Item -LiteralPath "\\chaosnas.local\buckles\My.Documents\Development\URLAutoRefresher" `
  -Destination "C:\Users\pbuck\Dev\URLAutoRefresher"
```

If `Move-Item` says the destination exists, rename or remove `C:\Users\pbuck\Dev\URLAutoRefresher` first, or merge manually.

**Optional:** If the move is huge or flaky, **clone from GitHub** into `C:\Users\pbuck\Dev\URLAutoRefresher` instead, then delete the old UNC copy once you are happy.

---

## 3. Reopen in Cursor

1. **File → Open Folder…**
2. Choose **`C:\Users\pbuck\Dev\URLAutoRefresher`**
3. Confirm the title bar / explorer root shows the **local** path, not `\\chaosnas...`.

---

## 4. After reopen — one-time setup

### Git `safe.directory` (if Git complains about ownership)

Use the **new** path (forward slashes are fine):

```powershell
git config --global --add safe.directory "C:/Users/pbuck/Dev/URLAutoRefresher"
```

Remove old `safe.directory` entries for the UNC path if you added them earlier (optional, avoids clutter).

### Node / npm (fresh install on local path)

```powershell
Set-Location "C:\Users\pbuck\Dev\URLAutoRefresher"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
npm test
npm run build
```

If `node_modules` on the NAS copy was half-broken, deleting it before `npm install` on the local copy is recommended.

### Edge — Load unpacked

**edge://extensions** → **Load unpacked** → folder **`C:\Users\pbuck\Dev\URLAutoRefresher`** (the one that contains `manifest.json`).

---

## 5. Where to look next (project state)

| Doc | Purpose |
|-----|---------|
| [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) | Agent context, run/test commands, current epic |
| [EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) | Epics, checkboxes, product spec |
| [PM_PLAN.md](../../PM_PLAN.md) | Short phase summary |

**Progress at handoff time:** Epics **0–2** are implemented (shell, storage/validation, alarms + `tabs.update` + tab lifecycle). **Next:** **Epic 3** — dashboard UI to add/edit/start/stop **individual** jobs (no more relying on devtools for state).

**Key code:** `src/background/scheduler.ts` (alarms), `src/lib/storage.ts`, `src/lib/state.ts`, `manifest.json`, `dashboard/`.

---

## Open questions / blockers

- None specific to the move. If `npm install` still fails, confirm you are in **`C:\Users\pbuck\Dev\URLAutoRefresher`** and not a UNC path.

---

## Done when

- [ ] Folder exists at `C:\Users\pbuck\Dev\URLAutoRefresher`
- [ ] Cursor opened on that folder
- [ ] `npm test` and `npm run build` succeed
- [ ] Extension loads unpacked from the local path

Then continue from **Epic 3** in the plan.
