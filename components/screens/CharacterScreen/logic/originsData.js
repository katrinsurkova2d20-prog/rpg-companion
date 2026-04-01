import equipmentKitsData from '../../../../i18n/ru-RU/equipmentKits.json';

const ORIGIN_IMAGES = {
  brotherhood: require('../../../../assets/origins/brotherhood_of_steel.png'),
  ncr: require('../../../../assets/origins/ncr_citizen.png'),
  minuteman: require('../../../../assets/origins/minuteman.png'),
  childOfAtom: require('../../../../assets/origins/child_of_atom.png'),
  vaultDweller: require('../../../../assets/origins/vault_dweller.png'),
  protectron: require('../../../../assets/origins/protectron.png'),
  survivor: require('../../../../assets/origins/survivor.png'),
  securitron: require('../../../../assets/origins/securitron.png'),
  ghoul: require('../../../../assets/origins/ghoul.png'),
  assaultron: require('../../../../assets/origins/assaultron.png'),
  superMutant: require('../../../../assets/origins/super_mutant.png'),
  misterHandy: require('../../../../assets/origins/mister_handy.png'),
  brotherhoodOutcast: require('../../../../assets/origins/brotherhood_outcast.png'),
  shadow: require('../../../../assets/origins/shadow.png'),
  synth: require('../../../../assets/origins/synth.png'),
  robobrain: require('../../../../assets/origins/robobrain.png'),
  savage: require('../../../../assets/origins/savage.png'),
};

const ORIGIN_DESCRIPTIONS = {
  childOfAtom: 'Поклонники атомной энергии',
  vaultDweller: 'Жители подземных убежищ',
  protectron: 'Старые роботы-охранники',
  survivor: 'Одиночки, выжившие в пустошах',
  securitron: 'Боевые роботы с продвинутым вооружением',
  ghoul: 'Мутанты, устойчивые к радиации',
  assaultron: 'Элитные боевые роботы с ближним боем',
  superMutant: 'Мощные мутанты с огромной силой',
  misterHandy: 'Универсальные сервисные роботы',
  brotherhoodOutcast: 'Отвергнутые члены Братства',
  shadow: 'Таинственные агенты подполья',
  synth: 'Продвинутые андроиды',
  robobrain: 'Роботы с человеческим мозгом',
  savage: 'Племенные жители пустошей',
};

const KIT_CATEGORY_BY_ITEM_TYPE = {
  weapon: 'weapons',
  armor: 'armor',
  clothing: 'clothing',
};

const toFormulaString = (quantity = {}) => {
  const { base = 0, rollType, rollValue = 0, op = '+' } = quantity;
  if (!rollType || !rollValue) {
    return `${base}`;
  }

  if (rollType === 'rollCD') {
    return `${base}${op}${rollValue}fn{CD}`;
  }

  return `${base}`;
};

const mapFixedItem = (item) => {
  if (item.type === 'rollTable') {
    const count = item.roll?.count || 1;
    return {
      type: 'fixed',
      name: `${count}d20<${item.tableId}>`,
      itemType: 'loot',
    };
  }

  return {
    type: 'fixed',
    ...item,
    ...(item.ammo ? { ammunition: `${toFormulaString(item.ammo.quantity)}<ammo>` } : {}),
  };
};

const mapChoiceOption = (option) => {
  if (option.group) {
    return { group: option.group.map(mapFixedItem) };
  }
  return mapFixedItem(option);
};

const mapKitItemsToLegacyCategories = (kitGroup) => {
  const prepared = {
    name: kitGroup.name,
    weapons: [],
    armor: [],
    clothing: [],
    miscellaneous: [],
  };

  (kitGroup.items || []).forEach((entry) => {
    const normalizedEntry = entry.type === 'choice'
      ? { type: 'choice', options: (entry.items || []).map(mapChoiceOption) }
      : mapFixedItem(entry);

    const entryType = normalizedEntry.itemType || entry.itemType;
    const targetCategory = KIT_CATEGORY_BY_ITEM_TYPE[entryType] || 'miscellaneous';
    prepared[targetCategory].push(normalizedEntry);
  });

  return prepared;
};

const equipmentKitGroups = equipmentKitsData.equipmentKitGroups || {};

export const ORIGINS = (equipmentKitsData.origins || []).map((origin) => ({
  id: origin.id,
  name: origin.name,
  description: ORIGIN_DESCRIPTIONS[origin.id],
  image: ORIGIN_IMAGES[origin.id],
  ...(origin.id === 'robobrain'
    ? { immunity: { radiation: true, poison: true } }
    : {}),
  equipmentKits: (origin.equipmentKits || [])
    .map((kitId) => equipmentKitGroups[kitId])
    .filter(Boolean)
    .map(mapKitItemsToLegacyCategories),
}));
