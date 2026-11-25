import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { CalendarType } from '../types';
import { typeLabel } from '../utils/labels';
import { SITE_SUFFIX } from '../utils/site';

const LEGEND_KEY = 'pyc-legend' + SITE_SUFFIX;

interface Props {
  types: CalendarType[];
  onTypeClick?: (id: string) => void;
  /**
   * footer (Desktop: Leiste unten, ein-/ausklappbar) oder
   * pill (Handy: kleiner Chip in der Monatsleiste mit Dropdown-Karte).
   */
  variant?: 'footer' | 'pill';
}

/**
 * Legende in zwei Varianten:
 * - footer: Ausklapp-Leiste unten (Desktop), Zustand im localStorage
 * - pill:   Chip in der Monatsleiste (Handy), tippen → Karte mit den
 *           Typen darunter (transient, wie das Burger-Menü)
 */
export default function Legend({ types, onTypeClick, variant = 'footer' }: Props) {
  const { lang, t } = useI18n();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(LEGEND_KEY) === 'closed';
    } catch {
      return false;
    }
  });
  const [pillOpen, setPillOpen] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);

  // Pill-Karte schließen: Klick außerhalb oder Esc
  useEffect(() => {
    if (!pillOpen) return;
    const onDoc = (ev: MouseEvent) => {
      if (!pillRef.current?.contains(ev.target as Node)) setPillOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setPillOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [pillOpen]);

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

  const items = (
    <>
      <span className="legend-title">{t('legend')}</span>
      {types.map((ty) => (
        <span
          key={ty.id}
          className="legend-item"
          role={onTypeClick ? 'button' : undefined}
          tabIndex={onTypeClick ? 0 : undefined}
          onClick={() => {
            onTypeClick?.(ty.id);
            setPillOpen(false); // Karte nach Auswahl schließen
          }}
          onKeyDown={(ev) => {
            if (onTypeClick && (ev.key === 'Enter' || ev.key === ' ')) {
              ev.preventDefault();
              onTypeClick(ty.id);
              setPillOpen(false);
            }
          }}
          title={t('manageTypes')}
        >
          <span className="dot" style={{ background: ty.color }} />
          {typeLabel(ty, lang)}
        </span>
      ))}
    </>
  );

  if (variant === 'pill') {
    return (
      <div className="legend-pill-wrap" ref={pillRef}>
        <button
          type="button"
          className="legend-pill"
          aria-haspopup="true"
          aria-expanded={pillOpen}
          aria-label={t('legendToggle')}
          title={t('legendToggle')}
          onClick={() => setPillOpen((v) => !v)}
        >
          {types.slice(0, 4).map((ty) => (
            <span key={ty.id} className="legend-mini" style={{ background: ty.color }} />
          ))}
          <span className="legend-caret" aria-hidden="true">
            {pillOpen ? '▴' : '▾'}
          </span>
        </button>
        {pillOpen && (
          <div className="legend-pop legend-content" aria-label={t('legend')}>
            {items}
          </div>
        )}
      </div>
    );
  }

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
      <div className="legend-content">{items}</div>
    </footer>
  );
}
