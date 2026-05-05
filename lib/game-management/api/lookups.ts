import type {
  AccountDto,
  AccountTypeMasterDto,
  GameConsoleCategoryDto,
  GameConsoleCategoryCompatibilityDto,
  GameConsoleEditionMasterDto,
  GameConsoleMasterDto,
  GameConsoleDto,
  GameSoftwareContentGroupDto,
  GameSoftwareMasterDto,
  GameSoftwareDto,
  MaintenanceHealthFilter,
  ManagementLookups,
  MasterLookups,
  MemoryCardEditionMasterDto,
  MemoryCardDto,
  SaveDataDto,
} from '@/lib/game-management/types';
import { client, fetchResourceList, unwrap } from './core';
import { fetchPublicMasterLookups } from './public';

type UserLookupOptions = {
  maintenanceHealthFilter?: MaintenanceHealthFilter;
};

// ---------------------------------------------------------------------------
// Admin master lookups
// ---------------------------------------------------------------------------

export async function fetchMasterLookups(): Promise<MasterLookups> {
  const [accountTypeMasters, gameConsoleCategories, gameConsoleMasters, gameConsoleEditionMasters, gameSoftwareContentGroups, gameSoftwareMasters, memoryCardEditionMasters] = await Promise.all([
    fetchResourceList<AccountTypeMasterDto>('account-type-masters'),
    fetchResourceList<GameConsoleCategoryDto>('game-console-categories'),
    fetchResourceList<GameConsoleMasterDto>('game-console-masters'),
    fetchResourceList<GameConsoleEditionMasterDto>('game-console-edition-masters'),
    fetchResourceList<GameSoftwareContentGroupDto>('game-software-content-groups'),
    fetchResourceList<GameSoftwareMasterDto>('game-software-masters'),
    fetchResourceList<MemoryCardEditionMasterDto>('memory-card-edition-masters'),
  ]);

  // Fetch compatibility data for all categories
  const compatibilityResults = await Promise.all(
    gameConsoleCategories.map((cat) =>
      unwrap(client.get<GameConsoleCategoryCompatibilityDto[]>(`/api/GameConsoleCategoryCompatibilities/${cat.id}`))
        .catch(() => [] as GameConsoleCategoryCompatibilityDto[]),
    ),
  );
  const gameConsoleCategoryCompatibilities = compatibilityResults.flat();

  return { accountTypeMasters, gameConsoleCategories, gameConsoleCategoryCompatibilities, gameConsoleMasters, gameConsoleEditionMasters, gameSoftwareContentGroups, gameSoftwareMasters, memoryCardEditionMasters };
}

export async function fetchUserLookups(options: UserLookupOptions = {}): Promise<ManagementLookups> {
  const maintenanceHealthFilter = options.maintenanceHealthFilter ?? 'All';
  const [
    masterLookups,
    accounts,
    gameConsoles,
    gameSoftwares,
    memoryCards,
    saveDatas,
  ] = await Promise.all([
    fetchPublicMasterLookups(),
    fetchResourceList<AccountDto>('accounts'),
    fetchResourceList<GameConsoleDto>('game-consoles', { query: { maintenanceHealthFilter } }),
    fetchResourceList<GameSoftwareDto>('game-softwares', { query: { maintenanceHealthFilter } }),
    fetchResourceList<MemoryCardDto>('memory-cards', { query: { maintenanceHealthFilter } }),
    fetchResourceList<SaveDataDto>('save-datas'),
  ]);
  return {
    ...masterLookups,
    accounts,
    gameConsoles,
    gameSoftwares,
    memoryCards,
    saveDatas,
  };
}

// ---------------------------------------------------------------------------
// Authenticated user lookups (public masters + user data)
// ---------------------------------------------------------------------------

export async function fetchAuthenticatedUserLookups(options: UserLookupOptions = {}): Promise<ManagementLookups> {
  const maintenanceHealthFilter = options.maintenanceHealthFilter ?? 'All';
  const [
    masterLookups,
    accounts,
    gameConsoles,
    gameSoftwares,
    memoryCards,
    saveDatas,
  ] = await Promise.all([
    fetchPublicMasterLookups(),
    fetchResourceList<AccountDto>('accounts'),
    fetchResourceList<GameConsoleDto>('game-consoles', { query: { maintenanceHealthFilter } }),
    fetchResourceList<GameSoftwareDto>('game-softwares', { query: { maintenanceHealthFilter } }),
    fetchResourceList<MemoryCardDto>('memory-cards', { query: { maintenanceHealthFilter } }),
    fetchResourceList<SaveDataDto>('save-datas'),
  ]);
  return {
    ...masterLookups,
    accounts,
    gameConsoles,
    gameSoftwares,
    memoryCards,
    saveDatas,
  };
}
