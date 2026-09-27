# Hugo im CircuitCurios-Webeditor

Hugo gehört **nur zum Webeditor**. Die veröffentlichte Website im Repository-Root bleibt eine statische HTML-Seite mit dem vorhandenen Freelancer/CircuitCurios-Template.

## Verzeichnisgrenze

- `editor/hugo/` – Hugo-Quelle des Webeditors
- `editor/generated/` – lokales, generiertes Editor-Ergebnis; wird nicht committed
- `index.html`, `css/`, `js/`, `images/` – bestehende Live-Website; Hugo baut diese Dateien nicht um

## Starten

Voraussetzung: Hugo Extended im PATH.

```powershell
./editor/serve-hugo.ps1
```

Editor-Dashboard: `http://127.0.0.1:1313/`

Maschinenlesbare Daten: `http://127.0.0.1:1313/index.json`

Ein einmaliger Build:

```powershell
./editor/build-hugo.ps1
```

## Content-Modell

Eine Oberfläche ist eine Markdown-Datei unter `editor/hugo/content/textures/`.

Beispiel:

```yaml
---
title: "Tektonik"
group: "Geologie"
family: "Deformation"
pattern: "Bruchlinien"
principle: "Geformt durch gerichtete Verformung und Bruch."
description: "..."
image: "/images/web/tektonik.webp"
sourcePage: "/index.html"
---
```

Die Taxonomien `group`, `family` und `pattern` sind in Hugo registriert. Das JSON-Outputformat ist die Schnittstelle für die visuelle Editor-Oberfläche bzw. die Studio-App.

## Wichtig

Hugo ist hier **Content-Engine und Preview-Builder**, nicht das Produktions-Theme. Änderungen in `editor/hugo/` ersetzen das Freelancer-Template nicht und ändern die Live-Seite nicht automatisch.
