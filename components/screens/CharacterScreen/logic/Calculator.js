/**
 * Calculator.js — единый движок формул для бросков кубиков.
 *
 * Поддерживаемые форматы:
 *   d20              → 1 бросок d20
 *   2d20             → сумма 2 бросков d20
 *   d20,d20          → массив из двух отдельных бросков d20
 *   (5+(3<cd>))      → 5 + сумма 3 кастомных d6 (Combat Dice)
 *   15               → фиксированное число
 *
 * {CD} в тексте — только маркер иконки для renderTextWithIcons, не вычисляется здесь.
 */

// ─── Combat Dice ──────────────────────────────────────────────────────────────

/**
 * Один бросок кастомного d6 (Combat Dice).
 * Грани: 1→1, 2→2, 3→0, 4→0, 5→1, 6→1
 */
export function rollCombatDice() {
  const roll = Math.floor(Math.random() * 6) + 1;
  switch (roll) {
    case 1: return 1;
    case 2: return 2;
    case 3: return 0;
    case 4: return 0;
    case 5: return 1;
    case 6: return 1;
    default: return 0;
  }
}

/**
 * Сумма N бросков Combat Dice.
 * @param {number} count
 * @returns {{ total: number, rolls: number[] }}
 */
export function rollMultipleCombatDice(count) {
  const rolls = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    const r = rollCombatDice();
    rolls.push(r);
    total += r;
  }
  return { total, rolls };
}

// ─── Standard Dice ────────────────────────────────────────────────────────────

/**
 * Один бросок стандартного кубика с N гранями.
 * @param {number} sides
 * @returns {number}
 */
export function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Сумма N бросков стандартного кубика.
 * @param {string} diceString — формат "2d20", "d6", "1d100"
 * @returns {number}
 */
export function rollCustomDice(diceString) {
  const parts = String(diceString).toLowerCase().split('d');
  const numDice = parts[0] ? parseInt(parts[0], 10) : 1;
  const numSides = parseInt(parts[1], 10);
  if (isNaN(numDice) || isNaN(numSides) || numSides <= 0) {
    return 0;
  }
  let total = 0;
  for (let i = 0; i < numDice; i++) total += rollDie(numSides);
  return total;
}

// ─── Formula Evaluator ────────────────────────────────────────────────────────

/**
 * Вычисляет числовое значение формулы.
 *
 * Поддерживаемые форматы:
 *   "15"             → 15
 *   "d20"            → rollDie(20)
 *   "2d20"           → rollDie(20) + rollDie(20)
 *   "(5+(3<cd>))"    → 5 + rollCombatDice() * 3
 *   "3<cd>"          → сумма 3 Combat Dice
 *
 * @param {string} formula
 * @returns {number}
 */
export function evaluateFormula(formula) {
  if (!formula || typeof formula !== 'string') return 0;
  const f = formula.trim();

  // Фиксированное число
  if (/^\d+$/.test(f)) return parseInt(f, 10);

  // Формат (Y+(X<cd>)) или (Y+(X<cd>)) с пробелами
  const parenMatch = f.match(/^\(\s*(\d+)\s*\+\s*\(\s*(\d+)\s*<cd>\s*\)\s*\)$/i);
  if (parenMatch) {
    const base = parseInt(parenMatch[1], 10);
    const cdCount = parseInt(parenMatch[2], 10);
    return base + rollMultipleCombatDice(cdCount).total;
  }

  // Формат X<cd> (только кастомные кубики без базы)
  const cdOnlyMatch = f.match(/^(\d+)\s*<cd>$/i);
  if (cdOnlyMatch) {
    return rollMultipleCombatDice(parseInt(cdOnlyMatch[1], 10)).total;
  }

  // Формат NdM (стандартные кубики, сумма)
  if (/^\d*d\d+$/i.test(f)) return rollCustomDice(f);

  // Устаревший формат N+Mfn{CD} — поддержка для обратной совместимости
  const legacyMatch = f.match(/^(\d+)\s*\+\s*(\d+)\s*fn\s*\{CD\}$/i);
  if (legacyMatch) {
    const base = parseInt(legacyMatch[1], 10);
    const cdCount = parseInt(legacyMatch[2], 10);
    return base + rollMultipleCombatDice(cdCount).total;
  }

  return 0;
}

/**
 * Вычисляет массив значений для формул с запятой (раздельные броски).
 * "d20,d20" → [rollDie(20), rollDie(20)]
 * "d20"     → [rollDie(20)]
 *
 * @param {string} formula
 * @returns {number[]}
 */
export function evaluateFormulaMulti(formula) {
  if (!formula || typeof formula !== 'string') return [0];
  return formula.split(',').map(part => evaluateFormula(part.trim()));
}

// ─── Legacy exports (обратная совместимость) ──────────────────────────────────

export function calculateDamage(baseValue, diceCount) {
  const { total: diceTotal, rolls } = rollMultipleCombatDice(diceCount);
  return { baseValue, diceCount, rolls, diceTotal, finalValue: baseValue + diceTotal };
}

export function parseFormula(formula) {
  const regex = /(\d+)\s*\+\s*(\d+)\s*fn\s*\{\s*CD\s*\}/i;
  const match = formula.match(regex);
  if (match) {
    return { baseValue: parseInt(match[1], 10), diceCount: parseInt(match[2], 10) };
  }
  const simpleNumber = parseInt(formula, 10);
  if (!isNaN(simpleNumber)) return { baseValue: simpleNumber, diceCount: 0 };
  throw new Error(`[Calculator] Unknown formula: ${formula}`);
}

export function formatDamageFormula(baseValue, diceCount) {
  if (diceCount === 0) return `${baseValue}`;
  return `${baseValue} + ${diceCount}fn{CD}`;
}
