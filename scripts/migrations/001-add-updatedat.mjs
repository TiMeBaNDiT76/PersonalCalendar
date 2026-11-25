/** Zeitstempel für die Erst-Anlage – nur für Felder, die noch keines haben. */
const now = new Date().toISOString();

/**
 * v1 → v2: Einträge und Typen bekommen `updatedAt` (Grundlage der
 * geräteübergreifenden Merge-Regel: neueres `updatedAt` gewinnt).
 * Gelöschte Objekte bleiben als Tombstone (`deleted: true`) erhalten –
 * die App filtert sie bei der Anzeige.
 */
export const from = 1;
export const to = 2;

export function migrate(data) {
  data.types = data.types.map((t) => ({ updatedAt: now, ...t }));
  data.entries = data.entries.map((e) => ({ updatedAt: now, ...e }));
  return data;
}
