import ruCharacterScreen from "../../../../i18n/ru-RU/CharacterScreen.json";
import enCharacterScreen from "../../../../i18n/en-EN/CharacterScreen.json";
import { getCurrentLocale } from "../../../../i18n/locale";

const DICTIONARIES = {
  "ru-RU": ruCharacterScreen,
  "en-EN": enCharacterScreen,
};

export const tCharacterScreen = (path, fallback = "") => {
  const parts = path.split(".");
  const locale = getCurrentLocale();
  let current = DICTIONARIES[locale] || ruCharacterScreen;

  for (const part of parts) {
    current = current?.[part];
    if (current === undefined) return fallback || "Ошибка ключа";
  }

  return current;
};
