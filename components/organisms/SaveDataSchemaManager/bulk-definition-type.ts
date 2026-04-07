import {
  SAVE_DATA_FIELD_TYPE_NAMES,
} from '../../../lib/game-management/save-data-fields';
import type {
  BatchSaveDataFieldDefinitionTypeItem,
  SaveDataFieldDefinitionDto,
  SaveDataFieldType,
  UpdateSaveDataFieldDefinitionRequest,
} from '../../../lib/game-management/types';

export function createDefinitionUpdateRequest(
  definition: SaveDataFieldDefinitionDto,
  overrides?: Partial<{ fieldType: SaveDataFieldType; sharedChoiceSetId: number | null }>,
): UpdateSaveDataFieldDefinitionRequest {
  const fieldType = overrides?.fieldType ?? definition.fieldType;
  const hasSharedChoiceSetOverride = overrides != null
    && Object.prototype.hasOwnProperty.call(overrides, 'sharedChoiceSetId');
  const sharedChoiceSetId = fieldType === 6
    ? (hasSharedChoiceSetOverride ? overrides.sharedChoiceSetId ?? null : definition.sharedChoiceSetId ?? null)
    : null;

  return {
    fieldKey: definition.fieldKey,
    label: definition.label,
    description: definition.description,
    fieldType: SAVE_DATA_FIELD_TYPE_NAMES[fieldType],
    displayOrder: definition.displayOrder,
    isRequired: definition.isRequired,
    sharedChoiceSetId,
  };
}

export function buildBulkDefinitionTypeUpdateItems(
  definitions: SaveDataFieldDefinitionDto[],
  nextFieldType: SaveDataFieldType,
  nextSharedChoiceSetId: number | null,
): BatchSaveDataFieldDefinitionTypeItem[] {
  return definitions
    .filter((definition) => !definition.isDeleted)
    .map((definition) => ({
      id: definition.id,
      updatePayload: createDefinitionUpdateRequest(definition, {
        fieldType: nextFieldType,
        sharedChoiceSetId: nextSharedChoiceSetId,
      }),
      rollbackPayload: createDefinitionUpdateRequest(definition),
    }));
}