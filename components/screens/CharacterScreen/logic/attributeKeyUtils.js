import { tCharacterScreen } from "./characterScreenI18n";

export const CANONICAL_ATTRIBUTE_KEYS = [
  "STR",
  "END",
  "PER",
  "AGI",
  "INT",
  "CHA",
  "LCK",
];

const ATTRIBUTE_KEY_ALIASES = {
  STR: "STR",
  END: "END",
  PER: "PER",
  AGI: "AGI",
  INT: "INT",
  CHA: "CHA",
  LCK: "LCK",
};

export const getCanonicalAttributeKey = (key) => ATTRIBUTE_KEY_ALIASES[key] || null;

const logKeyValueError = (key) => {
};

export const getAttributeLabel = (key) => {
  const canonical = getCanonicalAttributeKey(key);
  if (!canonical) {
    logKeyValueError(key);
    return "key value error";
  }
  return tCharacterScreen(`attributes.${canonical}`, canonical);
};

export const normalizeAttributeMap = (attributeMap = {}) =>
  Object.entries(attributeMap).reduce((acc, [key, value]) => {
    const canonical = getCanonicalAttributeKey(key);
    if (canonical) {
      acc[canonical] = value;
    } else {
      logKeyValueError(key);
    }
    return acc;
  }, {});

export const getAttributeValue = (attributes = [], key) => {
  const canonical = getCanonicalAttributeKey(key);
  if (!canonical) {
    logKeyValueError(key);
    return null;
  }

  const found = attributes.find(
    (attr) => getCanonicalAttributeKey(attr.name) === canonical,
  );

  return found?.value ?? 0;
};
