import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataTableColumn, SortState } from './index';

function getCellComparableValue<T extends Record<string, unknown>>(
  row: T,
  key: string,
  columns: DataTableColumn<T>[],
): string | number {
  const col = columns.find((column) => column.key === key);
  const raw = row[key];

  return col?.sortValue ? col.sortValue(raw, row) : String(raw ?? '');
}

export function processTableData<T extends Record<string, unknown>>({
  data,
  columns,
  filters,
  selectFilters,
  sortState,
  excludeSelectFilterKey,
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  filters: Record<string, string>;
  selectFilters: Partial<Record<string, string[]>>;
  sortState: SortState | null;
  excludeSelectFilterKey?: string;
}): T[] {
  let result = [...data];

  for (const [key, filterVal] of Object.entries(filters)) {
    if (!filterVal) continue;
    const lower = filterVal.toLowerCase();
    result = result.filter((row) => String(getCellComparableValue(row, key, columns)).toLowerCase().includes(lower));
  }

  for (const [key, selectedValues] of Object.entries(selectFilters)) {
    if (key === excludeSelectFilterKey || selectedValues == null) continue;
    if (selectedValues.length === 0) {
      result = [];
      break;
    }

    result = result.filter((row) => {
      const str = String(getCellComparableValue(row, key, columns));
      return selectedValues.includes(str);
    });
  }

  if (sortState) {
    const { key, direction } = sortState;
    result = [...result].sort((a, b) => {
      const av = getCellComparableValue(a, key, columns);
      const bv = getCellComparableValue(b, key, columns);
      let cmp: number;

      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      }

      return direction === 'asc' ? cmp : -cmp;
    });
  }

  return result;
}

export function buildSelectFilterOptions<T extends Record<string, unknown>>({
  data,
  columns,
  filters,
  selectFilters,
  sortState,
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  filters: Record<string, string>;
  selectFilters: Partial<Record<string, string[]>>;
  sortState: SortState | null;
}): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const col of columns) {
    if (!col.filterable || (col.filterMode ?? 'text') !== 'select') continue;

    const orderedRows = processTableData({
      data,
      columns,
      filters,
      selectFilters,
      sortState,
      excludeSelectFilterKey: col.key,
    });
    const seen = new Set<string>();
    const values: string[] = [];

    for (const row of orderedRows) {
      const value = String(getCellComparableValue(row, col.key, columns));
      if (seen.has(value)) continue;
      seen.add(value);
      values.push(value);
    }

    result[col.key] = values;
  }

  return result;
}

/**
 * DataTable のフィルタ・ソート処理を分離したカスタムフック。
 */
export function useDataTableProcessing<T extends Record<string, unknown>>({
  data,
  columns,
  sortStateProp,
  onSortChange,
  onFilteredDataChange,
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  sortStateProp?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  onFilteredDataChange?: (data: T[]) => void;
}) {
  const [internalSortState, setInternalSortState] = useState<SortState | null>(null);
  const effectiveSortState = sortStateProp !== undefined ? sortStateProp : internalSortState;

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectFilters, setSelectFilters] = useState<Partial<Record<string, string[]>>>({});

  const onFilteredDataChangeRef = useRef(onFilteredDataChange);
  useEffect(() => { onFilteredDataChangeRef.current = onFilteredDataChange; });

  const processedData = useMemo(() => {
    return processTableData({
      data,
      columns,
      filters,
      selectFilters,
      sortState: effectiveSortState,
    });
  }, [data, filters, selectFilters, effectiveSortState, columns]);

  useEffect(() => {
    onFilteredDataChangeRef.current?.(processedData);
  }, [processedData]);

  const handleSortClick = useCallback(
    (key: string, didDragRef: React.MutableRefObject<boolean>) => {
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }
      const col = columns.find(c => c.key === key);
      if (!col?.sortable) return;
      let next: SortState | null;
      if (!effectiveSortState || effectiveSortState.key !== key) {
        next = { key, direction: 'asc' };
      } else if (effectiveSortState.direction === 'asc') {
        next = { key, direction: 'desc' };
      } else {
        next = null;
      }
      if (onSortChange) {
        onSortChange(next);
      } else {
        setInternalSortState(next);
      }
    },
    [effectiveSortState, onSortChange, columns],
  );

  return {
    processedData,
    effectiveSortState,
    filters,
    setFilters,
    selectFilters,
    setSelectFilters,
    handleSortClick,
  };
}
