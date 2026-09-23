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
$exeName = 'circuitcurios_grapes_editor.exe'
$buildExe = Join-Path $bundlePath $exeName
$releasePath = Join-Path $repoRoot 'build\apps\website-studio'
$releaseExe = Join-Path $releasePath $exeName

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
Write-Host '=== CircuitCurios GrapesJS Website Editor ===' -ForegroundColor Cyan
Write-Host "Website-Repo: $repoRoot"
Write-Host "Editor-EXE:   $exeName"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js wurde nicht gefunden. Installiere Node.js LTS und starte den Build erneut.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'npm wurde nicht gefunden. Installiere Node.js inklusive npm.'
}

Get-Process 'circuitcurios_grapes_editor','circuitcurios_website_studio' -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host '[1/4] Alte Editor-Builds entfernen ...' -ForegroundColor DarkCyan
if (Test-Path $distPath) {
  Remove-Item $distPath -Recurse -Force
}
if (Test-Path $releasePath) {
  Remove-Item $releasePath -Recurse -Force
}

Write-Host '[2/4] GrapesJS / Electron Dependencies ...' -ForegroundColor DarkCyan
Run-Checked -File 'npm' -CommandArgs @('install', '--no-audit', '--no-fund')

Write-Host '[3/4] Windows Editor bauen ...' -ForegroundColor DarkCyan
Run-Checked -File 'npm' -CommandArgs @('run', 'build:win')

if (-not (Test-Path $buildExe)) {
  throw "Build meldete Erfolg, aber die GrapesJS-EXE fehlt: $buildExe"
}

Write-Host '[4/4] Release-Paket bereitstellen ...' -ForegroundColor DarkCyan
New-Item -ItemType Directory -Path $releasePath -Force | Out-Null
Copy-Item -Path (Join-Path $bundlePath '*') -Destination $releasePath -Recurse -Force
Set-Content -LiteralPath (Join-Path $releasePath 'GRAPESJS_EDITOR.txt') -Encoding UTF8 -Value @(
  'CircuitCurios GrapesJS Editor'
  'engine=GrapesJS 0.23.6'
  "exe=$exeName"
)

if (-not (Test-Path $releaseExe)) {
  throw "Release-Paket ist unvollstaendig: $releaseExe"
}

Write-Host ''
Write-Host 'GrapesJS Website Editor erfolgreich gebaut.' -ForegroundColor Green
Write-Host "EXE: $releaseExe" -ForegroundColor Green

if (-not $NoRun) {
  Start-Process -FilePath $releaseExe -WorkingDirectory $releasePath
}
