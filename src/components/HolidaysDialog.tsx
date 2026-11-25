import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { COUNTRIES } from '../i18n/dict';
import { useDropdownFlip } from '../hooks/useDropdownFlip';
import type { CalendarEntry, CalendarType } from '../types';
import { currentYear } from '../utils/dates';
import { uid } from '../utils/ids';
import { typeLabel } from '../utils/labels';

interface Props {
  open: boolean;
  /** Sichtbare Jahresfenster-Jahre */
  years: number[];
  types: CalendarType[];
  /** Anzeige-Einträge (ohne Tombstones) für die Doppelvermeidung */
  entries: CalendarEntry[];
  onAdd: (entries: CalendarEntry[]) => void;
  onClose: () => void;
}

interface Holiday {
  date: string;
  localName: string;
  global: boolean;
}

/**
 * Importiert Feiertage eines Landes für ein Jahr (Nager.at-API)
 * als einzelne Tage in den gewählten TerminTyp.
 */
export default function HolidaysDialog({ open, years, types, entries, onAdd, onClose }: Props) {
  const { lang, t } = useI18n();
  const [year, setYear] = useState(currentYear);
  const [country, setCountry] = useState('DE');
  const [typeId, setTypeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [ddOpen, setDdOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [ddUp, measureFlip] = useDropdownFlip(ddOpen, dialogRef, listRef);

  // Zustand beim Öffnen zurücksetzen
  useEffect(() => {
    if (!open) return;
    setYear(years.includes(currentYear) ? currentYear : years[0]);
    setCountry(lang === 'pl' ? 'PL' : 'DE');
    setTypeId(types[0]?.id ?? '');
    setBusy(false);
    setErr('');
    setMsg('');
    setDdOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape schließt
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Dropdown schließen bei Klick außerhalb
  useEffect(() => {
    if (!ddOpen) return;
    const onDoc = (ev: MouseEvent) => {
      if (!(ev.target as HTMLElement).closest('.dropdown')) setDdOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [ddOpen]);

  if (!open) return null;

  const selectedType = types.find((ty) => ty.id === typeId) ?? null;

  const toggleDd = () => {
    if (ddOpen) {
      setDdOpen(false);
      return;
    }
    setDdOpen(true);
    measureFlip();
  };

  const load = async () => {
    if (!typeId || busy) return;
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Holiday[];
      // Nur bundesweite Feiertage (regionale fliegen raus, da kein
      // Bundesland wählbar ist)
      const holidays = data.filter((h) => h.global);
      if (holidays.length === 0) {
        setMsg(t('hNone'));
        return;
      }
      const have = new Set(entries.map((e) => `${e.startDate}|${e.name}`));
      const fresh: CalendarEntry[] = [];
      let skipped = 0;
      for (const h of holidays) {
        if (have.has(`${h.date}|${h.localName}`)) {
          skipped++;
          continue;
        }
        fresh.push({
          id: uid('e'),
          name: h.localName,
          typeId,
          startDate: h.date,
          endDate: h.date,
        });
      }
      if (fresh.length > 0) onAdd(fresh);
      setMsg(
        t('hResult', { added: String(fresh.length), skipped: String(skipped) }),
      );
    } catch (e) {
      setErr(t('hError', { msg: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('holidaysTitle')}
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="dialog" ref={dialogRef}>
        <div className="dialog-title">🗓 {t('holidaysTitle')}</div>

        <div className="row2">
          <label>
            {t('hYear')}
            <select
              className="native-select"
              value={year}
              onChange={(ev) => setYear(Number(ev.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('hCountry')}
            <select
              className="native-select"
              value={country}
              onChange={(ev) => setCountry(ev.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {lang === 'pl' ? c.pl : c.de}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Kein <label>: Klick auf die div-Option würde vom Label an den
            dd-btn weitergeleitet (toggleDd) → Dropdown öffnet sofort wieder */}
        <div className="field">
          <span id="holiday-type-label">{t('fType')}</span>
          <div className={`dropdown${ddOpen ? ' open' : ''}${ddUp ? ' up' : ''}`}>
            <button
              type="button"
              className="dd-btn"
              aria-labelledby="holiday-type-label"
              aria-haspopup="listbox"
              aria-expanded={ddOpen}
              onClick={toggleDd}
            >
              <span
                className="dot"
                style={{ background: selectedType?.color ?? '#cbd2dc' }}
              />
              <span>{selectedType ? typeLabel(selectedType, lang) : t('chooseType')}</span>
              <span className="caret">▼</span>
            </button>
            <div className="dd-list" role="listbox" ref={listRef}>
              {types.map((ty) => (
                <div
                  key={ty.id}
                  className="dd-option"
                  role="option"
                  aria-selected={ty.id === typeId}
                  onClick={() => {
                    setTypeId(ty.id);
                    setDdOpen(false);
                  }}
                >
                  <span className="dot" style={{ background: ty.color }} />
                  {typeLabel(ty, lang)}
                </div>
              ))}
              {types.length === 0 && <div className="dd-option">{t('hNoTypes')}</div>}
            </div>
          </div>
        </div>

        <div className="error" role="alert">
          {err}
        </div>
        <div className="info" role="status">
          {msg}
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t('close')}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={load}
            disabled={busy || !typeId}
          >
            {busy ? t('hLoading') : t('hAdd')}
          </button>
        </div>
      </div>
    </div>
  );
}
