import type {
  CreateGameConsoleMaintenanceRequest,
  CreateGameSoftwareMaintenanceRequest,
  CreateMemoryCardMaintenanceRequest,
  CurrentUserDto,
  GameConsoleMaintenanceDto,
  GameSoftwareMaintenanceDto,
  MemoryCardMaintenanceDto,
  UpdateGameConsoleMaintenanceRequest,
  UpdateGameSoftwareMaintenanceRequest,
  UpdateMemoryCardMaintenanceRequest,
} from '@/lib/game-management/types';
import { client, unwrap } from './core';

type MaintenanceResourceKey = 'game-consoles' | 'game-softwares' | 'memory-cards';

type MaintenanceDtoMap = {
  'game-consoles': GameConsoleMaintenanceDto;
  'game-softwares': GameSoftwareMaintenanceDto;
  'memory-cards': MemoryCardMaintenanceDto;
};

type CreateMaintenanceRequestMap = {
  'game-consoles': CreateGameConsoleMaintenanceRequest;
  'game-softwares': CreateGameSoftwareMaintenanceRequest;
  'memory-cards': CreateMemoryCardMaintenanceRequest;
};

type UpdateMaintenanceRequestMap = {
  'game-consoles': UpdateGameConsoleMaintenanceRequest;
  'game-softwares': UpdateGameSoftwareMaintenanceRequest;
  'memory-cards': UpdateMemoryCardMaintenanceRequest;
};

const maintenanceApiPathMap: Record<MaintenanceResourceKey, string> = {
  'game-consoles': '/api/GameConsoles',
  'game-softwares': '/api/GameSoftwares',
  'memory-cards': '/api/MemoryCards',
};

function buildMaintenancePath(resourceKey: MaintenanceResourceKey, parentId: number, maintenanceId?: number): string {
  const basePath = `${maintenanceApiPathMap[resourceKey]}/${parentId}/Maintenances`;
  return maintenanceId == null ? basePath : `${basePath}/${maintenanceId}`;
}

export async function fetchCurrentUser(): Promise<CurrentUserDto> {
  return unwrap(client.get<CurrentUserDto>('/api/Auth/me'));
}

export async function fetchMaintenanceList<K extends MaintenanceResourceKey>(
  resourceKey: K,
  parentId: number,
  includeDeleted = false,
): Promise<Array<MaintenanceDtoMap[K]>> {
  return unwrap(client.get<Array<MaintenanceDtoMap[K]>>(`${buildMaintenancePath(resourceKey, parentId)}?includeDeleted=${includeDeleted}`));
}

export async function createMaintenanceRecord<K extends MaintenanceResourceKey>(
  resourceKey: K,
  parentId: number,
  payload: CreateMaintenanceRequestMap[K],
): Promise<number> {
  return unwrap(client.post<number>(buildMaintenancePath(resourceKey, parentId), payload));
}

export async function updateMaintenanceRecord<K extends MaintenanceResourceKey>(
  resourceKey: K,
  parentId: number,
  maintenanceId: number,
  payload: UpdateMaintenanceRequestMap[K],
): Promise<MaintenanceDtoMap[K]> {
  return unwrap(client.put<MaintenanceDtoMap[K]>(buildMaintenancePath(resourceKey, parentId, maintenanceId), payload));
}

export async function deleteMaintenanceRecord<K extends MaintenanceResourceKey>(
  resourceKey: K,
  parentId: number,
  maintenanceId: number,
): Promise<void> {
  await unwrap(client.delete<void>(buildMaintenancePath(resourceKey, parentId, maintenanceId)));
}
