import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  open: boolean;
  json: string;
  hasOverlay: boolean;
  onDiscard: () => Promise<void>;
  onClose: () => void;
}

/** Zeigt die aktuellen Daten als JSON: Kopieren, Download, Änderungen verwerfen. */
export default function JsonDialog({ open, json, hasOverlay, onDiscard, onClose }: Props) {
  const { t } = useI18n();
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    setMsg('');
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setMsg(t('copied'));
    } catch {
      setMsg(t('copyFail'));
    }
  };

  const download = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendar.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const discard = async () => {
    if (!window.confirm(t('discardConfirm'))) return;
    await onDiscard();
    onClose();
  };

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('jsonTitle')}
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="dialog wide">
        <div className="dialog-title">{t('jsonTitle')}</div>
        <textarea readOnly value={json} onFocus={(ev) => ev.currentTarget.select()} />
        <div className="info">{msg}</div>
        <div className="dialog-actions">
          <button
            type="button"
            className="btn danger"
            onClick={discard}
            disabled={!hasOverlay}
            title={hasOverlay ? undefined : t('jsonTitle')}
          >
            {t('discard')}
          </button>
          <div className="spacer" />
          <button type="button" className="btn" onClick={copy}>
            {t('copy')}
          </button>
          <button type="button" className="btn" onClick={download}>
            {t('downloadJson')}
          </button>
          <button type="button" className="btn primary" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
