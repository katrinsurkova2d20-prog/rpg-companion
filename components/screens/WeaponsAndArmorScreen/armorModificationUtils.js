const DEFAULT_EFFECTS = { bonusEffects: [], rules: [] };

const normalizeModifierValue = (mod) => {
  if (!mod) return 0;
  const sign = mod.op === '-' ? -1 : 1;
  return sign * Number(mod.value || 0);
};

export const applyArmorModToItem = (armorItem, mod) => {
  if (!armorItem || !mod) return armorItem;
  const next = { ...armorItem };
  next['Физ.СУ'] = Number(next['Физ.СУ'] || 0) + normalizeModifierValue(mod.statModifiers?.physicalDamageRating);
  next['Энрг.СУ'] = Number(next['Энрг.СУ'] || 0) + normalizeModifierValue(mod.statModifiers?.energyDamageRating);
  next['Рад.СУ'] = Number(next['Рад.СУ'] || 0) + normalizeModifierValue(mod.statModifiers?.radiationDamageRating);
  next.weight = Number(next.weight || next['Вес'] || 0) + normalizeModifierValue(mod.weightModifier);
  next.price = Number(next.price || next['Цена'] || 0) + normalizeModifierValue(mod.costModifier);
  next.appliedArmorModsMeta = [...(next.appliedArmorModsMeta || []), mod];
  return next;
};

export const applyArmorMods = (armorItem, catalog) => {
  if (!armorItem) return { item: armorItem, effects: DEFAULT_EFFECTS };

  const stdModId = armorItem.appliedArmorModId || armorItem.appliedArmorMod?.id;
  const uniqModId = armorItem.appliedUniqueArmorModId || armorItem.appliedUniqueArmorMod?.id;

  const allStd = Array.isArray(catalog?.armorMods) ? catalog.armorMods : [];
  const allUniq = Array.isArray(catalog?.uniqArmorMods) ? catalog.uniqArmorMods : [];
  const stdMod = stdModId ? allStd.find((m) => m.id === stdModId) : (armorItem.appliedArmorMod || null);
  const uniqMod = uniqModId ? allUniq.find((m) => m.id === uniqModId) : (armorItem.appliedUniqueArmorMod || null);

  const used = [stdMod, uniqMod].filter(Boolean).slice(0, 2);
  let modified = { ...armorItem };
  used.forEach((m) => {
    modified = applyArmorModToItem(modified, m);
  });

  const bonusEffects = [];
  used.forEach((m) => {
    (m.specialEffects || []).forEach((effect) => {
      const baseRule = catalog?.armorEffects?.[effect.id];
      bonusEffects.push({ ...baseRule, ...effect, sourceModId: m.id });
    });
  });

  return { item: modified, effects: { bonusEffects, rules: bonusEffects } };
};
