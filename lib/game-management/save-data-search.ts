import { mergeSchemaWithSaveData } from './save-data-fields';
import type {
  ManagementLookups,
  SaveDataDto,
  SaveDataFieldType,
  SaveDataSchemaDto,
  StoryProgressSchemaDto,
} from './types';

export type SaveDataSearchOperator =
  | 'equals'
  | 'not-equals'
  | 'contains'
  | 'not-contains'
  | 'greater-than'
  | 'less-than'
  | 'greater-or-equal'
  | 'less-or-equal';

export type SaveDataSearchCriteria = {
  fieldId: string;
  operator: SaveDataSearchOperator;
  value: string;
};

export type SaveDataSearchFieldOption = {
  fieldId: string;
  fieldKey?: string;
  label: string;
  fieldType: SaveDataFieldType | 'master';
  options: Array<{ value: string; label: string }>;
};

export type SaveDataSearchMatch = {
  saveData: SaveDataDto;
  matchedValues: string[];
};

const MASTER_SEARCH_FIELDS = [
  { fieldId: 'master:game-software', label: 'ゲームソフトマスタ', fieldType: 'master' as const },
  { fieldId: 'master:console-category', label: 'ゲーム機カテゴリ', fieldType: 'master' as const },
  { fieldId: 'master:game-console', label: 'ゲーム機マスタ', fieldType: 'master' as const },
  { fieldId: 'master:console-edition', label: 'ゲーム機エディション', fieldType: 'master' as const },
  { fieldId: 'master:account-type', label: 'アカウント種類', fieldType: 'master' as const },
  { fieldId: 'master:memory-card-type', label: 'メモリーカード種類', fieldType: 'master' as const },
  { fieldId: 'master:software-content-group', label: 'ゲームソフト分類', fieldType: 'master' as const },
  { fieldId: 'master:storage-type', label: '保存方式', fieldType: 'master' as const },
  { fieldId: 'master:software-variant', label: 'ゲームソフト種類', fieldType: 'master' as const },
] as const;

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('ja');
}

function getMasterSearchOptions(
  lookups: ManagementLookups,
  storyProgressSchemas: Record<number, StoryProgressSchemaDto>,
): SaveDataSearchFieldOption[] {
  const optionsByField: Record<string, Array<{ value: string; label: string }>> = {
    'master:game-software': lookups.gameSoftwareMasters.map((item) => ({ value: String(item.id), label: item.abbreviation || item.name })),
    'master:console-category': lookups.gameConsoleCategories.map((item) => ({ value: String(item.id), label: item.abbreviation || item.name })),
    'master:game-console': lookups.gameConsoleMasters.map((item) => ({ value: String(item.id), label: item.abbreviation || item.name })),
    'master:console-edition': lookups.gameConsoleEditionMasters.map((item) => ({ value: String(item.id), label: item.abbreviation || item.name })),
    'master:account-type': lookups.accountTypeMasters.map((item) => ({ value: String(item.id), label: item.name })),
    'master:memory-card-type': lookups.memoryCardEditionMasters.map((item) => ({ value: String(item.id), label: item.name })),
    'master:software-content-group': lookups.gameSoftwareContentGroups.map((item) => ({ value: String(item.id), label: item.name })),
    'master:storage-type': [
      { value: '0', label: 'ゲームソフト保存' },
      { value: '1', label: 'ゲーム機本体保存' },
      { value: '2', label: '本体・アカウント保存' },
      { value: '3', label: 'メモリーカード保存' },
    ],
    'master:software-variant': [
      { value: '0', label: 'パッケージ' },
      { value: '1', label: 'ダウンロード' },
    ],
  };

  const storyProgressOptions = new Map<string, { value: string; label: string }>();
  Object.values(storyProgressSchemas).forEach((schema) => {
    schema.choices.filter((choice) => !choice.isDisabled).forEach((choice) => {
      const value = String(choice.storyProgressDefinitionId);
      if (!storyProgressOptions.has(value)) {
        storyProgressOptions.set(value, { value, label: choice.label });
      }
    });
  });

  return [
    ...MASTER_SEARCH_FIELDS.map((field) => ({
      ...field,
      options: optionsByField[field.fieldId] ?? [],
    })).filter((field) => field.options.length > 0),
    ...(storyProgressOptions.size > 0
      ? [{
        fieldId: 'master:story-progress',
        label: 'ストーリー進捗',
        fieldType: 'master' as const,
        options: Array.from(storyProgressOptions.values()),
      }]
      : []),
  ];
}

export function getSaveDataSearchFields(
  schemaMap: Record<number, SaveDataSchemaDto>,
  lookups: ManagementLookups,
  storyProgressSchemas: Record<number, StoryProgressSchemaDto> = {},
): SaveDataSearchFieldOption[] {
  const fields = new Map<string, SaveDataSearchFieldOption>();
  Object.values(schemaMap).forEach((schema) => {
    schema.fields.filter((field) => !field.isDisabled).forEach((field) => {
      const fieldId = `custom:${field.fieldKey}`;
      const existing = fields.get(fieldId);
      if (existing) {
        const options = new Map(existing.options.map((option) => [option.value, option]));
        field.options.forEach((option) => {
          if (!options.has(option.optionKey)) {
            options.set(option.optionKey, { value: option.optionKey, label: option.label });
          }
        });
        fields.set(fieldId, { ...existing, options: Array.from(options.values()) });
      } else {
        fields.set(fieldId, {
          fieldId,
          fieldKey: field.fieldKey,
          label: field.label,
          fieldType: field.fieldType,
          options: field.options.map((option) => ({ value: option.optionKey, label: option.label })),
        });
      }
    });
  });

  return [
    ...getMasterSearchOptions(lookups, storyProgressSchemas),
    ...Array.from(fields.values()).sort((left, right) => (
      left.label.localeCompare(right.label, 'ja') || left.fieldId.localeCompare(right.fieldId)
    )),
  ];
}

function getCustomFieldValue(
  saveData: SaveDataDto,
  schema: SaveDataSchemaDto | undefined,
  fieldKey: string,
): { value: string; display: string } | null {
  if (!schema) return null;
  const field = mergeSchemaWithSaveData(schema, saveData)
    .find((item) => item.fieldKey === fieldKey && !item.isDisabled);
  if (!field) return null;

  switch (field.fieldType) {
    case 0:
    case 1:
      return field.stringValue == null ? null : { value: field.stringValue, display: field.stringValue };
    case 2:
      return field.intValue == null ? null : { value: String(field.intValue), display: String(field.intValue) };
    case 3:
      return field.decimalValue == null ? null : { value: String(field.decimalValue), display: String(field.decimalValue) };
    case 4:
      return field.boolValue == null ? null : { value: String(field.boolValue), display: field.boolValue ? 'はい' : 'いいえ' };
    case 5:
      return field.dateValue == null ? null : { value: field.dateValue, display: field.dateValue };
    case 6: {
      const key = field.selectedOptionKey;
      if (key == null) return null;
      const label = schema.fields.find((definition) => definition.fieldKey === fieldKey)
        ?.options.find((option) => option.optionKey === key)?.label ?? key;
      return { value: key, display: label };
    }
  }
}

function getSearchValue(
  saveData: SaveDataDto,
  schemaMap: Record<number, SaveDataSchemaDto>,
  storyProgressSchemas: Record<number, StoryProgressSchemaDto>,
  field: SaveDataSearchFieldOption,
  lookups: ManagementLookups,
): { value: string; display: string } | null {
  if (field.fieldKey) {
    return getCustomFieldValue(saveData, schemaMap[saveData.gameSoftwareMasterId], field.fieldKey);
  }

  let value: number | null | undefined;
  switch (field.fieldId) {
    case 'master:game-software':
      value = saveData.gameSoftwareMasterId;
      break;
    case 'master:console-category':
      value = lookups.gameSoftwareMasters.find((item) => item.id === saveData.gameSoftwareMasterId)?.gameConsoleCategoryId;
      break;
    case 'master:game-console':
      value = saveData.gameConsoleId == null
        ? null
        : lookups.gameConsoles.find((item) => item.id === saveData.gameConsoleId)?.gameConsoleMasterId;
      break;
    case 'master:console-edition':
      value = saveData.gameConsoleId == null
        ? null
        : lookups.gameConsoles.find((item) => item.id === saveData.gameConsoleId)?.gameConsoleEditionMasterId;
      break;
    case 'master:account-type':
      value = saveData.accountId == null
        ? null
        : lookups.accounts.find((item) => item.id === saveData.accountId)?.accountTypeMasterId;
      break;
    case 'master:memory-card-type':
      value = saveData.memoryCardId == null
        ? null
        : lookups.memoryCards.find((item) => item.id === saveData.memoryCardId)?.memoryCardEditionMasterId;
      break;
    case 'master:software-content-group':
      value = lookups.gameSoftwareMasters.find((item) => item.id === saveData.gameSoftwareMasterId)?.contentGroupId;
      break;
    case 'master:storage-type':
      value = saveData.saveStorageType;
      break;
    case 'master:software-variant':
      value = saveData.gameSoftwareId == null
        ? null
        : lookups.gameSoftwares.find((item) => item.id === saveData.gameSoftwareId)?.variant;
      break;
    case 'master:story-progress':
      value = saveData.storyProgressDefinitionId;
      break;
    default:
      return null;
  }

  if (value == null) return null;
  const stringValue = String(value);
  const storyProgressLabel = field.fieldId === 'master:story-progress'
    ? storyProgressSchemas[saveData.gameSoftwareMasterId]?.choices.find(
      (choice) => choice.storyProgressDefinitionId === value,
    )?.label
    : undefined;
  return {
    value: stringValue,
    display: storyProgressLabel ?? field.options.find((option) => option.value === stringValue)?.label ?? stringValue,
  };
}

function compareValue(actual: string, expected: string, operator: SaveDataSearchOperator, fieldType: SaveDataSearchFieldOption['fieldType']): boolean {
  if (!actual.trim() || !expected.trim()) {
    switch (operator) {
      case 'equals': return !actual.trim() && !expected.trim();
      case 'not-equals': return Boolean(actual.trim()) !== Boolean(expected.trim());
      case 'contains': return !expected.trim() || normalizeText(actual).includes(normalizeText(expected));
      case 'not-contains': return Boolean(expected.trim()) && !normalizeText(actual).includes(normalizeText(expected));
      default: return false;
    }
  }

  if (operator === 'contains' || operator === 'not-contains') {
    const contains = normalizeText(actual).includes(normalizeText(expected));
    return operator === 'contains' ? contains : !contains;
  }

  const numeric = fieldType === 2 || fieldType === 3;
  const left = numeric ? Number(actual) : normalizeText(actual);
  const right = numeric ? Number(expected) : normalizeText(expected);
  if ((typeof left === 'number' && (!Number.isFinite(left) || !Number.isFinite(right as number)))) return false;
  switch (operator) {
    case 'equals': return left === right;
    case 'not-equals': return left !== right;
    case 'greater-than': return left > right;
    case 'less-than': return left < right;
    case 'greater-or-equal': return left >= right;
    case 'less-or-equal': return left <= right;
    default: return false;
  }
}

export function evaluateSaveDataSearch(
  lookups: ManagementLookups,
  schemaMap: Record<number, SaveDataSchemaDto>,
  criteria: SaveDataSearchCriteria[],
  fields: SaveDataSearchFieldOption[],
  storyProgressSchemas: Record<number, StoryProgressSchemaDto> = {},
): SaveDataSearchMatch[] {
  if (criteria.length === 0) return [];

  const matches = lookups.saveDatas.flatMap((saveData) => {
    const matchedValues: string[] = [];
    for (const criterion of criteria) {
      const field = fields.find((item) => item.fieldId === criterion.fieldId);
      if (!field) return [];
      const actual = getSearchValue(saveData, schemaMap, storyProgressSchemas, field, lookups) ?? { value: '', display: '' };
      if (!compareValue(actual.value, criterion.value.trim(), criterion.operator, field.fieldType)) return [];
      matchedValues.push(actual.display);
    }
    return [{ saveData, matchedValues }];
  });

  return matches.sort((left, right) => (
    left.saveData.displayOrder - right.saveData.displayOrder
    || left.saveData.id - right.saveData.id
  ));
}

export function getSaveDataSearchOperators(field: SaveDataSearchFieldOption): Array<{ value: SaveDataSearchOperator; label: string }> {
  if (field.fieldType === 0 || field.fieldType === 1) {
    return [
      { value: 'contains', label: '部分一致' },
      { value: 'equals', label: '一致' },
      { value: 'not-contains', label: '部分一致しない' },
      { value: 'not-equals', label: '一致しない' },
    ];
  }
  if (field.fieldType === 2 || field.fieldType === 3 || field.fieldType === 5) {
    return [
      { value: 'equals', label: '一致' },
      { value: 'not-equals', label: '一致しない' },
      { value: 'greater-than', label: 'より大きい' },
      { value: 'greater-or-equal', label: '以上' },
      { value: 'less-than', label: 'より小さい' },
      { value: 'less-or-equal', label: '以下' },
    ];
  }
  return [
    { value: 'equals', label: '一致' },
    { value: 'not-equals', label: '一致しない' },
  ];
}
