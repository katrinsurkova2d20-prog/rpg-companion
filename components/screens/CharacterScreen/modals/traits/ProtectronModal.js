import React from 'react';
import { renderTextWithIcons } from '../../../WeaponsAndArmorScreen/textUtils';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

export const traitConfig = {
  originName: 'Протектрон',
  modalType: 'info'
};

const ProtectronModal = ({ visible, onSelect, onClose }) => {
  const trait = {
    name: "Защитить или уничтожить",
    description: "Вы были созданы для выживания в суровых условиях. Один раз для каждой сцены вы можете перебросить результат проверки, чтобы преодолеть экологическую опасность, и использовать новый результат. Вы также невосприимчивы к болезням, радиации и ядам, но вы не можете использовать препараты, а также получать пользу от еды, питья или отдыха. Вы не можете оправиться от своих травм или восстановить очки здоровья, не получив ремонта. Протектроны предназначены для определенной цели и содержат дополнительные механизмы для поддержки запрограммированных задач. У вас не может быть установлено более двух модификаций для роботов одновременно. Вы можете быть Пожарным , Полицейским , Рабочим - строителем, Медицинским работником или моделью вашего собственного изобретения. При прохождении проверки, непосредственно связанной с назначением вашей модели, первый d20, который вы покупаете, используя ОД стоит 0. Кроме того, ваш вес при переноске составляет 225 фунтов и не может быть увеличен за счет вашей силы или перков, но может быть увеличен за счет модификации брони.",
    effects: [
        'Переброс проверки на экологическую опасность',
        'Иммунитет к болезням, радиации и ядам',
        'Нельзя использовать препараты, еду, питье, отдых',
        'Ремонт для восстановления здоровья',
        'Максимум 2 модификации для роботов',
        'Скидка на d20 для проверок по назначению',
        'Фиксированный вес 225 фунтов'
    ]
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
          <Text style={styles.modalTitle}>Протектрон</Text>
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

export default ProtectronModal; 