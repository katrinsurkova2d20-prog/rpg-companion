// components/modals/index.js
import BrotherhoodModal, { traitConfig as brotherhoodConfig } from './BrotherhoodModal';
import SupermutantModal, { traitConfig as supermutantConfig } from './SupermutantModal';
import GhoulModal, { traitConfig as ghoulConfig } from './GhoulModal';
import MinutemanModal, { traitConfig as minutemanConfig } from './MinutemanModal';
import ChildOfAtomModal, { traitConfig as childOfAtomConfig } from './ChildOfAtomModal';
import VaultDwellerModal, { traitConfig as vaultDwellerConfig } from './VaultDwellerModal';
import ProtectronModal, { traitConfig as protectronConfig } from './ProtectronModal';
import AssaultronModal, { traitConfig as assaultronConfig } from './AssaultronModal';
import NcrCitizenModal, { traitConfig as ncrCitizenConfig } from './NcrCitizenModal';
import SurvivorModal, { traitConfig as survivorConfig } from './SurvivorModal';
import OutcastBrotherhoodModal, { traitConfig as outcastConfig } from './OutcastBrotherhoodModal';
import RoboBrainModal, { traitConfig as robobrainConfig } from './RoboBrainModal';
import MisterHandyModal, { traitConfig as misterHandyConfig } from './MisterHandyModal';
// другие импорты

export const TRAIT_MODALS = {
  [brotherhoodConfig.originName]: BrotherhoodModal,
  [supermutantConfig.originName]: SupermutantModal,
  [ghoulConfig.originName]: GhoulModal,
  [minutemanConfig.originName]: MinutemanModal,
  [childOfAtomConfig.originName]: ChildOfAtomModal,
  [vaultDwellerConfig.originName]: VaultDwellerModal,
  [protectronConfig.originName]: ProtectronModal,
  [assaultronConfig.originName]: AssaultronModal,
  [ncrCitizenConfig.originName]: NcrCitizenModal,
  [survivorConfig.originName]: SurvivorModal,
  [outcastConfig.originName]: OutcastBrotherhoodModal,
  [robobrainConfig.originName]: RoboBrainModal,
  [misterHandyConfig.originName]: MisterHandyModal,
  // остальные
};

export const TRAIT_CONFIGS = {
  [brotherhoodConfig.originName]: brotherhoodConfig,
  [supermutantConfig.originName]: supermutantConfig,
  [ghoulConfig.originName]: ghoulConfig,
  [minutemanConfig.originName]: minutemanConfig,
  [childOfAtomConfig.originName]: childOfAtomConfig,
  [vaultDwellerConfig.originName]: vaultDwellerConfig,
  [protectronConfig.originName]: protectronConfig,
  [assaultronConfig.originName]: assaultronConfig,
  [ncrCitizenConfig.originName]: ncrCitizenConfig,
  [survivorConfig.originName]: survivorConfig,
  [outcastConfig.originName]: outcastConfig,
  [robobrainConfig.originName]: robobrainConfig,
  [misterHandyConfig.originName]: misterHandyConfig,
  // остальные
};

export const getTraitModalComponent = (originName) => {
  return TRAIT_MODALS[originName] || null;
};

export const getTraitConfig = (originName) => {
  return TRAIT_CONFIGS[originName] || null;
}; 