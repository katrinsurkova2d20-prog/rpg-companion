// AttributesSection.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MIN_ATTRIBUTE, MAX_ATTRIBUTE, getAttributeLimits } from './logic/characterLogic';
import { getAttributeLabel } from './logic/attributeKeyUtils';
import { tCharacterScreen } from './logic/characterScreenI18n';

const AttributeRow = ({ name, value, onIncrease, onDecrease, disabled, remainingPoints, trait, isPerkMode, baseValue }) => {
  const { min, max } = getAttributeLimits(trait, name);
  
  // В режиме перков нельзя опускаться ниже базового значения
  const decreaseDisabled = isPerkMode ? value <= baseValue : value <= min;

  return (
    <View style={styles.attributeRow}>
      <Text style={[styles.attributeName, { maxWidth: '50%'}]}>{getAttributeLabel(name)}</Text>
      {!disabled ? (
        <CompactCounter 
          value={value}
          onIncrease={onIncrease}
          onDecrease={onDecrease}
          increaseDisabled={remainingPoints <= 0 || value >= max}
          decreaseDisabled={decreaseDisabled}
          minLimit={min}
          maxLimit={max}
        />
      ) : (
        <Text style={[styles.attributeValue, { minWidth: 30 }]}>{value}</Text>
      )}
    </View>
  );
};

const CompactCounter = ({ value, onIncrease, onDecrease, increaseDisabled, decreaseDisabled, minLimit = MIN_ATTRIBUTE, maxLimit = MAX_ATTRIBUTE }) => (
  <View style={styles.compactCounter}>
    <TouchableOpacity 
      onPress={onDecrease} 
      style={[styles.counterButton, decreaseDisabled && styles.disabledButton]}
      disabled={decreaseDisabled}
    >
      <Text style={[styles.counterButtonText, decreaseDisabled && styles.disabledText]}>-</Text>
    </TouchableOpacity>
    <Text style={styles.counterValue}>{value}</Text>
    <TouchableOpacity 
      onPress={onIncrease} 
      style={[styles.counterButton, increaseDisabled && styles.disabledButton]}
      disabled={increaseDisabled}
    >
      <Text style={[styles.counterButtonText, increaseDisabled && styles.disabledText]}>+</Text>
    </TouchableOpacity>
  </View>
);

export const AttributesSection = ({
  attributes,
  onAttributeChange,
  remainingAttributePoints,
  attributesSaved,
  onSaveAttributes,
  onResetAttributes,
  trait,
  isPerkMode,
  onApplyPerkAttributes,
  baseAttributes,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {tCharacterScreen('labels.attributes', 'Атрибуты').toUpperCase()}
        </Text>
        {(!attributesSaved || isPerkMode) && (
          <Text style={styles.pointsText}>{tCharacterScreen('labels.points', 'Очки')}: {remainingAttributePoints}</Text>
        )}
      </View>
      {attributes.map((attr, index) => (
        <AttributeRow 
          key={index}
          name={attr.name}
          value={attr.value}
          onIncrease={() => onAttributeChange(index, 1, trait)}
          onDecrease={() => onAttributeChange(index, -1, trait)}
          disabled={attributesSaved && !isPerkMode}
          remainingPoints={remainingAttributePoints}
          trait={trait}
          isPerkMode={isPerkMode}
          baseValue={baseAttributes ? baseAttributes[index].value : getAttributeLimits(trait, attr.name).min}
        />
      ))}
      
      {!attributesSaved && (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.saveButton]}
            onPress={onSaveAttributes}
          >
            <Text style={styles.buttonText}>{tCharacterScreen('buttons.save', 'Сохранить')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.resetButton]}
            onPress={onResetAttributes}
          >
            <Text style={styles.buttonText}>{tCharacterScreen('buttons.reset', 'Сбросить')}</Text>
          </TouchableOpacity>
        </View>
      )}
      {isPerkMode && (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.saveButton, remainingAttributePoints > 0 && styles.disabledButton]}
            onPress={onApplyPerkAttributes}
            disabled={remainingAttributePoints > 0}
          >
            <Text style={styles.buttonText}>{tCharacterScreen('buttons.confirm', 'Подтвердить')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#5a5a5a',
  },
  sectionHeader: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  pointsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  attributeName: { 
    color: '#000', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  attributeValue: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
    minWidth: 30,
    textAlign: 'center',
  },
  compactCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  counterButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#000',
  },
  counterButtonText: { 
    color: '#000', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  disabledButton: {
    backgroundColor: '#e9ecef',
    borderColor: '#ced4da',
  },
  disabledText: {
    color: '#adb5bd',
  },
  counterValue: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 14,
    marginHorizontal: 4,
    minWidth: 20,
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'column',
    padding: 10,
  },
  button: {
    width: '100%',
    paddingVertical: 8,
    marginVertical: 5,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  resetButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export { CompactCounter };
