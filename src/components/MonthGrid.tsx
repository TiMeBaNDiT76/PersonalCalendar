import type { CSSProperties } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { MONTHS, WEEKDAYS } from '../i18n/dict';
import type { CalendarData } from '../types';
import { daysInMonth, fmtISO, pad, todayISO } from '../utils/dates';
import { assignLanes, monthEntries } from '../utils/lanes';

interface Props {
  data: CalendarData;
  year: number;
  onDayClick?: (iso: string) => void;
  onEntryClick?: (entryId: string) => void;
}

/**
 * 12 Monatsspalten nebeneinander, Tage vertikal (1–31).
 * Farbige Streifen liegen links in den Tageszeilen; überlappende Einträge
 * bekommen eigene Bahnen nebeneinander.
 */
export default function MonthGrid({ data, year, onDayClick, onEntryClick }: Props) {
  const { lang } = useI18n();

  const colorOf = (typeId: string): string =>
    data.types.find((t) => t.id === typeId)?.color ?? '#95a5a6';
  const typeName = (typeId: string): string => {
    const t = data.types.find((x) => x.id === typeId);
    if (!t) return '';
    return lang === 'pl' ? t.namePl : t.name;
  };

  return (
    <div className="year-grid">
      {MONTHS[lang].map((monthName, m) => {
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
            const bandCls = 'band' + (iso === segStart ? ' start' : '') + (iso === segEnd ? ' end' : '');
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
      })}
    </div>
  );
}
