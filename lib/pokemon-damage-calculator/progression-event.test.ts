import { describe, expect, it } from 'vitest';
import {
  buildAddProgressionEventRequest,
  getPartyStatePrerequisiteMessage,
} from './progression-event';

describe('pokemon damage calculator progression event helpers', () => {
  it('maps optional json fields to contract-safe strings', () => {
    expect(buildAddProgressionEventRequest({
      battleId: 'battle-1',
      species: '  Pikachu  ',
      level: '25',
      baseStats: '   ',
      iVs: ' {"Attack":31} ',
      stats: ' {"Hp":80} ',
      eVs: ' {"Speed":252} ',
    })).toEqual({
      battleId: 'battle-1',
      species: 'Pikachu',
      level: 25,
      baseStats: '',
      iVs: '{"Attack":31}',
      stats: '{"Hp":80}',
      eVs: '{"Speed":252}',
    });
  });

  it('returns prerequisite guidance only when battles do not exist', () => {
    expect(getPartyStatePrerequisiteMessage(0)).toBe('Party State を登録するには、先に Battle を作成してください。');
    expect(getPartyStatePrerequisiteMessage(1)).toBeNull();
  });
});
