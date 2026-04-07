import { buildExtendedFieldInputs } from '@/lib/game-management/save-data-fields';
import type {
  CreateSaveDataRequest,
  ManagementLookups,
  SaveDataSchemaDto,
} from '@/lib/game-management/types';
import {
  getSaveStorageTypeForGameSoftwareMaster,
  nullIfBlank,
  numberOrNull,
  numberOrZero,
} from './helpers';
import type { FormState } from './view-types';

export function buildSaveDataPayload(
  formState: FormState,
  lookups: ManagementLookups,
  saveDataSchema: SaveDataSchemaDto | null,
  displayOrder: number | null = null,
): CreateSaveDataRequest {
  const payload: CreateSaveDataRequest = {
    gameSoftwareMasterId: numberOrZero(formState.gameSoftwareMasterId),
    gameSoftwareId: null,
    gameConsoleId: null,
    accountId: null,
    memoryCardId: null,
    storyProgressDefinitionId: numberOrNull(formState.storyProgressDefinitionId),
    memo: nullIfBlank(formState.memo),
    ...(displayOrder != null ? { displayOrder } : {}),
    extendedFields: buildExtendedFieldInputs(saveDataSchema, formState.dynamicFieldValues),
  };
  const saveStorageType = getSaveStorageTypeForGameSoftwareMaster(payload.gameSoftwareMasterId, lookups);

  if (saveStorageType === 0) {
    payload.gameSoftwareId = numberOrNull(formState.gameSoftwareId);
  }

  if (saveStorageType === 1 || saveStorageType === 2) {
    const gameConsoleId = numberOrNull(formState.gameConsoleId);
    if (gameConsoleId) {
      payload.gameConsoleId = gameConsoleId;
    }
  }

  if (saveStorageType === 2) {
    const accountId = numberOrNull(formState.accountId);
    if (accountId) {
      payload.accountId = accountId;
    }
  }

  if (saveStorageType === 3) {
    const memoryCardId = numberOrNull(formState.memoryCardId);
    if (memoryCardId) {
      payload.memoryCardId = memoryCardId;
    }
  }

  return payload;
}
