import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { decryptEnc, fetchEncFile } from '../auth/crypto';
import type { CalendarData, CalendarEntry, CalendarType } from '../types';

const OVERLAY_KEY = 'pyc-data-v1';

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

export interface UseEntriesResult {
  data: CalendarData | null;
  loading: boolean;
  error: string | null;
  /** true, wenn localStorage-Änderungen die Quelldatei überschreiben */
  hasOverlay: boolean;
  saveEntry: (entry: CalendarEntry) => void;
  deleteEntry: (id: string) => void;
  saveType: (type: CalendarType) => void;
  deleteType: (id: string) => void;
  /** Lädt die Quelldatei (entschlüsselt) und verwirft localStorage-Änderungen */
  discardChanges: () => Promise<void>;
  /** Aktuelle Daten als formatiertes JSON */
  toJson: () => string;
}

/**
 * Lädt die verschlüsselte calendar.enc, entschlüsselt sie mit dem
 * Auth-Schlüssel und verwaltet localStorage-Änderungen als Overlay.
 */
export function useEntries(): UseEntriesResult {
  const { key, logout } = useAuth();
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasOverlay, setHasOverlay] = useState(false);

  const applyBase = useCallback(async () => {
    if (!key) return;
    const file = await fetchEncFile();
    let base: CalendarData;
    try {
      base = await decryptEnc(file, key);
    } catch (e) {
      // GCM-Tag-Fehler → Schlüssel passt nicht mehr (z. B. Passwort geändert)
      if (e instanceof DOMException && e.name === 'OperationError') {
        logout();
        return;
      }
      throw e;
    }
    const overlay = readOverlay();
    setData(overlay ?? base);
    setHasOverlay(overlay !== null);
  }, [key, logout]);

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

  /** Schreibt in localStorage und aktualisiert den State. */
  const persist = useCallback((next: (prev: CalendarData) => CalendarData) => {
    setData((prev) => {
      if (!prev) return prev;
      const updated = next(prev);
      try {
        localStorage.setItem(OVERLAY_KEY, JSON.stringify(updated));
      } catch {
        /* localStorage nicht verfügbar – Änderungen bleiben nur im State */
      }
      setHasOverlay(true);
      return updated;
    });
  }, []);

  const saveEntry = useCallback(
    (entry: CalendarEntry) => {
      persist((prev) => {
        const idx = prev.entries.findIndex((e) => e.id === entry.id);
        const entries =
          idx === -1
            ? [...prev.entries, entry]
            : prev.entries.map((e, i) => (i === idx ? entry : e));
        return { ...prev, entries };
      });
    },
    [persist],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      persist((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== id) }));
    },
    [persist],
  );

  const saveType = useCallback(
    (type: CalendarType) => {
      persist((prev) => {
        const idx = prev.types.findIndex((t) => t.id === type.id);
        const types =
          idx === -1 ? [...prev.types, type] : prev.types.map((t, i) => (i === idx ? type : t));
        return { ...prev, types };
      });
    },
    [persist],
  );

  const deleteType = useCallback(
    (id: string) => {
      persist((prev) => ({ ...prev, types: prev.types.filter((t) => t.id !== id) }));
    },
    [persist],
  );

  const discardChanges = useCallback(async () => {
    try {
      localStorage.removeItem(OVERLAY_KEY);
    } catch {
      /* ignorieren */
    }
    await applyBase();
  }, [applyBase]);

  const toJson = useCallback(
    () => (data ? JSON.stringify({ types: data.types, entries: data.entries }, null, 2) : ''),
    [data],
  );

  return {
    data,
    loading,
    error,
    hasOverlay,
    saveEntry,
    deleteEntry,
    saveType,
    deleteType,
    discardChanges,
    toJson,
  };
}
