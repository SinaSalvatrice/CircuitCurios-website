param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$runtime = Join-Path $PSScriptRoot '.silex-runtime'
$repo = 'https://github.com/silexlabs/Silex.git'

if ($Force -and (Test-Path $runtime)) {
  Remove-Item -Recurse -Force $runtime
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

Push-Location $runtime
try {
  if (Get-Command corepack -ErrorAction SilentlyContinue) {
    corepack enable
  }
  pnpm install
  pnpm build
}
finally {
  Pop-Location
}

Write-Host ''
Write-Host 'Silex is installed.'
Write-Host 'Start it with: editor\start-silex.ps1'
