import type { CalendarType, Lang } from '../types';

/**
 * Sprachabhängiger Typ-Name mit Fallback:
 * Fehlt die gewünschte Sprache (z. B. importierte Daten ohne namePl),
 * wird die andere angezeigt statt eines leeren Strings.
 */
export function typeLabel(ty: CalendarType, lang: Lang): string {
  const primary = lang === 'pl' ? ty.namePl : ty.name;
  const secondary = lang === 'pl' ? ty.name : ty.namePl;
  return primary || secondary || '';
}
