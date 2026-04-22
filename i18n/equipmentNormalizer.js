const AREA_LABELS_RU = {
  Head: 'Голова',
  Body: 'Тело',
  Hand: 'Рука',
  Leg: 'Нога',
};

const normalizeProtectedArea = (areas = []) => {
  const labels = (areas || []).map((area) => AREA_LABELS_RU[area] || area).filter(Boolean);
  if (labels.includes('Рука') && labels.includes('Нога') && labels.includes('Тело')) {
    return 'Руки, Ноги, Тело';
  }
  return labels.join(', ');
};

const toLegacyArmor = (piece, categoryName, tierName, categoryKey) => ({
  ...piece,
  Name: piece.name,
  Название: piece.name,
  category: categoryName,
  tierName,
  armorCategoryKey: categoryKey,
  'Физ.СУ': Number(piece.physicalDamageRating || 0),
  'Энрг.СУ': Number(piece.energyDamageRating || 0),
  'Рад.СУ': Number(piece.radiationDamageRating || 0),
  protected_area: normalizeProtectedArea(piece.protectedAreas),
  price: piece.cost,
});

export const flattenArmorCatalog = (rawArmor) => {
  if (!rawArmor) return [];
  if (Array.isArray(rawArmor?.armor)) {
    return rawArmor.armor.flatMap((group) =>
      (group.items || []).map((item) => ({ ...item, Name: item.Name || item.name, Название: item.Название || item.name || item.Name })),
    );
  }

  return Object.entries(rawArmor).flatMap(([categoryKey, category]) => {
    const categoryName = category?.categoryName || categoryKey;
    return Object.entries(category?.tiers || {}).flatMap(([tierKey, tier]) =>
      (tier?.pieces || []).map((piece) =>
        toLegacyArmor(piece, categoryName, tier?.tierName || tierKey, categoryKey),
      ),
    );
  });
};

export const groupArmorForPicker = (rawArmor) => {
  if (Array.isArray(rawArmor?.armor)) return rawArmor.armor;
  const grouped = {};
  Object.entries(rawArmor || {}).forEach(([categoryKey, category]) => {
    const name = category?.categoryName || categoryKey;
    grouped[name] = flattenArmorCatalog({ [categoryKey]: category }).map((item) => ({ ...item, itemType: 'armor' }));
  });
  return Object.entries(grouped).map(([type, items]) => ({ type, items }));
};

export const normalizeClothesCatalog = (rawClothes) => {
  if (Array.isArray(rawClothes?.clothes)) {
    return rawClothes.clothes.map((group) => ({
      ...group,
      items: (group.items || []).map((item) => ({
        ...item,
        Name: item.Name || item.name,
        Название: item.Название || item.name || item.Name,
      })),
    }));
  }

  if (rawClothes && Array.isArray(rawClothes.items)) {
    return [{ type: rawClothes.type || 'Одежда', items: rawClothes.items }];
  }

  if (rawClothes && typeof rawClothes === 'object') {
    return Object.entries(rawClothes).flatMap(([groupKey, group]) => {
      if (Array.isArray(group)) {
        return [{
          type: groupKey,
          items: group.map((item) => ({
            ...item,
            itemType: item.itemType || 'clothing',
            Name: item.Name || item.name,
            Название: item.Название || item.name || item.Name,
          })),
        }];
      }

      if (!group || !Array.isArray(group.items)) return [];
      const type = group.categoryName || group.type || groupKey;
      const defaultItemType = group.itemType || 'clothing';
      const defaultClothingType = group.clothingType || null;
      const defaultAllowsArmor = typeof group.allowsArmor === 'boolean'
        ? group.allowsArmor
        : defaultClothingType === 'suit';

      return [{
        type,
        items: group.items.map((item) => ({
          ...item,
          itemType: item.itemType || defaultItemType,
          clothingType: item.clothingType || defaultClothingType,
          allowsArmor: typeof item.allowsArmor === 'boolean' ? item.allowsArmor : defaultAllowsArmor,
          Name: item.Name || item.name,
          Название: item.Название || item.name || item.Name,
        })),
      }];
    });
  }

  return [];
};

export const buildArmorIndex = (rawArmor) => {
  const byId = new Map();
  const byName = new Map();
  flattenArmorCatalog(rawArmor).forEach((item) => {
    if (item.id) byId.set(item.id, item);
    const nm = item.Name || item.Название || item.name;
    if (nm) byName.set(nm, item);
  });
  return { byId, byName };
};

const WEAPON_TYPE_ALIASES = {
  'Small Guns': 'Light',
  'Стрелковое оружие': 'Light',
  Light: 'Light',
  'Energy Weapon': 'Energy',
  'Energy Weapons': 'Energy',
  Energy: 'Energy',
  'Big Guns': 'Heavy',
  Heavy: 'Heavy',
  'Melee Weapon': 'Melee',
  'Melee Weapons': 'Melee',
  Melee: 'Melee',
  Unarmed: 'Unarmed',
  Throwing: 'Thrown',
  Thrown: 'Thrown',
  Explosive: 'Explosive',
  Explosives: 'Explosive',
};

const normalizeWeaponType = (weaponType) => WEAPON_TYPE_ALIASES[weaponType] || weaponType || 'Other';

export const normalizeWeaponsCatalog = (rawWeapons) => {
  if (!Array.isArray(rawWeapons)) return [];

  return rawWeapons
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      ...item,
      itemType: 'weapon',
      name: item.name || item.Name || item['Название'] || '',
      Name: item.Name || item.name || item['Название'] || '',
      Название: item['Название'] || item.name || item.Name || '',
      weaponType: normalizeWeaponType(item.weaponType || item.weapon_type || item['Weapon Type']),
      weapon_type: normalizeWeaponType(item.weapon_type || item.weaponType || item['Weapon Type']),
      damage: Number(item.damage ?? item['Damage Rating'] ?? 0),
      damage_effects: item.damage_effects ?? item.damageEffects ?? item['Damage Effects'] ?? '',
      damage_type: item.damage_type ?? item.damageType ?? item['Damage Type'] ?? '',
      fire_rate: Number(item.fire_rate ?? item.fireRate ?? item['Rate of Fire'] ?? 0),
      qualities: item.qualities ?? item['Qualities'] ?? '',
      weight: item.weight ?? item['Weight'] ?? '',
      cost: Number(item.cost ?? item['Cost'] ?? 0),
      rarity: Number(item.rarity ?? item['Rarity'] ?? 0),
      ammo_id: item.ammo_id ?? item.ammoId ?? item['Ammo'] ?? '',
      range: item.range ?? item['Range'] ?? '',
      range_name: item.range_name ?? item.rangeName ?? item['range name'] ?? '',
      main_attr: item.main_attr ?? item.mainAttr ?? '',
      main_skill: item.main_skill ?? item.mainSkill ?? '',
      rules: item.rules ?? item['Rules'] ?? '',
      flavour: item.flavour ?? item['Flavour'] ?? '',
    }))
    .filter((item) => Boolean(item.id) && Boolean(item.name));
};
