import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Pressable,
  SafeAreaView,
  StatusBar,
  Modal,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { useCharacter } from "../../CharacterContext";
import OriginModal from "./modals/OriginModal";
import TraitSkillModal from "./modals/TraitSkillModal";
import EquipmentKitModal from "./modals/EquipmentKitModal";
import { ORIGINS } from "./logic/originsData";
import { TRAITS } from "./logic/traitsData";
import { getTraitModalComponent, getTraitConfig } from "./modals/traits/index";
import {
  createInitialAttributes,
  getRemainingAttributePoints,
  getSkillPoints,
  calculateSkillPointsUsed,
  getLuckPoints,
  getMaxSelectableSkills,
  canChangeAttribute,
  canChangeSkillValue,
  getAttributeLimits,
  validateSkills,
  ALL_SKILLS,
  isMultiTraitOrigin,
  MAX_ATTRIBUTE,
} from "./logic/characterLogic";
import { AttributesSection } from "./AttributesSection";
import styles from "../../../styles";

// Определяем константу BASE_TAGGED_SKILLS для исправления ReferenceError
const BASE_TAGGED_SKILLS = 3; // Максимальное количество основных навыков

const ImageSection = ({ origin }) => {
  const defaultImage = require("../../../assets/bg1.png");
  return (
    <View style={styles.imageSection}>
      <ImageBackground
        source={origin ? origin.image : defaultImage}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
};

const ResetConfirmationModal = ({ visible, onCancel, onConfirm }) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={visible}
    onRequestClose={onCancel}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>Внимание!</Text>
        <Text style={styles.modalText}>
          Все значения будут сброшены к изначальным параметрам.
        </Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.buttonText}>Отмена</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.confirmButton]}
            onPress={onConfirm}
          >
            <Text style={styles.buttonText}>Согласен</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const PressableRow = ({ title, value, onPress, disabled }) => (
  <Pressable
    style={[styles.pressableRow, disabled && styles.disabledPressable]}
    onPress={onPress}
    android_ripple={{ color: "#ddd" }}
    disabled={disabled}
  >
    <Text style={styles.pressableTitle}>{title}:</Text>
    <Text
      style={[
        styles.pressableValue,
        value === "Не выбрано" && styles.placeholderText,
      ]}
    >
      {value}
    </Text>
  </Pressable>
);

const DerivedRow = ({ title, value }) => (
  <View style={styles.derivedRow}>
    <Text style={styles.derivedTitle}>{title}</Text>
    <Text style={styles.derivedValue}>{value}</Text>
  </View>
);

const SkillRow = ({
  name,
  value,
  isSelected,
  isMaxReached,
  isForced,
  onToggle,
  onIncrease,
  onDecrease,
  rowStyle,
  disabled,
  trait,
}) => {
  return (
    <View style={[styles.skillRow, rowStyle]}>
      <TouchableOpacity
        onPress={onToggle}
        style={styles.skillSelector}
        disabled={disabled || isForced}
      >
        <View
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
            isForced && styles.checkboxForced,
          ]}
        />
        <Text
          style={[
            styles.skillName,
            isSelected && styles.skillNameSelected,
            isForced && styles.skillNameForced,
          ]}
        >
          {name}
        </Text>
      </TouchableOpacity>
      {!disabled ? (
        <CompactCounter
          value={value}
          onIncrease={onIncrease}
          onDecrease={onDecrease}
          isMaxReached={isMaxReached}
        />
      ) : (
        <Text style={styles.skillValue}>{value}</Text>
      )}
    </View>
  );
};

const CompactCounter = ({
  value,
  onIncrease,
  onDecrease,
  isMaxReached,
  increaseDisabled,
}) => (
  <View style={styles.compactCounter}>
    <TouchableOpacity
      onPress={onDecrease}
      style={[styles.counterButton, value <= 0 && styles.disabledButton]}
      disabled={value <= 0}
    >
      <Text
        style={[styles.counterButtonText, value <= 0 && styles.disabledText]}
      >
        -
      </Text>
    </TouchableOpacity>
    <Text style={styles.counterValue}>{value}</Text>
    <TouchableOpacity
      onPress={onIncrease}
      style={[
        styles.counterButton,
        (isMaxReached || increaseDisabled) && styles.disabledButton,
      ]}
      disabled={isMaxReached || increaseDisabled}
    >
      <Text
        style={[
          styles.counterButtonText,
          (isMaxReached || increaseDisabled) && styles.disabledText,
        ]}
      >
        +
      </Text>
    </TouchableOpacity>
  </View>
);

const LuckPointsRow = ({ luckPoints, maxLuckPoints, onSpend, onRestore }) => {
  const canSpend = luckPoints > 0;
  const canRestore = luckPoints < maxLuckPoints;

  return (
    <View style={styles.luckRow}>
      <Text style={styles.luckTitle}>Очки{"\n"}Удачи</Text>
      <View style={styles.luckValueContainer}>
        <TouchableOpacity
          onPress={onSpend}
          style={[styles.luckButton, !canSpend && styles.disabledLuckButton]}
          disabled={!canSpend}
        >
          <Text style={styles.luckButtonText}>-</Text>
        </TouchableOpacity>
        <Text
          style={styles.derivedValue}
        >{`${luckPoints} / ${maxLuckPoints}`}</Text>
        <TouchableOpacity
          onPress={onRestore}
          style={[styles.luckButton, !canRestore && styles.disabledLuckButton]}
          disabled={!canRestore}
        >
          <Text style={styles.luckButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function CharacterScreen() {
  const {
    level,
    setLevel,
    attributes,
    setAttributes,
    skills,
    setSkills,
    selectedSkills,
    setSelectedSkills,
    extraTaggedSkills,
    setExtraTaggedSkills,
    forcedSelectedSkills,
    setForcedSelectedSkills,
    origin,
    setOrigin,
    trait,
    setTrait,
    equipment,
    setEquipment,
    effects,
    setEffects,
    caps,
    setCaps,
    luckPoints,
    setLuckPoints,
    maxLuckPoints,
    setMaxLuckPoints,
    attributesSaved,
    setAttributesSaved,
    skillsSaved,
    setSkillsSaved,
    resetCharacter,
    availablePerkAttributePoints,
    commitAttributeChanges,
  } = useCharacter();

  const [isOriginModalVisible, setIsOriginModalVisible] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [showTraitSkillModal, setShowTraitSkillModal] = useState(false);
  const [isTraitModalVisible, setIsTraitModalVisible] = useState(false);
  const [isEquipmentKitModalVisible, setIsEquipmentKitModalVisible] =
    useState(false);

  const [showResetWarning, setShowResetWarning] = useState(false);
  const [resetType, setResetType] = useState(null);

  // Состояние для имени персонажа
  const [characterName, setCharacterName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);

  // Состояние для временного распределения очков атрибутов от перков
  const [tempAttributes, setTempAttributes] = useState(null);
  const [perkPointsToDistribute, setPerkPointsToDistribute] = useState(0);

  // Активация режима распределения очков от перков
  useEffect(() => {
    if (availablePerkAttributePoints > 0 && attributesSaved) {
      setTempAttributes(attributes);
      setPerkPointsToDistribute(availablePerkAttributePoints);
    } else {
      setTempAttributes(null);
      setPerkPointsToDistribute(0);
    }
  }, [availablePerkAttributePoints, attributesSaved, attributes]);

  useEffect(() => {
    const newMaxLuck = getLuckPoints(attributes);
    if (newMaxLuck !== maxLuckPoints) {
      setMaxLuckPoints(newMaxLuck);
      if (!attributesSaved) {
        setLuckPoints(newMaxLuck);
      }
    }
  }, [
    attributes,
    maxLuckPoints,
    attributesSaved,
    setMaxLuckPoints,
    setLuckPoints,
  ]);

  const isPerkAttributeMode = tempAttributes !== null;
  const currentAttributes = isPerkAttributeMode ? tempAttributes : attributes;

  const remainingInitialPoints = getRemainingAttributePoints(attributes, trait);
  const remainingPerkPoints = isPerkAttributeMode
    ? perkPointsToDistribute -
      (tempAttributes.reduce((sum, a) => sum + a.value, 0) -
        attributes.reduce((sum, a) => sum + a.value, 0))
    : 0;

  const remainingAttributePoints = isPerkAttributeMode
    ? remainingPerkPoints
    : remainingInitialPoints;

  const canDistributeSkills = attributesSaved && !skillsSaved;
  const skillPointsAvailable = attributesSaved
    ? getSkillPoints(attributes, level)
    : 0;
  const skillPointsUsed = calculateSkillPointsUsed(
    skills,
    selectedSkills,
    extraTaggedSkills,
  );
  const skillPointsLeft = Math.max(0, skillPointsAvailable - skillPointsUsed);

  const handleSavePerkAttributes = () => {
    if (remainingPerkPoints > 0) {
      Alert.alert(
        "Ошибка",
        "Вы должны распределить все доступные очки атрибутов.",
      );
      return;
    }
    commitAttributeChanges(tempAttributes, perkPointsToDistribute);
    setTempAttributes(null);
    setPerkPointsToDistribute(0);
  };

  const handleTempAttributeChange = (index, delta) => {
    setTempAttributes((prev) => {
      const newAttributes = [...prev];
      const attr = newAttributes[index];
      const baseValue = attributes[index].value; // Нельзя опускаться ниже сохраненного значения

      const newValue = attr.value + delta;

      // Увеличение: проверяем, есть ли очки и не превышен ли максимум
      if (delta > 0) {
        if (remainingPerkPoints <= 0) return prev; // Нет очков
        if (newValue > MAX_ATTRIBUTE) return prev; // Превышен максимум
      }

      // Уменьшение: проверяем, не опускаемся ли ниже базового значения
      if (delta < 0) {
        if (newValue < baseValue) return prev;
      }

      newAttributes[index] = { ...attr, value: newValue };
      return newAttributes;
    });
  };

  const handleSelectKit = (kit) => {
    setEquipment({
      name: kit.name,
      weight: kit.weight,
      price: kit.price,
      items: kit.items,
    });
    setCaps((prev) => prev + (kit.caps || 0));
    setIsEquipmentKitModalVisible(false);
  };

  const handleToggleSkill = (skillName) => {
    if (!canDistributeSkills && !showTraitSkillModal) {
      Alert.alert(
        "Предупреждение",
        "Сначала распределите и сохраните атрибуты",
      );
      return;
    }

    const skillIndex = skills.findIndex((s) => s.name === skillName);
    const currentSkill = skills[skillIndex];

    // Check current state
    const isInMainSkills = selectedSkills.includes(skillName);
    const isInExtraSkills = extraTaggedSkills.includes(skillName);
    const isForcedSkill = forcedSelectedSkills.includes(skillName);
    const isCurrentlySelected = isInMainSkills || isInExtraSkills;

    // Cannot deselect forced skills
    if (isForcedSkill && isCurrentlySelected) {
      Alert.alert("Ошибка", "Нельзя снять выбор с обязательного навыка");
      return;
    }

    // Skill max value checks
    let skillMax = trait?.modifiers?.skillMaxValue ?? 6;
    if (level === 1) {
      skillMax = Math.min(skillMax, 3);
    }

    // Good Soul special handling
    const goodSoulGroup = [
      "Красноречие",
      "Медицина",
      "Ремонт",
      "Наука",
      "Бартер",
    ];
    const isGoodSoul = trait?.name === "Добрая Душа";
    const goodSoulSelected = trait?.modifiers?.goodSoulSelectedSkills || [];
    const isBonusFromGoodSoul =
      isGoodSoul && goodSoulSelected.includes(skillName);

    // Get trait extra skill info
    const extraSkillsFromTrait =
      trait?.extraSkills || trait?.modifiers?.extraSkills || 0;
    const traitForcedSkills = trait?.forcedSkills || [];

    // Check if this skill can be selected as an extra skill
    const canSelectAsExtra =
      extraSkillsFromTrait > 0 &&
      (traitForcedSkills.length === 0 || traitForcedSkills.includes(skillName));

    if (!isCurrentlySelected) {
      // SELECTING A NEW SKILL

      // Check skill max limit
      if (currentSkill.value + 2 > skillMax) {
        Alert.alert(
          "Ошибка",
          `Отметка этого навыка превысит максимальный ранг (${skillMax}). Сначала понизьте его значение.`,
        );
        return;
      }

      // Handle Good Soul bonus skills (don't count toward main or extra limits)
      if (isBonusFromGoodSoul) {
        // This is handled by trait modal, should not reach here normally
        return;
      }

      // Forced skills go to extra pool
      if (isForcedSkill) {
        setExtraTaggedSkills((prev) => [...prev, skillName]);
      }
      // Try main skills first (max 3)
      else if (selectedSkills.length < BASE_TAGGED_SKILLS) {
        setSelectedSkills((prev) => [...prev, skillName]);
      }
      // Try extra skills if available
      else if (
        canSelectAsExtra &&
        extraTaggedSkills.length < extraSkillsFromTrait
      ) {
        setExtraTaggedSkills((prev) => [...prev, skillName]);
      }
      // No slots available
      else {
        const extraText = canSelectAsExtra
          ? `\n\nДоступно дополнительных слотов: ${extraSkillsFromTrait - extraTaggedSkills.length}`
          : "";
        Alert.alert(
          "Ошибка",
          `Можно выбрать максимум ${BASE_TAGGED_SKILLS} основных навыка.${extraText}`,
        );
        return;
      }

      // Apply +2 to skill value
      setSkills((prev) =>
        prev.map((s, i) => {
          if (i !== skillIndex) return s;
          let next = s.value + 2;
          // Good Soul group cap
          if (
            isGoodSoul &&
            goodSoulGroup.includes(s.name) &&
            !isBonusFromGoodSoul
          ) {
            next = Math.min(next, 4);
          }
          return { ...s, value: next };
        }),
      );
    } else {
      // DESELECTING A SKILL

      // Remove from appropriate pool
      if (isInMainSkills) {
        setSelectedSkills((prev) => prev.filter((s) => s !== skillName));
      }
      if (isInExtraSkills) {
        setExtraTaggedSkills((prev) => prev.filter((s) => s !== skillName));
      }

      // Apply -2 to skill value
      setSkills((prev) =>
        prev.map((s, i) => {
          if (i !== skillIndex) return s;
          return { ...s, value: Math.max(0, s.value - 2) };
        }),
      );
    }
  };

  const handleChangeSkillValue = (index, delta) => {
    if (!attributesSaved) {
      Alert.alert("Сначала сохраните атрибуты");
      return;
    }

    if (delta > 0 && skillPointsLeft <= 0) {
      Alert.alert(
        "Ошибка",
        "У вас не осталось очков навыков для распределения.",
      );
      return;
    }

    setSkills((prev) => {
      const newSkills = [...prev];
      const skill = newSkills[index];
      const isTagged =
        selectedSkills.includes(skill.name) ||
        extraTaggedSkills.includes(skill.name);

      // Ограничение от "Добрая Душа": навыки из группы capped 4, кроме двух бонусных
      const goodSoulGroup = [
        "Красноречие",
        "Медицина",
        "Ремонт",
        "Наука",
        "Бартер",
      ];
      const isGoodSoul = trait?.name === "Добрая Душа";
      const isInGroup = goodSoulGroup.includes(skill.name);
      const isBonus =
        isGoodSoul &&
        (trait?.modifiers?.goodSoulSelectedSkills || []).includes(skill.name);
      const capForThis = isGoodSoul && isInGroup && !isBonus ? 4 : undefined;

      if (canChangeSkillValue(skill.value, delta, trait, level, isTagged)) {
        let nextVal = skill.value + delta;
        if (capForThis !== undefined) {
          nextVal = Math.min(nextVal, capForThis);
        }
        newSkills[index] = { ...skill, value: nextVal };
      }
      return newSkills;
    });
  };

  const handleChangeAttribute = (index, delta) => {
    setAttributes((prev) => {
      const newAttributes = [...prev];
      const attr = newAttributes[index];
      const { min, max } = getAttributeLimits(trait, attr.name);

      const newValue = attr.value + delta;
      if (newValue >= min && newValue <= max) {
        if (delta > 0 && remainingInitialPoints <= 0) return prev;
        newAttributes[index] = { ...attr, value: newValue };
      }

      return newAttributes;
    });
  };

  // Функция для получения черт происхождения
  const getTraitsForOrigin = (origin) => {
    if (!origin) return [];
    return Object.entries(TRAITS).filter(
      ([_, trait]) => trait.origin === origin.name,
    );
  };

  const handleSelectOrigin = (origin) => {
    setOrigin(origin);
    setSelectedOrigin(null);
    setIsOriginModalVisible(false);

    setTrait(null); // Всегда сбрасываем черту при смене происхождения
  };

  const confirmOriginSelection = (newOrigin) => {
    if (!origin || newOrigin.id === origin.id) {
      handleSelectOrigin(newOrigin);
      return;
    }

    const confirmAndReset = () => {
      resetCharacter();
      handleSelectOrigin(newOrigin);
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Сменить происхождение? Все ваши атрибуты, навыки и черты будут сброшены. Вы уверены?",
        )
      ) {
        confirmAndReset();
      }
    } else {
      Alert.alert(
        "Сменить происхождение?",
        "Все ваши атрибуты, навыки и черты будут сброшены. Вы уверены?",
        [
          { text: "Отмена", style: "cancel" },
          {
            text: "Да, сбросить",
            onPress: confirmAndReset,
            style: "destructive",
          },
        ],
      );
    }
  };

  const handleSelectTrait = (traitName, newModifiersFromModal) => {
    // Комбинируем базовую информацию о черте с модификаторами из модального окна
    const baseInfo = TRAITS[traitName] || {};
    const newTrait = {
      ...baseInfo,
      name: traitName,
      modifiers: {
        ...(baseInfo.modifiers || {}),
        ...(newModifiersFromModal || {}),
      },
    };

    const oldTrait = trait; // Запоминаем старую черту

    // Атомарно обновляем все состояния, отменяя старые и применяя новые модификаторы
    setAttributes((currentAttributes) => {
      const oldAttrMods = oldTrait?.modifiers?.attributes || {};
      const newAttrMods = newTrait?.modifiers?.attributes || {};
      // Сначала отменяем старые модификаторы
      let tempAttrs = currentAttributes.map((attr) => ({
        ...attr,
        value: attr.value - (oldAttrMods[attr.name] || 0),
      }));
      // Затем применяем новые
      return tempAttrs.map((attr) => ({
        ...attr,
        value: attr.value + (newAttrMods[attr.name] || 0),
      }));
    });

    const oldForcedSkills = oldTrait?.modifiers?.forcedSkills || [];
    const newForcedSkills = newTrait?.modifiers?.forcedSkills || [];

    // Обновляем список обязательных навыков
    setForcedSelectedSkills((currentForced) => {
      const withoutOld = currentForced.filter(
        (skill) => !oldForcedSkills.includes(skill),
      );
      return [...new Set([...withoutOld, ...newForcedSkills])];
    });

    // Обновляем отмеченные навыки и их значения
    setSelectedSkills((currentSelected) => {
      const withoutOld = currentSelected.filter(
        (skill) => !oldForcedSkills.includes(skill),
      );
      return withoutOld; // Forced skills go to extraTaggedSkills now
    });

    // Обновляем экстра навыки (forced skills теперь идут сюда)
    setExtraTaggedSkills((currentExtra) => {
      const withoutOld = currentExtra.filter(
        (skill) => !oldForcedSkills.includes(skill),
      );
      return [...new Set([...withoutOld, ...newForcedSkills])];
    });

    setSkills((currentSkills) => {
      let tempSkills = [...currentSkills];
      // Отменяем +2 от старых обязательных навыков
      oldForcedSkills.forEach((skillName) => {
        const index = tempSkills.findIndex((s) => s.name === skillName);
        if (index > -1) {
          tempSkills[index] = {
            ...tempSkills[index],
            value: Math.max(0, tempSkills[index].value - 2),
          };
        }
      });
      // Применяем +2 к новым обязательным навыкам (если их значение < 2)
      newForcedSkills.forEach((skillName) => {
        const index = tempSkills.findIndex((s) => s.name === skillName);
        if (index > -1 && tempSkills[index].value < 2) {
          tempSkills[index] = { ...tempSkills[index], value: 2 };
        }
      });
      return tempSkills;
    });

    // Обновляем эффекты
    setEffects((currentEffects) => {
      const oldEffects = oldTrait?.modifiers?.effects || [];
      const newEffects = newTrait?.modifiers?.effects || [];
      const withoutOld = currentEffects.filter((e) => !oldEffects.includes(e));
      return [...new Set([...withoutOld, ...newEffects])];
    });

    // Устанавливаем саму новую черту
    setTrait(newTrait);
    setIsTraitModalVisible(false);

    if (newTrait.name === "Одаренный") {
      // Prompt user to choose two attributes
      // For simplicity, assume a modal or something, but since it's not specified, placeholder
      const chosenAttrs = ["СИЛ", "ИНТ"]; // Example
      chosenAttrs.forEach((attr) => {
        setAttributes((prev) =>
          prev.map((a) => (a.name === attr ? { ...a, value: a.value + 1 } : a)),
        );
      });
      setMaxLuckPoints((prev) => prev - 1);
    }

    // For Small Frame
    if (newTrait.name === "Миниатюрный") {
      const str = attributes.find((a) => a.name === "СИЛ").value;
      // setCarryWeight(150 + (5 * str)); // This line was not in the original file, so it's commented out.
    }
  };

  // Обработчик нажатия на строку черты
  const handleTraitPress = () => {
    if (!origin) {
      Alert.alert("Ошибка", "Сначала выберите происхождение");
      return;
    }

    // Блокируем, если черта уже выбрана и происхождение не предполагает нескольких черт
    if (trait && !isMultiTraitOrigin(origin.name)) {
      Alert.alert("Информация", "Черта для этого происхождения уже выбрана.");
      return;
    }

    const availableTraits = getTraitsForOrigin(origin);
    if (availableTraits.length === 0) {
      Alert.alert("Информация", "Для данного происхождения нет доступных черт");
      return;
    }

    // Если есть специальное модальное окно для черты
    const TraitModalComponent = getTraitModalComponent(origin.name);
    if (TraitModalComponent) {
      setIsTraitModalVisible(true);
    } else {
      // Если нет специального модального окна, показываем обычный список
      setIsTraitModalVisible(true);
    }
  };

  const handleTraitSkillSelect = (skill) => {
    setForcedSelectedSkills((prev) => [...new Set([...prev, skill])]);
    setSelectedSkills((prev) => [...new Set([...prev, skill])]);

    setSkills((prev) => {
      const skillIndex = prev.findIndex((s) => s.name === skill);
      if (skillIndex > -1) {
        const newSkills = [...prev];
        const currentSkill = newSkills[skillIndex];
        if (currentSkill.value < 2) {
          newSkills[skillIndex] = { ...currentSkill, value: 2 };
        }
        return newSkills;
      }
      return prev;
    });

    setShowTraitSkillModal(false);
  };

  const handleSpendLuckPoint = () => {
    if (luckPoints > 0) {
      setLuckPoints((prev) => prev - 1);
    }
  };

  const handleRestoreLuckPoint = () => {
    if (luckPoints < maxLuckPoints) {
      setLuckPoints((prev) => prev + 1);
    }
  };

  const handleSaveAttributes = () => {
    if (!origin) {
      Alert.alert("Ошибка", "Необходимо выбрать происхождение.");
      return;
    }
    if (!trait) {
      Alert.alert("Ошибка", "Необходимо выбрать черту.");
      return;
    }
    if (!equipment) {
      Alert.alert("Ошибка", "Необходимо выбрать комплект снаряжения.");
      return;
    }
    if (remainingAttributePoints !== 0) {
      Alert.alert("Ошибка", "Потратьте все очки атрибутов перед сохранением.");
      return;
    }
    setAttributesSaved(true);
    setSkillsSaved(false);
  };

  const handleSaveSkills = () => {
    if (!origin) {
      Alert.alert("Ошибка", "Необходимо выбрать происхождение.");
      return;
    }
    if (!trait) {
      Alert.alert("Ошибка", "Необходимо выбрать черту.");
      return;
    }
    if (!equipment) {
      Alert.alert("Ошибка", "Необходимо выбрать комплект снаряжения.");
      return;
    }
    if (skillPointsLeft > 0) {
      Alert.alert("Ошибка", "Необходимо распределить все очки навыков.");
      return;
    }
    // Проверяем, что выбрано правильное количество навыков
    const extraSkillsFromTrait =
      trait?.extraSkills || trait?.modifiers?.extraSkills || 0;
    const goodSoulSelected = trait?.modifiers?.goodSoulSelectedSkills || [];

    // Проверяем основные навыки (всегда должно быть ровно 3)
    if (selectedSkills.length !== BASE_TAGGED_SKILLS) {
      Alert.alert(
        "Ошибка",
        `Необходимо выбрать ровно ${BASE_TAGGED_SKILLS} основных навыка. Выбрано: ${selectedSkills.length}`,
      );
      return;
    }

    // Проверяем экстра навыки от черт
    if (
      extraSkillsFromTrait > 0 &&
      extraTaggedSkills.length !== extraSkillsFromTrait
    ) {
      Alert.alert(
        "Ошибка",
        `Необходимо выбрать ${extraSkillsFromTrait} дополнительных навыка от черты. Выбрано: ${extraTaggedSkills.length}`,
      );
      return;
    }
    const { isValid, maxRank } = validateSkills(skills, trait);

    if (!isValid) {
      Alert.alert(`Ошибка: Максимальный ранг навыков - ${maxRank}`);
      return;
    }

    setSkillsSaved(true);
  };

  const handleResetAttributes = () => {
    setResetType("attributes");
    setShowResetWarning(true);
  };

  const handleResetSkills = () => {
    setResetType("skills");
    setShowResetWarning(true);
  };

  const handleLevelChange = (delta) => {
    const newLevel = Math.max(1, level + delta);

    if (newLevel > level && attributesSaved) {
      setSkillsSaved(false);
    }

    setLevel(newLevel);
  };

  const confirmReset = () => {
    if (resetType === "attributes" || resetType === "all") {
      resetCharacter();
    } else if (resetType === "skills") {
      const newSkills = ALL_SKILLS.map((skill) => ({
        ...skill,
        value: forcedSelectedSkills.includes(skill.name) ? 2 : 0,
      }));
      setSkills(newSkills);
      setSelectedSkills([]);
      setExtraTaggedSkills([...forcedSelectedSkills]);
      setSkillsSaved(false);
    }
    setShowResetWarning(false);
  };

  const cancelReset = () => {
    setShowResetWarning(false);
  };

  // Получаем компонент модального окна для черты
  const TraitModalComponent = origin
    ? getTraitModalComponent(origin.name)
    : null;

  return (
    <ImageBackground
      source={require("../../../assets/bg.png")}
      style={styles.background}
      imageStyle={{ opacity: 0.3 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            {/* Строка для ввода имени персонажа */}
            <View style={styles.nameInputRow}>
              <Text style={styles.nameInputLabel}>Имя:</Text>
              <TextInput
                style={[styles.nameInput, !nameSaved && styles.nameInputActive]}
                placeholder="Введите имя персонажа"
                placeholderTextColor="#999"
                value={characterName}
                onChangeText={setCharacterName}
                editable={!nameSaved}
              />
              <TouchableOpacity
                style={[
                  styles.saveNameButton,
                  characterName.length > 0 && !nameSaved
                    ? styles.saveNameButtonActive
                    : styles.saveNameButtonDisabled,
                ]}
                onPress={() => {
                  if (characterName.length > 0) {
                    setNameSaved(true);
                  }
                }}
                disabled={characterName.length === 0 || nameSaved}
              >
                <Text
                  style={[
                    styles.saveNameButtonText,
                    characterName.length === 0 || nameSaved
                      ? styles.saveNameButtonTextDisabled
                      : {},
                  ]}
                >
                  Сохранить
                </Text>
              </TouchableOpacity>
            </View>

            {/* Если имя не сохранено, показываем затемняющий слой */}
            {!nameSaved && <View style={styles.disabledOverlay} />}

            <PressableRow
              title="Происхождение"
              value={origin ? origin.name : "Не выбрано"}
              onPress={() => setIsOriginModalVisible(true)}
              disabled={!nameSaved}
            />
            <PressableRow
              title="Черта"
              value={trait ? trait.name : "Не выбрано"}
              onPress={handleTraitPress}
              disabled={!nameSaved || (trait && !isMultiTraitOrigin(origin?.name))}
            />
            <PressableRow
              title="Снаряжение"
              value={equipment ? equipment.name : "Не выбрано"}
              onPress={() => {
                if (origin && origin.equipmentKits) {
                  if (equipment) {
                    // Если снаряжение уже выбрано, показываем предупреждение
                    if (Platform.OS === "web") {
                      if (
                        window.confirm(
                          "Внимание! При выборе нового комплекта снаряжения весь текущий инвентарь будет сброшен. Продолжить?",
                        )
                      ) {
                        // Сбрасываем инвентарь и надетые предметы
                        setEquippedWeapons([null, null]);
                        setEquippedArmor({
                          head: { armor: null, clothing: null },
                          body: { armor: null, clothing: null },
                          leftArm: { armor: null, clothing: null },
                          rightArm: { armor: null, clothing: null },
                          leftLeg: { armor: null, clothing: null },
                          rightLeg: { armor: null, clothing: null },
                        });
                        setCaps(0);
                        setEquipment(null);
                        setIsEquipmentKitModalVisible(true);
                      }
                    } else {
                      Alert.alert(
                        "Внимание!",
                        "Инвентарь и всё снаряжение будет сброшено. Продолжить?",
                        [
                          { text: "Отмена", style: "cancel" },
                          {
                            text: "Продолжить",
                            onPress: () => {
                              // Сбрасываем инвентарь и надетые предметы
                              setEquippedWeapons([null, null]);
                              setEquippedArmor({
                                head: { armor: null, clothing: null },
                                body: { armor: null, clothing: null },
                                leftArm: { armor: null, clothing: null },
                                rightArm: { armor: null, clothing: null },
                                leftLeg: { armor: null, clothing: null },
                                rightLeg: { armor: null, clothing: null },
                              });
                              setCaps(0);
                              setEquipment(null);
                              setIsEquipmentKitModalVisible(true);
                            },
                          },
                        ],
                      );
                    }
                  } else {
                    setIsEquipmentKitModalVisible(true);
                  }
                } else {
                  Alert.alert(
                    "Информация",
                    "Для данного происхождения нет комплектов снаряжения.",
                  );
                }
              }}
            />
            <View style={[styles.levelContainer, !nameSaved && styles.disabledLevelContainer]}>
              <Text style={styles.levelLabel}>Уровень:</Text>
              <CompactCounter
                value={level}
                onIncrease={() => nameSaved && handleLevelChange(1)}
                onDecrease={() => nameSaved && handleLevelChange(-1)}
              />
            </View>
          </View>

          <View style={styles.columnsContainer}>
            <View style={styles.leftColumn}>
              <AttributesSection
                attributes={currentAttributes}
                onAttributeChange={
                  isPerkAttributeMode
                    ? handleTempAttributeChange
                    : handleChangeAttribute
                }
                remainingAttributePoints={remainingAttributePoints}
                attributesSaved={attributesSaved}
                onSaveAttributes={handleSaveAttributes}
                onResetAttributes={handleResetAttributes}
                trait={trait}
                isPerkMode={isPerkAttributeMode}
                onApplyPerkAttributes={handleSavePerkAttributes}
                baseAttributes={isPerkAttributeMode ? attributes : null}
              />
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>ХАРАКТЕРИСТИКИ</Text>
                </View>
                <DerivedRow
                  title="Очки Атрибутов"
                  value={remainingAttributePoints}
                />
                <DerivedRow
                  title="Отмечено навыков"
                  value={(() => {
                    const extraSkillsFromTrait =
                      trait?.extraSkills || trait?.modifiers?.extraSkills || 0;
                    const goodSoulSelected =
                      trait?.modifiers?.goodSoulSelectedSkills || [];
                    const mainSelected = selectedSkills.filter(
                      (s) =>
                        !forcedSelectedSkills.includes(s) &&
                        !goodSoulSelected.includes(s),
                    ).length;
                    const totalSelected = selectedSkills.length;
                    const maxTotal =
                      BASE_TAGGED_SKILLS +
                      extraSkillsFromTrait +
                      (goodSoulSelected.length > 0 ? 2 : 0);
                    return `${mainSelected}/${BASE_TAGGED_SKILLS} основных${extraSkillsFromTrait > 0 ? ` + ${extraSkillsFromTrait} экстра` : ""} (всего: ${totalSelected}/${maxTotal})`;
                  })()}
                />
                <DerivedRow
                  title="Очки Навыков"
                  value={
                    attributesSaved
                      ? `${skillPointsLeft} / ${skillPointsAvailable}`
                      : "—"
                  }
                />
                <LuckPointsRow
                  luckPoints={luckPoints}
                  maxLuckPoints={maxLuckPoints}
                  onSpend={handleSpendLuckPoint}
                  onRestore={handleRestoreLuckPoint}
                />
              </View>

              <ImageSection origin={origin} />
            </View>

            <View style={styles.rightColumn}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>НАВЫКИ</Text>
                  {attributesSaved && !skillsSaved && (
                    <Text style={styles.skillsCount}>
                      Доступно: {skillPointsLeft} очков
                    </Text>
                  )}
                </View>
                <View style={styles.skillsHeader}>
                  <Text style={styles.skillsHeaderText}>Навык</Text>
                  <Text style={styles.skillsHeaderText}>Значение</Text>
                </View>

                {skills.map((skill, index) => {
                  const isTagged =
                    selectedSkills.includes(skill.name) ||
                    extraTaggedSkills.includes(skill.name);
                  const isForced =
                    forcedSelectedSkills.includes(skill.name) && isTagged;
                  const maxValue = level === 1 ? (isTagged ? 3 : 3) : 6;
                  const isMaxReached = skill.value >= maxValue;
                  const rowStyle =
                    index % 2 === 0 ? styles.evenRow : styles.oddRow;

                  return (
                    <SkillRow
                      key={index}
                      name={skill.name}
                      value={skill.value}
                      isSelected={isTagged}
                      isMaxReached={isMaxReached}
                      isForced={isForced}
                      onToggle={() => handleToggleSkill(skill.name)}
                      onIncrease={() => handleChangeSkillValue(index, 1)}
                      onDecrease={() => handleChangeSkillValue(index, -1)}
                      rowStyle={rowStyle}
                      disabled={!canDistributeSkills && !showTraitSkillModal}
                      trait={trait}
                      increaseDisabled={skillPointsLeft <= 0}
                    />
                  );
                })}

                {attributesSaved && !skillsSaved && (
                  <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                      style={[styles.button, styles.saveButton]}
                      onPress={handleSaveSkills}
                    >
                      <Text style={styles.buttonText}>Сохранить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.resetButton]}
                      onPress={handleResetSkills}
                    >
                      <Text style={styles.buttonText}>Сбросить</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        <OriginModal
          isVisible={isOriginModalVisible}
          origins={ORIGINS}
          selectedOrigin={selectedOrigin}
          onSelectOrigin={setSelectedOrigin}
          onClose={() => {
            setIsOriginModalVisible(false);
            setSelectedOrigin(null);
          }}
          onConfirm={() => {
            if (selectedOrigin) {
              confirmOriginSelection(selectedOrigin);
            } else {
              Alert.alert("Ошибка", "Выберите происхождение");
            }
          }}
        />

        <ResetConfirmationModal
          visible={showResetWarning}
          onCancel={cancelReset}
          onConfirm={confirmReset}
        />

        <TraitSkillModal
          visible={showTraitSkillModal && !!trait}
          trait={trait}
          onSelect={handleTraitSkillSelect}
          onCancel={() => setShowTraitSkillModal(false)}
        />

        <EquipmentKitModal
          visible={isEquipmentKitModalVisible}
          onClose={() => setIsEquipmentKitModalVisible(false)}
          equipmentKits={origin?.equipmentKits}
          onSelectKit={handleSelectKit}
          setCaps={setCaps}
        />

        {/* Модальное окно для выбора черты */}
        {TraitModalComponent && (
          <TraitModalComponent
            visible={isTraitModalVisible}
            onClose={() => setIsTraitModalVisible(false)}
            onSelect={handleSelectTrait}
            currentTrait={trait}
            skills={skills}
          />
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}
