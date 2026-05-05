import { describe, expect, it } from 'vitest';

import { evaluateSaveDataSearch, getSaveDataVariant, matchesSaveDataSearchGroup } from './save-data-search';
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
  it('reads variant from linked game software', () => {
    expect(getSaveDataVariant(lookups.saveDatas[0], lookups)).toBe(0);
    expect(getSaveDataVariant({ ...lookups.saveDatas[0], gameSoftwareId: null }, lookups)).toBeNull();
  });

  it('matches text contains and boolean exact conditions inside a group', () => {
    expect(matchesSaveDataSearchGroup(
      lookups.saveDatas[0],
      {
        gameSoftwareMasterId: 100,
        storyProgressDefinitionId: 1000,
        fieldConditions: [
          { fieldKey: 'trainer-name', value: 'ピ' },
          { fieldKey: 'is-cleared', value: 'true' },
        ],
      },
      schema,
    )).toBe(true);
  });

  it('matches numeric equality by numeric value and keeps date/option exact comparisons', () => {
    expect(matchesSaveDataSearchGroup(
      lookups.saveDatas[0],
      {
        gameSoftwareMasterId: 100,
        storyProgressDefinitionId: 1000,
        fieldConditions: [
          { fieldKey: 'badge-count', value: '1.0' },
          { fieldKey: 'play-time', value: '1.00' },
          { fieldKey: 'last-played-on', value: '2024-12-31' },
          { fieldKey: 'starter', value: 'pikachu' },
        ],
      },
      schema,
    )).toBe(true);

    expect(matchesSaveDataSearchGroup(
      lookups.saveDatas[0],
      {
        gameSoftwareMasterId: 100,
        storyProgressDefinitionId: 1000,
        fieldConditions: [
          { fieldKey: 'badge-count', value: '1.5' },
        ],
      },
      schema,
    )).toBe(false);
  });

  it('applies variant as a common AND filter and groups as OR', () => {
    const matches = evaluateSaveDataSearch(lookups, { 100: schema }, {
      variant: 0,
      groups: [
        {
          gameSoftwareMasterId: 100,
          storyProgressDefinitionId: 1000,
          fieldConditions: [{ fieldKey: 'trainer-name', value: 'ピカ' }],
        },
        {
          gameSoftwareMasterId: 200,
          storyProgressDefinitionId: 2000,
          fieldConditions: [],
        },
      ],
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]?.saveData.id).toBe(1);
    expect(matches[0]?.matchedGroupIndexes).toEqual([0]);
  });
});
