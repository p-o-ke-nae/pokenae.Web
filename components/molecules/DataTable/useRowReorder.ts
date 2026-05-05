import { useCallback, useRef, useState } from 'react';

/**
 * 行ドラッグ＆ドロップによる並び替え。
 */
export function useRowReorder({
  onRowMove,
}: {
  onRowMove?: (fromIndex: number, toIndex: number) => void;
}) {
  const draggedRowIndex = useRef<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);

  const handleRowDragStart = useCallback((e: React.DragEvent, rowIndex: number) => {
    draggedRowIndex.current = rowIndex;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(rowIndex));
  }, []);

  const handleRowDragOver = useCallback((e: React.DragEvent, rowIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRowIndex(rowIndex);
  }, []);

  const handleRowDragEnter = useCallback((e: React.DragEvent, rowIndex: number) => {
    e.preventDefault();
    setDragOverRowIndex(rowIndex);
  }, []);

  const handleRowDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      setDragOverRowIndex(null);
      const sourceIndex = draggedRowIndex.current;
      if (sourceIndex === null || sourceIndex === targetIndex) return;
      onRowMove?.(sourceIndex, targetIndex);
      draggedRowIndex.current = null;
    },
    [onRowMove],
  );

  const handleRowDragEnd = useCallback(() => {
    setDragOverRowIndex(null);
    draggedRowIndex.current = null;
  }, []);

  return {
    dragOverRowIndex,
    rowDrag: {
      handleRowDragStart,
      handleRowDragOver,
      handleRowDragEnter,
      handleRowDrop,
      handleRowDragEnd,
    },
  };
}
