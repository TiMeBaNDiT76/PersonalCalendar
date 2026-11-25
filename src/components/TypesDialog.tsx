import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { WEEKDAYS } from '../i18n/dict';
import type { CalendarEntry, CalendarType } from '../types';
import { uid } from '../utils/ids';

const PALETTE = [
  '#9b59b6',
  '#e74c3c',
  '#e67e22',
  '#f1c40f',
  '#2ecc71',
  '#1abc9c',
  '#3498db',
  '#e91e63',
  '#95a5a6',
  '#795548',
];

interface Props {
  open: boolean;
  types: CalendarType[];
  entries: CalendarEntry[];
  onSaveType: (type: CalendarType) => void;
  onDeleteType: (id: string) => void;
  onClose: () => void;
}

/** Listen-Dialog aller TerminTypen + Bearbeiten-/Neu-Dialog mit Farbwahl. */
export default function TypesDialog({ open, types, entries, onSaveType, onDeleteType, onClose }: Props) {
  const { lang, t } = useI18n();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarType | null>(null);
  const [nameDe, setNameDe] = useState('');
  const [namePl, setNamePl] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setEditorOpen(false);
    }
  }, [open]);

  // Escape: zuerst Bearbeiten-Dialog, dann Liste
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      if (editorOpen) setEditorOpen(false);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, editorOpen, onClose]);

  if (!open) return null;

  const usedBy = (id: string): boolean => entries.some((e) => e.typeId === id);
  const labelOf = (ty: CalendarType): string => (lang === 'pl' ? ty.namePl : ty.name);

  const openEditor = (ty: CalendarType | null) => {
    setEditing(ty);
    setNameDe(ty?.name ?? '');
    setNamePl(ty?.namePl ?? '');
    setColor(ty?.color ?? PALETTE[0]);
    setError('');
    setEditorOpen(true);
  };

  const saveEditor = () => {
    if (!nameDe.trim() || !namePl.trim()) {
      setError(t('errName'));
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      setError(t('errColor'));
      return;
    }
    onSaveType({
      id: editing?.id ?? uid('t'),
      name: nameDe.trim(),
      namePl: namePl.trim(),
      color,
    });
    setEditorOpen(false);
  };

  const remove = (ty: CalendarType) => {
    if (window.confirm(t('deleteConfirm', { name: labelOf(ty) }))) {
      onDeleteType(ty.id);
    }
  };

  return (
    <>
      <div
        className="overlay"
        role="dialog"
        aria-modal="true"
        aria-label={t('typesTitle')}
        onClick={(ev) => {
          if (ev.target === ev.currentTarget) onClose();
        }}
      >
        <div className="dialog">
          <div className="dialog-title">{t('typesTitle')}</div>

          {types.length === 0 && <div className="info">{t('noTypes')}</div>}
          {types.map((ty) => {
            const used = usedBy(ty.id);
            return (
              <div className="type-row" key={ty.id}>
                <span className="dot" style={{ background: ty.color }} />
                <span className="type-name">{labelOf(ty)}</span>
                <button type="button" className="mini" onClick={() => openEditor(ty)}>
                  {t('edit')}
                </button>
                <button
                  type="button"
                  className="mini"
                  disabled={used}
                  title={used ? t('typeUsed') : undefined}
                  onClick={() => remove(ty)}
                >
                  {t('delete')}
                </button>
              </div>
            );
          })}

          <div className="dialog-actions">
            <button type="button" className="btn" onClick={onClose}>
              {t('close')}
            </button>
            <div className="spacer" />
            <button type="button" className="btn primary" onClick={() => openEditor(null)}>
              {t('typeNew')}
            </button>
          </div>
        </div>
      </div>

      {editorOpen && (
        <div
          className="overlay overlay-top"
          role="dialog"
          aria-modal="true"
          aria-label={editing ? t('typeEdit') : t('typeNew')}
        >
          <div className="dialog">
            <div className="dialog-title">{editing ? t('typeEdit') : t('typeNew')}</div>

            <label>
              {t('fNameDe')}
              <input
                type="text"
                value={nameDe}
                autoComplete="off"
                onChange={(ev) => setNameDe(ev.target.value)}
              />
            </label>
            <label>
              {t('fNamePl')}
              <input
                type="text"
                value={namePl}
                autoComplete="off"
                onChange={(ev) => setNamePl(ev.target.value)}
              />
            </label>

            <label>
              {t('color')}
              <div className="palette">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={c === color ? 'swatch active' : 'swatch'}
                    style={{ background: c }}
                    aria-label={c}
                    aria-pressed={c === color}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
              <div className="color-line" style={{ marginTop: 10 }}>
                <input
                  type="text"
                  className="hex"
                  value={color}
                  spellCheck={false}
                  onChange={(ev) => {
                    const v = ev.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(v);
                  }}
                />
                <input
                  type="color"
                  className="picker"
                  value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#000000'}
                  onChange={(ev) => setColor(ev.target.value)}
                  aria-label={t('color')}
                />
              </div>
            </label>

            <div className="preview-box">
              <div className="preview-label">{t('preview')}</div>
              <div className="prev-row">
                <span className="prev-band" style={{ background: /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#cbd2dc' }} />
                <span className="dnum" style={{ width: 'auto' }}>
                  27
                </span>
                <span className="wday">{WEEKDAYS[lang][6]}</span>
                <span className="prev-name" style={{ color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : undefined }}>
                  {nameDe || namePl || 'Beispiel'}
                </span>
              </div>
            </div>

            <div className="error" role="alert">
              {error}
            </div>

            <div className="dialog-actions">
              <button type="button" className="btn" onClick={() => setEditorOpen(false)}>
                {t('cancel')}
              </button>
              <button type="button" className="btn primary" onClick={saveEditor}>
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
