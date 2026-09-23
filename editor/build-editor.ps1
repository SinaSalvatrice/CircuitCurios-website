param(
  [switch]$NoRun,
  [switch]$Clean
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$editorRoot = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $editorRoot '..')).Path
$distPath = Join-Path $editorRoot 'dist'
$bundlePath = Join-Path $distPath 'win-unpacked'
$buildExe = Join-Path $bundlePath 'circuitcurios_website_studio.exe'
$releasePath = Join-Path $repoRoot 'build\apps\website-studio'
$releaseExe = Join-Path $releasePath 'circuitcurios_website_studio.exe'

function Run-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$File,
    [Parameter(Mandatory = $true)][string[]]$CommandArgs,
    [string]$WorkingDirectory = $editorRoot
  )

  Push-Location $WorkingDirectory
  try {
    & $File @CommandArgs
    if ($LASTEXITCODE -ne 0) {
      throw "$File $($CommandArgs -join ' ') failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

Write-Host ''
Write-Host '=== CircuitCurios Website Editor / GrapesJS ===' -ForegroundColor Cyan
Write-Host "Website-Repo: $repoRoot"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js wurde nicht gefunden. Installiere Node.js LTS und starte den Build erneut.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'npm wurde nicht gefunden. Installiere Node.js inklusive npm.'
}

if ($Clean) {
  Write-Host '[1/4] Alte Editor-Builds entfernen ...' -ForegroundColor DarkCyan
  if (Test-Path $distPath) {
    Remove-Item $distPath -Recurse -Force
  }
} else {
  Write-Host '[1/4] Clean uebersprungen.' -ForegroundColor DarkGray
}

Write-Host '[2/4] GrapesJS / Electron Dependencies ...' -ForegroundColor DarkCyan
Run-Checked -File 'npm' -CommandArgs @('install', '--no-audit', '--no-fund')

Get-Process 'circuitcurios_website_studio' -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host '[3/4] Windows Editor bauen ...' -ForegroundColor DarkCyan
Run-Checked -File 'npm' -CommandArgs @('run', 'build:win')

if (-not (Test-Path $buildExe)) {
  throw "Build meldete Erfolg, aber die EXE fehlt: $buildExe"
}

Write-Host '[4/4] Release-Paket bereitstellen ...' -ForegroundColor DarkCyan
if (Test-Path $releasePath) {
  Remove-Item $releasePath -Recurse -Force
}
New-Item -ItemType Directory -Path $releasePath -Force | Out-Null
Copy-Item -Path (Join-Path $bundlePath '*') -Destination $releasePath -Recurse -Force

if (-not (Test-Path $releaseExe)) {
  throw "Release-Paket ist unvollstaendig: $releaseExe"
}

Write-Host ''
Write-Host 'Website Editor erfolgreich gebaut.' -ForegroundColor Green
Write-Host "EXE: $releaseExe" -ForegroundColor Green

if (-not $NoRun) {
  Start-Process -FilePath $releaseExe -WorkingDirectory $releasePath
}
