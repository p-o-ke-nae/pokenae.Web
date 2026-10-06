import { describe, expect, it } from 'vitest';

import { evaluateSaveDataSearch, getSaveDataSearchFields } from './save-data-search';
import type { ManagementLookups, SaveDataSchemaDto, StoryProgressSchemaDto } from './types';

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
      deletedAt: null,
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
      deletedAt: null,
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
  const fields = getSaveDataSearchFields({ 100: schema, 200: { ...schema, gameSoftwareMasterId: 200 } }, lookups);

  it('searches a custom field across saves from multiple software masters', () => {
    const secondSchema = { ...schema, gameSoftwareMasterId: 200 };
    const secondSaveData = {
      ...lookups.saveDatas[1]!,
      extendedFields: [{
        ...lookups.saveDatas[0]!.extendedFields[0]!,
        stringValue: 'SEARCH-TEST',
      }],
    };
    const searchLookups = { ...lookups, saveDatas: [lookups.saveDatas[0]!, secondSaveData] };
    const searchFields = getSaveDataSearchFields({ 100: schema, 200: secondSchema }, searchLookups);
    const matches = evaluateSaveDataSearch(searchLookups, { 100: schema, 200: secondSchema }, [
      { fieldId: 'custom:trainer-name', operator: 'contains', value: 'search-test' },
    ], searchFields);

    expect(matches.map((match) => match.saveData.id)).toEqual([2]);
    expect(matches[0]?.matchedValues).toEqual(['SEARCH-TEST']);
  });

  it('searches empty custom values and supports not-equals against blank', () => {
    const blankSave = {
      ...lookups.saveDatas[0]!,
      extendedFields: lookups.saveDatas[0]!.extendedFields.map((field) => (
        field.fieldKey === 'trainer-name' ? { ...field, stringValue: '' } : field
      )),
    };
    const populatedSave = {
      ...lookups.saveDatas[1]!,
      extendedFields: [{
        ...lookups.saveDatas[0]!.extendedFields[0]!,
        stringValue: 'ミュウ',
      }],
    };
    const searchLookups = { ...lookups, saveDatas: [blankSave, populatedSave] };
    const searchSchemas = { 100: schema, 200: { ...schema, gameSoftwareMasterId: 200 } };

    expect(evaluateSaveDataSearch(searchLookups, searchSchemas, [
      { fieldId: 'custom:trainer-name', operator: 'equals', value: '' },
    ], fields).map((match) => match.saveData.id)).toEqual([1]);
    expect(evaluateSaveDataSearch(searchLookups, searchSchemas, [
      { fieldId: 'custom:trainer-name', operator: 'not-equals', value: '' },
    ], fields).map((match) => match.saveData.id)).toEqual([2]);
  });

  it('combines selected search items and supports non-equality operators', () => {
    const matches = evaluateSaveDataSearch(lookups, { 100: schema }, [
      { fieldId: 'custom:trainer-name', operator: 'equals', value: 'ピカ' },
      { fieldId: 'custom:badge-count', operator: 'less-than', value: '2' },
    ], fields);

    expect(matches.map((match) => match.saveData.id)).toEqual([1]);
  });

  it('matches text, number, boolean, date, and option fields using their schema types', () => {
    for (const [fieldKey, value] of [
      ['trainer-name', 'ピ'],
      ['badge-count', '1.0'],
      ['play-time', '1.00'],
      ['is-cleared', 'true'],
      ['last-played-on', '2024-12-31'],
      ['starter', 'pikachu'],
    ]) {
      const searchField = fields.find((field) => field.fieldKey === fieldKey)!;
      expect(evaluateSaveDataSearch(lookups, { 100: schema }, [
        {
          fieldId: searchField.fieldId,
          operator: searchField.fieldType === 0 || searchField.fieldType === 1 ? 'contains' : 'equals',
          value,
        },
      ], fields).map((match) => match.saveData.id)).toEqual([1]);
    }
    expect(evaluateSaveDataSearch(lookups, { 100: schema }, [
      { fieldId: 'custom:badge-count', operator: 'equals', value: '2' },
    ], fields)).toEqual([]);
  });

  it('lists the union of custom fields and master fields without work counts', () => {
    const secondSchema = {
      ...schema,
      gameSoftwareMasterId: 200,
      fields: schema.fields.map((field) => field.fieldKey === 'starter'
        ? { ...field, options: [...field.options, { optionKey: 'snorlax', label: 'カビゴン', description: null, displayOrder: 3 }] }
        : field),
    };
    const searchFields = getSaveDataSearchFields({ 100: schema, 200: secondSchema }, lookups);
    expect(searchFields.find((field) => field.fieldKey === 'trainer-name')).toMatchObject({
      fieldId: 'custom:trainer-name',
      fieldKey: 'trainer-name',
      label: '主人公名',
    });
    expect(searchFields.find((field) => field.fieldId === 'master:game-software')?.label).toBe('ゲームソフトマスタ');
    expect(searchFields.find((field) => field.fieldKey === 'starter')?.options).toContainEqual({
      value: 'snorlax',
      label: 'カビゴン',
    });
  });

  it('treats a game software master as an ordinary selectable criterion', () => {
    expect(evaluateSaveDataSearch(lookups, {}, [
      { fieldId: 'master:game-software', operator: 'equals', value: '100' },
    ], fields).map((match) => match.saveData.id)).toEqual([1]);
    expect(evaluateSaveDataSearch(lookups, {}, [
      { fieldId: 'master:game-software', operator: 'not-equals', value: '100' },
    ], fields).map((match) => match.saveData.id)).toEqual([2]);
  });

  it('searches story progress across software masters and shows each save data label', () => {
    const storyProgressSchemas: Record<number, StoryProgressSchemaDto> = {
      100: {
        gameSoftwareMasterId: 100,
        contentGroupId: 10,
        choices: [{
          storyProgressDefinitionId: 1000,
          progressKey: 'start',
          label: '冒険開始',
          description: null,
          displayOrder: 1,
          isDisabled: false,
        }],
      },
      200: {
        gameSoftwareMasterId: 200,
        contentGroupId: 10,
        choices: [{
          storyProgressDefinitionId: 2000,
          progressKey: 'final',
          label: '最終局面',
          description: null,
          displayOrder: 1,
          isDisabled: false,
        }],
      },
    };
    const searchFields = getSaveDataSearchFields(
      { 100: schema, 200: { ...schema, gameSoftwareMasterId: 200 } },
      lookups,
      storyProgressSchemas,
    );
    const matches = evaluateSaveDataSearch(
      lookups,
      { 100: schema, 200: { ...schema, gameSoftwareMasterId: 200 } },
      [{ fieldId: 'master:story-progress', operator: 'equals', value: '2000' }],
      searchFields,
      storyProgressSchemas,
    );

    expect(searchFields.find((field) => field.fieldId === 'master:story-progress')).toMatchObject({
      label: 'ストーリー進捗',
      options: [
        { value: '1000', label: '冒険開始' },
        { value: '2000', label: '最終局面' },
      ],
    });
    expect(matches.map((match) => match.saveData.id)).toEqual([2]);
    expect(matches[0]?.matchedValues).toEqual(['最終局面']);
  });
});
