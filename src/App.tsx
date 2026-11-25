import { useEffect, useState } from 'react';
import LoginScreen from './auth/LoginScreen';
import { AuthProvider, useAuth } from './auth/AuthContext';
import EntryDialog from './components/EntryDialog';
import Header from './components/Header';
import JsonDialog from './components/JsonDialog';
import Legend from './components/Legend';
import MonthGrid from './components/MonthGrid';
import SyncDialog from './components/SyncDialog';
import TypesDialog from './components/TypesDialog';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import { useEntries } from './hooks/useEntries';
import type { CalendarData } from './types';
import { currentYear, todayISO, visibleYears } from './utils/dates';

/** Öffnungszustand des Eintrag-Dialogs. */
interface EntryDlgState {
  entryId: string | null;
  date: string | null;
}

function CalendarApp() {
  const { t } = useI18n();
  const { logout } = useAuth();
  const {
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
  } = useEntries();
  const [years, setYears] = useState<number[]>(() => visibleYears());
  const [year, setYear] = useState<number>(() => {
    const v = visibleYears();
    return v.includes(currentYear) ? currentYear : v[1];
  });
  const [navTick, setNavTick] = useState(0);
  const [todayTick, setTodayTick] = useState(0);
  const [entryDlg, setEntryDlg] = useState<EntryDlgState | null>(null);
  const [typesOpen, setTypesOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  // Fenster rollt automatisch mit: beim Fokus/Tab-Wechsel neu berechnen,
  // damit ein Jahreswechsel auch bei lange offenem Tab ein weiteres Jahr zeigt.
  useEffect(() => {
    const sync = () => {
      const v = visibleYears();
      setYears(v);
      setYear((y) => (v.includes(y) ? y : v[1]));
    };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  if (loading) return <main className="status">{t('loading')}</main>;
  if (error) return <main className="status">{t('loadError', { msg: error })}</main>;
  if (!data) return null;

  // Anzeige-Daten: gelöschte Einträge/Typen (Tombstones) ausblenden
  const view: CalendarData = {
    types: data.types.filter((ty) => !ty.deleted),
    entries: data.entries.filter((e) => !e.deleted),
  };

  const entry =
    entryDlg?.entryId != null
      ? (view.entries.find((e) => e.id === entryDlg.entryId) ?? null)
      : null;

  /** Reiter-Klick: Jahr wechseln + zur Standard-Seite springen. */
  const handleTabYear = (y: number) => {
    setYear(y);
    setNavTick((n) => n + 1);
  };

  /** „Heute": aktuelles Jahr + heutiger Monat. */
  const handleToday = () => {
    setYear(currentYear);
    setTodayTick((n) => n + 1);
  };

  return (
    <>
      <Header
        years={years}
        year={year}
        onYearChange={handleTabYear}
        onNewEntry={() => setEntryDlg({ entryId: null, date: todayISO })}
        onManageTypes={() => setTypesOpen(true)}
        onJsonData={() => setJsonOpen(true)}
        onLogout={logout}
        onToday={handleToday}
        syncStatus={syncStatus}
        onSyncClick={() => setSyncOpen(true)}
      />
      <p className="hint">{t('hint')}</p>
      <MonthGrid
        data={view}
        years={years}
        year={year}
        navTick={navTick}
        todayTick={todayTick}
        onScrollYear={setYear}
        onToday={handleToday}
        onDayClick={(iso) => setEntryDlg({ entryId: null, date: iso })}
        onEntryClick={(id) => setEntryDlg({ entryId: id, date: null })}
      />
      <Legend types={view.types} onTypeClick={() => setTypesOpen(true)} />

      {entryDlg && (
        <EntryDialog
          open
          entry={entry}
          presetDate={entryDlg.date}
          types={view.types}
          onSave={saveEntry}
          onDelete={deleteEntry}
          onClose={() => setEntryDlg(null)}
        />
      )}

      <TypesDialog
        open={typesOpen}
        types={view.types}
        entries={view.entries}
        onSaveType={saveType}
        onDeleteType={deleteType}
        onClose={() => setTypesOpen(false)}
      />

      <JsonDialog
        open={jsonOpen}
        json={toJson()}
        hasOverlay={hasOverlay}
        onDiscard={discardChanges}
        onClose={() => setJsonOpen(false)}
      />

      <SyncDialog
        open={syncOpen}
        status={syncStatus}
        onConnect={connectToken}
        onDisconnect={disconnectToken}
        onClose={() => setSyncOpen(false)}
      />

      {/* Schnellzugriff auf Handys */}
      <button
        type="button"
        className="fab"
        aria-label={t('newEntry')}
        onClick={() => setEntryDlg({ entryId: null, date: todayISO })}
      >
        +
      </button>
    </>
  );
}

/** Wartet auf den Auth-Status: Prüfen → Login → Kalender. */
function Gate() {
  const { status } = useAuth();
  const { t } = useI18n();

  if (status === 'checking') return <main className="status">{t('loading')}</main>;
  if (status === 'login') return <LoginScreen />;
  return <CalendarApp />;
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </I18nProvider>
  );
}
