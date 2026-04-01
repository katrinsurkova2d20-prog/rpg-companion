import { getWeaponById, getWeaponModById, getAmmoById, getItemByName } from '../../../db/Database';
import { resolveRandomLoot } from '../CharacterScreen/logic/RandomLootLogic';
import { evaluateFormula } from '../CharacterScreen/logic/Calculator';
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

const toNumber = (value) => Number.isFinite(value) ? value : Number(value) || 0;

const resolveRollQuantity = (quantity = {}) => {
  const base = toNumber(quantity.base);
  if (quantity.rollType === 'rollCD' && quantity.rollValue) {
    const op = quantity.op === '-' ? '-' : '+';
    return evaluateFormula(`${base}${op}${toNumber(quantity.rollValue)}fn{CD}`);
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

  const ammo = await getAmmoById(ammoId);
  if (!ammo) return null;

  const quantity = resolveRollQuantity(ammoSpec.quantity);
  return {
    name: ammo.name,
    Название: ammo.name,
    quantity,
    type: 'ammo',
    itemType: 'ammo',
    Цена: ammo.cost,
    Редкость: ammo.rarity,
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
      ...(catalog?.miscellaneous || []),
      ...(catalog?.chems || []),
      ...(catalog?.drinks || []),
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
  const weapon = await getWeaponById(item.weaponId);
  if (!weapon) {
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
    const mod = await getWeaponModById(modId);
    if (mod) mods.push(mod);
  }

  const prefixes = mods.map((mod) => mod.prefix).filter(Boolean);
  const displayName = [...prefixes, weapon.name].join(' ');
  const resolvedAmmunition = await resolveAmmoObject(item.ammo, weapon.ammo_id);

  return {
    ...item,
    _weapon: weapon,
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
    const resolved = await resolveRandomLoot(`${count}d20<${tableId}>`);
    if (Array.isArray(resolved)) {
      return { ...resolved[0], _extraItems: resolved.slice(1), itemType: 'loot' };
    }
    if (resolved) {
      return { ...resolved, itemType: 'loot' };
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
    const dbItem = await getItemByName(item.name);
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

  return {
    ...kit,
    items: flatEntries,
  };
}
