# CircuitCurios Website Editor

Lokaler visueller Editor für die statische CircuitCurios-Website.

Der alte selbstgebaute Flutter-Editor wurde durch **GrapesJS** in einer kleinen **Electron-Hülle** ersetzt. Die Website selbst bleibt normales HTML/CSS/JS und benötigt GrapesJS oder Electron nicht.

## Funktionen

- visuelles Bearbeiten per GrapesJS
- vorhandene `index.html`, `impressum.html` und `datenschutz.html` laden
- direkte Bearbeitung von `css/style.css`
- Komponenten, Ebenen und Style-Manager
- Desktop-, Tablet- und Mobil-Vorschau
- Undo / Redo
- HTML- und CSS-Direktansicht
- Bilder aus `images/` im Asset Manager
- Bildimport nach `images/uploads/`
- echte Website-Vorschau in einem separaten Fenster
- Speichern mit `Strg+S`
- **Veröffentlichen** speichert, committed ausschließlich die Live-Website-Dateien und pusht `main` zu GitHub Pages
- lokale Sicherung vor jedem Speichern unter `editor/.backups/`

## Entwicklung starten

Voraussetzung: Node.js + npm.

```powershell
cd editor
npm install
npm start
```

Der Editor sucht das Website-Repo automatisch. Alternativ kann der Pfad über die Umgebungsvariable `CIRCUITCURIOS_WEBSITE_ROOT` gesetzt werden.

## Windows-Release bauen

Vom Website-Repo:

```powershell
.\editor\build-editor.ps1
```

Der fertige Windows-Release landet wie bisher unter:

```text
build/apps/website-studio/
```

Die EXE heißt weiterhin:

```text
circuitcurios_website_studio.exe
```

Damit bleiben bestehende Aufrufe der Schwester-App kompatibel.

## Technischer Schutz

Der Renderer hat keinen direkten Node-/Dateisystemzugriff. Lesen, Speichern, Bildimport und Vorschau laufen über eng begrenzte Electron-IPC-Aufrufe. Bearbeitbar sind nur die explizit freigegebenen HTML-Seiten und die globale Website-CSS-Datei.
