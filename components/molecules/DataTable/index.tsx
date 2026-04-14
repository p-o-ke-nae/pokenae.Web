'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import CustomCheckBox from "@/components/atoms/CustomCheckBox";
import CustomHeader from "@/components/atoms/CustomHeader";
import CustomLabel from "@/components/atoms/CustomLabel";
import resources from "@/lib/resources";
import { buildSelectFilterOptions, useDataTableProcessing } from "./useDataTableProcessing";
import { useColumnOrder } from "./useColumnOrder";
import { useColumnResize } from "./useColumnResize";
import { useRowReorder } from "./useRowReorder";
import { DataTableSelectFilter } from "./DataTableSelectFilter";
import {
  DATA_TABLE_DEFAULT_MAX_COLUMN_WIDTH,
  DATA_TABLE_DEFAULT_MAX_COLUMN_WIDTH_PX,
} from './constants';
import { applySelectionInteraction } from './selection-utils';
import styles from './DataTable.module.css';

export const DATA_TABLE_DEFAULT_PAGE_HEIGHT = '38rem';

export type DataTableColumnType = 'text' | 'checkbox';

export type SortDirection = 'asc' | 'desc';

export type SortState = {
key: string;
direction: SortDirection;
};

export type DataTableColumn<T extends Record<string, unknown> = Record<string, unknown>> = {
/** データのどのキーを表示するか */
key: keyof T & string;
/** ヘッダーに表示する名称（省略時はヘッダーなし） */
header?: string;
/** 列幅の初期値（CSS 値、省略時は auto） */
width?: string;
/** 列幅の最大値（省略時は共通 max 幅を適用） */
maxWidth?: string;
/** セルの表示タイプ（デフォルト: 'text'） */
type?: DataTableColumnType;
/**
 * カスタムセルレンダラー（指定時は type より優先）
 *
 * text / checkbox 以外の任意 UI（SearchField・TextBox など）をセルに埋め込む場合に使用します。
 *
 * @example
 * ```tsx
 * {
 *   key: 'categoryId',
 *   header: 'カテゴリ',
 *   render: (value, row, rowIndex) => (
 *     <SearchField
 *       options={categoryOptions}
 *       value={String(value ?? '')}
 *       onChange={(v) => handleCellChange(rowIndex, 'categoryId', v)}
 *     />
 *   ),
 * }
 * ```
 */
render?: (value: unknown, row: T, rowIndex: number) => React.ReactNode;
/** ソート可能にするか（デフォルト: false） */
sortable?: boolean;
/** フィルタ入力欄を表示するか（デフォルト: false） */
filterable?: boolean;
/**
 * ソート・フィルタに使う値の変換関数
 * 省略時は String() で変換します。数値ソートが必要な場合は number を返してください。
 */
sortValue?: (value: unknown, row: T) => string | number;
/**
 * フィルタモード（filterable が true のとき有効。省略時は 'text'）
 * - 'text': テキスト部分一致
 * - 'select': 値選択（複数選択）
 */
filterMode?: 'text' | 'select';
};

export type DataTableProps<T extends Record<string, unknown> = Record<string, unknown>> = {
/** 列定義 */
columns: DataTableColumn<T>[];
/** 表示データ */
data: T[];
/** 行のユニークキーとなるフィールド名（省略時はインデックスを使用） */
rowKey?: keyof T & string;
/** 行選択チェックボックスを表示するか */
selectable?: boolean;
/** 選択済み行のキー一覧 */
selectedKeys?: string[];
/** 選択状態変更コールバック */
onSelectionChange?: (keys: string[]) => void;
/** 行クリックコールバック */
onRowClick?: (row: T, rowIndex: number) => void;
/** データが空のときのメッセージ */
emptyMessage?: string;
/** タイトル表示欄に表示する見出し */
title?: React.ReactNode;
/** タイトル表示欄の右側に表示する要素 */
titleActions?: React.ReactNode;
/**
 * 子行を保持するフィールド名（指定時は親子階層表示を有効化）
 * childrenKey を使用する場合は rowKey も合わせて指定してください。
 */
childrenKey?: string;
/** 行を展開可能か判定するコールバック */
isRowExpandable?: (row: T, rowIndex: number) => boolean;
/** 行展開時に親行の直下へ差し込むコンテンツ */
renderExpandedContent?: (row: T, rowIndex: number) => React.ReactNode;
/**
 * 展開済み行のキー一覧（指定時は外部管理モード）
 * 省略時はコンポーネント内部で展開状態を管理します。
 */
expandedKeys?: string[];
/** 展開状態変更コールバック */
onExpandChange?: (keys: string[]) => void;
/**
 * 列の表示順（列の key 配列）
 * 指定時は外部管理モード。省略時はコンポーネント内部で管理します。
 * ヘッダーをドラッグ＆ドロップすることで順序を変更できます。
 */
columnOrder?: string[];
/** 列順序変更コールバック */
onColumnOrderChange?: (order: string[]) => void;
/**
 * 列幅のリサイズを有効にするか（デフォルト: false）
 * 有効にすると各列ヘッダーの右端にリサイズハンドルが表示されます。
 */
resizable?: boolean;
/**
 * フィルタリング後のデータを受け取るコールバック
 * フィルタ・ソート状態が変わるたびに呼ばれます。元データには影響しません。
 */
onFilteredDataChange?: (data: T[]) => void;
/** 選択式フィルタの候補生成に使うデータ（省略時は data を使用） */
filterOptionsData?: T[];
/**
 * ソート状態（外部管理モード）
 * 指定時は外部から制御します。省略時はコンポーネント内部で管理します。
 */
sortState?: SortState | null;
/** ソート状態変更コールバック */
onSortChange?: (sort: SortState | null) => void;
/**
 * 「行を追加」ボタンを押したときのコールバック
 * 指定するとテーブル上部にボタンが表示されます。
 * データの追加ロジックは `useTableData` フック側で実装してください。
 */
onAddRow?: () => void;
/**
 * 行のドラッグ並び替えを有効にするか（デフォルト: false）
 * 有効にすると各行の先頭にドラッグハンドルが表示されます。
 */
rowReorderEnabled?: boolean;
/**
 * 行並び替えが無効の場合にツールチップで表示する理由（省略可）
 */
rowReorderDisabledReason?: string;
/**
 * 行がドラッグ＆ドロップで移動されたときのコールバック
 * fromIndex / toIndex は現在表示中の rows（フィルタ・ソート後）のインデックスです。
 */
onRowMove?: (fromIndex: number, toIndex: number) => void;
/** 一覧の幅（CSS 値、省略時はコンテナ幅に追従） */
width?: string;
/** 一覧表全体の固定高さ（CSS 値、指定時は records 領域が縦スクロール） */
height?: string;
/** 一覧表全体の最大高さ（CSS 値、指定時は超過分が records 領域で縦スクロール） */
maxHeight?: string;
  /** ページネーションを有効にするか（デフォルト: false） */
  paginated?: boolean;
  /** 1ページあたりの表示行数（デフォルト: 50） */
  pageSize?: number;
  /** ページサイズ選択肢（デフォルト: [20, 50, 100]） */
  pageSizeOptions?: number[];
  className?: string;
};

const INDENT_PER_DEPTH_REM = 1.25;
const ROW_REORDER_COLUMN_WIDTH = '2.25rem';
const SELECTION_COLUMN_WIDTH = '2.75rem';

function cx(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function getColumnWidth<T extends Record<string, unknown>>(
  col: DataTableColumn<T>,
  colWidths: Record<string, number>,
): string | undefined {
  return colWidths[col.key] ? `${colWidths[col.key]}px` : col.width;
}

function getColumnCellStyle<T extends Record<string, unknown>>(
  col: DataTableColumn<T>,
  colWidths: Record<string, number>,
): CSSProperties {
  const width = getColumnWidth(col, colWidths);
  if (width) {
    return { width, minWidth: width, maxWidth: width };
  }

  return {
    maxWidth: col.maxWidth ?? 'var(--data-table-column-max-width)',
  };
}

function getFixedColumnStyle(width: string): CSSProperties {
  return { width, minWidth: width, maxWidth: width };
}

function measureColumnContentWidth(cell: HTMLElement): number {
  const targets = Array.from(cell.querySelectorAll<HTMLElement>('[data-column-measure="true"]'));
  if (targets.length === 0) {
    return Math.ceil(cell.scrollWidth);
  }

  return Math.max(...targets.map((target) => Math.ceil(target.scrollWidth)));
}

function isInteractiveSelectionTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.closest('button, a, input, select, textarea, summary, [role="button"], [role="link"], [data-disable-row-select="true"]') != null;
}

function readModifierKeys(nativeEvent: Event): { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean } {
  return {
    shiftKey: 'shiftKey' in nativeEvent ? Boolean(nativeEvent.shiftKey) : false,
    metaKey: 'metaKey' in nativeEvent ? Boolean(nativeEvent.metaKey) : false,
    ctrlKey: 'ctrlKey' in nativeEvent ? Boolean(nativeEvent.ctrlKey) : false,
  };
}

function DataTable<T extends Record<string, unknown> = Record<string, unknown>>({
columns,
data,
rowKey,
selectable = false,
selectedKeys = [],
onSelectionChange,
onRowClick,
emptyMessage = resources.dataTable.emptyMessage,
title,
titleActions,
childrenKey,
isRowExpandable,
renderExpandedContent,
expandedKeys: expandedKeysProp,
onExpandChange,
columnOrder: columnOrderProp,
onColumnOrderChange,
resizable = true,
onFilteredDataChange,
filterOptionsData,
sortState: sortStateProp,
onSortChange,
onAddRow,
rowReorderEnabled = false,
rowReorderDisabledReason,
onRowMove,
width,
height,
maxHeight,
paginated = false,
pageSize: pageSizeProp = 50,
pageSizeOptions = [20, 50, 100],
className = "",
}: DataTableProps<T>) {
const tableRootRef = useRef<HTMLDivElement>(null);
const headerTableRef = useRef<HTMLTableElement>(null);
const recordsRef = useRef<HTMLDivElement>(null);
const [scrollbarOffset, setScrollbarOffset] = useState(0);
const [currentPage, setCurrentPage] = useState(0);
const [internalPageSize, setInternalPageSize] = useState(pageSizeProp);
// --- Hooks ---
const {
  orderedColumns,
  dragOverKey,
  didDrag,
  columnDrag,
} = useColumnOrder({ columns, columnOrderProp, onColumnOrderChange });

const { colWidths, setColumnWidth, handleResizeMouseDown } = useColumnResize();

const {
  processedData,
  effectiveSortState,
  filters,
  setFilters,
  selectFilters,
  setSelectFilters,
  handleSortClick,
} = useDataTableProcessing({
  data,
  columns,
  sortStateProp,
  onSortChange,
  onFilteredDataChange,
});

const {
  dragOverRowIndex,
  rowDrag,
} = useRowReorder({ onRowMove });

const effectiveRowReorderEnabled = rowReorderEnabled && !childrenKey;

// --- Pagination ---
const effectivePaginated = paginated && !effectiveRowReorderEnabled;
const totalItems = processedData.length;
const totalPages = effectivePaginated ? Math.max(1, Math.ceil(totalItems / internalPageSize)) : 1;
const safeCurrentPage = Math.min(currentPage, totalPages - 1);
const pageStartIndex = effectivePaginated ? safeCurrentPage * internalPageSize : 0;
const pageEndIndex = effectivePaginated ? Math.min(pageStartIndex + internalPageSize, totalItems) : totalItems;
const paginatedData = effectivePaginated ? processedData.slice(pageStartIndex, pageEndIndex) : processedData;

const selectionAnchorKeyRef = useRef<string | null>(null);

// 展開状態
const [internalExpandedKeys, setInternalExpandedKeys] = useState<string[]>([]);
const effectiveExpandedKeys = expandedKeysProp ?? internalExpandedKeys;

const hasActiveFilter = orderedColumns.some(c => c.filterable);
const filterSourceData = filterOptionsData ?? data;

useLayoutEffect(() => {
  const headerTable = headerTableRef.current;
  if (!headerTable) {
    return;
  }

  const autoColumns = orderedColumns.filter((col) => col.width == null && colWidths[col.key] == null);
  if (autoColumns.length === 0) {
    return;
  }

  for (const column of autoColumns) {
    const headerCell = headerTable.querySelector<HTMLElement>(`[data-column-key="${escapeAttributeValue(column.key)}"]`);
    if (!headerCell) {
      continue;
    }

    setColumnWidth(column.key, headerCell.offsetWidth);
  }
}, [colWidths, orderedColumns, setColumnWidth]);

useLayoutEffect(() => {
  const recordsElement = recordsRef.current;
  if (!recordsElement) {
    return;
  }

  const updateScrollbarOffset = () => {
    const nextOffset = recordsElement.offsetWidth - recordsElement.clientWidth;
    setScrollbarOffset(nextOffset > 0 ? nextOffset : 0);
  };

  updateScrollbarOffset();

  if (typeof ResizeObserver === 'undefined') {
    window.addEventListener('resize', updateScrollbarOffset);
    return () => {
      window.removeEventListener('resize', updateScrollbarOffset);
    };
  }

  const resizeObserver = new ResizeObserver(() => {
    updateScrollbarOffset();
  });

  resizeObserver.observe(recordsElement);
  const bodyTable = recordsElement.querySelector('table');
  if (bodyTable) {
    resizeObserver.observe(bodyTable);
  }

  return () => {
    resizeObserver.disconnect();
  };
}, [height, maxHeight, processedData.length, orderedColumns.length]);

// 値選択フィルタの選択肢をデータから自動生成（重複なし）
const selectFilterOptions = useMemo(() => {
  return buildSelectFilterOptions({
    data: filterSourceData,
    columns,
    filters,
    selectFilters,
    sortState: effectiveSortState,
  });
}, [filterSourceData, columns, effectiveSortState, filters, selectFilters]);

// 行キー
const getRowKey = useCallback(
(row: T, index: number): string => {
if (rowKey && row[rowKey] !== undefined) return String(row[rowKey]);
return String(index);
},
[rowKey]
);

const processedRowKeys = useMemo(() => processedData.map((row, index) => getRowKey(row, index)), [processedData, getRowKey]);

// 選択ロジック
const isSelected = useCallback(
(row: T, index: number): boolean => selectedKeys.includes(getRowKey(row, index)),
[selectedKeys, getRowKey]
);

const handleCheckboxChange = useCallback(
(row: T, index: number, checked: boolean, nativeEvent: Event) => {
if (!onSelectionChange) return;
const key = getRowKey(row, index);
const next = applySelectionInteraction({
orderedKeys: processedRowKeys,
selectedKeys,
anchorKey: selectionAnchorKeyRef.current,
targetKey: key,
mode: 'checkbox',
checked,
...readModifierKeys(nativeEvent),
});
onSelectionChange(next.selectedKeys);
selectionAnchorKeyRef.current = next.anchorKey;
},
[onSelectionChange, processedRowKeys, selectedKeys, getRowKey]
);

const handleSelectAll = useCallback(
(checked: boolean) => {
if (!onSelectionChange) return;
if (!effectivePaginated) {
onSelectionChange(checked ? processedData.map((row, i) => getRowKey(row, i)) : []);
return;
}
const pageKeys = paginatedData.map((row, i) => getRowKey(row, pageStartIndex + i));
if (checked) {
const merged = Array.from(new Set([...selectedKeys, ...pageKeys]));
onSelectionChange(merged);
} else {
onSelectionChange(selectedKeys.filter(k => !pageKeys.includes(k)));
}
},
[onSelectionChange, processedData, paginatedData, pageStartIndex, selectedKeys, getRowKey, effectivePaginated]
);

const handleRowSelection = useCallback((row: T, rowIndex: number, nativeEvent: ReactMouseEvent<HTMLTableRowElement> | ReactKeyboardEvent<HTMLTableRowElement>) => {
if (!selectable || !onSelectionChange) return;
const key = getRowKey(row, rowIndex);
const next = applySelectionInteraction({
orderedKeys: processedRowKeys,
selectedKeys,
anchorKey: selectionAnchorKeyRef.current,
targetKey: key,
mode: 'row',
shiftKey: nativeEvent.shiftKey,
metaKey: nativeEvent.metaKey,
ctrlKey: nativeEvent.ctrlKey,
});
onSelectionChange(next.selectedKeys);
selectionAnchorKeyRef.current = next.anchorKey;
}, [getRowKey, onSelectionChange, processedRowKeys, selectable, selectedKeys]);

useEffect(() => {
if (selectedKeys.length === 0) {
selectionAnchorKeyRef.current = null;
return;
}

if (selectionAnchorKeyRef.current && processedRowKeys.includes(selectionAnchorKeyRef.current)) {
return;
}

const nextAnchorKey = [...processedRowKeys].reverse().find((key) => selectedKeys.includes(key)) ?? selectedKeys[selectedKeys.length - 1] ?? null;
selectionAnchorKeyRef.current = nextAnchorKey;
}, [processedRowKeys, selectedKeys]);

const selectionResetSignature = useMemo(() => JSON.stringify({
sortState: effectiveSortState,
filters,
selectFilters,
}), [effectiveSortState, filters, selectFilters]);

// ページリセット: フィルタ・ソート変更時（React 推奨パターン: render 中の setState）
const [prevResetSignature, setPrevResetSignature] = useState(selectionResetSignature);
if (prevResetSignature !== selectionResetSignature) {
setPrevResetSignature(selectionResetSignature);
if (currentPage !== 0) setCurrentPage(0);
}

const previousSelectionResetSignature = useRef(selectionResetSignature);

useEffect(() => {
if (previousSelectionResetSignature.current === selectionResetSignature) {
return;
}

previousSelectionResetSignature.current = selectionResetSignature;
selectionAnchorKeyRef.current = null;

if (selectable && onSelectionChange && selectedKeys.length > 0) {
onSelectionChange([]);
}
}, [onSelectionChange, selectable, selectedKeys.length, selectionResetSignature]);

const pageRowsForSelection = effectivePaginated ? paginatedData : processedData;
const pageStartForSelection = effectivePaginated ? pageStartIndex : 0;
const allSelected =
pageRowsForSelection.length > 0 && pageRowsForSelection.every((row, i) => isSelected(row, pageStartForSelection + i));
const someSelected = selectedKeys.length > 0 && !allSelected;
const hasHeaders = orderedColumns.some(col => col.header !== undefined) || selectable;

const handleAutoSizeColumn = useCallback((key: string) => {
  const root = tableRootRef.current;
  if (!root) {
    return;
  }

  const cells = Array.from(
    root.querySelectorAll<HTMLElement>(`[data-column-key="${escapeAttributeValue(key)}"]`),
  );

  if (cells.length === 0) {
    return;
  }

  const measuredWidth = cells.reduce((max, cell) => Math.max(max, measureColumnContentWidth(cell)), 0);
  if (measuredWidth <= 0) {
    return;
  }

  setColumnWidth(key, Math.min(measuredWidth + 32, DATA_TABLE_DEFAULT_MAX_COLUMN_WIDTH_PX));
}, [setColumnWidth]);

const handleResizeKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>, key: string) => {
  event.stopPropagation();
  const th = event.currentTarget.closest('th');
  const currentWidth = colWidths[key] ?? th?.offsetWidth ?? DATA_TABLE_DEFAULT_MAX_COLUMN_WIDTH_PX;

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    setColumnWidth(key, currentWidth - 16);
    return;
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    setColumnWidth(key, currentWidth + 16);
    return;
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleAutoSizeColumn(key);
  }
}, [colWidths, handleAutoSizeColumn, setColumnWidth]);

// 展開ロジック
const toggleExpand = useCallback(
(key: string) => {
const next = effectiveExpandedKeys.includes(key)
? effectiveExpandedKeys.filter(k => k !== key)
: [...effectiveExpandedKeys, key];
if (onExpandChange) {
onExpandChange(next);
} else {
setInternalExpandedKeys(next);
}
},
[effectiveExpandedKeys, onExpandChange]
);



// セルコンテンツ
const renderCellContent = (col: DataTableColumn<T>, row: T, rowIndex: number): React.ReactNode => {
const value = row[col.key];
if (col.render) return col.render(value, row, rowIndex);
if (col.type === 'checkbox') {
return (
<CustomCheckBox
checked={Boolean(value)}
displayOnly
aria-label={col.header}
/>
);
}
const text = String(value ?? '');
return (
<span className={styles.cellText} data-column-measure="true" title={text || undefined}>
{text}
</span>
);
};

// 行レンダリング（再帰的）
const renderRows = (rows: T[], depth: number, indexOffset: number = 0): React.ReactNode =>
rows.map((row, i) => {
const rowIndex = i + indexOffset;
const key = getRowKey(row, rowIndex);
const selected = isSelected(row, rowIndex);
const children = childrenKey ? (row[childrenKey] as T[] | undefined) : undefined;
const hasChildren = Array.isArray(children) && children.length > 0;
const canExpand = isRowExpandable ? isRowExpandable(row, rowIndex) : hasChildren;
const expanded = effectiveExpandedKeys.includes(key);
const isRowDragOver = effectiveRowReorderEnabled && dragOverRowIndex === rowIndex;

return (
<Fragment key={key}>
<tr
draggable={effectiveRowReorderEnabled}
onDragStart={effectiveRowReorderEnabled ? (e) => rowDrag.handleRowDragStart(e, rowIndex) : undefined}
onDragEnter={effectiveRowReorderEnabled ? (e) => rowDrag.handleRowDragEnter(e, rowIndex) : undefined}
onDragOver={effectiveRowReorderEnabled ? (e) => rowDrag.handleRowDragOver(e, rowIndex) : undefined}
onDrop={effectiveRowReorderEnabled ? (e) => rowDrag.handleRowDrop(e, rowIndex) : undefined}
onDragEnd={effectiveRowReorderEnabled ? rowDrag.handleRowDragEnd : undefined}
className={[
styles.row,
rowIndex % 2 === 1 ? styles.rowStripe : '',
selected ? styles.rowSelected : '',
onRowClick ? styles.rowClickable : '',
depth > 0 ? styles.rowChild : '',
isRowDragOver ? styles.rowDragOver : '',
]
.filter(Boolean)
.join(' ')}
onClick={(event) => {
if (!isInteractiveSelectionTarget(event.target)) {
handleRowSelection(row, rowIndex, event);
}

onRowClick?.(row, rowIndex);
}}
onKeyDown={e => {
if (e.key === 'Enter' || e.key === ' ') {
e.preventDefault();
if (!isInteractiveSelectionTarget(e.target)) {
handleRowSelection(row, rowIndex, e);
}
onRowClick?.(row, rowIndex);
}
}}
tabIndex={onRowClick || selectable ? 0 : undefined}
aria-selected={selectable ? selected : undefined}
aria-expanded={canExpand ? expanded : undefined}
>
{effectiveRowReorderEnabled && (
<td
className={cx(styles.bodyCell, styles.dragHandleCell)}
style={getFixedColumnStyle(ROW_REORDER_COLUMN_WIDTH)}
title={rowReorderDisabledReason}
>
<span className={styles.dragGrip} aria-hidden="true">⠿</span>
</td>
)}
{selectable && (
<td
className={cx(styles.bodyCell, styles.checkboxCell)}
style={getFixedColumnStyle(SELECTION_COLUMN_WIDTH)}
>
<CustomCheckBox
checked={selected}
onChange={e => {
e.stopPropagation();
handleCheckboxChange(row, rowIndex, e.target.checked, e.nativeEvent);
}}
aria-label={`${resources.dataTable.selectRow} ${rowIndex + 1}`}
/>
</td>
)}
{orderedColumns.map((col, colIndex) => {
return (
<td
key={col.key}
data-column-key={col.key}
className={cx(styles.bodyCell, col.type === 'checkbox' ? styles.checkboxCell : '')}
style={getColumnCellStyle(col, colWidths)}
>
{colIndex === 0 && (depth > 0 || canExpand) ? (
<div
className={styles.cellTree}
style={{ paddingLeft: `${depth * INDENT_PER_DEPTH_REM}rem` }}
>
{canExpand ? (
<button
type="button"
className={styles.expandButton}
onClick={e => {
e.stopPropagation();
toggleExpand(key);
}}
aria-expanded={expanded}
aria-label={
expanded
? resources.dataTable.collapse
: resources.dataTable.expand
}
>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="14"
  height="14"
  viewBox="0 0 14 14"
  fill="none"
  style={{
    transform: expanded ? 'rotate(90deg)' : undefined,
    transition: 'transform 150ms ease',
    flexShrink: 0,
  }}
  aria-hidden="true"
>
  <path
    d="M5 3l4 4-4 4"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
</svg>
</button>
) : (
<span className={styles.expandPlaceholder} />
)}
{renderCellContent(col, row, rowIndex)}
</div>
) : (
renderCellContent(col, row, rowIndex)
)}
</td>
);
})}
</tr>
{canExpand && expanded && renderExpandedContent ? (
<tr className={styles.expandedRow}>
<td colSpan={colSpan} className={styles.expandedCell}>
{renderExpandedContent(row, rowIndex)}
</td>
</tr>
) : null}
{!renderExpandedContent && hasChildren && expanded && children && renderRows(children, depth + 1, 0)}
</Fragment>
);
});

const colSpan = (effectiveRowReorderEnabled ? 1 : 0) + (selectable ? 1 : 0) + orderedColumns.length;

const renderColGroup = () => (
<colgroup>
{effectiveRowReorderEnabled ? <col style={getFixedColumnStyle(ROW_REORDER_COLUMN_WIDTH)} /> : null}
{selectable ? <col style={getFixedColumnStyle(SELECTION_COLUMN_WIDTH)} /> : null}
{orderedColumns.map(col => {
const colWidth = getColumnWidth(col, colWidths);
return <col key={col.key} style={colWidth ? getFixedColumnStyle(colWidth) : undefined} />;
})}
</colgroup>
);

const getSortIcon = (key: string) => {
if (!effectiveSortState || effectiveSortState.key !== key) return '↕';
return effectiveSortState.direction === 'asc' ? '↑' : '↓';
};

const headerRow = hasHeaders ? (
<tr>
{effectiveRowReorderEnabled && (
<th className={cx(styles.headCell, styles.dragHandleHeader)} style={getFixedColumnStyle(ROW_REORDER_COLUMN_WIDTH)} aria-label="並び替え" />
)}
{selectable && (
<th className={cx(styles.headCell, styles.checkboxHeader)} style={getFixedColumnStyle(SELECTION_COLUMN_WIDTH)}>
<CustomCheckBox
checked={allSelected}
ref={el => {
if (el) el.indeterminate = someSelected;
}}
onChange={e => handleSelectAll(e.target.checked)}
aria-label={resources.dataTable.selectAll}
/>
</th>
)}
{orderedColumns.map(col => {
const isSortable = col.sortable === true;
const isSorted = effectiveSortState?.key === col.key;
return (
<th
key={col.key}
data-column-key={col.key}
className={cx(
styles.headCell,
col.type === 'checkbox' ? styles.checkboxHeader : '',
isSortable ? styles.sortable : '',
isSorted ? styles.sorted : '',
dragOverKey === col.key ? styles.dragOver : '',
)}
style={getColumnCellStyle(col, colWidths)}
draggable
onDragStart={e => columnDrag.handleDragStart(e, col.key)}
onDragOver={e => columnDrag.handleDragOver(e, col.key)}
onDragLeave={columnDrag.handleDragLeave}
onDrop={e => columnDrag.handleDrop(e, col.key)}
onDragEnd={columnDrag.handleDragEnd}
onClick={() => handleSortClick(col.key, didDrag)}
>
{col.header !== undefined && (
<div className={styles.headerInner}>
<span className={styles.headerLabel} data-column-measure="true" title={col.header}>
<CustomLabel>{col.header}</CustomLabel>
</span>
{isSortable && (
<span
className={cx(styles.sortIcon, isSorted ? styles.sortIconActive : '')}
aria-hidden="true"
>
{getSortIcon(col.key)}
</span>
)}
</div>
)}
{resizable && (
<button
type="button"
className={styles.resizeHandle}
onMouseDown={e => handleResizeMouseDown(e, col.key)}
onDoubleClick={(event) => {
event.preventDefault();
event.stopPropagation();
handleAutoSizeColumn(col.key);
}}
onKeyDown={(event) => handleResizeKeyDown(event, col.key)}
onClick={e => e.stopPropagation()}
aria-label={`${col.header ?? col.key} ${resources.dataTable.resizeColumn}`}
title={resources.dataTable.autoSizeColumn}
/>
)}
</th>
);
})}
</tr>
) : null;

const filterRow = hasActiveFilter ? (
<tr>
{effectiveRowReorderEnabled && (
<th className={cx(styles.headCell, styles.filterCell, styles.dragHandleHeader)} style={getFixedColumnStyle(ROW_REORDER_COLUMN_WIDTH)} />
)}
{selectable && (
<th className={cx(styles.headCell, styles.filterCell, styles.checkboxHeader)} style={getFixedColumnStyle(SELECTION_COLUMN_WIDTH)} />
)}
{orderedColumns.map(col => (
<th
key={col.key}
className={cx(styles.headCell, styles.filterCell)}
style={getColumnCellStyle(col, colWidths)}
>
{col.filterable && (col.filterMode === 'select' ? (
<div className={styles.filterControl}>
<DataTableSelectFilter
options={selectFilterOptions[col.key] ?? []}
selectedValues={selectFilters[col.key]}
onChange={(values) =>
setSelectFilters(prev => {
const next = { ...prev };
if (values === undefined) {
delete next[col.key];
} else {
next[col.key] = values;
}
return next;
})
}
label={col.header ?? col.key}
/>
</div>
) : (
<input
className={styles.filterInput}
type="text"
value={filters[col.key] ?? ''}
onChange={e =>
setFilters(prev => ({
...prev,
[col.key]: e.target.value,
}))
}
placeholder={resources.dataTable.filterPlaceholder}
aria-label={`${col.header ?? col.key}${resources.dataTable.filter}`}
/>
))}
</th>
))}
</tr>
) : null;

const panelSizeStyle: React.CSSProperties = {
...(height ? { height } : undefined),
...(maxHeight ? { maxHeight } : undefined),
};

return (
<>
{onAddRow && (
<div className={styles.toolbar}>
<button
type="button"
className={styles.addButton}
onClick={() => onAddRow()}
>
+ {resources.dataTable.addRow}
</button>
</div>
)}
<div
ref={tableRootRef}
className={cx(styles.shell, className)}
style={{
  ...(width ? { width } : undefined),
  ['--data-table-column-max-width' as string]: DATA_TABLE_DEFAULT_MAX_COLUMN_WIDTH,
}}
>
<div className={styles.panel} style={panelSizeStyle}>
{title && (
<div className={styles.title}>
<div className={styles.titleMain}>
{typeof title === 'string' ? <CustomHeader level={3}>{title}</CustomHeader> : title}
</div>
{titleActions ? (
<div className={styles.titleActions}>
{titleActions}
</div>
) : null}
</div>
)}
{headerRow && (
<div className={styles.header} style={scrollbarOffset > 0 ? { paddingRight: scrollbarOffset } : undefined}>
<table ref={headerTableRef} className={styles.table}>
{renderColGroup()}
<thead>{headerRow}</thead>
</table>
</div>
)}
{filterRow && (
<div className={styles.filters} style={scrollbarOffset > 0 ? { paddingRight: scrollbarOffset } : undefined}>
<table className={styles.table}>
{renderColGroup()}
<thead>{filterRow}</thead>
</table>
</div>
)}
<div
ref={recordsRef}
className={cx(styles.records, (height || maxHeight) ? styles.recordsScrollable : '')}
>
{paginatedData.length > 0 ? (
<div className={styles.recordsInner}>
<table className={styles.table}>
{renderColGroup()}
<tbody>
{renderRows(paginatedData, 0, pageStartIndex)}
</tbody>
</table>
</div>
) : (
<div className={styles.emptyState}>
{emptyMessage}
</div>
)}
</div>
{effectivePaginated && totalPages > 1 && (
<div className={styles.pagination}>
<span className={styles.paginationInfo}>
{totalItems} 件中 {pageStartIndex + 1}–{pageEndIndex} 件を表示
</span>
<nav className={styles.paginationNav} aria-label="ページ送り">
<button
type="button"
className={styles.paginationButton}
disabled={safeCurrentPage === 0}
onClick={() => setCurrentPage(0)}
aria-label="最初のページ"
>
«
</button>
<button
type="button"
className={styles.paginationButton}
disabled={safeCurrentPage === 0}
onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
aria-label="前のページ"
>
‹
</button>
{generatePageNumbers(safeCurrentPage, totalPages).map((p, idx) =>
p === null ? (
<span key={`e${idx}`} className={styles.paginationEllipsis}>…</span>
) : (
<button
key={p}
type="button"
className={cx(styles.paginationButton, p === safeCurrentPage ? styles.paginationButtonActive : '')}
onClick={() => setCurrentPage(p)}
aria-label={`ページ ${p + 1}`}
aria-current={p === safeCurrentPage ? 'page' : undefined}
>
{p + 1}
</button>
),
)}
<button
type="button"
className={styles.paginationButton}
disabled={safeCurrentPage >= totalPages - 1}
onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
aria-label="次のページ"
>
›
</button>
<button
type="button"
className={styles.paginationButton}
disabled={safeCurrentPage >= totalPages - 1}
onClick={() => setCurrentPage(totalPages - 1)}
aria-label="最後のページ"
>
»
</button>
</nav>
<div className={styles.paginationSizeSelect}>
<label>
{resources.dataTable.pageSize ?? '表示件数'}
<select
value={internalPageSize}
onChange={(e) => {
setInternalPageSize(Number(e.target.value));
setCurrentPage(0);
}}
>
{pageSizeOptions.map(opt => (
<option key={opt} value={opt}>{opt} 件</option>
))}
</select>
</label>
</div>
</div>
)}
{paginated && effectiveRowReorderEnabled && (
<div className={styles.paginationReorderNote}>
並び替え中はすべての行を表示しています
</div>
)}
</div>
</div>
</>
);
}

/**
 * ページ番号ボタンの表示リストを生成する
 * null は省略記号（…）を表す
 */
function generatePageNumbers(current: number, total: number): Array<number | null> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }
  const pages: Array<number | null> = [];
  pages.push(0);
  if (current > 2) pages.push(null);
  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 3) pages.push(null);
  pages.push(total - 1);
  return pages;
}

DataTable.displayName = "DataTable";

export default DataTable;
