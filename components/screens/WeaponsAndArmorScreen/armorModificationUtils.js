const DEFAULT_EFFECTS = { bonusEffects: [], rules: [] };

const normalizeModifierValue = (mod) => {
  if (!mod) return 0;
  const sign = mod.op === '-' ? -1 : 1;
  return sign * Number(mod.value || 0);
};

export const formatModBonuses = (mod, labels = {}) => {
  const improvementsLabel = labels.improvements || 'Improvements';
  const effectsLabel = labels.effects || 'Effects';
  const p = normalizeModifierValue(mod?.statModifiers?.physicalDamageRating);
  const e = normalizeModifierValue(mod?.statModifiers?.energyDamageRating);
  const r = normalizeModifierValue(mod?.statModifiers?.radiationDamageRating);
  const effectsText = (mod?.specialEffects || []).map((x) => x.description).filter(Boolean).join(' | ');
  return {
    bonuses: `${improvementsLabel}: ${p >= 0 ? '+' : ''}${p} Phys. DR; ${e >= 0 ? '+' : ''}${e} Energy DR; ${r >= 0 ? '+' : ''}${r} Rad. DR`,
    effects: effectsText ? `${effectsLabel}: ${effectsText}` : `${effectsLabel}: —`,
  };
};

export const applyArmorModToItem = (armorItem, mod) => {
  if (!armorItem || !mod) return armorItem;
  const next = { ...armorItem };
  next.physicalDamageRating = Number(next.physicalDamageRating || 0) + normalizeModifierValue(mod.statModifiers?.physicalDamageRating);
  next.energyDamageRating = Number(next.energyDamageRating || 0) + normalizeModifierValue(mod.statModifiers?.energyDamageRating);
  next.radiationDamageRating = Number(next.radiationDamageRating || 0) + normalizeModifierValue(mod.statModifiers?.radiationDamageRating);
  next.weight = Number(next.weight || 0) + normalizeModifierValue(mod.weightModifier);
  next.cost = Number(next.cost || 0) + normalizeModifierValue(mod.costModifier);
  next.appliedArmorModsMeta = [...(next.appliedArmorModsMeta || []), mod];
  return next;
};

export const applyArmorMods = (armorItem, catalog, opts = {}) => {
  if (!armorItem) return { item: armorItem, effects: DEFAULT_EFFECTS };

  const stdKey = opts.standardKey || 'appliedArmorModId';
  const uniqKey = opts.uniqueKey || 'appliedUniqueArmorModId';
  const stdModId = armorItem[stdKey] || armorItem.appliedArmorMod?.id;
  const uniqModId = armorItem[uniqKey] || armorItem.appliedUniqueArmorMod?.id;

  const allStd = Array.isArray(opts.standardMods) ? opts.standardMods : (Array.isArray(catalog?.armorMods) ? catalog.armorMods : []);
  const allUniq = Array.isArray(opts.uniqueMods) ? opts.uniqueMods : (Array.isArray(catalog?.uniqArmorMods) ? catalog.uniqArmorMods : []);
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
