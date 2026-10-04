import { describe, expect, it } from 'vitest';

import { evaluateSaveDataSearch, getSaveDataSearchFields } from './save-data-search';
import type { ManagementLookups, SaveDataSchemaDto } from './types';

const schema: SaveDataSchemaDto = {
  gameSoftwareMasterId: 100,
  contentGroupId: 10,
  fields: [
    {
      fieldKey: 'trainer-name',
      label: '主人公名',
      description: null,
      fieldType: 0,
      displayOrder: 1,
      isRequired: false,
      isDisabled: false,
      options: [],
    },
    {
      fieldKey: 'is-cleared',
      label: 'クリア済み',
      description: null,
      fieldType: 4,
      displayOrder: 2,
      isRequired: false,
      isDisabled: false,
      options: [],
    },
    {
      fieldKey: 'badge-count',
      label: 'バッジ数',
      description: null,
      fieldType: 2,
      displayOrder: 3,
      isRequired: false,
      isDisabled: false,
      options: [],
    },
    {
      fieldKey: 'play-time',
      label: 'プレイ時間',
      description: null,
      fieldType: 3,
      displayOrder: 4,
      isRequired: false,
      isDisabled: false,
      options: [],
    },
    {
      fieldKey: 'last-played-on',
      label: '最終プレイ日',
      description: null,
      fieldType: 5,
      displayOrder: 5,
      isRequired: false,
      isDisabled: false,
      options: [],
    },
    {
      fieldKey: 'starter',
      label: '相棒',
      description: null,
      fieldType: 6,
      displayOrder: 6,
      isRequired: false,
      isDisabled: false,
      options: [
        {
          optionKey: 'pikachu',
          label: 'ピカチュウ',
          description: null,
          displayOrder: 1,
        },
        {
          optionKey: 'eevee',
          label: 'イーブイ',
          description: null,
          displayOrder: 2,
        },
      ],
    },
  ],
};

const lookups: ManagementLookups = {
  accountTypeMasters: [],
  accounts: [],
  gameConsoleCategories: [],
  gameConsoleCategoryCompatibilities: [],
  gameConsoleEditionMasters: [],
  gameConsoleMasters: [],
  gameConsoles: [],
  gameSoftwareContentGroups: [],
  gameSoftwareMasters: [
    { id: 100, name: 'ソフトA', abbreviation: 'A', gameConsoleCategoryId: 1, contentGroupId: 10, displayOrder: 1, isDeleted: false },
    { id: 200, name: 'ソフトB', abbreviation: 'B', gameConsoleCategoryId: 1, contentGroupId: 10, displayOrder: 2, isDeleted: false },
  ],
  gameSoftwares: [
    {
      id: 10,
      gameSoftwareMasterId: 100,
      variant: 0,
      accountId: null,
      installedGameConsoleId: null,
      ownerGoogleUserId: 'owner',
      displayOrder: 1,
      label: 'A package',
      memo: null,
      isDeleted: false,
      maintenance: {
        hasRecord: false,
        intervalDays: 365,
        lastMaintenanceDate: null,
        nextMaintenanceDate: null,
        isOverdue: false,
        latestHealthStatus: 0,
      },
    },
    {
      id: 20,
      gameSoftwareMasterId: 200,
      variant: 1,
      accountId: null,
      installedGameConsoleId: null,
      ownerGoogleUserId: 'owner',
      displayOrder: 2,
      label: 'B download',
      memo: null,
      isDeleted: false,
      maintenance: {
        hasRecord: false,
        intervalDays: 365,
        lastMaintenanceDate: null,
        nextMaintenanceDate: null,
        isOverdue: false,
        latestHealthStatus: 0,
      },
    },
  ],
  memoryCardEditionMasters: [],
  memoryCards: [],
  saveDatas: [
    {
      id: 1,
      ownerGoogleUserId: 'owner',
      displayOrder: 1,
      memo: 'メイン',
      replacedBySaveDataId: null,
      saveStorageType: 0,
      gameSoftwareMasterId: 100,
      gameSoftwareId: 10,
      gameConsoleId: null,
      accountId: null,
      memoryCardId: null,
      storyProgressDefinitionId: 1000,
      extendedFields: [
        {
          fieldKey: 'trainer-name',
          label: '主人公名',
          fieldType: 0,
          isRequired: false,
          displayOrder: 1,
          stringValue: 'ピカ',
          intValue: null,
          decimalValue: null,
          boolValue: null,
          dateValue: null,
          selectedOptionKey: null,
        },
        {
          fieldKey: 'is-cleared',
          label: 'クリア済み',
          fieldType: 4,
          isRequired: false,
          displayOrder: 2,
          stringValue: null,
          intValue: null,
          decimalValue: null,
          boolValue: true,
          dateValue: null,
          selectedOptionKey: null,
        },
        {
          fieldKey: 'badge-count',
          label: 'バッジ数',
          fieldType: 2,
          isRequired: false,
          displayOrder: 3,
          stringValue: null,
          intValue: 1,
          decimalValue: null,
          boolValue: null,
          dateValue: null,
          selectedOptionKey: null,
        },
        {
          fieldKey: 'play-time',
          label: 'プレイ時間',
          fieldType: 3,
          isRequired: false,
          displayOrder: 4,
          stringValue: null,
          intValue: null,
          decimalValue: 1,
          boolValue: null,
          dateValue: null,
          selectedOptionKey: null,
        },
        {
          fieldKey: 'last-played-on',
          label: '最終プレイ日',
          fieldType: 5,
          isRequired: false,
          displayOrder: 5,
          stringValue: null,
          intValue: null,
          decimalValue: null,
          boolValue: null,
          dateValue: '2024-12-31',
          selectedOptionKey: null,
        },
        {
          fieldKey: 'starter',
          label: '相棒',
          fieldType: 6,
          isRequired: false,
          displayOrder: 6,
          stringValue: null,
          intValue: null,
          decimalValue: null,
          boolValue: null,
          dateValue: null,
          selectedOptionKey: 'pikachu',
        },
      ],
      isDeleted: false,
      deleteReason: null,
    },
    {
      id: 2,
      ownerGoogleUserId: 'owner',
      displayOrder: 2,
      memo: null,
      replacedBySaveDataId: null,
      saveStorageType: 0,
      gameSoftwareMasterId: 200,
      gameSoftwareId: 20,
      gameConsoleId: null,
      accountId: null,
      memoryCardId: null,
      storyProgressDefinitionId: 2000,
      extendedFields: [],
      isDeleted: false,
      deleteReason: null,
    },
  ],
};

describe('save-data search helpers', () => {
  it('searches one selected custom field across saves from multiple software masters', () => {
    const secondSchema = { ...schema, gameSoftwareMasterId: 200 };
    const secondSaveData = {
      ...lookups.saveDatas[1]!,
      extendedFields: [{
        ...lookups.saveDatas[0]!.extendedFields[0]!,
        stringValue: 'Oza',
      }],
    };
    const searchLookups = { ...lookups, saveDatas: [lookups.saveDatas[0]!, secondSaveData] };
    const matches = evaluateSaveDataSearch(searchLookups, { 100: schema, 200: secondSchema }, {
      gameSoftwareMasterId: null,
      fieldKey: 'trainer-name',
      value: 'oza',
    });

    expect(matches.map((match) => match.saveData.id)).toEqual([2]);
    expect(matches[0]?.matchedFieldValue).toBe('Oza');
  });

  it('can limit a custom-field search to a selected software master', () => {
    const matches = evaluateSaveDataSearch(lookups, { 100: schema }, {
      gameSoftwareMasterId: 100,
      fieldKey: 'trainer-name',
      value: 'ピ',
    });

    expect(matches.map((match) => match.saveData.id)).toEqual([1]);
  });

  it('matches text, number, boolean, date, and option fields using their schema types', () => {
    for (const [fieldKey, value] of [
      ['trainer-name', 'ピ'],
      ['badge-count', '1.0'],
      ['play-time', '1.00'],
      ['is-cleared', 'はい'],
      ['last-played-on', '2024-12-31'],
      ['starter', 'ピカチュウ'],
    ]) {
      expect(evaluateSaveDataSearch(lookups, { 100: schema }, {
        gameSoftwareMasterId: 100,
        fieldKey,
        value,
      }).map((match) => match.saveData.id)).toEqual([1]);
    }
    expect(evaluateSaveDataSearch(lookups, { 100: schema }, {
      gameSoftwareMasterId: 100,
      fieldKey: 'badge-count',
      value: '2',
    })).toEqual([]);
  });

  it('lists the union of enabled custom fields across schemas', () => {
    const fields = getSaveDataSearchFields({ 100: schema, 200: { ...schema, gameSoftwareMasterId: 200 } });
    expect(fields.find((field) => field.fieldKey === 'trainer-name')).toEqual({
      fieldKey: 'trainer-name',
      label: '主人公名',
      availableIn: 2,
    });
  });
});
