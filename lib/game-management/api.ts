import { createFrontendApiClient } from '@/lib/api/frontend-client';
import type {
  AccountDto,
  CreateAccountRequest,
  CreateGameConsoleCategoryRequest,
  CreateGameConsoleEditionMasterRequest,
  CreateGameConsoleMasterRequest,
  CreateGameConsoleRequest,
  CreateGameSoftwareContentGroupRequest,
  CreateGameSoftwareMasterRequest,
  CreateGameSoftwareRequest,
  CreateMemoryCardRequest,
  CreateSaveDataFieldDefinitionRequest,
  CreateSaveDataFieldOptionRequest,
  CreateSaveDataRequest,
  CreateStoryProgressDefinitionRequest,
  DeleteSaveDataRequest,
  GameConsoleCategoryDto,
  GameConsoleDto,
  GameConsoleEditionMasterDto,
  GameConsoleMasterDto,
  GameSoftwareContentGroupDto,
  GameSoftwareDto,
  GameSoftwareMasterDto,
  ManagementLookups,
  MasterLookups,
  MemoryCardDto,
  ResourceKey,
  SaveDataDto,
  SaveDataFieldDefinitionDto,
  SaveDataFieldOptionDto,
  SaveDataFieldOverrideDto,
  SaveDataSchemaDto,
  StoryProgressDefinitionDto,
  StoryProgressOverrideDto,
  StoryProgressSchemaDto,
  UpdateSaveDataFieldDefinitionRequest,
  UpdateSaveDataFieldOptionRequest,
  UpdateAccountRequest,
  UpdateGameConsoleCategoryRequest,
  UpdateGameConsoleEditionMasterRequest,
  UpdateGameConsoleMasterRequest,
  UpdateGameConsoleRequest,
  UpdateGameSoftwareContentGroupRequest,
  UpdateGameSoftwareMasterRequest,
  UpdateGameSoftwareRequest,
  UpdateMemoryCardRequest,
  UpdateSaveDataRequest,
  UpdateStoryProgressDefinitionRequest,
  UpsertSaveDataFieldOverrideRequest,
  UpsertStoryProgressOverrideRequest,
} from '@/lib/game-management/types';
import { getResourceDefinition } from '@/lib/game-management/resources';

const client = createFrontendApiClient('game-library-api');

export class ApiError extends Error {
  public statusCode: number | null;
  public details?: unknown;
  constructor(statusCode: number | null, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function getErrorMessage(details: unknown, fallback: string): string {
  if (!details || typeof details !== 'object') {
    return fallback;
  }

  const candidate = details as { detail?: string; title?: string; errors?: Record<string, string[]> };
  if (candidate.detail) {
    return candidate.detail;
  }
  if (candidate.title) {
    return candidate.title;
  }
  if (candidate.errors) {
    return Object.entries(candidate.errors)
      .flatMap(([key, values]) => values.map((value) => `${key}: ${value}`))
      .join('\n');
  }

  return fallback;
}

async function unwrap<T>(promise: ReturnType<typeof client.get<T>>): Promise<T> {
  const response = await promise;
  if (!response.success) {
    const statusCode = response.error.code.startsWith('HTTP_')
      ? parseInt(response.error.code.replace('HTTP_', ''), 10)
      : null;
    throw new ApiError(
      statusCode,
      getErrorMessage(response.error.details, response.error.message),
      response.error.details,
    );
  }
  return response.data;
}

export async function fetchResourceList<T>(resourceKey: ResourceKey, includeDeleted = false): Promise<T[]> {
  const definition = getResourceDefinition(resourceKey);
  return unwrap(client.get<T[]>(`${definition.apiPath}?includeDeleted=${includeDeleted}`));
}

export async function fetchResourceById<T>(resourceKey: ResourceKey, id: string | number): Promise<T> {
  const definition = getResourceDefinition(resourceKey);
  return unwrap(client.get<T>(`${definition.apiPath}/${id}`));
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export async function createAccount(payload: CreateAccountRequest): Promise<number> {
  return unwrap(client.post<number>('/api/Accounts', payload));
}

export async function updateAccount(id: number, payload: UpdateAccountRequest): Promise<AccountDto> {
  return unwrap(client.put<AccountDto>(`/api/Accounts/${id}`, payload));
}

export async function deleteAccount(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/Accounts/${id}`));
}

// ---------------------------------------------------------------------------
// GameConsoleCategory (admin)
// ---------------------------------------------------------------------------

export async function createGameConsoleCategory(payload: CreateGameConsoleCategoryRequest): Promise<number> {
  return unwrap(client.post<number>('/api/GameConsoleCategories', payload));
}

export async function updateGameConsoleCategory(id: number, payload: UpdateGameConsoleCategoryRequest): Promise<GameConsoleCategoryDto> {
  return unwrap(client.put<GameConsoleCategoryDto>(`/api/GameConsoleCategories/${id}`, payload));
}

export async function deleteGameConsoleCategory(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/GameConsoleCategories/${id}`));
}

// ---------------------------------------------------------------------------
// GameConsoleMaster (admin)
// ---------------------------------------------------------------------------

export async function createGameConsoleMaster(payload: CreateGameConsoleMasterRequest): Promise<number> {
  return unwrap(client.post<number>('/api/GameConsoleMasters', payload));
}

export async function updateGameConsoleMaster(id: number, payload: UpdateGameConsoleMasterRequest): Promise<GameConsoleMasterDto> {
  return unwrap(client.put<GameConsoleMasterDto>(`/api/GameConsoleMasters/${id}`, payload));
}

export async function deleteGameConsoleMaster(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/GameConsoleMasters/${id}`));
}

// ---------------------------------------------------------------------------
// GameConsoleEditionMaster (admin)
// ---------------------------------------------------------------------------

export async function createGameConsoleEditionMaster(payload: CreateGameConsoleEditionMasterRequest): Promise<number> {
  return unwrap(client.post<number>('/api/GameConsoleEditionMasters', payload));
}

export async function updateGameConsoleEditionMaster(id: number, payload: UpdateGameConsoleEditionMasterRequest): Promise<GameConsoleEditionMasterDto> {
  return unwrap(client.put<GameConsoleEditionMasterDto>(`/api/GameConsoleEditionMasters/${id}`, payload));
}

export async function deleteGameConsoleEditionMaster(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/GameConsoleEditionMasters/${id}`));
}

export async function createGameConsole(payload: CreateGameConsoleRequest): Promise<number> {
  return unwrap(client.post<number>('/api/GameConsoles', payload));
}

export async function updateGameConsole(id: number, payload: UpdateGameConsoleRequest): Promise<GameConsoleDto> {
  return unwrap(client.put<GameConsoleDto>(`/api/GameConsoles/${id}`, payload));
}

export async function deleteGameConsole(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/GameConsoles/${id}`));
}

export async function createGameSoftwareContentGroup(payload: CreateGameSoftwareContentGroupRequest): Promise<number> {
  return unwrap(client.post<number>('/api/GameSoftwareContentGroups', payload));
}

export async function updateGameSoftwareContentGroup(id: number, payload: UpdateGameSoftwareContentGroupRequest): Promise<GameSoftwareContentGroupDto> {
  return unwrap(client.put<GameSoftwareContentGroupDto>(`/api/GameSoftwareContentGroups/${id}`, payload));
}

export async function deleteGameSoftwareContentGroup(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/GameSoftwareContentGroups/${id}`));
}

export async function createGameSoftwareMaster(payload: CreateGameSoftwareMasterRequest): Promise<number> {
  return unwrap(client.post<number>('/api/GameSoftwareMasters', payload));
}

export async function updateGameSoftwareMaster(id: number, payload: UpdateGameSoftwareMasterRequest): Promise<GameSoftwareMasterDto> {
  return unwrap(client.put<GameSoftwareMasterDto>(`/api/GameSoftwareMasters/${id}`, payload));
}

export async function deleteGameSoftwareMaster(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/GameSoftwareMasters/${id}`));
}

export async function createGameSoftware(payload: CreateGameSoftwareRequest): Promise<number> {
  return unwrap(client.post<number>('/api/GameSoftwares', payload));
}

export async function updateGameSoftware(id: number, payload: UpdateGameSoftwareRequest): Promise<GameSoftwareDto> {
  return unwrap(client.put<GameSoftwareDto>(`/api/GameSoftwares/${id}`, payload));
}

export async function deleteGameSoftware(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/GameSoftwares/${id}`));
}

export async function createMemoryCard(payload: CreateMemoryCardRequest): Promise<number> {
  return unwrap(client.post<number>('/api/MemoryCards', payload));
}

export async function updateMemoryCard(id: number, payload: UpdateMemoryCardRequest): Promise<MemoryCardDto> {
  return unwrap(client.put<MemoryCardDto>(`/api/MemoryCards/${id}`, payload));
}

export async function deleteMemoryCard(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/MemoryCards/${id}`));
}

export async function createSaveData(payload: CreateSaveDataRequest): Promise<number> {
  return unwrap(client.post<number>('/api/SaveDatas', payload));
}

export async function updateSaveData(id: number, payload: UpdateSaveDataRequest): Promise<SaveDataDto> {
  return unwrap(client.put<SaveDataDto>(`/api/SaveDatas/${id}`, payload));
}

export async function deleteSaveData(id: number, payload: DeleteSaveDataRequest): Promise<void> {
  await unwrap(client.delete<void>(`/api/SaveDatas/${id}`, { body: payload }));
}

export async function fetchMasterLookups(): Promise<MasterLookups> {
  const [gameConsoleCategories, gameConsoleMasters, gameConsoleEditionMasters, gameSoftwareContentGroups, gameSoftwareMasters] = await Promise.all([
    fetchResourceList<GameConsoleCategoryDto>('game-console-categories'),
    fetchResourceList<GameConsoleMasterDto>('game-console-masters'),
    fetchResourceList<GameConsoleEditionMasterDto>('game-console-edition-masters'),
    fetchResourceList<GameSoftwareContentGroupDto>('game-software-content-groups'),
    fetchResourceList<GameSoftwareMasterDto>('game-software-masters'),
  ]);
  return { gameConsoleCategories, gameConsoleMasters, gameConsoleEditionMasters, gameSoftwareContentGroups, gameSoftwareMasters };
}

async function safeFetchMasterList<T>(resourceKey: ResourceKey): Promise<T[]> {
  try {
    return await fetchResourceList<T>(resourceKey);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 403) {
      return [];
    }
    throw error;
  }
}

export async function fetchUserLookups(): Promise<ManagementLookups> {
  const [
    gameConsoleCategories,
    gameConsoleMasters,
    gameConsoleEditionMasters,
    gameSoftwareContentGroups,
    gameSoftwareMasters,
    accounts,
    gameConsoles,
    gameSoftwares,
    memoryCards,
    saveDatas,
  ] = await Promise.all([
    safeFetchMasterList<GameConsoleCategoryDto>('game-console-categories'),
    safeFetchMasterList<GameConsoleMasterDto>('game-console-masters'),
    safeFetchMasterList<GameConsoleEditionMasterDto>('game-console-edition-masters'),
    safeFetchMasterList<GameSoftwareContentGroupDto>('game-software-content-groups'),
    safeFetchMasterList<GameSoftwareMasterDto>('game-software-masters'),
    fetchResourceList<AccountDto>('accounts'),
    fetchResourceList<GameConsoleDto>('game-consoles'),
    fetchResourceList<GameSoftwareDto>('game-softwares'),
    fetchResourceList<MemoryCardDto>('memory-cards'),
    fetchResourceList<SaveDataDto>('save-datas'),
  ]);
  return {
    accounts,
    gameConsoleCategories,
    gameConsoleMasters,
    gameConsoleEditionMasters,
    gameConsoles,
    gameSoftwareContentGroups,
    gameSoftwareMasters,
    gameSoftwares,
    memoryCards,
    saveDatas,
  };
}

// ---------------------------------------------------------------------------
// 公開マスタ API（認証不要）
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
    );
  }
  return data.data as T;
}

export async function fetchPublicMasterLookups(): Promise<MasterLookups> {
  const [gameConsoleCategories, gameConsoleMasters, gameConsoleEditionMasters, gameSoftwareContentGroups, gameSoftwareMasters] = await Promise.all([
    fetchPublicList<GameConsoleCategoryDto>('game-console-categories'),
    fetchPublicList<GameConsoleMasterDto>('game-console-masters'),
    fetchPublicList<GameConsoleEditionMasterDto>('game-console-edition-masters'),
    fetchPublicList<GameSoftwareContentGroupDto>('game-software-content-groups'),
    fetchPublicList<GameSoftwareMasterDto>('game-software-masters'),
  ]);
  return { gameConsoleCategories, gameConsoleMasters, gameConsoleEditionMasters, gameSoftwareContentGroups, gameSoftwareMasters };
}

export async function fetchPublicSaveDataSchema(gameSoftwareMasterId: number): Promise<SaveDataSchemaDto> {
  return fetchPublicData<SaveDataSchemaDto>(`game-software-masters/${gameSoftwareMasterId}/save-data-schema`);
}

export async function fetchPublicStoryProgressSchema(gameSoftwareMasterId: number): Promise<StoryProgressSchemaDto> {
  return fetchPublicData<StoryProgressSchemaDto>(`game-software-masters/${gameSoftwareMasterId}/story-progress-schema`);
}

export async function fetchSaveDataFieldDefinitions(contentGroupId: number, includeDeleted = false): Promise<SaveDataFieldDefinitionDto[]> {
  return unwrap(client.get<SaveDataFieldDefinitionDto[]>(`/api/GameSoftwareContentGroups/${contentGroupId}/SaveDataFieldDefinitions?includeDeleted=${includeDeleted}`));
}

export async function fetchSaveDataFieldDefinition(id: number): Promise<SaveDataFieldDefinitionDto> {
  return unwrap(client.get<SaveDataFieldDefinitionDto>(`/api/SaveDataFieldDefinitions/${id}`));
}

export async function createSaveDataFieldDefinition(
  contentGroupId: number,
  payload: CreateSaveDataFieldDefinitionRequest,
): Promise<number> {
  return unwrap(client.post<number>(`/api/GameSoftwareContentGroups/${contentGroupId}/SaveDataFieldDefinitions`, payload));
}

export async function updateSaveDataFieldDefinition(
  id: number,
  payload: UpdateSaveDataFieldDefinitionRequest,
): Promise<SaveDataFieldDefinitionDto> {
  return unwrap(client.put<SaveDataFieldDefinitionDto>(`/api/SaveDataFieldDefinitions/${id}`, payload));
}

export async function deleteSaveDataFieldDefinition(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/SaveDataFieldDefinitions/${id}`));
}

export async function fetchSaveDataFieldOptions(fieldDefinitionId: number, includeDeleted = false): Promise<SaveDataFieldOptionDto[]> {
  return unwrap(client.get<SaveDataFieldOptionDto[]>(`/api/SaveDataFieldDefinitions/${fieldDefinitionId}/Options?includeDeleted=${includeDeleted}`));
}

export async function fetchSaveDataFieldOption(id: number): Promise<SaveDataFieldOptionDto> {
  return unwrap(client.get<SaveDataFieldOptionDto>(`/api/SaveDataFieldOptions/${id}`));
}

export async function createSaveDataFieldOption(
  fieldDefinitionId: number,
  payload: CreateSaveDataFieldOptionRequest,
): Promise<number> {
  return unwrap(client.post<number>(`/api/SaveDataFieldDefinitions/${fieldDefinitionId}/Options`, payload));
}

export async function updateSaveDataFieldOption(
  id: number,
  payload: UpdateSaveDataFieldOptionRequest,
): Promise<SaveDataFieldOptionDto> {
  return unwrap(client.put<SaveDataFieldOptionDto>(`/api/SaveDataFieldOptions/${id}`, payload));
}

export async function deleteSaveDataFieldOption(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/SaveDataFieldOptions/${id}`));
}

export async function fetchSaveDataFieldOverrides(gameSoftwareMasterId: number, includeDeleted = false): Promise<SaveDataFieldOverrideDto[]> {
  return unwrap(client.get<SaveDataFieldOverrideDto[]>(`/api/GameSoftwareMasters/${gameSoftwareMasterId}/SaveDataFieldOverrides?includeDeleted=${includeDeleted}`));
}

export async function upsertSaveDataFieldOverride(
  gameSoftwareMasterId: number,
  fieldDefinitionId: number,
  payload: UpsertSaveDataFieldOverrideRequest,
): Promise<SaveDataFieldOverrideDto> {
  return unwrap(client.put<SaveDataFieldOverrideDto>(`/api/GameSoftwareMasters/${gameSoftwareMasterId}/SaveDataFieldOverrides/${fieldDefinitionId}`, payload));
}

export async function deleteSaveDataFieldOverride(gameSoftwareMasterId: number, fieldDefinitionId: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/GameSoftwareMasters/${gameSoftwareMasterId}/SaveDataFieldOverrides/${fieldDefinitionId}`));
}

// ---------------------------------------------------------------------------
// StoryProgressDefinitions (admin)
// ---------------------------------------------------------------------------

export async function fetchStoryProgressDefinitions(contentGroupId: number, includeDeleted = false): Promise<StoryProgressDefinitionDto[]> {
  return unwrap(client.get<StoryProgressDefinitionDto[]>(`/api/GameSoftwareContentGroups/${contentGroupId}/StoryProgressDefinitions?includeDeleted=${includeDeleted}`));
}

export async function fetchStoryProgressDefinition(id: number): Promise<StoryProgressDefinitionDto> {
  return unwrap(client.get<StoryProgressDefinitionDto>(`/api/StoryProgressDefinitions/${id}`));
}

export async function createStoryProgressDefinition(
  contentGroupId: number,
  payload: CreateStoryProgressDefinitionRequest,
): Promise<number> {
  return unwrap(client.post<number>(`/api/GameSoftwareContentGroups/${contentGroupId}/StoryProgressDefinitions`, payload));
}

export async function updateStoryProgressDefinition(
  id: number,
  payload: UpdateStoryProgressDefinitionRequest,
): Promise<StoryProgressDefinitionDto> {
  return unwrap(client.put<StoryProgressDefinitionDto>(`/api/StoryProgressDefinitions/${id}`, payload));
}

export async function deleteStoryProgressDefinition(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/StoryProgressDefinitions/${id}`));
}

// ---------------------------------------------------------------------------
// StoryProgressOverrides (admin)
// ---------------------------------------------------------------------------

export async function fetchStoryProgressOverrides(gameSoftwareMasterId: number, includeDeleted = false): Promise<StoryProgressOverrideDto[]> {
  return unwrap(client.get<StoryProgressOverrideDto[]>(`/api/GameSoftwareMasters/${gameSoftwareMasterId}/StoryProgressOverrides?includeDeleted=${includeDeleted}`));
}

export async function upsertStoryProgressOverride(
  gameSoftwareMasterId: number,
  storyProgressDefinitionId: number,
  payload: UpsertStoryProgressOverrideRequest,
): Promise<StoryProgressOverrideDto> {
  return unwrap(client.put<StoryProgressOverrideDto>(`/api/GameSoftwareMasters/${gameSoftwareMasterId}/StoryProgressOverrides/${storyProgressDefinitionId}`, payload));
}

export async function deleteStoryProgressOverride(gameSoftwareMasterId: number, storyProgressDefinitionId: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/GameSoftwareMasters/${gameSoftwareMasterId}/StoryProgressOverrides/${storyProgressDefinitionId}`));
}

// ---------------------------------------------------------------------------
// 認証付きユーザー lookups（公開マスタ + ユーザーデータ）
// ---------------------------------------------------------------------------

export async function fetchAuthenticatedUserLookups(): Promise<ManagementLookups> {
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
    fetchResourceList<GameConsoleDto>('game-consoles'),
    fetchResourceList<GameSoftwareDto>('game-softwares'),
    fetchResourceList<MemoryCardDto>('memory-cards'),
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