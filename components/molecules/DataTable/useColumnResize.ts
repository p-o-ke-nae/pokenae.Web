import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DATA_TABLE_DEFAULT_MAX_COLUMN_WIDTH_PX,
  DATA_TABLE_MIN_COLUMN_WIDTH_PX,
} from './constants';

type UseColumnResizeOptions = {
  minWidthPx?: number;
  maxWidthPx?: number;
};

function clampWidth(width: number, minWidthPx: number, maxWidthPx: number): number {
  return Math.min(maxWidthPx, Math.max(minWidthPx, width));
}

/**
 * 列幅リサイズのマウス操作ハンドラ。
 */
export function useColumnResize({
  minWidthPx = DATA_TABLE_MIN_COLUMN_WIDTH_PX,
  maxWidthPx = DATA_TABLE_DEFAULT_MAX_COLUMN_WIDTH_PX,
}: UseColumnResizeOptions = {}) {
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const colWidthsRef = useRef(colWidths);
  useEffect(() => { colWidthsRef.current = colWidths; }, [colWidths]);

  const resizeCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => { resizeCleanupRef.current?.(); }, []);

  const setColumnWidth = useCallback((key: string, width: number) => {
    const clampedWidth = clampWidth(width, minWidthPx, maxWidthPx);
    setColWidths((prev) => ({ ...prev, [key]: clampedWidth }));
  }, [maxWidthPx, minWidthPx]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).closest('th') as HTMLElement | null;
    if (!th) return;
    const startX = e.clientX;
    const startWidth = colWidthsRef.current[key] ?? th.offsetWidth;

    const handleMove = (ev: MouseEvent) => {
      setColumnWidth(key, startWidth + (ev.clientX - startX));
    };
    const cleanup = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUpFn);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      resizeCleanupRef.current = null;
    };
    const handleUpFn = () => cleanup();
    resizeCleanupRef.current = cleanup;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUpFn);
  }, [setColumnWidth]);

  return { colWidths, setColumnWidth, handleResizeMouseDown, minWidthPx, maxWidthPx };
}
