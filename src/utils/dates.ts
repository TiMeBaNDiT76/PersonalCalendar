/** Kleine Datums-Helfer – alles in lokaler Zeit, ISO-Strings YYYY-MM-DD. */

export const pad = (n: number): string => String(n).padStart(2, '0');

export const isoOf = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = isoOf(new Date());

export const daysInMonth = (year: number, month0: number): number =>
  new Date(year, month0 + 1, 0).getDate();

/** "2026-07-27" → "27.07.2026" (de) bzw. bleibt ISO für PL-Anzeige flexibel – hier formatiert nach DE-Konvention. */
export const fmtISO = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

export const currentYear = new Date().getFullYear();

/**
 * Sichtbares Jahresfenster: Vorjahr + aktuelles Jahr + 3 Zukunftsjahre.
 * Rollt automatisch mit – z. B. 2026 → [2025…2029], ab 2027 → [2026…2030].
 */
export function visibleYears(now = new Date()): number[] {
  const y = now.getFullYear();
  return [y - 1, y, y + 1, y + 2, y + 3];
}

/** ISO-Datum vor 10 Jahren – Einträge, die früher enden, werden bereinigt. */
export function tenYearsAgoISO(now = new Date()): string {
  return isoOf(new Date(now.getFullYear() - 10, now.getMonth(), now.getDate()));
}
