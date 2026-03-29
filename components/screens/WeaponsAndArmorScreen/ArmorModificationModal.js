import React, { useMemo, useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useLocale } from '../../../i18n/locale';
import { getEquipmentCatalog } from '../../../i18n/equipmentCatalog';

const hasIntersection = (a = [], b = []) => a.some((x) => b.includes(x));

const ArmorModificationModal = ({ visible, onClose, armorItem, onApply }) => {
  const locale = useLocale();
  const catalog = useMemo(() => getEquipmentCatalog(locale), [locale]);
  const [selectedStd, setSelectedStd] = useState(null);
  const [selectedUniq, setSelectedUniq] = useState(null);

  useEffect(() => {
    if (!visible || !armorItem) return;
    setSelectedStd(armorItem.appliedArmorModId || null);
    setSelectedUniq(armorItem.appliedUniqueArmorModId || null);
  }, [visible, armorItem]);

  const { standardMods, uniqueMods } = useMemo(() => {
    if (!armorItem) return { standardMods: [], uniqueMods: [] };

    const area = armorItem.protectedAreas || [];
    const categoryCfg = catalog?.armorRaw?.[armorItem.armorCategoryKey] || null;
    const allowedStd = new Set(categoryCfg?.allowedModCategories || ['standardMods']);
    const allowedUniq = new Set(categoryCfg?.allowedUniqueModCategories || []);

    const standardMods = (catalog.armorMods || []).filter((m) =>
      allowedStd.has(m.modCategory) && hasIntersection(m.protectedAreas || [], area),
    );

    const uniqueMods = (catalog.uniqArmorMods || []).filter((m) =>
      (allowedUniq.size === 0 || allowedUniq.has(m.modCategory)) && hasIntersection(m.protectedAreas || [], area),
    );

    return { standardMods, uniqueMods };
  }, [armorItem, catalog]);

  const apply = () => {
    if (!armorItem) return;
    onApply({
      ...armorItem,
      appliedArmorModId: selectedStd || null,
      appliedUniqueArmorModId: selectedUniq || null,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Модификация брони</Text>
          <Text style={styles.subtitle}>{armorItem?.Название || armorItem?.Name || armorItem?.name || '—'}</Text>
          <ScrollView>
            <Text style={styles.sectionTitle}>Стандартный мод (1)</Text>
            <TouchableOpacity style={styles.item} onPress={() => setSelectedStd(null)}>
              <Text style={styles.itemText}>{selectedStd ? 'Снять стандартный мод' : 'Без стандартного мода'}</Text>
            </TouchableOpacity>
            {standardMods.map((m) => (
              <TouchableOpacity key={m.id} style={[styles.item, selectedStd === m.id && styles.itemActive]} onPress={() => setSelectedStd(m.id)}>
                <Text style={styles.itemText}>{m.name}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionTitle}>Уникальный мод (1)</Text>
            <TouchableOpacity style={styles.item} onPress={() => setSelectedUniq(null)}>
              <Text style={styles.itemText}>{selectedUniq ? 'Снять уникальный мод' : 'Без уникального мода'}</Text>
            </TouchableOpacity>
            {uniqueMods.map((m) => (
              <TouchableOpacity key={m.id} style={[styles.item, selectedUniq === m.id && styles.itemActive]} onPress={() => setSelectedUniq(m.id)}>
                <Text style={styles.itemText}>{m.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btn} onPress={onClose}><Text>Отмена</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={apply}><Text>Применить</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  content: { backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '85%' },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { marginBottom: 12 },
  sectionTitle: { marginTop: 10, fontWeight: '700' },
  item: { padding: 10, borderBottomWidth: 1, borderColor: '#ddd' },
  itemActive: { backgroundColor: '#e8f2ff' },
  itemText: { fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  btn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#eee', borderRadius: 6 },
});

export default ArmorModificationModal;
