import { formatSaveStorageType } from '@/lib/game-management/save-storage-type';
import { formatSaveDataFieldValueForList } from '@/lib/game-management/save-data-fields';
import type {
  AccountDto,
  GameConsoleDto,
  GameSoftwareDto,
  ManagementLookups,
  MemoryCardDto,
  SaveDataDto,
  SaveStorageType,
} from '@/lib/game-management/types';

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------

export function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function numberOrNull(value: string): number | null {
  if (!value) {
    return null;
  }
  return Number(value);
}

export function numberOrZero(value: string): number {
  return Number(value);
}

export function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

export function validateDisplayOrder(value: string, options: { required?: boolean } = {}): string {
  const required = options.required ?? true;

  if (!value.trim()) {
    if (!required) {
      return '';
    }

    return '表示順を入力してください。';
  }

  return parsePositiveInteger(value) == null ? '表示順は1以上の整数で入力してください。' : '';
}

export function formatDeletedState(isDeleted: boolean): string {
  return isDeleted ? '削除済み' : '有効';
}

// ---------------------------------------------------------------------------
// Lookup display helpers
// ---------------------------------------------------------------------------

export function getAccountTypeMasterName(id: number | null | undefined, lookups: ManagementLookups): string {
  if (!id) {
    return '未設定';
  }
  return lookups.accountTypeMasters.find((item) => item.id === id)?.name ?? `#${id}`;
}

export function getGameConsoleCategoryName(id: number | null | undefined, lookups: ManagementLookups): string {
  if (!id) {
    return '未設定';
  }
  return lookups.gameConsoleCategories.find((item) => item.id === id)?.name ?? `#${id}`;
}

export function getGameConsoleMasterName(id: number | null | undefined, lookups: ManagementLookups): string {
  if (!id) {
    return '未設定';
  }
  return lookups.gameConsoleMasters.find((item) => item.id === id)?.name ?? `#${id}`;
}

export function getGameSoftwareContentGroupName(id: number | null | undefined, lookups: ManagementLookups): string {
  if (!id) {
    return '未設定';
  }
  return lookups.gameSoftwareContentGroups.find((item) => item.id === id)?.name ?? `#${id}`;
}

export function getGameSoftwareMasterName(id: number | null | undefined, lookups: ManagementLookups): string {
  if (!id) {
    return '未設定';
  }
  return lookups.gameSoftwareMasters.find((item) => item.id === id)?.name ?? `#${id}`;
}

export function getMemoryCardEditionMasterName(id: number | null | undefined, lookups: ManagementLookups): string {
  if (!id) {
    return '未設定';
  }
  const master = lookups.memoryCardEditionMasters.find((item) => item.id === id);
  if (!master) {
    return `#${id}`;
  }
  return `${master.name}（${master.blockCount}ブロック）`;
}

export function getMemoryCardDisplay(item: MemoryCardDto, lookups: ManagementLookups): string {
  const editionName = getMemoryCardEditionMasterName(item.memoryCardEditionMasterId, lookups);
  return item.label ? `${item.label} / ${editionName}` : editionName;
}

export function getGameSoftwareDisplay(item: GameSoftwareDto, lookups: ManagementLookups): string {
  const master = lookups.gameSoftwareMasters.find((m) => m.id === item.gameSoftwareMasterId);
  const abbreviation = master?.abbreviation ?? '';
  return item.label ? `${abbreviation} / ${item.label}` : abbreviation;
}

export function getGameConsoleDisplay(item: GameConsoleDto, lookups: ManagementLookups): string {
  const master = lookups.gameConsoleMasters.find((m) => m.id === item.gameConsoleMasterId);
  const abbreviation = master?.abbreviation ?? '';
  return item.label ? `${abbreviation} / ${item.label}` : abbreviation;
}

export function getAccountDisplay(item: AccountDto, lookups: ManagementLookups): string {
  if (item.label) {
    return item.label;
  }
  const typeName = getAccountTypeMasterName(item.accountTypeMasterId, lookups);
  return typeName !== '未設定' ? typeName : `Account #${item.id}`;
}

// ---------------------------------------------------------------------------
// SaveData-related helpers
// ---------------------------------------------------------------------------

export function getSaveStorageTypeForGameSoftwareMaster(gameSoftwareMasterId: number | null, lookups: ManagementLookups): SaveStorageType | null {
  if (!gameSoftwareMasterId) {
    return null;
  }

  const master = lookups.gameSoftwareMasters.find((item) => item.id === gameSoftwareMasterId);
  if (!master) {
    return null;
  }

  const category = lookups.gameConsoleCategories.find((item) => item.id === master.gameConsoleCategoryId);
  return category?.saveStorageType ?? null;
}

function getGameConsoleCategoryIdForConsole(consoleId: number, lookups: ManagementLookups): number | null {
  const consoleItem = lookups.gameConsoles.find((item) => item.id === consoleId);
  if (!consoleItem) {
    return null;
  }

  const consoleMaster = lookups.gameConsoleMasters.find((item) => item.id === consoleItem.gameConsoleMasterId);
  return consoleMaster?.gameConsoleCategoryId ?? null;
}

function getHostCompatibleCategoryIds(supportedCategoryIds: Iterable<number>, lookups: ManagementLookups): Set<number> {
  const allowedCategoryIds = new Set<number>(supportedCategoryIds);
  const compatibilities = lookups.gameConsoleCategoryCompatibilities ?? [];

  for (const compat of compatibilities) {
    if (allowedCategoryIds.has(compat.supportedGameConsoleCategoryId)) {
      allowedCategoryIds.add(compat.hostGameConsoleCategoryId);
    }
  }

  return allowedCategoryIds;
}

export function getSupportedConsoleCategoryIdsForGameSoftwareMaster(
  gameSoftwareMasterId: number | null,
  lookups: ManagementLookups,
): Set<number> {
  if (!gameSoftwareMasterId) {
    return new Set<number>();
  }

  const master = lookups.gameSoftwareMasters.find((item) => item.id === gameSoftwareMasterId);
  if (!master) {
    return new Set<number>();
  }

  return getHostCompatibleCategoryIds([master.gameConsoleCategoryId], lookups);
}

export function getAllowedConsoleCategoryIdsForAccountType(
  accountTypeMasterId: number | null,
  lookups: ManagementLookups,
): Set<number> {
  if (!accountTypeMasterId) {
    return new Set<number>();
  }

  const accountType = lookups.accountTypeMasters.find((item) => item.id === accountTypeMasterId);
  if (!accountType) {
    return new Set<number>();
  }

  return getHostCompatibleCategoryIds(accountType.gameConsoleCategoryIds, lookups);
}

export function getConsoleCandidates(gameSoftwareMasterId: number | null, lookups: ManagementLookups): GameConsoleDto[] {
  if (!gameSoftwareMasterId) {
    return [];
  }
  const allowedCategoryIds = getSupportedConsoleCategoryIdsForGameSoftwareMaster(gameSoftwareMasterId, lookups);
  if (allowedCategoryIds.size === 0) {
    return [];
  }

  const masterIdsInCategories = new Set(
    lookups.gameConsoleMasters.filter((cm) => allowedCategoryIds.has(cm.gameConsoleCategoryId)).map((cm) => cm.id),
  );
  return lookups.gameConsoles.filter((item) => masterIdsInCategories.has(item.gameConsoleMasterId));
}

export function getAccountCandidates(gameSoftwareMasterId: number | null, lookups: ManagementLookups): AccountDto[] {
  if (!gameSoftwareMasterId) {
    return [];
  }
  const master = lookups.gameSoftwareMasters.find((item) => item.id === gameSoftwareMasterId);
  if (!master) {
    return [];
  }
  // Include accounts whose type allows the master's category or any compatible host category
  const compatibilities = lookups.gameConsoleCategoryCompatibilities ?? [];
  return lookups.accounts.filter((item) => {
    const accountType = lookups.accountTypeMasters.find((at) => at.id === item.accountTypeMasterId);
    if (!accountType) return false;

    if (accountType.gameConsoleCategoryIds.includes(master.gameConsoleCategoryId)) {
      return true;
    }

    return compatibilities.some((compat) => (
      compat.supportedGameConsoleCategoryId === master.gameConsoleCategoryId
      && accountType.gameConsoleCategoryIds.includes(compat.hostGameConsoleCategoryId)
    ));
  });
}

export function isConsoleCompatibleWithGameSoftwareMaster(
  gameSoftwareMasterId: number | null,
  gameConsoleId: number | null,
  lookups: ManagementLookups,
): boolean {
  if (!gameSoftwareMasterId || !gameConsoleId) {
    return false;
  }

  const consoleCategoryId = getGameConsoleCategoryIdForConsole(gameConsoleId, lookups);
  if (consoleCategoryId == null) {
    return false;
  }

  return getSupportedConsoleCategoryIdsForGameSoftwareMaster(gameSoftwareMasterId, lookups).has(consoleCategoryId);
}

export function getAccountMoveTargetConsoles(
  account: AccountDto,
  sourceGameConsoleId: number | null,
  lookups: ManagementLookups,
): GameConsoleDto[] {
  if (!sourceGameConsoleId) {
    return [];
  }

  const sourceCategoryId = getGameConsoleCategoryIdForConsole(sourceGameConsoleId, lookups);
  if (sourceCategoryId == null) {
    return [];
  }

  const accountType = lookups.accountTypeMasters.find((item) => item.id === account.accountTypeMasterId);
  if (!accountType) {
    return [];
  }

  const acceptableTargetCategoryIds = getHostCompatibleCategoryIds([sourceCategoryId], lookups);
  return lookups.gameConsoles.filter((consoleItem) => {
    if (consoleItem.id === sourceGameConsoleId) {
      return false;
    }

    const consoleCategoryId = getGameConsoleCategoryIdForConsole(consoleItem.id, lookups);
    if (consoleCategoryId == null) {
      return false;
    }

    return acceptableTargetCategoryIds.has(consoleCategoryId)
      && accountType.gameConsoleCategoryIds.includes(consoleCategoryId);
  });
}

export function getSaveDataGameSoftwareMasterId(
  saveData: Pick<SaveDataDto, 'gameSoftwareMasterId' | 'gameSoftwareId'>,
  lookups: ManagementLookups,
): number | null {
  if (saveData.gameSoftwareMasterId) {
    return saveData.gameSoftwareMasterId;
  }

  if (!saveData.gameSoftwareId) {
    return null;
  }

  return lookups.gameSoftwares.find((item) => item.id === saveData.gameSoftwareId)?.gameSoftwareMasterId ?? null;
}

export function getSaveDataGameSoftwareDisplay(
  saveData: Pick<SaveDataDto, 'gameSoftwareMasterId' | 'gameSoftwareId' | 'saveStorageType'>,
  lookups: ManagementLookups,
): string {
  const software = saveData.saveStorageType === 0 && saveData.gameSoftwareId
    ? lookups.gameSoftwares.find((candidate) => candidate.id === saveData.gameSoftwareId)
    : null;

  if (software) {
    const masterName = getGameSoftwareMasterName(software.gameSoftwareMasterId, lookups);
    return software.label ? `${masterName} / ${software.label}` : masterName;
  }

  return getGameSoftwareMasterName(getSaveDataGameSoftwareMasterId(saveData, lookups), lookups);
}

export function getStoryProgressLabel(
  gameSoftwareMasterId: number | null | undefined,
  storyProgressDefinitionId: number | null | undefined,
  labelMap: Record<string, string>,
): string | null {
  if (!gameSoftwareMasterId || !storyProgressDefinitionId) {
    return null;
  }

  return labelMap[`${gameSoftwareMasterId}:${storyProgressDefinitionId}`] ?? `#${storyProgressDefinitionId}`;
}

// ---------------------------------------------------------------------------
// SaveData list row note builder
// ---------------------------------------------------------------------------

export function buildSaveDataNote(
  item: SaveDataDto,
  lookups: ManagementLookups,
  storyProgressLabels: Record<string, string>,
): string {
  return [
    `方式: ${formatSaveStorageType(item.saveStorageType)}`,
    item.storyProgressDefinitionId
      ? `進行度: ${getStoryProgressLabel(getSaveDataGameSoftwareMasterId(item, lookups), item.storyProgressDefinitionId, storyProgressLabels)}`
      : '',
    item.gameConsoleId
      ? `本体: ${(() => {
          const consoleItem = lookups.gameConsoles.find((candidate) => candidate.id === item.gameConsoleId);
          return consoleItem ? getGameConsoleDisplay(consoleItem, lookups) : `#${item.gameConsoleId}`;
        })()}`
      : '',
    item.accountId
      ? `アカウント: ${(() => {
          const account = lookups.accounts.find((candidate) => candidate.id === item.accountId);
          return account ? getAccountDisplay(account, lookups) : `#${item.accountId}`;
        })()}`
      : '',
    item.memoryCardId ? `メモリーカード: #${item.memoryCardId}` : '',
    item.extendedFields.length > 0
      ? `項目: ${item.extendedFields
          .slice(0, 3)
          .map((field) => `${field.label}=${formatSaveDataFieldValueForList(field)}`)
          .join(' / ')}`
      : '',
  ].filter(Boolean).join(' / ');
}
