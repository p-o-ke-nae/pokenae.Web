import { describe, expect, it } from 'vitest';
import {
  validateBattleRequest,
  validateCreateRunRequest,
  validateDamageCalculationRequest,
  validateProgressionEventRequest,
  validateUpdateRunRequest,
} from './validation';

describe('pokemon damage calculator validation helpers', () => {
  it('validates create run request', () => {
    expect(validateCreateRunRequest({ name: 'Run', ruleSetId: 'rule-1' })).toEqual([]);
    expect(validateCreateRunRequest({ name: '', ruleSetId: '' })).toEqual([
      'Run 名は必須です。',
      'RuleSet を選択してください。',
    ]);
  });

  it('validates run update and battle requests', () => {
    expect(validateUpdateRunRequest({ name: 'Run', status: 'Draft' })).toEqual([]);
    expect(validateUpdateRunRequest({ name: '', status: '' })).toEqual([
      'Run 名は必須です。',
      'ステータスは必須です。',
    ]);

    expect(validateBattleRequest({ enemyPokemon: 'Onix', sequence: 1 })).toEqual([]);
    expect(validateBattleRequest({ enemyPokemon: '', sequence: 0 })).toEqual([
      '敵ポケモン名は必須です。',
      'Sequence は 1 以上の整数で入力してください。',
    ]);
  });

  it('validates progression event json fields', () => {
    expect(validateProgressionEventRequest({
      battleId: 'battle-1',
      species: 'Pikachu',
      level: 25,
      baseStats: '',
      iVs: '',
      stats: '{"Hp":80}',
      eVs: '{"Speed":252}',
    })).toEqual([]);

    expect(validateProgressionEventRequest({
      battleId: '',
      species: '',
      level: 101,
      baseStats: '[]',
      iVs: '{',
      stats: 'null',
      eVs: '[]',
    })).toEqual([
      '関連 Battle を選択してください。',
      '種族名は必須です。',
      'レベルは 1 から 100 の整数で入力してください。',
      'Base Stats は JSON オブジェクト文字列で入力してください。',
      'IVs は JSON オブジェクト文字列で入力してください。',
      'Stats は JSON オブジェクト文字列で入力してください。',
      'EVs は JSON オブジェクト文字列で入力してください。',
    ]);
  });

  it('validates damage calculation request', () => {
    expect(validateDamageCalculationRequest({
      attackerLevel: 50,
      attackStat: 120,
      movePower: 80,
      isSpecialMove: false,
      hasStab: true,
      defenseStat: 100,
      typeEffectiveness: 1,
    })).toEqual([]);

    expect(validateDamageCalculationRequest({
      attackerLevel: 0,
      attackStat: 0,
      movePower: 0,
      isSpecialMove: false,
      hasStab: false,
      defenseStat: 0,
      typeEffectiveness: 0,
    })).toEqual([
      'Attacker Level は 1 から 100 の整数で入力してください。',
      'Attack Stat は 1 以上の整数で入力してください。',
      'Move Power は 1 以上の整数で入力してください。',
      'Defense Stat は 1 以上の整数で入力してください。',
      'Type Effectiveness は 0 より大きい値を入力してください。',
    ]);
  });
});

