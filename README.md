# CircuitCurios Website

Statische Website für **https://circuitcurios.de**.

## Struktur

- `index.html` – Startseite
- `impressum.html` – Impressum
- `datenschutz.html` – Datenschutzerklärung inkl. Pinterest API
- `privacy.html` – Kompatibilitäts-Weiterleitung auf `datenschutz.html`
- `css/style.css` – globales Styling
- `js/main.js` – Navigation, Header, Reveal-Effekte, Jahreszahl
- `images/logo.svg` – neutrale Web-Fallback-Wortmarke
- `images/products/` – Produktbilder
- `favicon.svg`
- `CNAME` – Custom Domain für GitHub Pages

## Vor Live-Nutzung prüfen

In `impressum.html` und `datenschutz.html` sind bewusst **keine persönlichen Anbieterangaben erfunden** worden.  
Alle gelb markierten Platzhalter müssen durch die tatsächlichen Pflichtangaben ersetzt werden.

## Technik

Keine Build-Pipeline, keine externen JS-Abhängigkeiten und keine extern geladenen Webfonts.  
Die Seite läuft direkt auf GitHub Pages.


## Freelancer-Startseite bearbeiten

Die Startseite verwendet das [Freelancer-Template](https://github.com/jeromelachaud/freelancer-theme)
als statische HTML-Version. Sie braucht weder Jekyll noch einen Build-Schritt.

- `index.html`: Texte, Bilder, Links und Abschnitte direkt bearbeiten. Im visuellen HTML-Editor die **ganze Seite** inklusive der verknüpften Stylesheets öffnen/importieren.
- `css/freelancer-custom.css`: eigene Anpassungen an Abständen, Bildern, Farben und Detailfenstern.
- `css/vendor/`: lokale Original-Styles des Templates; beim Kopieren/Veröffentlichen mitnehmen.
- Die vorhandenen Unterseiten verwenden weiterhin `css/style.css`.
- Oberflächenkacheln lassen sich im HTML duplizieren. Name und Bild stehen in `figcaption strong` und `img`; die Detailtexte in den `data-texture-*`-Attributen der jeweiligen Kachel.
- `?cceditor` an der Vorschau-URL unterdrückt das Öffnen der Detailfenster während der Bearbeitung.

Die Seite enthält echte HTML-Elemente, keine eingebettete Vorschau und kein gerendertes Bild.
Im aktuellen Repository ist **kein ausführbarer visueller Editor** enthalten. Diese Änderung
installiert keinen neuen Editor; sie liefert die bearbeitbare Website für einen HTML-Editor.
Das Speichern und erneute Laden in der lokalen Editor-App muss dort geprüft werden.

Lokale Vorschau: im Repository `python -m http.server 8080` starten und
`http://localhost:8080` öffnen. Für GitHub Pages oder Netcup die Website-Dateien samt
`css`, `js` und `images` bereitstellen. Herkunft und Lizenztexte: `licenses/freelancer/`.
