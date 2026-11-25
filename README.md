# PersonalCalendar – SOS-Kalender (Jahreskalender)

Ein Jahreskalender als Webseite im Poster-Stil: 12 Monatsspalten nebeneinander,
die Tage laufen vertikal. Zeiträume (Ferien, Tochter-Wochenenden, Urlaub …)
werden als farbige Streifen über den Tageszeilen markiert.

**Live:** https://timebandit76.github.io/PersonalCalendar/

## Funktionen

- **Passwort-Schutz:** Sperrbildschirm; die Daten liegen **AES-256-verschlüsselt**
  im Repo (`calendar.enc`), Schlüssel aus dem Passwort via PBKDF2 abgeleitet.
  „Bleiben angemeldet" merkt sich den Schlüssel im Browser.
- **Jahresfenster:** immer **Vorjahr + aktuelles Jahr + 3 Zukunftsjahre**
  (2026 → 2025–2029); beim Jahreswechsel rollt das Fenster automatisch mit.
- **10-Jahres-Aufbewahrung:** Einträge, die vor mehr als 10 Jahren enden,
  werden beim Laden automatisch bereinigt.
- **Sprache DE/PL:** Start anhand der Browsersprache, Umschalter in der Kopfzeile
  (Monate, Wochentage, alle Texte, Typ-Namen beidspurig).
- **Einträge:** Name, Datum von/bis, TerminTyp (Dropdown); Typen mit eigener
  Farbe (Palette + Hex), Farbe wirkt sofort auf alle Balken.
- **Handy:** 2 Monate nebeneinander, horizontal swipen (1 Wisch = 1 Paar),
  Start auf dem aktuellen Monat, `+`-Floating-Button, sticky Legende.
- **Druck:** A3 quer (6×2-Raster), Steuerelemente ausgeblendet.
- **Daten:** `public/data/calendar.enc` (Quelle) + localStorage-Overlay für
  Änderungen; Export als JSON / „Änderungen verwerfen" im JSON-Dialog.

## Entwicklung

```bash
npm install
npm run dev          # lokaler Dev-Server
npm run build        # Typcheck + Produktions-Build nach dist/
```

## Branch-Modell & Deployment

| Branch | Inhalt | Auslieferung |
|---|---|---|
| `main` | Code Produktion | https://timebandit76.github.io/PersonalCalendar/ |
| `develop` | Code Test | https://timebandit76.github.io/PersonalCalendar/test/ |
| `data` | `calendar.enc` + `DATA_CHANGELOG.md` (Produktionsdaten) | Quelle für die Produktion |
| `data-test` | `calendar.enc` + `DATA_CHANGELOG.md` (Testdaten) | Quelle für die Test-Site |

- **Workflow** (`.github/workflows/deploy.yml`): baut bei jedem Push main und
  develop (so vorhanden), setzt die passende `.enc` aus `data`/`data-test` ein
  und deployt Produktion unter `/` sowie Test unter `/test/` in **einem** Deployment
- **Datenwächter:** Änderungen an `calendar.enc` erfordern einen Eintrag in
  `DATA_CHANGELOG.md` oder einen `sync:`-Commit – sonst scheitert das Deploy
  und die Produktionsdaten bleiben geschützt. Details: `MIGRATION.md`
- **localStorage:** Das Test-Deployment nutzt eigene Keys (`-test`), die
  Produktion behält ihre bisherigen Keys (kein erneutes Anmelden)
- Test-Workflow-Änderungen: `deploy.yml` muss auf allen vier Branches synchron
  gehalten werden (Beim Mergen main↔develop automatisch; Daten-Branches bei
  Bedarf mitkopieren)

### Daten ändern (neu verschlüsseln)

Die Quelldatei `public/data/calendar.json` existiert nur zum Verschlüsseln
(ist nicht im Repository):

```bash
# 1. JSON anlegen/bearbeiten (public/data/calendar.json)
# 2. Verschlüsseln (Passwort NIE in Dateien schreiben):
DATA_PASSWORD=… npm run data:encrypt
# 3. Klartext wieder entfernen:
rm public/data/calendar.json
# 4. Auf den passenden Daten-Branch committen (data bzw. data-test)
#    + DATA_CHANGELOG.md-Eintrag (Pflicht, s. MIGRATION.md)
```

Schema-Änderungen an den Daten: `DATA_PASSWORD=… npm run data:migrate` –
Ablauf in `MIGRATION.md`.

Das Passwort selbst steht nirgends im Code – nur die Verschlüsselung leitet
sich daraus ab. Ein Passwortwechsel = neue `calendar.enc` erzeugen; angemeldete
Geräte mit altem Schlüssel werden automatisch abgemeldet.

## Projektstruktur

```
index.html, vite.config.ts (DEPLOY_BASE für Prod/Test), tsconfig.json
scripts/
  encrypt-data.mjs          # calendar.json → calendar.enc (frisches Anlegen)
  migrate-data.mjs          # Schema-Migrationen anwenden (MIGRATION.md)
  migrations/               # NN-Migrationen (von → to)
MIGRATION.md                # Verfahren Datenänderung/Migration
public/mockup.html          # statisches Original-Mockup (Referenz)
src/
  App.tsx                   # Gate (Auth) + Kalender + Dialog-State
  auth/                     # Login, WebCrypto, AuthContext
  components/               # Header, MonthGrid, Legende, Dialoge
  hooks/useEntries.ts       # Laden, Entschlüsseln, Overlay, Bereinigung
  i18n/                     # DE/PL-Wörterbuch + Provider
  utils/                    # Daten, Lane-Packing, Jahresfenster, site-IDs
```

## Historie

Ursprüngliches Mockup (ohne App-Logik): `public/mockup.html`
