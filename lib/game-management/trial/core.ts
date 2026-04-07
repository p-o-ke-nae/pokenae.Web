/**
 * トライアルモード用 localStorage 基盤
 */

// ---------------------------------------------------------------------------
// ストレージキーとバージョン
// ---------------------------------------------------------------------------

const NAMESPACE = 'pokenae_trial_v1';

export type CollectionKey =
  | 'accounts'
  | 'game-consoles'
  | 'game-softwares'
  | 'memory-cards'
  | 'save-datas';

type DisplayOrderedItem = {
  id: number;
  displayOrder?: number | null;
};

function storageKey(collection: CollectionKey): string {
  return `${NAMESPACE}:${collection}`;
}

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

export function readList<T>(collection: CollectionKey): T[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(storageKey(collection));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function writeList<T>(collection: CollectionKey, items: T[]): void {
  if (!isStorageAvailable()) return;
  localStorage.setItem(storageKey(collection), JSON.stringify(items));
}

export function getNextId(collection: CollectionKey): number {
  if (!isStorageAvailable()) return Date.now();
  const raw = localStorage.getItem(nextIdKey(collection));
  const nextId = raw ? Number(raw) + 1 : 1;
  localStorage.setItem(nextIdKey(collection), String(nextId));
  return nextId;
}

function normalizeDisplayOrder<T extends DisplayOrderedItem>(item: T): Omit<T, 'displayOrder'> & { displayOrder: number } {
  const displayOrder = typeof item.displayOrder === 'number' && Number.isInteger(item.displayOrder) && item.displayOrder > 0
    ? item.displayOrder
    : item.id;
  return { ...item, displayOrder };
}

export function sortByDisplayOrder<T extends { id: number; displayOrder: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id);
}

export function readDisplayOrderedList<T extends DisplayOrderedItem>(collection: CollectionKey): Array<Omit<T, 'displayOrder'> & { displayOrder: number }> {
  return sortByDisplayOrder(readList<T>(collection).map((item) => normalizeDisplayOrder(item)));
}

// ---------------------------------------------------------------------------
// ダミー所有者 ID
// ---------------------------------------------------------------------------

export const TRIAL_OWNER = 'trial-user';

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

export function hasTrialData(): boolean {
  if (typeof window === 'undefined' || !isStorageAvailable()) return false;
  return ALL_COLLECTIONS.some((key) => readList(key).length > 0);
}

export function trialRemoveByIds(collection: CollectionKey, ids: Set<number>): void {
  const items = readList<{ id: number }>(collection);
  const remaining = items.filter((item) => !ids.has(item.id));
  if (remaining.length === 0) {
    if (isStorageAvailable()) {
      localStorage.removeItem(storageKey(collection));
      localStorage.removeItem(nextIdKey(collection));
    }
  } else {
    writeList(collection, remaining);
  }
}

export function trialClearAll(): void {
  if (typeof window === 'undefined' || !isStorageAvailable()) return;
  for (const key of ALL_COLLECTIONS) {
    localStorage.removeItem(storageKey(key));
    localStorage.removeItem(nextIdKey(key));
  }
}

// ---------------------------------------------------------------------------
// 表示順一括更新
// ---------------------------------------------------------------------------

const RESOURCE_TO_COLLECTION: Record<string, CollectionKey | undefined> = {
  accounts: 'accounts',
  'game-consoles': 'game-consoles',
  'game-softwares': 'game-softwares',
  'memory-cards': 'memory-cards',
  'save-datas': 'save-datas',
};

export function trialBatchUpdateDisplayOrder(
  resourceKey: string,
  orderedIds: number[],
): void {
  const collection = RESOURCE_TO_COLLECTION[resourceKey];
  if (!collection) {
    throw new Error(`Trial batch update is not supported for resource: ${resourceKey}`);
  }
  const items = readList<{ id: number; displayOrder?: number | null }>(collection);
  const orderMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
  const updated = items.map((item) => {
    const newOrder = orderMap.get(item.id);
    if (newOrder !== undefined) {
      return { ...item, displayOrder: newOrder };
    }
    return item;
  });
  writeList(collection, updated);
}
