const SCENE_DURATION_MINUTES = 5;

const EFFECT_DURATION = {
  NONE: 'нет',
  INSTANT: 'моментально',
};

const toStringSafe = (value) => (value === undefined || value === null ? '' : String(value).trim());

const normalizeDuration = (rawDuration) => {
  const value = toStringSafe(rawDuration).toLowerCase();
  if (!value || value === EFFECT_DURATION.NONE) {
    return { type: 'none', scenes: 0 };
  }

  if (value === EFFECT_DURATION.INSTANT) {
    return { type: 'instant', scenes: 0 };
  }

  const sceneMatch = value.match(/(\d+)\s*сцен/);
  if (sceneMatch) {
    return { type: 'scene', scenes: Number(sceneMatch[1]) || 0 };
  }

  return { type: 'none', scenes: 0 };
};

const normalizeRemovalEffects = (list) => {
  if (!list) return [];
  if (Array.isArray(list)) {
    return list.map((entry) => toStringSafe(entry)).filter(Boolean);
  }

  return toStringSafe(list)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const buildTimedEffect = ({ effectName, effectLabel, effectKind, scenes, sourceName }) => ({
  id: `${effectKind}-${effectName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  effectName,
  effectLabel,
  effectKind,
  sourceName,
  scenesLeft: scenes,
});

const applyOrStackEffect = (activeEffects, newEffect) => {
  const existingIndex = activeEffects.findIndex((effect) => (
    effect.effectName === newEffect.effectName
    && effect.effectKind === newEffect.effectKind
  ));

  if (existingIndex === -1) {
    return [...activeEffects, newEffect];
  }

  const next = [...activeEffects];
  next[existingIndex] = {
    ...next[existingIndex],
    effectLabel: newEffect.effectLabel || next[existingIndex].effectLabel,
    scenesLeft: (Number(next[existingIndex].scenesLeft) || 0) + (Number(newEffect.scenesLeft) || 0),
  };
  return next;
};

export const applyConsumableToEffects = (item, currentEffects = []) => {
  const name = toStringSafe(item?.Name || item?.name || item?.Название);
  let nextEffects = [...currentEffects];
  const events = [];

  const removeNegativeEffects = normalizeRemovalEffects(
    item?.['Removes negative effects']
      ?? item?.['Снимает отрицательные эффекты']
      ?? item?.removeNegativeEffects
      ?? item?.['removesNegativeEffects']
  );

  if (removeNegativeEffects.length > 0) {
    const beforeLength = nextEffects.length;
    nextEffects = nextEffects.filter((effect) => {
      if (effect.effectKind !== 'negative') return true;
      if (removeNegativeEffects.includes('all')) return false;
      const comparableNames = [effect.effectName, effect.effectLabel].filter(Boolean);
      return !comparableNames.some((value) => removeNegativeEffects.includes(value));
    });

    if (nextEffects.length !== beforeLength) {
      events.push(`Сняты эффекты: ${removeNegativeEffects.includes('all') ? 'все негативные' : removeNegativeEffects.join(', ')}`);
    }
  }

  const positiveName = toStringSafe(item?.['Positive effect'] ?? item?.['Эффект положительный'] ?? item?.positiveEffect);
  const positiveLabel = toStringSafe(item?.['Positive effect label'] ?? item?.positiveEffectLabel);
  const positiveDuration = normalizeDuration(item?.['Positive effect duration'] ?? item?.['Действие положительного эффекта'] ?? item?.positiveEffectDuration);

  if (positiveName && positiveDuration.type !== 'none') {
    if (positiveDuration.type === 'instant') {
      events.push(`Моментальный положительный эффект: ${positiveName}`);
    } else if (positiveDuration.scenes > 0) {
      nextEffects = applyOrStackEffect(nextEffects, buildTimedEffect({
        effectName: positiveName,
        effectLabel: positiveLabel,
        effectKind: 'positive',
        scenes: positiveDuration.scenes,
        sourceName: name,
      }));
      events.push(`Положительный эффект ${positiveName}: +${positiveDuration.scenes} сцен.`);
    }
  }

  const negativeName = toStringSafe(item?.['Negative effect'] ?? item?.['Эффект отрицательный'] ?? item?.negativeEffect);
  const negativeLabel = toStringSafe(item?.['Negative effect label'] ?? item?.negativeEffectLabel);
  const negativeDuration = normalizeDuration(item?.['Negative effect duration'] ?? item?.['Действие отрицательного эффекта'] ?? item?.negativeEffectDuration);

  if (negativeName && negativeDuration.type !== 'none') {
    if (negativeDuration.type === 'instant') {
      events.push(`Моментальный отрицательный эффект: ${negativeName}`);
    } else if (negativeDuration.scenes > 0) {
      nextEffects = applyOrStackEffect(nextEffects, buildTimedEffect({
        effectName: negativeName,
        effectLabel: negativeLabel,
        effectKind: 'negative',
        scenes: negativeDuration.scenes,
        sourceName: name,
      }));
      events.push(`Отрицательный эффект ${negativeName}: +${negativeDuration.scenes} сцен.`);
    }
  }

  return {
    effects: nextEffects,
    events,
  };
};

export const advanceEffectsByScene = (currentEffects = []) => {
  const expired = [];
  const nextEffects = currentEffects
    .map((effect) => ({
      ...effect,
      scenesLeft: Math.max(0, (Number(effect.scenesLeft) || 0) - 1),
    }))
    .filter((effect) => {
      if (effect.scenesLeft > 0) return true;
      expired.push(effect);
      return false;
    });

  return {
    effects: nextEffects,
    expired,
  };
};

export const getEffectTimeText = (scenesLeft) => {
  const scenes = Number(scenesLeft) || 0;
  const totalMinutes = scenes * SCENE_DURATION_MINUTES;
  return `${scenes} сцен (${totalMinutes} мин)`;
};

export const SCENE_RULES = {
  SCENE_DURATION_MINUTES,
};

export default {
  SCENE_RULES,
  applyConsumableToEffects,
  advanceEffectsByScene,
  getEffectTimeText,
};
