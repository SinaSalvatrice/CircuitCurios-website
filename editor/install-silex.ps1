param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$runtime = Join-Path $PSScriptRoot '.silex-runtime'
$ready = Join-Path $runtime '.cc-silex-ready'
$repo = 'https://github.com/silexlabs/Silex.git'

if ($Force -and (Test-Path $runtime)) {
  Remove-Item -Recurse -Force $runtime
}

if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
  throw 'Corepack wurde nicht gefunden. Installiere eine aktuelle Node.js-Version mit Corepack.'
}

if (-not (Test-Path $runtime)) {
  Write-Host 'Cloning Silex...'
  git clone --recurse-submodules $repo $runtime
} else {
  Write-Host 'Updating Silex...'
  git -C $runtime fetch origin main
  git -C $runtime checkout main
  git -C $runtime pull --ff-only origin main
  git -C $runtime submodule update --init --recursive
}

if (Test-Path $ready) {
  Remove-Item -Force $ready
}

Push-Location $runtime
try {
  corepack pnpm install
  corepack pnpm build
  New-Item -ItemType File -Path $ready -Force | Out-Null
}
finally {
  Pop-Location
}

Write-Host ''
Write-Host 'Silex is installed.'
Write-Host 'Start it with: editor\start-silex.ps1'
