/**
 * トライアルモード用 localStorage リポジトリ
 *
 * 未ログイン時に、ゲームライブラリの全5リソース（accounts, game-consoles,
 * game-softwares, memory-cards, save-datas）をブラウザ内で管理する。
 * DTO 互換の構造体を保持し、公開マスタ API と組み合わせて利用する。
 */

import type {
  AccountDto,
  CreateMemoryCardRequest,
  CreateSaveDataRequest,
  GameConsoleDto,
  GameSoftwareDto,
  GameSoftwareVariant,
  ManagementLookups,
  MasterLookups,
  MemoryCardCapacity,
  MemoryCardDto,
  SaveDataDto,
  SaveDataSchemaDto,
  SaveStorageType,
} from '@/lib/game-management/types';
import { createTrialExtendedFields } from '@/lib/game-management/save-data-fields';

// ---------------------------------------------------------------------------
// ストレージキーとバージョン
// ---------------------------------------------------------------------------

const NAMESPACE = 'pokenae_trial_v1';

type CollectionKey =
  | 'accounts'
  | 'game-consoles'
  | 'game-softwares'
  | 'memory-cards'
  | 'save-datas';

function storageKey(collection: CollectionKey): string {
  return `${NAMESPACE}:${collection}`;
}

type TrialSaveDataStorageRecord = Omit<SaveDataDto, 'gameSoftwareMasterId' | 'gameSoftwareId'> & {
  gameSoftwareMasterId?: number;
  gameSoftwareId: number | null;
};

function nextIdKey(collection: CollectionKey): string {
  return `${NAMESPACE}:${collection}:nextId`;
}

// ---------------------------------------------------------------------------
// 低レベル localStorage ヘルパー
// ---------------------------------------------------------------------------

function isStorageAvailable(): boolean {
  try {
    const testKey = `${NAMESPACE}:__test__`;
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function readList<T>(collection: CollectionKey): T[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(storageKey(collection));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(collection: CollectionKey, items: T[]): void {
  if (!isStorageAvailable()) return;
  localStorage.setItem(storageKey(collection), JSON.stringify(items));
}

function getNextId(collection: CollectionKey): number {
  if (!isStorageAvailable()) return Date.now();
  const raw = localStorage.getItem(nextIdKey(collection));
  const nextId = raw ? Number(raw) + 1 : 1;
  localStorage.setItem(nextIdKey(collection), String(nextId));
  return nextId;
}

// ---------------------------------------------------------------------------
// ダミー所有者 ID
// ---------------------------------------------------------------------------

const TRIAL_OWNER = 'trial-user';

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export function trialListAccounts(): AccountDto[] {
  return readList<AccountDto>('accounts');
}

export function trialGetAccount(id: number): AccountDto | undefined {
  return trialListAccounts().find((item) => item.id === id);
}

export function trialCreateAccount(payload: {
  label: string | null;
  memo: string | null;
  gameConsoleCategoryIds: number[] | null;
}): number {
  const items = trialListAccounts();
  const newId = getNextId('accounts');
  items.push({
    id: newId,
    ownerGoogleUserId: TRIAL_OWNER,
    label: payload.label,
    memo: payload.memo,
    gameConsoleCategoryIds: payload.gameConsoleCategoryIds ?? [],
    isDeleted: false,
  });
  writeList('accounts', items);
  return newId;
}

export function trialUpdateAccount(id: number, payload: {
  label: string | null;
  memo: string | null;
  gameConsoleCategoryIds: number[] | null;
}): AccountDto {
  const items = trialListAccounts();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`Account #${id} not found`);
  items[idx] = {
    ...items[idx],
    label: payload.label,
    memo: payload.memo,
    gameConsoleCategoryIds: payload.gameConsoleCategoryIds ?? [],
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
  return readList<GameConsoleDto>('game-consoles');
}

export function trialGetGameConsole(id: number): GameConsoleDto | undefined {
  return trialListGameConsoles().find((item) => item.id === id);
}

export function trialCreateGameConsole(payload: {
  gameConsoleMasterId: number;
  gameConsoleEditionMasterId: number | null;
  label: string | null;
  memo: string | null;
}): number {
  const items = trialListGameConsoles();
  const newId = getNextId('game-consoles');
  items.push({
    id: newId,
    gameConsoleMasterId: payload.gameConsoleMasterId,
    gameConsoleEditionMasterId: payload.gameConsoleEditionMasterId,
    ownerGoogleUserId: TRIAL_OWNER,
    label: payload.label,
    memo: payload.memo,
    isDeleted: false,
  });
  writeList('game-consoles', items);
  return newId;
}

export function trialUpdateGameConsole(id: number, payload: {
  label: string | null;
  memo: string | null;
}): GameConsoleDto {
  const items = trialListGameConsoles();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`GameConsole #${id} not found`);
  items[idx] = { ...items[idx], label: payload.label, memo: payload.memo };
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
  return readList<GameSoftwareDto>('game-softwares');
}

export function trialGetGameSoftware(id: number): GameSoftwareDto | undefined {
  return trialListGameSoftwares().find((item) => item.id === id);
}

export function trialCreateGameSoftware(payload: {
  gameSoftwareMasterId: number;
  variant: GameSoftwareVariant | null;
  label: string | null;
  memo: string | null;
}): number {
  const items = trialListGameSoftwares();
  const newId = getNextId('game-softwares');
  items.push({
    id: newId,
    gameSoftwareMasterId: payload.gameSoftwareMasterId,
    variant: payload.variant,
    ownerGoogleUserId: TRIAL_OWNER,
    label: payload.label,
    memo: payload.memo,
    isDeleted: false,
  });
  writeList('game-softwares', items);
  return newId;
}

export function trialUpdateGameSoftware(id: number, payload: {
  variant: GameSoftwareVariant | null;
  label: string | null;
  memo: string | null;
}): GameSoftwareDto {
  const items = trialListGameSoftwares();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`GameSoftware #${id} not found`);
  items[idx] = { ...items[idx], variant: payload.variant, label: payload.label, memo: payload.memo };
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
  return readList<MemoryCardDto>('memory-cards');
}

export function trialGetMemoryCard(id: number): MemoryCardDto | undefined {
  return trialListMemoryCards().find((item) => item.id === id);
}

export function trialCreateMemoryCard(payload: CreateMemoryCardRequest): number {
  const items = trialListMemoryCards();
  const newId = getNextId('memory-cards');
  items.push({
    id: newId,
    capacity: payload.capacity,
    ownerGoogleUserId: TRIAL_OWNER,
    label: payload.label,
    memo: payload.memo,
    isDeleted: false,
  });
  writeList('memory-cards', items);
  return newId;
}

export function trialUpdateMemoryCard(id: number, payload: {
  capacity: MemoryCardCapacity;
  label: string | null;
  memo: string | null;
}): MemoryCardDto {
  const items = trialListMemoryCards();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`MemoryCard #${id} not found`);
  items[idx] = {
    ...items[idx],
    capacity: payload.capacity,
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

export function trialListSaveDatas(): SaveDataDto[] {
  const gameSoftwares = trialListGameSoftwares();
  return readList<TrialSaveDataStorageRecord>('save-datas').map((item) => ({
    ...item,
    gameSoftwareMasterId: item.gameSoftwareMasterId ?? gameSoftwares.find((software) => software.id === item.gameSoftwareId)?.gameSoftwareMasterId ?? 0,
    gameSoftwareId: item.saveStorageType === 0 ? (item.gameSoftwareId ?? null) : null,
  }));
}

export function trialGetSaveData(id: number): SaveDataDto | undefined {
  return trialListSaveDatas().find((item) => item.id === id);
}

export function trialCreateSaveData(payload: {
  gameSoftwareMasterId: number;
  gameSoftwareId: number | null;
  gameConsoleId: number | null;
  accountId: number | null;
  memoryCardId: number | null;
  storyProgressDefinitionId: number | null;
  extendedFields: CreateSaveDataRequest['extendedFields'];
}, saveStorageType: SaveStorageType, schema: SaveDataSchemaDto | null): number {
  const items = trialListSaveDatas();
  const newId = getNextId('save-datas');
  items.push({
    id: newId,
    ownerGoogleUserId: TRIAL_OWNER,
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

export function trialUpdateSaveData(id: number, payload: {
  gameSoftwareMasterId: number;
  gameSoftwareId: number | null;
  gameConsoleId: number | null;
  accountId: number | null;
  memoryCardId: number | null;
  storyProgressDefinitionId: number | null;
  replacedBySaveDataId: number | null;
  extendedFields: CreateSaveDataRequest['extendedFields'];
}, saveStorageType: SaveStorageType, schema: SaveDataSchemaDto | null): SaveDataDto {
  const items = trialListSaveDatas();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) throw new Error(`SaveData #${id} not found`);
  items[idx] = {
    ...items[idx],
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
// データ存在確認・一括操作
// ---------------------------------------------------------------------------

const ALL_COLLECTIONS: CollectionKey[] = [
  'accounts',
  'game-consoles',
  'game-softwares',
  'memory-cards',
  'save-datas',
];

/** localStorage に trial データが 1 件でも存在するか */
export function hasTrialData(): boolean {
  if (typeof window === 'undefined' || !isStorageAvailable()) return false;
  return ALL_COLLECTIONS.some((key) => readList(key).length > 0);
}

/** 指定リソースから指定 ID 群だけを削除する */
export function trialRemoveByIds(collection: CollectionKey, ids: Set<number>): void {
  const items = readList<{ id: number }>(collection);
  const remaining = items.filter((item) => !ids.has(item.id));
  if (remaining.length === 0) {
    // コレクションが空なら key ごと削除
    if (isStorageAvailable()) {
      localStorage.removeItem(storageKey(collection));
      localStorage.removeItem(nextIdKey(collection));
    }
  } else {
    writeList(collection, remaining);
  }
}

/** trial 名前空間を全削除する */
export function trialClearAll(): void {
  if (typeof window === 'undefined' || !isStorageAvailable()) return;
  for (const key of ALL_COLLECTIONS) {
    localStorage.removeItem(storageKey(key));
    localStorage.removeItem(nextIdKey(key));
  }
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
