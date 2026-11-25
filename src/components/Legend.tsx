import { useI18n } from '../i18n/I18nContext';
import type { CalendarType } from '../types';

interface Props {
  types: CalendarType[];
  onTypeClick?: (id: string) => void;
}

export default function Legend({ types, onTypeClick }: Props) {
  const { lang, t } = useI18n();
  return (
    <footer className="legend">
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
          {lang === 'pl' ? ty.namePl : ty.name}
        </span>
      ))}
    </footer>
  );
}
