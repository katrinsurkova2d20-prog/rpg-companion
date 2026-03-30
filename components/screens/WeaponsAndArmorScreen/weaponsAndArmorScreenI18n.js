import ruWeaponsAndArmorScreen from '../../../i18n/ru-RU/WeaponsAndArmorScreen.json';
import enWeaponsAndArmorScreen from '../../../i18n/en-EN/WeaponsAndArmorScreen.json';
import { getCurrentLocale } from '../../../i18n/locale';

const DICTIONARIES = {
  'ru-RU': ruWeaponsAndArmorScreen,
  'en-EN': enWeaponsAndArmorScreen,
};

export const tWeaponsAndArmorScreen = (path, fallback = '') => {
  const parts = path.split('.');
  const locale = getCurrentLocale();
  let current = DICTIONARIES[locale] || ruWeaponsAndArmorScreen;

  for (const part of parts) {
    current = current?.[part];
    if (current === undefined) return fallback || 'Ошибка ключа';
  }

  return current;
};
