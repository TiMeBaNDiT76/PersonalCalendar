import { useEffect, useState, type RefObject } from 'react';

/**
 * Misst nach dem Öffnen, ob eine absolut positionierte Liste unten aus
 * dem Container herausragen würde – dann wird sie nach oben geklappt
 * (sonst wäre sie am Dialogrand abgeschnitten).
 *
 * Rückgabe: [klasseUp, measure] – measure() direkt nach dem Öffnen
 * des Dropdowns aufrufen (z. B. in requestAnimationFrame).
 */
export function useDropdownFlip(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  listRef: RefObject<HTMLElement | null>,
): [boolean, () => void] {
  const [up, setUp] = useState(false);

  useEffect(() => {
    if (!open) setUp(false);
  }, [open]);

  const measure = () => {
    requestAnimationFrame(() => {
      const list = listRef.current;
      const ctr = containerRef.current;
      if (!list || !ctr) return;
      const lb = list.getBoundingClientRect(); // gemessen im abwärts-Zustand
      const cb = ctr.getBoundingClientRect();
      if (lb.bottom <= cb.bottom - 8) {
        setUp(false); // passt nach unten
        return;
      }
      const upTop = lb.top - lb.height - 8; // wäre die Position nach oben
      setUp(upTop >= cb.top + 8); // nur flippen, wenn oben genug Platz
    });
  };

  return [up, measure];
}
