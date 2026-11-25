import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { MONTHS, WEEKDAYS } from '../i18n/dict';
import type { CalendarData } from '../types';
import { currentYear, daysInMonth, fmtISO, pad, todayISO } from '../utils/dates';
import { typeLabel } from '../utils/labels';
import { assignLanes, monthEntries } from '../utils/lanes';

interface Props {
  data: CalendarData;
  /** Sichtbares Jahresfenster (z. B. [2025…2029]) */
  years: number[];
  /** Aktiv angezeigtes Jahr (Reiter) */
  year: number;
  /** Erhöht sich bei Reiter-Klick → Sprung auf die Standard-Seite des Jahres */
  navTick: number;
  /** Erhöht sich bei „Heute"-Klick → Sprung auf den heutigen Monat */
  todayTick: number;
  /** Wird beim horizontalen Swipen über Jahresgrenzen aufgerufen (Reiter-Sync) */
  onScrollYear?: (year: number) => void;
  /** „Heute"-Button in der mobilen Seitenleiste */
  onToday?: () => void;
  onDayClick?: (iso: string) => void;
  onEntryClick?: (entryId: string) => void;
}

const MOBILE_QUERY = '(max-width: 639px)';
const PAIRS_PER_YEAR = 6; // 12 Monate / 2 pro Seite

/**
 * Jahresstrom: alle sichtbaren Jahre als durchgehende Kette von
 * Paar-Seiten [Jan|Feb] … [Nov|Dez] – auf dem Handy per Scroll-Snap
 * swipbar, auch über Jahresgrenzen hinweg. Grenzen sind die Fenster-
 * Enden (Jahr−1 links, Jahr+3 rechts).
 * Desktop/Tablet: nur das aktive Jahr sichtbar (year-block-Switch).
 */
export default function MonthGrid({
  data,
  years,
  year,
  navTick,
  todayTick,
  onScrollYear,
  onToday,
  onDayClick,
  onEntryClick,
}: Props) {
  const { lang, t } = useI18n();
  const gridRef = useRef<HTMLDivElement>(null);
  const lastNavRef = useRef(-1);
  const [page, setPage] = useState(0);

  const maxPage = years.length * PAIRS_PER_YEAR - 1;
  const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

  /** Absolute Seite eines Jahres (+ Paar-Index). */
  const absPage = (y: number, pair: number): number => {
    const yi = Math.max(0, years.indexOf(y));
    return yi * PAIRS_PER_YEAR + pair;
  };

  /** Startpaar: heutiger Monat im aktuellen Jahr, sonst Jan|Feb. */
  const defaultPair = (y: number): number =>
    y === currentYear ? Math.floor(new Date().getMonth() / 2) : 0;

  // Mount + Reiter-Klick: sofortige Position (ohne Animation), nur Handy
  useLayoutEffect(() => {
    if (lastNavRef.current === navTick) return;
    lastNavRef.current = navTick;
    const el = gridRef.current;
    if (!el || !isMobile()) return;
    const target = absPage(year, defaultPair(year));
    setPage(target);
    el.scrollLeft = target * el.clientWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navTick, years, year]);

  // „Heute"-Klick: weich zum heutigen Monat
  useEffect(() => {
    if (todayTick === 0) return;
    const el = gridRef.current;
    if (!el) return;
    const m = new Date().getMonth();
    if (isMobile()) {
      const target = absPage(currentYear, Math.floor(m / 2));
      setPage(target);
      el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' });
    } else {
      const sec = el.querySelector<HTMLElement>(
        `.year-block.active [data-month="${m}"]`,
      );
      sec?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayTick]);

  // Breakpoint-Wechsel (Drehen): Position an der aktuellen Seite ausrichten
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => {
      const el = gridRef.current;
      if (!el || !mq.matches) return;
      setPage((p) => {
        el.scrollLeft = p * el.clientWidth;
        return p;
      });
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const onScroll = () => {
    const el = gridRef.current;
    if (!el || el.clientWidth === 0 || !isMobile()) return;
    const p = Math.max(0, Math.min(maxPage, Math.round(el.scrollLeft / el.clientWidth)));
    setPage(p);
    const yi = Math.min(years.length - 1, Math.floor(p / PAIRS_PER_YEAR));
    const y = years[yi];
    if (y !== year) onScrollYear?.(y);
  };

  const goto = (p: number) => {
    const el = gridRef.current;
    if (!el) return;
    const c = Math.max(0, Math.min(maxPage, p));
    setPage(c);
    el.scrollTo({ left: c * el.clientWidth, behavior: 'smooth' });
  };

  const colorOf = (typeId: string): string =>
    data.types.find((ty) => ty.id === typeId)?.color ?? '#95a5a6';
  const typeName = (typeId: string): string => {
    const ty = data.types.find((x) => x.id === typeId);
    return ty ? typeLabel(ty, lang) : '';
  };

  const renderMonth = (y: number, m: number) => {
    const monthName = MONTHS[lang][m];
    const dim = daysInMonth(y, m);
    const mm = pad(m + 1);
    const mStart = `${y}-${mm}-01`;
    const mEnd = `${y}-${mm}-${pad(dim)}`;
    const list = monthEntries(data.entries, mStart, mEnd);
    const { map, count } = assignLanes(list);
    const lanes = Math.max(count, 1);

    const rows = [];
    for (let d = 1; d <= dim; d++) {
      const iso = `${y}-${mm}-${pad(d)}`;
      const dow = new Date(y, m, d).getDay();
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
      <section className="month" key={`${y}-${m}`} data-month={m} aria-label={monthName}>
        <div className="month-name">{monthName}</div>
        <div className="days">{rows}</div>
      </section>
    );
  };

  const yi = Math.min(years.length - 1, Math.floor(page / PAIRS_PER_YEAR));
  const pair = page % PAIRS_PER_YEAR;
  const pagerLabel = `${MONTHS[lang][pair * 2]} – ${MONTHS[lang][pair * 2 + 1]} ${years[yi]}`;

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
          disabled={page >= maxPage}
          onClick={() => goto(page + 1)}
        >
          ›
        </button>
        <button type="button" className="pager-btn pager-today" onClick={onToday}>
          {t('today')}
        </button>
      </div>

      <div className="year-grid" ref={gridRef} onScroll={onScroll}>
        {years.map((y) => (
          <div
            key={y}
            className={y === year ? 'year-block active' : 'year-block'}
            data-year={y}
          >
            {Array.from({ length: PAIRS_PER_YEAR }, (_, p) => (
              <div className="month-page" key={p}>
                {renderMonth(y, p * 2)}
                {renderMonth(y, p * 2 + 1)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
