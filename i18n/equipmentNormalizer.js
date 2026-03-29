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
