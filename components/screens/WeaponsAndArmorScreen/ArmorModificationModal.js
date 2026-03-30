import React, { useMemo, useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useLocale } from '../../../i18n/locale';
import { getEquipmentCatalog } from '../../../i18n/equipmentCatalog';
import { applyArmorMods, formatModBonuses } from './armorModificationUtils';

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

const CollapsibleSection = ({ title, children, isExpanded, onToggle }) => (
  <View style={styles.collapsibleSection}>
    <TouchableOpacity onPress={onToggle} style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
    </TouchableOpacity>
    {isExpanded && <View style={styles.sectionContent}>{children}</View>}
  </View>
);

const ModRow = ({ mod, selected, onPress }) => {
  const meta = formatModBonuses(mod);
  return (
    <TouchableOpacity style={[styles.modificationItem, selected && styles.selectedModification]} onPress={onPress}>
      <Text style={styles.modificationName}>{mod.name}</Text>
      <Text style={styles.modificationText}>{meta.bonuses}</Text>
      <Text style={styles.modificationText}>{meta.effects}</Text>
      <Text style={styles.modificationText}>Требования: {mod.requiredPerk || '—'}</Text>
    </TouchableOpacity>
  );
};

const ArmorModificationModal = ({ visible, onClose, targetItem, mode = 'armor', onApply }) => {
  const locale = useLocale();
  const catalog = useMemo(() => getEquipmentCatalog(locale), [locale]);
  const [selectedStd, setSelectedStd] = useState(null);
  const [selectedUniq, setSelectedUniq] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({ standard: true, unique: true });

  const isClothingMode = mode === 'clothing';
  const stdKey = isClothingMode ? 'appliedClothingModId' : 'appliedArmorModId';
  const uniqKey = isClothingMode ? null : 'appliedUniqueArmorModId';

  useEffect(() => {
    if (!visible || !targetItem) return;
    setSelectedStd(targetItem[stdKey] || null);
    setSelectedUniq(uniqKey ? (targetItem[uniqKey] || null) : null);
    setExpandedCategories({ standard: true, unique: true });
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

  const previewItem = useMemo(() => {
    if (!targetItem) return null;
    const simulatedItem = {
      ...targetItem,
      [stdKey]: selectedStd || null,
      ...(uniqKey ? { [uniqKey]: selectedUniq || null } : {}),
    };

    return applyArmorMods(simulatedItem, catalog, {
      standardKey: stdKey,
      uniqueKey: uniqKey || 'unusedUniqueKey',
    });
  }, [targetItem, catalog, stdKey, uniqKey, selectedStd, selectedUniq]);

  const handleToggleCategory = (key) => {
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const apply = () => {
    if (!targetItem) return;
    const payload = { ...targetItem, [stdKey]: selectedStd || null };
    if (uniqKey) payload[uniqKey] = selectedUniq || null;
    onApply(payload);
    onClose();
  };

  if (!targetItem) {
    return null;
  }

  const baseName = targetItem?.Название || targetItem?.Name || targetItem?.name || '—';
  const previewEffects = (previewItem?.effects?.bonusEffects || []).map((x) => x.description).filter(Boolean);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isClothingMode ? 'Модификация одежды' : 'Модификация брони'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{baseName}</Text>
              <Text style={styles.itemStats}>
                Физ. Су.: {targetItem['Физ.СУ'] || 0} | Энерго Су.: {targetItem['Энрг.СУ'] || 0} | Рад. Су.: {targetItem['Рад.СУ'] || 0}
              </Text>
            </View>

            <View style={styles.modificationsSection}>
              <Text style={styles.sectionTitle}>Доступные модификации:</Text>

              <CollapsibleSection
                title={`Стандартные (${standardMods.length})`}
                isExpanded={expandedCategories.standard}
                onToggle={() => handleToggleCategory('standard')}
              >
                <TouchableOpacity
                  style={[styles.modificationItem, !selectedStd && styles.selectedModification]}
                  onPress={() => setSelectedStd(null)}
                >
                  <Text style={styles.modificationName}>{selectedStd ? 'Снять стандартный мод' : 'Без стандартного мода'}</Text>
                </TouchableOpacity>
                {standardMods.map((m) => (
                  <ModRow key={m.id} mod={m} selected={selectedStd === m.id} onPress={() => setSelectedStd(m.id)} />
                ))}
              </CollapsibleSection>

              {!isClothingMode && (
                <CollapsibleSection
                  title={`Уникальные (${uniqueMods.length})`}
                  isExpanded={expandedCategories.unique}
                  onToggle={() => handleToggleCategory('unique')}
                >
                  <TouchableOpacity
                    style={[styles.modificationItem, !selectedUniq && styles.selectedModification]}
                    onPress={() => setSelectedUniq(null)}
                  >
                    <Text style={styles.modificationName}>{selectedUniq ? 'Снять уникальный мод' : 'Без уникального мода'}</Text>
                  </TouchableOpacity>
                  {uniqueMods.map((m) => (
                    <ModRow key={m.id} mod={m} selected={selectedUniq === m.id} onPress={() => setSelectedUniq(m.id)} />
                  ))}
                </CollapsibleSection>
              )}
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.sectionTitle}>Предварительный просмотр:</Text>
              <View style={styles.previewContent}>
                <Text style={styles.previewTitle}>{previewItem?.item?.Название || previewItem?.item?.Name || baseName}</Text>
                <Text style={styles.previewStats}>
                  Физ. Су.: {previewItem?.item?.['Физ.СУ'] || 0} | Энерго Су.: {previewItem?.item?.['Энрг.СУ'] || 0} | Рад. Су.: {previewItem?.item?.['Рад.СУ'] || 0}
                </Text>
                <Text style={styles.previewStats}>Вес: {previewItem?.item?.weight ?? targetItem?.weight ?? targetItem?.['Вес'] ?? 0}</Text>
                <Text style={styles.previewStats}>Цена: {previewItem?.item?.price ?? targetItem?.price ?? targetItem?.['Цена'] ?? 0}</Text>
                <Text style={styles.previewText}>Эффекты: {previewEffects.length ? previewEffects.join(' | ') : '—'}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={apply} style={styles.applyButton}>
              <Text style={styles.applyButtonText}>Применить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '90%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  modalBody: {
    padding: 15,
  },
  itemInfo: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemStats: {
    fontSize: 12,
    color: '#666',
  },
  modificationsSection: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  collapsibleSection: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  expandIcon: {
    fontSize: 16,
    color: '#666',
  },
  sectionContent: {
    paddingLeft: 8,
    paddingTop: 6,
  },
  modificationItem: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  selectedModification: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  modificationName: {
    fontSize: 14,
    fontWeight: '700',
  },
  modificationText: {
    fontSize: 12,
    color: '#444',
    marginTop: 4,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewContent: {
    padding: 10,
    backgroundColor: '#e8f5e8',
    borderRadius: 5,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  previewStats: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 12,
    color: '#333',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
  },
  applyButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    flex: 1,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ArmorModificationModal;
