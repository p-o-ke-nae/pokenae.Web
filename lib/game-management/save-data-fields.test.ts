import { describe, expect, it } from 'vitest';

import { buildExtendedFieldInputs, formatMergedFieldValue, mergeSchemaWithSaveData, resolveDynamicFieldRawValue, validateDynamicFieldInputs } from './save-data-fields';
import type { SaveDataDto, SaveDataSchemaDto } from './types';

const booleanSchema: SaveDataSchemaDto = {
  gameSoftwareMasterId: 1,
  contentGroupId: 2,
  fields: [
    {
      fieldKey: 'is-cleared',
      label: 'クリア済み',
      description: null,
      fieldType: 4,
      displayOrder: 1,
      isRequired: false,
      isDisabled: false,
      options: [],
    },
  ],
};

const saveDataWithoutBooleanField: SaveDataDto = {
  id: 1,
  ownerGoogleUserId: 'google-user-1',
  displayOrder: 1,
  memo: null,
  replacedBySaveDataId: null,
  saveStorageType: 1,
  gameSoftwareMasterId: 1,
  gameSoftwareId: null,
  gameConsoleId: 10,
  accountId: null,
  memoryCardId: null,
  storyProgressDefinitionId: null,
  extendedFields: [],
  isDeleted: false,
  deleteReason: null,
};

describe('save-data-fields boolean handling', () => {
  it('normalizes missing checkbox values to false before building inputs', () => {
    expect(resolveDynamicFieldRawValue(booleanSchema.fields[0], undefined)).toBe('false');
    expect(buildExtendedFieldInputs(booleanSchema, {})).toEqual([
      {
        fieldKey: 'is-cleared',
        stringValue: null,
        intValue: null,
        decimalValue: null,
        boolValue: false,
        dateValue: null,
        optionKey: null,
      },
    ]);
  });

  it('treats missing boolean values as false in merged display data', () => {
    const merged = mergeSchemaWithSaveData(booleanSchema, saveDataWithoutBooleanField);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.boolValue).toBe(false);
    expect(formatMergedFieldValue(merged[0]!)).toBe('いいえ');
  });

  it('accepts an unchecked required checkbox as false instead of missing', () => {
    const requiredBooleanSchema: SaveDataSchemaDto = {
      ...booleanSchema,
      fields: [{
        ...booleanSchema.fields[0],
        isRequired: true,
      }],
    };

    expect(validateDynamicFieldInputs(requiredBooleanSchema, {})).toEqual([]);
  });
});