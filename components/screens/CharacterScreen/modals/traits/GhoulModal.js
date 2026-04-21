import React from 'react';
import { renderTextWithIcons } from '../../../WeaponsAndArmorScreen/textUtils';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

export const traitConfig = {
  originName: 'Гуль',
  traitName: 'Некротический постчеловек',
  modalType: 'info'
};

const GhoulModal = ({ visible, onSelect, onClose }) => {
  const trait = {
    name: "Некротический постчеловек",
    description: "Вы невосприимчивы к урону от радиации. Более того, вы исцеляетесь от нее - восстанавливая 1 ОЗ за каждые 3 пункта радиационного урона, нанесенного вам, а если вы отдыхаете в облученном месте, то можете перебросить свой пул кубиков, когда проверяете, зажили ли ваши увечья. Кроме того, “Выживание“ становится отмеченным навыком, повышая его на 2 ранга. Вы стареете гораздо медленнее и, вероятно, старше своих не мутировавших товарищей - возможно, вы даже пережили Великую войну 2077 года, - но вы бесплодны: как говорится, “первое поколение гулей - последнее“. Вы можете столкнуться с дискриминацией со стороны “гладкокожих“ (людей, которые не являются гулями), что увеличивает сложность или диапазон усложнения проверок на харизму в зависимости от убеждений вашего оппонента.",
    skillModifiers: {
      'Выживание': 2
    },
    effects: ['Иммунитет к радиации', 'Исцеление от радиации', 'Замедленное старение', 'Бесплодие', 'Дискриминация']
  };

  const handleConfirm = () => {
    onSelect(trait.name, {
      skillModifiers: trait.skillModifiers,
      forcedSkills: ['Выживание'],
      // Явно указываем, что эта черта дает один дополнительный слот для навыка
      extraSkills: 1
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
          <Text style={styles.modalTitle}>Гуль</Text>
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

export default GhoulModal; 