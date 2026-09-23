import { describe, expect, it } from 'vitest';

import {
  addTrackedCollectionRow,
  buildTrackedCollectionChangeSet,
  commitTrackedCollectionState,
  deleteTrackedCollectionRow,
  initializeTrackedCollectionState,
  reorderTrackedCollectionRows,
  rollbackTrackedCollectionState,
  updateTrackedCollectionRow,
} from './useTrackedCollection.helpers';

type DemoRow = {
  id: string;
  label: string;
  active: boolean;
  displayOrder: number;
};

const INITIAL_ROWS: DemoRow[] = [
  { id: '001', label: 'A', active: true, displayOrder: 1 },
  { id: '002', label: 'B', active: false, displayOrder: 2 },
  { id: '003', label: 'C', active: true, displayOrder: 3 },
  { id: '004', label: 'D', active: false, displayOrder: 4 },
];

describe('useTrackedCollection helpers', () => {
  it('tracks added rows and applies sequential order values', () => {
    const state = initializeTrackedCollectionState<DemoRow>({ data: INITIAL_ROWS, orderKey: 'displayOrder' });
    const currentRows = addTrackedCollectionRow(state.currentRows, {
      rowKey: 'id',
      orderKey: 'displayOrder',
      newRowTemplate: { label: '', active: false },
      template: { label: 'E' },
      createTempId: () => 'temp-1',
    });

    const changes = buildTrackedCollectionChangeSet({ ...state, currentRows }, 'id');

    expect(changes.addedRows).toHaveLength(1);
    expect(changes.addedRows[0]).toMatchObject({ id: 'temp-1', label: 'E', displayOrder: 5, _changeStatus: 'added' });
  });

  it('tracks field edits as modified rows', () => {
    const state = initializeTrackedCollectionState<DemoRow>({ data: INITIAL_ROWS, orderKey: 'displayOrder' });
    const currentRows = updateTrackedCollectionRow(state.currentRows, { label: 'B2' }, { rowKey: 'id', rowKeyValue: '002' });

    const changes = buildTrackedCollectionChangeSet({ ...state, currentRows }, 'id');

    expect(changes.modifiedRows).toEqual([
      expect.objectContaining({ id: '002', label: 'B2', _changeStatus: 'modified' }),
    ]);
  });

  it('tracks deleted baseline rows and resequences order values', () => {
    const state = initializeTrackedCollectionState<DemoRow>({ data: INITIAL_ROWS, orderKey: 'displayOrder' });
    const currentRows = deleteTrackedCollectionRow(state.currentRows, {
      rowKey: 'id',
      orderKey: 'displayOrder',
      rowKeyValue: '002',
    });

    const changes = buildTrackedCollectionChangeSet({ ...state, currentRows }, 'id');

    expect(changes.deletedRows).toEqual([
      expect.objectContaining({ id: '002', _changeStatus: 'deleted' }),
    ]);
    expect(changes.modifiedRows.map((row) => row.id)).toEqual(['003', '004']);
    expect(currentRows.map((row) => row.displayOrder)).toEqual([1, 2, 3]);
  });

  it('does not report deleted rows when a newly added row is removed', () => {
    const state = initializeTrackedCollectionState<DemoRow>({ data: INITIAL_ROWS, orderKey: 'displayOrder' });
    const withAddedRow = addTrackedCollectionRow(state.currentRows, {
      rowKey: 'id',
      orderKey: 'displayOrder',
      newRowTemplate: { label: '', active: false },
      template: { label: 'E' },
      createTempId: () => 'temp-1',
    });
    const currentRows = deleteTrackedCollectionRow(withAddedRow, {
      rowKey: 'id',
      orderKey: 'displayOrder',
      rowKeyValue: 'temp-1',
    });

    const changes = buildTrackedCollectionChangeSet({ ...state, currentRows }, 'id');

    expect(changes.addedRows).toHaveLength(0);
    expect(changes.deletedRows).toHaveLength(0);
    expect(changes.modifiedRows).toHaveLength(0);
  });

  it('reorders rows using explicit row keys', () => {
    const state = initializeTrackedCollectionState<DemoRow>({ data: INITIAL_ROWS, orderKey: 'displayOrder' });
    const currentRows = reorderTrackedCollectionRows(state.currentRows, {
      rowKey: 'id',
      orderKey: 'displayOrder',
      nextRowKeys: ['001', '004', '002', '003'],
    });

    expect(currentRows.map((row) => row.id)).toEqual(['001', '004', '002', '003']);
    expect(currentRows.map((row) => row.displayOrder)).toEqual([1, 2, 3, 4]);
  });

  it('commits and rolls back state snapshots', () => {
    const state = initializeTrackedCollectionState<DemoRow>({ data: INITIAL_ROWS, orderKey: 'displayOrder' });
    const editedRows = updateTrackedCollectionRow(state.currentRows, { label: 'B2' }, { rowKey: 'id', rowKeyValue: '002' });
    const committedState = commitTrackedCollectionState({ ...state, currentRows: editedRows });
    const committedChanges = buildTrackedCollectionChangeSet(committedState, 'id');

    expect(committedChanges.hasChanges).toBe(false);

    const deletedRows = deleteTrackedCollectionRow(committedState.currentRows, {
      rowKey: 'id',
      orderKey: 'displayOrder',
      rowKeyValue: '002',
    });
    const rolledBackState = rollbackTrackedCollectionState({ ...committedState, currentRows: deletedRows });

    expect(rolledBackState.currentRows).toEqual(committedState.baselineRows);
  });
});