import type { CalendarEntry } from '../types';

/** Einträge, die den Monatszeitraum [mStart, mEnd] schneiden, sortiert nach Start. */
export function monthEntries(
  entries: CalendarEntry[],
  mStart: string,
  mEnd: string,
): CalendarEntry[] {
  return entries
    .filter((e) => e.startDate <= mEnd && e.endDate >= mStart)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
}

export interface LaneResult {
  /** entryId → Bahn (0-basiert) */
  map: Map<string, number>;
  /** Anzahl benötigter Bahnen */
  count: number;
}

/**
 * Vergibt pro Monat Bahnen für überlappende Einträge (Greedy-Interval-Partitioning).
 * Nicht überlappende Einträge teilen sich eine Bahn → schmale Streifen liegen
 * nebeneinander, erst bei echter Überlappung rückt die Tagesnummer nach rechts.
 */
export function assignLanes(list: CalendarEntry[]): LaneResult {
  const laneEnds: string[] = [];
  const map = new Map<string, number>();
  for (const e of list) {
    let li = laneEnds.findIndex((end) => end < e.startDate);
    if (li === -1) {
      laneEnds.push(e.endDate);
      li = laneEnds.length - 1;
    } else {
      laneEnds[li] = e.endDate;
    }
    map.set(e.id, li);
  }
  return { map, count: laneEnds.length };
}
