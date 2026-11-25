import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { MONTHS, WEEKDAYS } from '../i18n/dict';
import type { CalendarData } from '../types';
import { currentYear, daysInMonth, fmtISO, pad, todayISO } from '../utils/dates';
import { assignLanes, monthEntries } from '../utils/lanes';

interface Props {
  data: CalendarData;
  year: number;
  onDayClick?: (iso: string) => void;
  onEntryClick?: (entryId: string) => void;
}

const MOBILE_QUERY = '(max-width: 639px)';
/** 12 Monate als 6 swipbare Paar-Seiten [Jan|Feb] … [Nov|Dez]. */
const PAGE_COUNT = 6;

/**
 * 12 Monatsspalten nebeneinander, Tage vertikal (1–31).
 * Farbige Streifen liegen links in den Tageszeilen; überlappende Einträge
 * bekommen eigene Bahnen nebeneinander.
 * Auf dem Handy: Scroll-Snap-Carousel mit je 2 Monaten pro Seite.
 */
export default function MonthGrid({ data, year, onDayClick, onEntryClick }: Props) {
  const { lang, t } = useI18n();
  const gridRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

  /** Seite mit dem heutigen Monat (nur im aktuellen Jahr), sonst erste Seite. */
  const initialPage = (y: number): number =>
    y === currentYear ? Math.floor(new Date().getMonth() / 2) : 0;

  // Startposition beim Öffnen/Jahreswechsel: sofort, ohne Animation (nur Handy)
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el || !isMobile()) return;
    const target = initialPage(year);
    setPage(target);
    el.scrollLeft = target * el.clientWidth;
  }, [year]);

  // Breakpoint-Wechsel (z. B. Drehen des Handys) → Position neu ausrichten
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => {
      const el = gridRef.current;
      if (!el) return;
      if (mq.matches) {
        const target = initialPage(year);
        setPage(target);
        el.scrollLeft = target * el.clientWidth;
      } else {
        setPage(0);
        el.scrollLeft = 0;
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [year]);

  const onScroll = () => {
    const el = gridRef.current;
    if (!el || el.clientWidth === 0) return;
    const p = Math.round(el.scrollLeft / el.clientWidth);
    setPage(Math.max(0, Math.min(PAGE_COUNT - 1, p)));
  };

  const goto = (p: number) => {
    const el = gridRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(PAGE_COUNT - 1, p));
    setPage(clamped);
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
  };

  const colorOf = (typeId: string): string =>
    data.types.find((ty) => ty.id === typeId)?.color ?? '#95a5a6';
  const typeName = (typeId: string): string => {
    const ty = data.types.find((x) => x.id === typeId);
    if (!ty) return '';
    return lang === 'pl' ? ty.namePl : ty.name;
  };

  const renderMonth = (m: number) => {
    const monthName = MONTHS[lang][m];
    const dim = daysInMonth(year, m);
    const mm = pad(m + 1);
    const mStart = `${year}-${mm}-01`;
    const mEnd = `${year}-${mm}-${pad(dim)}`;
    const list = monthEntries(data.entries, mStart, mEnd);
    const { map, count } = assignLanes(list);
    const lanes = Math.max(count, 1);

    const rows = [];
    for (let d = 1; d <= dim; d++) {
      const iso = `${year}-${mm}-${pad(d)}`;
      const dow = new Date(year, m, d).getDay();
      const cls = ['day-row'];
      if (dow === 0 || dow === 6) cls.push('weekend');
      if (iso === todayISO) cls.push('today');

      const active = list
        .filter((e) => e.startDate <= iso && iso <= e.endDate)
        .sort((a, b) => map.get(a.id)! - map.get(b.id)!);

      const bands = active.map((e) => {
        const segStart = e.startDate > mStart ? e.startDate : mStart;
        const segEnd = e.endDate < mEnd ? e.endDate : mEnd;
        const bandCls =
          'band' + (iso === segStart ? ' start' : '') + (iso === segEnd ? ' end' : '');
        const tip = `${e.name} · ${fmtISO(e.startDate)} – ${fmtISO(e.endDate)} · ${typeName(e.typeId)}`;
        return (
          <span
            key={e.id}
            className={bandCls}
            style={{ background: colorOf(e.typeId) }}
            title={tip}
            aria-label={tip}
            onClick={(ev) => {
              ev.stopPropagation();
              onEntryClick?.(e.id);
            }}
          />
        );
      });

      const starters = active.filter((e) => {
        const segStart = e.startDate > mStart ? e.startDate : mStart;
        return iso === segStart;
      });
      let name: JSX.Element | null = null;
      if (starters.length > 0) {
        const e = starters[0];
        name = (
          <span
            className="ename"
            style={{ color: colorOf(e.typeId) }}
            title={`${e.name} · ${fmtISO(e.startDate)} – ${fmtISO(e.endDate)}`}
            onClick={(ev) => {
              ev.stopPropagation();
              onEntryClick?.(e.id);
            }}
          >
            {e.name}
          </span>
        );
      }

      rows.push(
        <div
          key={iso}
          className={cls.join(' ')}
          title={`${fmtISO(iso)}`}
          onClick={() => onDayClick?.(iso)}
        >
          <div className="bands" style={{ '--lanes': lanes } as CSSProperties}>
            {bands}
          </div>
          <span className="dnum">{d}</span>
          <span className="wday">{WEEKDAYS[lang][dow]}</span>
          {name}
        </div>,
      );
    }

    return (
      <section className="month" key={monthName} aria-label={monthName}>
        <div className="month-name">{monthName}</div>
        <div className="days">{rows}</div>
      </section>
    );
  };

  const p0 = page * 2;
  const pagerLabel = `${MONTHS[lang][p0]} – ${MONTHS[lang][p0 + 1]} ${year}`;

  return (
    <>
      <div className="month-pager">
        <button
          type="button"
          className="pager-btn"
          aria-label={t('prevPair')}
          disabled={page <= 0}
          onClick={() => goto(page - 1)}
        >
          ‹
        </button>
        <span className="pager-label" aria-live="polite">
          {pagerLabel}
        </span>
        <button
          type="button"
          className="pager-btn"
          aria-label={t('nextPair')}
          disabled={page >= PAGE_COUNT - 1}
          onClick={() => goto(page + 1)}
        >
          ›
        </button>
      </div>

      <div className="year-grid" ref={gridRef} onScroll={onScroll}>
        {Array.from({ length: PAGE_COUNT }, (_, p) => (
          <div className="month-page" key={p}>
            {renderMonth(p * 2)}
            {renderMonth(p * 2 + 1)}
          </div>
        ))}
      </div>
    </>
  );
}
