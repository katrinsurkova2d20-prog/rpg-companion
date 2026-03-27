import { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { resolveKitItems } from '../../WeaponsAndArmorScreen/kitResolver.js';

// Безопасный match для возможных не-строковых значений
const safeMatch = (value, regex) => (typeof value === 'string' ? value.match(regex) : null);
const toGroupKey = (group) =>
  `group-${(Array.isArray(group) ? group : [])
    .map(i => i?.name)
    .filter(Boolean)
    .join('+')}`;

const kitCategories = [
  { key: 'armor', title: 'Броня' },
  { key: 'clothing', title: 'Одежда' },
  { key: 'weapons', title: 'Оружие' },
  { key: 'miscellaneous', title: 'Разное' },
  { key: 'loot', title: 'Прочее' },
];

const EquipmentKitModal = ({ visible, onClose, equipmentKits, onSelectKit }) => {
  const [expandedKit, setExpandedKit] = useState(null);
  const [selectedChoices, setSelectedChoices] = useState({});
  const [calculatedKits, setCalculatedKits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible || !equipmentKits?.length) return;

    const resolveKits = async () => {
      setIsLoading(true);
      try {
        const resolved = await Promise.all(equipmentKits.map(kit => resolveKitItems(kit)));
        setCalculatedKits(resolved);

        // Устанавливаем выборы по умолчанию
        const initialChoices = {};
        resolved.forEach(kit => {
          kitCategories.forEach(({ key }) => {
            if (kit[key]) {
              kit[key].forEach((item, index) => {
                if (item?.type === 'choice') {
                  const firstOption = Array.isArray(item.options) ? item.options[0] : null;
                  if (firstOption?.group) {
                    initialChoices[`${kit.name}-${key}-${index}`] = toGroupKey(firstOption.group);
                  } else {
                    initialChoices[`${kit.name}-${key}-${index}`] = firstOption?.name;
                  }
                }
              });
            }
          });
        });
        setSelectedChoices(initialChoices);
      } catch (e) {
      } finally {
        setIsLoading(false);
      }
    };

    resolveKits();
  }, [visible, equipmentKits]);

  if (!equipmentKits) return null;

  const handleSelectChoice = (kitName, categoryKey, itemIndex, option) => {
    const isGroup = !!option.group;
    const groupKey = isGroup ? toGroupKey(option.group) : option.name;
    setSelectedChoices(prev => ({ ...prev, [`${kitName}-${categoryKey}-${itemIndex}`]: groupKey }));
  };

  const handleSelectKit = async (kit) => {
    const rawItems = [];

    for (const { key } of kitCategories) {
      if (kit[key]) {
        for (let index = 0; index < kit[key].length; index++) {
          const item = kit[key][index];
          let chosenItem = item.type === 'choice' ? null : item;
          if (item.type === 'choice') {
            const selectedKey = selectedChoices[`${kit.name}-${key}-${index}`];
            const options = Array.isArray(item.options) ? item.options : [];
            chosenItem = options.find(opt => {
              const isGroup = !!opt.group;
              const groupKey = isGroup ? toGroupKey(opt.group) : opt.name;
              return groupKey === selectedKey;
            }) || options[0] || null;
          }

          if (chosenItem) {
            if (chosenItem.group) {
              chosenItem.group.forEach(groupItem => {
                rawItems.push({ name: groupItem.name, quantity: groupItem.quantity || 1 });
              });
            } else if (chosenItem.itemType === 'weapon' || chosenItem.weaponId) {
              // Оружие из БД — строим финальный объект
              const weapon = chosenItem._weapon || {};
              const mods = chosenItem._mods || [];
              const appliedMods = {};
              mods.forEach(m => { if (m.slot && m.id) appliedMods[m.slot] = m.id; });

              const weaponObj = {
                ...weapon,
                // приоритет БД: id/name/damage/...
                // для совместимости оставляем weaponId, но основное поле — id
                id: weapon.id || chosenItem.weaponId,
                name: chosenItem.displayName || chosenItem.name || weapon.name,
                weaponId: weapon.id || chosenItem.weaponId,
                appliedMods,
                quantity: chosenItem.quantity || 1,
                itemType: 'weapon',
              };
              rawItems.push(weaponObj);
            } else {
              rawItems.push({
                ...chosenItem,
                Название: chosenItem.Название || chosenItem.name,
                quantity: chosenItem.quantity || 1,
              });
            }

            // Патроны уже разрешены в resolveKitItems
            if (chosenItem.resolvedAmmunition) {
              rawItems.push(chosenItem.resolvedAmmunition);
            }
          }
        }
      }
    }

    // Добавляем случайный лут
    if (kit.resolvedLoot) {
      rawItems.push(...kit.resolvedLoot.filter(Boolean));
    }


    const allItems = rawItems.flatMap(item => {
      if (!item) return [];

      // Крышки
      const capsTagMatch = safeMatch(item.name, /(\d+)\s*<caps>/);
      if (capsTagMatch) {
        return [{ name: 'Крышки', Название: 'Крышки', quantity: parseInt(capsTagMatch[1], 10), itemType: 'currency', Цена: 1, Вес: 0 }];
      }

      // Уже готовые объекты (патроны, лут, валюта)
      if (item.type === 'ammo' || item.itemType === 'loot' || item.itemType === 'currency') {
        return [{ ...item, Название: item.Название || item.name, quantity: item.quantity || 1 }];
      }

      // Химикаты с полными данными
      if (item.itemType === 'chem' && item.Вес !== undefined && item.Цена !== undefined) {
        return [{ ...item, Название: item.Название || item.name, quantity: item.quantity || 1 }];
      }

      // Оружие из БД
      if (item.itemType === 'weapon') {
        return [{ ...item, Название: item.Название || item.name, quantity: item.quantity || 1 }];
      }

      // Всё остальное — передаём как есть с гарантией Название
      const passthrough = { ...item, Название: item.Название || item.name, quantity: item.quantity || 1 };
      if (!item.Название && !item.name) {
      }
      return [passthrough];
    }).filter(Boolean);


    const totalCaps = allItems.reduce((acc, item) => {
      if (item.itemType === 'currency' && item.name === 'Крышки') return acc + (item.quantity || 0);
      return acc;
    }, 0);

    const finalItems = allItems.filter(item => item.itemType !== 'currency');

    const totalWeight = finalItems.reduce((acc, item) => {
      const weight = parseFloat(String(item.Вес ?? '0').replace(',', '.')) || 0;
      return acc + weight * (item.quantity || 1);
    }, 0);

    const totalPrice = finalItems.reduce((acc, item) => {
      return acc + ((item.Цена ?? 0) * (item.quantity || 1));
    }, 0);

    const payload = { name: kit.name, items: finalItems, weight: totalWeight, price: totalPrice, caps: totalCaps };
    onSelectKit(payload);
    onClose();
  };

  const toggleExpand = (kitName) => {
    setExpandedKit(k => (k === kitName ? null : kitName));
  };

  const renderItemDetails = (item) => {
    const lootDetails = item.resolvedAmmunition;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text>{item.displayName || item.Название || item.name}</Text>
        {lootDetails && (
          <Text style={styles.ammoText}>
            ({lootDetails.quantity}шт. {lootDetails.name})
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Выберите комплект снаряжения</Text>
          {isLoading ? (
            <ActivityIndicator size="large" color="#005A9C" style={{ marginVertical: 30 }} />
          ) : (
            <ScrollView>
              {calculatedKits.map((kit) => (
                <View key={kit.name} style={styles.kitContainer}>
                  <TouchableOpacity onPress={() => toggleExpand(kit.name)}>
                    <Text style={styles.kitName}>{kit.name}</Text>
                  </TouchableOpacity>

                  {expandedKit === kit.name && (
                    <View style={styles.kitDetails}>
                      {kitCategories.map(({ key, title }) => (
                        kit[key] && (
                          <View key={key} style={styles.categoryContainer}>
                            <Text style={styles.categoryTitle}>{title}:</Text>
                            {kit[key].map((item, index) => {
                              if (item.resolved) {
                                return (
                                  <View key={index} style={styles.fixedItem}>
                                    <Text>{item.name}: {item.quantity} шт.</Text>
                                  </View>
                                );
                              }
                              if (item?.type === 'choice') {
                                return (
                                  <View key={index} style={styles.choiceContainer}>
                                    {(Array.isArray(item.options) ? item.options : []).map((opt, optionIndex) => {
                                      const isGroup = !!opt.group;
                                      const groupKey = isGroup ? toGroupKey(opt.group) : (opt.name || `${kit.name}-${key}-${index}-${optionIndex}`);
                                      return (
                                        <TouchableOpacity
                                          key={groupKey}
                                          style={styles.radioContainer}
                                          onPress={() => handleSelectChoice(kit.name, key, index, opt)}
                                        >
                                          <View style={[
                                            styles.radio,
                                            selectedChoices[`${kit.name}-${key}-${index}`] === groupKey && styles.radioSelected
                                          ]} />
                                          {isGroup
                                            ? <Text>{(Array.isArray(opt.group) ? opt.group : []).map(i => i?.name).filter(Boolean).join(' + ')}</Text>
                                            : renderItemDetails(opt)
                                          }
                                        </TouchableOpacity>
                                      );
                                    })}
                                  </View>
                                );
                              }
                              if (item?.type === 'fixed' || !item?.type) {
                                return (
                                  <View key={index} style={styles.fixedItem}>
                                    {renderItemDetails(item)}
                                  </View>
                                );
                              }
                              return null;
                            })}
                          </View>
                        )
                      ))}

                      {kit.resolvedLoot?.map((item, index) => item && (
                        <Text key={`loot-${index}`} style={styles.detailText}>- {item.quantity}шт. {item.name}</Text>
                      ))}

                      <TouchableOpacity style={styles.selectButton} onPress={() => handleSelectKit(kit)}>
                        <Text style={styles.selectButtonText}>Выбрать</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Закрыть</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  kitContainer: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
  },
  kitName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#005A9C',
  },
  kitDetails: {
    marginTop: 10,
    paddingLeft: 15,
  },
  categoryContainer: {
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 5,
  },
  fixedItem: {
    marginLeft: 10,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  choiceContainer: {
    marginVertical: 5,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 10,
  },
  radio: {
    height: 22,
    width: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#005A9C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioSelected: {
    backgroundColor: '#005A9C',
  },
  ammoText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 5,
  },
  selectButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#C62828',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EquipmentKitModal;
