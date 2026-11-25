import { useI18n } from '../i18n/I18nContext';
import type { Lang } from '../types';
import { fmtISO, todayISO } from '../utils/dates';
import YearTabs from './YearTabs';

export type SyncStatus = 'disabled' | 'idle' | 'pending' | 'pushing' | 'error';

interface Props {
  years: number[];
  year: number;
  onYearChange: (year: number) => void;
  onNewEntry?: () => void;
  onManageTypes?: () => void;
  onJsonData?: () => void;
  onLogout?: () => void;
  onToday?: () => void;
  syncStatus?: SyncStatus;
  onSyncClick?: () => void;
}

export default function Header({
  years,
  year,
  onYearChange,
  onNewEntry,
  onManageTypes,
  onJsonData,
  onLogout,
  onToday,
  syncStatus = 'disabled',
  onSyncClick,
}: Props) {
  const { lang, setLang, t } = useI18n();

  const syncTitle =
    syncStatus === 'disabled'
      ? t('syncStDisabled')
      : syncStatus === 'pending'
        ? t('syncStPending')
        : syncStatus === 'pushing'
          ? t('syncStPushing')
          : syncStatus === 'error'
            ? t('syncStError')
            : t('syncStIdle');

  return (
    <header className="topbar">
      <div className="title">📅 {t('title')}</div>
      <YearTabs years={years} active={year} onChange={onYearChange} />
      <button
        type="button"
        className="today-label"
        onClick={onToday}
        title={t('todayJump')}
      >
        {t('today')}: <b>{fmtISO(todayISO)}</b>
      </button>
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
      <button
        type="button"
        className="btn sync-btn"
        onClick={onSyncClick}
        title={syncTitle}
        aria-label={`${t('sync')}: ${syncTitle}`}
      >
        <span className={`sync-dot sync-${syncStatus}`} aria-hidden="true" />
        {t('sync')}
      </button>
      <button type="button" className="btn primary new-btn" onClick={onNewEntry} disabled={!onNewEntry}>
        {t('newEntry')}
      </button>
      <button type="button" className="btn" onClick={onManageTypes} disabled={!onManageTypes}>
        {t('manageTypes')}
      </button>
      <button type="button" className="btn" onClick={onJsonData} disabled={!onJsonData}>
        {t('jsonData')}
      </button>
      <button type="button" className="btn" onClick={onLogout} disabled={!onLogout}>
        {t('logout')}
      </button>
    </header>
  );
}
