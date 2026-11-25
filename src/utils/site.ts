/**
 * Kennung des Deployments – steuert die Namespace-Trennung im localStorage.
 * Produktion (BASE_URL "/PersonalCalendar/") behält die historischen Keys,
 * damit bestehende Anmeldungen/Änderungen erhalten bleiben.
 * Test ("/PersonalCalendar/test/") bekommt eigene Keys mit "-test".
 */
export const IS_TEST = import.meta.env.BASE_URL.includes('/test/');

/** Suffix für localStorage-Keys: '' (Produktion) oder '-test'. */
export const SITE_SUFFIX = IS_TEST ? '-test' : '';

/** GitHub-Repo für Sync/Zugriff (owner/name). */
export const GITHUB_REPO = 'TiMeBaNDiT76/PersonalCalendar';

/** Pfad der verschlüsselten Daten im Repo. */
export const DATA_PATH = 'public/data/calendar.enc';

/** Daten-Branch: Produktion sync't nach `data`, Test nach `data-test`. */
export const DATA_BRANCH = IS_TEST ? 'data-test' : 'data';
