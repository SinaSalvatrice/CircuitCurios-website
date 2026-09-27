$ErrorActionPreference = 'Stop'
$runtime = Join-Path $PSScriptRoot '.silex-runtime'

if (-not (Test-Path $runtime)) {
  throw 'Silex is not installed. Run editor\install-silex.ps1 first.'
}

Push-Location $runtime
try {
  Write-Host 'Starting Silex on http://localhost:6805'
  pnpm start
}
finally {
  Pop-Location
}
