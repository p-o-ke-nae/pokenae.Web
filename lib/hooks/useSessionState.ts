import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

/**
 * sessionStorage に保持する useState。
 * 復元はマウント後に行うため、SSR とハイドレーション時の不一致を起こさない。
 * key が undefined の場合は通常の useState と同じ。
 * 復元完了を待つ必要がある処理は、この hook より後に宣言した effect で判定する（effect は宣言順に実行される）。
 */
export function useSessionState<T>(key: string | undefined, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);
  const initialValueRef = useRef(initialValue);
  const restoredKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!key) return;
    const isKeyChange = restoredKeyRef.current !== undefined && restoredKeyRef.current !== key;
    restoredKeyRef.current = key;
    const stored = readSessionCache<T>(key, '');
    // 外部ストレージ（sessionStorage）からの復元はハイドレーション後に行う必要がある
    /* eslint-disable react-hooks/set-state-in-effect */
    if (stored !== null) {
      setValue(stored);
    } else if (isKeyChange) {
      setValue(initialValueRef.current);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [key]);

  const setAndPersist = useCallback<Dispatch<SetStateAction<T>>>((update) => {
    setValue((previous) => {
      const next = typeof update === 'function' ? (update as (prev: T) => T)(previous) : update;
      if (key) {
        writeSessionCache(key, '', next);
      }
      return next;
    });
  }, [key]);

  return [value, setAndPersist];
}
