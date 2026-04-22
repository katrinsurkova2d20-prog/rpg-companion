import React from 'react';
import { renderTextWithIcons } from '../../../WeaponsAndArmorScreen/textUtils';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

export const traitConfig = {
  originName: 'Мистер Помощник',
  modalType: 'info'
};

const MisterHandyModal = ({ visible, onSelect, onClose }) => {
  const trait = {
    name: 'Робот Мистер Помощник',
    description: 'Черта: Робот Мистер Помощник\nВы обладаете 360-градусным зрением и улучшенной системой сенсоров, способных распознавать запахи, химикаты и радиацию, что снижает сложность проверок на восприятие, основанных на зрении и обонянии, на 1. Вы также невосприимчивы к радиации и повреждениям от ядов, но не можете использовать препараты, а также получать преимущества от еды, питья или отдыха. Вы передвигаетесь на реактивной тяге, паря над землей, не подвергаясь воздействию труднопроходимой местности или препятствий. Ваш переносимый вес составляет 150 фунтов, и он не может быть увеличен вашей Силой или перками, но может быть увеличен с помощью модификаций брони. Вы не можете оправиться от своих увечий или восстановить очки здоровья, не пройдя ремонт.\n\nВы не можете манипулировать миром, как это делают люди, вместо этого у вас есть три руки-манипулятора, определяемые вашим выбором комплекта снаряжения.',
    effects: [
      'Иммунитет к радиации',
      'Иммунитет к яду',
      'Нельзя использовать препараты, еду, питье, отдых',
      'Ремонт для восстановления здоровья'
    ]
  };

  const handleConfirm = () => {
    onSelect(trait.name, {
      effects: trait.effects,
      carryWeightStrengthMultiplier: 0,
      carryWeight: 0,
      isRobot: true,
      robotType: 'misterHandy',
      robotBodyPlan: 'misterHandy',
      robotRules: {
        canSelfUseConsumables: false,
        canUseConsumablesOnOthers: true,
        canEquipStandardArmor: false,
        canEquipPowerArmor: false,
        carryWeightLimit: 150,
        armorConstraints: []
      }
    });
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Мистер Помощник</Text>
          <Text style={styles.traitName}>{trait.name}</Text>
          {renderTextWithIcons(trait.description, styles.modalText)}
          <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleConfirm}>
            <Text style={styles.buttonText}>Хорошо</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContainer: { width: '80%', backgroundColor: 'white', borderRadius: 10, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  traitName: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#2196F3' },
  modalText: { fontSize: 14, marginBottom: 20, textAlign: 'center', lineHeight: 20, color: '#555' },
  modalButton: { padding: 12, marginVertical: 5, borderRadius: 6, alignItems: 'center', width: '100%' },
  confirmButton: { backgroundColor: '#4CAF50', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default MisterHandyModal;
