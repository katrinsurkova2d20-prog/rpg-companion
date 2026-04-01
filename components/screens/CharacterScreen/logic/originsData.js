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

const equipmentKitGroups = equipmentKitsData.equipmentKitGroups || {};

export const ORIGINS = (equipmentKitsData.origins || []).map((origin) => ({
  id: origin.id,
  name: origin.name,
  description: ORIGIN_DESCRIPTIONS[origin.id],
  image: ORIGIN_IMAGES[origin.id],
  ...(origin.id === 'robobrain' ? { immunity: { radiation: true, poison: true } } : {}),
  equipmentKits: (origin.equipmentKits || [])
    .map((kitId) => ({ id: kitId, ...(equipmentKitGroups[kitId] || {}) }))
    .filter((kit) => Array.isArray(kit.items)),
}));
