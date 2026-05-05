import { createResource, updateResource, deleteResource } from '@/lib/game-management/api';
import {
  trialCreateAccount,
  trialCreateGameConsole,
  trialCreateGameSoftware,
  trialCreateMemoryCard,
  trialCreateSaveData,
  trialDeleteAccount,
  trialDeleteGameConsole,
  trialDeleteGameSoftware,
  trialDeleteMemoryCard,
  trialDeleteSaveData,
  trialUpdateAccount,
  trialUpdateGameConsole,
  trialUpdateGameSoftware,
  trialUpdateMemoryCard,
  trialUpdateSaveData,
} from '@/lib/game-management/trial';
import type {
  GameSoftwareVariant,
  ManagementLookups,
  MemoryCardBlockCount,
  ResourceKey,
  SaveDataSchemaDto,
  SaveStorageType,
} from '@/lib/game-management/types';
import { nullIfBlank, numberOrNull, numberOrZero, parsePositiveInteger, getSaveStorageTypeForGameSoftwareMaster } from './helpers';
import { buildSaveDataPayload } from './payloads';
import type { FormState } from './view-types';

// ---------------------------------------------------------------------------
// dispatchSave – 新規作成 or 更新を統一的に実行し、新規の場合は生成 ID を返す
// ---------------------------------------------------------------------------

export async function dispatchSave(
  resourceKey: ResourceKey,
  formState: FormState,
  lookups: ManagementLookups,
  isTrial: boolean,
  isNew: boolean,
  recordId: string | undefined,
  saveDataSchema: SaveDataSchemaDto | null,
): Promise<number | null> {
  const displayOrder = isNew ? parsePositiveInteger(formState.displayOrder) : null;

  if (isTrial) {
    return dispatchSaveTrial(resourceKey, formState, lookups, isNew, recordId, displayOrder, saveDataSchema);
  }
  return dispatchSaveApi(resourceKey, formState, lookups, isNew, recordId, displayOrder, saveDataSchema);
}

// ---------------------------------------------------------------------------
// Trial (localStorage) CRUD
// ---------------------------------------------------------------------------

function dispatchSaveTrial(
  resourceKey: ResourceKey,
  formState: FormState,
  lookups: ManagementLookups,
  isNew: boolean,
  recordId: string | undefined,
  displayOrder: number | null,
  saveDataSchema: SaveDataSchemaDto | null,
): number | null {
  switch (resourceKey) {
    case 'accounts': {
      if (isNew) {
        return trialCreateAccount({
          accountTypeMasterId: numberOrZero(formState.accountTypeMasterId),
          ...(displayOrder != null ? { displayOrder } : {}),
          label: nullIfBlank(formState.label),
          memo: nullIfBlank(formState.memo),
          linkedGameConsoleIds: formState.linkedGameConsoleIds.length > 0 ? formState.linkedGameConsoleIds.map(Number) : null,
        });
      }
      trialUpdateAccount(Number(recordId), {
        label: nullIfBlank(formState.label),
        memo: nullIfBlank(formState.memo),
        linkedGameConsoleIds: formState.linkedGameConsoleIds.length > 0 ? formState.linkedGameConsoleIds.map(Number) : null,
      });
      return null;
    }
    case 'game-consoles': {
      if (isNew) {
        return trialCreateGameConsole({
          gameConsoleMasterId: numberOrZero(formState.gameConsoleMasterId),
          gameConsoleEditionMasterId: numberOrNull(formState.gameConsoleEditionMasterId),
          ...(displayOrder != null ? { displayOrder } : {}),
          label: nullIfBlank(formState.label),
          memo: nullIfBlank(formState.memo),
        });
      }
      trialUpdateGameConsole(Number(recordId), {
        gameConsoleEditionMasterId: numberOrNull(formState.gameConsoleEditionMasterId),
        label: nullIfBlank(formState.label),
        memo: nullIfBlank(formState.memo),
      });
      return null;
    }
    case 'game-softwares': {
      const variantValue: GameSoftwareVariant | null = formState.variant ? (Number(formState.variant) as GameSoftwareVariant) : null;
      const trialAccountId = variantValue === 1 ? numberOrNull(formState.accountId) : null;
      const trialInstalledConsoleId = variantValue === 1 ? numberOrNull(formState.installedGameConsoleId) : null;
      if (isNew) {
        return trialCreateGameSoftware({
          gameSoftwareMasterId: numberOrZero(formState.gameSoftwareMasterId),
          variant: variantValue,
          accountId: trialAccountId,
          installedGameConsoleId: trialInstalledConsoleId,
          ...(displayOrder != null ? { displayOrder } : {}),
          label: nullIfBlank(formState.label),
          memo: nullIfBlank(formState.memo),
        });
      }
      trialUpdateGameSoftware(Number(recordId), {
        variant: variantValue,
        accountId: trialAccountId,
        installedGameConsoleId: trialInstalledConsoleId,
        label: nullIfBlank(formState.label),
        memo: nullIfBlank(formState.memo),
      });
      return null;
    }
    case 'memory-cards': {
      const memoryCardEditionMasterId = numberOrZero(formState.memoryCardEditionMasterId);
      if (isNew) {
        return trialCreateMemoryCard({
          memoryCardEditionMasterId,
          ...(displayOrder != null ? { displayOrder } : {}),
          label: nullIfBlank(formState.label),
          memo: nullIfBlank(formState.memo),
        });
      }
      trialUpdateMemoryCard(Number(recordId), {
        memoryCardEditionMasterId,
        label: nullIfBlank(formState.label),
        memo: nullIfBlank(formState.memo),
      });
      return null;
    }
    case 'save-datas': {
      const savePayloadBase = buildSaveDataPayload(formState, lookups, saveDataSchema, isNew ? displayOrder : null);
      const derivedType = getSaveStorageTypeForGameSoftwareMaster(savePayloadBase.gameSoftwareMasterId, lookups);
      if (isNew) {
        return trialCreateSaveData(savePayloadBase, derivedType ?? 0, saveDataSchema);
      }
      trialUpdateSaveData(Number(recordId), {
        ...savePayloadBase,
        replacedBySaveDataId: numberOrNull(formState.replacedBySaveDataId),
      }, derivedType ?? 0, saveDataSchema);
      return null;
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// API CRUD
// ---------------------------------------------------------------------------

async function dispatchSaveApi(
  resourceKey: ResourceKey,
  formState: FormState,
  lookups: ManagementLookups,
  isNew: boolean,
  recordId: string | undefined,
  displayOrder: number | null,
  saveDataSchema: SaveDataSchemaDto | null,
): Promise<number | null> {
  const id = Number(recordId);

  switch (resourceKey) {
    case 'account-type-masters': {
      const payload = {
        name: formState.name.trim(),
        abbreviation: formState.abbreviation.trim(),
        gameConsoleCategoryIds: formState.gameConsoleCategoryIds.length > 0 ? formState.gameConsoleCategoryIds.map(Number) : null,
        ...(displayOrder != null ? { displayOrder } : {}),
      };
      if (isNew) return await createResource('account-type-masters', payload);
      await updateResource('account-type-masters', id, payload);
      return null;
    }
    case 'accounts': {
      if (isNew) {
        return await createResource('accounts', {
          accountTypeMasterId: numberOrZero(formState.accountTypeMasterId),
          ...(displayOrder != null ? { displayOrder } : {}),
          label: nullIfBlank(formState.label),
          memo: nullIfBlank(formState.memo),
          linkedGameConsoleIds: formState.linkedGameConsoleIds.length > 0 ? formState.linkedGameConsoleIds.map(Number) : null,
        });
      }
      await updateResource('accounts', id, {
        label: nullIfBlank(formState.label),
        memo: nullIfBlank(formState.memo),
        linkedGameConsoleIds: formState.linkedGameConsoleIds.length > 0 ? formState.linkedGameConsoleIds.map(Number) : null,
      });
      return null;
    }
    case 'game-console-categories': {
      const payload = {
        name: formState.name.trim(),
        abbreviation: formState.abbreviation.trim(),
        manufacturer: nullIfBlank(formState.manufacturer),
        saveStorageType: numberOrZero(formState.saveStorageType) as SaveStorageType,
        ...(displayOrder != null ? { displayOrder } : {}),
      };
      if (isNew) return await createResource('game-console-categories', payload);
      await updateResource('game-console-categories', id, payload);
      return null;
    }
    case 'game-console-masters': {
      const payload = {
        gameConsoleCategoryId: numberOrZero(formState.gameConsoleCategoryId),
        name: formState.name.trim(),
        abbreviation: formState.abbreviation.trim(),
        ...(displayOrder != null ? { displayOrder } : {}),
      };
      if (isNew) return await createResource('game-console-masters', payload);
      await updateResource('game-console-masters', id, payload);
      return null;
    }
    case 'game-console-edition-masters': {
      const payload = {
        gameConsoleMasterId: numberOrZero(formState.gameConsoleMasterId),
        name: formState.name.trim(),
        abbreviation: formState.abbreviation.trim(),
        ...(displayOrder != null ? { displayOrder } : {}),
      };
      if (isNew) return await createResource('game-console-edition-masters', payload);
      await updateResource('game-console-edition-masters', id, payload);
      return null;
    }
    case 'game-consoles': {
      if (isNew) {
        return await createResource('game-consoles', {
          gameConsoleMasterId: numberOrZero(formState.gameConsoleMasterId),
          gameConsoleEditionMasterId: numberOrNull(formState.gameConsoleEditionMasterId),
          ...(displayOrder != null ? { displayOrder } : {}),
          label: nullIfBlank(formState.label),
          memo: nullIfBlank(formState.memo),
        });
      }
      await updateResource('game-consoles', id, {
        gameConsoleEditionMasterId: numberOrNull(formState.gameConsoleEditionMasterId),
        label: nullIfBlank(formState.label),
        memo: nullIfBlank(formState.memo),
      });
      return null;
    }
    case 'game-software-content-groups': {
      const payload = {
        name: formState.name.trim(),
        ...(displayOrder != null ? { displayOrder } : {}),
      };
      if (isNew) return await createResource('game-software-content-groups', payload);
      await updateResource('game-software-content-groups', id, payload);
      return null;
    }
    case 'game-software-masters': {
      const payload = {
        name: formState.name.trim(),
        abbreviation: formState.abbreviation.trim(),
        gameConsoleCategoryId: numberOrZero(formState.gameConsoleCategoryId),
        contentGroupId: numberOrNull(formState.contentGroupId),
        ...(displayOrder != null ? { displayOrder } : {}),
      };
      if (isNew) return await createResource('game-software-masters', payload);
      await updateResource('game-software-masters', id, payload);
      return null;
    }
    case 'game-softwares': {
      const variantValue: GameSoftwareVariant | null = formState.variant ? (Number(formState.variant) as GameSoftwareVariant) : null;
      const apiAccountId = variantValue === 1 ? numberOrNull(formState.accountId) : null;
      const apiInstalledConsoleId = variantValue === 1 ? numberOrNull(formState.installedGameConsoleId) : null;
      if (isNew) {
        return await createResource('game-softwares', {
          gameSoftwareMasterId: numberOrZero(formState.gameSoftwareMasterId),
          variant: variantValue,
          accountId: apiAccountId,
          installedGameConsoleId: apiInstalledConsoleId,
          ...(displayOrder != null ? { displayOrder } : {}),
          label: nullIfBlank(formState.label),
          memo: nullIfBlank(formState.memo),
        });
      }
      await updateResource('game-softwares', id, {
        variant: variantValue,
        accountId: apiAccountId,
        installedGameConsoleId: apiInstalledConsoleId,
        label: nullIfBlank(formState.label),
        memo: nullIfBlank(formState.memo),
      });
      return null;
    }
    case 'memory-cards': {
      const memoryCardEditionMasterId = numberOrZero(formState.memoryCardEditionMasterId);
      if (isNew) {
        return await createResource('memory-cards', {
          memoryCardEditionMasterId,
          ...(displayOrder != null ? { displayOrder } : {}),
          label: nullIfBlank(formState.label),
          memo: nullIfBlank(formState.memo),
        });
      }
      await updateResource('memory-cards', id, {
        memoryCardEditionMasterId,
        label: nullIfBlank(formState.label),
        memo: nullIfBlank(formState.memo),
      });
      return null;
    }
    case 'memory-card-edition-masters': {
      const payload = {
        name: formState.name.trim(),
        blockCount: Number(formState.blockCount) as MemoryCardBlockCount,
        ...(displayOrder != null ? { displayOrder } : {}),
      };
      if (isNew) return await createResource('memory-card-edition-masters', payload);
      await updateResource('memory-card-edition-masters', id, payload);
      return null;
    }
    case 'save-datas': {
      const savePayloadBase = buildSaveDataPayload(formState, lookups, saveDataSchema, isNew ? displayOrder : null);
      if (isNew) return await createResource('save-datas', savePayloadBase);
      await updateResource('save-datas', id, {
        ...savePayloadBase,
        replacedBySaveDataId: numberOrNull(formState.replacedBySaveDataId),
      });
      return null;
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// dispatchDelete – 削除を統一的に実行
// ---------------------------------------------------------------------------

export async function dispatchDelete(
  resourceKey: ResourceKey,
  recordId: string,
  formState: FormState,
  isTrial: boolean,
): Promise<void> {
  if (isTrial) {
    dispatchDeleteTrial(resourceKey, recordId, formState);
    return;
  }
  await dispatchDeleteApi(resourceKey, recordId, formState);
}

function dispatchDeleteTrial(
  resourceKey: ResourceKey,
  recordId: string,
  formState: FormState,
): void {
  switch (resourceKey) {
    case 'accounts':
      trialDeleteAccount(Number(recordId));
      break;
    case 'game-consoles':
      trialDeleteGameConsole(Number(recordId));
      break;
    case 'game-softwares':
      trialDeleteGameSoftware(Number(recordId));
      break;
    case 'memory-cards':
      trialDeleteMemoryCard(Number(recordId));
      break;
    case 'save-datas':
      trialDeleteSaveData(Number(recordId), {
        deleteReason: nullIfBlank(formState.deleteReason),
        replacedBySaveDataId: numberOrNull(formState.replacedBySaveDataId),
      });
      break;
  }
}

async function dispatchDeleteApi(
  resourceKey: ResourceKey,
  recordId: string,
  formState: FormState,
): Promise<void> {
  const id = Number(recordId);
  if (resourceKey === 'save-datas') {
    await deleteResource('save-datas', id, {
      deleteReason: nullIfBlank(formState.deleteReason),
      replacedBySaveDataId: numberOrNull(formState.replacedBySaveDataId),
    });
  } else {
    await deleteResource(resourceKey, id);
  }
}
