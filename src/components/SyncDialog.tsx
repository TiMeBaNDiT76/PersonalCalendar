import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { SyncStatus } from './Header';

interface Props {
  open: boolean;
  status: SyncStatus;
  onConnect: (token: string) => Promise<boolean>;
  onDisconnect: () => void;
  onClose: () => void;
}

/** Einrichtung des GitHub-Syncs: Token eingeben, testen, trennen. */
export default function SyncDialog({ open, status, onConnect, onDisconnect, onClose }: Props) {
  const { t } = useI18n();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<'ok' | 'fail' | null>(null);

  useEffect(() => {
    if (!open) return;
    setToken('');
    setMsg(null);
    setBusy(false);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const connected = status !== 'disabled';

  const submit = async () => {
    if (!token.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    const ok = await onConnect(token.trim());
    setBusy(false);
    setMsg(ok ? 'ok' : 'fail');
    if (ok) setToken('');
  };

  const disconnect = () => {
    onDisconnect();
    setMsg(null);
    setToken('');
  };

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('syncTitle')}
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="dialog">
        <div className="dialog-title">🔗 {t('syncTitle')}</div>
        <p className="sync-desc">{t('syncDesc')}</p>

        {connected && (
          <div className={`sync-state sync-state-${status}`}>
            {status === 'idle' ? t('syncOk') : t('syncStIdle')}
          </div>
        )}

        <label>
          {t('syncTokenLabel')}
          <input
            type="password"
            value={token}
            autoComplete="off"
            spellCheck={false}
            placeholder="ghp_… / github_pat_…"
            onChange={(ev) => setToken(ev.target.value)}
          />
        </label>
        <div className="sync-hint">{t('syncTokenHint')}</div>

        <div className="error" role="alert">
          {msg === 'fail' ? t('syncFail') : msg === 'ok' ? t('syncOk') : ''}
        </div>

        <div className="dialog-actions">
          {connected && (
            <button type="button" className="btn danger" onClick={disconnect}>
              {t('syncDisconnect')}
            </button>
          )}
          <div className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            {t('syncClose')}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={submit}
            disabled={busy || !token.trim()}
          >
            {busy ? t('syncTesting') : t('syncConnect')}
          </button>
        </div>
      </div>
    </div>
  );
}
