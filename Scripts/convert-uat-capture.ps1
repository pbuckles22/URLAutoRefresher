# Convert a screen-recording MP4 into formats Cursor can review.
# Usage: .\Scripts\convert-uat-capture.ps1 -InputPath "path\to\capture.mp4"
param(
  [Parameter(Mandatory = $true)]
  [string] $InputPath
)

$ErrorActionPreference = 'Stop'
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Error 'ffmpeg not found. Install: winget install Gyan.FFmpeg'
}

$stamp = (Get-Date -Format 'yyyyMMdd_HHmmss')
$outDir = Join-Path $PSScriptRoot "..\doc\uat\captures\$stamp" | Resolve-Path -ErrorAction SilentlyContinue
if (-not $outDir) {
  $outDir = (New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot "..\doc\uat\captures\$stamp")).FullName
}

Write-Host "Output: $outDir"

# PNG stills every 5s (best for overlay / URL inspection)
ffmpeg -y -i $InputPath -vf "fps=1/5,scale=1280:-1:flags=lanczos" (Join-Path $outDir "frame_%02d.png")

# Animated GIF ~3 fps, 960px wide (viewable in chat; may be large for long clips)
ffmpeg -y -i $InputPath -filter_complex "[0:v] fps=3,scale=960:-1:flags=lanczos,split [a][b]; [a] palettegen=stats_mode=full [p]; [b][p] paletteuse=dither=sierra2_4a" -loop 0 (Join-Path $outDir "preview.gif")

Get-ChildItem $outDir | Select-Object Name, @{ N = 'MB'; E = { [math]::Round($_.Length / 1MB, 2) } }
