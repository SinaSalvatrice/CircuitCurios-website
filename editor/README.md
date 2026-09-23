# CircuitCurios Website Studio

Eigenständige Flutter-Desktop-App zum Bearbeiten der statischen Website im selben Repository.

## Prinzip

Die Website bleibt normales HTML/CSS/JS. Der Editor erzeugt kein proprietäres Projektformat und schreibt direkt in die vorhandenen Dateien.

Aktueller Funktionsumfang:

- automatische Erkennung des `CircuitCurios-website`-Roots
- Dateibaum für HTML/CSS/JS/SVG/JSON/Markdown
- eingebettete Windows-Live-Vorschau über WebView2
- Desktop-/Tablet-/Mobile-Vorschau
- visuelle Schnellbearbeitung für Hero-Inhalte
- visuelle Bearbeitung zentraler CSS-Variablen
- vollständiger Code-Editor für die ausgewählte Datei
- Speichern mit `Strg+S`
- Preview-Reload nach Änderungen

## Windows bauen

Vom Website-Repo:

```powershell
.\editor\build-editor.ps1
```

Der Build wird als vollständiges Windows-Bundle hier abgelegt:

```text
build/apps/website-studio/
```

Beim ersten Build erzeugt das Script den Flutter-Windows-Runner lokal. Die generierten Runner-/Builddateien werden nicht ins Repository committed.

Microsoft WebView2 Runtime wird für die eingebettete Vorschau benötigt.
