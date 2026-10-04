import { formatMergedFieldValue, mergeSchemaWithSaveData } from './save-data-fields';
import type {
  ManagementLookups,
  SaveDataDto,
  SaveDataSchemaDto,
} from './types';

export type SaveDataSearchCriteria = {
  gameSoftwareMasterId: number | null;
  fieldKey: string;
  value: string;
};

export type SaveDataSearchFieldOption = {
  fieldKey: string;
  label: string;
  availableIn: number;
};

export type SaveDataSearchMatch = {
  saveData: SaveDataDto;
  matchedFieldValue: string;
};

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('ja');
}

function fieldValueMatches(
  saveData: SaveDataDto,
  schema: SaveDataSchemaDto | undefined,
  fieldKey: string,
  expectedValue: string,
): boolean {
  if (!schema || !expectedValue.trim()) {
    return false;
  }

  const field = mergeSchemaWithSaveData(schema, saveData)
    .find((item) => item.fieldKey === fieldKey && !item.isDisabled);
  if (!field) {
    return false;
  }

  const expected = expectedValue.trim();
  switch (field.fieldType) {
    case 0:
    case 1:
      return normalizeText(field.stringValue ?? '').includes(normalizeText(expected));
    case 2:
      return field.intValue != null && Number(expected) === field.intValue;
    case 3:
      return field.decimalValue != null && Number(expected) === field.decimalValue;
    case 4:
      return String(field.boolValue ?? false) === (expected === 'はい' ? 'true' : expected === 'いいえ' ? 'false' : expected);
    case 6: {
      const selectedKey = field.selectedOptionKey ?? '';
      const selectedLabel = schema.fields
        .find((definition) => definition.fieldKey === fieldKey)
        ?.options.find((option) => option.optionKey === selectedKey)?.label;
      return selectedKey === expected || (selectedLabel != null && normalizeText(selectedLabel) === normalizeText(expected));
    }
    default:
      return (field.dateValue ?? '') === expected;
  }
}

export function getSaveDataSearchFields(
  schemaMap: Record<number, SaveDataSchemaDto>,
): SaveDataSearchFieldOption[] {
  const fields = new Map<string, SaveDataSearchFieldOption>();
  Object.values(schemaMap).forEach((schema) => {
    const seenInSchema = new Set<string>();
    schema.fields.filter((field) => !field.isDisabled).forEach((field) => {
      if (seenInSchema.has(field.fieldKey)) {
        return;
      }
      seenInSchema.add(field.fieldKey);
      const existing = fields.get(field.fieldKey);
      if (existing) {
        existing.availableIn += 1;
      } else {
        fields.set(field.fieldKey, {
          fieldKey: field.fieldKey,
          label: field.label,
          availableIn: 1,
        });
      }
    });
  });

  return Array.from(fields.values()).sort((left, right) => (
    left.label.localeCompare(right.label, 'ja') || left.fieldKey.localeCompare(right.fieldKey)
  ));
}

export function evaluateSaveDataSearch(
  lookups: ManagementLookups,
  schemaMap: Record<number, SaveDataSchemaDto>,
  criteria: SaveDataSearchCriteria,
): SaveDataSearchMatch[] {
  if (!criteria.fieldKey || !criteria.value.trim()) {
    return [];
  }

  return lookups.saveDatas
    .filter((saveData) => (
      (criteria.gameSoftwareMasterId == null || saveData.gameSoftwareMasterId === criteria.gameSoftwareMasterId)
      && fieldValueMatches(
        saveData,
        schemaMap[saveData.gameSoftwareMasterId],
        criteria.fieldKey,
        criteria.value,
      )
    ))
    .map((saveData) => {
      const field = mergeSchemaWithSaveData(schemaMap[saveData.gameSoftwareMasterId], saveData)
        .find((item) => item.fieldKey === criteria.fieldKey && !item.isDisabled);
      return {
        saveData,
        matchedFieldValue: field ? formatMergedFieldValue(field) : '',
      };
    })
    .sort((left, right) => (
      left.saveData.displayOrder - right.saveData.displayOrder
      || left.saveData.id - right.saveData.id
    ));
}
