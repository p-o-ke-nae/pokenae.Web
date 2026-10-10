/**
 * 画面の表示状態をタブ単位（sessionStorage）で保持するキャッシュ。
 * iOS などでタブが破棄・再生成されても、手動の再読込や保存操作までは前回の一覧を表示し続ける。
 * アクセストークン等の機密情報は保存しないこと。
 */

const CACHE_PREFIX = 'pokenae:view-cache:v1:';

type CacheEnvelope<T> = {
  owner: string;
  savedAt: number;
  value: T;
};

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readSessionCache<T>(key: string, owner: string): T | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    if (!envelope || envelope.owner !== owner) {
      storage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return envelope.value;
  } catch {
    return null;
  }
}

export function writeSessionCache<T>(key: string, owner: string, value: T): void {
  const storage = getStorage();
  if (!storage) return;
  const envelope: CacheEnvelope<T> = { owner, savedAt: Date.now(), value };
  try {
    storage.setItem(CACHE_PREFIX + key, JSON.stringify(envelope));
  } catch {
    // 容量超過時は古いキャッシュを捨てて一度だけ再試行する
    clearSessionCache();
    try {
      storage.setItem(CACHE_PREFIX + key, JSON.stringify(envelope));
    } catch {
      // キャッシュは表示継続のための補助なので失敗しても無視する
    }
  }
}

export function removeSessionCache(key: string): void {
  try {
    getStorage()?.removeItem(CACHE_PREFIX + key);
  } catch {
    // ignore
  }
}

export function clearSessionCacheByPrefix(prefix: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(CACHE_PREFIX + prefix)) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearSessionCache(): void {
  clearSessionCacheByPrefix('');
}
