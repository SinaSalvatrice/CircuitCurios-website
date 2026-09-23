# CircuitCurios Website

Statische Website für **https://circuitcurios.de**.

## Struktur

- `index.html` – Startseite
- `impressum.html` – Impressum
- `datenschutz.html` – Datenschutzerklärung inkl. CircuitCurios Studio / Pinterest API
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
