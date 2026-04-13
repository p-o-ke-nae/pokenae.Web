import type {
  AccountTypeMasterDto,
  GameConsoleCategoryCompatibilityDto,
  GameConsoleCategoryDto,
  GameConsoleEditionMasterDto,
  GameConsoleMasterDto,
  GameSoftwareContentGroupDto,
  GameSoftwareMasterDto,
  MasterLookups,
  MemoryCardEditionMasterDto,
  SaveDataSchemaDto,
  StoryProgressSchemaDto,
} from '@/lib/game-management/types';
import { ApiError, getErrorMessage } from './core';

// ---------------------------------------------------------------------------
// Public API helpers (no auth required)
// ---------------------------------------------------------------------------

async function fetchPublicList<T>(publicPath: string): Promise<T[]> {
  const response = await fetch(`/api/public/${publicPath}`);
  const data = await response.json();
  if (!data.success) {
    const statusCode = data.error?.code?.startsWith?.('HTTP_')
      ? parseInt(data.error.code.replace('HTTP_', ''), 10)
      : response.status;
    throw new ApiError(
      statusCode,
      getErrorMessage(data.error?.details, data.error?.message ?? 'Failed to fetch public master data'),
      data.error?.details,
      data.error?.code,
    );
  }
  return data.data as T[];
}

async function fetchPublicData<T>(publicPath: string): Promise<T> {
  const response = await fetch(`/api/public/${publicPath}`);
  const data = await response.json();
  if (!data.success) {
    const statusCode = data.error?.code?.startsWith?.('HTTP_')
      ? parseInt(data.error.code.replace('HTTP_', ''), 10)
      : response.status;
    throw new ApiError(
      statusCode,
      getErrorMessage(data.error?.details, data.error?.message ?? 'Failed to fetch public data'),
      data.error?.details,
      data.error?.code,
    );
  }
  return data.data as T;
}

// ---------------------------------------------------------------------------
// Public master lookups
// ---------------------------------------------------------------------------

export async function fetchPublicMasterLookups(): Promise<MasterLookups> {
  const [
    accountTypeMasters,
    gameConsoleCategories,
    gameConsoleCategoryCompatibilities,
    gameConsoleMasters,
    gameConsoleEditionMasters,
    gameSoftwareContentGroups,
    gameSoftwareMasters,
    memoryCardEditionMasters,
  ] = await Promise.all([
    fetchPublicList<AccountTypeMasterDto>('account-type-masters'),
    fetchPublicList<GameConsoleCategoryDto>('game-console-categories'),
    fetchPublicList<GameConsoleCategoryCompatibilityDto>('game-console-category-compatibilities'),
    fetchPublicList<GameConsoleMasterDto>('game-console-masters'),
    fetchPublicList<GameConsoleEditionMasterDto>('game-console-edition-masters'),
    fetchPublicList<GameSoftwareContentGroupDto>('game-software-content-groups'),
    fetchPublicList<GameSoftwareMasterDto>('game-software-masters'),
    fetchPublicList<MemoryCardEditionMasterDto>('memory-card-edition-masters'),
  ]);
  return {
    accountTypeMasters,
    gameConsoleCategories,
    gameConsoleCategoryCompatibilities,
    gameConsoleMasters,
    gameConsoleEditionMasters,
    gameSoftwareContentGroups,
    gameSoftwareMasters,
    memoryCardEditionMasters,
  };
}

// ---------------------------------------------------------------------------
// Public schema endpoints
// ---------------------------------------------------------------------------

export async function fetchPublicSaveDataSchema(gameSoftwareMasterId: number): Promise<SaveDataSchemaDto> {
  return fetchPublicData<SaveDataSchemaDto>(`game-software-masters/${gameSoftwareMasterId}/save-data-schema`);
}

export async function fetchPublicStoryProgressSchema(gameSoftwareMasterId: number): Promise<StoryProgressSchemaDto> {
  return fetchPublicData<StoryProgressSchemaDto>(`game-software-masters/${gameSoftwareMasterId}/story-progress-schema`);
}
