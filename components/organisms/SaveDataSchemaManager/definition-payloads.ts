import {
  SAVE_DATA_FIELD_TYPE_NAMES,
} from '../../../lib/game-management/save-data-fields';
import type {
  CreateSaveDataFieldDefinitionRequest,
  SaveDataFieldType,
  UpdateSaveDataFieldDefinitionRequest,
} from '../../../lib/game-management/types';

export type DefinitionPayloadInput = {
  fieldKey: string;
  label: string;
  description: string;
  fieldType: string;
  sharedChoiceSetId: string;
};

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseDefinitionSharedChoiceSetId(sharedChoiceSetId: string): number | null {
  const trimmed = sharedChoiceSetId.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d+$/.test(trimmed)) {
    throw new Error('共有選択肢セットが不正です。');
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('共有選択肢セットが不正です。');
  }

  return parsed;
}

function resolveSharedChoiceSetId(fieldType: SaveDataFieldType, sharedChoiceSetId: string): number | null {
  if (fieldType !== 6) {
    return null;
  }

  return parseDefinitionSharedChoiceSetId(sharedChoiceSetId);
}

export function parseDefinitionFieldType(value: string): SaveDataFieldType {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || !Object.prototype.hasOwnProperty.call(SAVE_DATA_FIELD_TYPE_NAMES, parsed)) {
    throw new Error('型が不正です。');
  }

  return parsed as SaveDataFieldType;
}

export function createDefinitionCreateRequest(
  input: DefinitionPayloadInput,
): CreateSaveDataFieldDefinitionRequest {
  const fieldType = parseDefinitionFieldType(input.fieldType);
  const sharedChoiceSetId = resolveSharedChoiceSetId(fieldType, input.sharedChoiceSetId);

  return {
    fieldKey: input.fieldKey.trim(),
    label: input.label.trim(),
    description: nullIfBlank(input.description),
    fieldType: SAVE_DATA_FIELD_TYPE_NAMES[fieldType],
    sharedChoiceSetId,
  };
}

export function createDefinitionUpdateRequestFromForm(
  input: DefinitionPayloadInput,
): UpdateSaveDataFieldDefinitionRequest {
  const fieldType = parseDefinitionFieldType(input.fieldType);
  return {
    fieldKey: input.fieldKey.trim(),
    label: input.label.trim(),
    description: nullIfBlank(input.description),
    fieldType: SAVE_DATA_FIELD_TYPE_NAMES[fieldType],
    sharedChoiceSetId: resolveSharedChoiceSetId(fieldType, input.sharedChoiceSetId),
  };
}