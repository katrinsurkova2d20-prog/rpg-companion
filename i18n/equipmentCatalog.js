import ruWeapons from './ru-RU/weapons.json';
import ruWeaponMods from './ru-RU/weapon_mods.json';
import ruAmmoTypes from './ru-RU/ammo_types.json';
import ruQualities from './ru-RU/qualities.json';
import ruModsOverrides from './ru-RU/mods_overrides.json';
import ruArmor from './ru-RU/armor.json';
import ruClothes from './ru-RU/Clothes.json';
import ruChems from './ru-RU/chems.json';
import ruMisc from './ru-RU/miscellaneous.json';
import ruAmmoData from './ru-RU/ammoData.json';

import enWeapons from './en-EN/weapons.json';
import enWeaponMods from './en-EN/weapon_mods.json';
import enAmmoTypes from './en-EN/ammo_types.json';
import enQualities from './en-EN/qualities.json';
import enModsOverrides from './en-EN/mods_overrides.json';
import enArmor from './en-EN/armor.json';
import enClothes from './en-EN/Clothes.json';
import enChems from './en-EN/chems.json';
import enMisc from './en-EN/miscellaneous.json';
import enAmmoData from './en-EN/ammoData.json';

import { getCurrentLocale, normalizeLocale } from './locale';

const EQUIPMENT_BY_LOCALE = {
  'ru-RU': {
    weapons: ruWeapons,
    weaponMods: ruWeaponMods,
    ammoTypes: ruAmmoTypes,
    qualities: ruQualities,
    modsOverrides: ruModsOverrides,
    armor: ruArmor,
    clothes: ruClothes,
    chems: ruChems,
    miscellaneous: ruMisc,
    ammoData: ruAmmoData,
  },
  'en-EN': {
    weapons: enWeapons,
    weaponMods: enWeaponMods,
    ammoTypes: enAmmoTypes,
    qualities: enQualities,
    modsOverrides: enModsOverrides,
    armor: enArmor,
    clothes: enClothes,
    chems: enChems,
    miscellaneous: enMisc,
    ammoData: enAmmoData,
  },
};

const validateChemsContract = (chems) => {
  if (!Array.isArray(chems)) {
    return [];
  }

  return chems.filter((item) => (
    item &&
    typeof item === 'object' &&
    typeof item.Name === 'string' &&
    item.itemType === 'chem'
  ));
};

export const getEquipmentCatalog = (locale = getCurrentLocale()) => {
  const normalized = normalizeLocale(locale);
  const baseCatalog = EQUIPMENT_BY_LOCALE[normalized] || EQUIPMENT_BY_LOCALE['ru-RU'];

  return {
    ...baseCatalog,
    chems: validateChemsContract(baseCatalog.chems),
  };
};
