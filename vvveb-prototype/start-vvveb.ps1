param(
  [switch]$UpdateVendor
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = $PSScriptRoot
$vendor = Join-Path $root '.vendor\VvvebJs'
$server = Join-Path $root 'server.mjs'

Write-Host ''
Write-Host '=== CircuitCurios VvvebJs Prototyp ===' -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js wurde nicht gefunden.'
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Git wurde nicht gefunden.'
}

if (-not (Test-Path (Join-Path $vendor 'editor.html'))) {
  Write-Host '[1/2] Lade VvvebJs (einmalig) ...' -ForegroundColor DarkCyan
  New-Item -ItemType Directory -Path (Split-Path $vendor -Parent) -Force | Out-Null
  git clone --depth 1 https://github.com/givanz/VvvebJs.git $vendor
  if ($LASTEXITCODE -ne 0) {
    throw 'VvvebJs konnte nicht geklont werden.'
  }
} elseif ($UpdateVendor) {
  Write-Host '[1/2] Aktualisiere VvvebJs ...' -ForegroundColor DarkCyan
  git -C $vendor pull --ff-only
  if ($LASTEXITCODE -ne 0) {
    throw 'VvvebJs konnte nicht aktualisiert werden.'
  }
} else {
  Write-Host '[1/2] VvvebJs vorhanden.' -ForegroundColor DarkGray
}

Write-Host '[2/2] Starte lokalen Editor ...' -ForegroundColor DarkCyan

Write-Host ''
Write-Host 'Browser wird automatisch geöffnet. Dieses Fenster offen lassen.' -ForegroundColor Green
Write-Host 'Strg+C beendet den Prototyp.' -ForegroundColor DarkGray
Write-Host ''

& node $server
