import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  b64ToBytes,
  decryptEnc,
  deriveKey,
  exportKeyB64,
  fetchEncFile,
  importStoredKey,
} from './crypto';

const STORE_KEY = 'pyc-auth';

type Status = 'checking' | 'login' | 'authed';

interface AuthValue {
  status: Status;
  /** Aktiver AES-Schlüssel (nur im Speicher + localStorage, niemals im Code) */
  key: CryptoKey | null;
  /** Gibt true bei Erfolg zurück, false bei falschem Passwort */
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const [key, setKey] = useState<CryptoKey | null>(null);

  // Gespeicherten Schlüssel wiederherstellen („bleiben angemeldet")
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as { key: string };
          const k = await importStoredKey(stored.key);
          if (!cancelled) {
            setKey(k);
            setStatus('authed');
          }
          return;
        }
      } catch {
        localStorage.removeItem(STORE_KEY);
      }
      if (!cancelled) setStatus('login');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (password: string): Promise<boolean> => {
    const file = await fetchEncFile(); // wirft bei Netzwerkfehlern
    const salt = b64ToBytes(file.kdf.salt);
    const k = await deriveKey(password, salt, file.kdf.iterations);
    try {
      await decryptEnc(file, k); // Verifikation: GCM-Tag prüft das Passwort
    } catch {
      return false;
    }
    localStorage.setItem(STORE_KEY, JSON.stringify({ key: await exportKeyB64(k) }));
    setKey(k);
    setStatus('authed');
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORE_KEY);
    setKey(null);
    setStatus('login');
  }, []);

  const value = useMemo(() => ({ status, key, login, logout }), [status, key, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden');
  return ctx;
}
