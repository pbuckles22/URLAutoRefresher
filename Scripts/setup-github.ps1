# Creates github.com/<your-user>/URLAutoRefresher, sets origin, pushes main.
# Requires: GitHub CLI (gh) — https://cli.github.com/ — and `gh auth login`.
# Run from repo root:  pwsh -File .\scripts\setup-github.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not (Test-Path (Join-Path $root 'manifest.json'))) {
  Write-Error "Run from URLAutoRefresher repo (manifest.json not found in $root)"
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error 'Install GitHub CLI from https://cli.github.com/ then run: gh auth login'
}

$null = gh auth status 2>&1

# Ensure default branch is main (HEAD)
git branch -M main 2>$null

$repoName = 'URLAutoRefresher'

$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Remote 'origin' already set: $existing"
  Write-Host 'Pushing main...'
  git push -u origin main
  exit 0
}

Write-Host "Creating GitHub repo $repoName and pushing..."
gh repo create $repoName `
  --public `
  --source . `
  --remote origin `
  --push `
  --description 'Edge MV3 extension: scheduled tab URL refreshes (global groups + individuals)'

if ($LASTEXITCODE -ne 0) {
  Write-Host @'

If create failed (e.g. repo name taken), create an empty repo on GitHub, then:

  git remote add origin https://github.com/<YOU>/URLAutoRefresher.git
  git push -u origin main

'@
  exit $LASTEXITCODE
}

Write-Host "Done. origin -> $(git remote get-url origin)"
