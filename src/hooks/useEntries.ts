import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { decryptEnc, encryptData, fetchEncFile, type EncFile } from '../auth/crypto';
import { clearToken, getToken, pullEnc, pushEnc, setToken, SyncError } from '../auth/sync';
import type { CalendarData, CalendarEntry, CalendarType } from '../types';
import { tenYearsAgoISO } from '../utils/dates';
import { mergeData } from '../utils/merge';
import { SITE_SUFFIX } from '../utils/site';

const OVERLAY_KEY = 'pyc-data-v1' + SITE_SUFFIX;

export type SyncStatus = 'disabled' | 'idle' | 'pending' | 'pushing' | 'error';

function isValidData(v: unknown): v is CalendarData {
  if (!v || typeof v !== 'object') return false;
  const d = v as CalendarData;
  return Array.isArray(d.types) && Array.isArray(d.entries);
}

function readOverlay(): CalendarData | null {
  try {
    const raw = localStorage.getItem(OVERLAY_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeOverlay(data: CalendarData): void {
  try {
    localStorage.setItem(OVERLAY_KEY, JSON.stringify(data));
  } catch {
    /* localStorage nicht verfügbar */
  }
}

const nowISO = (): string => new Date().toISOString();

export interface UseEntriesResult {
  data: CalendarData | null;
  loading: boolean;
  error: string | null;
  /** true, wenn es lokale Änderungen gibt, die noch nicht gesendet wurden */
  hasOverlay: boolean;
  syncStatus: SyncStatus;
  saveEntry: (entry: CalendarEntry) => void;
  deleteEntry: (id: string) => void;
  saveType: (type: CalendarType) => void;
  deleteType: (id: string) => void;
  discardChanges: () => Promise<void>;
  toJson: () => string;
  /** Token speichern und Verbindung testen (true = ok) */
  connectToken: (token: string) => Promise<boolean>;
  disconnectToken: () => void;
  /** Mehrere Einträge auf einmal anlegen (ein Sync-Push) */
  addEntries: (list: CalendarEntry[]) => void;
  /** Alle (nicht gelöschten) Einträge eines Typs in einem Jahr tombstonen */
  deleteEntriesByTypeYear: (typeId: string, year: number) => void;
  /** Neue Reihenfolge der Typen übernehmen (updatedAt-Stempel → merge-sicher) */
  reorderTypes: (ordered: CalendarType[]) => void;
}

/**
 * Datenpipeline: calendar.enc pullen (GitHub-API, Fallback statische Datei),
 * entschlüsseln, mit lokalem Overlay mergen, 10-Jahres-Retention – und
 * Änderungen debounced über die GitHub-API zurückspeichern (Sync).
 */
export function useEntries(): UseEntriesResult {
  const { key, logout } = useAuth();
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasOverlay, setHasOverlay] = useState(false);
  const [pushState, setPushState] = useState<'idle' | 'pushing' | 'error'>('idle');
  const [, setTokenVersion] = useState(0);

  // Refs für async-Callbacks (keine veralteten Closures)
  const dataRef = useRef<CalendarData | null>(null);
  const shaRef = useRef<string | null>(null);
  const metaRef = useRef<{ kdf: EncFile['kdf']; v: number } | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);
  const hasOverlayRef = useRef(false);
  const pushingRef = useRef(false);
  const pushTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    keyRef.current = key;
  }, [key]);
  useEffect(() => {
    hasOverlayRef.current = hasOverlay;
  }, [hasOverlay]);

  const updateData = useCallback((d: CalendarData) => {
    dataRef.current = d;
    setData(d);
  }, []);

  /** Lokale Änderung: speichern (Overlay) + Sync anstoßen. */
  const persist = useCallback(
    (fn: (prev: CalendarData) => CalendarData) => {
      const prev = dataRef.current;
      if (!prev) return;
      const updated = fn(prev);
      updateData(updated);
      writeOverlay(updated);
      hasOverlayRef.current = true;
      setHasOverlay(true);
      schedulePush();
    },
    [updateData],
  );

  const doPush = useCallback(async () => {
    const d = dataRef.current;
    const sha = shaRef.current;
    const meta = metaRef.current;
    const k = keyRef.current;
    if (!k || !d || !sha || !meta || !getToken() || !hasOverlayRef.current) return;
    pushingRef.current = true;
    setPushState('pushing');
    try {
      const enc = await encryptData(d, k, meta);
      const newSha = await pushEnc(enc, sha, 'sync: Daten aktualisiert');
      shaRef.current = newSha;
      try {
        localStorage.removeItem(OVERLAY_KEY);
      } catch {
        /* ignorieren */
      }
      hasOverlayRef.current = false;
      setHasOverlay(false);
      setPushState('idle');
    } catch (e) {
      // sha-Konflikt (anderes Gerät hat gesendet): frisch pullen, mergen, 1 Versuch
      if (e instanceof SyncError && (e.status === 409 || e.status === 422)) {
        try {
          const { file, sha: fresh } = await pullEnc();
          const remote = await decryptEnc(file, k);
          const merged = mergeData(remote, d);
          metaRef.current = { kdf: file.kdf, v: file.v };
          shaRef.current = fresh;
          updateData(merged);
          const enc2 = await encryptData(merged, k, metaRef.current);
          const newSha = await pushEnc(enc2, fresh, 'sync: Daten aktualisiert');
          shaRef.current = newSha;
          try {
            localStorage.removeItem(OVERLAY_KEY);
          } catch {
            /* ignorieren */
          }
          hasOverlayRef.current = false;
          setHasOverlay(false);
          setPushState('idle');
          return;
        } catch {
          /* durchfallen */
        }
      }
      setPushState('error');
    } finally {
      pushingRef.current = false;
    }
  }, [updateData]);

  const schedulePush = useCallback(() => {
    if (!getToken()) return;
    window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(() => {
      void doPush();
    }, 2000);
  }, [doPush]);

  /** Pull + Entschlüsseln + Merge + Retention – Ladebasis. */
  const applyBase = useCallback(async () => {
    if (!key) return;
    let file: EncFile;
    let sha: string | null;
    try {
      const remote = await pullEnc();
      file = remote.file;
      sha = remote.sha;
    } catch {
      // Fallback: statische Datei (veralteter Stand) – kein Push ohne sha
      try {
        file = await fetchEncFile();
        sha = null;
        setPushState('error');
      } catch (e) {
        const overlay = readOverlay();
        if (overlay) {
          // Offline: lokale Änderungen weiterverwenden
          updateData(overlay);
          hasOverlayRef.current = true;
          setHasOverlay(true);
          setPushState('error');
          return;
        }
        throw e;
      }
    }

    let base: CalendarData;
    try {
      base = await decryptEnc(file, key);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'OperationError') {
        logout(); // Schlüssel passt nicht mehr (z. B. Passwort geändert)
        return;
      }
      throw e;
    }

    metaRef.current = { kdf: file.kdf, v: file.v };
    shaRef.current = sha;
    if (sha && getToken()) setPushState('idle');

    const overlay = readOverlay();
    let merged = overlay ? mergeData(base, overlay) : base;

    // 10-Jahres-Bereinigung: Einträge, die vor 10 Jahren endeten, raus
    const cutoff = tenYearsAgoISO();
    const kept = merged.entries.filter((e) => e.endDate >= cutoff);
    const pruned = kept.length !== merged.entries.length;
    if (pruned) merged = { ...merged, entries: kept };

    updateData(merged);
    const pending = overlay !== null || pruned;
    hasOverlayRef.current = pending;
    setHasOverlay(pending);
    if (pruned) writeOverlay(merged);
    if (pending && getToken() && shaRef.current) schedulePush();
  }, [key, logout, schedulePush, updateData]);

  // Laden, sobald der Auth-Schlüssel steht
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    (async () => {
      try {
        await applyBase();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyBase, key]);

  // Bei Fenster-Fokus: neuen Stand holen und mergen (Gerätewechsel)
  useEffect(() => {
    if (!key) return;
    const onFocus = async () => {
      if (!keyRef.current || pushingRef.current) return;
      try {
        const { file, sha } = await pullEnc();
        if (sha === shaRef.current) return; // nichts Neues
        const remote = await decryptEnc(file, keyRef.current!);
        metaRef.current = { kdf: file.kdf, v: file.v };
        shaRef.current = sha;
        const merged = dataRef.current ? mergeData(remote, dataRef.current) : remote;
        updateData(merged);
        if (getToken()) setPushState('idle');
        if (hasOverlayRef.current && getToken()) schedulePush();
      } catch {
        /* offline/outage: aktueller Stand bleibt */
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [key, schedulePush, updateData]);

  // Timer aufräumen
  useEffect(() => () => window.clearTimeout(pushTimer.current), []);

  const saveEntry = useCallback(
    (entry: CalendarEntry) => {
      persist((prev) => {
        const stamped: CalendarEntry = { ...entry, updatedAt: nowISO() };
        const idx = prev.entries.findIndex((e) => e.id === entry.id);
        const entries =
          idx === -1
            ? [...prev.entries, stamped]
            : prev.entries.map((e, i) => (i === idx ? stamped : e));
        return { ...prev, entries };
      });
    },
    [persist],
  );

  /** Bulk-Anlage (z. B. Feiertags-Import): ein Overlay-Schrieb, ein Push. */
  const addEntries = useCallback(
    (list: CalendarEntry[]) => {
      if (list.length === 0) return;
      persist((prev) => ({
        ...prev,
        entries: [
          ...prev.entries,
          ...list.map((e) => ({ ...e, updatedAt: e.updatedAt ?? nowISO() })),
        ],
      }));
    },
    [persist],
  );

  /**
   * Räumt einen Typ für ein Jahr auf: alle Einträge, die das Jahr
   * überlappen, werden als Tombstone markiert (ein Sync-Push).
   */
  const deleteEntriesByTypeYear = useCallback(
    (typeId: string, year: number) => {
      const yStart = `${year}-01-01`;
      const yEnd = `${year}-12-31`;
      persist((prev) => ({
        ...prev,
        entries: prev.entries.map((e) =>
          e.typeId === typeId &&
          !e.deleted &&
          e.startDate <= yEnd &&
          e.endDate >= yStart
            ? { ...e, deleted: true, updatedAt: nowISO() }
            : e,
        ),
      }));
    },
    [persist],
  );

  /**
   * Neue Typ-Reihenfolge (Drag & Drop). Alle Typen bekommen frische
   * updatedAt-Zeitstempel – sonst würde die Merge-Regel (Gleichstand →
   * Remote gewinnt) die Sortierung auf einem anderen Gerät rückgängig
   * machen.
   */
  const reorderTypes = useCallback(
    (ordered: CalendarType[]) => {
      persist((prev) => ({
        ...prev,
        types: ordered.map((t) => ({ ...t, updatedAt: nowISO() })),
      }));
    },
    [persist],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      // Tombstone statt Hard-Delete – damit die Lösung auch andere Geräte erreicht
      persist((prev) => ({
        ...prev,
        entries: prev.entries.map((e) =>
          e.id === id ? { ...e, deleted: true, updatedAt: nowISO() } : e,
        ),
      }));
    },
    [persist],
  );

  const saveType = useCallback(
    (type: CalendarType) => {
      persist((prev) => {
        const stamped: CalendarType = { ...type, updatedAt: nowISO() };
        const idx = prev.types.findIndex((t) => t.id === type.id);
        const types =
          idx === -1 ? [...prev.types, stamped] : prev.types.map((t, i) => (i === idx ? stamped : t));
        return { ...prev, types };
      });
    },
    [persist],
  );

  const deleteType = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        types: prev.types.map((t) =>
          t.id === id ? { ...t, deleted: true, updatedAt: nowISO() } : t,
        ),
      }));
    },
    [persist],
  );

  const discardChanges = useCallback(async () => {
    try {
      localStorage.removeItem(OVERLAY_KEY);
    } catch {
      /* ignorieren */
    }
    hasOverlayRef.current = false;
    setHasOverlay(false);
    await applyBase();
  }, [applyBase]);

  const toJson = useCallback(
    () =>
      data
        ? JSON.stringify(
            {
              types: data.types.filter((t) => !t.deleted),
              entries: data.entries.filter((e) => !e.deleted),
            },
            null,
            2,
          )
        : '',
    [data],
  );

  const connectToken = useCallback(
    async (token: string): Promise<boolean> => {
      setToken(token);
      try {
        await pullEnc(); // sofortiger Verbindungstest
        setTokenVersion((v) => v + 1);
        await applyBase();
        return true;
      } catch {
        clearToken();
        setTokenVersion((v) => v + 1);
        return false;
      }
    },
    [applyBase],
  );

  const disconnectToken = useCallback(() => {
    clearToken();
    setTokenVersion((v) => v + 1);
  }, []);

  const syncStatus: SyncStatus = !getToken()
    ? 'disabled'
    : pushState === 'pushing'
      ? 'pushing'
      : pushState === 'error'
        ? 'error'
        : hasOverlay
          ? 'pending'
          : 'idle';

  return {
    data,
    loading,
    error,
    hasOverlay,
    syncStatus,
    saveEntry,
    deleteEntry,
    saveType,
    deleteType,
    discardChanges,
    toJson,
    connectToken,
    disconnectToken,
    addEntries,
    deleteEntriesByTypeYear,
    reorderTypes,
  };
}
