# Daten-Changelog

Jede Änderung an `public/data/calendar.enc` muss hier vermerkt werden – sonst
blockiert der Datenwächter das Deploy (siehe MIGRATION.md). Ausgenommen:
Automatik-Syncs (`sync:`-Commits), sie sind selbst dokumentierend.

## Einträge

- 2026-11-25 – Initialbestand angelegt: Beispieldaten Schema v1 (4 Typen,
  25 Einträge; enthält einen Eintrag von 2014 als Prüffall für die
  10-Jahres-Bereinigung)
- 2026-11-25 – Migration v1 → v2: `updatedAt` für alle Einträge und Typen
  (Grundlage der geräteübergreifenden Merge-Regel; Tombstones `deleted`
  für künftige Löschungen). Angewendet mit `npm run data:migrate`.
