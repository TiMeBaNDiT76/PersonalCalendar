# Migration der Kalenderdaten

Die Daten liegen als **verschlüsselte Datei** `public/data/calendar.enc` auf den
Daten-Branches (`data` = Produktion, `data-test` = Test) vor. Der Klartext
`calendar.json` existiert nur zum Erzeugen (`npm run data:encrypt`) und wird
nicht committet.

## Schema-Version (`v`)

Jede `.enc`-Datei enthält oben das plaintext-Feld `v` (aktuell: siehe
`scripts/schema.mjs`). Änderungen an der **Struktur** der Daten (neue Felder,
umbenannte Typen, …) erfordern:

1. Eine neue Migration unter `scripts/migrations/NNN-*.mjs` (siehe dessen README)
2. Anheben von `SCHEMA_VERSION` in `scripts/schema.mjs`
3. Ausführung auf den betroffenen Daten (unten)
4. **Changelog-Eintrag** in `DATA_CHANGELOG.md` auf dem jeweiligen Daten-Branch

## Ablauf: Migration anwenden

```bash
# 1. Migration lokal ausführen (Passwort NIE in Dateien schreiben)
DATA_PASSWORD=… npm run data:migrate          # öffentliche Datei im Arbeitsbaum
# oder gezielt eine Datei:
DATA_PASSWORD=… node scripts/migrate-data.mjs --file /tmp/calendar.enc --out /tmp/neu.enc

# 2. Changelog aktualisieren (Datenwächter verlangt das!)
#    Auf dem Daten-Branch: DATA_CHANGELOG.md um einen Eintrag ergänzen

# 3. Commit + Push auf den Daten-Branch (data bzw. data-test)
```

Für Daten-Branches, die nicht im Arbeitsbaum liegen (z. B. `data` während auf
`develop` gearbeitet wird), ein Git-Worktree verwenden:

```bash
git worktree add /tmp/pyc-data data
cp /tmp/neu.enc /tmp/pyc-data/public/data/calendar.enc
# … DATA_CHANGELOG.md in /tmp/pyc-data bearbeiten …
git -C /tmp/pyc-data add -A && git -C /tmp/pyc-data commit -m "Migration v1 → v2: …"
git -C /tmp/pyc-data push
git worktree remove /tmp/pyc-data
```

## Datenwächter (CI)

Bei jedem Push prüft der Workflow (`deploy.yml`), ob sich
`public/data/calendar.enc` geändert hat. Erlaubt sind nur:

- **Änderung von `DATA_CHANGELOG.md` im selben Push** (bewusste Datenänderung
  oder Migration), oder
- **Commits mit Präfix `sync:`** (automatischer Geräte-Sync – meldet nur
  „Daten aktualisiert", ohne Termine preiszugeben)

Sonst schlägt der Workflow fehl und **es wird nicht deployt** – die
Produktionsdaten bleiben unangetastet.

## Datenfluss

```
Gerät (App) ──sync:──▶ data / data-test ◀── Migration/Changelog ── du (lokal)
                           │
                           ▼  (Workflow holt die .enc beim Bauen)
              Produktion /  Test  (GitHub Pages)
```
