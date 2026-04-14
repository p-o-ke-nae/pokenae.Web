import type {
  ResolvedSaveDataFieldSchemaDto,
  SaveDataDto,
  SaveDataFieldInputDto,
  SaveDataFieldType,
  SaveDataFieldValueDto,
  SaveDataSchemaDto,
} from '@/lib/game-management/types';

export type DynamicFieldValueMap = Record<string, string>;

export const SAVE_DATA_FIELD_TYPE_NAMES: Record<SaveDataFieldType, string> = {
  0: 'Text',
  1: 'MultilineText',
  2: 'Integer',
  3: 'Decimal',
  4: 'Boolean',
  5: 'Date',
  6: 'SingleSelect',
};

export const SAVE_DATA_FIELD_TYPE_LABELS: Record<SaveDataFieldType, string> = {
  0: '1行テキスト',
  1: '複数行テキスト',
  2: '整数',
  3: '小数',
  4: '真偽値',
  5: '日付',
  6: '単一選択',
};

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function getGameSoftwareMasterIdFromGameSoftware(
  gameSoftwareId: number | null,
  gameSoftwares: Array<{ id: number; gameSoftwareMasterId: number }>,
): number | null {
  if (!gameSoftwareId) {
    return null;
  }

  return gameSoftwares.find((item) => item.id === gameSoftwareId)?.gameSoftwareMasterId ?? null;
}

export function createDynamicFieldValueMapFromSaveData(saveData: SaveDataDto | null | undefined): DynamicFieldValueMap {
  if (!saveData) {
    return {};
  }

  return createDynamicFieldValueMap(saveData.extendedFields);
}

export function createDynamicFieldValueMap(fields: SaveDataFieldValueDto[]): DynamicFieldValueMap {
  return Object.fromEntries(fields.map((field) => [field.fieldKey, getFieldDisplayValue(field)]));
}

export function getFieldDisplayValue(field: Pick<SaveDataFieldValueDto, 'fieldType' | 'stringValue' | 'intValue' | 'decimalValue' | 'boolValue' | 'dateValue' | 'selectedOptionKey'>): string {
  switch (field.fieldType) {
    case 0:
    case 1:
      return field.stringValue ?? '';
    case 2:
      return field.intValue == null ? '' : String(field.intValue);
    case 3:
      return field.decimalValue == null ? '' : String(field.decimalValue);
    case 4:
      return String(field.boolValue ?? false);
    case 5:
      return field.dateValue ?? '';
    case 6:
      return field.selectedOptionKey ?? '';
    default:
      return '';
  }
}

export function createTrialExtendedFields(
  schema: SaveDataSchemaDto | null,
  inputs: SaveDataFieldInputDto[] | null,
): SaveDataFieldValueDto[] {
  if (!schema || !inputs || inputs.length === 0) {
    return [];
  }

  const inputMap = new Map(inputs.map((item) => [item.fieldKey, item]));

  return schema.fields
    .filter((field) => !field.isDisabled)
    .map((field) => {
      const input = inputMap.get(field.fieldKey);
      if (!input) {
        return null;
      }

      return {
        fieldKey: field.fieldKey,
        label: field.label,
        fieldType: field.fieldType,
        isRequired: field.isRequired,
        displayOrder: field.displayOrder,
        stringValue: input.stringValue,
        intValue: input.intValue,
        decimalValue: input.decimalValue,
        boolValue: input.boolValue,
        dateValue: input.dateValue,
        selectedOptionKey: input.optionKey,
      } satisfies SaveDataFieldValueDto;
    })
    .filter((field): field is SaveDataFieldValueDto => Boolean(field));
}

export function buildExtendedFieldInputs(
  schema: SaveDataSchemaDto | null,
  values: DynamicFieldValueMap,
): SaveDataFieldInputDto[] | null {
  if (!schema) {
    return null;
  }

  const inputs = schema.fields
    .filter((field) => !field.isDisabled)
    .map((field) => buildFieldInput(field, values[field.fieldKey] ?? ''))
    .filter((field): field is SaveDataFieldInputDto => Boolean(field));

  return inputs.length > 0 ? inputs : null;
}

function buildFieldInput(field: ResolvedSaveDataFieldSchemaDto, rawValue: string): SaveDataFieldInputDto | null {
  switch (field.fieldType) {
    case 0:
    case 1:
      if (isBlank(rawValue)) {
        return null;
      }
      return {
        fieldKey: field.fieldKey,
        stringValue: rawValue,
        intValue: null,
        decimalValue: null,
        boolValue: null,
        dateValue: null,
        optionKey: null,
      };
    case 2:
      if (isBlank(rawValue)) {
        return null;
      }
      return {
        fieldKey: field.fieldKey,
        stringValue: null,
        intValue: Number.parseInt(rawValue, 10),
        decimalValue: null,
        boolValue: null,
        dateValue: null,
        optionKey: null,
      };
    case 3:
      if (isBlank(rawValue)) {
        return null;
      }
      return {
        fieldKey: field.fieldKey,
        stringValue: null,
        intValue: null,
        decimalValue: Number(rawValue),
        boolValue: null,
        dateValue: null,
        optionKey: null,
      };
    case 4:
      if (rawValue !== 'true' && rawValue !== 'false') {
        return null;
      }
      return {
        fieldKey: field.fieldKey,
        stringValue: null,
        intValue: null,
        decimalValue: null,
        boolValue: rawValue === 'true',
        dateValue: null,
        optionKey: null,
      };
    case 5:
      if (isBlank(rawValue)) {
        return null;
      }
      return {
        fieldKey: field.fieldKey,
        stringValue: null,
        intValue: null,
        decimalValue: null,
        boolValue: null,
        dateValue: rawValue,
        optionKey: null,
      };
    case 6:
      if (isBlank(rawValue)) {
        return null;
      }
      return {
        fieldKey: field.fieldKey,
        stringValue: null,
        intValue: null,
        decimalValue: null,
        boolValue: null,
        dateValue: null,
        optionKey: rawValue,
      };
    default:
      return null;
  }
}

export function validateDynamicFieldInputs(
  schema: SaveDataSchemaDto | null,
  values: DynamicFieldValueMap,
): string[] {
  if (!schema) {
    return [];
  }

  return schema.fields
    .filter((field) => !field.isDisabled)
    .flatMap((field) => validateDynamicField(field, values[field.fieldKey] ?? ''));
}

function validateDynamicField(field: ResolvedSaveDataFieldSchemaDto, rawValue: string): string[] {
  const label = field.label;

  if (field.isRequired && isBlank(rawValue)) {
    return [`${label} は必須です。`];
  }

  if (isBlank(rawValue)) {
    return [];
  }

  switch (field.fieldType) {
    case 2:
      return /^-?\d+$/.test(rawValue) ? [] : [`${label} には整数を入力してください。`];
    case 3:
      return Number.isFinite(Number(rawValue)) ? [] : [`${label} には数値を入力してください。`];
    case 4:
      return rawValue === 'true' || rawValue === 'false' ? [] : [`${label} の値が不正です。`];
    case 6:
      return field.options.some((option) => option.optionKey === rawValue)
        ? []
        : [`${label} の選択肢が不正です。`];
    default:
      return [];
  }
}

type MergedSaveDataField = ResolvedSaveDataFieldSchemaDto & {
  stringValue: string | null;
  intValue: number | null;
  decimalValue: number | null;
  boolValue: boolean | null;
  dateValue: string | null;
  selectedOptionKey: string | null;
};

export function mergeSchemaWithSaveData(
  schema: SaveDataSchemaDto | null,
  saveData: SaveDataDto | null | undefined,
): MergedSaveDataField[] {
  if (!schema) {
    return [];
  }

  const valueMap = new Map((saveData?.extendedFields ?? []).map((field) => [field.fieldKey, field]));

  return schema.fields
    .map((field) => {
      const currentValue = valueMap.get(field.fieldKey);
      return {
        ...field,
        stringValue: currentValue?.stringValue ?? null,
        intValue: currentValue?.intValue ?? null,
        decimalValue: currentValue?.decimalValue ?? null,
        boolValue: currentValue?.boolValue ?? null,
        dateValue: currentValue?.dateValue ?? null,
        selectedOptionKey: currentValue?.selectedOptionKey ?? null,
      };
    })
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

export function formatMergedFieldValue(field: MergedSaveDataField): string {
  switch (field.fieldType) {
    case 0:
    case 1:
      return field.stringValue ?? '未入力';
    case 2:
      return field.intValue == null ? '未入力' : String(field.intValue);
    case 3:
      return field.decimalValue == null ? '未入力' : String(field.decimalValue);
    case 4:
      if (field.boolValue == null) {
        return '未入力';
      }
      return field.boolValue ? 'はい' : 'いいえ';
    case 5:
      return field.dateValue ?? '未入力';
    case 6: {
      if (!field.selectedOptionKey) {
        return '未入力';
      }
      const option = field.options.find((item) => item.optionKey === field.selectedOptionKey);
      return option?.label ?? field.selectedOptionKey;
    }
    default:
      return '未入力';
  }
}

export function formatSaveDataFieldValueForList(field: SaveDataFieldValueDto): string {
  switch (field.fieldType) {
    case 0:
    case 1:
      return field.stringValue ?? '未入力';
    case 2:
      return field.intValue == null ? '未入力' : String(field.intValue);
    case 3:
      return field.decimalValue == null ? '未入力' : String(field.decimalValue);
    case 4:
      if (field.boolValue == null) {
        return '未入力';
      }
      return field.boolValue ? 'はい' : 'いいえ';
    case 5:
      return field.dateValue ?? '未入力';
    case 6:
      return field.selectedOptionKey ?? '未入力';
    default:
      return '未入力';
  }
}

export function convertValueFieldsToInputs(fields: SaveDataFieldValueDto[]): SaveDataFieldInputDto[] | null {
  const inputs = fields.reduce<SaveDataFieldInputDto[]>((result, field) => {
    let input: SaveDataFieldInputDto | null = null;

    switch (field.fieldType) {
      case 0:
      case 1:
        input = field.stringValue == null
          ? null
          : {
              fieldKey: field.fieldKey,
              stringValue: field.stringValue,
              intValue: null,
              decimalValue: null,
              boolValue: null,
              dateValue: null,
              optionKey: null,
            };
        break;
      case 2:
        input = field.intValue == null
          ? null
          : {
              fieldKey: field.fieldKey,
              stringValue: null,
              intValue: field.intValue,
              decimalValue: null,
              boolValue: null,
              dateValue: null,
              optionKey: null,
            };
        break;
      case 3:
        input = field.decimalValue == null
          ? null
          : {
              fieldKey: field.fieldKey,
              stringValue: null,
              intValue: null,
              decimalValue: field.decimalValue,
              boolValue: null,
              dateValue: null,
              optionKey: null,
            };
        break;
      case 4:
        input = field.boolValue == null
          ? null
          : {
              fieldKey: field.fieldKey,
              stringValue: null,
              intValue: null,
              decimalValue: null,
              boolValue: field.boolValue,
              dateValue: null,
              optionKey: null,
            };
        break;
      case 5:
        input = field.dateValue == null
          ? null
          : {
              fieldKey: field.fieldKey,
              stringValue: null,
              intValue: null,
              decimalValue: null,
              boolValue: null,
              dateValue: field.dateValue,
              optionKey: null,
            };
        break;
      case 6:
        input = field.selectedOptionKey == null
          ? null
          : {
              fieldKey: field.fieldKey,
              stringValue: null,
              intValue: null,
              decimalValue: null,
              boolValue: null,
              dateValue: null,
              optionKey: field.selectedOptionKey,
            };
        break;
      default:
        input = null;
        break;
    }

    if (input) {
      result.push(input);
    }

    return result;
  }, []);

  return inputs.length > 0 ? inputs : null;
}
