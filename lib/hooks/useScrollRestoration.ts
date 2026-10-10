import { useEffect, useRef } from 'react';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';

/**
 * ウィンドウのスクロール位置を sessionStorage に保持し、ready になった時点で一度だけ復元する。
 * iOS がバックグラウンドのタブを破棄して再読込した場合でも、一覧の閲覧位置へ戻せるようにする。
 */
export function useScrollRestoration(key: string, ready: boolean): void {
  const restoredRef = useRef(false);

  useEffect(() => {
    restoredRef.current = false;
  }, [key]);

  useEffect(() => {
    if (!ready || restoredRef.current || typeof window === 'undefined') return;
    restoredRef.current = true;
    const stored = readSessionCache<number>(`${key}:scrollY`, '');
    if (stored == null || stored <= 0) return;
    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: stored });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [key, ready]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timeoutId: number | null = null;
    const save = () => {
      if (!restoredRef.current) return;
      writeSessionCache(`${key}:scrollY`, '', Math.round(window.scrollY));
    };
    const handleScroll = () => {
      if (timeoutId != null) return;
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        save();
      }, 200);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') save();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [key]);
}
