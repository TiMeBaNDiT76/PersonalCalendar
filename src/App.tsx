import { useState } from 'react';
import Header from './components/Header';
import Legend from './components/Legend';
import MonthGrid from './components/MonthGrid';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import { useEntries } from './hooks/useEntries';
import { YEARS, currentYear } from './utils/dates';

function CalendarApp() {
  const { t } = useI18n();
  const { data, loading, error } = useEntries();
  const [year, setYear] = useState(() => (YEARS.includes(currentYear) ? currentYear : YEARS[0]));

  if (loading) return <main className="status">{t('loading')}</main>;
  if (error) return <main className="status">{t('loadError', { msg: error })}</main>;
  if (!data) return null;

  return (
    <>
      <Header years={YEARS} year={year} onYearChange={setYear} />
      <p className="hint">{t('hint')}</p>
      <MonthGrid data={data} year={year} />
      <Legend types={data.types} />
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <CalendarApp />
    </I18nProvider>
  );
}
