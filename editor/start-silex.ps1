$ErrorActionPreference = 'Stop'
$runtime = Join-Path $PSScriptRoot '.silex-runtime'
$ready = Join-Path $runtime '.cc-silex-ready'

if (-not (Test-Path $runtime) -or -not (Test-Path $ready)) {
  throw 'Silex is not fully installed. Run editor\install-silex.ps1 first.'
}

if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
  throw 'Corepack wurde nicht gefunden. Installiere eine aktuelle Node.js-Version mit Corepack.'
}

Push-Location $runtime
try {
  Write-Host 'Starting Silex on http://localhost:6805'
  corepack pnpm start
}
finally {
  Pop-Location
}
