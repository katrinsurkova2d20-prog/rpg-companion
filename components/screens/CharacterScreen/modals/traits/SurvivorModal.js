import React, { useMemo, useState } from 'react';
import { renderTextWithIcons } from '../../../WeaponsAndArmorScreen/textUtils';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { TRAITS } from '../../logic/traitsData';

export const traitConfig = {
  originName: 'Выживший',
  modalType: 'choice'
};

const SurvivorModal = ({
  visible,
  onSelect,
  onClose,
  modalTitle = 'Черта происхождения «Выживший»',
  originLabel = 'Выживший',
}) => {
  const [selectionMode, setSelectionMode] = useState(null);
  const [survivorTrait, setSurvivorTrait] = useState(null);
  const [ncrTrait, setNcrTrait] = useState(null);
  const [singleTraitPick, setSingleTraitPick] = useState(null);

  const survivorTraitNames = ['Образованный', 'Быстрый выстрел', 'Одаренный', 'Тяжёлая рука', 'Миниатюрный'];
  const ncrTraitNames = ['Добрая Душа', 'Пехотинец', 'Дом на пастбище', 'Техника спуска', 'Браминий барон'];
  const goodSoulGroup = ['Красноречие', 'Медицина', 'Ремонт', 'Наука', 'Бартер'];

  const traitCatalog = useMemo(() => {
    const toTrait = (name) => ({ name, description: TRAITS[name]?.description || '' });
    return {
      survivor: survivorTraitNames.map(toTrait),
      ncr: ncrTraitNames.map(toTrait),
    };
  }, []);

  const resetState = () => {
    setSelectionMode(null);
    setSurvivorTrait(null);
    setNcrTrait(null);
    setSingleTraitPick(null);
  };

  const isTwoSame = (mode) => mode === 'two_survivor' || mode === 'two_ncr' || mode === 'two_mixed';

  const canConfirm = () => {
    if (selectionMode === 'two_traits') {
      const survList = Array.isArray(survivorTrait) ? survivorTrait : [];
      const ncrList = Array.isArray(ncrTrait) ? ncrTrait : [];
      return survList.length + ncrList.length === 2;
    }
    if (selectionMode === 'trait_and_perk') {
      return !!singleTraitPick;
    }
    return false;
  };

  const togglePick = (list, name) => {
    if (list.includes(name)) return list.filter((x) => x !== name);
    if (list.length >= 2) return list;
    return [...list, name];
  };

  const handleConfirm = () => {
    if (!canConfirm()) return;

    let selectedNames = [];
    if (selectionMode === 'two_traits') {
      const survList = Array.isArray(survivorTrait) ? survivorTrait : [];
      const ncrList = Array.isArray(ncrTrait) ? ncrTrait : [];
      selectedNames = [...survList, ...ncrList];
    } else if (selectionMode === 'trait_and_perk') {
      selectedNames = [singleTraitPick];
    }

    const mergedModifiers = selectedNames.reduce((acc, traitName) => {
      const baseModifiers = TRAITS[traitName]?.modifiers || {};
      return {
        ...acc,
        ...baseModifiers,
        attributes: {
          ...(acc.attributes || {}),
          ...(baseModifiers.attributes || {}),
        },
        attributePointsBonus:
          (acc.attributePointsBonus || 0) + (baseModifiers.attributePointsBonus || 0),
        forcedSkills: [
          ...(acc.forcedSkills || []),
          ...(baseModifiers.forcedSkills || []),
        ],
      };
    }, {});

    if (selectionMode === 'trait_and_perk') {
      mergedModifiers.extraPerkSlots = (mergedModifiers.extraPerkSlots || 0) + 1;
    }

    if (selectedNames.includes('Добрая Душа')) {
      mergedModifiers.goodSoulPending = true;
      mergedModifiers.goodSoulGroup = [...goodSoulGroup];
    }

    const traitTitle = selectionMode === 'two_traits'
      ? `${originLabel}: ${selectedNames.join(' + ')}`
      : `${originLabel}: ${singleTraitPick} + 1 перк`;

    onSelect(traitTitle, {
      ...mergedModifiers,
      selectedTraitNames: selectedNames,
      selectionMode,
    });
    resetState();
    onClose();
  };

  const isPicked = (traitName, list) => Array.isArray(list) && list.includes(traitName);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{modalTitle}</Text>
          {!selectionMode && (
            <View style={{ width: '100%' }}>
              <TouchableOpacity
                style={[styles.modalButton, styles.skillOption]}
                onPress={() => { setSurvivorTrait([]); setNcrTrait([]); setSelectionMode('two_traits'); }}
              >
                <Text style={styles.buttonText}>2 черты</Text>
                <Text style={styles.descriptionText}>Любая комбинация: 2 Выжившего, 2 НКР или 1+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.skillOption]}
                onPress={() => setSelectionMode('trait_and_perk')}
              >
                <Text style={styles.buttonText}>1 черта и 1 перк</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectionMode && (
            <ScrollView style={{ width: '100%', maxHeight: 360 }}>
              {selectionMode === 'two_traits' && (
                <Text style={styles.hintText}>
                  Выберите 2 черты в любой комбинации (из Выжившего, НКР или по одной).
                </Text>
              )}
              <Text style={styles.sectionTitle}>Список черт Выжившего</Text>
              {traitCatalog.survivor.map((trait) => {
                let isSelected = false;
                if (selectionMode === 'two_traits') {
                  isSelected = isPicked(trait.name, survivorTrait);
                } else if (selectionMode === 'trait_and_perk') {
                  isSelected = singleTraitPick === trait.name;
                }
                return (
                  <TouchableOpacity
                    key={`survivor-${trait.name}`}
                    style={[
                      styles.modalButton,
                      styles.skillOption,
                      isSelected && styles.selectedButton,
                    ]}
                    onPress={() => {
                      if (selectionMode === 'two_traits') {
                        const survList = Array.isArray(survivorTrait) ? survivorTrait : [];
                        const ncrList = Array.isArray(ncrTrait) ? ncrTrait : [];
                        const total = survList.length + ncrList.length;
                        if (survList.includes(trait.name)) {
                          setSurvivorTrait(survList.filter((n) => n !== trait.name));
                        } else if (total < 2) {
                          setSurvivorTrait([...survList, trait.name]);
                        }
                      } else {
                        setSingleTraitPick(trait.name);
                      }
                    }}
                  >
                    <Text style={styles.buttonText}>{trait.name}</Text>
                    {renderTextWithIcons(trait.description, styles.descriptionText)}
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.sectionTitle}>Список черт НКР</Text>
              {traitCatalog.ncr.map((trait) => {
                let isSelected = false;
                if (selectionMode === 'two_traits') {
                  isSelected = isPicked(trait.name, ncrTrait);
                } else if (selectionMode === 'trait_and_perk') {
                  isSelected = singleTraitPick === trait.name;
                }
                return (
                  <TouchableOpacity
                    key={`ncr-${trait.name}`}
                    style={[
                      styles.modalButton,
                      styles.skillOption,
                      isSelected && styles.selectedButton,
                    ]}
                    onPress={() => {
                      if (selectionMode === 'two_traits') {
                        const survList = Array.isArray(survivorTrait) ? survivorTrait : [];
                        const ncrList = Array.isArray(ncrTrait) ? ncrTrait : [];
                        const total = survList.length + ncrList.length;
                        if (ncrList.includes(trait.name)) {
                          setNcrTrait(ncrList.filter((n) => n !== trait.name));
                        } else if (total < 2) {
                          setNcrTrait([...ncrList, trait.name]);
                        }
                      } else {
                        setSingleTraitPick(trait.name);
                      }
                    }}
                  >
                    <Text style={styles.buttonText}>{trait.name}</Text>
                    {renderTextWithIcons(trait.description, styles.descriptionText)}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          {selectionMode && (
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, !canConfirm() && styles.disabledButton]}
              disabled={!canConfirm()}
              onPress={handleConfirm}
            >
              <Text style={styles.buttonText}>Подтвердить выбор</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => {
              resetState();
              onClose();
            }}
          >
            <Text style={styles.buttonText}>Отмена</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalButton: {
        padding: 12,
        marginVertical: 5,
        borderRadius: 6,
        alignItems: 'center',
        width: '100%',
    },
    skillOption: {
        backgroundColor: '#2196F3',
        alignItems: 'flex-start',
        paddingHorizontal: 15,
    },
    cancelButton: {
        backgroundColor: '#9E9E9E',
        marginTop: 10
    },
    confirmButton: {
        backgroundColor: '#4CAF50',
    },
    disabledButton: {
      opacity: 0.5,
    },
    sectionTitle: {
      color: '#000',
      fontWeight: '700',
      marginTop: 10,
      marginBottom: 6,
    },
    hintText: {
      color: '#333',
      fontSize: 12,
      marginBottom: 4,
    },
    selectedButton: {
      borderWidth: 2,
      borderColor: '#FFFFFF',
      backgroundColor: '#1976D2',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    descriptionText: {
        color: 'white',
        fontSize: 12,
        marginTop: 5,
    }
});

export default SurvivorModal;
