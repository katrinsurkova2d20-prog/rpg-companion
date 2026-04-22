import { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { resolveKitItems } from '../../WeaponsAndArmorScreen/kitResolver.js';

const CATEGORY_LABELS = {
  weapon: 'Оружие',
  armor: 'Броня',
  clothing: 'Одежда',
  chem: 'Химия',
  misc: 'Разное',
  module: 'Модули',
  food: 'Провизия',
  loot: 'Прочее',
  currency: 'Валюта',
  currency_ncr: 'Валюта',
  ammo: 'Патроны',
};

const CATEGORY_ORDER = ['armor', 'clothing', 'weapon', 'module', 'chem', 'food', 'ammo', 'misc', 'loot', 'currency', 'currency_ncr'];

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
const getItemCategory = (item) => item?.itemType || (item?.weaponId ? 'weapon' : 'misc');


const formatQuantitySuffix = (item) => {
  const qty = Number(item?.quantity || 0);
  if (!qty || qty <= 1) return '';
  if (item?.itemType === 'currency') return ` (${qty} крышек)`;
  return ` (${qty} шт.)`;
};

const formatAmmoSuffix = (ammo) => {
  if (!ammo) return '';
  const qty = Number(ammo.quantity || 0);
  const qtyText = qty > 0 ? `${qty} шт.` : '0 шт.';
  return ` (${qtyText} ${ammo.name})`;
};

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
        const resolved = await Promise.all(
          equipmentKits.map(async (kit) => {
            try {
              return await resolveKitItems(kit);
            } catch (error) {
              console.warn('Не удалось разрешить комплект снаряжения, используется исходный набор:', kit?.id, error);
              return kit;
            }
          }),
        );
        const validKits = resolved.filter((kit) => kit && Array.isArray(kit.items) && kit.items.length > 0);
        setCalculatedKits(validKits);

        const defaults = {};
        validKits.forEach((kit) => {
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

  const getGroupedEntries = (kit) => {
    const groups = {};

    (kit.items || []).forEach((entry, index) => {
      if (entry?.hiddenInKitModal) return;
      if (entry?.type === 'choice') {
        const firstOption = (entry.items || [])[0];
        const category = getItemCategory(firstOption);
        if (!groups[category]) groups[category] = [];
        groups[category].push({ ...entry, _entryIndex: index });
      } else {
        const category = getItemCategory(entry);
        if (!groups[category]) groups[category] = [];
        groups[category].push({ ...entry, _entryIndex: index });
      }
    });

    return groups;
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
              {calculatedKits.map((kit) => {
                const groups = getGroupedEntries(kit);
                return (
                  <View key={kit.id || kit.name} style={styles.kitContainer}>
                    <TouchableOpacity onPress={() => setExpandedKit((prev) => (prev === kit.id ? null : kit.id))}>
                      <Text style={styles.kitName}>{kit.name}</Text>
                    </TouchableOpacity>

                    {expandedKit === kit.id && (
                      <View style={styles.kitDetails}>
                        {CATEGORY_ORDER.map((category) => {
                          if (!groups[category]?.length) return null;

                          return (
                            <View key={category} style={styles.categoryContainer}>
                              <Text style={styles.categoryTitle}>{CATEGORY_LABELS[category] || 'Снаряжение'}:</Text>
                              {groups[category].map((entry) => {
                                if (entry?.type === 'choice') {
                                  return (
                                    <View key={`choice-${entry._entryIndex}`} style={styles.choiceContainer}>
                                      {(entry.items || []).map((option, optionIndex) => {
                                        const optionKey = getOptionKey(option, optionIndex);
                                        const choiceKey = toChoiceKey(kit.id, entry._entryIndex);
                                        const selected = selectedChoices[choiceKey] === optionKey;

                                        const optionLabel = option.group
                                          ? option.group.map((groupItem) => getDisplayName(groupItem)).join(' + ')
                                          : getDisplayName(option);

                                        return (
                                          <TouchableOpacity
                                            key={optionKey}
                                            style={styles.radioContainer}
                                            onPress={() => handleSelectChoice(kit.id, entry._entryIndex, option, optionIndex)}
                                          >
                                            <View style={[styles.radio, selected && styles.radioSelected]} />
                                            <Text>{optionLabel}</Text>
                                            <Text>{formatQuantitySuffix(option)}</Text>
                                            {option?.resolvedAmmunition && (
                                              <Text style={styles.ammoText}>{formatAmmoSuffix(option.resolvedAmmunition)}</Text>
                                            )}
                                          </TouchableOpacity>
                                        );
                                      })}
                                    </View>
                                  );
                                }

                                return (
                                  <View key={`fixed-${entry._entryIndex}`} style={styles.fixedItem}>
                                    <Text>{getDisplayName(entry)}{formatQuantitySuffix(entry)}</Text>
                                    {entry.resolvedAmmunition && (
                                      <Text style={styles.ammoText}>{formatAmmoSuffix(entry.resolvedAmmunition)}</Text>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          );
                        })}

                        <TouchableOpacity style={styles.selectButton} onPress={() => handleSelectKit(kit)}>
                          <Text style={styles.selectButtonText}>Выбрать</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
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
  fixedItem: {
    marginLeft: 10,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  choiceContainer: {
    marginVertical: 5,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 10,
    flexWrap: 'wrap',
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
