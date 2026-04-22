import React from 'react';
import { renderTextWithIcons } from '../../../WeaponsAndArmorScreen/textUtils';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

export const traitConfig = {
  originName: 'Дитя Атома',
  modalType: 'info'
};

const ChildOfAtomModal = ({ visible, onSelect, onClose }) => {
  const trait = {
    name: "Радиоактивная губка",
    description: "Ваш необычный жизненный опыт дает вам дополнительный перк на первом уровне.Кроме того, вы получили подарок от Атома, уникальный даже среди других членов Церкви. Вы можете сопротивляться, накапливать и даже направлять излучение через свое тело. Хотя Атом благословил вас своим сиянием, вы должны быть осторожны. Неверующие могут не понимать ваш дар и могут испугаться, когда станут его свидетелями. Ваша базовая сопротивляемость к радиационному урону составляет 1 и может быть дополнительно увеличена за счет брони и перков. Один раз за сцену, когда кто-то на близкой дистанции от вас должен пострадать от радиационного повреждения, вместо этого вы можете принять удар на себя. Всякий раз, когда вы страдаете от радиационного повреждения (минимум 0), получите одно очко радиации максимум до 5. Когда вы атакуете в ближнем бою, вы можете потратить свои сохраненные очки радиации - за каждое потраченное очко нанесите дополнительный урон от радиации 2 кд, урон наносится отдельно после совершения атаки и нанесения урона. Когда вы спите, вы теряете 1 очко радиации.",
    effects: ['Дополнительный перк', 'Сопротивление радиации 1', 'Принятие удара на себя', 'Накопление очков радиации', 'Атака очками радиации']
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
          <Text style={styles.modalTitle}>Дитя Атома</Text>
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

export default ChildOfAtomModal; 