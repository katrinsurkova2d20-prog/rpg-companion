import { getWeaponById, getWeaponModById, getAmmoById, getItemByName } from '../../../db/Database';
import { resolveRandomLoot } from '../CharacterScreen/logic/RandomLootLogic';
import { evaluateFormula } from '../CharacterScreen/logic/Calculator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Вычисляет количество патронов по формуле вида "6+3fn{CD}<ammo>" или "(6+(3<cd>))<ammo>"
 * и возвращает обогащённый объект патрона.
 */
function resolveAmmoQuantity(formula, ammo) {
  try {
    // Убираем тег <...> в конце перед вычислением
    const cleanFormula = formula.replace(/<\w+>$/, '').trim();
    const quantity = evaluateFormula(cleanFormula);
    return {
      name: ammo.name,
      Название: ammo.name,
      quantity,
      type: 'ammo',
      Цена: ammo.cost,
      Редкость: ammo.rarity,
    };
  } catch (e) {
    return null;
  }
}

// ─── 2.1 resolveWeaponItem ────────────────────────────────────────────────────

/**
 * Async. Принимает элемент комплекта с `weaponId`, разрешает оружие, моды и патроны
 * через базу данных. При любом null из БД — логирует предупреждение и возвращает
 * fallback без краша.
 */
export async function resolveWeaponItem(item) {
  const weapon = await getWeaponById(item.weaponId);

  if (!weapon) {
    return {
      ...item,
      displayName: item.weaponId,
      name: item.weaponId,
      itemType: 'weapon',
      _weapon: null,
      _mods: [],
      resolvedAmmunition: null,
    };
  }

  // Разрешаем моды
  const mods = [];
  for (const modId of (item.modIds || [])) {
    const mod = await getWeaponModById(modId);
    if (mod) {
      mods.push(mod);
    } else {
    }
  }

  // Формируем displayName: prefix1 prefix2 BaseName
  const prefixes = mods.map(m => m.prefix).filter(Boolean);
  const displayName = [...prefixes, weapon.name].join(' ');

  // Разрешаем патроны
  let resolvedAmmunition = null;
  if (item.ammunition && weapon.ammo_id) {
    const ammo = await getAmmoById(weapon.ammo_id);
    if (ammo) {
      resolvedAmmunition = resolveAmmoQuantity(item.ammunition, ammo);
    } else {
    }
  }

  return {
    ...item,
    _weapon: weapon,
    _mods: mods,
    displayName,
    name: displayName,
    itemType: 'weapon',
    resolvedAmmunition,
  };
}

// ─── 2.2 resolveNonWeaponItem ─────────────────────────────────────────────────

// Теги валют — результат вычисления формулы становится количеством
const CURRENCY_TAGS = {
  caps: { name: 'Крышки', itemType: 'currency' },
  нкр:  { name: 'Доллары НКР', itemType: 'currency_ncr' },
};

/**
 * Async. Принимает элемент комплекта с `name`.
 *
 * Обрабатывает:
 *   - "[формула]<тег_лута>"  → resolveRandomLoot (один предмет или массив)
 *   - "[формула]<caps>"      → крышки с вычисленным количеством
 *   - "[формула]<нкр>"       → доллары НКР с вычисленным количеством
 *   - "N<caps>"              → фиксированные крышки (legacy)
 *   - Устаревший "N+Mfn{CD} label" → вычисляет количество
 *   - Иначе → поиск в БД
 */
export async function resolveNonWeaponItem(item) {
  if (!item.name) return item;

  // Формат [формула]<тег>
  const tagMatch = item.name.match(/^(.*?)<(\w+)>$/i);
  if (tagMatch) {
    const formula = tagMatch[1].trim();
    const tag = tagMatch[2].toLowerCase();

    // Тег валюты — вычисляем количество
    if (CURRENCY_TAGS[tag]) {
      const { name, itemType } = CURRENCY_TAGS[tag];
      const quantity = formula ? evaluateFormula(formula) : 1;
      return { ...item, name, Название: name, quantity, itemType };
    }

    // Тег лута — разрешаем через RandomLoot
    try {
      const resolved = await resolveRandomLoot(item.name);
      if (resolved) {
        // resolveRandomLoot может вернуть массив (d20,d20<food>)
        if (Array.isArray(resolved)) {
          // Возвращаем первый элемент — остальные обрабатываются в resolveKitItems
          return { ...resolved[0], _extraItems: resolved.slice(1) };
        }
        return { ...resolved, quantity: resolved.quantity || 1 };
      }
    } catch (e) {
    }
    return item;
  }

  // Устаревший формат "N+Mfn{CD} label" или "NdM label" — обратная совместимость
  const legacyCurrencyMatch = item.name.match(/^([\d+fn{CD}\s<>cd]+)\s+(.+)$/i);
  if (legacyCurrencyMatch) {
    const formulaPart = legacyCurrencyMatch[1].trim();
    const label = legacyCurrencyMatch[2].trim();
    try {
      const quantity = evaluateFormula(formulaPart);
      if (quantity > 0) {
        return { ...item, name: label, Название: label, quantity, itemType: item.itemType || 'currency_ncr' };
      }
    } catch (_) { /* не формула — продолжаем */ }
  }

  // Поиск в БД
  try {
    const dbItem = await getItemByName(item.name);
    if (dbItem) {
      return {
        ...item,
        ...dbItem,
        Название: dbItem.name,
        itemType: dbItem.item_type || item.itemType,
        weight: dbItem.weight,
        price: dbItem.price,
      };
    }
    return { ...item, Название: item.name };
  } catch (e) {
    return { ...item, Название: item.name };
  }
}

// ─── 2.3 resolveKitItems ──────────────────────────────────────────────────────

/**
 * Async. Принимает объект комплекта снаряжения (kit) и разрешает все предметы
 * во всех категориях (weapons, armor, clothing, miscellaneous, chems и др.).
 *
 * Для каждого элемента:
 *   - если есть `weaponId` → resolveWeaponItem
 *   - иначе → resolveNonWeaponItem
 * Для `type: 'choice'` — разрешает каждый option аналогично.
 *
 * Возвращает новый объект комплекта с разрешёнными предметами.
 */
export async function resolveKitItems(kit) {
  // Категории, которые могут содержать предметы
  const ITEM_CATEGORIES = ['weapons', 'armor', 'clothing', 'miscellaneous', 'chems'];

  async function resolveItem(item) {
    if (item.weaponId) {
      return resolveWeaponItem(item);
    }
    return resolveNonWeaponItem(item);
  }

  async function resolveEntry(entry) {
    if (entry.type === 'choice' && Array.isArray(entry.options)) {
      const resolvedOptions = await Promise.all(entry.options.map(resolveItem));
      return { ...entry, options: resolvedOptions };
    }
    // type: 'fixed' или без type
    const resolved = await resolveItem(entry);
    return resolved;
  }

  const resolvedKit = { ...kit };

  for (const category of ITEM_CATEGORIES) {
    if (Array.isArray(kit[category])) {
      const entries = await Promise.all(kit[category].map(resolveEntry));
      // Разворачиваем _extraItems (результат d20,d20<tag> — несколько предметов)
      const flat = [];
      for (const entry of entries) {
        if (entry._extraItems) {
          const { _extraItems, ...main } = entry;
          flat.push(main, ..._extraItems);
        } else {
          flat.push(entry);
        }
      }
      resolvedKit[category] = flat;
    }
  }

  return resolvedKit;
}
