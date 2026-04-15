# Move the repo from a UNC path to a local disk (Windows)

Use this guide **after** you copy or move the folder and **reopen** the project in your editor. It helps when the repo lived on a **network (UNC)** path and **npm** / tooling failed with *UNC paths are not supported*.

Substitute **your** UNC source and **your** local destination everywhere below.

## Why move

**npm** and some native tooling (e.g. **esbuild** install scripts) invoke Windows **`cmd.exe`**, which often cannot use a **UNC** path (`\\server\share\...`) as the current directory. A folder on a **local drive** (e.g. `C:\...`) avoids that class of failure.

## Pick a local target

Example layout (change to match your machine):

- **Local folder:** `C:\Dev\URLAutoRefresher` (must contain `manifest.json` at the repo root)
- **UNC source (example only):** `\\YOUR-FILE-SERVER\share\path\URLAutoRefresher`

---

## 1. Before you move

1. **Save / commit** anything you care about.
2. **Close** the editor workspace that points at the UNC folder so files are not locked.
3. Close any **terminal** whose current directory is inside the old path.

---

## 2. Move or clone (PowerShell)

**Option A — Move** (adjust `-LiteralPath` and `-Destination`):

```powershell
New-Item -ItemType Directory -Force -Path "C:\Dev" | Out-Null

Move-Item -LiteralPath "\\YOUR-FILE-SERVER\share\path\URLAutoRefresher" `
  -Destination "C:\Dev\URLAutoRefresher"
```

If the destination already exists, rename or remove it first, or merge manually.

**Option B — Clone** (if the move is large or unreliable):

```powershell
git clone https://github.com/YOUR_ORG/URLAutoRefresher.git "C:\Dev\URLAutoRefresher"
```

Then retire the UNC copy when you are satisfied.

---

## 3. Reopen in your editor

1. **File → Open Folder…**
2. Choose **`C:\Dev\URLAutoRefresher`** (your local path).
3. Confirm the window shows the **local** path, not `\\server\...`.

---

## 4. After reopen — one-time setup

### Git `safe.directory` (if Git complains about ownership)

Use your **local** path (forward slashes are fine):

```powershell
git config --global --add safe.directory "C:/Dev/URLAutoRefresher"
```

Remove obsolete `safe.directory` entries for the old UNC path if you like.

### Node / npm

```powershell
Set-Location "C:\Dev\URLAutoRefresher"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
npm test
npm run build
```

### Edge — load unpacked

**edge://extensions** → **Load unpacked** → select the folder that contains **`manifest.json`** (your local clone).

---

## 5. Where to look next

This file is **only** about relocating the repo. **Roadmap** lives elsewhere:

| Doc | Purpose |
|-----|---------|
| [EDGE_URL_AUTO_REFRESHER_PLAN.md](../plan/EDGE_URL_AUTO_REFRESHER_PLAN.md) | Epics, checkboxes, product spec |
| [PM_PLAN.md](../../PM_PLAN.md) | Short phase summary |
| [AGENT_HANDOFF.md](../../AGENT_HANDOFF.md) | Agent process, run/test commands |

---

## Open questions / blockers

- If `npm install` still fails, confirm the shell’s current directory is **local**, not UNC.

---

## Done when (move only)

- [ ] Repo root exists at your chosen **local** path
- [ ] Editor opened on that folder
- [ ] `npm test` and `npm run build` succeed
- [ ] Extension loads unpacked from the local path

Then follow the **EDGE plan** and **PM_PLAN** for product work — not this note.
