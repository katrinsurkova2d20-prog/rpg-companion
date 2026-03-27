import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import * as db from '../db';
import { 
  createInitialAttributes, 
  ALL_SKILLS, 
  getLuckPoints, 
  calculateMaxHealth,
  calculateInitiative,
  calculateDefense,
  calculateMeleeBonus,
  calculateCarryWeight
} from './screens/CharacterScreen/logic/characterLogic';
import { getAttributeValue } from './screens/CharacterScreen/logic/attributeKeyUtils';
import { meetsPerkRequirements, getPerkUnmetReasons, annotatePerks } from './screens/CharacterScreen/logic/perksLogic';

const CharacterContext = createContext();

const generateId = () => `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const serializeState = (state) => ({
  ...state,
  modifiedItems: state.modifiedItems instanceof Map 
    ? Array.from(state.modifiedItems.entries())
    : (Array.isArray(state.modifiedItems) ? state.modifiedItems : []),
});

const deserializeState = (data) => ({
  ...data,
  modifiedItems: new Map(Array.isArray(data.modifiedItems) ? data.modifiedItems : []),
});

export const CharacterProvider = ({ children }) => {
  const [characterName, setCharacterName] = useState('');
  const [characterId, setCharacterId] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const [level, setLevel] = useState(1);
  const [attributes, setAttributes] = useState(createInitialAttributes());
  const [skills, setSkills] = useState(ALL_SKILLS.map(s => ({...s, value: 0})));
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [extraTaggedSkills, setExtraTaggedSkills] = useState([]);
  const [forcedSelectedSkills, setForcedSelectedSkills] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [trait, setTrait] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [effects, setEffects] = useState([]);
  const [equippedWeapons, setEquippedWeapons] = useState([null, null]);
  const [equippedArmor, setEquippedArmor] = useState({
    head: { armor: null, clothing: null },
    body: { armor: null, clothing: null },
    leftArm: { armor: null, clothing: null },
    rightArm: { armor: null, clothing: null },
    leftLeg: { armor: null, clothing: null },
    rightLeg: { armor: null, clothing: null },
  });
  const [caps, setCaps] = useState(0);
  const [currentHealth, setCurrentHealth] = useState(0);
  const [modifiedItems, setModifiedItems] = useState(new Map());
  const [availablePerkAttributePoints, setAvailablePerkAttributePoints] = useState(0);
  const [luckPoints, setLuckPoints] = useState(0);
  const [maxLuckPoints, setMaxLuckPoints] = useState(0);
  const [attributesSaved, setAttributesSaved] = useState(false);
  const [skillsSaved, setSkillsSaved] = useState(false);
  const [selectedPerks, setSelectedPerks] = useState([]);
  const [carryWeight, setCarryWeight] = useState(
    150 + 10 * getAttributeValue(attributes, 'STR'),
  );
  const [meleeBonus, setMeleeBonus] = useState(0);
  const [initiative, setInitiative] = useState(0);
  const [defense, setDefense] = useState(1);

  const isSavedRef = useRef(isSaved);
  const characterIdRef = useRef(characterId);
  useEffect(() => { isSavedRef.current = isSaved; }, [isSaved]);
  useEffect(() => { characterIdRef.current = characterId; }, [characterId]);

  // Собираем снапшот всего состояния персонажа
  const buildSnapshot = useCallback(() => ({
    characterName,
    level,
    attributes,
    skills,
    selectedSkills,
    extraTaggedSkills,
    forcedSelectedSkills,
    origin,
    trait,
    equipment,
    effects,
    equippedWeapons,
    equippedArmor,
    caps,
    currentHealth,
    modifiedItems,
    availablePerkAttributePoints,
    luckPoints,
    maxLuckPoints,
    attributesSaved,
    skillsSaved,
    selectedPerks,
    carryWeight,
    meleeBonus,
    initiative,
    defense,
  }), [
    characterName, level, attributes, skills, selectedSkills, extraTaggedSkills,
    forcedSelectedSkills, origin, trait, equipment, effects, equippedWeapons,
    equippedArmor, caps, currentHealth, modifiedItems, availablePerkAttributePoints,
    luckPoints, maxLuckPoints, attributesSaved, skillsSaved, selectedPerks,
    carryWeight, meleeBonus, initiative, defense,
  ]);

  // Realtime сохранение — запускается при любом изменении состояния если персонаж уже сохранён
  const saveTimeoutRef = useRef(null);
  useEffect(() => {
    if (!isSavedRef.current || !characterIdRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const snapshot = buildSnapshot();
        const serialized = serializeState(snapshot);
        await db.saveCharacter(
          characterIdRef.current,
          snapshot.characterName,
          snapshot.level ?? 1,
          snapshot.origin?.name || null,
          serialized
        );
      } catch (e) {
      }
    }, 500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [
    characterName, level, attributes, skills, selectedSkills, extraTaggedSkills,
    forcedSelectedSkills, origin, trait, equipment, effects, equippedWeapons,
    equippedArmor, caps, currentHealth, modifiedItems, availablePerkAttributePoints,
    luckPoints, maxLuckPoints, attributesSaved, skillsSaved, selectedPerks,
    carryWeight, meleeBonus, initiative, defense, buildSnapshot,
  ]);

  // Первичное сохранение персонажа (вызывается из CharacterScreen при нажатии "Сохранить")
  const saveCharacter = useCallback(async (name) => {
    try {
      const id = characterIdRef.current || generateId();
      setCharacterId(id);
      characterIdRef.current = id;

      const snapshot = buildSnapshot();
      const snapshotWithName = { ...snapshot, characterName: name };
      const serialized = serializeState(snapshotWithName);

      await db.saveCharacter(
        id,
        name,
        snapshot.level ?? 1,
        snapshot.origin?.name || null,
        serialized
      );

      setIsSaved(true);
      isSavedRef.current = true;
      return id;
    } catch (e) {
      return null;
    }
  }, [buildSnapshot]);

  // Загрузка персонажа по ID
  const loadCharacter = useCallback(async (id) => {
    try {
      const row = await db.loadCharacterById(id);
      if (!row) return false;
      const data = deserializeState(row.data);

      setCharacterId(id);
      setCharacterName(data.characterName || '');
      setLevel(data.level ?? 1);
      setAttributes(data.attributes || createInitialAttributes());
      setSkills(data.skills || ALL_SKILLS.map(s => ({...s, value: 0})));
      setSelectedSkills(data.selectedSkills || []);
      setExtraTaggedSkills(data.extraTaggedSkills || []);
      setForcedSelectedSkills(data.forcedSelectedSkills || []);
      setOrigin(data.origin || null);
      setTrait(data.trait || null);
      setEquipment(data.equipment || null);
      setEffects(data.effects || []);
      setEquippedWeapons(data.equippedWeapons || [null, null]);
      setEquippedArmor(data.equippedArmor || {
        head: { armor: null, clothing: null },
        body: { armor: null, clothing: null },
        leftArm: { armor: null, clothing: null },
        rightArm: { armor: null, clothing: null },
        leftLeg: { armor: null, clothing: null },
        rightLeg: { armor: null, clothing: null },
      });
      setCaps(data.caps ?? 0);
      setCurrentHealth(data.currentHealth ?? 0);
      setModifiedItems(data.modifiedItems instanceof Map ? data.modifiedItems : new Map());
      setAvailablePerkAttributePoints(data.availablePerkAttributePoints ?? 0);
      setLuckPoints(data.luckPoints ?? 0);
      setMaxLuckPoints(data.maxLuckPoints ?? 0);
      setAttributesSaved(data.attributesSaved ?? false);
      setSkillsSaved(data.skillsSaved ?? false);
      setSelectedPerks(data.selectedPerks || []);
      setCarryWeight(data.carryWeight ?? 150);
      setMeleeBonus(data.meleeBonus ?? 0);
      setInitiative(data.initiative ?? 0);
      setDefense(data.defense ?? 1);
      setIsSaved(true);
      isSavedRef.current = true;
      characterIdRef.current = id;
      return true;
    } catch (e) {
      return false;
    }
  }, []);

  // Получить список всех персонажей
  const getCharactersList = useCallback(async () => {
    try {
      return await db.getCharactersList();
    } catch (e) {
      return [];
    }
  }, []);

  // Удалить персонажа
  const deleteCharacter = useCallback(async (id) => {
    try {
      await db.deleteCharacter(id);
      return true;
    } catch (e) {
      return false;
    }
  }, []);

  const getItemId = (item) => {
    if (item.uniqueId) return item.uniqueId;
    return item.weaponId || item.code || item.Название;
  };

  const getModifiedItem = (item) => {
    const itemId = getItemId(item);
    const modifiedItem = modifiedItems.get(itemId);
    if (modifiedItem) return modifiedItem;
    if (item.itemType !== 'weapon' && item.itemType !== 'armor' && item.itemType !== 'clothing') return item;
    return item;
  };

  const saveModifiedItem = (originalItem, modifiedItem) => {
    const itemId = getItemId(originalItem);
    setModifiedItems(prev => new Map(prev).set(itemId, modifiedItem));
  };

  const removeModifiedItem = (item) => {
    const itemId = getItemId(item);
    setModifiedItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });
  };

  const addPerkAttributePoints = (points) => {
    setAvailablePerkAttributePoints(prev => prev + points);
  };

  const commitAttributeChanges = (newAttributes, pointsSpent) => {
    setAttributes(newAttributes);
    setAvailablePerkAttributePoints(prev => prev - pointsSpent);
    const newLuck = getLuckPoints(newAttributes);
    setMaxLuckPoints(newLuck);
    setLuckPoints(prevLuck => Math.min(prevLuck, newLuck));
    setCarryWeight(calculateCarryWeight(newAttributes, trait));
    setMeleeBonus(calculateMeleeBonus(newAttributes));
    setInitiative(calculateInitiative(newAttributes));
    setDefense(calculateDefense(newAttributes));
    const newMaxHealth = calculateMaxHealth(newAttributes, level);
    setCurrentHealth(prevHealth => Math.min(prevHealth, newMaxHealth));
  };

  const resetCharacter = (preserveOrigin = false) => {
    const initialAttributes = createInitialAttributes();
    setAttributes(initialAttributes);
    setSkills(ALL_SKILLS.map(s => ({...s, value: 0})));
    setSelectedSkills([]);
    setExtraTaggedSkills([]);
    setForcedSelectedSkills([]);
    setAttributesSaved(false);
    setSkillsSaved(false);
    const initialLuck = getLuckPoints(initialAttributes);
    setMaxLuckPoints(initialLuck);
    setLuckPoints(initialLuck);
    if (!preserveOrigin) setOrigin(null);
    setTrait(null);
    setEquipment(null);
    setEffects([]);
    setEquippedWeapons([null, null]);
    setEquippedArmor({
      head: { armor: null, clothing: null },
      body: { armor: null, clothing: null },
      leftArm: { armor: null, clothing: null },
      rightArm: { armor: null, clothing: null },
      leftLeg: { armor: null, clothing: null },
      rightLeg: { armor: null, clothing: null },
    });
    setCaps(0);
    setSelectedPerks([]);
    setMeleeBonus(0);
    setInitiative(calculateInitiative(initialAttributes));
    setDefense(calculateDefense(initialAttributes));
    const currentMaxHealth = calculateMaxHealth(initialAttributes, level);
    setCurrentHealth(currentMaxHealth);
    setModifiedItems(new Map());
    // Сбрасываем статус сохранения
    setCharacterName('');
    setCharacterId(null);
    setIsSaved(false);
    isSavedRef.current = false;
    characterIdRef.current = null;
  };

  const value = {
    characterName, setCharacterName,
    characterId,
    isSaved,
    saveCharacter,
    loadCharacter,
    getCharactersList,
    deleteCharacter,
    level, setLevel,
    attributes, setAttributes,
    skills, setSkills,
    selectedSkills, setSelectedSkills,
    extraTaggedSkills, setExtraTaggedSkills,
    forcedSelectedSkills, setForcedSelectedSkills,
    origin, setOrigin,
    trait, setTrait,
    equipment, setEquipment,
    effects, setEffects,
    equippedWeapons, setEquippedWeapons,
    equippedArmor, setEquippedArmor,
    caps, setCaps,
    currentHealth, setCurrentHealth,
    luckPoints, setLuckPoints,
    maxLuckPoints, setMaxLuckPoints,
    attributesSaved, setAttributesSaved,
    skillsSaved, setSkillsSaved,
    selectedPerks, setSelectedPerks,
    modifiedItems, setModifiedItems,
    carryWeight,
    meleeBonus,
    initiative,
    defense,
    hasTrait: (traitName) => !!(trait && (trait.name === traitName)),
    getItemId,
    getModifiedItem,
    saveModifiedItem,
    removeModifiedItem,
    resetCharacter,
    availablePerkAttributePoints,
    addPerkAttributePoints,
    commitAttributeChanges,
    meetsPerkRequirements: (perk) => meetsPerkRequirements(perk, attributes, level),
    getPerkUnmetReasons: (perk) => getPerkUnmetReasons(perk, attributes, level),
    annotatePerks: (perks) => annotatePerks(perks, attributes, level),
  };

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  );
};

export const useCharacter = () => {
  return useContext(CharacterContext);
};
