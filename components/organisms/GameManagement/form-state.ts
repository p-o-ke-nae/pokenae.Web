import { createDynamicFieldValueMapFromSaveData } from '../../../lib/game-management/save-data-fields';
import type {
  AccountDto,
  AccountTypeMasterDto,
  GameConsoleCategoryDto,
  GameConsoleDto,
  GameConsoleEditionMasterDto,
  GameConsoleMasterDto,
  GameSoftwareContentGroupDto,
  GameSoftwareDto,
  GameSoftwareMasterDto,
  MemoryCardDto,
  MemoryCardEditionMasterDto,
  ResourceKey,
  SaveDataDto,
} from '../../../lib/game-management/types';
import type { FormState } from './view-types';

export function createEmptyFormState(): FormState {
  return {
    displayOrder: '',
    name: '',
    abbreviation: '',
    manufacturer: '',
    saveStorageType: '0',
    label: '',
    memo: '',
    gameConsoleCategoryId: '',
    gameConsoleCategoryIds: [],
    accountTypeMasterId: '',
    linkedGameConsoleIds: [],
    gameConsoleMasterId: '',
    gameConsoleEditionMasterId: '',
    contentGroupId: '',
    gameSoftwareMasterId: '',
    variant: '',
    memoryCardEditionMasterId: '',
    blockCount: '',
    gameSoftwareId: '',
    gameConsoleId: '',
    accountId: '',
    installedGameConsoleId: '',
    memoryCardId: '',
    storyProgressDefinitionId: '',
    replacedBySaveDataId: '',
    deleteReason: '',
    dynamicFieldValues: {},
  };
}

export function createSeededFormState(initialValues?: Partial<FormState>): FormState {
  if (!initialValues) {
    return createEmptyFormState();
  }

  const base = createEmptyFormState();
  return {
    ...base,
    ...initialValues,
    gameConsoleCategoryIds: initialValues.gameConsoleCategoryIds ?? base.gameConsoleCategoryIds,
    linkedGameConsoleIds: initialValues.linkedGameConsoleIds ?? base.linkedGameConsoleIds,
    dynamicFieldValues: initialValues.dynamicFieldValues ?? base.dynamicFieldValues,
  };
}

export function createContinueFormState(
  resourceKey: ResourceKey,
  currentFormState: FormState,
  initialValues?: Partial<FormState>,
): FormState {
  if (resourceKey !== 'game-softwares') {
    return createSeededFormState(initialValues);
  }

  return {
    ...createEmptyFormState(),
    gameSoftwareMasterId: currentFormState.gameSoftwareMasterId,
    variant: currentFormState.variant,
  };
}

export function buildInitialFormState(resourceKey: ResourceKey, record: unknown): FormState {
  const base = createSeededFormState();

  switch (resourceKey) {
    case 'account-type-masters': {
      const item = record as AccountTypeMasterDto;
      return {
        ...base,
        displayOrder: String(item.displayOrder),
        name: item.name,
        abbreviation: item.abbreviation,
        gameConsoleCategoryIds: item.gameConsoleCategoryIds.map(String),
      };
    }
    case 'accounts': {
      const item = record as AccountDto;
      return {
        ...base,
        displayOrder: String(item.displayOrder),
        accountTypeMasterId: String(item.accountTypeMasterId),
        label: item.label ?? '',
        memo: item.memo ?? '',
        linkedGameConsoleIds: item.linkedGameConsoleIds.map(String),
      };
    }
    case 'game-console-categories': {
      const item = record as GameConsoleCategoryDto;
      return {
        ...base,
        displayOrder: String(item.displayOrder),
        name: item.name,
        abbreviation: item.abbreviation,
        manufacturer: item.manufacturer ?? '',
        saveStorageType: String(item.saveStorageType),
      };
    }
    case 'game-console-masters': {
      const item = record as GameConsoleMasterDto;
      return {
        ...base,
        displayOrder: String(item.displayOrder),
        name: item.name,
        abbreviation: item.abbreviation,
        gameConsoleCategoryId: String(item.gameConsoleCategoryId),
      };
    }
    case 'game-console-edition-masters': {
      const item = record as GameConsoleEditionMasterDto;
      return {
        ...base,
        displayOrder: String(item.displayOrder),
        name: item.name,
        abbreviation: item.abbreviation,
        gameConsoleMasterId: String(item.gameConsoleMasterId),
      };
    }
    case 'game-consoles': {
      const item = record as GameConsoleDto;
      return {
        ...base,
        displayOrder: String(item.displayOrder),
        label: item.label ?? '',
        memo: item.memo ?? '',
        gameConsoleMasterId: String(item.gameConsoleMasterId),
        gameConsoleEditionMasterId: item.gameConsoleEditionMasterId ? String(item.gameConsoleEditionMasterId) : '',
      };
    }
    case 'game-software-content-groups': {
      const item = record as GameSoftwareContentGroupDto;
      return {
        ...base,
        displayOrder: String(item.displayOrder),
        name: item.name,
      };
    }
    case 'game-software-masters': {
      const item = record as GameSoftwareMasterDto;
      return {
        ...base,
        displayOrder: String(item.displayOrder),
        name: item.name,
        abbreviation: item.abbreviation,
        gameConsoleCategoryId: String(item.gameConsoleCategoryId),
        contentGroupId: item.contentGroupId ? String(item.contentGroupId) : '',
      };
    }
    case 'game-softwares': {
      const item = record as GameSoftwareDto;
      return {
        ...base,
        displayOrder: String(item.displayOrder),
        label: item.label ?? '',
        memo: item.memo ?? '',
        gameSoftwareMasterId: String(item.gameSoftwareMasterId),
        variant: item.variant != null ? String(item.variant) : '',
        accountId: item.accountId != null ? String(item.accountId) : '',
        installedGameConsoleId: item.installedGameConsoleId != null ? String(item.installedGameConsoleId) : '',
      };
    }
    case 'memory-cards': {
      const item = record as MemoryCardDto;
      return {
        ...base,
        displayOrder: String(item.displayOrder),
        memoryCardEditionMasterId: String(item.memoryCardEditionMasterId),
        label: item.label ?? '',
        memo: item.memo ?? '',
      };
    }
    case 'memory-card-edition-masters': {
      const item = record as MemoryCardEditionMasterDto;
      return {
        ...base,
        displayOrder: String(item.displayOrder),
        name: item.name,
        blockCount: String(item.blockCount),
      };
    }
    case 'save-datas': {
      const item = record as SaveDataDto;
      return {
        ...base,
        displayOrder: String(item.displayOrder),
        memo: item.memo ?? '',
        gameSoftwareMasterId: item.gameSoftwareMasterId ? String(item.gameSoftwareMasterId) : '',
        gameSoftwareId: item.saveStorageType === 0 && item.gameSoftwareId ? String(item.gameSoftwareId) : '',
        gameConsoleId: item.gameConsoleId ? String(item.gameConsoleId) : '',
        accountId: item.accountId ? String(item.accountId) : '',
        memoryCardId: item.memoryCardId ? String(item.memoryCardId) : '',
        storyProgressDefinitionId: item.storyProgressDefinitionId ? String(item.storyProgressDefinitionId) : '',
        replacedBySaveDataId: item.replacedBySaveDataId ? String(item.replacedBySaveDataId) : '',
        deleteReason: item.deleteReason ?? '',
        dynamicFieldValues: createDynamicFieldValueMapFromSaveData(item),
      };
    }
    default: {
      const _exhaustive: never = resourceKey;
      throw new Error(`Unknown resource key: ${_exhaustive}`);
    }
  }
}
