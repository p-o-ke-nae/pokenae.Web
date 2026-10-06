import { describe, expect, it } from 'vitest';

import { buildSaveDataPayload } from './payloads';
import { createSeededFormState } from './form-state';
import type { ManagementLookups } from '@/lib/game-management/types';

const lookups: ManagementLookups = {
  accountTypeMasters: [],
  gameConsoleCategories: [{ id: 1, name: 'Console', abbreviation: 'C', manufacturer: null, saveStorageType: 2, displayOrder: 1, isDeleted: false }],
  gameConsoleCategoryCompatibilities: [],
  gameConsoleMasters: [],
  gameConsoleEditionMasters: [],
  gameSoftwareContentGroups: [],
  gameSoftwareMasters: [{ id: 10, displayOrder: 1, name: 'Title', abbreviation: 'T', gameConsoleCategoryId: 1, contentGroupId: null, isDeleted: false }],
  gameSoftwares: [],
  accounts: [],
  gameConsoles: [],
  memoryCardEditionMasters: [],
  memoryCards: [],
  saveDatas: [],
};

describe('buildSaveDataPayload', () => {
  it('builds create/update payload without replacement fields', () => {
    const payload = buildSaveDataPayload(createSeededFormState({
      gameSoftwareMasterId: '10',
      gameConsoleId: '20',
      accountId: '30',
      memo: 'memo',
    }), lookups, null);

    expect(payload).toMatchObject({
      gameSoftwareMasterId: 10,
      gameConsoleId: 20,
      accountId: 30,
      memo: 'memo',
    });
    expect(payload).not.toHaveProperty('replacedBySaveDataId');
  });
});
