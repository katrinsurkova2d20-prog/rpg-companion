import { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { resolveKitItems } from '../../WeaponsAndArmorScreen/kitResolver.js';

const CATEGORY_LABELS = {
  weapon: 'Оружие',
  armor: 'Броня',
  clothing: 'Одежда',
  chem: 'Химия',
  misc: 'Разное',
  food: 'Провизия',
  loot: 'Лут',
  currency: 'Валюта',
  currency_ncr: 'Валюта',
  ammo: 'Патроны',
};

const toChoiceKey = (kitId, itemIndex) => `${kitId}-${itemIndex}`;
const toGroupKey = (group = []) => `group-${group.map((item) => item?.itemId || item?.weaponId || item?.name).join('+')}`;
const getOptionKey = (option, optionIndex) => {
  if (option?.group) return toGroupKey(option.group);
  return option?.itemId || option?.weaponId || option?.name || `option-${optionIndex}`;
};

const entryToList = (entry, selectedChoices, kitId, itemIndex) => {
  if (!entry) return [];

  if (entry.type === 'choice') {
    const key = toChoiceKey(kitId, itemIndex);
    const options = Array.isArray(entry.items) ? entry.items : [];
    const selectedKey = selectedChoices[key] || getOptionKey(options[0], 0);
    const selectedOption = options.find((opt, idx) => getOptionKey(opt, idx) === selectedKey) || options[0];

    if (!selectedOption) return [];
    if (selectedOption.group) return selectedOption.group;
    return [selectedOption];
  }

  return [entry];
};

const flattenKitItems = (kit, selectedChoices) => (
  (kit.items || []).flatMap((entry, index) => entryToList(entry, selectedChoices, kit.id, index))
);

const toInventoryItems = (entries) => {
  const raw = [];

  entries.forEach((item) => {
    if (!item) return;

    if (item.itemType === 'weapon' || item.weaponId) {
      const weapon = item._weapon || {};
      const appliedMods = {};
      (item._mods || []).forEach((mod) => {
        if (mod.slot && mod.id) appliedMods[mod.slot] = mod.id;
      });

      raw.push({
        ...weapon,
        id: weapon.id || item.weaponId,
        name: item.displayName || item.name || weapon.name,
        Название: item.displayName || item.Название || item.name || weapon.name,
        weaponId: weapon.id || item.weaponId,
        appliedMods,
        quantity: item.quantity || 1,
        itemType: 'weapon',
      });

      if (item.resolvedAmmunition) {
        raw.push({ ...item.resolvedAmmunition, quantity: item.resolvedAmmunition.quantity || 1 });
      }
      return;
    }

    raw.push({
      ...item,
      name: item.name || item.Название || item.itemId,
      Название: item.Название || item.name || item.itemId,
      quantity: item.quantity || 1,
    });
  });

  return raw;
};

const summarizeItems = (items) => {
  const totalCaps = items.reduce((acc, item) => {
    if (item.itemType === 'currency' && item.name === 'Крышки') {
      return acc + (item.quantity || 0);
    }
    return acc;
  }, 0);

  const finalItems = items.filter((item) => item.itemType !== 'currency');

  const weight = finalItems.reduce((acc, item) => {
    const itemWeight = parseFloat(String(item.Вес ?? item.weight ?? '0').replace(',', '.')) || 0;
    return acc + (itemWeight * (item.quantity || 1));
  }, 0);

  const price = finalItems.reduce((acc, item) => {
    const itemPrice = item.Цена ?? item.price ?? 0;
    return acc + (itemPrice * (item.quantity || 1));
  }, 0);

  return { finalItems, totalCaps, weight, price };
};

const getDisplayName = (item) => item.displayName || item.Название || item.name || item.itemId || item.weaponId || 'Неизвестный предмет';

const EquipmentKitModal = ({ visible, onClose, equipmentKits, onSelectKit }) => {
  const [expandedKit, setExpandedKit] = useState(null);
  const [selectedChoices, setSelectedChoices] = useState({});
  const [calculatedKits, setCalculatedKits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible || !equipmentKits?.length) {
      setCalculatedKits([]);
      setSelectedChoices({});
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const resolved = await Promise.all(equipmentKits.map((kit) => resolveKitItems(kit)));
        setCalculatedKits(resolved);

        const defaults = {};
        resolved.forEach((kit) => {
          (kit.items || []).forEach((entry, index) => {
            if (entry?.type === 'choice') {
              const firstOption = (entry.items || [])[0];
              defaults[toChoiceKey(kit.id, index)] = getOptionKey(firstOption, 0);
            }
          });
        });
        setSelectedChoices(defaults);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [visible, equipmentKits]);

  if (!equipmentKits) return null;

  const handleSelectChoice = (kitId, itemIndex, option, optionIndex) => {
    setSelectedChoices((prev) => ({
      ...prev,
      [toChoiceKey(kitId, itemIndex)]: getOptionKey(option, optionIndex),
    }));
  };

  const handleSelectKit = (kit) => {
    const chosenEntries = flattenKitItems(kit, selectedChoices);
    const inventoryItems = toInventoryItems(chosenEntries);
    const { finalItems, totalCaps, weight, price } = summarizeItems(inventoryItems);

    onSelectKit({
      name: kit.name,
      items: finalItems,
      weight,
      price,
      caps: totalCaps,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Выберите комплект снаряжения</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#005A9C" style={{ marginVertical: 30 }} />
          ) : (
            <ScrollView>
              {calculatedKits.map((kit) => (
                <View key={kit.id || kit.name} style={styles.kitContainer}>
                  <TouchableOpacity onPress={() => setExpandedKit((prev) => (prev === kit.id ? null : kit.id))}>
                    <Text style={styles.kitName}>{kit.name}</Text>
                  </TouchableOpacity>

                  {expandedKit === kit.id && (
                    <View style={styles.kitDetails}>
                      {(kit.items || []).map((entry, itemIndex) => {
                        if (entry?.type === 'choice') {
                          return (
                            <View key={`choice-${itemIndex}`} style={styles.choiceContainer}>
                              <Text style={styles.categoryTitle}>Выбор:</Text>
                              {(entry.items || []).map((option, optionIndex) => {
                                const optionKey = getOptionKey(option, optionIndex);
                                const choiceKey = toChoiceKey(kit.id, itemIndex);
                                const selected = selectedChoices[choiceKey] === optionKey;

                                const optionLabel = option.group
                                  ? option.group.map((groupItem) => getDisplayName(groupItem)).join(' + ')
                                  : getDisplayName(option);

                                return (
                                  <TouchableOpacity
                                    key={optionKey}
                                    style={styles.radioContainer}
                                    onPress={() => handleSelectChoice(kit.id, itemIndex, option, optionIndex)}
                                  >
                                    <View style={[styles.radio, selected && styles.radioSelected]} />
                                    <Text>{optionLabel}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          );
                        }

                        const category = CATEGORY_LABELS[entry?.itemType] || 'Снаряжение';
                        return (
                          <View key={`fixed-${itemIndex}`} style={styles.fixedItem}>
                            <Text style={styles.categoryPill}>{category}</Text>
                            <Text>{getDisplayName(entry)}</Text>
                            {entry.resolvedAmmunition && (
                              <Text style={styles.ammoText}> ({entry.resolvedAmmunition.quantity} шт. {entry.resolvedAmmunition.name})</Text>
                            )}
                          </View>
                        );
                      })}

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
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 5,
  },
  fixedItem: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryPill: {
    fontSize: 12,
    color: '#005A9C',
    borderWidth: 1,
    borderColor: '#005A9C',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  choiceContainer: {
    marginVertical: 8,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#999',
    marginRight: 8,
  },
  radioSelected: {
    borderColor: '#005A9C',
    backgroundColor: '#005A9C',
  },
  selectButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  closeButton: {
    marginTop: 15,
    backgroundColor: '#D9534F',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  ammoText: {
    color: '#666',
  },
});

export default EquipmentKitModal;
