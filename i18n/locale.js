const SUPPORTED_LOCALES = ['ru-RU', 'en-EN'];
const DEFAULT_LOCALE = 'ru-RU';

const normalizeLocale = (input) => {
  if (!input || typeof input !== 'string') return DEFAULT_LOCALE;
  const normalized = input.replace('_', '-');
  const exact = SUPPORTED_LOCALES.find(locale => locale.toLowerCase() === normalized.toLowerCase());
  if (exact) return exact;

  const langCode = normalized.slice(0, 2).toLowerCase();
  if (langCode === 'ru') return 'ru-RU';
  if (langCode === 'en') return 'en-EN';
  return DEFAULT_LOCALE;
};

const detectLocale = () => {
  try {
    const fromIntl = Intl?.DateTimeFormat?.().resolvedOptions?.().locale;
    return normalizeLocale(fromIntl);
  } catch (_) {
    return DEFAULT_LOCALE;
  }
};

let currentLocale = detectLocale();

export const getCurrentLocale = () => currentLocale;
export const setCurrentLocale = (nextLocale) => {
  currentLocale = normalizeLocale(nextLocale);
  return currentLocale;
};

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, normalizeLocale };
