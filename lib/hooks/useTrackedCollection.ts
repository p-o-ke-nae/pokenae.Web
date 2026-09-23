'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  addTrackedCollectionRow,
  buildTrackedCollectionChangeSet,
  commitTrackedCollectionState,
  deleteTrackedCollectionRow,
  initializeTrackedCollectionState,
  reorderTrackedCollectionRows,
  rollbackTrackedCollectionState,
  stripTrackedFields,
  updateTrackedCollectionRow,
  type TrackedCollectionChangeSet,
  type TrackedRow,
} from './useTrackedCollection.helpers';

export type {
  RowChangeStatus,
  TrackedCollectionChangeSet,
  TrackedCollectionState,
  TrackedRow,
} from './useTrackedCollection.helpers';

export interface UseTrackedCollectionReturn<T extends Record<string, unknown>> {
  rows: TrackedRow<T>[];
  addedRows: TrackedRow<T>[];
  modifiedRows: TrackedRow<T>[];
  deletedRows: TrackedRow<T>[];
  hasChanges: boolean;
  addRow: (template?: Partial<T>) => void;
  updateRow: (rowKeyValue: string, patch: Partial<T>) => void;
  deleteRow: (rowKeyValue: string) => void;
  reorderRows: (nextRowKeys: string[]) => void;
  commitChanges: () => void;
  rollbackChanges: () => void;
  getAddedRecords: () => T[];
  getModifiedRecords: () => T[];
  getDeletedRecords: () => T[];
  getChangeSet: () => {
    added: T[];
    modified: T[];
    deleted: T[];
  };
}

export function useTrackedCollection<T extends Record<string, unknown>>({
  data,
  rowKey,
  orderKey,
  newRowTemplate = {} as Partial<T>,
}: {
  data: T[];
  rowKey: keyof T & string;
  orderKey?: keyof T & string;
  newRowTemplate?: Partial<T>;
}): UseTrackedCollectionReturn<T> {
  const initialState = useMemo(
    () => initializeTrackedCollectionState<T>({ data, orderKey }),
    [data, orderKey],
  );
  const [state, setState] = useState(initialState);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  const changeSet = useMemo<TrackedCollectionChangeSet<T>>(
    () => buildTrackedCollectionChangeSet(state, rowKey),
    [rowKey, state],
  );

  const addRow = useCallback((template?: Partial<T>) => {
    setState((prev) => ({
      ...prev,
      currentRows: addTrackedCollectionRow(prev.currentRows, {
        rowKey,
        orderKey,
        newRowTemplate,
        template,
      }),
    }));
  }, [newRowTemplate, orderKey, rowKey]);

  const updateRow = useCallback((rowKeyValue: string, patch: Partial<T>) => {
    setState((prev) => ({
      ...prev,
      currentRows: updateTrackedCollectionRow(prev.currentRows, patch, {
        rowKey,
        rowKeyValue,
      }),
    }));
  }, [rowKey]);

  const deleteRow = useCallback((rowKeyValue: string) => {
    setState((prev) => ({
      ...prev,
      currentRows: deleteTrackedCollectionRow(prev.currentRows, {
        rowKey,
        orderKey,
        rowKeyValue,
      }),
    }));
  }, [orderKey, rowKey]);

  const reorderRows = useCallback((nextRowKeys: string[]) => {
    setState((prev) => ({
      ...prev,
      currentRows: reorderTrackedCollectionRows(prev.currentRows, {
        rowKey,
        orderKey,
        nextRowKeys,
      }),
    }));
  }, [orderKey, rowKey]);

  const commitChanges = useCallback(() => {
    setState((prev) => commitTrackedCollectionState(prev));
  }, []);

  const rollbackChanges = useCallback(() => {
    setState((prev) => rollbackTrackedCollectionState(prev));
  }, []);

  const getAddedRecords = useCallback(
    () => changeSet.addedRows.map((row) => omitTrackedFields(row)),
    [changeSet.addedRows],
  );
  const getModifiedRecords = useCallback(
    () => changeSet.modifiedRows.map((row) => omitTrackedFields(row)),
    [changeSet.modifiedRows],
  );
  const getDeletedRecords = useCallback(
    () => changeSet.deletedRows.map((row) => omitTrackedFields(row)),
    [changeSet.deletedRows],
  );
  const getChangeSet = useCallback(() => ({
    added: getAddedRecords(),
    modified: getModifiedRecords(),
    deleted: getDeletedRecords(),
  }), [getAddedRecords, getDeletedRecords, getModifiedRecords]);

  return {
    rows: changeSet.rows,
    addedRows: changeSet.addedRows,
    modifiedRows: changeSet.modifiedRows,
    deletedRows: changeSet.deletedRows,
    hasChanges: changeSet.hasChanges,
    addRow,
    updateRow,
    deleteRow,
    reorderRows,
    commitChanges,
    rollbackChanges,
    getAddedRecords,
    getModifiedRecords,
    getDeletedRecords,
    getChangeSet,
  };
}

export function omitTrackedFields<T extends Record<string, unknown>>(row: TrackedRow<T>): T {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _tempId, ...rest } = stripTrackedFields(row);
  return rest as T;
}