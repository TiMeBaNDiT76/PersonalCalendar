import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useI18n } from '../i18n/I18nContext';
import { WEEKDAYS } from '../i18n/dict';
import type { CalendarEntry, CalendarType } from '../types';
import { currentYear } from '../utils/dates';
import { typeLabel } from '../utils/labels';
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
  /** Sichtbare Jahresfenster-Jahre (für die Jahres-Löschung) */
  years: number[];
  onSaveType: (type: CalendarType) => void;
  onDeleteType: (id: string) => void;
  /** Alle Einträge eines Typs in einem Jahr als Tombstone entfernen */
  onDeleteEntries?: (typeId: string, year: number) => void;
  /** Neue Reihenfolge nach Drag & Drop übernehmen */
  onReorderTypes?: (ordered: CalendarType[]) => void;
  onClose: () => void;
}

/** Listen-Dialog aller TerminTypen + Bearbeiten-/Neu-Dialog mit Farbwahl. */
export default function TypesDialog({
  open,
  types,
  entries,
  years,
  onSaveType,
  onDeleteType,
  onDeleteEntries,
  onReorderTypes,
  onClose,
}: Props) {
  const { lang, t } = useI18n();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarType | null>(null);
  const [nameDe, setNameDe] = useState('');
  const [namePl, setNamePl] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [error, setError] = useState('');
  const [typeInfo, setTypeInfo] = useState('');
  const [delFor, setDelFor] = useState<CalendarType | null>(null);
  const [delYear, setDelYear] = useState(currentYear);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setEditorOpen(false);
      setDelFor(null);
      setTypeInfo('');
    }
  }, [open]);

  // Escape: zuerst Lösch-Dialog, dann Bearbeiten, dann Liste
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      if (delFor) setDelFor(null);
      else if (editorOpen) setEditorOpen(false);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, editorOpen, delFor, onClose]);

  if (!open) return null;

  const usedBy = (id: string): boolean => entries.some((e) => e.typeId === id);
  const labelOf = (ty: CalendarType): string => typeLabel(ty, lang);

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

  // --- Termine eines Jahres löschen ---
  const openDel = (ty: CalendarType) => {
    setDelFor(ty);
    setDelYear(years.includes(currentYear) ? currentYear : years[0]);
    setTypeInfo('');
  };

  const delCount = delFor
    ? entries.filter(
        (e) =>
          e.typeId === delFor.id &&
          e.startDate <= `${delYear}-12-31` &&
          e.endDate >= `${delYear}-01-01`,
      ).length
    : 0;

  const confirmDel = () => {
    if (!delFor || delCount === 0) return;
    onDeleteEntries?.(delFor.id, delYear);
    setTypeInfo(
      t('delDone', { count: String(delCount), year: String(delYear) }),
    );
    setDelFor(null);
  };

  // --- Drag & Drop: Reihenfolge per Griff (Maus + Touch + Tastatur) ---
  const applyOrder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...types];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorderTypes?.(next);
  };

  const startDrag = (idx: number, ev: ReactPointerEvent<HTMLSpanElement>) => {
    ev.preventDefault(); // kein Textauswählen
    ev.currentTarget.setPointerCapture(ev.pointerId);
    setDragIdx(idx);
  };

  const moveDrag = (ev: ReactPointerEvent<HTMLSpanElement>) => {
    if (dragIdx === null || !listRef.current) return;
    const rows = listRef.current.querySelectorAll<HTMLElement>('.type-row');
    let target = dragIdx;
    rows.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (ev.clientY >= r.top && ev.clientY < r.bottom) target = i;
    });
    if (target !== dragIdx) {
      applyOrder(dragIdx, target);
      setDragIdx(target);
    }
  };

  const endDrag = (ev: ReactPointerEvent<HTMLSpanElement>) => {
    if (ev.currentTarget.hasPointerCapture?.(ev.pointerId)) {
      ev.currentTarget.releasePointerCapture(ev.pointerId);
    }
    setDragIdx(null);
  };

  const handleKeyDown = (idx: number, ev: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
    ev.preventDefault();
    const target = idx + (ev.key === 'ArrowUp' ? -1 : 1);
    if (target < 0 || target >= types.length) return;
    applyOrder(idx, target);
    // Fokus auf den Griff der bewegten Zeile mitnehmen
    requestAnimationFrame(() => {
      const handles = listRef.current?.querySelectorAll<HTMLElement>('.drag-handle');
      handles?.[target]?.focus();
    });
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
          {typeInfo && (
            <div className="info" role="status">
              {typeInfo}
            </div>
          )}
          <div className="type-list" ref={listRef}>
            {types.map((ty, i) => {
              const used = usedBy(ty.id);
              return (
                <div
                  className={dragIdx === i ? 'type-row dragging' : 'type-row'}
                  key={ty.id}
                >
                  <span
                    className="drag-handle"
                    role="button"
                    tabIndex={0}
                    title={t('dragSort')}
                    aria-label={`${t('dragSort')}: ${labelOf(ty)}`}
                    onPointerDown={(ev) => startDrag(i, ev)}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onKeyDown={(ev) => handleKeyDown(i, ev)}
                  >
                    ⠿
                  </span>
                  <span className="dot" style={{ background: ty.color }} />
                  <span className="type-name">{labelOf(ty)}</span>
                <button
                  type="button"
                  className="mini"
                  title={t('delYearBtn')}
                  aria-label={`${t('delYearBtn')}: ${labelOf(ty)}`}
                  onClick={() => openDel(ty)}
                >
                  🗑
                </button>
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
          </div>

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
              <div className="prev-alt">
                DE: {nameDe || '–'} · PL: {namePl || '–'}
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

      {delFor && (
        <div
          className="overlay overlay-top"
          role="dialog"
          aria-modal="true"
          aria-label={t('delTitle')}
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) setDelFor(null);
          }}
        >
          <div className="dialog">
            <div className="dialog-title">🗑 {t('delTitle')}</div>

            <div className="type-row" style={{ paddingTop: 0 }}>
              <span className="dot" style={{ background: delFor.color }} />
              <span className="type-name">{labelOf(delFor)}</span>
            </div>

            <label>
              {t('hYear')}
              <select
                className="native-select"
                value={delYear}
                onChange={(ev) => setDelYear(Number(ev.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>

            <div className="info" role="status">
              {delCount > 0
                ? t('delCount', { count: String(delCount), year: String(delYear) })
                : t('delNone')}
            </div>

            <div className="dialog-actions">
              <button type="button" className="btn" onClick={() => setDelFor(null)}>
                {t('cancel')}
              </button>
              <div className="spacer" />
              <button
                type="button"
                className="btn danger"
                disabled={delCount === 0}
                onClick={confirmDel}
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
