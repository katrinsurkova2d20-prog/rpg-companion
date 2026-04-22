import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ImageBackground, SafeAreaView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useCharacter } from '../../CharacterContext';
import CapsModal from './modals/CapsModal';
import SellItemModal from './modals/SellItemModal';
import AddItemModal from './modals/AddItemModal';
import BuyItemModal from './modals/BuyItemModal';
import { calculateMaxHealth } from '../CharacterScreen/logic/characterLogic';
import { formatInventoryText, tInventory } from './logic/inventoryI18n';
import { useLocale } from '../../../i18n/locale';
import { getEquipmentCatalog } from '../../../i18n/equipmentCatalog';

const CapsSection = ({ caps, onAdd, onSubtract }) => (
  <View style={styles.capsContainer}>
    <Text style={styles.capsLabel}>{tInventory('screen.caps.title')}</Text>
    <TouchableOpacity style={styles.capsButton} onPress={onSubtract}>
      <Text style={styles.capsButtonText}>{tInventory('screen.caps.subtract')}</Text>
    </TouchableOpacity>
    <Text style={styles.capsValue}>{caps}</Text>
    <TouchableOpacity style={styles.capsButton} onPress={onAdd}>
      <Text style={styles.capsButtonText}>{tInventory('screen.caps.add')}</Text>
    </TouchableOpacity>
  </View>
);

const InventoryScreen = () => {
  const { 
    equipment, setEquipment, 
    equippedWeapons, setEquippedWeapons, 
    equippedArmor, setEquippedArmor,
    caps, setCaps,
    attributes, level,
    currentHealth, setCurrentHealth,
    applyConsumableTimedEffects,
    getModifiedItem,
    trait
  } = useCharacter();
  
  const [isCapsModalVisible, setIsCapsModalVisible] = useState(false);
  const [capsOperationType, setCapsOperationType] = useState('add');
  const [isSellModalVisible, setIsSellModalVisible] = useState(false);
  const [selectedItemForSale, setSelectedItemForSale] = useState(null);
  const [isAddItemModalVisible, setAddItemModalVisible] = useState(false);
  const [itemSelectionMode, setItemSelectionMode] = useState('loot');
  const [isBuyItemModalVisible, setIsBuyItemModalVisible] = useState(false);
  const [selectedItemForBuy, setSelectedItemForBuy] = useState(null);

  const locale = useLocale();
  const equipmentCatalog = useMemo(() => getEquipmentCatalog(locale), [locale]);

  const getItemName = (item) => item?.name || item?.Name || '';
  const getItemType = (item) => {
    if (item?.itemType) return item.itemType;
    if (item?.effectType || item?.durationInScenes || item?.duration || item?.positiveEffect) return 'chem';
    if (item?.type === 'ammo') return 'ammo';
    if (item?.weaponId || item?.damage !== undefined) return 'weapon';
    if (item?.clothingType) return 'clothing';
    if (item?.protectedAreas) return 'armor';
    return 'misc';
  };
  const isWeaponItem = (item) => getItemType(item) === 'weapon';
  const getModsSignature = (item) => {
    const applied = item?.appliedMods || {};
    const modIds = Object.values(applied).filter(Boolean).sort();
    return modIds.length ? modIds.join('|') : 'none';
  };
  const getStackKey = (item) => {
    const itemType = getItemType(item);
    if (itemType === 'weapon') {
      const baseWeaponId = item?.weaponId || item?.id || getItemName(item);
      return `weapon:${baseWeaponId}:mods:${getModsSignature(item)}`;
    }
    return `${itemType}:${getItemName(item)}`;
  };
  const createWeaponInstanceId = () => `weapon-instance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createArmorInstanceId = () => `armor-instance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const getArmorInstanceKey = (item, slot, type) =>
    item?.equipInstanceId || `${type || item?.itemType || 'armor'}:${item?.stackKey || getStackKey(item)}:${slot}`;
  const getItemTypeIcon = (itemType) => {
    if (itemType === 'weapon') return '🔫';
    if (itemType === 'armor') return '🛡️';
    if (itemType === 'clothing' || itemType === 'outfit') return '👕';
    if (itemType === 'chem' || itemType === 'chems') return '💊';
    if (itemType === 'drinks') return '🥤';
    if (itemType === 'ammo') return '🔹';
    return '📦';
  };

  const isRobotCharacter = Boolean(trait?.modifiers?.isRobot);
  const isRobotOnlyItem = (item) => Boolean(item?.robotOnly || String(item?.id || '').startsWith('robot_'));
  const isPowerArmorItem = (item) => {
    const category = String(item?.category || item?.armorCategoryKey || '').toLowerCase();
    const name = String(getItemName(item) || '').toLowerCase();
    return category.includes('power') || name.includes('силов');
  };
  const toWeight = (value) => parseFloat(String(value ?? 0).replace(',', '.')) || 0;
  const flattenMiscellaneousItems = (miscCatalog) => {
    if (Array.isArray(miscCatalog)) return miscCatalog;
    if (Array.isArray(miscCatalog?.miscellaneous)) {
      return miscCatalog.miscellaneous.flatMap((group) => group?.items || []);
    }
    return [];
  };

  const resolveLocalizedItem = (item) => {
    if (!item || !item.id) return item;
    const itemType = getItemType(item);

    if (itemType === 'weapon') {
      const base = (equipmentCatalog?.weapons || []).find((entry) => entry.id === item.id);
      if (!base) return item;
      return {
        ...base,
        ...item,
        name: base.name || base.Name || item.name || item.Name,
        Name: base.Name || base.name || item.Name || item.name,
      };
    }

    if (itemType === 'armor') {
      const base = equipmentCatalog?.armorIndex?.byId?.get(item.id);
      if (!base) return item;
      return {
        ...base,
        ...item,
        name: base.name || base.Name || item.name || item.Name,
        Name: base.Name || base.name || item.Name || item.name,
      };
    }

    if (itemType === 'clothing' || itemType === 'outfit') {
      const allClothes = (equipmentCatalog?.clothes?.clothes || []).flatMap((group) => group.items || []);
      const base = allClothes.find((entry) => entry.id === item.id);
      if (!base) return item;
      return {
        ...base,
        ...item,
        name: base.name || base.Name || item.name || item.Name,
        Name: base.Name || base.name || item.Name || item.name,
      };
    }

    if (itemType === 'chem' || itemType === 'chems') {
      const base = (equipmentCatalog?.chems || []).find((entry) => entry.id === item.id);
      if (!base) return item;
      return {
        ...base,
        ...item,
        name: base.name || base.Name || item.name || item.Name,
        Name: base.Name || base.name || item.Name || item.name,
      };
    }

    if (itemType === 'drinks') {
      const base = (equipmentCatalog?.drinks || []).find((entry) => entry.id === item.id);
      if (!base) return item;
      return {
        ...base,
        ...item,
        name: base.name || base.Name || item.name || item.Name,
        Name: base.Name || base.name || item.Name || item.name,
      };
    }

    if (itemType === 'ammo') {
      const base = (equipmentCatalog?.ammoData || []).find((entry) => entry.id === item.id);
      if (!base) return item;
      return {
        ...base,
        ...item,
        name: base.name || base.Name || item.name || item.Name,
        Name: base.Name || base.name || item.Name || item.name,
      };
    }

    const miscItems = flattenMiscellaneousItems(equipmentCatalog?.miscellaneous);
    const base = miscItems.find((entry) => entry.id === item.id) || (equipmentCatalog?.robotModules || []).find((entry) => entry.id === item.id) || (equipmentCatalog?.robotItems || []).find((entry) => entry.id === item.id);
    if (!base) return item;
    return {
      ...base,
      ...item,
      name: base.name || base.Name || item.name || item.Name,
      Name: base.Name || base.name || item.Name || item.name,
    };
  };


  const handleOpenCapsModal = (type) => {
    setCapsOperationType(type);
    setIsCapsModalVisible(true);
  };

  const handleSaveCaps = (amount) => {
    if (capsOperationType === 'add') {
      setCaps(prev => prev + amount);
    } else {
      setCaps(prev => Math.max(0, prev - amount));
    }
  };

  const handleApplyConsumable = (item) => {
    const consumableItem = { ...item };
    const itemName = getItemName(consumableItem);

    const applyToSelf = () => {
      if (isRobotCharacter) {
        Alert.alert(tInventory('screen.alerts.robotCannotSelfUseTitle', 'Ограничение робота'), tInventory('screen.alerts.robotCannotSelfUseMessage', 'Роботы не могут применять еду, напитки и препараты на себя.'));
        return;
      }
      const timedResult = applyConsumableTimedEffects(consumableItem);
      if (consumableItem.healAmount) {
        const maxHealth = calculateMaxHealth(attributes, level);
        const healAmount = consumableItem.healAmount;
        const newHealth = Math.min(maxHealth, currentHealth + healAmount);
        setCurrentHealth(newHealth);
        Alert.alert(tInventory('screen.alerts.successTitle'), formatInventoryText(tInventory('screen.alerts.healMessage'), { healAmount }));
      } else {
        Alert.alert(tInventory('screen.alerts.appliedTitle'), formatInventoryText(tInventory('screen.alerts.appliedSelfMessage'), { itemName }));
      }

      if (timedResult.events.length > 0) {
        Alert.alert(tInventory('screen.alerts.effectsTitle'), timedResult.events.join('\n'));
      }

      handleRemoveItem(consumableItem, 1);
    };

    const applyToOther = () => {
      Alert.alert(tInventory('screen.alerts.appliedTitle'), formatInventoryText(tInventory('screen.alerts.appliedOtherMessage'), { itemName }));
      handleRemoveItem(consumableItem, 1);
    };

    if (typeof window !== 'undefined' && window.confirm) {
      const applyOnSelf = window.confirm(formatInventoryText(tInventory('screen.alerts.windowApplyConsumableQuestion'), { itemName }));
      if (applyOnSelf) {
        applyToSelf();
      } else {
        applyToOther();
      }
      return;
    }

    Alert.alert(
      tInventory('screen.alerts.applyConsumableTitle'),
      formatInventoryText(tInventory('screen.alerts.applyConsumableQuestion'), { itemName }),
      [
        { text: tInventory('screen.actions.cancel'), style: "cancel" },
        { text: tInventory('screen.actions.self'), onPress: applyToSelf },
        { text: tInventory('screen.actions.other'), onPress: applyToOther }
      ]
    );
  };
  
  const handleRemoveItem = (itemToRemove, quantity) => {
    const newItems = [...(equipment?.items || [])];
    const itemIndex = newItems.findIndex(i => 
      getItemName(i) === getItemName(itemToRemove)
    );
    
    if (itemIndex > -1) {
      // Получаем модифицированную версию предмета, если она есть
      const itemWithType = {
        ...newItems[itemIndex],
        itemType: newItems[itemIndex].itemType || 'weapon'
      };
      const modifiedItem = getModifiedItem(itemWithType);
      
      // Обновляем предмет в инвентаре на модифицированную версию
      newItems[itemIndex] = modifiedItem;
      newItems[itemIndex].quantity -= quantity;
      
      if (newItems[itemIndex].quantity <= 0) {
        newItems.splice(itemIndex, 1);
      }
      updateInventoryItems(newItems);
    }
  };

  const handleSellItem = (item) => {
    setSelectedItemForSale(item);
    setIsSellModalVisible(true);
  };

  const handleConfirmSale = (quantity, finalPrice) => {
    setCaps(prev => prev + finalPrice);

    const newItems = [...(equipment?.items || [])];
    const itemIndex = newItems.findIndex(i => getItemName(i) === getItemName(selectedItemForSale));

    if (itemIndex > -1) {
      // Получаем модифицированную версию предмета, если она есть
      const itemWithType = {
        ...newItems[itemIndex],
        itemType: newItems[itemIndex].itemType || 'weapon'
      };
      const modifiedItem = getModifiedItem(itemWithType);
      
      // Обновляем предмет в инвентаре на модифицированную версию
      newItems[itemIndex] = modifiedItem;
      newItems[itemIndex].quantity -= quantity;
      
      if (newItems[itemIndex].quantity <= 0) {
        newItems.splice(itemIndex, 1);
      }
    }
    
    setEquipment(prev => ({ ...prev, items: newItems }));
    setIsSellModalVisible(false);
    setSelectedItemForSale(null);
  };
    
  // NOTE: This function is no longer needed for weight/price, 
  // but let's keep it for direct inventory modification like selling.
  const updateInventoryItems = (newItems) => {
    setEquipment(prev => ({
        ...(prev || {}),
        items: newItems,
    }));
  }

  const handleAddItem = (item, quantity = 1) => {
    const newItems = equipment?.items ? [...equipment.items] : [];
    const stackKey = getStackKey(item);
    const existingItemIndex = newItems.findIndex(existingItem => (existingItem.stackKey || getStackKey(existingItem)) === stackKey);

    if (existingItemIndex > -1) {
        newItems[existingItemIndex].quantity += quantity;
    } else {
        // Убеждаемся, что у предмета есть itemType
        const itemWithType = {
          ...item,
          itemType: getItemType(item),
          stackKey,
          quantity
        };
        newItems.push(itemWithType);
    }
    updateInventoryItems(newItems);
  };




  const handleSelectCatalogItem = (item) => {
    if (itemSelectionMode === 'buy') {
      setSelectedItemForBuy(item);
      setIsBuyItemModalVisible(true);
      return;
    }
    handleAddItem(item, 1);
  };

  const handleConfirmBuy = (quantity, unitPrice) => {
    const finalCost = quantity * unitPrice;
    setCaps((prev) => prev - finalCost);
    handleAddItem({ ...selectedItemForBuy, price: unitPrice, cost: unitPrice }, quantity);
    setIsBuyItemModalVisible(false);
    setSelectedItemForBuy(null);
  };

  const parseProtectedAreas = (item) => {
    if (Array.isArray(item?.protectedAreas) && item.protectedAreas.length > 0) {
      return item.protectedAreas;
    }

    return [];
  };

  const getSlotsForArea = (item) => {
    const areas = parseProtectedAreas(item);
    const slots = [];
    if (areas.includes('Head')) slots.push('head');
    if (areas.includes('Body')) slots.push('body');
    if (areas.includes('Hand')) slots.push('leftArm', 'rightArm');
    if (areas.includes('Leg')) slots.push('leftLeg', 'rightLeg');
    return slots;
  };

  const getSingleLimbCandidateSlots = (item) => {
    const areas = parseProtectedAreas(item);
    if (areas.length !== 1) return null;
    if (areas[0] === 'Hand') return ['leftArm', 'rightArm'];
    if (areas[0] === 'Leg') return ['leftLeg', 'rightLeg'];
    return null;
  };

  const collectEquippedArmorInstances = (armorState) => {
    const instanceMap = new Map();
    Object.entries(armorState || {}).forEach(([slotKey, slotData]) => {
      const processItem = (item, type) => {
        if (!item) return;
        const instanceKey = getArmorInstanceKey(item, slotKey, type);
        if (!instanceMap.has(instanceKey)) {
          instanceMap.set(instanceKey, {
            item,
            itemName: getItemName(item),
            itemType: item.itemType || type,
            stackKey: item.stackKey || getStackKey(item),
            slots: [slotKey],
            type,
          });
          return;
        }
        instanceMap.get(instanceKey).slots.push(slotKey);
      };
      processItem(slotData.clothing, 'clothing');
      processItem(slotData.armor, 'armor');
    });
    return instanceMap;
  };

  const handleEquipWeapon = (weaponToEquip) => {
    const displayWeapon = weaponToEquip;
    
    if (isRobotOnlyItem(displayWeapon) && !isRobotCharacter) {
      Alert.alert(tInventory('screen.alerts.robotOnlyWeaponTitle', 'Ограничение экипировки'), tInventory('screen.alerts.robotOnlyWeaponMessage', 'Это оружие могут использовать только роботы.'));
      return;
    }
    if (!isRobotOnlyItem(displayWeapon) && isRobotCharacter) {
      const hasManipulatorEquipped = equippedWeapons.some((w) => Boolean(w?.builtinManipulator));
      if (hasManipulatorEquipped) {
        const candidateWeight = toWeight(displayWeapon.weight);
        if (candidateWeight > 40) {
          Alert.alert(tInventory('screen.alerts.manipulatorWeightTitle', 'Перегрузка манипулятора'), tInventory('screen.alerts.manipulatorWeightMessage', 'Это оружие превышает допустимый удерживаемый вес манипулятора (40 фунтов).'));
          return;
        }
      }
    }

    const sourceStackKey = weaponToEquip.stackKey || getStackKey(displayWeapon);
    
    // Проверяем количество этого конкретного предмета в инвентаре
    const totalOwned = equipment.items.find(i => (i.stackKey || getStackKey(i)) === sourceStackKey)?.quantity || 0;
    const alreadyEquippedCount = equippedWeapons.filter(w => w && (w.stackKey || getStackKey(w)) === sourceStackKey).length;

    if (totalOwned <= alreadyEquippedCount) {
        Alert.alert(tInventory('screen.alerts.noItemsTitle'), tInventory('screen.alerts.noItemsMessage'));
        return;
    }

    const freeSlotIndex = equippedWeapons.findIndex(w => w === null);
    
    const equipAction = (index) => {
        const replacedWeapon = equippedWeapons[index];

        setEquippedWeapons(prev => {
            const newEquipped = [...prev];
            // Сохраняем модифицированное оружие с правильным itemType
            const weaponToEquip = {
              ...displayWeapon,
              itemType: 'weapon',
              stackKey: sourceStackKey,
              uniqueId: displayWeapon.uniqueId || createWeaponInstanceId(),
            };
            newEquipped[index] = weaponToEquip;
            return newEquipped;
        });
        
        // Уменьшаем количество предмета в инвентаре
        const newItems = equipment?.items ? [...equipment.items] : [];

        if (replacedWeapon) {
            const replacedStackKey = replacedWeapon.stackKey || getStackKey(replacedWeapon);
            const replacedIndex = newItems.findIndex(i => (i.stackKey || getStackKey(i)) === replacedStackKey);
            if (replacedIndex !== -1) {
                newItems[replacedIndex].quantity += 1;
            } else {
                newItems.push({
                    ...replacedWeapon,
                    itemType: getItemType(replacedWeapon),
                    stackKey: replacedStackKey,
                    quantity: 1,
                    uniqueId: undefined,
                });
            }
        }

        const itemIndex = newItems.findIndex(i => (i.stackKey || getStackKey(i)) === sourceStackKey);
        
        if (itemIndex !== -1) {
            newItems[itemIndex].quantity -= 1;
            
            // Если количество стало 0, удаляем предмет из инвентаря
            if (newItems[itemIndex].quantity <= 0) {
                newItems.splice(itemIndex, 1);
            }
            
            updateInventoryItems(newItems);

        }
    };

    if (freeSlotIndex !== -1) {
        equipAction(freeSlotIndex);
    } else {
      const equippedOptions = equippedWeapons
        .map((weapon, index) => ({
          index,
          name: getItemName(weapon) || `${tInventory('screen.actions.weapon')} ${index + 1}`,
        }))
        .filter(({ name }) => Boolean(name));

      const optionsText = equippedOptions
        .map(({ index, name }) => `${index + 1}. ${name}`)
        .join('\n');
      const replaceMessage = optionsText
        ? `${tInventory('screen.alerts.replaceWeaponMessage')}\n\n${optionsText}`
        : tInventory('screen.alerts.replaceWeaponMessage');

      if (typeof window !== 'undefined' && window.prompt) {
        const answer = window.prompt(replaceMessage, '1');
        const selectedIndex = Number(answer) - 1;
        if (Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < equippedWeapons.length) {
          equipAction(selectedIndex);
        }
      } else {
        const replaceButtons = equippedOptions.map(({ index, name }) => ({
          text: name,
          onPress: () => equipAction(index),
        }));

        Alert.alert(
          tInventory('screen.alerts.replaceWeaponTitle'),
          replaceMessage,
          [
            ...replaceButtons,
            { text: tInventory('screen.actions.cancel'), style: "cancel" }
          ]
        );
      }
    }
  };

  const handleUnequipWeapon = (weapon, slot) => {
    setEquippedWeapons(prev => {
        const newEquipped = [...prev];
        if (newEquipped[slot] && (
          newEquipped[slot].uniqueId === weapon.uniqueId ||
          getItemName(newEquipped[slot]) === getItemName(weapon)
        )) {
            // Проверяем, является ли это модифицированным оружием
            // Считаем оружие модифицированным если у него есть uniqueId с 'modified-' ИЛИ есть _installedMods (новая система слотов)
            // Добавляем снятое оружие обратно в инвентарь
            const newItems = equipment?.items ? [...equipment.items] : [];
            const stackKey = newEquipped[slot].stackKey || getStackKey(newEquipped[slot]);
            const originalWeaponIndex = newItems.findIndex(item => (item.stackKey || getStackKey(item)) === stackKey);

            if (originalWeaponIndex !== -1) {
              newItems[originalWeaponIndex].quantity += 1;
            } else {
              const weaponToAdd = {
                ...newEquipped[slot],
                quantity: 1,
                itemType: getItemType(newEquipped[slot]),
                stackKey,
                uniqueId: undefined,
              };
              newItems.push(weaponToAdd);
            }
            
            updateInventoryItems(newItems);
            
            newEquipped[slot] = null;
            

        }
        return newEquipped;
    });
  };

  const handleEquipArmor = (itemToEquip) => {
    const currentEquipped = equippedArmor;
    if (isRobotCharacter && !isRobotOnlyItem(itemToEquip)) {
      Alert.alert(tInventory('screen.alerts.robotArmorOnlyTitle', 'Ограничение экипировки'), tInventory('screen.alerts.robotArmorOnlyMessage', 'Роботы не могут экипировать типовую или силовую броню.'));
      return;
    }
    if (isRobotCharacter && isPowerArmorItem(itemToEquip)) {
      Alert.alert(tInventory('screen.alerts.robotArmorOnlyTitle', 'Ограничение экипировки'), tInventory('screen.alerts.robotArmorOnlyMessage', 'Роботы не могут экипировать типовую или силовую броню.'));
      return;
    }
    const canWearUnderArmor = itemToEquip.itemType === 'clothing' && (
      itemToEquip.allowsArmor === true || itemToEquip.clothingType === 'suit'
    );
    const targetSlotType = canWearUnderArmor ? 'clothing' : 'armor';
    const equippedInstances = collectEquippedArmorInstances(currentEquipped);
    const ownedCount = equipment?.items?.find((i) => (i.stackKey || getStackKey(i)) === (itemToEquip.stackKey || getStackKey(itemToEquip)))?.quantity || 0;
    const equippedCount = Array.from(equippedInstances.values()).filter((entry) => {
      if (itemToEquip.itemType === 'armor' || itemToEquip.itemType === 'clothing' || itemToEquip.itemType === 'outfit') {
        return entry.stackKey === (itemToEquip.stackKey || getStackKey(itemToEquip));
      }
      return false;
    }).length;

    if (ownedCount <= equippedCount) {
      Alert.alert(tInventory('screen.alerts.noItemsTitle'), tInventory('screen.alerts.noItemsMessage'));
      return;
    }

    const executeEquip = (slotsToOccupy) => {
      const instancesToUnequip = new Set();
      const itemType = itemToEquip.itemType;
      const markForUnequip = (slot, type) => {
        const slotItem = currentEquipped?.[slot]?.[type];
        if (!slotItem) return;
        instancesToUnequip.add(getArmorInstanceKey(slotItem, slot, type));
      };

      if (itemType === 'clothing') {
          if (canWearUnderArmor) {
            slotsToOccupy.forEach(slot => {
                if (currentEquipped[slot].clothing) markForUnequip(slot, 'clothing');
            });
          } else {
            slotsToOccupy.forEach(slot => {
                if (currentEquipped[slot].clothing) markForUnequip(slot, 'clothing');
                if (currentEquipped[slot].armor) markForUnequip(slot, 'armor');
            });
          }
      } else if (itemType === 'armor') {
          slotsToOccupy.forEach(slot => {
              if (currentEquipped[slot].armor) markForUnequip(slot, 'armor');
          });
      } else if (itemType === 'outfit') {
          slotsToOccupy.forEach(slot => {
              if (currentEquipped[slot].clothing) markForUnequip(slot, 'clothing');
              if (currentEquipped[slot].armor) markForUnequip(slot, 'armor');
          });
      }

      const performEquip = () => {
          const finalEquipped = JSON.parse(JSON.stringify(currentEquipped));
          const slotsByInstance = new Map();
          Object.entries(currentEquipped || {}).forEach(([slotKey, slotData]) => {
            const addSlot = (item, type) => {
              if (!item) return;
              const key = getArmorInstanceKey(item, slotKey, type);
              if (!slotsByInstance.has(key)) slotsByInstance.set(key, []);
              slotsByInstance.get(key).push({ slot: slotKey, type });
            };
            addSlot(slotData.clothing, 'clothing');
            addSlot(slotData.armor, 'armor');
          });

          instancesToUnequip.forEach((instanceKey) => {
            (slotsByInstance.get(instanceKey) || []).forEach(({ slot, type }) => {
              finalEquipped[slot][type] = null;
            });
          });

          const equipInstanceId = createArmorInstanceId();
          slotsToOccupy.forEach(slot => {
              finalEquipped[slot][targetSlotType] = {
                ...itemToEquip,
                itemType: itemToEquip.itemType || targetSlotType,
                stackKey: itemToEquip.stackKey || getStackKey(itemToEquip),
                equipInstanceId,
              };
          });

          setEquippedArmor(finalEquipped);
      };

      if (instancesToUnequip.size > 0) {
          if (typeof window !== 'undefined' && window.confirm) {
              if (window.confirm(tInventory('screen.alerts.replaceEquipmentConfirm'))) {
                  performEquip();
              }
          } else {
              Alert.alert(
                  tInventory('screen.alerts.replaceEquipmentTitle'),
                  tInventory('screen.alerts.replaceEquipmentConfirm'),
                  [
                      { text: tInventory('screen.actions.cancel'), style: "cancel" },
                      { text: tInventory('screen.actions.yes'), onPress: performEquip },
                  ]
              );
          }
      } else {
          performEquip();
      }
    };

    const singleLimbSlots = getSingleLimbCandidateSlots(itemToEquip);
    if (!singleLimbSlots) {
      executeEquip(getSlotsForArea(itemToEquip));
      return;
    }

    const freeSlot = singleLimbSlots.find((slot) => !currentEquipped[slot]?.[targetSlotType]);
    if (freeSlot) {
      executeEquip([freeSlot]);
      return;
    }

    const leftSlot = singleLimbSlots[0];
    const rightSlot = singleLimbSlots[1];
    const leftLabel = leftSlot === 'leftArm' ? tInventory('screen.labels.leftArm') : tInventory('screen.labels.leftLeg');
    const rightLabel = rightSlot === 'rightArm' ? tInventory('screen.labels.rightArm') : tInventory('screen.labels.rightLeg');

    if (typeof window !== 'undefined' && window.prompt) {
      const answer = window.prompt(formatInventoryText(tInventory('screen.alerts.bothSlotsBusyPrompt'), { leftLabel, rightLabel }), '1');
      if (answer === '1') executeEquip([leftSlot]);
      if (answer === '2') executeEquip([rightSlot]);
      return;
    }

    Alert.alert(
      tInventory('screen.alerts.replaceEquipmentTitle'),
      tInventory('screen.alerts.bothSlotsBusy'),
      [
        { text: leftLabel, onPress: () => executeEquip([leftSlot]) },
        { text: rightLabel, onPress: () => executeEquip([rightSlot]) },
        { text: tInventory('screen.actions.cancel'), style: "cancel" },
      ]
    );
  };

  const handleUnequipArmor = (itemToUnequip) => {
    setEquippedArmor(prevEquipped => {
        const newEquipped = JSON.parse(JSON.stringify(prevEquipped));
        Object.keys(newEquipped).forEach((slot) => {
            const clearByType = (type) => {
              const equippedItem = newEquipped[slot]?.[type];
              if (!equippedItem) return;
              const sameInstance = equippedItem.equipInstanceId && itemToUnequip.equipInstanceId && equippedItem.equipInstanceId === itemToUnequip.equipInstanceId;
              const sameNameAndType = getItemName(equippedItem) === getItemName(itemToUnequip) && (itemToUnequip.itemType === type || itemToUnequip.itemType === 'outfit');
              if (sameInstance || sameNameAndType) {
                newEquipped[slot][type] = null;
              }
            };
            clearByType('clothing');
            clearByType('armor');
        });
        return newEquipped;
    });
  };
  
  const displayItems = useMemo(() => {
    if (!equipment?.items) return [];

    const equippedItemsList = [];
    (equippedWeapons || []).forEach((w, i) => {
        if (w) {
            // Убеждаемся, что у экипированного оружия есть itemType
            const weaponWithType = {
              ...w,
              itemType: getItemType(w)
            };
            
            // Получаем модифицированную версию оружия, если она есть
            const modifiedWeapon = getModifiedItem(weaponWithType);
            const displayWeapon = modifiedWeapon || w;
            
            const equippedWeapon = {
              ...displayWeapon,
              itemType: getItemType(w),
              isEquipped: true, 
              quantity: 1, 
              slot: i, 
              stackKey: w.stackKey || getStackKey(w),
              uniqueId: w.uniqueId || `weapon-${getItemName(w)}-${i}`
            };
            equippedItemsList.push(equippedWeapon);
        }
    });

    const equippedArmorItems = collectEquippedArmorInstances(equippedArmor);

    // Добавляем экипированные предметы в список
    equippedArmorItems.forEach(({ item, type, stackKey }) => {
        // Получаем модифицированную версию предмета, если она есть
        const itemWithType = {
          ...item,
          itemType: item.itemType || type
        };
        const modifiedItem = getModifiedItem(itemWithType);
        const displayItem = modifiedItem || item;
        
        equippedItemsList.push({
            ...displayItem,
            itemType: item.itemType || type,
            stackKey,
            equipInstanceId: item.equipInstanceId,
            isEquipped: true,
            quantity: 1,
            uniqueId: item.equipInstanceId || `${type}-${getItemName(item)}-${stackKey}`
        });
    });

    const inventoryItemsList = (equipment.items || [])
        .map(item => {
            const itemName = getItemName(item);
            
            // Проверяем, является ли это модифицированным оружием
            // Если у предмета есть uniqueId, начинающийся с 'modified-', то это модифицированное оружие
            const itemStackKey = item.stackKey || getStackKey(item);
            
            // Используем сам предмет как displayItem
            const displayItem = item;
            
            // Подсчитываем экипированные предметы
            const equippedCount = equippedItemsList.filter(equippedItem => {
                const equippedName = getItemName(equippedItem);
                const itemName = getItemName(displayItem);
                if (isWeaponItem(displayItem) && isWeaponItem(equippedItem)) {
                  return (equippedItem.stackKey || getStackKey(equippedItem)) === itemStackKey;
                }
                return (equippedItem.stackKey || getStackKey(equippedItem)) === itemStackKey || equippedName === itemName;
            }).length;
            

            
            const remainingQuantity = item.quantity - equippedCount;

            if (remainingQuantity > 0) {
                return {
                    ...displayItem,
                    itemType: getItemType(item),
                    stackKey: itemStackKey,
                    quantity: remainingQuantity,
                    isEquipped: false,
                    uniqueId: item.uniqueId || `inv-stack-${itemStackKey}`
                };
            }
            return null;
        })
        .filter(Boolean);

    const result = [...equippedItemsList, ...inventoryItemsList];

    return result;
  }, [equipment, equippedWeapons, equippedArmor, getModifiedItem]);

  const renderTableHeader = () => {
    return (
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, { flex: 0.7 }]}>{tInventory('screen.labels.item')}</Text>
        <Text style={[styles.headerText, { flex: 0.3, textAlign: 'center' }]}>{tInventory('screen.labels.action')}</Text>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    // Убеждаемся, что у предмета есть itemType
    const itemWithType = {
      ...item,
      itemType: getItemType(item)
    };
    
    // Получаем модифицированную версию предмета, если она есть
    const modifiedItem = getModifiedItem(itemWithType);
    const displayItem = modifiedItem || item;
    
    const localizedDisplayItem = resolveLocalizedItem(displayItem);
    const itemName = getItemName(localizedDisplayItem) || tInventory('screen.labels.unknownItem');
    const itemIcon = getItemTypeIcon(item.itemType);
    const isEquippable = item.itemType === 'weapon' || item.itemType === 'armor' || item.itemType === 'clothing';
    const isConsumable = item.itemType === 'chem' || item.itemType === 'chems' || item.itemType === 'drinks';

    const handleActionPress = () => {
        if (item.isEquipped) {
            if (item.itemType === 'weapon') {
                handleUnequipWeapon(item, item.slot);
            } else {
                handleUnequipArmor(item);
            }
        } else {
            if (item.itemType === 'weapon') {
                handleEquipWeapon(item);
            } else {
                handleEquipArmor(item);
            }
        }
    };
    
    const price = parseFloat(
      displayItem.cost ?? displayItem.price
    ) || 0;
    const weightRaw = displayItem.weight;
    const weight = parseFloat(String(weightRaw).replace(',', '.')) || 0;

    return (
      <View style={styles.tableRow}>
        <View style={styles.mainRowContent}>
          <View style={styles.itemNameContainer}>
            <Text style={[styles.itemNameText, item.isEquipped && styles.equippedItemText]}>{itemName}</Text>
            <Text style={styles.itemTypeIcon}>{itemIcon}</Text>
          </View>
        </View>
        <View style={styles.actionContainer}>
          {isEquippable && (
              <TouchableOpacity 
                  style={[styles.actionButton, item.isEquipped ? styles.unequipButton : {}]} 
                  onPress={handleActionPress}>
                  <Text style={styles.actionButtonText}>{item.isEquipped ? tInventory('screen.actions.unequip') : tInventory('screen.actions.equip')}</Text>
              </TouchableOpacity>
          )}

          {isConsumable && !item.isEquipped && (
              <TouchableOpacity 
                  style={[styles.actionButton, styles.applyButton]} 
                  onPress={() => handleApplyConsumable(item)}>
                  <Text style={styles.actionButtonText}>{tInventory('screen.actions.apply')}</Text>
              </TouchableOpacity>
          )}
          {!item.isEquipped && (
              <TouchableOpacity style={[styles.actionButton, styles.sellButton]} onPress={() => handleSellItem(item)}>
                  <Text style={styles.actionButtonText}>{tInventory('screen.actions.sell')}</Text>
              </TouchableOpacity>
          )}
        </View>
        <View style={styles.itemSubRow}>
          <Text style={styles.itemSubText}>{tInventory('screen.labels.quantity')}: {item.isEquipped ? 1 : item.quantity} {tInventory('screen.labels.pieces')}</Text>
          <Text style={styles.itemSubText}>{tInventory('screen.labels.price')}: {item.isEquipped ? price : (price * item.quantity)}</Text>
          <Text style={styles.itemSubText}>{tInventory('screen.labels.weight')}: {item.isEquipped ? Number(weight.toFixed(3)) : Number((weight * item.quantity).toFixed(3))}</Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => (
  <View style={styles.footerActionsRow}>
    <TouchableOpacity
      style={styles.addActionCell}
      onPress={() => {
        setItemSelectionMode('loot');
        setAddItemModalVisible(true);
      }}
    >
      <Text style={styles.addActionIcon}>+</Text>
      <Text style={styles.addActionLabel}>{tInventory('screen.actions.addLoot')}</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.addActionCell}
      onPress={() => {
        setItemSelectionMode('buy');
        setAddItemModalVisible(true);
      }}
    >
      <Text style={styles.addActionIcon}>+</Text>
      <Text style={styles.addActionLabel}>{tInventory('screen.actions.buyItems')}</Text>
    </TouchableOpacity>
  </View>
);
  const totalWeight = useMemo(() => {
    let total = 0;
    
    // Вес предметов в инвентаре
    if (equipment?.items) {
      total += equipment.items.reduce((acc, item) => {
        // Получаем модифицированную версию предмета, если она есть
        const itemWithType = {
          ...item,
          itemType: item.itemType || 'weapon'
        };
        const modifiedItem = getModifiedItem(itemWithType);
        const displayItem = modifiedItem || item;
        
        const weightRaw = displayItem.weight;
        const weight = parseFloat(String(weightRaw).replace(',', '.')) || 0;
        return acc + (weight * item.quantity);
      }, 0);
    }
    
    // Вес экипированного оружия
    equippedWeapons.forEach(weapon => {
      if (weapon) {
        // Получаем модифицированную версию оружия, если она есть
        const weaponWithType = {
          ...weapon,
          itemType: weapon.itemType || 'weapon'
        };
        const modifiedWeapon = getModifiedItem(weaponWithType);
        const displayWeapon = modifiedWeapon || weapon;
        
        const weightRaw = displayWeapon.weight;
        const weight = parseFloat(String(weightRaw).replace(',', '.')) || 0;
        total += weight;
      }
    });
    
    // Вес экипированной брони и одежды
    Object.values(equippedArmor).forEach(slotData => {
      if (slotData.armor) {
        const weightRaw = slotData.armor.weight;
        const weight = parseFloat(String(weightRaw).replace(',', '.')) || 0;
        total += weight;
      }
      if (slotData.clothing) {
        const weightRaw = slotData.clothing.weight;
        const weight = parseFloat(String(weightRaw).replace(',', '.')) || 0;
        total += weight;
      }
    });
    
    return Number(total.toFixed(3));
  }, [equipment, equippedWeapons, equippedArmor, getModifiedItem]);
  
  const totalPrice = useMemo(() => {
    let total = 0;
    
    // Цена предметов в инвентаре
    if (equipment?.items) {
      total += equipment.items.reduce((acc, item) => {
        // Получаем модифицированную версию предмета, если она есть
        const itemWithType = {
          ...item,
          itemType: item.itemType || 'weapon'
        };
        const modifiedItem = getModifiedItem(itemWithType);
        const displayItem = modifiedItem || item;
        
        const price = parseFloat(
          displayItem.cost ?? displayItem.price
        ) || 0;
        return acc + (price * item.quantity);
      }, 0);
    }
    
    // Цена экипированного оружия
    equippedWeapons.forEach(weapon => {
      if (weapon) {
        // Получаем модифицированную версию оружия, если она есть
        const weaponWithType = {
          ...weapon,
          itemType: weapon.itemType || 'weapon'
        };
        const modifiedWeapon = getModifiedItem(weaponWithType);
        const displayWeapon = modifiedWeapon || weapon;
        
        const price = parseFloat(displayWeapon.cost ?? displayWeapon.price) || 0;
        total += price;
      }
    });
    
    // Цена экипированной брони и одежды
    Object.values(equippedArmor).forEach(slotData => {
      if (slotData.armor) {
        const price = parseFloat(slotData.armor.cost ?? slotData.armor.price) || 0;
        total += price;
      }
      if (slotData.clothing) {
        const price = parseFloat(slotData.clothing.cost ?? slotData.clothing.price) || 0;
        total += price;
      }
    });
    
    return total;
  }, [equipment, equippedWeapons, equippedArmor, getModifiedItem]);

  return (
    <ImageBackground
      source={require('../../../assets/bg.png')}
      style={styles.background}
      imageStyle={{ opacity: 0.3 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <CapsSection 
            caps={caps}
            onAdd={() => handleOpenCapsModal('add')}
            onSubtract={() => handleOpenCapsModal('subtract')}
          />
          <View style={styles.tableContainer}>
            {renderTableHeader()}
            <FlatList
              data={displayItems}
              renderItem={renderItem}
              keyExtractor={(item, index) => item.uniqueId || `${getItemName(item)}-${index}`}
              style={styles.list}
              ListEmptyComponent={<Text style={styles.emptyListText}>{tInventory('screen.labels.inventoryEmpty')}</Text>}
              ListFooterComponent={renderFooter}
            />
          </View>
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>{tInventory('screen.labels.totalWeight')}: {totalWeight}</Text>
            <Text style={styles.summaryText}>{tInventory('screen.labels.totalPrice')}: {totalPrice}</Text>
          </View>
        </View>
        <CapsModal
          visible={isCapsModalVisible}
          onClose={() => setIsCapsModalVisible(false)}
          onSave={handleSaveCaps}
          operationType={capsOperationType}
        />
        <SellItemModal
            visible={isSellModalVisible}
            onClose={() => setIsSellModalVisible(false)}
            item={selectedItemForSale}
            onConfirmSale={handleConfirmSale}
        />
        <AddItemModal
          visible={isAddItemModalVisible}
          onClose={() => setAddItemModalVisible(false)}
          onSelectItem={handleSelectCatalogItem}
          rootTitleKey={itemSelectionMode === 'buy' ? 'modals.addItemModal.buyTitle' : 'modals.addItemModal.title'}
        />
        <BuyItemModal
          visible={isBuyItemModalVisible}
          onClose={() => {
            setIsBuyItemModalVisible(false);
            setSelectedItemForBuy(null);
          }}
          item={selectedItemForBuy}
          caps={caps}
          onConfirmBuy={handleConfirmBuy}
        />

      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: 'transparent' 
  },
  background: { 
    flex: 1,
    width: '100%',
    height: '100%'
  },
  container: {
    flex: 1,
    padding: 16,
  },
  capsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 16,
  },
  capsLabel: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  capsButton: {
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  capsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  capsValue: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
    minWidth: 50,
    textAlign: 'center',
  },
  tableContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#000',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'column', 
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#fff',
    borderStyle: 'dashed',
  },
  mainRowContent: { 
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, 
  },
  itemNameContainer: { 
    flex: 0.7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    flexWrap: 'wrap', 
  },
  equippedItemText: {
      fontStyle: 'italic',
      fontWeight: 'bold',
      color: '#005a9c',
  },
  itemSubRow: { 
    flexDirection: 'row',
  },
  itemSubText: {
    fontSize: 12,
    color: '#666',
    marginRight: 15, 
  },
  itemTypeIcon: {
    fontSize: 16,
    marginLeft: 6,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginRight: 8,
    marginBottom: 4,
  },
  sellButton: {
    backgroundColor: '#DC3545',
  },
  applyButton: {
    backgroundColor: '#28a745',
  },
  unequipButton: {
      backgroundColor: '#ffc107',
  },

  actionButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  summaryContainer: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginTop: 10,
    borderRadius: 5,
  },
  summaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
    color: '#000',
  },
  footerActionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    columnGap: 10,
  },
  addActionCell: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  addActionIcon: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
    lineHeight: 26,
  },
  addActionLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#000',
    fontWeight: '600',
    textAlign: 'center',
  }
});

export default InventoryScreen; 
