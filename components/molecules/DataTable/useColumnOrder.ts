import { useCallback, useMemo, useRef, useState } from 'react';
import type { DataTableColumn } from './index';

/**
 * 列順序管理とヘッダーのドラッグ＆ドロップ。
 */
export function useColumnOrder<T extends Record<string, unknown>>({
  columns,
  columnOrderProp,
  onColumnOrderChange,
}: {
  columns: DataTableColumn<T>[];
  columnOrderProp?: string[];
  onColumnOrderChange?: (order: string[]) => void;
}) {
  const [columnOrderOverride, setColumnOrderOverride] = useState<string[] | null>(null);

  const effectiveColumnOrder = useMemo(() => {
    const defaultOrder = columns.map(c => c.key);
    const source = columnOrderProp ?? columnOrderOverride;
    if (!source) return defaultOrder;
    const validSet = new Set(defaultOrder);
    const valid = source.filter(k => validSet.has(k));
    const added = defaultOrder.filter(k => !source.includes(k));
    return [...valid, ...added];
  }, [columns, columnOrderProp, columnOrderOverride]);

  const orderedColumns = useMemo(
    () =>
      effectiveColumnOrder
        .map(key => columns.find(c => c.key === key))
        .filter((c): c is DataTableColumn<T> => c !== undefined),
    [effectiveColumnOrder, columns],
  );

  const draggedKey = useRef<string | null>(null);
  const didDrag = useRef(false);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, key: string) => {
    didDrag.current = true;
    draggedKey.current = key;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverKey(key);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverKey(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetKey: string) => {
      e.preventDefault();
      setDragOverKey(null);
      const sourceKey = draggedKey.current;
      if (!sourceKey || sourceKey === targetKey) return;
      const newOrder = [...effectiveColumnOrder];
      const fromIdx = newOrder.indexOf(sourceKey);
      const toIdx = newOrder.indexOf(targetKey);
      if (fromIdx === -1 || toIdx === -1) return;
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, sourceKey);
      if (onColumnOrderChange) {
        onColumnOrderChange(newOrder);
      } else {
        setColumnOrderOverride(newOrder);
      }
      draggedKey.current = null;
    },
    [effectiveColumnOrder, onColumnOrderChange],
  );

  const handleDragEnd = useCallback(() => {
    setDragOverKey(null);
    draggedKey.current = null;
  }, []);

  return {
    effectiveColumnOrder,
    orderedColumns,
    dragOverKey,
    didDrag,
    columnDrag: {
      handleDragStart,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleDragEnd,
    },
  };
}
