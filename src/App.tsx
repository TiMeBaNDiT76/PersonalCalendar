import { useState } from 'react';
import LoginScreen from './auth/LoginScreen';
import { AuthProvider, useAuth } from './auth/AuthContext';
import EntryDialog from './components/EntryDialog';
import Header from './components/Header';
import JsonDialog from './components/JsonDialog';
import Legend from './components/Legend';
import MonthGrid from './components/MonthGrid';
import TypesDialog from './components/TypesDialog';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import { useEntries } from './hooks/useEntries';
import { YEARS, currentYear, todayISO } from './utils/dates';

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
    saveEntry,
    deleteEntry,
    saveType,
    deleteType,
    discardChanges,
    toJson,
  } = useEntries();
  const [year, setYear] = useState(() => (YEARS.includes(currentYear) ? currentYear : YEARS[0]));
  const [entryDlg, setEntryDlg] = useState<EntryDlgState | null>(null);
  const [typesOpen, setTypesOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);

  if (loading) return <main className="status">{t('loading')}</main>;
  if (error) return <main className="status">{t('loadError', { msg: error })}</main>;
  if (!data) return null;

  const entry =
    entryDlg?.entryId != null
      ? (data.entries.find((e) => e.id === entryDlg.entryId) ?? null)
      : null;

  return (
    <>
      <Header
        years={YEARS}
        year={year}
        onYearChange={setYear}
        onNewEntry={() => setEntryDlg({ entryId: null, date: todayISO })}
        onManageTypes={() => setTypesOpen(true)}
        onJsonData={() => setJsonOpen(true)}
        onLogout={logout}
      />
      <p className="hint">{t('hint')}</p>
      <MonthGrid
        data={data}
        year={year}
        onDayClick={(iso) => setEntryDlg({ entryId: null, date: iso })}
        onEntryClick={(id) => setEntryDlg({ entryId: id, date: null })}
      />
      <Legend types={data.types} onTypeClick={() => setTypesOpen(true)} />

      {entryDlg && (
        <EntryDialog
          open
          entry={entry}
          presetDate={entryDlg.date}
          types={data.types}
          onSave={saveEntry}
          onDelete={deleteEntry}
          onClose={() => setEntryDlg(null)}
        />
      )}

      <TypesDialog
        open={typesOpen}
        types={data.types}
        entries={data.entries}
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
