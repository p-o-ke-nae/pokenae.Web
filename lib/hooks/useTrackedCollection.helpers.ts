export type RowChangeStatus = 'added' | 'modified' | 'deleted';

export type TrackedRow<T extends Record<string, unknown>> = T & {
  _changeStatus?: RowChangeStatus;
  _tempId?: string;
};

export type TrackedCollectionState<T extends Record<string, unknown>> = {
  baselineRows: TrackedRow<T>[];
  currentRows: TrackedRow<T>[];
};

export type TrackedCollectionChangeSet<T extends Record<string, unknown>> = {
  rows: TrackedRow<T>[];
  addedRows: TrackedRow<T>[];
  modifiedRows: TrackedRow<T>[];
  deletedRows: TrackedRow<T>[];
  hasChanges: boolean;
};

type CollectionRowKey<T extends Record<string, unknown>> = keyof T & string;
type CollectionOrderKey<T extends Record<string, unknown>> = (keyof T & string) | undefined;

type AddRowOptions<T extends Record<string, unknown>> = {
  rowKey: CollectionRowKey<T>;
  orderKey?: CollectionOrderKey<T>;
  newRowTemplate?: Partial<T>;
  template?: Partial<T>;
  createTempId?: () => string;
};

type RowMutationOptions<T extends Record<string, unknown>> = {
  rowKey: CollectionRowKey<T>;
  orderKey?: CollectionOrderKey<T>;
  rowKeyValue: string;
};

type ReorderRowsOptions<T extends Record<string, unknown>> = {
  rowKey: CollectionRowKey<T>;
  orderKey?: CollectionOrderKey<T>;
  nextRowKeys: string[];
};

export function initializeTrackedCollectionState<T extends Record<string, unknown>>({
  data,
  orderKey,
}: {
  data: T[];
  orderKey?: CollectionOrderKey<T>;
}): TrackedCollectionState<T> {
  const initializedRows = sortRowsForDisplay(
    data.map((row) => stripTrackedFields(row as TrackedRow<T>)),
    orderKey,
  );

  return {
    baselineRows: initializedRows,
    currentRows: initializedRows,
  };
}

export function addTrackedCollectionRow<T extends Record<string, unknown>>(
  rows: TrackedRow<T>[],
  { rowKey, orderKey, newRowTemplate, template, createTempId = defaultCreateTempId }: AddRowOptions<T>,
): TrackedRow<T>[] {
  const tempId = createTempId();
  const nextRows = [
    ...rows.map((row) => stripTrackedFields(row)),
    {
      ...newRowTemplate,
      ...template,
      [rowKey]: tempId,
      _tempId: tempId,
    } as TrackedRow<T>,
  ];

  return applySequentialOrder(nextRows, orderKey);
}

export function updateTrackedCollectionRow<T extends Record<string, unknown>>(
  rows: TrackedRow<T>[],
  patch: Partial<T>,
  { rowKey, rowKeyValue }: Omit<RowMutationOptions<T>, 'orderKey'>,
): TrackedRow<T>[] {
  return rows.map((row) => {
    if (getRowIdentifier(row, rowKey) !== rowKeyValue) {
      return row;
    }

    return {
      ...row,
      ...patch,
    } as TrackedRow<T>;
  });
}

export function deleteTrackedCollectionRow<T extends Record<string, unknown>>(
  rows: TrackedRow<T>[],
  { rowKey, orderKey, rowKeyValue }: RowMutationOptions<T>,
): TrackedRow<T>[] {
  const nextRows = rows.filter((row) => getRowIdentifier(row, rowKey) !== rowKeyValue);
  return applySequentialOrder(nextRows, orderKey);
}

export function reorderTrackedCollectionRows<T extends Record<string, unknown>>(
  rows: TrackedRow<T>[],
  { rowKey, orderKey, nextRowKeys }: ReorderRowsOptions<T>,
): TrackedRow<T>[] {
  const rowMap = new Map(rows.map((row) => [getRowIdentifier(row, rowKey), stripTrackedFields(row)]));
  const orderedRows: TrackedRow<T>[] = [];
  const seenKeys = new Set<string>();

  for (const key of nextRowKeys) {
    const row = rowMap.get(key);
    if (!row) {
      continue;
    }

    orderedRows.push(row);
    seenKeys.add(key);
  }

  for (const row of rows) {
    const key = getRowIdentifier(row, rowKey);
    if (!seenKeys.has(key)) {
      orderedRows.push(stripTrackedFields(row));
    }
  }

  return applySequentialOrder(orderedRows, orderKey);
}

export function buildTrackedCollectionChangeSet<T extends Record<string, unknown>>(
  state: TrackedCollectionState<T>,
  rowKey: CollectionRowKey<T>,
): TrackedCollectionChangeSet<T> {
  const baselineEntries = state.baselineRows.map((row, index) => {
    const cleanRow = stripTrackedFields(row);
    return [getRowIdentifier(cleanRow, rowKey), { row: cleanRow, index }] as const;
  });
  const currentEntries = state.currentRows.map((row, index) => {
    const cleanRow = stripTrackedFields(row);
    return [getRowIdentifier(cleanRow, rowKey), { row: cleanRow, index }] as const;
  });

  const baselineMap = new Map(baselineEntries);
  const currentMap = new Map(currentEntries);

  const addedRows: TrackedRow<T>[] = [];
  const modifiedRows: TrackedRow<T>[] = [];

  const rows = state.currentRows.map((row, currentIndex) => {
    const cleanRow = stripTrackedFields(row);
    const key = getRowIdentifier(cleanRow, rowKey);
    const baselineEntry = baselineMap.get(key);

    if (!baselineEntry) {
      const addedRow = withChangeStatus(cleanRow, 'added');
      addedRows.push(addedRow);
      return addedRow;
    }

    const contentChanged = !areRowsEquivalent(baselineEntry.row, cleanRow);
    const orderChanged = baselineEntry.index !== currentIndex;

    if (contentChanged || orderChanged) {
      const modifiedRow = withChangeStatus(cleanRow, 'modified');
      modifiedRows.push(modifiedRow);
      return modifiedRow;
    }

    return cleanRow;
  });

  const deletedRows = state.baselineRows.flatMap((row) => {
    const cleanRow = stripTrackedFields(row);
    const key = getRowIdentifier(cleanRow, rowKey);
    return currentMap.has(key) ? [] : [withChangeStatus(cleanRow, 'deleted')];
  });

  return {
    rows,
    addedRows,
    modifiedRows,
    deletedRows,
    hasChanges: addedRows.length > 0 || modifiedRows.length > 0 || deletedRows.length > 0,
  };
}

export function commitTrackedCollectionState<T extends Record<string, unknown>>(
  state: TrackedCollectionState<T>,
): TrackedCollectionState<T> {
  const committedRows = state.currentRows.map((row) => stripTrackedFields(row));
  return {
    baselineRows: committedRows,
    currentRows: committedRows,
  };
}

export function rollbackTrackedCollectionState<T extends Record<string, unknown>>(
  state: TrackedCollectionState<T>,
): TrackedCollectionState<T> {
  return {
    baselineRows: state.baselineRows,
    currentRows: state.baselineRows,
  };
}

export function stripTrackedFields<T extends Record<string, unknown>>(row: TrackedRow<T>): TrackedRow<T> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _changeStatus, ...rest } = row;
  return rest as TrackedRow<T>;
}

function defaultCreateTempId(): string {
  return `_new_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getRowIdentifier<T extends Record<string, unknown>>(row: TrackedRow<T>, rowKey: CollectionRowKey<T>): string {
  return String(row[rowKey]);
}

function withChangeStatus<T extends Record<string, unknown>>(
  row: TrackedRow<T>,
  changeStatus: RowChangeStatus,
): TrackedRow<T> {
  return {
    ...row,
    _changeStatus: changeStatus,
  };
}

function applySequentialOrder<T extends Record<string, unknown>>(
  rows: TrackedRow<T>[],
  orderKey?: CollectionOrderKey<T>,
): TrackedRow<T>[] {
  if (!orderKey) {
    return rows.map((row) => stripTrackedFields(row));
  }

  return rows.map((row, index) => ({
    ...stripTrackedFields(row),
    [orderKey]: index + 1,
  }) as TrackedRow<T>);
}

function sortRowsForDisplay<T extends Record<string, unknown>>(
  rows: TrackedRow<T>[],
  orderKey?: CollectionOrderKey<T>,
): TrackedRow<T>[] {
  if (!orderKey) {
    return rows;
  }

  return [...rows].sort((left, right) => compareUnknownValues(left[orderKey], right[orderKey]));
}

function compareUnknownValues(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left ?? '').localeCompare(String(right ?? ''));
}

function areRowsEquivalent<T extends Record<string, unknown>>(left: TrackedRow<T>, right: TrackedRow<T>): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    if (key === '_tempId' || key === '_changeStatus') {
      continue;
    }

    if (!Object.is(left[key as keyof typeof left], right[key as keyof typeof right])) {
      return false;
    }
  }

  return true;
}