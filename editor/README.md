# CircuitCurios Webeditor: GrapesJS

Der Website-Editor bearbeitet die vorhandene CircuitCurios-Website direkt.
Es gibt kein zweites Projektformat und keinen Export-Schritt.

## Architektur

- Die öffentliche Website bleibt im Repository-Root:
  - `index.html`
  - `prozess.html`
  - `ueber.html`
  - `shop.html`
  - Impressum / Datenschutz
- GrapesJS läuft nur als visuelle Bearbeitungsoberfläche.
- Das Studio startet einen lokalen HTTP-Server für Vorschau, Assets und Speichern.
- Beim Speichern wird der vorhandene `<body>` aktualisiert.
- Vorhandene Skripte im Body bleiben erhalten.
- Änderungen aus dem Style-Panel werden in `css/editor-overrides.css` geschrieben.
- Vor dem Überschreiben legt das Studio Backups im Application-Support-Verzeichnis an.

## Editor-Funktionen

- Drag & Drop
- Blocks für Abschnitte, Container, Spalten, Text, Überschriften, Bilder, Links und Trenner
- Layer-/Ebenenansicht
- Asset-Bibliothek
- Bildauswahl vom Rechner
- direkte Textbearbeitung
- Style-Manager mit Layout, Flex/Grid, Spacing, Typografie, Rahmen, Position und Effekten
- Traits / HTML-Attribute
- Responsive Desktop / Tablet / Mobil
- Undo / Redo
- Duplizieren / Löschen
- HTML-/CSS-Codeansicht und Bearbeitung
- Vorschau-Modus
- Speichern mit Strg+S

## Abhängigkeit

Die GrapesJS-Runtime wird derzeit im Editor über jsDelivr geladen und benötigt daher beim Start Internetzugang.
Die eigentliche Website und alle gespeicherten Änderungen bleiben vollständig lokal im Repository.
