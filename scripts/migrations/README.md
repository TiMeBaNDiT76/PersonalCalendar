# Schema-Migrationen

Jede Datei in diesem Verzeichnis ist **eine** Migration und wird beim Aufruf von
`npm run data:migrate` der Reihe nach angewendet.

## Format

```js
// 001-kurzbeschreibung.mjs
export const from = 1;   // Ausgangs-Version
export const to = 2;     // Ziel-Version

/** Wandelt die entschlüsselten Daten (CalendarData) um und gibt sie zurück. */
export function migrate(data) {
  data.entries = data.entries.map((e) => ({ updatedAt: '2026-01-01T00:00:00Z', ...e }));
  return data;
}
```

## Regeln

- **Eindeutige Nummern:** `001-`, `002-`, … – Reihenfolge ergibt sich aus der Sortierung
- **From-Kette:** `from` muss der aktuellen `v` der Datei entsprechen, sonst wird übersprungen
- **Niemals löschen:** alte Migrationen bleiben unangetastet (Datenbestände unterschiedlichen Alters müssen alle durchlaufen)
- **Idempienz schädlich?** Nein – Migrationen laufen pro Datei genau einmal (Version steigt)
- Nach dem Lauf: siehe `MIGRATION.md` (Changelog + Push auf den Daten-Branch)
