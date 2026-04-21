import React from 'react';
import { renderTextWithIcons } from '../../../WeaponsAndArmorScreen/textUtils';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

export const traitConfig = {
  originName: 'Штурмотрон',
  modalType: 'info'
};

const AssaultronModal = ({ visible, onSelect, onClose }) => {
  const trait = {
    name: "Разработан для Передовой",
    description: "Вы - робот, невосприимчивый к болезням, урону от радиации и яда, но неспособный использовать препараты или получать пользу от еды, питья или отдыха. Вы не можете оправиться от увечья или восстановить очки здоровья без получения ремонта. Ваш можете переносить 150 фунтов, этот показатель нельзя увеличить за счет Силы или Перков, но его можно увеличить с помощью модификации брони. Вы передвигаетесь на двух ногах и можете манипулировать своим окружением с помощью трехпалых когтеобразных рук. У вас есть конечности с цепным приводом, которые обеспечивают скорость и смертоносную эффективность в ближнем бою, что дает вам +1 Боевой Кубик к рукопашным атака в дополнение к любому бонусу Боевой Кубик ближнего боя, который вы получаете от вашего атрибута Силы. В бронированную голову встроен мощный лазер, позволяющий поражать противников на расстоянии с помощью мощного энергетического оружия, а также способность критически перегружать ядерное реактор, инициируя саморазрушающий разрушительный взрыв.",
    effects: [
        'Иммунитет к болезням, радиации и ядам',
        'Нельзя использовать препараты, еду, питье, отдых',
        'Ремонт для восстановления здоровья',
        'Фиксированный вес 150 фунтов',
        '+1 БК к рукопашным атакам',
        'Встроенный лазер',
        'Возможность самоуничтожения'
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
          <Text style={styles.modalTitle}>Штурмотрон</Text>
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

export default AssaultronModal; 