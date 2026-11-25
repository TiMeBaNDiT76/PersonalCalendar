import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Lang } from '../types';
import { SITE_SUFFIX } from '../utils/site';
import { DE, PL, type DictKey } from './dict';

const STORAGE_KEY = 'pyc-lang' + SITE_SUFFIX;

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Übersetzt einen Schlüssel; {name} o. Ä. werden ersetzt. */
  t: (key: DictKey, vars?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'de' || stored === 'pl') return stored;
  } catch {
    /* localStorage nicht verfügbar */
  }
  return navigator.language?.toLowerCase().startsWith('pl') ? 'pl' : 'de';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === 'pl' ? PL.title : DE.title;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignorieren */
    }
  }, []);

  const t = useCallback(
    (key: DictKey, vars?: Record<string, string>) => {
      let s: string = lang === 'pl' ? PL[key] : DE[key];
      if (vars) {
        for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
      }
      return s;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n muss innerhalb von I18nProvider verwendet werden');
  return ctx;
}
