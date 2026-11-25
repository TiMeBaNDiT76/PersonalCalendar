import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { CalendarEntry, CalendarType } from '../types';
import { typeLabel } from '../utils/labels';
import { uid } from '../utils/ids';

interface Props {
  open: boolean;
  /** Vorhandener Eintrag oder null für neu */
  entry: CalendarEntry | null;
  /** Start-/Zieldatum für Neueintrag (Klick auf Tageszeile) */
  presetDate: string | null;
  types: CalendarType[];
  onSave: (entry: CalendarEntry) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/** Dialog zum Anlegen/Bearbeiten eines Termins: Name, Datum von/bis, Typ-Dropdown. */
export default function EntryDialog({
  open,
  entry,
  presetDate,
  types,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const { lang, t } = useI18n();
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [typeId, setTypeId] = useState('');
  const [error, setError] = useState('');
  const [ddOpen, setDdOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Zustand zurücksetzen, wenn der Dialog geöffnet wird
  useEffect(() => {
    if (!open) return;
    setName(entry?.name ?? '');
    setFrom(entry?.startDate ?? presetDate ?? '');
    setTo(entry?.endDate ?? presetDate ?? '');
    setTypeId(entry?.typeId ?? types[0]?.id ?? '');
    setError('');
    setDdOpen(false);
    const tm = window.setTimeout(() => nameRef.current?.focus(), 50);
    return () => window.clearTimeout(tm);
  }, [open, entry, presetDate, types]);

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

  const selected = types.find((ty) => ty.id === typeId) ?? null;
  const selectedLabel = selected ? typeLabel(selected, lang) : t('chooseType');

  const submit = () => {
    if (!name.trim()) {
      setError(t('errName'));
      return;
    }
    if (!from || !to) {
      setError(t('errDates'));
      return;
    }
    if (from > to) {
      setError(t('errOrder'));
      return;
    }
    if (!typeId) {
      setError(t('errType'));
      return;
    }
    onSave({
      id: entry?.id ?? uid('e'),
      name: name.trim(),
      typeId,
      startDate: from,
      endDate: to,
    });
    onClose();
  };

  const remove = () => {
    if (entry && window.confirm(t('deleteConfirm', { name: entry.name }))) {
      onDelete(entry.id);
      onClose();
    }
  };

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={entry ? t('entryEdit') : t('entryNew')}
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="dialog">
        <div className="dialog-title">{entry ? t('entryEdit') : t('entryNew')}</div>

        <label>
          {t('fName')}
          <input
            ref={nameRef}
            type="text"
            value={name}
            placeholder="…"
            autoComplete="off"
            onChange={(ev) => setName(ev.target.value)}
          />
        </label>

        <div className="row2">
          <label>
            {t('fFrom')}
            <input type="date" value={from} onChange={(ev) => setFrom(ev.target.value)} />
          </label>
          <label>
            {t('fTo')}
            <input type="date" value={to} onChange={(ev) => setTo(ev.target.value)} />
          </label>
        </div>

        <label>
          {t('fType')}
          <div className={`dropdown${ddOpen ? ' open' : ''}`}>
            <button
              type="button"
              className="dd-btn"
              aria-haspopup="listbox"
              aria-expanded={ddOpen}
              onClick={() => setDdOpen((v) => !v)}
            >
              <span className="dot" style={{ background: selected?.color ?? '#cbd2dc' }} />
              <span>{selectedLabel}</span>
              <span className="caret">▼</span>
            </button>
            <div className="dd-list" role="listbox">
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
              {types.length === 0 && <div className="dd-option">{t('noTypes')}</div>}
            </div>
          </div>
        </label>

        <div className="error" role="alert">
          {error}
        </div>

        <div className="dialog-actions">
          {entry && (
            <button type="button" className="btn danger" onClick={remove}>
              {t('delete')}
            </button>
          )}
          <div className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className="btn primary" onClick={submit}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
