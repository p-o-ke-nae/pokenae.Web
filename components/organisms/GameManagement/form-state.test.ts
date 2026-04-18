import { describe, expect, it } from 'vitest';

import { buildInitialFormState, createContinueFormState } from './form-state';

describe('createContinueFormState', () => {
  it('keeps only game software master and variant for game-softwares', () => {
    const continued = createContinueFormState('game-softwares', {
      displayOrder: '12',
      name: '',
      abbreviation: '',
      manufacturer: '',
      saveStorageType: '0',
      label: '自宅用DL版',
      memo: '追加コンテンツ込み',
      gameConsoleCategoryId: '',
      gameConsoleCategoryIds: [],
      accountTypeMasterId: '',
      linkedGameConsoleIds: [],
      gameConsoleMasterId: '',
      gameConsoleEditionMasterId: '',
      contentGroupId: '',
      gameSoftwareMasterId: '101',
      variant: '1',
      memoryCardEditionMasterId: '',
      blockCount: '',
      gameSoftwareId: '',
      gameConsoleId: '',
      accountId: '201',
      installedGameConsoleId: '301',
      memoryCardId: '',
      storyProgressDefinitionId: '',
      replacedBySaveDataId: '',
      deleteReason: '',
      dynamicFieldValues: { progress: 'late-game' },
    }, {
      label: 'seeded label',
      accountId: '999',
      gameSoftwareMasterId: '55',
      variant: '0',
    });

    expect(continued.gameSoftwareMasterId).toBe('101');
    expect(continued.variant).toBe('1');
    expect(continued.label).toBe('');
    expect(continued.memo).toBe('');
    expect(continued.accountId).toBe('');
    expect(continued.installedGameConsoleId).toBe('');
    expect(continued.displayOrder).toBe('');
    expect(continued.dynamicFieldValues).toEqual({});
  });

  it('clears download-specific fields even when the current record is digital', () => {
    const continued = createContinueFormState('game-softwares', {
      displayOrder: '',
      name: '',
      abbreviation: '',
      manufacturer: '',
      saveStorageType: '0',
      label: '',
      memo: '',
      gameConsoleCategoryId: '',
      gameConsoleCategoryIds: [],
      accountTypeMasterId: '',
      linkedGameConsoleIds: [],
      gameConsoleMasterId: '',
      gameConsoleEditionMasterId: '',
      contentGroupId: '',
      gameSoftwareMasterId: '777',
      variant: '1',
      memoryCardEditionMasterId: '',
      blockCount: '',
      gameSoftwareId: '',
      gameConsoleId: '',
      accountId: '888',
      installedGameConsoleId: '999',
      memoryCardId: '',
      storyProgressDefinitionId: '',
      replacedBySaveDataId: '',
      deleteReason: '',
      dynamicFieldValues: {},
    });

    expect(continued.gameSoftwareMasterId).toBe('777');
    expect(continued.variant).toBe('1');
    expect(continued.accountId).toBe('');
    expect(continued.installedGameConsoleId).toBe('');
  });

  it('falls back to the usual seeded state for other resources', () => {
    const continued = createContinueFormState('save-datas', {
      displayOrder: '9',
      name: '',
      abbreviation: '',
      manufacturer: '',
      saveStorageType: '0',
      label: '',
      memo: 'filled',
      gameConsoleCategoryId: '',
      gameConsoleCategoryIds: [],
      accountTypeMasterId: '',
      linkedGameConsoleIds: [],
      gameConsoleMasterId: '',
      gameConsoleEditionMasterId: '',
      contentGroupId: '',
      gameSoftwareMasterId: '100',
      variant: '',
      memoryCardEditionMasterId: '',
      blockCount: '',
      gameSoftwareId: '',
      gameConsoleId: '1',
      accountId: '2',
      installedGameConsoleId: '',
      memoryCardId: '3',
      storyProgressDefinitionId: '',
      replacedBySaveDataId: '',
      deleteReason: '',
      dynamicFieldValues: { key: 'value' },
    }, {
      gameSoftwareMasterId: '444',
      memo: 'seeded memo',
      dynamicFieldValues: { seeded: 'yes' },
    });

    expect(continued.gameSoftwareMasterId).toBe('444');
    expect(continued.memo).toBe('seeded memo');
    expect(continued.dynamicFieldValues).toEqual({ seeded: 'yes' });
    expect(continued.gameConsoleId).toBe('');
  });

  it('keeps explicit boolean false values when initializing save-datas', () => {
    const initial = buildInitialFormState('save-datas', {
      id: 10,
      ownerGoogleUserId: 'google-user-1',
      displayOrder: 3,
      memo: null,
      replacedBySaveDataId: null,
      saveStorageType: 1,
      gameSoftwareMasterId: 100,
      gameSoftwareId: null,
      gameConsoleId: 12,
      accountId: null,
      memoryCardId: null,
      storyProgressDefinitionId: null,
      extendedFields: [
        {
          fieldKey: 'is-cleared',
          label: 'クリア済み',
          fieldType: 4,
          isRequired: false,
          displayOrder: 1,
          stringValue: null,
          intValue: null,
          decimalValue: null,
          boolValue: false,
          dateValue: null,
          selectedOptionKey: null,
        },
      ],
      isDeleted: false,
      deleteReason: null,
    });

    expect(initial.dynamicFieldValues).toEqual({ 'is-cleared': 'false' });
  });
});