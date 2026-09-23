param(
  [switch]$NoRun,
  [switch]$Clean
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$editorRoot = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $editorRoot '..')).Path
$windowsProject = Join-Path $editorRoot 'windows\CMakeLists.txt'
$bundlePath = Join-Path $editorRoot 'build\windows\x64\runner\Release'
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
Write-Host '=== CircuitCurios Website Studio ===' -ForegroundColor Cyan
Write-Host "Website-Repo: $repoRoot"

if (-not (Test-Path $windowsProject)) {
  Write-Host '[1/5] Windows-Runner wird lokal erzeugt ...' -ForegroundColor DarkCyan

  $trackedFiles = @(
    'pubspec.yaml',
    'analysis_options.yaml',
    '.gitignore',
    'README.md',
    'lib\main.dart'
  )

  $backups = @{}
  foreach ($relative in $trackedFiles) {
    $path = Join-Path $editorRoot $relative
    if (Test-Path $path) {
      $backups[$relative] = Get-Content -Raw -Encoding UTF8 -LiteralPath $path
    }
  }

  Run-Checked -File 'flutter' -CommandArgs @(
    'create',
    '--platforms=windows',
    '--project-name=circuitcurios_website_studio',
    '--org=de.circuitcurios',
    '.'
  )

  foreach ($entry in $backups.GetEnumerator()) {
    $path = Join-Path $editorRoot $entry.Key
    [System.IO.File]::WriteAllText(
      $path,
      $entry.Value,
      [System.Text.UTF8Encoding]::new($false)
    )
  }

  $templateTest = Join-Path $editorRoot 'test\widget_test.dart'
  if (Test-Path $templateTest) {
    Remove-Item (Split-Path $templateTest -Parent) -Recurse -Force
  }
} else {
  Write-Host '[1/5] Windows-Runner vorhanden.' -ForegroundColor DarkGray
}

if ($Clean) {
  Write-Host '[2/5] flutter clean ...' -ForegroundColor DarkCyan
  Run-Checked -File 'flutter' -CommandArgs @('clean')
} else {
  Write-Host '[2/5] Clean uebersprungen.' -ForegroundColor DarkGray
}

Write-Host '[3/5] Dependencies ...' -ForegroundColor DarkCyan
Run-Checked -File 'flutter' -CommandArgs @('pub', 'get')

Get-Process 'circuitcurios_website_studio' -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host '[4/5] Windows Release Build ...' -ForegroundColor DarkCyan
Run-Checked -File 'flutter' -CommandArgs @('build', 'windows', '--release')

if (-not (Test-Path $buildExe)) {
  throw "Build meldete Erfolg, aber die EXE fehlt: $buildExe"
}

Write-Host '[5/5] Release-Paket wird bereitgestellt ...' -ForegroundColor DarkCyan
if (Test-Path $releasePath) {
  Remove-Item $releasePath -Recurse -Force
}
New-Item -ItemType Directory -Path $releasePath -Force | Out-Null
Copy-Item -Path (Join-Path $bundlePath '*') -Destination $releasePath -Recurse -Force

if (-not (Test-Path $releaseExe)) {
  throw "Release-Paket ist unvollstaendig: $releaseExe"
}

Write-Host ''
Write-Host 'Website Studio erfolgreich gebaut.' -ForegroundColor Green
Write-Host "EXE: $releaseExe" -ForegroundColor Green

if (-not $NoRun) {
  Start-Process -FilePath $releaseExe -WorkingDirectory $releasePath
}
