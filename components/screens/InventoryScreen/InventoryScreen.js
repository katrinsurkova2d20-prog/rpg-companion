import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ImageBackground, SafeAreaView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useCharacter } from '../../CharacterContext';
import AddWeaponModal from './modals/AddWeaponModal';
import CapsModal from './modals/CapsModal';
import SellItemModal from './modals/SellItemModal';
import AddItemModal from './modals/AddItemModal';
import { calculateMaxHealth } from '../CharacterScreen/logic/characterLogic';

const CapsSection = ({ caps, onAdd, onSubtract }) => (
  <View style={styles.capsContainer}>
    <Text style={styles.capsLabel}>Крышки</Text>
    <TouchableOpacity style={styles.capsButton} onPress={onSubtract}>
      <Text style={styles.capsButtonText}>↓ Списать</Text>
    </TouchableOpacity>
    <Text style={styles.capsValue}>{caps}</Text>
    <TouchableOpacity style={styles.capsButton} onPress={onAdd}>
      <Text style={styles.capsButtonText}>↑ Внести</Text>
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
    saveModifiedItem,
    getModifiedItem
  } = useCharacter();
  
  const [isAddWeaponModalVisible, setIsAddWeaponModalVisible] = useState(false);
  const [isCapsModalVisible, setIsCapsModalVisible] = useState(false);
  const [capsOperationType, setCapsOperationType] = useState('add');
  const [isSellModalVisible, setIsSellModalVisible] = useState(false);
  const [selectedItemForSale, setSelectedItemForSale] = useState(null);
  const [isAddItemModalVisible, setAddItemModalVisible] = useState(false);

  const getItemName = (item) => item?.Name || item?.name || '';
  const getItemType = (item) => {
    if (item?.itemType) return item.itemType;
    if (item?.type === 'ammo') return 'ammo';
    if (item?.weaponId || item?.damage !== undefined || item?.Урон !== undefined) return 'weapon';
    if (item?.clothingType) return 'clothing';
    if (item?.protected_area) return 'armor';
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

  const handleApplyChem = (item) => {
    if (!item.itemType) {
      // Ensure the item has the correct itemType
      item = { ...item, itemType: 'chem' };
    }
    
    Alert.alert(
      "Применение химиката",
      `Вы хотите применить ${getItemName(item)} на себя или другого персонажа?`,
      [
        { text: "Отмена", style: "cancel" },
        { 
          text: "На себя", 
          onPress: () => {
            if (item.healAmount) {
              // Обновляем здоровье персонажа
              const maxHealth = calculateMaxHealth(attributes, level);
              
              // Вычисляем новое здоровье
              const healAmount = item.healAmount;
              const newHealth = Math.min(maxHealth, currentHealth + healAmount);
              
              // Обновляем текущее здоровье
              setCurrentHealth(newHealth);
              
              Alert.alert("Успешно", `Восстановлено ${healAmount} единиц здоровья.`);
            } else {
              Alert.alert("Применено", `${getItemName(item)} применен на вас.`);
            }
            
            // Удаляем один экземпляр предмета из инвентаря
            handleRemoveItem(item, 1);
          } 
        },
        { 
          text: "На другого", 
          onPress: () => {
            Alert.alert("Применено", `${getItemName(item)} применен на другого персонажа.`);
            handleRemoveItem(item, 1);
          } 
        }
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

  const handleAddItem = (item) => {
    const newItems = equipment?.items ? [...equipment.items] : [];
    const stackKey = getStackKey(item);
    const existingItemIndex = newItems.findIndex(existingItem => (existingItem.stackKey || getStackKey(existingItem)) === stackKey);

    if (existingItemIndex > -1) {
        newItems[existingItemIndex].quantity += 1;
    } else {
        // Убеждаемся, что у предмета есть itemType
        const itemWithType = {
          ...item,
          itemType: getItemType(item),
          stackKey,
          quantity: 1
        };
        newItems.push(itemWithType);
    }
    updateInventoryItems(newItems);
  };



  const getSlotsForArea = (area) => {
    const slots = [];
    if (!area) return slots;
    if (area.includes('Голова')) slots.push('head');
    if (area.includes('Тело')) slots.push('body');
    if (area.includes('Руки') || area.includes('Рука')) {
        slots.push('leftArm', 'rightArm');
    }
    if (area.includes('Ноги') || area.includes('Нога')) {
        slots.push('leftLeg', 'rightLeg');
    }
    return slots;
  };

  const handleEquipWeapon = (weaponToEquip) => {
    const displayWeapon = weaponToEquip;
    
    const sourceStackKey = weaponToEquip.stackKey || getStackKey(displayWeapon);
    
    // Проверяем количество этого конкретного предмета в инвентаре
    const totalOwned = equipment.items.find(i => (i.stackKey || getStackKey(i)) === sourceStackKey)?.quantity || 0;
    const alreadyEquippedCount = equippedWeapons.filter(w => w && (w.stackKey || getStackKey(w)) === sourceStackKey).length;

    if (totalOwned <= alreadyEquippedCount) {
        Alert.alert("Ошибка", "Нет доступных предметов для экипировки.");
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
      // Используем confirm для веб-версии и Alert.alert для мобильной
      if (typeof window !== 'undefined' && window.confirm) {
        // Веб-версия - просто заменяем первое оружие
        if (window.confirm("Заменить оружие 1?")) {
          equipAction(0);
        }
      } else {
        // Мобильная версия
        Alert.alert(
          "Заменить оружие", "Какое оружие вы хотите заменить?",
          [
            { text: "Оружие 1", onPress: () => equipAction(0) },
            { text: "Оружие 2", onPress: () => equipAction(1) },
            { text: "Отмена", style: "cancel" }
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
    const { clothingType, protected_area } = itemToEquip;
    const slotsToOccupy = getSlotsForArea(protected_area);
    

    
    const currentEquipped = equippedArmor;
    const itemsToUnequip = new Set();

    // Определяем тип предмета для правильной логики
    const itemType = itemToEquip.itemType;
    const itemClothingType = itemToEquip.clothingType;

    if (itemType === 'clothing') {
        // Для одежды типа "suit" не снимаем броню, только другую одежду
        if (itemClothingType === 'suit') {
            slotsToOccupy.forEach(slot => {
                if (currentEquipped[slot].clothing) itemsToUnequip.add(currentEquipped[slot].clothing);
                if (currentEquipped[slot].armor?.clothingType === 'outfit') itemsToUnequip.add(currentEquipped[slot].armor);
            });
        } else {
            // Для обычной одежды снимаем и одежду, и броню
            slotsToOccupy.forEach(slot => {
                if (currentEquipped[slot].clothing) itemsToUnequip.add(currentEquipped[slot].clothing);
                if (currentEquipped[slot].armor) itemsToUnequip.add(currentEquipped[slot].armor);
            });
        }
    } else if (itemType === 'armor') {
        // Для брони снимаем только другую броню, но не одежду типа "suit"
        slotsToOccupy.forEach(slot => {
            if (currentEquipped[slot].armor) itemsToUnequip.add(currentEquipped[slot].armor);
        });
    } else if (itemType === 'outfit') {
        // Для костюмов снимаем всё
        slotsToOccupy.forEach(slot => {
            if (currentEquipped[slot].clothing) itemsToUnequip.add(currentEquipped[slot].clothing);
            if (currentEquipped[slot].armor) itemsToUnequip.add(currentEquipped[slot].armor);
        });
    }

    const performEquip = () => {
        const finalEquipped = JSON.parse(JSON.stringify(currentEquipped));

        // Сначала снимаем предметы, которые нужно заменить
        itemsToUnequip.forEach(item => {
            const itemNameToRemove = getItemName(item);
            const itemSlots = getSlotsForArea(item.protected_area);
            itemSlots.forEach(slot => {
                if (getItemName(finalEquipped[slot].clothing) === itemNameToRemove) {
                    finalEquipped[slot].clothing = null;
                }
                if (getItemName(finalEquipped[slot].armor) === itemNameToRemove) {
                    finalEquipped[slot].armor = null;
                }
            });
        });

        // Затем надеваем новый предмет
        const targetSlotType = (itemToEquip.itemType === 'clothing') ? 'clothing' : 'armor';
        slotsToOccupy.forEach(slot => {
            finalEquipped[slot][targetSlotType] = itemToEquip;
        });

        setEquippedArmor(finalEquipped);
    };

    if (itemsToUnequip.size > 0) {
        // Используем confirm для веб-версии и Alert.alert для мобильной
        if (typeof window !== 'undefined' && window.confirm) {
            // Веб-версия
            if (window.confirm("Надетые предметы будут сняты, чтобы освободить место. Продолжить?")) {
                performEquip();
            }
        } else {
            // Мобильная версия
            Alert.alert(
                "Замена экипировки", 
                "Надетые предметы будут сняты, чтобы освободить место. Продолжить?", 
                [
                    { text: "Отмена", style: "cancel" },
                    { text: "Да", onPress: performEquip },
                ]
            );
        }
    } else {
        performEquip();
    }
  };

  const handleUnequipArmor = (itemToUnequip) => {
    const { protected_area, clothingType } = itemToUnequip;
    const slotsToClear = getSlotsForArea(protected_area);



    setEquippedArmor(prevEquipped => {
        const newEquipped = JSON.parse(JSON.stringify(prevEquipped));
        slotsToClear.forEach(slot => {
            // Определяем, какой тип предмета снимаем
            const itemType = itemToUnequip.itemType;
            
            if (itemType === 'clothing') {
                if (newEquipped[slot].clothing && getItemName(newEquipped[slot].clothing) === getItemName(itemToUnequip)) {
                    newEquipped[slot].clothing = null;
                }
            } else if (itemType === 'armor') {
                if (newEquipped[slot].armor && getItemName(newEquipped[slot].armor) === getItemName(itemToUnequip)) {
                    newEquipped[slot].armor = null;
                }
            } else if (itemType === 'outfit') {
                // Для костюмов снимаем и одежду, и броню
                if (newEquipped[slot].clothing && getItemName(newEquipped[slot].clothing) === getItemName(itemToUnequip)) {
                    newEquipped[slot].clothing = null;
                }
                if (newEquipped[slot].armor && getItemName(newEquipped[slot].armor) === getItemName(itemToUnequip)) {
                    newEquipped[slot].armor = null;
                }
            }
        });
        return newEquipped;
    });
  };
  
  const displayItems = useMemo(() => {
    if (!equipment?.items) return [];

    const equippedItemsList = [];
    const processedItemNames = new Set(); 

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

    // Собираем все экипированные предметы брони и одежды
    const equippedArmorItems = new Map(); // itemName -> { item, count, type }

    Object.entries(equippedArmor).forEach(([slotKey, slotData]) => {
        const processItem = (item, type) => {
            if (!item) return;

            const itemName = getItemName(item);
            
            if (equippedArmorItems.has(itemName)) {
                // Если предмет уже есть, увеличиваем счетчик
                const existing = equippedArmorItems.get(itemName);
                existing.count++;
            } else {
                // Добавляем новый предмет
                equippedArmorItems.set(itemName, {
                    item: { 
                        ...item, 
                        itemType: item.itemType || type,
                        isEquipped: true, 
                        quantity: 1, 
                        slot: slotKey, 
                        uniqueId: `${type}-${itemName}` 
                    },
                    count: 1,
                    type: type
                });
            }
        };

        processItem(slotData.clothing, 'clothing');
        processItem(slotData.armor, 'armor');
    });

    // Добавляем экипированные предметы в список
    equippedArmorItems.forEach(({ item, count, type }) => {
        // Получаем модифицированную версию предмета, если она есть
        const itemWithType = {
          ...item,
          itemType: item.itemType || type
        };
        const modifiedItem = getModifiedItem(itemWithType);
        const displayItem = modifiedItem || item;
        
        equippedItemsList.push({
            ...displayItem,
            quantity: count,
            uniqueId: `${type}-${getItemName(item)}`
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
                return equippedName === itemName;
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
        <Text style={[styles.headerText, { flex: 0.7 }]}>ПРЕДМЕТ</Text>
        <Text style={[styles.headerText, { flex: 0.3, textAlign: 'center' }]}>ДЕЙСТВИЕ</Text>
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
    
    const itemName = getItemName(displayItem) || 'Неизвестный предмет';
    const isEquippable = item.itemType === 'weapon' || item.itemType === 'armor' || item.itemType === 'clothing';
    const isChem = item.itemType === 'chem';

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
      displayItem.Цена !== undefined
        ? displayItem.Цена
        : (displayItem.price ?? displayItem.cost)
    ) || 0;
    const weight = parseFloat(String(displayItem.Вес !== undefined ? displayItem.Вес : displayItem.weight).replace(',', '.')) || 0;

    return (
      <View style={styles.tableRow}>
        <View style={styles.mainRowContent}>
          <View style={styles.itemNameContainer}>
            <Text style={[styles.itemNameText, item.isEquipped && styles.equippedItemText]}>{itemName}</Text>
          </View>
        </View>
        <View style={styles.actionContainer}>
          {isEquippable && (
              <TouchableOpacity 
                  style={[styles.actionButton, item.isEquipped ? styles.unequipButton : {}]} 
                  onPress={handleActionPress}>
                  <Text style={styles.actionButtonText}>{item.isEquipped ? '↓ Снять' : '↑ Надеть'}</Text>
              </TouchableOpacity>
          )}

          {isChem && !item.isEquipped && (
              <TouchableOpacity 
                  style={[styles.actionButton, styles.applyButton]} 
                  onPress={() => handleApplyChem(item)}>
                  <Text style={styles.actionButtonText}>Применить</Text>
              </TouchableOpacity>
          )}
          {!item.isEquipped && (
              <TouchableOpacity style={[styles.actionButton, styles.sellButton]} onPress={() => handleSellItem(item)}>
                  <Text style={styles.actionButtonText}>Продать</Text>
              </TouchableOpacity>
          )}
        </View>
        <View style={styles.itemSubRow}>
          <Text style={styles.itemSubText}>Кол-во: {item.isEquipped ? 1 : item.quantity} шт.</Text>
          <Text style={styles.itemSubText}>Цена: {item.isEquipped ? price : (price * item.quantity)}</Text>
          <Text style={styles.itemSubText}>Вес: {item.isEquipped ? Number(weight.toFixed(3)) : Number((weight * item.quantity).toFixed(3))}</Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => (
    <TouchableOpacity style={styles.addButtonRow} onPress={() => setAddItemModalVisible(true)}>
      <Text style={styles.addButtonText}>+</Text>
    </TouchableOpacity>
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
        
        const weight = parseFloat(String(displayItem.Вес !== undefined ? displayItem.Вес : displayItem.weight).replace(',', '.')) || 0;
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
        
        const weight = parseFloat(String(displayWeapon.Вес !== undefined ? displayWeapon.Вес : displayWeapon.weight).replace(',', '.')) || 0;
        total += weight;
      }
    });
    
    // Вес экипированной брони и одежды
    Object.values(equippedArmor).forEach(slotData => {
      if (slotData.armor) {
        const weight = parseFloat(String(slotData.armor.Вес !== undefined ? slotData.armor.Вес : slotData.armor.weight).replace(',', '.')) || 0;
        total += weight;
      }
      if (slotData.clothing) {
        const weight = parseFloat(String(slotData.clothing.Вес !== undefined ? slotData.clothing.Вес : slotData.clothing.weight).replace(',', '.')) || 0;
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
          displayItem.Цена !== undefined
            ? displayItem.Цена
            : (displayItem.price ?? displayItem.cost)
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
        
        const price = parseFloat(displayWeapon.Цена !== undefined ? displayWeapon.Цена : displayWeapon.price) || 0;
        total += price;
      }
    });
    
    // Цена экипированной брони и одежды
    Object.values(equippedArmor).forEach(slotData => {
      if (slotData.armor) {
        const price = parseFloat(slotData.armor.Цена !== undefined ? slotData.armor.Цена : slotData.armor.price) || 0;
        total += price;
      }
      if (slotData.clothing) {
        const price = parseFloat(slotData.clothing.Цена !== undefined ? slotData.clothing.Цена : slotData.clothing.price) || 0;
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
              ListEmptyComponent={<Text style={styles.emptyListText}>Инвентарь пуст</Text>}
              ListFooterComponent={renderFooter}
            />
          </View>
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>Общий вес: {totalWeight}</Text>
            <Text style={styles.summaryText}>Общая цена: {totalPrice}</Text>
          </View>
        </View>
        <AddWeaponModal
          visible={isAddWeaponModalVisible}
          onClose={() => setIsAddWeaponModalVisible(false)}
          weapons={[]}
          onSelectWeapon={handleAddItem}
        />
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
          onSelectItem={handleAddItem}
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
  addButtonRow: {
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
  }
});

export default InventoryScreen; 
