import type { CalendarData } from '../types';

/** Zeitstempel als Number (fehlt/ungültig → 0). */
const ts = (s?: string): number => {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
};

/**
 * Vereinigt zwei Eintrags-/Typen-Listen nach `id`.
 *
 * - Nur lokal vorhanden (neuer Eintrag) → bleibt erhalten
 * - Nur remote vorhanden (anderes Gerät) → wird übernommen
 * - Beide: neueres `updatedAt` gewinnt
 * - Ohne Zeitstempel (Schema v1): lokale Version gewinnt – entspricht dem
 *   bisherigen Overlay-Verhalten und verhindert Datenverlust im v1-Fenster
 * - Gleichstand (beide > 0): Remote gewinnt (Serverstand)
 */
function mergeById<T extends { id: string; updatedAt?: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const r of remote) map.set(r.id, r);
  for (const l of local) {
    const r = map.get(l.id);
    if (!r) {
      map.set(l.id, l);
      continue;
    }
    const tl = ts(l.updatedAt);
    const tr = ts(r.updatedAt);
    const localWins = tl > tr || (tl === 0 && tr === 0);
    if (localWins) map.set(l.id, l);
  }
  return [...map.values()];
}

/**
 * Legt lokale Änderungen (Overlay/aktueller State) auf Remote-Daten.
 * `remote` ist die Basis, lokal Neuere gewinnt.
 */
export function mergeData(remote: CalendarData, local: CalendarData): CalendarData {
  return {
    types: mergeById(local.types, remote.types),
    entries: mergeById(local.entries, remote.entries),
  };
}
