import { useI18n } from '../i18n/I18nContext';
import type { Lang } from '../types';
import { fmtISO, todayISO } from '../utils/dates';
import YearTabs from './YearTabs';

interface Props {
  years: number[];
  year: number;
  onYearChange: (year: number) => void;
  onNewEntry?: () => void;
  onManageTypes?: () => void;
  onJsonData?: () => void;
}

export default function Header({ years, year, onYearChange, onNewEntry, onManageTypes, onJsonData }: Props) {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="topbar">
      <div className="title">📅 {t('title')}</div>
      <YearTabs years={years} active={year} onChange={onYearChange} />
      <div className="today-label">
        {t('today')}: <b>{fmtISO(todayISO)}</b>
      </div>
      <div className="spacer" />
      <div className="lang-switch" role="group" aria-label={t('langLabel')}>
        {(['de', 'pl'] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            className={l === lang ? 'lang-btn active' : 'lang-btn'}
            aria-pressed={l === lang}
            onClick={() => setLang(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <button type="button" className="btn primary new-btn" onClick={onNewEntry} disabled={!onNewEntry}>
        {t('newEntry')}
      </button>
      <button type="button" className="btn" onClick={onManageTypes} disabled={!onManageTypes}>
        {t('manageTypes')}
      </button>
      <button type="button" className="btn" onClick={onJsonData} disabled={!onJsonData}>
        {t('jsonData')}
      </button>
    </header>
  );
}
