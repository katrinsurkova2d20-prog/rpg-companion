import ruWeapons from './ru-RU/weapons.json';
import ruWeaponMods from './ru-RU/weapon_mods.json';
import ruAmmoTypes from './ru-RU/ammo_types.json';
import ruQualities from './ru-RU/qualities.json';
import ruModsOverrides from './ru-RU/mods_overrides.json';
import ruArmor from './ru-RU/armor.json';
import ruArmorMods from './ru-RU/armor_mods.json';
import ruUniqArmorMods from './ru-RU/uniq_armor_mods.json';
import ruArmorEffects from './ru-RU/armor_effects.json';
import ruClothes from './ru-RU/Clothes.json';
import ruChems from './ru-RU/chems.json';
import ruDrinks from './ru-RU/drinks.json';
import ruMisc from './ru-RU/miscellaneous.json';
import ruAmmoData from './ru-RU/ammoData.json';
import ruRobotWeapons from './ru-RU/robotWeapons.json';
import ruRobotArmor from './ru-RU/robotArmor.json';
import ruRobotModules from './ru-RU/robotModules.json';
import ruRobotItems from './ru-RU/robotItems.json';
import ruRobotPartsUpgrade from './ru-RU/robotPartsUpgrade.json';

import enWeapons from './en-EN/weapons.json';
import enWeaponMods from './en-EN/weapon_mods.json';
import enAmmoTypes from './en-EN/ammo_types.json';
import enQualities from './en-EN/qualities.json';
import enModsOverrides from './en-EN/mods_overrides.json';
import enArmor from './en-EN/armor.json';
import enArmorMods from './en-EN/armor_mods.json';
import enUniqArmorMods from './en-EN/uniq_armor_mods.json';
import enArmorEffects from './en-EN/armor_effects.json';
import enClothes from './en-EN/Clothes.json';
import enChems from './en-EN/chems.json';
import enDrinks from './en-EN/drinks.json';
import enMisc from './en-EN/miscellaneous.json';
import enAmmoData from './en-EN/ammoData.json';
import enRobotWeapons from './en-EN/robotWeapons.json';
import enRobotArmor from './en-EN/robotArmor.json';
import enRobotModules from './en-EN/robotModules.json';
import enRobotItems from './en-EN/robotItems.json';
import enRobotPartsUpgrade from './en-EN/robotPartsUpgrade.json';

import {
  flattenArmorCatalog,
  groupArmorForPicker,
  normalizeClothesCatalog,
  buildArmorIndex,
  normalizeWeaponsCatalog,
} from './equipmentNormalizer';
import { getCurrentLocale, normalizeLocale } from './locale';

const EQUIPMENT_BY_LOCALE = {
  'ru-RU': {
    weapons: ruWeapons,
    weaponMods: ruWeaponMods,
    ammoTypes: ruAmmoTypes,
    qualities: ruQualities,
    modsOverrides: ruModsOverrides,
    armor: ruArmor,
    armorMods: ruArmorMods,
    uniqArmorMods: ruUniqArmorMods,
    armorEffects: ruArmorEffects,
    clothes: ruClothes,
    chems: ruChems,
    drinks: ruDrinks,
    miscellaneous: ruMisc,
    ammoData: ruAmmoData,
    robotWeapons: ruRobotWeapons,
    robotArmor: ruRobotArmor,
    robotModules: ruRobotModules,
    robotItems: ruRobotItems,
    robotPartsUpgrade: ruRobotPartsUpgrade,
  },
  'en-EN': {
    weapons: enWeapons,
    weaponMods: enWeaponMods,
    ammoTypes: enAmmoTypes,
    qualities: enQualities,
    modsOverrides: enModsOverrides,
    armor: enArmor,
    armorMods: enArmorMods,
    uniqArmorMods: enUniqArmorMods,
    armorEffects: enArmorEffects,
    clothes: enClothes,
    chems: enChems,
    drinks: enDrinks,
    miscellaneous: enMisc,
    ammoData: enAmmoData,
    robotWeapons: enRobotWeapons,
    robotArmor: enRobotArmor,
    robotModules: enRobotModules,
    robotItems: enRobotItems,
    robotPartsUpgrade: enRobotPartsUpgrade,
  },
};

const validateConsumablesContract = (items, allowedTypes, fallbackType) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const normalizedType = item.itemType === 'chems' ? 'chem' : item.itemType;
      const finalType = allowedTypes.includes(normalizedType) ? normalizedType : fallbackType;
      return {
        ...item,
        itemType: finalType,
        Name: item.Name || item.name,
        Название: item.Название || item.name || item.Name,
      };
    })
    .filter((item) => typeof item.Name === 'string' && allowedTypes.includes(item.itemType));
};

export const getEquipmentCatalog = (locale = getCurrentLocale()) => {
  const normalized = normalizeLocale(locale);
  const baseCatalog = EQUIPMENT_BY_LOCALE[normalized] || EQUIPMENT_BY_LOCALE['ru-RU'];
  const armorPickerGroups = groupArmorForPicker(baseCatalog.armor);
  const normalizedClothes = normalizeClothesCatalog(baseCatalog.clothes);
  const normalizedWeapons = normalizeWeaponsCatalog([...(baseCatalog.weapons || []), ...(baseCatalog.robotWeapons || [])]);
  const mergedArmorRaw = {
    armor: [
      ...(groupArmorForPicker(baseCatalog.armor || {}).map((g) => ({ ...g }))),
      ...((baseCatalog.robotArmor && Array.isArray(baseCatalog.robotArmor.armor)) ? baseCatalog.robotArmor.armor : []),
    ],
  };

  return {
    ...baseCatalog,
    weapons: normalizedWeapons,
    armorRaw: mergedArmorRaw,
    armor: { armor: [...armorPickerGroups, ...((baseCatalog.robotArmor && Array.isArray(baseCatalog.robotArmor.armor)) ? baseCatalog.robotArmor.armor : [])] },
    armorList: flattenArmorCatalog(mergedArmorRaw),
    armorIndex: buildArmorIndex(mergedArmorRaw),
    clothes: { clothes: normalizedClothes },
    chems: validateConsumablesContract(baseCatalog.chems, ['chem'], 'chem'),
    drinks: validateConsumablesContract(baseCatalog.drinks, ['drinks'], 'drinks'),
    robotModules: Array.isArray(baseCatalog.robotModules) ? baseCatalog.robotModules : [],
    robotItems: Array.isArray(baseCatalog.robotItems) ? baseCatalog.robotItems : [],
    robotPartsUpgrade: Array.isArray(baseCatalog.robotPartsUpgrade) ? baseCatalog.robotPartsUpgrade : [],
  };
};
