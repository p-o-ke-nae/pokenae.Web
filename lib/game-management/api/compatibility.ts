import type {
  GameConsoleCategoryCompatibilityDto,
  SetGameConsoleCategoryCompatibilitiesRequest,
} from '@/lib/game-management/types';
import { client, unwrap } from './core';

const BASE_PATH = '/api/GameConsoleCategoryCompatibilities';

export async function fetchCompatibilities(
  hostCategoryId: number,
): Promise<GameConsoleCategoryCompatibilityDto[]> {
  return unwrap(client.get<GameConsoleCategoryCompatibilityDto[]>(`${BASE_PATH}/${hostCategoryId}`));
}

export async function setCompatibilities(
  hostCategoryId: number,
  payload: SetGameConsoleCategoryCompatibilitiesRequest,
): Promise<GameConsoleCategoryCompatibilityDto[]> {
  return unwrap(client.put<GameConsoleCategoryCompatibilityDto[]>(`${BASE_PATH}/${hostCategoryId}`, payload));
}
