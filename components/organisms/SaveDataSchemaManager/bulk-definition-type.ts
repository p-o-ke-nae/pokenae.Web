import {
  SAVE_DATA_FIELD_TYPE_NAMES,
} from '../../../lib/game-management/save-data-fields';
import type {
  BatchSaveDataFieldDefinitionTypeItem,
  SaveDataFieldDefinitionAssignmentDto,
  SaveDataFieldDefinitionDto,
  SaveDataFieldType,
  UpdateSaveDataFieldDefinitionRequest,
} from '../../../lib/game-management/types';

type DefinitionTypeUpdateTarget = SaveDataFieldDefinitionDto | SaveDataFieldDefinitionAssignmentDto;

function getDefinitionId(definition: DefinitionTypeUpdateTarget): number {
  return 'id' in definition ? definition.id : definition.fieldDefinitionId;
}

export function createDefinitionUpdateRequest(
  definition: DefinitionTypeUpdateTarget,
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
    sharedChoiceSetId,
  };
}

export function buildBulkDefinitionTypeUpdateItems(
  definitions: DefinitionTypeUpdateTarget[],
  nextFieldType: SaveDataFieldType,
  nextSharedChoiceSetId: number | null,
): BatchSaveDataFieldDefinitionTypeItem[] {
  return definitions
    .filter((definition) => !definition.isDeleted)
    .map((definition) => ({
      id: getDefinitionId(definition),
      updatePayload: createDefinitionUpdateRequest(definition, {
        fieldType: nextFieldType,
        sharedChoiceSetId: nextSharedChoiceSetId,
      }),
      rollbackPayload: createDefinitionUpdateRequest(definition),
    }));
}