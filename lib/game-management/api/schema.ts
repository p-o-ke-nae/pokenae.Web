import type {
  CreateSaveDataFieldChoiceOptionRequest,
  CreateSaveDataFieldChoiceSetRequest,
  CreateSaveDataFieldDefinitionRequest,
  CreateSaveDataFieldOptionRequest,
  BatchSaveDataFieldDefinitionTypeItem,
  CreateStoryProgressDefinitionRequest,
  ReorderItemRequest,
  SaveDataFieldChoiceOptionDto,
  SaveDataFieldChoiceSetDto,
  SaveDataFieldDefinitionDto,
  SaveDataFieldOptionDto,
  SaveDataFieldOverrideDto,
  StoryProgressDefinitionDto,
  StoryProgressOverrideDto,
  UpdateSaveDataFieldChoiceOptionRequest,
  UpdateSaveDataFieldChoiceSetRequest,
  UpdateSaveDataFieldDefinitionRequest,
  UpdateSaveDataFieldOptionRequest,
  UpdateStoryProgressDefinitionRequest,
  UpsertSaveDataFieldOverrideRequest,
  UpsertStoryProgressOverrideRequest,
} from '@/lib/game-management/types';
import { getSession } from 'next-auth/react';
import { ApiError, client, getErrorMessage, unwrap } from './core';

type BatchUpdateSaveDataFieldDefinitionTypesResponse = {
  updatedCount: number;
};

// ---------------------------------------------------------------------------
// SaveDataFieldDefinitions
// ---------------------------------------------------------------------------

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

export async function batchUpdateSaveDataFieldDefinitionTypes(
  items: BatchSaveDataFieldDefinitionTypeItem[],
): Promise<BatchUpdateSaveDataFieldDefinitionTypesResponse> {
  if (items.length === 0) {
    return { updatedCount: 0 };
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const session = await getSession();
    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`;
      headers['X-Google-Access-Token'] = session.accessToken;
    }
  } catch {
    // セッション取得失敗時はヘッダーなしで続行する。
  }

  const response = await fetch('/api/batch-save-data-field-definition-types', {
    method: 'POST',
    headers,
    body: JSON.stringify({ items }),
  });

  let data: {
    success?: boolean;
    data?: BatchUpdateSaveDataFieldDefinitionTypesResponse;
    error?: { message?: string; details?: unknown };
  };

  try {
    data = await response.json();
  } catch {
    throw new ApiError(response.status, 'サーバーからの応答を解析できませんでした。');
  }

  if (data?.success) {
    return { updatedCount: data.data?.updatedCount ?? items.length };
  }

  throw new ApiError(
    response.status,
    getErrorMessage(data?.error?.details, data?.error?.message ?? '項目定義の一括型変更に失敗しました。'),
    data?.error?.details,
  );
}

export async function deleteSaveDataFieldDefinition(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/SaveDataFieldDefinitions/${id}`));
}

// ---------------------------------------------------------------------------
// SaveDataFieldOptions
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// SaveDataFieldOverrides
// ---------------------------------------------------------------------------

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
// SaveDataFieldChoiceSets
// ---------------------------------------------------------------------------

export async function fetchSaveDataFieldChoiceSets(includeDeleted = false): Promise<SaveDataFieldChoiceSetDto[]> {
  return unwrap(client.get<SaveDataFieldChoiceSetDto[]>(`/api/SaveDataFieldChoiceSets?includeDeleted=${includeDeleted}`));
}

export async function fetchSaveDataFieldChoiceSet(id: number): Promise<SaveDataFieldChoiceSetDto> {
  return unwrap(client.get<SaveDataFieldChoiceSetDto>(`/api/SaveDataFieldChoiceSets/${id}`));
}

export async function createSaveDataFieldChoiceSet(payload: CreateSaveDataFieldChoiceSetRequest): Promise<number> {
  return unwrap(client.post<number>('/api/SaveDataFieldChoiceSets', payload));
}

export async function updateSaveDataFieldChoiceSet(id: number, payload: UpdateSaveDataFieldChoiceSetRequest): Promise<SaveDataFieldChoiceSetDto> {
  return unwrap(client.put<SaveDataFieldChoiceSetDto>(`/api/SaveDataFieldChoiceSets/${id}`, payload));
}

export async function deleteSaveDataFieldChoiceSet(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/SaveDataFieldChoiceSets/${id}`));
}

// ---------------------------------------------------------------------------
// SaveDataFieldChoiceOptions
// ---------------------------------------------------------------------------

export async function fetchSaveDataFieldChoiceOptions(choiceSetId: number, includeDeleted = false): Promise<SaveDataFieldChoiceOptionDto[]> {
  return unwrap(client.get<SaveDataFieldChoiceOptionDto[]>(`/api/SaveDataFieldChoiceSets/${choiceSetId}/Options?includeDeleted=${includeDeleted}`));
}

export async function fetchSaveDataFieldChoiceOption(id: number): Promise<SaveDataFieldChoiceOptionDto> {
  return unwrap(client.get<SaveDataFieldChoiceOptionDto>(`/api/SaveDataFieldChoiceOptions/${id}`));
}

export async function createSaveDataFieldChoiceOption(choiceSetId: number, payload: CreateSaveDataFieldChoiceOptionRequest): Promise<number> {
  return unwrap(client.post<number>(`/api/SaveDataFieldChoiceSets/${choiceSetId}/Options`, payload));
}

export async function updateSaveDataFieldChoiceOption(id: number, payload: UpdateSaveDataFieldChoiceOptionRequest): Promise<SaveDataFieldChoiceOptionDto> {
  return unwrap(client.put<SaveDataFieldChoiceOptionDto>(`/api/SaveDataFieldChoiceOptions/${id}`, payload));
}

export async function deleteSaveDataFieldChoiceOption(id: number): Promise<void> {
  await unwrap(client.delete<void>(`/api/SaveDataFieldChoiceOptions/${id}`));
}

// ---------------------------------------------------------------------------
// StoryProgressDefinitions
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
// StoryProgressOverrides
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
// Reorder
// ---------------------------------------------------------------------------

export async function reorderSaveDataFieldDefinitions(contentGroupId: number, items: ReorderItemRequest[]): Promise<void> {
  await unwrap(client.patch<void>(`/api/GameSoftwareContentGroups/${contentGroupId}/SaveDataFieldDefinitions/reorder`, items));
}

export async function reorderSaveDataFieldOptions(fieldDefinitionId: number, items: ReorderItemRequest[]): Promise<void> {
  await unwrap(client.patch<void>(`/api/SaveDataFieldDefinitions/${fieldDefinitionId}/Options/reorder`, items));
}

export async function reorderStoryProgressDefinitions(contentGroupId: number, items: ReorderItemRequest[]): Promise<void> {
  await unwrap(client.patch<void>(`/api/GameSoftwareContentGroups/${contentGroupId}/StoryProgressDefinitions/reorder`, items));
}

export async function reorderSaveDataFieldChoiceOptions(choiceSetId: number, items: ReorderItemRequest[]): Promise<void> {
  await unwrap(client.patch<void>(`/api/SaveDataFieldChoiceSets/${choiceSetId}/Options/reorder`, items));
}
