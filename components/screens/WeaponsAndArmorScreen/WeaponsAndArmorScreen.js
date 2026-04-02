import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ImageBackground, TouchableOpacity, SafeAreaView } from 'react-native';
import { useCharacter } from '../../CharacterContext';
import { calculateInitiative, calculateDefense, calculateMeleeBonus, calculateMaxHealth } from '../CharacterScreen/logic/characterLogic';
import { TRAITS } from '../CharacterScreen/logic/traitsData';
import styles from '../../../styles';
import { renderTextWithIcons } from './textUtils';
import { useLocale } from '../../../i18n/locale';
import { getEquipmentCatalog } from '../../../i18n/equipmentCatalog';
import { applyArmorMods } from './armorModificationUtils';
import { getAttributeValue } from '../CharacterScreen/logic/attributeKeyUtils';
import { getSkillDisplayName } from '../CharacterScreen/logic/characterScreenI18n';
import { getEffectTimeText } from '../../../assets/scripts/sceneEffects';
import { tWeaponsAndArmorScreen } from './weaponsAndArmorScreenI18n';

// Импортируем модальное окно модификаций
import WeaponModificationModal from './WeaponModificationModal';
import ArmorModificationModal from './ArmorModificationModal';


const HealthCounter = ({ max, isEnabled }) => {
  const { currentHealth, setCurrentHealth } = useCharacter();
  const canDecrease = isEnabled && currentHealth > 0;
  const canIncrease = isEnabled && currentHealth < max;

  const handleAdjustHealth = (amount) => {
    if (!isEnabled) return;
    setCurrentHealth(prev => Math.max(0, Math.min(max, prev + amount)));
  };

  const healthText = isEnabled ? `${currentHealth}/${max}` : '—/—';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity
        onPress={() => handleAdjustHealth(-1)}
        disabled={!canDecrease}
        style={[styles.counterButton, !canDecrease && { opacity: 0.5 }]}
      >
        <Text style={styles.counterButtonText}>-</Text>
      </TouchableOpacity>
      <Text style={[styles.counterValue, { minWidth: 50, textAlign: 'center' }]}>{healthText}</Text>
      <TouchableOpacity
        onPress={() => handleAdjustHealth(1)}
        disabled={!canIncrease}
        style={[styles.counterButton, !canIncrease && { opacity: 0.5 }]}
      >
        <Text style={styles.counterButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};


// --- Reusable Components ---

const StatBox = ({ title, value, children, highlightMeleeBonus = false }) => (
  <View style={localStyles.statBoxContainer}>
    <View style={localStyles.statBoxHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={localStyles.statBoxValueContainer}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        {highlightMeleeBonus ? renderTextWithIcons(String(value).replace('{CD}', ' {CD}'), styles.statValue) : <Text style={styles.statValue}>{value}</Text>}
        {children}
      </View>
    </View>
  </View>
);

const ArmorPart = ({ title, subtitle, armorName, clothingName, stats }) => {
    const displayName = [clothingName, armorName].filter(Boolean).join(' / ');

    return (
        <View style={localStyles.armorPartContainer}>
            <View style={[styles.sectionHeader, { flexDirection: 'column', alignItems: 'center', paddingBottom: displayName ? 2 : 4, minHeight: 50 }]}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={[styles.sectionTitle, { fontSize: 12 }]}>{subtitle}</Text>
                {displayName ? <Text style={localStyles.armorItemNameTitle}>{displayName}</Text> : null}
            </View>
            <View style={localStyles.armorStatsContainer}>
                {stats.map((stat, index) => (
                    <View key={index} style={[localStyles.armorStatRow, { borderBottomWidth: index === stats.length - 1 ? 0 : 1 }]}>
                        <Text style={localStyles.armorStatLabel}>{stat.label}</Text>
                        {stat.type === 'button' ? (
                          <TouchableOpacity style={localStyles.armorModificationButton} onPress={stat.onPress}>
                            <Text style={localStyles.armorModificationButtonText}>{stat.value}</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={localStyles.armorStatValue}>{stat.value}</Text>
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
};

const WeaponCard = ({ weapon, onModifyWeapon }) => {
    const { hasTrait, attributes, skills } = useCharacter();
    if (!weapon) {
      return (
        <View style={localStyles.weaponCardContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { textAlign: 'center', width: '100%' }]}>{tWeaponsAndArmorScreen('weapon.emptySlot')}</Text>
          </View>
          <View style={localStyles.emptyWeaponStats}>
            <Text>{tWeaponsAndArmorScreen('weapon.notEquipped')}</Text>
          </View>
        </View>
      );
    }
  
    const displayWeapon = weapon;

    // Канонический формат полей оружия
    const weaponName = displayWeapon.Name ?? displayWeapon.name ?? tWeaponsAndArmorScreen('common.empty');
    const damageType = displayWeapon.damage_type ?? displayWeapon.damageType ?? tWeaponsAndArmorScreen('common.empty');
    const baseDamage = Number(displayWeapon.damage ?? 0) || 0;
    const effectsValue = displayWeapon.damage_effects ?? displayWeapon.damageEffects ?? tWeaponsAndArmorScreen('common.empty');
    const fireRateBase = Number(displayWeapon.fire_rate ?? 0) || 0;
    const rangeValue = displayWeapon.range_name ?? displayWeapon.rangeName ?? tWeaponsAndArmorScreen('common.empty');
    const qualitiesValue = displayWeapon.qualities ?? tWeaponsAndArmorScreen('common.empty');
    const mainAttr = displayWeapon.main_attr ?? 'AGI';
    const mainSkill = displayWeapon.main_skill ?? 'SMALL_GUNS';

    const SKILL_ALIASES = {
      ATHLETICS: ['ATHLETICS', 'Атлетика', 'Athletics'],
      BARTER: ['BARTER', 'Бартер', 'Barter'],
      BIG_GUNS: ['BIG_GUNS', 'Тяжелое оружие', 'Тяжёлое оружие', 'Big Guns'],
      ENERGY_WEAPONS: ['ENERGY_WEAPONS', 'Энергооружие', 'Energy Weapons'],
      EXPLOSIVES: ['EXPLOSIVES', 'Взрывчатка', 'Explosives'],
      LOCKPICK: ['LOCKPICK', 'Отмычки', 'Lockpick'],
      MEDICINE: ['MEDICINE', 'Медицина', 'Medicine'],
      MELEE_WEAPONS: ['MELEE_WEAPONS', 'Ближний бой', 'Melee Weapons'],
      PILOT: ['PILOT', 'Управление ТС', 'Pilot'],
      REPAIR: ['REPAIR', 'Ремонт', 'Repair'],
      SCIENCE: ['SCIENCE', 'Наука', 'Science'],
      SMALL_GUNS: ['SMALL_GUNS', 'Стрелковое оружие', 'Small Guns'],
      SNEAK: ['SNEAK', 'Скрытность', 'Sneak'],
      SPEECH: ['SPEECH', 'Красноречие', 'Speech'],
      SURVIVAL: ['SURVIVAL', 'Выживание', 'Survival'],
      THROWING: ['THROWING', 'Метание', 'Throwing'],
      UNARMED: ['UNARMED', 'Рукопашная', 'Unarmed'],
    };

    const findSkillValue = (skillKeyOrName) => {
      const canonical = SKILL_ALIASES[skillKeyOrName] ? skillKeyOrName : Object.keys(SKILL_ALIASES).find((key) =>
        SKILL_ALIASES[key].includes(skillKeyOrName),
      );

      const aliases = SKILL_ALIASES[canonical] || [skillKeyOrName, getSkillDisplayName(skillKeyOrName)];
      return skills?.find((s) => aliases.includes(s.name))?.value ?? 0;
    };

    const attrValue = getAttributeValue(attributes, mainAttr) ?? 0;
    const skillValue = findSkillValue(mainSkill);
    const successValue = attrValue + skillValue;
  
    // Бонус урона для НКР "Пехотинец"
    const ncrInfantryWeaponIds = TRAITS['Пехотинец']?.modifiers?.ncrInfantryWeaponIds || [];
    const isNcrInfantryWeapon = displayWeapon && ncrInfantryWeaponIds.includes(displayWeapon.id ?? displayWeapon.weaponId);

    const damageWithNcr = hasTrait('Пехотинец') && isNcrInfantryWeapon ? baseDamage + 1 : baseDamage;

    // Снижение базовой скорострельности на 1 при "Техника спуска" для стрелкового и энергооружия
    const isLightOrEnergy = (weapon?.itemType === 'weapon') && (
      weapon.weapon_type === 'Light' || weapon.weapon_type === 'Energy'
    );
    const fireRateWithTrait = hasTrait('Техника спуска') && isLightOrEnergy ? Math.max(0, fireRateBase - 1) : fireRateBase;

    const stats = [
      { label: tWeaponsAndArmorScreen('weapon.fields.success'), value: `${successValue}` },
      { label: tWeaponsAndArmorScreen('weapon.fields.damageType'), value: damageType },
      { label: tWeaponsAndArmorScreen('weapon.fields.damage'), value: `${damageWithNcr}` },
      { label: tWeaponsAndArmorScreen('weapon.fields.effect'), value: effectsValue },
      { label: tWeaponsAndArmorScreen('weapon.fields.fireRate'), value: fireRateWithTrait },
      { label: tWeaponsAndArmorScreen('weapon.fields.range'), value: rangeValue },
      { label: tWeaponsAndArmorScreen('weapon.fields.qualities'), value: qualitiesValue },
      { label: tWeaponsAndArmorScreen('weapon.fields.modification'), type: 'button' }
    ];
  
    return (
      <View style={localStyles.weaponCardContainer}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { textAlign: 'center', width: '100%' }]}>{weaponName}</Text>
        </View>
        <View>
          {stats.map((stat, index) => (
            <View key={index} style={[localStyles.weaponStatRow, { borderBottomWidth: 1 }]}>
              <Text style={localStyles.weaponStatLabel}>{stat.label}</Text>
              {stat.type === 'button' ? (
                <TouchableOpacity 
                  style={localStyles.weaponModificationButton}
                  onPress={() => displayWeapon && onModifyWeapon(displayWeapon)}
                >
                  <Text style={localStyles.weaponModificationButtonText}>+</Text>
                </TouchableOpacity>
              ) : (
                stat.label === tWeaponsAndArmorScreen('weapon.fields.damage') 
                  ? renderTextWithIcons(`${stat.value} {CD}`, localStyles.weaponStatValue) 
                  : <Text style={localStyles.weaponStatValue}>{stat.value}</Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };


const findLocalizedWeapon = (catalog, weapon) => {
  if (!weapon?.id) return weapon;
  const base = (catalog?.weapons || []).find((entry) => entry.id === weapon.id);
  if (!base) return weapon;
  return {
    ...base,
    ...weapon,
    name: base.name || base.Name || weapon.name || weapon.Name,
    Name: base.Name || base.name || weapon.Name || weapon.name,
    Название: base.Название || base.Name || base.name || weapon.Название || weapon.Name || weapon.name,
  };
};

const findLocalizedArmor = (catalog, armorItem) => {
  if (!armorItem?.id) return armorItem;
  const base = catalog?.armorIndex?.byId?.get(armorItem.id);
  if (!base) return armorItem;
  return {
    ...base,
    ...armorItem,
    name: base.name || base.Name || armorItem.name || armorItem.Name,
    Name: base.Name || base.name || armorItem.Name || armorItem.name,
    Название: base.Название || base.Name || base.name || armorItem.Название || armorItem.Name || armorItem.name,
  };
};

const findLocalizedClothing = (catalog, clothingItem) => {
  if (!clothingItem?.id) return clothingItem;
  const allClothes = (catalog?.clothes?.clothes || []).flatMap((group) => group.items || []);
  const base = allClothes.find((entry) => entry.id === clothingItem.id);
  if (!base) return clothingItem;
  return {
    ...base,
    ...clothingItem,
    name: base.name || base.Name || clothingItem.name || clothingItem.Name,
    Name: base.Name || base.name || clothingItem.Name || clothingItem.name,
    Название: base.Название || base.Name || base.name || clothingItem.Название || clothingItem.Name || clothingItem.name,
  };
};


// --- Main Component ---

const WeaponsAndArmorScreen = () => {
  const {
    attributes,
    level,
    equippedWeapons,
    setEquippedWeapons,
    equippedArmor,
    setEquippedArmor,
    saveModifiedItem,
    effects,
    activeTimedEffects,
    attributesSaved
  } = useCharacter();
  const locale = useLocale();

  const initiative = calculateInitiative(attributes);
  const defense = calculateDefense(attributes);
  const meleeBonus = calculateMeleeBonus(attributes);
  const maxHealth = attributesSaved ? calculateMaxHealth(attributes, level) : 0;
  
  const hasRadImmunity = effects.includes('Иммунитет к радиации');
  const hasPoisonImmunity = effects.includes('Иммунитет к яду');
  const hasTimedEffects = (activeTimedEffects || []).length > 0;
  const equipmentCatalog = getEquipmentCatalog(locale);
  const localizedEquippedWeapons = equippedWeapons.map((weapon) => findLocalizedWeapon(equipmentCatalog, weapon));
  
  // Состояние для модального окна модификаций
  const [modificationModalVisible, setModificationModalVisible] = useState(false);
  const [selectedWeaponForModification, setSelectedWeaponForModification] = useState(null);
  const [armorModalVisible, setArmorModalVisible] = useState(false);
  const [selectedArmorSlot, setSelectedArmorSlot] = useState(null);
  const [armorModalMode, setArmorModalMode] = useState('armor');
  

  

  
  // Функции для работы с модальным окном модификаций
  const handleOpenModificationModal = (weapon) => {
    if (!weapon) {
      return;
    }
    
    setSelectedWeaponForModification(weapon);
    setModificationModalVisible(true);
  };

  const handleCloseModificationModal = () => {
    setModificationModalVisible(false);
    setSelectedWeaponForModification(null);
  };

  const handleApplyModification = (modifiedWeapon) => {
    handleCloseModificationModal();
    saveModifiedItem(selectedWeaponForModification, modifiedWeapon);

    // Обновляем массив экипированного оружия
    const newEquippedWeapons = equippedWeapons.map(w =>
      (w && selectedWeaponForModification && w.uniqueId === selectedWeaponForModification.uniqueId) 
        ? modifiedWeapon 
        : w
    );
    setEquippedWeapons(newEquippedWeapons);
  };


  const handleOpenArmorModal = (slotKey, mode = 'armor') => {
    const item = mode === 'clothing' ? equippedArmor?.[slotKey]?.clothing : equippedArmor?.[slotKey]?.armor;
    if (!item) return;
    setSelectedArmorSlot(slotKey);
    setArmorModalMode(mode);
    setArmorModalVisible(true);
  };

  const handleApplyArmorModification = (modifiedItem) => {
    if (!selectedArmorSlot) return;
    const field = armorModalMode === 'clothing' ? 'clothing' : 'armor';
    const original = equippedArmor?.[selectedArmorSlot]?.[field];
    if (original) saveModifiedItem(original, modifiedItem);

    setEquippedArmor((prev) => ({
      ...prev,
      [selectedArmorSlot]: {
        ...(prev[selectedArmorSlot] || {}),
        [field]: modifiedItem,
      },
    }));
    setArmorModalVisible(false);
    setSelectedArmorSlot(null);
  };

  const renderArmorPart = (slotKey) => {
    const slotData = equippedArmor[slotKey];
    const armorItem = findLocalizedArmor(equipmentCatalog, slotData ? slotData.armor : null);
    const clothingItem = findLocalizedClothing(equipmentCatalog, slotData ? slotData.clothing : null);
    const config = {
      title: tWeaponsAndArmorScreen(`armor.slots.${slotKey}.title`),
      subtitle: tWeaponsAndArmorScreen(`armor.slots.${slotKey}.subtitle`),
    };

    const { item: modifiedArmor } = applyArmorMods(armorItem, equipmentCatalog);
    const { item: modifiedClothing } = applyArmorMods(clothingItem, equipmentCatalog, { standardKey: 'appliedClothingModId', uniqueKey: 'unused' });

    const physDef = Math.max(Number(modifiedArmor?.physicalDamageRating || 0), Number(modifiedClothing?.physicalDamageRating || 0));
    const energyDef = Math.max(Number(modifiedArmor?.energyDamageRating || 0), Number(modifiedClothing?.energyDamageRating || 0));
    const radDef = Math.max(Number(modifiedArmor?.radiationDamageRating || 0), Number(modifiedClothing?.radiationDamageRating || 0));

    const stats = [
      { label: tWeaponsAndArmorScreen('armor.fields.physical'), value: physDef > 0 ? physDef : tWeaponsAndArmorScreen('common.none') },
      { label: tWeaponsAndArmorScreen('armor.fields.energy'), value: energyDef > 0 ? energyDef : tWeaponsAndArmorScreen('common.none') },
      { label: tWeaponsAndArmorScreen('armor.fields.radiation'), value: hasRadImmunity ? '∞' : (radDef > 0 ? radDef : tWeaponsAndArmorScreen('common.none')) },
      ...(modifiedClothing ? [{ label: tWeaponsAndArmorScreen('armor.fields.clothingModification'), value: '⋯', type: 'button', onPress: () => handleOpenArmorModal(slotKey, 'clothing') }] : []),
      ...(modifiedArmor ? [{ label: tWeaponsAndArmorScreen('armor.fields.armorModification'), value: '⋯', type: 'button', onPress: () => handleOpenArmorModal(slotKey, 'armor') }] : []),
    ];

    return (
        <ArmorPart 
            key={slotKey} 
            title={config.title} 
            subtitle={config.subtitle}
            armorName={modifiedArmor?.name || modifiedArmor?.Name}
            clothingName={modifiedClothing?.name || modifiedClothing?.Name}
            stats={stats}
        />
    );
  };

  return (
    <ImageBackground
      source={require('../../../assets/bg.png')}
      style={localStyles.background}
      imageStyle={{ opacity: 0.3 }}
    >
      <SafeAreaView style={{flex: 1}}>
        <ScrollView style={{ backgroundColor: 'transparent' }} contentContainerStyle={[styles.scrollContent, { paddingHorizontal: '2.5%'}]}>
            {/* Основные характеристики */}
            <View style={{ marginBottom: 16 }}>
            <View style={localStyles.statsRow}>
                <StatBox title={tWeaponsAndArmorScreen('stats.initiative')} value={initiative} />
                <StatBox title={tWeaponsAndArmorScreen('stats.defense')} value={defense} />
                <StatBox title={tWeaponsAndArmorScreen('stats.meleeBonus')} value={meleeBonus} highlightMeleeBonus />
            </View>
            <View style={[localStyles.statsRow, { marginTop: 8 }]}>
                <StatBox title={tWeaponsAndArmorScreen('stats.effects')} value={hasTimedEffects ? '' : tWeaponsAndArmorScreen('common.empty')}>
                  {hasTimedEffects ? (
                    <View style={localStyles.effectsListContainer}>
                      {(activeTimedEffects || []).map((effect) => {
                        const effectText = effect.effectName || effect.effectLabel || '—';
                        const isNegative = effect.effectKind === 'negative';
                        return (
                          <View key={effect.id} style={localStyles.effectLineContainer}>
                            <Text style={[localStyles.effectText, isNegative ? localStyles.negativeEffectText : localStyles.positiveEffectText]}>
                              {effectText}
                            </Text>
                            {/* TIMER_VISIBILITY_TOGGLE_START: закомментируйте этот блок, чтобы скрыть таймер эффекта */}
                            <Text style={localStyles.effectTimerText}>
                              {getEffectTimeText(effect.scenesLeft)}
                            </Text>
                            {/* TIMER_VISIBILITY_TOGGLE_END */}
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </StatBox>
                <StatBox title={tWeaponsAndArmorScreen('stats.poisonResistance')} value={hasPoisonImmunity ? '∞' : '0'} />
                <StatBox title={tWeaponsAndArmorScreen('stats.health')} max={maxHealth}>
                  <HealthCounter max={maxHealth} isEnabled={attributesSaved} />
                </StatBox>
            </View>
            </View>

            {/* Броня */}
            <View style={{ marginBottom: 16 }}>
            <View style={localStyles.statsRow}>
                {renderArmorPart('leftArm')}
                {renderArmorPart('head')}
                {renderArmorPart('rightArm')}
            </View>
            <View style={[localStyles.statsRow, { marginTop: 8 }]}>
                {renderArmorPart('leftLeg')}
                {renderArmorPart('body')}
                {renderArmorPart('rightLeg')}
            </View>
            </View>
            
            {/* Оружие */}
            <View>
            <View style={localStyles.statsRow}>
                {localizedEquippedWeapons.map((weapon, index) => (
                  <WeaponCard 
                    key={index} 
                    weapon={weapon} 
                    onModifyWeapon={handleOpenModificationModal}
                  />
                ))}
            </View>
            </View>
            

        </ScrollView>
      </SafeAreaView>
      
      {/* Модальное окно модификаций */}
      <WeaponModificationModal
        visible={modificationModalVisible}
        onClose={handleCloseModificationModal}
        weapon={selectedWeaponForModification}
        onApplyModification={handleApplyModification}
      />
      <ArmorModificationModal
        visible={armorModalVisible}
        onClose={() => { setArmorModalVisible(false); setSelectedArmorSlot(null); }}
        targetItem={selectedArmorSlot
          ? (armorModalMode === 'clothing'
            ? findLocalizedClothing(equipmentCatalog, equippedArmor?.[selectedArmorSlot]?.clothing)
            : findLocalizedArmor(equipmentCatalog, equippedArmor?.[selectedArmorSlot]?.armor))
          : null}
        mode={armorModalMode}
        onApply={handleApplyArmorModification}
      />
    </ImageBackground>
  );
};


// --- Local Styles ---

const localStyles = StyleSheet.create({
  background: {
    flex: 1,
    paddingHorizontal: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  statBoxContainer: {
    flex: 1, 
    marginHorizontal: 4, 
    borderWidth: 1,
    borderColor: '#5a5a5a',
    borderRadius: 5,
    flexDirection: 'column', 
  },
  statBoxHeader: {
    backgroundColor: '#000',
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  statBoxValueContainer: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  effectsListContainer: {
    width: '100%',
    marginTop: 4,
  },
  effectLineContainer: {
    marginBottom: 2,
    alignItems: 'center',
  },
  effectText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  positiveEffectText: {
    color: '#00A651',
  },
  negativeEffectText: {
    color: '#D62828',
  },
  effectTimerText: {
    fontSize: 10,
    color: '#6B7280',
  },
  armorItemNameTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
    paddingHorizontal: 4,
    textAlign: 'center',
    flexWrap: 'wrap',
    width: '100%',
  },
  // Armor Styles
  armorPartContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  armorStatsContainer: {
    borderWidth: 1,
    borderColor: '#5a5a5a',
    borderTopWidth: 0,
    borderRadius: 5,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden'
  },
  armorStatRow: {
    flexDirection: 'row',
    borderBottomColor: '#5a5a5a',
  },
  armorStatLabel: {
    color: styles.derivedTitle.color,
    fontSize: styles.derivedTitle.fontSize,
    flex: 1,
    padding: 5,
    backgroundColor: '#fce5cd'
  },
  armorStatValue: {
    color: styles.derivedValue.color,
    fontWeight: styles.derivedValue.fontWeight,
    fontSize: styles.derivedValue.fontSize,
    padding: 5,
    minWidth: 40,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#5a5a5a',
    backgroundColor: '#fff'
  },
  // Weapon Styles
  weaponCardContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  emptyWeaponStats: {
    borderWidth: 1,
    borderColor: '#5a5a5a',
    borderTopWidth: 0,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee',
    minHeight: 100, // Adjust as needed
  },
  weaponStatRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#5a5a5a',
    borderTopWidth: 0,
    borderBottomWidth: 0, 
  },
  weaponStatLabel: {
    backgroundColor: '#333',
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
    padding: 8,
    fontSize: 12,
  },
  weaponStatValue: {
    flex: 1,
    padding: 8,
    fontSize: 12,
    borderLeftWidth: 1,
    borderColor: '#5a5a5a',
    backgroundColor: '#fff',
    textAlign: 'center'
  },
  armorModificationButton: {
    padding: 8,
    minWidth: 40,
    borderLeftWidth: 1,
    borderColor: '#5a5a5a',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  armorModificationButtonText: {
    color: styles.derivedValue.color,
    fontWeight: styles.derivedValue.fontWeight,
    fontSize: styles.derivedValue.fontSize,
  },
  weaponModificationButton: {
    flex: 1,
    padding: 8,
    borderLeftWidth: 1,
    borderColor: '#5a5a5a',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weaponModificationButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  }
});

export default WeaponsAndArmorScreen;
