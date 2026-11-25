# PersonalCalendar – Jahreskalender

Ein Jahreskalender als Webseite im Poster-Stil: 12 Monatsspalten nebeneinander,
die Tage laufen vertikal. Zeiträume (Ferien, Tochter-Wochenenden, Urlaub …)
werden als farbige Streifen über den Tageszeilen markiert.

## Stand

- [x] **Mockup** (`mockup.html`) – statisches HTML zum Ansehen und Ausprobieren
      (alle Dialoge, Beispieldaten, localStorage)
- [ ] React + Vite App (geplant)
- [ ] JSON-Datenquelle (`public/data/calendar.json`)
- [ ] GitHub Pages Deploy

## Mockup ansehen

Datei `mockup.html` direkt im Browser öffnen (kein Server nötig) oder über
GitHub Pages: https://timebandit76.github.io/PersonalCalendar/

### Was das Mockup kann

- Reiter **2026 | 2027** (aktuelles + kommendes Jahr)
- 12 Monatsspalten, Mo–So-Kürzel, Wochenenden hinterlegt, „heute" markiert
- Farbige Streifen links in den Tageszeilen; Überlappungen liegen nebeneinander
- **Eintrag-Dialog:** Name, Datum von, Datum bis, TerminTyp (Dropdown)
- **Typen-Verwaltung:** Typen mit eigener Farbe (Palette + Hex), Farbe wirkt
  sofort auf alle Balken
- Änderungen überleben im Browser (localStorage), Export als JSON möglich

## Datenformat (geplant für `calendar.json`)

```json
{
  "types": [
    { "id": "ferien",  "name": "Ferien",  "color": "#e74c3c" },
    { "id": "tochter", "name": "Tochter", "color": "#2ecc71" }
  ],
  "entries": [
    {
      "id": "e1",
      "name": "Sommerferien",
      "typeId": "ferien",
      "startDate": "2026-07-27",
      "endDate": "2026-08-07"
    }
  ]
}
```

## Deployment

GitHub Pages von Branch `main`:
https://timebandit76.github.io/PersonalCalendar/
