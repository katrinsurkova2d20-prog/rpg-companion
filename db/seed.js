import { runBatch, getFirst, runQuery } from './Database';
import { SCHEMA_VERSION } from './schema';
import perksData from '../assets/Perks/perks.json';
import { getEquipmentCatalog } from '../i18n/equipmentCatalog';
import { getCurrentLocale } from '../i18n/locale';

function safeStr(v) {
  if (v === null || v === undefined) return null;
  return String(v);
}

function safeNum(v) {
  if (v === null || v === undefined || v === '—' || v === '-') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function slugify(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_').replace(/_+/g, '_').slice(0, 40);
}

async function clearTable(tableName) {
  await runQuery(`DELETE FROM ${tableName}`, []);
}

async function seedWeapons(equipmentCatalog) {
  const { weapons: weaponsData } = equipmentCatalog;
  await clearTable('weapons');
  const statements = weaponsData.map(w => ({
    sql: `INSERT OR REPLACE INTO weapons
      (id, name, weapon_type, damage, damage_effects, damage_type, fire_rate, qualities,
       weight, cost, rarity, ammo_id, range, range_name, main_attr, main_skill, rules, flavour)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      w.id,
      w.name || w.Name || '',
      w.weaponType || w.weapon_type || w['Weapon Type'] || '',
      safeNum(w.damage ?? w['Damage Rating']),
      safeStr(w.damage_effects ?? w.damageEffects ?? w['Damage Effects']),
      safeStr(w.damage_type ?? w.damageType ?? w['Damage Type']),
      safeStr(w.fire_rate ?? w.fireRate ?? w['Rate of Fire']),
      safeStr(w.qualities ?? w['Qualities']),
      safeStr(w.weight ?? w['Weight']),
      safeStr(w.cost ?? w['Cost']),
      safeStr(w.rarity ?? w['Rarity']),
      safeStr(w.ammo_id ?? w.ammoId ?? w['Ammo']),
      safeStr(w.range ?? w['Range']),
      safeStr(w.range_name ?? w.rangeName ?? w['range name']),
      safeStr(w.main_attr ?? w.mainAttr ?? w['main_attr']),
      safeStr(w.main_skill ?? w.mainSkill ?? w['main_skill']),
      safeStr(w.rules ?? w['Rules']),
      safeStr(w.flavour ?? w['Flavour']),
    ],
  }));
  if (statements.length > 0) await runBatch(statements);
}

async function seedWeaponMods(equipmentCatalog) {
  const { weaponMods: weaponModsData } = equipmentCatalog;
  await clearTable('weapon_mods');
  const statements = weaponModsData.map(m => ({
    sql: `INSERT OR REPLACE INTO weapon_mods
      (id, name, prefix, slot, complexity, perk_1, perk_2, skill, rarity, materials,
       cost, effects, effect_description, weight, applies_to_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      m.id,
      m.Name || '',
      safeStr(m.Prefix),
      m.Slot || '',
      safeNum(m.Complexity),
      safeStr(m['Perk 1']),
      safeStr(m['Perk 2']),
      safeStr(m.Skill),
      safeStr(m.Rarity),
      safeStr(m.Materials),
      safeNum(m.Cost),
      safeStr(m.Effects),
      safeStr(m.EffectDescription),
      safeStr(m.Weight),
      m.applies_to_ids ? JSON.stringify(m.applies_to_ids) : null,
    ],
  }));
  if (statements.length > 0) await runBatch(statements);
}

async function seedWeaponModSlots(equipmentCatalog) {
  const { modsOverrides: modsOverridesData } = equipmentCatalog;
  await clearTable('weapon_mod_slots');
  const statements = [];
  for (const [weaponId, slots] of Object.entries(modsOverridesData)) {
    for (const [slot, modIds] of Object.entries(slots)) {
      for (const modId of modIds) {
        statements.push({
          sql: `INSERT OR REPLACE INTO weapon_mod_slots (weapon_id, slot, mod_id) VALUES (?, ?, ?)`,
          params: [weaponId, slot, modId],
        });
      }
    }
  }
  if (statements.length > 0) await runBatch(statements);
}

async function seedAmmoTypes(equipmentCatalog) {
  const { ammoTypes: ammoTypesData } = equipmentCatalog;
  await clearTable('ammo_types');
  const statements = ammoTypesData.map(a => ({
    sql: `INSERT OR REPLACE INTO ammo_types (id, name, rarity, cost) VALUES (?, ?, ?, ?)`,
    params: [a.id, a.name, safeStr(a.rarity), safeStr(a.cost)],
  }));
  if (statements.length > 0) await runBatch(statements);
}

async function seedQualities(equipmentCatalog) {
  const { qualities: qualitiesData } = equipmentCatalog;
  await clearTable('weapon_qualities');
  const statements = qualitiesData.map(q => ({
    sql: `INSERT OR REPLACE INTO weapon_qualities (id, name, effect, opposite) VALUES (?, ?, ?, ?)`,
    params: [q.id, q.Name || '', safeStr(q.Effect), safeStr(q.Opposite)],
  }));
  if (statements.length > 0) await runBatch(statements);
}

async function seedPerks() {
  await clearTable('perks');
  const statements = perksData.map(perk => ({
    sql: `INSERT INTO perks (perk_name, rank, max_rank, requirements, description, level_increase)
          VALUES (?, ?, ?, ?, ?, ?)`,
    params: [
      perk.perk_name,
      perk.rank || 1,
      perk.max_rank || 1,
      perk.requirements ? JSON.stringify(perk.requirements) : null,
      perk.description || '',
      perk.level_increase ?? null,
    ],
  }));
  if (statements.length > 0) await runBatch(statements);
}

async function seedItems(equipmentCatalog) {
  const {
    armorList,
    clothes: clothesData,
    chems: chemsData,
    miscellaneous: miscData,
  } = equipmentCatalog;
  await clearTable('items');
  const statements = [];

  const addItem = (item, itemType, category = null, subtype = null) => {
    const name = item.Name || item.name || item['Название'] || '';
    const id = itemType + '_' + slugify(name) + (category ? '_' + slugify(category) : '');
    statements.push({
      sql: `INSERT OR REPLACE INTO items
        (id, name, item_type, item_subtype, phys_dr, energy_dr, rad_dr, protected_area,
         clothing_type, find_formula, weight, price, rarity, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        id, name, itemType, subtype,
        safeNum(item['Физ.СУ']), safeNum(item['Энрг.СУ']), safeNum(item['Рад.СУ']),
        safeStr(item['protected_area']), safeStr(item['clothingType']),
        safeStr(item['find_formula']),
        safeStr(item['weight'] ?? item['Вес']),
        safeStr(item['price'] ?? item['Цена']),
        safeStr(item['rarity'] ?? item['Редкость']),
        category,
      ],
    });
  };

  (armorList || []).forEach(item => addItem(item, 'armor', item.category || item.armorCategoryKey || null));
  clothesData.clothes.forEach(group => group.items.forEach(item => addItem(item, 'clothing', group.type, item.clothingType)));
  chemsData.forEach(item => {
    const name = item['Название'] || '';
    statements.push({
      sql: `INSERT OR REPLACE INTO items (id, name, item_type, weight, price, rarity) VALUES (?, ?, ?, ?, ?, ?)`,
      params: ['chem_' + slugify(name), name, 'chem', safeStr(item['Вес']), safeStr(item['Цена']), safeStr(item['Редкость'])],
    });
  });
  miscData.miscellaneous.forEach(group => group.items.forEach(item => addItem(item, item.itemType || 'misc', group.type)));

  if (statements.length > 0) await runBatch(statements);
}

export async function seedDatabase(isFirstRun) {
  const currentLocale = getCurrentLocale();
  const equipmentCatalog = getEquipmentCatalog(currentLocale);

  const seededRow = await getFirst(
    "SELECT value FROM schema_meta WHERE key = 'seeded_version'",
    []
  );
  const localeRow = await getFirst(
    "SELECT value FROM schema_meta WHERE key = 'seeded_locale'",
    []
  );
  const seededVersion = seededRow ? Number(seededRow.value) : 0;
  const seededLocale = localeRow?.value || null;

  const shouldReseedForVersion = seededVersion < SCHEMA_VERSION;
  const shouldReseedForLocale = seededLocale !== currentLocale;

  if (!isFirstRun && !shouldReseedForVersion && !shouldReseedForLocale) return;

  await Promise.all([
    seedWeapons(equipmentCatalog),
    seedWeaponMods(equipmentCatalog),
    seedWeaponModSlots(equipmentCatalog),
    seedAmmoTypes(equipmentCatalog),
    seedQualities(equipmentCatalog),
    seedPerks(),
    seedItems(equipmentCatalog),
  ]);

  const existing = await getFirst("SELECT key FROM schema_meta WHERE key = 'seeded_version'", []);
  if (existing) {
    await runQuery("UPDATE schema_meta SET value = ? WHERE key = 'seeded_version'", [String(SCHEMA_VERSION)]);
  } else {
    await runQuery("INSERT INTO schema_meta (key, value) VALUES ('seeded_version', ?)", [String(SCHEMA_VERSION)]);
  }

  const localeExisting = await getFirst("SELECT key FROM schema_meta WHERE key = 'seeded_locale'", []);
  if (localeExisting) {
    await runQuery("UPDATE schema_meta SET value = ? WHERE key = 'seeded_locale'", [currentLocale]);
  } else {
    await runQuery("INSERT INTO schema_meta (key, value) VALUES ('seeded_locale', ?)", [currentLocale]);
  }
}
