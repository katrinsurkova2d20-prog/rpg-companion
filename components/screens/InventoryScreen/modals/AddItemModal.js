import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView, TextInput } from 'react-native';
import { getWeapons } from '../../../../db/Database';
import { getEquipmentCatalog } from '../../../../i18n/equipmentCatalog';

const WEAPON_TYPE_LABELS = {
  'Light': 'Стрелковое',
  'Small Guns': 'Стрелковое',
  'Heavy': 'Тяжелое',
  'Big Guns': 'Тяжелое',
  'Energy': 'Энергетическое',
  'Energy Weapons': 'Энергетическое',
  'Melee': 'Ближний бой',
  'Melee Weapons': 'Ближний бой',
  'Unarmed': 'Рукопашная',
  'Thrown': 'Метательное',
  'Throwing': 'Метательное',
  'Explosive': 'Взрывчатка',
  'Explosives': 'Взрывчатка',
};

const AddItemModal = ({ visible, onClose, onSelectItem }) => {
  const [currentPath, setCurrentPath] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [weaponsByType, setWeaponsByType] = useState({});
  const getItemName = (item) => item?.Name;

  const staticData = useMemo(() => {
    const equipmentCatalog = getEquipmentCatalog();

    return {
      'Броня': (equipmentCatalog.armor?.armor || []).reduce((acc, category) => {
        acc[category.type] = category.items;
        return acc;
      }, {}),
      'Одежда': (equipmentCatalog.clothes?.clothes || []).reduce((acc, category) => {
        acc[category.type] = category.items;
        return acc;
      }, {}),
      'Боеприпасы': { 'Все': Array.isArray(equipmentCatalog.ammoData) ? equipmentCatalog.ammoData : [] },
      'Еда': {},
      'Препараты': { 'Все': equipmentCatalog.chems },
      'Материалы': {},
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    getWeapons().then(weapons => {
      const grouped = {};
      (weapons || []).forEach(w => {
        const label = WEAPON_TYPE_LABELS[w.weapon_type] || w.weapon_type || 'Прочее';
        if (!grouped[label]) grouped[label] = [];
        grouped[label].push({ ...w, itemType: 'weapon' });
      });
      setWeaponsByType(grouped);
    });
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setCurrentPath([]);
      setSearchTerm('');
    }
  }, [visible]);

  const allData = useMemo(() => ({
    'Оружие': weaponsByType,
    ...staticData,
  }), [weaponsByType, staticData]);

  const handleSelect = (item) => {
    const itemName = getItemName(item);
    if (typeof item === 'object' && itemName) {
      onSelectItem(item);
      onClose();
    } else {
      setCurrentPath([...currentPath, item]);
    }
  };

  const goBack = () => {
    setCurrentPath(currentPath.slice(0, -1));
  };

  const currentData = useMemo(() => {
    if (searchTerm) {
      // Собираем все предметы из всех категорий
      const allItems = [];
      
      // Обрабатываем оружие
      Object.values(allData['Оружие']).forEach(weaponArray => {
        if (Array.isArray(weaponArray)) {
          allItems.push(...weaponArray);
        }
      });
      
      // Обрабатываем броню
      Object.values(allData['Броня']).forEach(armorArray => {
        if (Array.isArray(armorArray)) {
          allItems.push(...armorArray);
        }
      });
      
      // Обрабатываем одежду
      Object.values(allData['Одежда']).forEach(clothesArray => {
        if (Array.isArray(clothesArray)) {
          allItems.push(...clothesArray);
        }
      });
      
      // Обрабатываем боеприпасы
      if (allData['Боеприпасы']['Все']) {
        allItems.push(...allData['Боеприпасы']['Все']);
      }
      
      // Обрабатываем препараты
      if (allData['Препараты']['Все']) {
        allItems.push(...allData['Препараты']['Все']);
      }
      
      // Фильтруем по поисковому запросу
      const filteredItems = allItems.filter(item => {
        if (!item) return false;
        const itemName = getItemName(item);
        return itemName && itemName.toLowerCase().includes(searchTerm.toLowerCase());
      });
      
      return { items: filteredItems };
    }

    let data = allData;
    for (const key of currentPath) {
      if (!data || typeof data !== 'object') {
        return { categories: [] };
      }
      data = data[key];
    }
    
    // Check if after navigating, the result is an array of items.
    // This happens for categories like 'Кожаная броня'.
    if (Array.isArray(data)) {
        return { items: data };
    }

    // If it's an object, it could be a container for categories or items.
    // This handles nested categories.
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        return { categories: Object.keys(data) };
    }

    // Fallback for empty or invalid paths
    return { categories: [] };

  }, [currentPath, searchTerm, allData]);

  const renderItem = ({ item }) => {
    const itemName = getItemName(item);
    const isItem = typeof item === 'object' && itemName;
    
    // Определяем тип предмета для отображения
    let itemType = '';
    if (isItem) {
      if (item.itemType === 'weapon') itemType = '🔫 Оружие';
      else if (item.itemType === 'armor') itemType = '🛡️ Броня';
      else if (item.itemType === 'clothing') itemType = '👕 Одежда';
      else if (item.itemType === 'chem') itemType = '💊 Препарат';
      else if (item.itemType === 'ammo') itemType = '🔹 Боеприпасы';
    }
    
    return (
      <TouchableOpacity style={styles.itemContainer} onPress={() => handleSelect(item)}>
        <Text style={styles.itemName}>{isItem ? itemName : item}</Text>
        {isItem && itemType && <Text style={styles.itemType}>{itemType}</Text>}
      </TouchableOpacity>
    );
  };
  
  const ListHeader = () => (
    <>
      <Text style={styles.title}>{currentPath.length > 0 ? currentPath[currentPath.length - 1] : 'Добавить предмет'}</Text>
      {currentPath.length > 0 && (
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>...Назад</Text>
        </TouchableOpacity>
      )}
      <TextInput
        style={styles.searchInput}
        placeholder="Поиск по всем предметам..."
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
    </>
  );

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <SafeAreaView style={styles.modalContent}>
          <Text style={styles.title}>{currentPath.length > 0 ? currentPath[currentPath.length - 1] : 'Добавить предмет'}</Text>
          
          {currentPath.length > 0 && !searchTerm && (
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Text style={styles.backButtonText}>...Назад</Text>
            </TouchableOpacity>
          )}

          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по всем предметам..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />

          <FlatList
            data={currentData.items || currentData.categories}
            renderItem={renderItem}
            keyExtractor={(item, index) => {
                const key = typeof item === 'object' ? item.Name : item;
                return `${key}-${index}`;
            }}
            ListEmptyComponent={<Text style={styles.emptyText}>Категория пуста</Text>}
          />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Закрыть</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
      modalContent: {
        width: '90%',
        height: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
      },
      title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
      },
      searchInput: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 15,
      },
          itemContainer: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    itemName: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    itemType: {
      fontSize: 12,
      color: '#666',
      marginTop: 4,
    },
      backButton: {
        marginBottom: 10,
      },
      backButtonText: {
        fontSize: 16,
        color: '#007AFF',
      },
      closeButton: {
        backgroundColor: '#DC3545',
        padding: 10,
        borderRadius: 5,
        marginTop: 20,
        alignItems: 'center',
      },
      closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
      },
      emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#888'
      }
});

export default AddItemModal; 
