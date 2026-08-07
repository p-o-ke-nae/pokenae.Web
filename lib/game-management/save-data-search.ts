import { mergeSchemaWithSaveData } from './save-data-fields';
import type {
  GameSoftwareVariant,
  ManagementLookups,
  SaveDataDto,
  SaveDataFieldType,
  SaveDataSchemaDto,
} from './types';

export const GAME_SOFTWARE_VARIANT_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: '0', label: 'パッケージ版' },
  { value: '1', label: 'ダウンロード版' },
] as const;

export type SaveDataSearchFieldCondition = {
  fieldKey: string;
  value: string;
};

export type SaveDataSearchGroup = {
  gameSoftwareMasterId: number;
  storyProgressDefinitionId?: number | null;
  fieldConditions: SaveDataSearchFieldCondition[];
};

export type SaveDataSearchCriteria = {
  variant?: GameSoftwareVariant | null;
  groups: SaveDataSearchGroup[];
};

export type SaveDataSearchMatch = {
  saveData: SaveDataDto;
  matchedGroupIndexes: number[];
};

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('ja');
}

function parseNumericValue(value: string | null): number | null {
  if (value == null || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesFieldConditionByType(
  fieldType: SaveDataFieldType,
  actualValue: string | null,
  expectedValue: string,
): boolean {
  const normalizedExpected = expectedValue.trim();

  switch (fieldType) {
    case 0:
    case 1:
      return normalizeText(actualValue ?? '').includes(normalizeText(normalizedExpected));
    case 2: {
      const actualNumber = parseNumericValue(actualValue);
      const expectedNumber = parseNumericValue(normalizedExpected);
      return actualNumber != null
        && expectedNumber != null
        && Number.isInteger(actualNumber)
        && Number.isInteger(expectedNumber)
        && actualNumber === expectedNumber;
    }
    case 3: {
      const actualNumber = parseNumericValue(actualValue);
      const expectedNumber = parseNumericValue(normalizedExpected);
      return actualNumber != null && expectedNumber != null && actualNumber === expectedNumber;
    }
    case 4:
      return (actualValue ?? 'false') === normalizedExpected;
    default:
      return (actualValue ?? '') === normalizedExpected;
  }
}

export function getSaveDataVariant(
  saveData: SaveDataDto,
  lookups: Pick<ManagementLookups, 'gameSoftwares'>,
): GameSoftwareVariant | null {
  if (!saveData.gameSoftwareId) {
    return null;
  }

  return lookups.gameSoftwares.find((item) => item.id === saveData.gameSoftwareId)?.variant ?? null;
}

export function matchesSaveDataSearchGroup(
  saveData: SaveDataDto,
  group: SaveDataSearchGroup,
  schema: SaveDataSchemaDto | null | undefined,
): boolean {
  if (saveData.gameSoftwareMasterId !== group.gameSoftwareMasterId) {
    return false;
  }

  if (group.storyProgressDefinitionId != null && saveData.storyProgressDefinitionId !== group.storyProgressDefinitionId) {
    return false;
  }

  if (group.fieldConditions.length === 0) {
    return true;
  }

  if (!schema) {
    return false;
  }

  const mergedFields = mergeSchemaWithSaveData(schema, saveData);

  return group.fieldConditions.every((condition) => {
    const field = mergedFields.find((item) => item.fieldKey === condition.fieldKey && !item.isDisabled);
    if (!field) {
      return false;
    }

    let actualValue: string | null;
    switch (field.fieldType) {
      case 0:
      case 1:
        actualValue = field.stringValue;
        break;
      case 2:
        actualValue = field.intValue == null ? null : String(field.intValue);
        break;
      case 3:
        actualValue = field.decimalValue == null ? null : String(field.decimalValue);
        break;
      case 4:
        actualValue = String(field.boolValue ?? false);
        break;
      case 5:
        actualValue = field.dateValue;
        break;
      case 6:
        actualValue = field.selectedOptionKey;
        break;
      default:
        actualValue = null;
        break;
    }

    return matchesFieldConditionByType(field.fieldType, actualValue, condition.value);
  });
}

export function evaluateSaveDataSearch(
  lookups: ManagementLookups,
  schemaMap: Record<number, SaveDataSchemaDto>,
  criteria: SaveDataSearchCriteria,
): SaveDataSearchMatch[] {
  if (criteria.groups.length === 0) {
    return [];
  }

  return lookups.saveDatas
    .map((saveData) => {
      if (criteria.variant != null && getSaveDataVariant(saveData, lookups) !== criteria.variant) {
        return null;
      }

      const matchedGroupIndexes = criteria.groups.reduce<number[]>((result, group, index) => {
        if (matchesSaveDataSearchGroup(saveData, group, schemaMap[group.gameSoftwareMasterId])) {
          result.push(index);
        }
        return result;
      }, []);

      if (matchedGroupIndexes.length === 0) {
        return null;
      }

      return {
        saveData,
        matchedGroupIndexes,
      } satisfies SaveDataSearchMatch;
    })
    .filter((item): item is SaveDataSearchMatch => item !== null)
    .sort((left, right) => (
      left.saveData.displayOrder - right.saveData.displayOrder
      || left.saveData.id - right.saveData.id
    ));
}
