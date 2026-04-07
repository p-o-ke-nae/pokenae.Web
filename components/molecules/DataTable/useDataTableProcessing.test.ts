import { describe, expect, it } from 'vitest';
import { buildSelectFilterOptions } from './useDataTableProcessing';
import type { DataTableColumn, SortState } from './index';

type Row = {
  id: number;
  name: string;
  status: string;
  category: string;
};

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: '名前', sortable: true },
  { key: 'status', header: '状態', filterable: true, filterMode: 'select' },
  { key: 'category', header: 'カテゴリ', filterable: true, filterMode: 'select' },
];

const rows: Row[] = [
  { id: 1, name: '3', status: '完了', category: 'A' },
  { id: 2, name: '1', status: '保留', category: 'B' },
  { id: 3, name: '2', status: '進行中', category: 'A' },
  { id: 4, name: '4', status: '保留', category: 'C' },
];

describe('buildSelectFilterOptions', () => {
  it('keeps options in the current displayed row order', () => {
    const sortState: SortState = { key: 'name', direction: 'asc' };

    const options = buildSelectFilterOptions({
      data: rows,
      columns,
      filters: {},
      selectFilters: {},
      sortState,
    });

    expect(options.status).toEqual(['保留', '進行中', '完了']);
    expect(options.category).toEqual(['B', 'A', 'C']);
  });

  it('uses other active filters but ignores the current column filter for ordering', () => {
    const sortState: SortState = { key: 'name', direction: 'asc' };

    const options = buildSelectFilterOptions({
      data: rows,
      columns,
      filters: {},
      selectFilters: {
        status: ['保留'],
        category: ['A', 'B'],
      },
      sortState,
    });

    expect(options.status).toEqual(['保留', '進行中', '完了']);
    expect(options.category).toEqual(['B', 'C']);
  });

  it('respects text filters when building option order', () => {
    const sortState: SortState = { key: 'name', direction: 'asc' };

    const options = buildSelectFilterOptions({
      data: rows,
      columns,
      filters: { name: '1' },
      selectFilters: {},
      sortState,
    });

    expect(options.status).toEqual(['保留']);
    expect(options.category).toEqual(['B']);
  });
});