const SCENE_DURATION_MINUTES = 5;
const SCENE_DURATION_MS = SCENE_DURATION_MINUTES * 60 * 1000;
const CANONICAL_ATTRIBUTES = new Set(['STR', 'END', 'PER', 'AGI', 'INT', 'CHA', 'LCK']);

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
  createdAt: Date.now(),
  durationMs: Math.max(0, scenes) * SCENE_DURATION_MS,
  expiresAt: Date.now() + (Math.max(0, scenes) * SCENE_DURATION_MS),
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
  const prevDuration = Number(next[existingIndex].durationMs) || ((Number(next[existingIndex].scenesLeft) || 0) * SCENE_DURATION_MS);
  const incomingDuration = Number(newEffect.durationMs) || ((Number(newEffect.scenesLeft) || 0) * SCENE_DURATION_MS);
  const previousExpiresAt = Number(next[existingIndex].expiresAt) || (Date.now() + prevDuration);
  next[existingIndex] = {
    ...next[existingIndex],
    effectLabel: newEffect.effectLabel || next[existingIndex].effectLabel,
    scenesLeft: (Number(next[existingIndex].scenesLeft) || 0) + (Number(newEffect.scenesLeft) || 0),
    durationMs: prevDuration + incomingDuration,
    expiresAt: previousExpiresAt + incomingDuration,
  };
  return next;
};

const normalizeTimedEffectWithClock = (effect, nowMs) => {
  if (!effect) return { normalized: effect, expired: false, changed: false };
  const currentScenes = Math.max(0, Number(effect.scenesLeft) || 0);
  const hasExpiresAt = Number.isFinite(Number(effect.expiresAt));
  const expiresAt = hasExpiresAt
    ? Number(effect.expiresAt)
    : nowMs + (currentScenes * SCENE_DURATION_MS);

  const remainingMs = Math.max(0, expiresAt - nowMs);
  const nextScenesLeft = Math.ceil(remainingMs / SCENE_DURATION_MS);
  const nextDuration = Number(effect.durationMs) || (currentScenes * SCENE_DURATION_MS);
  const expired = remainingMs <= 0;
  const changed = !hasExpiresAt
    || Number(effect.durationMs) !== nextDuration
    || currentScenes !== nextScenesLeft;

  return {
    expired,
    changed,
    normalized: {
      ...effect,
      expiresAt,
      durationMs: nextDuration,
      scenesLeft: nextScenesLeft,
    },
  };
};

const normalizeAttributeToken = (token) => {
  const trimmed = toStringSafe(token).toUpperCase();
  return CANONICAL_ATTRIBUTES.has(trimmed) ? trimmed : null;
};

const parseAttributeDelta = (text) => {
  const raw = toStringSafe(text);
  if (!raw) return null;

  const match = raw.match(/([+-]?\d+)\s*<([^>]+)>/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const attribute = normalizeAttributeToken(match[2]);
  if (!attribute || !Number.isFinite(amount)) return null;

  return { attribute, amount };
};

export const getTimedAttributeModifiers = (activeEffects = []) => (
  activeEffects.reduce((acc, effect) => {
    if (!effect || effect.effectKind !== 'positive') return acc;

    // Сначала берем label (контрактно-каноничное поле), затем fallback на name.
    const parsed = parseAttributeDelta(effect.effectLabel) || parseAttributeDelta(effect.effectName);
    if (!parsed) return acc;

    acc[parsed.attribute] = (acc[parsed.attribute] || 0) + parsed.amount;
    return acc;
  }, {})
);

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
  const nowMs = Date.now() + SCENE_DURATION_MS;
  const expired = [];
  const nextEffects = currentEffects.reduce((acc, effect) => {
    const normalized = normalizeTimedEffectWithClock(effect, nowMs);
    if (normalized.expired) {
      expired.push(normalized.normalized);
      return acc;
    }
    acc.push(normalized.normalized);
    return acc;
  }, []);

  return {
    effects: nextEffects,
    expired,
  };
};

export const pruneExpiredTimedEffects = (currentEffects = [], nowMs = Date.now()) => {
  let changed = false;
  const expired = [];
  const effects = currentEffects.reduce((acc, effect) => {
    const normalized = normalizeTimedEffectWithClock(effect, nowMs);
    if (normalized.expired) {
      expired.push(normalized.normalized);
      changed = true;
      return acc;
    }
    if (normalized.changed) changed = true;
    acc.push(normalized.normalized);
    return acc;
  }, []);

  if (effects.length !== currentEffects.length) {
    changed = true;
  }

  return {
    effects,
    expired,
    changed,
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
  pruneExpiredTimedEffects,
  getTimedAttributeModifiers,
  getEffectTimeText,
};
