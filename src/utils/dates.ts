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

/** 10 Jahre ab dem aktuellen Jahr: z. B. 2026–2035. */
export const YEARS: number[] = Array.from({ length: 10 }, (_, i) => currentYear + i);
