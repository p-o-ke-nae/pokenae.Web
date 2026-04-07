/**
 * トライアルモード用リソース CRUD
 */

import type {
  AccountDto,
  CreateAccountRequest,
  CreateGameConsoleRequest,
  CreateGameSoftwareRequest,
  CreateMemoryCardRequest,
  CreateSaveDataRequest,
  GameConsoleDto,
  GameSoftwareDto,
  ManagementLookups,
  MasterLookups,
  MemoryCardDto,
  SaveDataDto,
  SaveDataSchemaDto,
  SaveStorageType,
  UpdateAccountRequest,
  UpdateGameConsoleRequest,
  UpdateGameSoftwareRequest,
  UpdateMemoryCardRequest,
  UpdateSaveDataRequest,
} from '@/lib/game-management/types';
import { createTrialExtendedFields } from '@/lib/game-management/save-data-fields';
import {
  getNextId,
  readDisplayOrderedList,
  readList,
  sortByDisplayOrder,
  TRIAL_OWNER,
  writeList,
} from './core';

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export function trialListAccounts(): AccountDto[] {
  return readDisplayOrderedList<AccountDto>('accounts');
}

export function trialGetAccount(id: number): AccountDto | undefined {
  return trialListAccounts().find((item) => item.id === id);
}

export function trialCreateAccount(payload: CreateAccountRequest): number {
  const items = trialListAccounts();
  const newId = getNextId('accounts');
  items.push({
    id: newId,
    ownerGoogleUserId: TRIAL_OWNER,
    accountTypeMasterId: payload.accountTypeMasterId,
    displayOrder: payload.displayOrder,
    label: payload.label,
    memo: payload.memo,
    linkedGameConsoleIds: payload.linkedGameConsoleIds ?? [],
    isDeleted: false,
  });
  writeList('accounts', items);
  return newId;
}

export function trialUpdateAccount(id: number, payload: UpdateAccountRequest): AccountDto {
  const items = trialListAccounts();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`Account #${id} not found`);
  items[idx] = {
    ...items[idx],
    displayOrder: payload.displayOrder,
    label: payload.label,
    memo: payload.memo,
    linkedGameConsoleIds: payload.linkedGameConsoleIds ?? [],
  };
  writeList('accounts', items);
  return items[idx];
}

export function trialDeleteAccount(id: number): void {
  const items = trialListAccounts();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`Account #${id} not found`);
  items[idx] = { ...items[idx], isDeleted: true };
  writeList('accounts', items);
}

// ---------------------------------------------------------------------------
// GameConsoles
// ---------------------------------------------------------------------------

export function trialListGameConsoles(): GameConsoleDto[] {
  return readDisplayOrderedList<GameConsoleDto>('game-consoles');
}

export function trialGetGameConsole(id: number): GameConsoleDto | undefined {
  return trialListGameConsoles().find((item) => item.id === id);
}

export function trialCreateGameConsole(payload: CreateGameConsoleRequest): number {
  const items = trialListGameConsoles();
  const newId = getNextId('game-consoles');
  items.push({
    id: newId,
    gameConsoleMasterId: payload.gameConsoleMasterId,
    gameConsoleEditionMasterId: payload.gameConsoleEditionMasterId,
    ownerGoogleUserId: TRIAL_OWNER,
    displayOrder: payload.displayOrder,
    label: payload.label,
    memo: payload.memo,
    isDeleted: false,
  });
  writeList('game-consoles', items);
  return newId;
}

export function trialUpdateGameConsole(id: number, payload: UpdateGameConsoleRequest): GameConsoleDto {
  const items = trialListGameConsoles();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`GameConsole #${id} not found`);
  const nextEditionMasterId = Object.prototype.hasOwnProperty.call(payload, 'gameConsoleEditionMasterId')
    ? payload.gameConsoleEditionMasterId ?? null
    : items[idx].gameConsoleEditionMasterId;
  items[idx] = {
    ...items[idx],
    gameConsoleEditionMasterId: nextEditionMasterId,
    displayOrder: payload.displayOrder,
    label: payload.label,
    memo: payload.memo,
  };
  writeList('game-consoles', items);
  return items[idx];
}

export function trialDeleteGameConsole(id: number): void {
  const items = trialListGameConsoles();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`GameConsole #${id} not found`);
  items[idx] = { ...items[idx], isDeleted: true };
  writeList('game-consoles', items);
}

// ---------------------------------------------------------------------------
// GameSoftwares
// ---------------------------------------------------------------------------

export function trialListGameSoftwares(): GameSoftwareDto[] {
  return readDisplayOrderedList<GameSoftwareDto>('game-softwares');
}

export function trialGetGameSoftware(id: number): GameSoftwareDto | undefined {
  return trialListGameSoftwares().find((item) => item.id === id);
}

export function trialCreateGameSoftware(payload: CreateGameSoftwareRequest): number {
  const items = trialListGameSoftwares();
  const newId = getNextId('game-softwares');
  items.push({
    id: newId,
    gameSoftwareMasterId: payload.gameSoftwareMasterId,
    variant: payload.variant,
    accountId: payload.accountId ?? null,
    installedGameConsoleId: payload.installedGameConsoleId ?? null,
    ownerGoogleUserId: TRIAL_OWNER,
    displayOrder: payload.displayOrder,
    label: payload.label,
    memo: payload.memo,
    isDeleted: false,
  });
  writeList('game-softwares', items);
  return newId;
}

export function trialUpdateGameSoftware(id: number, payload: UpdateGameSoftwareRequest): GameSoftwareDto {
  const items = trialListGameSoftwares();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`GameSoftware #${id} not found`);
  items[idx] = {
    ...items[idx],
    displayOrder: payload.displayOrder,
    variant: payload.variant,
    accountId: payload.accountId ?? null,
    installedGameConsoleId: payload.installedGameConsoleId ?? null,
    label: payload.label,
    memo: payload.memo,
  };
  writeList('game-softwares', items);
  return items[idx];
}

export function trialDeleteGameSoftware(id: number): void {
  const items = trialListGameSoftwares();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`GameSoftware #${id} not found`);
  items[idx] = { ...items[idx], isDeleted: true };
  writeList('game-softwares', items);
}

// ---------------------------------------------------------------------------
// MemoryCards
// ---------------------------------------------------------------------------

export function trialListMemoryCards(): MemoryCardDto[] {
  return readDisplayOrderedList<MemoryCardDto>('memory-cards');
}

export function trialGetMemoryCard(id: number): MemoryCardDto | undefined {
  return trialListMemoryCards().find((item) => item.id === id);
}

export function trialCreateMemoryCard(payload: CreateMemoryCardRequest): number {
  const items = trialListMemoryCards();
  const newId = getNextId('memory-cards');
  items.push({
    id: newId,
    memoryCardEditionMasterId: payload.memoryCardEditionMasterId,
    ownerGoogleUserId: TRIAL_OWNER,
    displayOrder: payload.displayOrder,
    label: payload.label,
    memo: payload.memo,
    isDeleted: false,
  });
  writeList('memory-cards', items);
  return newId;
}

export function trialUpdateMemoryCard(id: number, payload: UpdateMemoryCardRequest): MemoryCardDto {
  const items = trialListMemoryCards();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`MemoryCard #${id} not found`);
  items[idx] = {
    ...items[idx],
    memoryCardEditionMasterId: payload.memoryCardEditionMasterId,
    displayOrder: payload.displayOrder,
    label: payload.label,
    memo: payload.memo,
  };
  writeList('memory-cards', items);
  return items[idx];
}

export function trialDeleteMemoryCard(id: number): void {
  const items = trialListMemoryCards();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`MemoryCard #${id} not found`);
  items[idx] = { ...items[idx], isDeleted: true };
  writeList('memory-cards', items);
}

// ---------------------------------------------------------------------------
// SaveDatas
// ---------------------------------------------------------------------------

type TrialSaveDataStorageRecord = Omit<SaveDataDto, 'gameSoftwareMasterId' | 'gameSoftwareId' | 'displayOrder'> & {
  gameSoftwareMasterId?: number;
  gameSoftwareId: number | null;
  displayOrder?: number | null;
};

export function trialListSaveDatas(): SaveDataDto[] {
  const gameSoftwares = trialListGameSoftwares();
  return sortByDisplayOrder(
    readList<TrialSaveDataStorageRecord>('save-datas').map((item) => {
      const normalized = {
        ...item,
        displayOrder: typeof item.displayOrder === 'number' && Number.isInteger(item.displayOrder) && item.displayOrder > 0
          ? item.displayOrder
          : item.id,
      };
      return {
        ...normalized,
        gameSoftwareMasterId: normalized.gameSoftwareMasterId ?? gameSoftwares.find((software) => software.id === normalized.gameSoftwareId)?.gameSoftwareMasterId ?? 0,
        gameSoftwareId: normalized.saveStorageType === 0 ? (normalized.gameSoftwareId ?? null) : null,
      };
    }),
  );
}

export function trialGetSaveData(id: number): SaveDataDto | undefined {
  return trialListSaveDatas().find((item) => item.id === id);
}

export function trialCreateSaveData(
  payload: CreateSaveDataRequest,
  saveStorageType: SaveStorageType,
  schema: SaveDataSchemaDto | null,
): number {
  const items = trialListSaveDatas();
  const newId = getNextId('save-datas');
  items.push({
    id: newId,
    ownerGoogleUserId: TRIAL_OWNER,
    displayOrder: payload.displayOrder,
    memo: payload.memo,
    replacedBySaveDataId: null,
    saveStorageType,
    gameSoftwareMasterId: payload.gameSoftwareMasterId,
    gameSoftwareId: payload.gameSoftwareId,
    gameConsoleId: payload.gameConsoleId,
    accountId: payload.accountId,
    memoryCardId: payload.memoryCardId,
    storyProgressDefinitionId: payload.storyProgressDefinitionId,
    extendedFields: createTrialExtendedFields(schema, payload.extendedFields),
    isDeleted: false,
    deleteReason: null,
  });
  writeList('save-datas', items);
  return newId;
}

export function trialUpdateSaveData(
  id: number,
  payload: UpdateSaveDataRequest,
  saveStorageType: SaveStorageType,
  schema: SaveDataSchemaDto | null,
): SaveDataDto {
  const items = trialListSaveDatas();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`SaveData #${id} not found`);
  items[idx] = {
    ...items[idx],
    displayOrder: payload.displayOrder,
    memo: payload.memo,
    saveStorageType,
    gameSoftwareMasterId: payload.gameSoftwareMasterId,
    gameSoftwareId: payload.gameSoftwareId,
    gameConsoleId: payload.gameConsoleId,
    accountId: payload.accountId,
    memoryCardId: payload.memoryCardId,
    storyProgressDefinitionId: payload.storyProgressDefinitionId,
    replacedBySaveDataId: payload.replacedBySaveDataId,
    extendedFields: createTrialExtendedFields(schema, payload.extendedFields),
  };
  writeList('save-datas', items);
  return items[idx];
}

export function trialDeleteSaveData(id: number, payload: {
  deleteReason: string | null;
  replacedBySaveDataId: number | null;
}): void {
  const items = trialListSaveDatas();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`SaveData #${id} not found`);
  items[idx] = {
    ...items[idx],
    isDeleted: true,
    deleteReason: payload.deleteReason,
    replacedBySaveDataId: payload.replacedBySaveDataId,
  };
  writeList('save-datas', items);
}

// ---------------------------------------------------------------------------
// 一括 lookup 構築（トライアル用）
// ---------------------------------------------------------------------------

export function buildTrialUserData(): Omit<ManagementLookups, keyof MasterLookups> {
  return {
    accounts: trialListAccounts(),
    gameConsoles: trialListGameConsoles(),
    gameSoftwares: trialListGameSoftwares(),
    memoryCards: trialListMemoryCards(),
    saveDatas: trialListSaveDatas(),
  };
}

export function trialGetResourceById(resourceKey: string, id: number): unknown {
  switch (resourceKey) {
    case 'accounts': return trialGetAccount(id);
    case 'game-consoles': return trialGetGameConsole(id);
    case 'game-softwares': return trialGetGameSoftware(id);
    case 'memory-cards': return trialGetMemoryCard(id);
    case 'save-datas': return trialGetSaveData(id);
    default: return undefined;
  }
}
