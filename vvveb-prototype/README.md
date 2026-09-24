# CircuitCurios – VvvebJs Prototyp

Dieser Ordner ist **nur ein Vergleichstest** zum vorhandenen GrapesJS-Editor.

Er verändert weder den normalen Website-Build noch den GrapesJS-Editor.

## Start

Vom Website-Repo:

```powershell
.\vvveb-prototype\start-vvveb.ps1
```

Beim ersten Start wird das Open-Source-Projekt **VvvebJs** (Apache-2.0) flach nach
`vvveb-prototype/.vendor/VvvebJs` geklont. Der Vendor-Ordner wird nicht committed.

Danach öffnet sich:

```text
http://127.0.0.1:8877/editor.html
```

## Was der Test direkt bearbeitet

- `index.html`
- `impressum.html`
- `datenschutz.html`

Die echte Website-CSS, Bilder und JavaScript-Dateien werden im Editor geladen.
Die drei HTML-Seiten werden beim Start nach `vvveb-prototype/.work/` kopiert.

**Speichern verändert im Prototyp ausschließlich diese Arbeitskopien.**
Die echte Website bleibt unverändert. Beim nächsten Start werden die Arbeitskopien
wieder vom aktuellen Website-Stand erzeugt.

## Ziel des Tests

Nicht sofort einen zweiten fertigen Editor bauen. Erst prüfen:

- Ist Elementauswahl verständlicher?
- Ist Textbearbeitung natürlicher?
- Sind Eltern-/Breadcrumb-Navigation und Eigenschaften übersichtlicher?
- Lassen sich Abschnitte und Komponenten angenehmer verschieben?
- Ist der Editor insgesamt weniger technisch als GrapesJS?

Wenn VvvebJs überzeugt, wird erst danach GrapesJS ersetzt und der Vvveb-Editor
sauber in den normalen CircuitCurios-Build integriert.
