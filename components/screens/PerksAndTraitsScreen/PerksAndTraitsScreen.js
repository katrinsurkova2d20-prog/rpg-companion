import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useCharacter } from '../../CharacterContext';
import { getTraitDisplayDescription } from '../CharacterScreen/logic/traitsData';
import perksData from '../../../assets/Perks/perks.json';
import PerkSelectModal from './PerkSelectModal';

const PerksAndTraitsScreen = () => {
  const { 
    trait, level, selectedPerks, setSelectedPerks, annotatePerks, 
    addPerkAttributePoints, attributesSaved 
  } = useCharacter();
  const [isPerkModalVisible, setPerkModalVisible] = useState(false);

  // Создаем массив из 20 строк
  const emptyRows = Array(20).fill(null);

  const annotatedPerks = useMemo(() => annotatePerks(perksData), [annotatePerks]);

  const handleAddPerkPress = () => {
    if (selectedPerks.length >= level) {
      const message = 'На текущем уровне больше перков взять нельзя';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Предупреждение', message);
      }
      return;
    }
    setPerkModalVisible(true);
  };

  const handleChoosePerk = (perk) => {
    console.log('handleChoosePerk called with perk:', perk);
    if (!perk) return;
    
    // Блокируем выбор, если уже взяли максимум на уровне (доп. защита)
    if (selectedPerks.length >= level) {
      const message = 'На текущем уровне больше перков взять нельзя';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Предупреждение', message);
      }
      return;
    }

    // Специальная обработка для перка "ИНТЕНСИВНЫЕ ТРЕНИРОВКИ"
    console.log('Checking perk name:', perk.perk_name, '===', "ИНТЕНСИВНЫЕ ТРЕНИРОВКИ");
    if (perk.perk_name === "ИНТЕНСИВНЫЕ ТРЕНИРОВКИ") {
      // Проверяем условия для выбора этого перка
      const canTakeIntensiveTraining = level >= 2 || attributesSaved;
      
      if (!canTakeIntensiveTraining) {
        const message = 'Перк "Интенсивные тренировки" можно взять только на уровне 2+ или после завершения создания персонажа (распределения атрибутов)';
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Ошибка', message);
        }
        return;
      }

      // Добавляем очко атрибута
      const attributeBonus = perk.modifiers?.attributeBonus || 1;
      console.log('Adding perk attribute points:', attributeBonus);
      addPerkAttributePoints(attributeBonus);
      console.log('Perk attribute points added successfully');
      
      // Показываем сообщение пользователю
      const successMessage = `Перк "${perk.perk_name}" выбран! Вы получили +${attributeBonus} очко атрибута. Перейдите на вкладку "Персонаж", чтобы распределить его.`;
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert('Перк выбран', successMessage);
      }
    }

    setSelectedPerks(prev => [...prev, perk]);
    setPerkModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.table}>
          {/* Заголовок таблицы */}
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerText, styles.nameColumn]}>Название</Text>
            <Text style={[styles.cell, styles.headerText, styles.rankColumn]}>Ранг</Text>
            <Text style={[styles.cell, styles.headerText, styles.descriptionColumn]}>Описание</Text>
          </View>

          {/* Строка с чертой, если она есть */}
          {trait && (
            <View style={styles.row}>
              <Text style={[styles.cell, styles.nameColumn]}>{trait.name}</Text>
              <Text style={[styles.cell, styles.rankColumn]}></Text>
              <Text style={[styles.cell, styles.descriptionColumn]}>
                {getTraitDisplayDescription(trait)}
              </Text>
            </View>
          )}

          {/* Выбранные перки (по уровням) */}
          {selectedPerks.map((perk, idx) => (
            <View key={`perk-${idx}`} style={styles.row}>
              <Text style={[styles.cell, styles.nameColumn]}>{perk.perk_name}</Text>
              <Text style={[styles.cell, styles.rankColumn]}>{perk.rank ?? ''}</Text>
              <Text style={[styles.cell, styles.descriptionColumn]}>{perk.description}</Text>
            </View>
          ))}

          {/* Пустые строки */}
          {emptyRows.map((_, index) => (
            <View key={index} style={styles.row}>
              <Text style={[styles.cell, styles.nameColumn]}></Text>
              <Text style={[styles.cell, styles.rankColumn]}></Text>
              <Text style={[styles.cell, styles.descriptionColumn]}></Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Кнопка Добавить перк */}
      <TouchableOpacity style={styles.addPerkButton} onPress={handleAddPerkPress}>
        <Text style={styles.addPerkButtonText}>+ Добавить перк</Text>
      </TouchableOpacity>

      <PerkSelectModal
        visible={isPerkModalVisible}
        onClose={() => setPerkModalVisible(false)}
        annotatedPerks={annotatedPerks}
        onChoosePerk={handleChoosePerk}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  scrollView: {
    width: '100%',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#5a5a5a',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#5a5a5a',
    backgroundColor: '#fff',
    borderStyle: 'dotted',
    minHeight: 30,
  },
  headerRow: {
    backgroundColor: '#1a1a1a',
  },
  cell: {
    padding: 10,
    color: '#000',
    borderRightWidth: 1,
    borderRightColor: '#5a5a5a',
  },
  headerText: {
    fontWeight: 'bold',
    color: '#fff',
    flexWrap: 'nowrap',
    whiteSpace: 'nowrap'
  },
  nameColumn: {
    flex: 2,
    minWidth: 100,
  },
  rankColumn: {
    flex: 0.5,
    textAlign: 'center',
    minWidth: 60,
  },
  descriptionColumn: {
    flex: 3,
    borderRightWidth: 0,
    minWidth: 150,
  },
  placeholder: {
    padding: 10,
    color: '#888',
    textAlign: 'center',
  },
  addPerkButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#0ea5e9',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#0369a1'
  },
  addPerkButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default PerksAndTraitsScreen; 
