import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearSessionCache,
  clearSessionCacheByPrefix,
  readSessionCache,
  writeSessionCache,
} from './session-cache';

class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  quotaExceeded = false;

  get length() {
    return this.items.size;
  }

  clear() {
    this.items.clear();
  }

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.items.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.items.delete(key);
  }

  setItem(key: string, value: string) {
    if (this.quotaExceeded) {
      this.quotaExceeded = false;
      throw new Error('QuotaExceededError');
    }
    this.items.set(key, value);
  }
}

describe('session-cache', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('window', { sessionStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores a value written for the same owner', () => {
    writeSessionCache('game-management:lookups:admin', 'user@example.com', { rows: [1, 2] });

    expect(readSessionCache('game-management:lookups:admin', 'user@example.com')).toEqual({ rows: [1, 2] });
  });

  it('discards a value cached for another user', () => {
    writeSessionCache('game-management:lookups:admin', 'user@example.com', { rows: [1] });

    expect(readSessionCache('game-management:lookups:admin', 'other@example.com')).toBeNull();
    expect(readSessionCache('game-management:lookups:admin', 'user@example.com')).toBeNull();
  });

  it('clears only entries matching the prefix', () => {
    writeSessionCache('game-management:lookups:a', '', 1);
    writeSessionCache('game-management:sort', '', 2);
    storage.setItem('unrelated', 'keep');

    clearSessionCacheByPrefix('game-management:lookups:');

    expect(readSessionCache('game-management:lookups:a', '')).toBeNull();
    expect(readSessionCache('game-management:sort', '')).toBe(2);
    expect(storage.getItem('unrelated')).toBe('keep');

    clearSessionCache();
    expect(readSessionCache('game-management:sort', '')).toBeNull();
    expect(storage.getItem('unrelated')).toBe('keep');
  });

  it('retries once after clearing old entries when storage is full', () => {
    writeSessionCache('old', '', 'stale');
    storage.quotaExceeded = true;

    writeSessionCache('new', '', 'fresh');

    expect(readSessionCache('old', '')).toBeNull();
    expect(readSessionCache('new', '')).toBe('fresh');
  });

  it('returns null when storage is unavailable', () => {
    vi.unstubAllGlobals();

    expect(readSessionCache('missing', '')).toBeNull();
    expect(() => writeSessionCache('missing', '', 1)).not.toThrow();
  });
});
