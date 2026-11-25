/** Ein TerminTyp (Kategorie) mit Farbe – Name pro Sprache. */
export interface CalendarType {
  id: string;
  /** Name auf Deutsch */
  name: string;
  /** Name auf Polnisch */
  namePl: string;
  /** Hex-Farbe, z. B. "#e74c3c" */
  color: string;
  /** v2: Zeitstempel der letzten Änderung (Merge-Regel: Neueres gewinnt) */
  updatedAt?: string;
  /** v2: Tombstone – wird bei der Anzeige ausgeblendet */
  deleted?: boolean;
}

/** Ein Eintrag/Zeitraum im Kalender. */
export interface CalendarEntry {
  id: string;
  /** Frei benannter Name, z. B. "Sommerferien" */
  name: string;
  /** Referenz auf CalendarType.id */
  typeId: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD (>= startDate) */
  endDate: string;
  /** v2: Zeitstempel der letzten Änderung (Merge-Regel: Neueres gewinnt) */
  updatedAt?: string;
  /** v2: Tombstone – wird bei der Anzeige ausgeblendet */
  deleted?: boolean;
}

/** Gesamtdaten der Kalenderdatei. */
export interface CalendarData {
  types: CalendarType[];
  entries: CalendarEntry[];
}

/** Unterstützte Sprachen. */
export type Lang = 'de' | 'pl';
