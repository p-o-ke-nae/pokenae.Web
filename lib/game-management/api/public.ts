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
import resources from '@/lib/resources';
import { ApiError, getErrorMessage } from './core';

// ---------------------------------------------------------------------------
// Public API helpers (no auth required)
// ---------------------------------------------------------------------------

async function parsePublicResponse(
  response: Response,
  resourceLabel: string,
  fallbackMessage: string,
): Promise<{ success: boolean; data?: unknown; error?: { code?: string; message?: string; details?: unknown } }> {
  const contentType = response.headers.get('content-type');
  if (!contentType?.toLowerCase().includes('application/json')) {
    throw new ApiError(
      null,
      resources.apiError.generic.invalidResponse,
      { statusCode: response.status, contentType },
      'INVALID_RESPONSE',
      resourceLabel,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      null,
      resources.apiError.generic.invalidResponse,
      { statusCode: response.status, contentType },
      'INVALID_RESPONSE',
      resourceLabel,
    );
  }

  if (!data || typeof data !== 'object' || !('success' in data)) {
    throw new ApiError(
      null,
      fallbackMessage,
      { statusCode: response.status, contentType },
      'INVALID_RESPONSE',
      resourceLabel,
    );
  }

  return data as {
    success: boolean;
    data?: unknown;
    error?: { code?: string; message?: string; details?: unknown };
  };
}

async function fetchPublicList<T>(publicPath: string, resourceLabel: string): Promise<T[]> {
  try {
    const response = await fetch(`/api/public/${publicPath}`);
    const data = await parsePublicResponse(response, resourceLabel, 'Failed to fetch public master data');
    if (!data.success) {
      const statusCode = data.error?.code?.startsWith?.('HTTP_')
        ? parseInt(data.error.code.replace('HTTP_', ''), 10)
        : response.status;
      throw new ApiError(
        statusCode,
        getErrorMessage(data.error?.details, data.error?.message ?? 'Failed to fetch public master data'),
        data.error?.details,
        data.error?.code,
        resourceLabel,
      );
    }
    return data.data as T[];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      null,
      'Failed to fetch public master data',
      error,
      'FETCH_ERROR',
      resourceLabel,
    );
  }
}

async function fetchPublicData<T>(publicPath: string, resourceLabel: string): Promise<T> {
  try {
    const response = await fetch(`/api/public/${publicPath}`);
    const data = await parsePublicResponse(response, resourceLabel, 'Failed to fetch public data');
    if (!data.success) {
      const statusCode = data.error?.code?.startsWith?.('HTTP_')
        ? parseInt(data.error.code.replace('HTTP_', ''), 10)
        : response.status;
      throw new ApiError(
        statusCode,
        getErrorMessage(data.error?.details, data.error?.message ?? 'Failed to fetch public data'),
        data.error?.details,
        data.error?.code,
        resourceLabel,
      );
    }
    return data.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      null,
      'Failed to fetch public data',
      error,
      'FETCH_ERROR',
      resourceLabel,
    );
  }
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
    fetchPublicList<AccountTypeMasterDto>('account-type-masters', 'アカウント種類'),
    fetchPublicList<GameConsoleCategoryDto>('game-console-categories', 'ゲーム機分類'),
    fetchPublicList<GameConsoleCategoryCompatibilityDto>('game-console-category-compatibilities', 'ゲーム機分類の互換情報'),
    fetchPublicList<GameConsoleMasterDto>('game-console-masters', 'ゲーム機マスタ'),
    fetchPublicList<GameConsoleEditionMasterDto>('game-console-edition-masters', 'ゲーム機エディション'),
    fetchPublicList<GameSoftwareContentGroupDto>('game-software-content-groups', 'ゲームソフト分類'),
    fetchPublicList<GameSoftwareMasterDto>('game-software-masters', 'ゲームソフトマスタ'),
    fetchPublicList<MemoryCardEditionMasterDto>('memory-card-edition-masters', 'メモリーカードエディション'),
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
  return fetchPublicData<SaveDataSchemaDto>(
    `game-software-masters/${gameSoftwareMasterId}/save-data-schema`,
    'セーブデータ項目設定',
  );
}

export async function fetchPublicStoryProgressSchema(gameSoftwareMasterId: number): Promise<StoryProgressSchemaDto> {
  return fetchPublicData<StoryProgressSchemaDto>(
    `game-software-masters/${gameSoftwareMasterId}/story-progress-schema`,
    'ストーリー進行設定',
  );
}
