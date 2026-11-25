import { useState, type FormEvent } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { Lang } from '../types';
import { useAuth } from './AuthContext';

/** Sperrbildschirm: Passwort eingeben → Schlüssel ableiten → Kalender freischalten. */
export default function LoginScreen() {
  const { lang, setLang, t } = useI18n();
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      const ok = await login(password);
      if (!ok) setError(t('authWrong'));
    } catch {
      setError(t('authError'));
    } finally {
      setBusy(false);
      setPassword('');
    }
  };

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="auth-icon" aria-hidden="true">
          🔐
        </div>
        <h1 className="auth-title">{t('title')}</h1>

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

        <form onSubmit={submit}>
          <label className="auth-label">
            {t('authPassword')}
            <input
              type="password"
              value={password}
              autoFocus
              autoComplete="current-password"
              onChange={(ev) => setPassword(ev.target.value)}
            />
          </label>
          <div className="error" role="alert">
            {error}
          </div>
          <button
            type="submit"
            className="btn primary auth-submit"
            disabled={busy || !password}
          >
            {busy ? t('authChecking') : t('authLogin')}
          </button>
        </form>
      </div>
    </main>
  );
}
