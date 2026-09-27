$ErrorActionPreference = "Stop"

$editorDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $editorDir "hugo"

if (-not (Get-Command hugo -ErrorAction SilentlyContinue)) {
    Write-Error "Hugo wurde nicht gefunden. Installiere Hugo Extended und stelle sicher, dass 'hugo' im PATH liegt."
}

Write-Host "Starte ausschliesslich den CircuitCurios Webeditor..."
Write-Host "Editor: http://127.0.0.1:1313/"
Write-Host "JSON:   http://127.0.0.1:1313/index.json"
hugo server --source $source --bind 127.0.0.1 --port 1313 --disableFastRender
