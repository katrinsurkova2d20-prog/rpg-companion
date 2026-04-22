import { getWeaponById, getWeaponModById, getAmmoById, getItemByName } from '../../../db/Database';
import { resolveRandomLootByRoll } from '../CharacterScreen/logic/RandomLootLogic';
import { evaluateRollConfig } from '../CharacterScreen/logic/Calculator';
import { getEquipmentCatalog } from '../../../i18n/equipmentCatalog';

const CURRENCY_NAMES = {
  currency: 'Крышки',
  currency_ncr: 'Доллары НКР',
};

const ROLL_TABLE_TAG = {
  food: 'food',
  trinklet: 'trinklet',
  brewery: 'brewery',
  chem: 'chem',
  outcast: 'outcast',
};
const MR_HANDY_BODY_ID = 'robot_body_mister_handy';

const toNumber = (value) => Number.isFinite(value) ? value : Number(value) || 0;
const safeDbCall = async (fn, ...args) => {
  try {
    return await fn(...args);
  } catch {
    return null;
  }
};

const flattenGroupedItems = (source) => {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== 'object') return [];
  return Object.values(source).flatMap((entry) => {
    if (Array.isArray(entry)) {
      return entry.flatMap((group) => (Array.isArray(group?.items) ? group.items : []));
    }
    if (Array.isArray(entry?.items)) return entry.items;
    return [];
  });
};

const resolveRollQuantity = (quantity = {}) => {
  const base = toNumber(quantity.base);
  if (quantity.rollType === 'rollCD' && quantity.rollValue) {
    const op = quantity.op === '-' ? '-' : '+';
    return evaluateRollConfig({ base, rollType: 'rollCD', rollValue: toNumber(quantity.rollValue), op });
  }
  return base;
};

const resolveTableRollCount = (roll = {}) => {
  if (roll.rollType === 'D20' && roll.count) {
    return toNumber(roll.count);
  }
  return 1;
};

const resolveAmmoObject = async (ammoSpec, weaponAmmoId) => {
  if (!ammoSpec?.quantity) return null;
  const ammoId = ammoSpec.ammoId || weaponAmmoId;
  if (!ammoId) return null;

  const ammo = await safeDbCall(getAmmoById, ammoId);
  const catalog = getEquipmentCatalog();
  const fallbackAmmo = (catalog?.ammoTypes || []).find((entry) => entry.id === ammoId);
  const ammoData = ammo || fallbackAmmo;
  if (!ammoData) return null;

  const normalizedAmmoName = fallbackAmmo?.name || ammoData.name;
  const quantity = resolveRollQuantity(ammoSpec.quantity);
  return {
    name: normalizedAmmoName,
    Название: normalizedAmmoName,
    quantity,
    type: 'ammo',
    itemType: 'ammo',
    Цена: ammoData.cost,
    Редкость: ammoData.rarity,
  };
};

const resolveItemById = (item) => {
  const catalog = getEquipmentCatalog();

  if (item.armorId) {
    const found = catalog?.armorIndex?.byId?.get(item.armorId);
    if (found) {
      return {
        ...found,
        ...item,
        name: found.Name || found.name,
        Название: found.Название || found.Name || found.name,
        itemType: 'armor',
      };
    }
  }

  if (item.clothingId) {
    const allClothes = (catalog?.clothes?.clothes || []).flatMap((group) => group.items || []);
    const found = allClothes.find((entry) => entry.id === item.clothingId);
    if (found) {
      return {
        ...found,
        ...item,
        name: found.Name || found.name,
        Название: found.Название || found.Name || found.name,
        itemType: 'clothing',
      };
    }
  }

  if (item.itemId) {
    const all = [
      ...flattenGroupedItems(catalog?.miscellaneous),
      ...(catalog?.chems || []),
      ...(catalog?.drinks || []),
      ...(catalog?.robotModules || []),
      ...(catalog?.robotItems || []),
      ...(catalog?.robotPartsUpgrade || []),
    ];
    const found = all.find((entry) => entry.id === item.itemId);
    if (found) {
      return {
        ...found,
        ...item,
        name: found.Name || found.name,
        Название: found.Название || found.Name || found.name,
        itemType: item.itemType || found.itemType || 'misc',
      };
    }
  }

  return null;
};

export async function resolveWeaponItem(item) {
  const weapon = await safeDbCall(getWeaponById, item.weaponId);
  const catalog = getEquipmentCatalog();
  const fallbackWeapon = (catalog?.weapons || []).find((entry) => entry.id === item.weaponId);
  const weaponData = weapon || fallbackWeapon;
  if (!weaponData) {
    return {
      ...item,
      name: item.weaponId,
      Название: item.weaponId,
      itemType: 'weapon',
      _weapon: null,
      _mods: [],
      resolvedAmmunition: null,
    };
  }

  const mods = [];
  for (const modId of (item.modIds || [])) {
    const mod = await safeDbCall(getWeaponModById, modId);
    if (mod) mods.push(mod);
  }

  const prefixes = mods.map((mod) => mod.prefix).filter(Boolean);
  const weaponName = weaponData.name || weaponData.Name || item.weaponId;
  const displayName = [...prefixes, weaponName].join(' ');
  const resolvedAmmunition = await resolveAmmoObject(item.ammo, weaponData.ammo_id || weaponData.Ammo);

  return {
    ...item,
    _weapon: weaponData,
    _mods: mods,
    displayName,
    name: displayName,
    Название: displayName,
    itemType: 'weapon',
    resolvedAmmunition,
  };
}

export async function resolveNonWeaponItem(item) {
  if (item.type === 'rollTable') {
    const count = resolveTableRollCount(item.roll);
    const tableId = ROLL_TABLE_TAG[item.tableId] || item.tableId;
    const resolvedItems = await resolveRandomLootByRoll(tableId, count);
    if (resolvedItems.length > 1) {
      return { ...resolvedItems[0], _extraItems: resolvedItems.slice(1), itemType: 'loot' };
    }
    if (resolvedItems.length === 1) {
      return { ...resolvedItems[0], itemType: 'loot' };
    }
    return { ...item, name: `${count}d20<${tableId}>`, itemType: 'loot' };
  }

  const byId = resolveItemById(item);
  if (byId) return byId;

  if (item.itemType === 'currency' || item.itemType === 'currency_ncr') {
    const name = CURRENCY_NAMES[item.itemType] || 'Валюта';
    return {
      ...item,
      name,
      Название: name,
      quantity: toNumber(item.quantity || 0),
    };
  }

  if (item.name) {
    const dbItem = await safeDbCall(getItemByName, item.name);
    if (dbItem) {
      return {
        ...item,
        ...dbItem,
        name: dbItem.name,
        Название: dbItem.name,
        itemType: dbItem.item_type || item.itemType,
      };
    }
  }

  return { ...item, name: item.name || item.itemId || 'Неизвестный предмет', Название: item.name || item.itemId || 'Неизвестный предмет' };
}

async function resolveEntry(entry) {
  if (entry.type === 'choice') {
    const options = await Promise.all((entry.items || []).map(async (option) => {
      if (option.group) {
        const group = await Promise.all(option.group.map((groupItem) => (
          groupItem.weaponId ? resolveWeaponItem(groupItem) : resolveNonWeaponItem(groupItem)
        )));
        return { ...option, group };
      }
      return option.weaponId ? resolveWeaponItem(option) : resolveNonWeaponItem(option);
    }));
    return { ...entry, items: options };
  }

  return entry.weaponId ? resolveWeaponItem(entry) : resolveNonWeaponItem(entry);
}

export async function resolveKitItems(kit) {
  const entries = await Promise.all((kit.items || []).map(resolveEntry));

  const flatEntries = [];
  for (const entry of entries) {
    if (entry?._extraItems) {
      const { _extraItems, ...main } = entry;
      flatEntries.push(main, ..._extraItems);
    } else {
      flatEntries.push(entry);
    }
  }

  const withAutoRobotBody = [...flatEntries];
  const isMisterHandyKit = String(kit?.id || '').startsWith('mister_handy_');
  const hasMisterHandyBody = withAutoRobotBody.some((entry) => entry?.id === MR_HANDY_BODY_ID || entry?.itemId === MR_HANDY_BODY_ID);

  if (isMisterHandyKit && !hasMisterHandyBody) {
    const bodyPart = resolveItemById({
      type: 'fixed',
      itemId: MR_HANDY_BODY_ID,
      itemType: 'robotPart',
      hiddenInKitModal: true,
      quantity: 1,
      autoInjected: true,
    });
    if (bodyPart) {
      withAutoRobotBody.push(bodyPart);
    }
  }

  return {
    ...kit,
    items: withAutoRobotBody,
  };
}
