import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { Lang } from '../types';
import { fmtISO, todayISO } from '../utils/dates';
import { IS_TEST } from '../utils/site';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLElement>(null);

  // Menü schließen: Klick außerhalb oder Esc
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (ev: MouseEvent) => {
      if (!wrapRef.current?.contains(ev.target as Node)) setMenuOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

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
    <header className="topbar" ref={wrapRef}>
      {/* Burger-Menü-Auslöser (nur Handy sichtbar) */}
      <button
        type="button"
        className="menu-toggle"
        aria-label={t('menu')}
        aria-haspopup="true"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        ☰
      </button>

      <div className="title">
        📅 {t('title')}
        {IS_TEST && <span className="test-badge">TEST</span>}
      </div>

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

      {/* Sync bleibt außerhalb des Menüs (Handy: fest unten rechts) */}
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

      {/* Sekundär-Aktionen: Desktop inline, Handy im Burger-Menü */}
      <div className={`header-actions${menuOpen ? ' open' : ''}`}>
        <button
          type="button"
          className="btn"
          onClick={() => {
            closeMenu();
            onManageTypes?.();
          }}
        >
          {t('manageTypes')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            closeMenu();
            onJsonData?.();
          }}
        >
          {t('jsonData')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            closeMenu();
            onLogout?.();
          }}
        >
          {t('logout')}
        </button>
      </div>
    </header>
  );
}
