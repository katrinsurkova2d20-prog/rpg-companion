import React from 'react';
import { renderTextWithIcons } from '../../../WeaponsAndArmorScreen/textUtils';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

export const traitConfig = {
  originName: 'Робомозг',
  modalType: 'info'
};

const RoboBrainModal = ({ visible, onSelect, onClose }) => {
  const trait = {
    name: "Робот с мозгами",
    description: "Черта: Робот с мозгами\nВы - робот с человеческим мозгом в качестве центрального процессора. У вас есть зрительные сенсоры, способные обнаруживать визуальный спектр и инфракрасное излучение, вы игнорируете любое увеличение сложности тестов на восприятие в темноте. Вы также невосприимчивы к радиации и ядам, но не можете использовать препараты, а также получать пользу от еды, питья или отдыха. Вы не можете восстанавливать свои повреждения или восстанавливать здоровье, не получив ремонта.\n\nВы передвигаетесь на двух гусеницах , и у вас есть два трубообразных гибких экстендера в качестве рук с противопоставленными зажимами, которые вы можете использовать для точного управления инструментами и предметами, предназначенными для людей, и совершать рукопашные атаки. В вашу голову встроен гипнотрон, который вы можете использовать для дальних атак. Ваш максимальный вес для переноски составляет 150 фунтов, и он не может быть увеличен за счет вашей силы или перков, но может быть увеличен за счет модификации брони.",
    effects: [
        'Зрительные сенсоры с возможностью обнаружения визуального спектра и инфракрасного излучения',
        'Игнорирование увеличения сложности тестов на восприятие в темноте',
        'Иммунитет к радиации и ядам',
        'Невозможность использования препаратов, еды, питья, отдыха',
        'Невозможность восстановления повреждений или здоровья без ремонта',
        'Движение на двух гусеницах',
        'Два трубообразных гибких экстендера в качестве рук',
        'Гипнотрон для дальних атак',
        'Максимальный вес переноски 150 фунтов'
    ],
    immunity: {
      radiation: true,
      poison: true
    }
  };

  const handleConfirm = () => {
    onSelect(trait.name, { 
      effects: trait.effects
    });
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Робомозг</Text>
          <Text style={styles.traitName}>{trait.name}</Text>
          {renderTextWithIcons(trait.description, styles.modalText)}
          <TouchableOpacity
            style={[styles.modalButton, styles.confirmButton]}
            onPress={handleConfirm}
          >
            <Text style={styles.buttonText}>Хорошо</Text>
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
        color: '#333'
    },
    traitName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#2196F3'
    },
    modalText: {
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 20,
        color: '#555'
    },
    modalButton: {
        padding: 12,
        marginVertical: 5,
        borderRadius: 6,
        alignItems: 'center',
        width: '100%',
    },
    confirmButton: {
        backgroundColor: '#4CAF50',
        marginTop: 10
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
});

export default RoboBrainModal;