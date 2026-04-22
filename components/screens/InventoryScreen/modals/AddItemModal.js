import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView, TextInput } from 'react-native';
import { getEquipmentCatalog } from '../../../../i18n/equipmentCatalog';
import { getWeaponById, getWeapons } from '../../../../db';
import { tInventory } from '../logic/inventoryI18n';
import { useLocale } from '../../../../i18n/locale';

const CATEGORY_ICONS = {
  weapon: '🔫',
  armor: '🛡️',
  clothing: '👕',
  ammo: '🔹',
  food: '🍖',
  drinks: '🥤',
  chems: '💊',
  materials: '🧰',
};

const mapWeaponTypeToDbValue = {
  light: 'Light',
  heavy: 'Heavy',
  energy: 'Energy',
  melee: 'Melee',
  unarmed: 'Unarmed',
  thrown: 'Thrown',
  explosive: 'Explosive',
};

const AddItemModal = ({ visible, onClose, onSelectItem, rootTitleKey = 'modals.addItemModal.title' }) => {
  const locale = useLocale();
  const [currentPath, setCurrentPath] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [weaponsByType, setWeaponsByType] = useState({});

  useEffect(() => {
    let cancelled = false;

    const loadWeaponsFromDb = async () => {
      try {
        const entries = await Promise.all(
          Object.entries(mapWeaponTypeToDbValue).map(async ([groupKey, weaponType]) => {
            // 1) Получаем список оружия по weapon_type
            const weaponsByTypeList = await getWeapons(weaponType);
            const weaponIds = weaponsByTypeList
              .map((weapon) => weapon?.id)
              .filter(Boolean);

            // 2) Получаем каждую пушку по id
            const weaponsById = await Promise.all(weaponIds.map((id) => getWeaponById(id)));
            const normalizedWeapons = weaponsById
              .filter(Boolean)
              .map((weapon) => ({
                ...weapon,
                weaponType: weapon.weapon_type || weapon.weaponType,
                itemType: 'weapon',
                // 3) Для отображения используем name
                name: weapon.name,
              }))
              .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

            return [groupKey, normalizedWeapons];
          })
        );

        if (cancelled) return;

        const groupedWeapons = {};
        entries.forEach(([groupKey, weapons]) => {
          if (!weapons.length) return;
          const label = tInventory(`modals.addItemModal.weaponTypeLabels.${groupKey}`);
          groupedWeapons[label] = weapons;
        });

        setWeaponsByType(groupedWeapons);
      } catch (error) {
        if (!cancelled) {
          setWeaponsByType({});
        }
      }
    };

    loadWeaponsFromDb();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const staticData = useMemo(() => {
    const equipmentCatalog = getEquipmentCatalog(locale);
    return {
      [tInventory('modals.addItemModal.categories.armor')]: (equipmentCatalog.armor?.armor || []).reduce((acc, category) => {
        acc[category.type] = category.items;
        return acc;
      }, {}),
      [tInventory('modals.addItemModal.categories.clothing')]: (equipmentCatalog.clothes?.clothes || []).reduce((acc, category) => {
        acc[category.type] = category.items;
        return acc;
      }, {}),
      [tInventory('modals.addItemModal.categories.ammo')]: {
        [tInventory('modals.addItemModal.categories.all')]: Array.isArray(equipmentCatalog.ammoData) ? equipmentCatalog.ammoData : [],
      },
      [tInventory('modals.addItemModal.categories.food')]: {
        [tInventory('modals.addItemModal.categories.all')]: [],
      },
      [tInventory('modals.addItemModal.categories.drinks')]: {
        [tInventory('modals.addItemModal.categories.all')]: equipmentCatalog.drinks || [],
      },
      [tInventory('modals.addItemModal.categories.chems')]: {
        [tInventory('modals.addItemModal.categories.all')]: equipmentCatalog.chems || [],
      },
      [tInventory('modals.addItemModal.categories.materials')]: {
        [tInventory('modals.addItemModal.categories.all')]: [],
      },
    };
  }, [locale]);

  useEffect(() => {
    if (visible) {
      setCurrentPath([]);
      setSearchTerm('');
    }
  }, [visible]);

  const allData = useMemo(() => ({
    [tInventory('modals.addItemModal.categories.weapon')]: weaponsByType,
    ...staticData,
  }), [locale, weaponsByType, staticData]);

  const getTypeLabelAndIcon = (itemType) => {
    if (itemType === 'weapon') return tInventory('modals.addItemModal.itemTypes.weapon');
    if (itemType === 'armor') return tInventory('modals.addItemModal.itemTypes.armor');
    if (itemType === 'clothing' || itemType === 'outfit') return tInventory('modals.addItemModal.itemTypes.clothing');
    if (itemType === 'chem' || itemType === 'chems') return tInventory('modals.addItemModal.itemTypes.chem');
    if (itemType === 'drinks') return tInventory('modals.addItemModal.itemTypes.drinks');
    if (itemType === 'ammo') return tInventory('modals.addItemModal.itemTypes.ammo');
    return '';
  };

  const unwrapSingleAllCategory = (data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
    const keys = Object.keys(data);
    const allLabel = tInventory('modals.addItemModal.categories.all');
    if (keys.length === 1 && keys[0] === allLabel && Array.isArray(data[allLabel])) {
      return data[allLabel];
    }
    return data;
  };

  const handleSelect = (item) => {
    if (typeof item === 'object' && item?.name) {
      onSelectItem(item);
      onClose();
      return;
    }
    setCurrentPath([...currentPath, item]);
  };

  const currentData = useMemo(() => {
    if (searchTerm) {
      const allItems = [];
      Object.values(allData[tInventory('modals.addItemModal.categories.weapon')] || {}).forEach((items) => Array.isArray(items) && allItems.push(...items));
      Object.values(allData[tInventory('modals.addItemModal.categories.armor')] || {}).forEach((items) => Array.isArray(items) && allItems.push(...items));
      Object.values(allData[tInventory('modals.addItemModal.categories.clothing')] || {}).forEach((items) => Array.isArray(items) && allItems.push(...items));

      const allLabel = tInventory('modals.addItemModal.categories.all');
      const categoryKeys = ['ammo', 'chems', 'drinks'].map((key) => tInventory(`modals.addItemModal.categories.${key}`));
      categoryKeys.forEach((category) => {
        if (allData[category]?.[allLabel]) {
          allItems.push(...allData[category][allLabel]);
        }
      });

      return {
        items: allItems.filter((item) => item?.name?.toLowerCase().includes(searchTerm.toLowerCase())),
      };
    }

    let data = allData;
    for (const key of currentPath) {
      if (!data || typeof data !== 'object') return { categories: [] };
      data = data[key];
    }

    data = unwrapSingleAllCategory(data);
    if (Array.isArray(data)) return { items: data };
    if (data && typeof data === 'object') return { categories: Object.keys(data) };
    return { categories: [] };
  }, [locale, allData, currentPath, searchTerm]);

  const renderItem = ({ item }) => {
    const isItem = typeof item === 'object' && item?.name;
    const itemTypeLabel = isItem ? getTypeLabelAndIcon(item.itemType) : '';

    return (
      <TouchableOpacity style={styles.itemContainer} onPress={() => handleSelect(item)}>
        <Text style={styles.itemName}>{isItem ? item.name : item}</Text>
        {!isItem && <Text style={styles.itemType}>{CATEGORY_ICONS[Object.keys(CATEGORY_ICONS).find((key) => tInventory(`modals.addItemModal.categories.${key}`) === item)] || '📁'}</Text>}
        {isItem && Boolean(itemTypeLabel) && <Text style={styles.itemType}>{itemTypeLabel}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <SafeAreaView style={styles.modalContent}>
          <Text style={styles.title}>{currentPath.length > 0 ? currentPath[currentPath.length - 1] : tInventory(rootTitleKey)}</Text>

          {currentPath.length > 0 && !searchTerm && (
            <TouchableOpacity style={styles.backButton} onPress={() => setCurrentPath(currentPath.slice(0, -1))}>
              <Text style={styles.backButtonText}>{tInventory('modals.addItemModal.back')}</Text>
            </TouchableOpacity>
          )}

          <TextInput
            style={styles.searchInput}
            placeholder={tInventory('modals.addItemModal.searchPlaceholder')}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />

          <FlatList
            data={currentData.items || currentData.categories}
            renderItem={renderItem}
            keyExtractor={(item, index) => `${typeof item === 'object' ? item.name : item}-${index}`}
            ListEmptyComponent={<Text style={styles.emptyText}>{tInventory('modals.addItemModal.emptyCategory')}</Text>}
          />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{tInventory('modals.addItemModal.close')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', paddingHorizontal: 16, paddingVertical: 24 },
  modalContent: { width: '80%', height: '80%', backgroundColor: 'white', borderRadius: 10, paddingVertical: 20, paddingHorizontal: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', paddingHorizontal: 8 },
  backButton: { alignSelf: 'flex-start', marginBottom: 8 },
  backButtonText: { color: '#1A73E8', fontSize: 14 },
  searchInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 12 },
  itemContainer: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#efefef', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 16, flex: 1, paddingRight: 8 },
  itemType: { fontSize: 14, color: '#444' },
  emptyText: { textAlign: 'center', marginVertical: 20, color: '#777' },
  closeButton: { backgroundColor: '#DC3545', padding: 10, borderRadius: 5, marginTop: 12, alignItems: 'center' },
  closeButtonText: { color: 'white', fontWeight: 'bold' },
});

export default AddItemModal;
