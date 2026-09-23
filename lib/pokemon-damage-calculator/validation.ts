import type {
  AddProgressionEventRequest,
  CalculateDamageRequest,
  CreateBattleRequest,
  CreateRunRequest,
  UpdateRunRequest,
} from './types';

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

function isJsonObjectText(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

export function validateCreateRunRequest(request: CreateRunRequest): string[] {
  const errors: string[] = [];

  if (isBlank(request.name)) {
    errors.push('Run 名は必須です。');
  }

  if (request.name.trim().length > 200) {
    errors.push('Run 名は 200 文字以内で入力してください。');
  }

  if (isBlank(request.ruleSetId)) {
    errors.push('RuleSet を選択してください。');
  }

  return errors;
}

export function validateUpdateRunRequest(request: UpdateRunRequest): string[] {
  const errors: string[] = [];

  if (isBlank(request.name)) {
    errors.push('Run 名は必須です。');
  }

  if (isBlank(request.status)) {
    errors.push('ステータスは必須です。');
  }

  return errors;
}

export function validateBattleRequest(request: CreateBattleRequest): string[] {
  const errors: string[] = [];

  if (isBlank(request.enemyPokemon)) {
    errors.push('敵ポケモン名は必須です。');
  }

  if (!Number.isInteger(request.sequence) || request.sequence < 1) {
    errors.push('Sequence は 1 以上の整数で入力してください。');
  }

  return errors;
}

export function validateProgressionEventRequest(request: AddProgressionEventRequest): string[] {
  const errors: string[] = [];

  if (isBlank(request.battleId)) {
    errors.push('関連 Battle を選択してください。');
  }

  if (isBlank(request.species)) {
    errors.push('種族名は必須です。');
  }

  if (!Number.isInteger(request.level) || request.level < 1 || request.level > 100) {
    errors.push('レベルは 1 から 100 の整数で入力してください。');
  }

  if (!isBlank(request.baseStats) && !isJsonObjectText(request.baseStats)) {
    errors.push('Base Stats は JSON オブジェクト文字列で入力してください。');
  }

  if (!isBlank(request.iVs) && !isJsonObjectText(request.iVs)) {
    errors.push('IVs は JSON オブジェクト文字列で入力してください。');
  }

  if (!isJsonObjectText(request.stats)) {
    errors.push('Stats は JSON オブジェクト文字列で入力してください。');
  }

  if (!isJsonObjectText(request.eVs)) {
    errors.push('EVs は JSON オブジェクト文字列で入力してください。');
  }

  return errors;
}

export function validateDamageCalculationRequest(request: CalculateDamageRequest): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(request.attackerLevel) || request.attackerLevel < 1 || request.attackerLevel > 100) {
    errors.push('Attacker Level は 1 から 100 の整数で入力してください。');
  }

  if (!Number.isInteger(request.attackStat) || request.attackStat < 1) {
    errors.push('Attack Stat は 1 以上の整数で入力してください。');
  }

  if (!Number.isInteger(request.movePower) || request.movePower < 1) {
    errors.push('Move Power は 1 以上の整数で入力してください。');
  }

  if (!Number.isInteger(request.defenseStat) || request.defenseStat < 1) {
    errors.push('Defense Stat は 1 以上の整数で入力してください。');
  }

  if (!(request.typeEffectiveness > 0)) {
    errors.push('Type Effectiveness は 0 より大きい値を入力してください。');
  }

  return errors;
}

