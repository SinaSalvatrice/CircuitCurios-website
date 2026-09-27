$ErrorActionPreference = "Stop"

$editorDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $editorDir "hugo"
$destination = Join-Path $editorDir "generated"

if (-not (Get-Command hugo -ErrorAction SilentlyContinue)) {
    Write-Error "Hugo wurde nicht gefunden. Installiere Hugo Extended und stelle sicher, dass 'hugo' im PATH liegt."
}

Write-Host "CircuitCurios Webeditor: Hugo Content Engine bauen..."
hugo --source $source --destination $destination --cleanDestinationDir --minify
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Fertig: $destination"
Write-Host "Die Live-Website im Repo-Root wurde NICHT veraendert."
