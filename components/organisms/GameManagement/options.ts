import { SAVE_STORAGE_TYPE_LABELS } from '@/lib/game-management/save-storage-type';
import type {
  ManagementLookups,
  SaveStorageType,
  SelectOption,
} from '@/lib/game-management/types';
import {
  getAccountDisplay,
  getGameConsoleCategoryName,
  getGameConsoleDisplay,
  getMemoryCardDisplay,
  getGameSoftwareDisplay,
} from './helpers';
import type { LookupSelectOptions } from './view-types';

export const SAVE_STORAGE_TYPE_OPTIONS: SelectOption[] = [0, 1, 2, 3].map((value) => ({
  value: String(value),
  label: SAVE_STORAGE_TYPE_LABELS[value as SaveStorageType],
}));

export function optionize(items: SelectOption[], includeEmpty = true): SelectOption[] {
  if (!includeEmpty) {
    return items;
  }
  return [{ value: '', label: '未選択' }, ...items];
}

export function selectOptionsFromLookups(lookups: ManagementLookups): LookupSelectOptions {
  return {
    accountTypeMasters: lookups.accountTypeMasters.map((item) => ({ value: String(item.id), label: item.name })),
    gameConsoleCategories: lookups.gameConsoleCategories.map((item) => ({ value: String(item.id), label: item.name })),
    gameConsoleMasters: lookups.gameConsoleMasters.map((item) => ({ value: String(item.id), label: item.name })),
    gameConsoleEditionMasters: lookups.gameConsoleEditionMasters.map((item) => ({ value: String(item.id), label: item.name })),
    gameSoftwareContentGroups: lookups.gameSoftwareContentGroups.map((item) => ({ value: String(item.id), label: item.name })),
    gameSoftwareMasters: lookups.gameSoftwareMasters.map((item) => ({ value: String(item.id), label: `${item.name} / ${getGameConsoleCategoryName(item.gameConsoleCategoryId, lookups)}` })),
    gameSoftwares: lookups.gameSoftwares.map((item) => ({ value: String(item.id), label: getGameSoftwareDisplay(item, lookups) })),
    gameConsoles: lookups.gameConsoles.map((item) => ({ value: String(item.id), label: getGameConsoleDisplay(item, lookups) })),
    accounts: lookups.accounts.map((item) => ({ value: String(item.id), label: getAccountDisplay(item, lookups) })),
    memoryCardEditionMasters: lookups.memoryCardEditionMasters.map((item) => ({ value: String(item.id), label: `${item.name}（${item.blockCount}ブロック）` })),
    memoryCards: lookups.memoryCards.map((item) => ({ value: String(item.id), label: getMemoryCardDisplay(item, lookups) })),
    saveDatas: lookups.saveDatas.map((item) => ({ value: String(item.id), label: `SaveData #${item.id}` })),
  };
}
