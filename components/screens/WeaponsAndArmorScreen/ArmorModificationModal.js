import React, { useMemo, useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useLocale } from '../../../i18n/locale';
import { getEquipmentCatalog } from '../../../i18n/equipmentCatalog';
import { formatModBonuses } from './armorModificationUtils';

const hasIntersection = (a = [], b = []) => a.some((x) => b.includes(x));

const AREA_MAP = {
  Голова: 'Head',
  Тело: 'Body',
  Рука: 'Hand',
  Руки: 'Hand',
  Нога: 'Leg',
  Ноги: 'Leg',
};

const parseProtectedAreas = (item) => {
  if (Array.isArray(item?.protectedAreas) && item.protectedAreas.length) return item.protectedAreas;
  const areaText = String(item?.protected_area || '');
  return areaText
    .split(',')
    .map((x) => x.trim())
    .map((x) => AREA_MAP[x])
    .filter(Boolean);
};

const ModRow = ({ mod, selected, onPress }) => {
  const meta = formatModBonuses(mod);
  return (
    <TouchableOpacity style={[styles.item, selected && styles.itemActive]} onPress={onPress}>
      <Text style={styles.itemText}>{mod.name}</Text>
      <Text style={styles.metaText}>{meta.bonuses}</Text>
      <Text style={styles.metaText}>{meta.effects}</Text>
    </TouchableOpacity>
  );
};

const ArmorModificationModal = ({ visible, onClose, targetItem, mode = 'armor', onApply }) => {
  const locale = useLocale();
  const catalog = useMemo(() => getEquipmentCatalog(locale), [locale]);
  const [selectedStd, setSelectedStd] = useState(null);
  const [selectedUniq, setSelectedUniq] = useState(null);

  const isClothingMode = mode === 'clothing';
  const stdKey = isClothingMode ? 'appliedClothingModId' : 'appliedArmorModId';
  const uniqKey = isClothingMode ? null : 'appliedUniqueArmorModId';

  useEffect(() => {
    if (!visible || !targetItem) return;
    setSelectedStd(targetItem[stdKey] || null);
    setSelectedUniq(uniqKey ? (targetItem[uniqKey] || null) : null);
  }, [visible, targetItem, stdKey, uniqKey]);

  const { standardMods, uniqueMods } = useMemo(() => {
    if (!targetItem) return { standardMods: [], uniqueMods: [] };

    const area = parseProtectedAreas(targetItem);
    const categoryCfg = catalog?.armorRaw?.[targetItem.armorCategoryKey] || null;
    const allowedStd = new Set(categoryCfg?.allowedModCategories || ['standardMods']);
    const allowedUniq = new Set(categoryCfg?.allowedUniqueModCategories || []);

    const standardMods = (catalog.armorMods || []).filter((m) =>
      (isClothingMode || allowedStd.has(m.modCategory)) && hasIntersection(m.protectedAreas || [], area),
    );

    const uniqueMods = isClothingMode
      ? []
      : (catalog.uniqArmorMods || []).filter((m) =>
          (allowedUniq.size === 0 || allowedUniq.has(m.modCategory)) && hasIntersection(m.protectedAreas || [], area),
        );

    return { standardMods, uniqueMods };
  }, [targetItem, catalog, isClothingMode]);

  const apply = () => {
    if (!targetItem) return;
    const payload = { ...targetItem, [stdKey]: selectedStd || null };
    if (uniqKey) payload[uniqKey] = selectedUniq || null;
    onApply(payload);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{isClothingMode ? 'Модификация одежды' : 'Модификация брони'}</Text>
          <Text style={styles.subtitle}>{targetItem?.Название || targetItem?.Name || targetItem?.name || '—'}</Text>
          <ScrollView>
            <Text style={styles.sectionTitle}>Стандартный мод (1)</Text>
            <TouchableOpacity style={styles.item} onPress={() => setSelectedStd(null)}>
              <Text style={styles.itemText}>{selectedStd ? 'Снять стандартный мод' : 'Без стандартного мода'}</Text>
            </TouchableOpacity>
            {standardMods.map((m) => (
              <ModRow key={m.id} mod={m} selected={selectedStd === m.id} onPress={() => setSelectedStd(m.id)} />
            ))}

            {!isClothingMode && (
              <>
                <Text style={styles.sectionTitle}>Уникальный мод (1)</Text>
                <TouchableOpacity style={styles.item} onPress={() => setSelectedUniq(null)}>
                  <Text style={styles.itemText}>{selectedUniq ? 'Снять уникальный мод' : 'Без уникального мода'}</Text>
                </TouchableOpacity>
                {uniqueMods.map((m) => (
                  <ModRow key={m.id} mod={m} selected={selectedUniq === m.id} onPress={() => setSelectedUniq(m.id)} />
                ))}
              </>
            )}
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
  subtitle: { marginBottom: 12, fontSize: 12, color: '#555' },
  sectionTitle: { marginTop: 10, fontWeight: '700' },
  item: { padding: 10, borderBottomWidth: 1, borderColor: '#ddd' },
  itemActive: { backgroundColor: '#e8f2ff' },
  itemText: { fontSize: 14 },
  metaText: { fontSize: 11, color: '#666', marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  btn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#eee', borderRadius: 6 },
});

export default ArmorModificationModal;
