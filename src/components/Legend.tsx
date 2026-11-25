import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { CalendarType } from '../types';
import { typeLabel } from '../utils/labels';
import { SITE_SUFFIX } from '../utils/site';

const LEGEND_KEY = 'pyc-legend' + SITE_SUFFIX;

interface Props {
  types: CalendarType[];
  onTypeClick?: (id: string) => void;
}

/**
 * Legende mit Schalter links: eingeklappt fährt der Inhalt nach links
 * aus, es bleibt ein Griff (›) stehen. Zustand wird im localStorage
 * gemerkt (namespaced pro Deployment).
 */
export default function Legend({ types, onTypeClick }: Props) {
  const { lang, t } = useI18n();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(LEGEND_KEY) === 'closed';
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LEGEND_KEY, next ? 'closed' : 'open');
      } catch {
        /* ignorieren */
      }
      return next;
    });
  };

  return (
    <footer className={collapsed ? 'legend collapsed' : 'legend'}>
      <button
        type="button"
        className="legend-toggle"
        aria-expanded={!collapsed}
        aria-label={t('legendToggle')}
        title={t('legendToggle')}
        onClick={toggle}
      >
        {collapsed ? '›' : '‹'}
      </button>
      <div className="legend-content">
        <span className="legend-title">{t('legend')}</span>
        {types.map((ty) => (
          <span
            key={ty.id}
            className="legend-item"
            role={onTypeClick ? 'button' : undefined}
            tabIndex={onTypeClick ? 0 : undefined}
            onClick={() => onTypeClick?.(ty.id)}
            onKeyDown={(ev) => {
              if (onTypeClick && (ev.key === 'Enter' || ev.key === ' ')) {
                ev.preventDefault();
                onTypeClick(ty.id);
              }
            }}
            title={t('manageTypes')}
          >
            <span className="dot" style={{ background: ty.color }} />
            {typeLabel(ty, lang)}
          </span>
        ))}
      </div>
    </footer>
  );
}
