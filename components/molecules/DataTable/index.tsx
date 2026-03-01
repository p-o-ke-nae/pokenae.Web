'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import CustomCheckBox from "@/components/atoms/CustomCheckBox";
import CustomLabel from "@/components/atoms/CustomLabel";
import resources from "@/lib/resources";

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
/**
 * 子行を保持するフィールド名（指定時は親子階層表示を有効化）
 * childrenKey を使用する場合は rowKey も合わせて指定してください。
 */
childrenKey?: string;
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
/**
 * ソート状態（外部管理モード）
 * 指定時は外部から制御します。省略時はコンポーネント内部で管理します。
 */
sortState?: SortState | null;
/** ソート状態変更コールバック */
onSortChange?: (sort: SortState | null) => void;
className?: string;
};

const INDENT_PER_DEPTH_REM = 1.25;
const MIN_COLUMN_WIDTH_PX = 48;

function DataTable<T extends Record<string, unknown> = Record<string, unknown>>({
columns,
data,
rowKey,
selectable = false,
selectedKeys = [],
onSelectionChange,
onRowClick,
emptyMessage = resources.dataTable.emptyMessage,
childrenKey,
expandedKeys: expandedKeysProp,
onExpandChange,
columnOrder: columnOrderProp,
onColumnOrderChange,
resizable = false,
onFilteredDataChange,
sortState: sortStateProp,
onSortChange,
className = "",
}: DataTableProps<T>) {
// 列順序（ユーザーが並べ替えた場合のみオーバーライドとして保持）
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
[effectiveColumnOrder, columns]
);

// 列幅（colWidths は ref でも最新値を参照）
const [colWidths, setColWidths] = useState<Record<string, number>>({});
const colWidthsRef = useRef(colWidths);
useEffect(() => { colWidthsRef.current = colWidths; }, [colWidths]);
// リサイズリスナーのクリーンアップ（アンマウント時用）
const resizeCleanupRef = useRef<(() => void) | null>(null);
useEffect(() => () => { resizeCleanupRef.current?.(); }, []);

// 展開状態
const [internalExpandedKeys, setInternalExpandedKeys] = useState<string[]>([]);
const effectiveExpandedKeys = expandedKeysProp ?? internalExpandedKeys;

// ソート状態
const [internalSortState, setInternalSortState] = useState<SortState | null>(null);
const effectiveSortState = sortStateProp !== undefined ? sortStateProp : internalSortState;

// フィルタ状態
const [filters, setFilters] = useState<Record<string, string>>({});
const hasActiveFilter = orderedColumns.some(c => c.filterable);

// ドラッグ状態
const draggedKey = useRef<string | null>(null);
const didDrag = useRef(false);
const [dragOverKey, setDragOverKey] = useState<string | null>(null);

// onFilteredDataChange の最新値を ref で保持（useEffect ループを防ぐ）
const onFilteredDataChangeRef = useRef(onFilteredDataChange);
// onFilteredDataChange の最新値のみ ref に同期
useEffect(() => { onFilteredDataChangeRef.current = onFilteredDataChange; });

// 行キー
const getRowKey = useCallback(
(row: T, index: number): string => {
if (rowKey && row[rowKey] !== undefined) return String(row[rowKey]);
return String(index);
},
[rowKey]
);

// フィルタ＋ソート後データ
const processedData = useMemo(() => {
let result = [...data];

// フィルタ適用
for (const [key, filterVal] of Object.entries(filters)) {
if (!filterVal) continue;
const lower = filterVal.toLowerCase();
const col = columns.find(c => c.key === key);
result = result.filter(row => {
const raw = row[key];
const str = col?.sortValue ? String(col.sortValue(raw, row)) : String(raw ?? '');
return str.toLowerCase().includes(lower);
});
}

// ソート適用
if (effectiveSortState) {
const { key, direction } = effectiveSortState;
const col = columns.find(c => c.key === key);
result = [...result].sort((a, b) => {
const av = col?.sortValue ? col.sortValue(a[key], a) : String(a[key] ?? '');
const bv = col?.sortValue ? col.sortValue(b[key], b) : String(b[key] ?? '');
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
}, [data, filters, effectiveSortState, columns]);

// フィルタ後データを外部通知
useEffect(() => {
onFilteredDataChangeRef.current?.(processedData);
}, [processedData]);

// 選択ロジック
const isSelected = useCallback(
(row: T, index: number): boolean => selectedKeys.includes(getRowKey(row, index)),
[selectedKeys, getRowKey]
);

const handleCheckboxChange = useCallback(
(row: T, index: number, checked: boolean) => {
if (!onSelectionChange) return;
const key = getRowKey(row, index);
onSelectionChange(
checked ? [...selectedKeys, key] : selectedKeys.filter(k => k !== key)
);
},
[onSelectionChange, selectedKeys, getRowKey]
);

const handleSelectAll = useCallback(
(checked: boolean) => {
if (!onSelectionChange) return;
onSelectionChange(
checked ? processedData.map((row, i) => getRowKey(row, i)) : []
);
},
[onSelectionChange, processedData, getRowKey]
);

const allSelected =
processedData.length > 0 && processedData.every((row, i) => isSelected(row, i));
const someSelected = selectedKeys.length > 0 && !allSelected;
const hasHeaders = orderedColumns.some(col => col.header !== undefined) || selectable;

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

// ソートハンドラ（ドラッグ後のクリックは無視）
const handleSortClick = useCallback(
(key: string) => {
if (didDrag.current) {
didDrag.current = false;
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
[effectiveSortState, onSortChange, columns]
);

// 列幅リサイズ（colWidths は ref で参照するため依存関係なし）
const handleResizeMouseDown = useCallback((e: React.MouseEvent, key: string) => {
e.preventDefault();
e.stopPropagation();
const th = (e.currentTarget as HTMLElement).closest('th') as HTMLElement | null;
if (!th) return;
const startX = e.clientX;
const startWidth = colWidthsRef.current[key] ?? th.offsetWidth;

const handleMove = (ev: MouseEvent) => {
const newWidth = Math.max(MIN_COLUMN_WIDTH_PX, startWidth + (ev.clientX - startX));
setColWidths(prev => ({ ...prev, [key]: newWidth }));
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
}, []);

// 列ドラッグ＆ドロップ
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
[effectiveColumnOrder, onColumnOrderChange]
);

const handleDragEnd = useCallback(() => {
setDragOverKey(null);
draggedKey.current = null;
}, []);

// セルコンテンツ
const renderCellContent = (col: DataTableColumn<T>, row: T, rowIndex: number): React.ReactNode => {
const value = row[col.key];
if (col.render) return col.render(value, row, rowIndex);
if (col.type === 'checkbox') {
return (
<CustomCheckBox
checked={Boolean(value)}
readOnly
tabIndex={-1}
aria-label={col.header}
/>
);
}
return String(value ?? '');
};

// 行レンダリング（再帰的）
const renderRows = (rows: T[], depth: number): React.ReactNode =>
rows.map((row, rowIndex) => {
const key = getRowKey(row, rowIndex);
const selected = isSelected(row, rowIndex);
const children = childrenKey ? (row[childrenKey] as T[] | undefined) : undefined;
const hasChildren = Array.isArray(children) && children.length > 0;
const expanded = effectiveExpandedKeys.includes(key);

return (
<Fragment key={key}>
<tr
className={[
'data-table__row',
selected ? 'data-table__row--selected' : '',
onRowClick ? 'data-table__row--clickable' : '',
depth > 0 ? 'data-table__row--child' : '',
]
.filter(Boolean)
.join(' ')}
onClick={() => onRowClick?.(row, rowIndex)}
onKeyDown={e => {
if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
e.preventDefault();
onRowClick(row, rowIndex);
}
}}
tabIndex={onRowClick ? 0 : undefined}
aria-selected={selectable ? selected : undefined}
aria-expanded={hasChildren ? expanded : undefined}
>
{selectable && (
<td className="data-table__td data-table__td--checkbox">
<CustomCheckBox
checked={selected}
onChange={e => {
e.stopPropagation();
handleCheckboxChange(row, rowIndex, e.target.checked);
}}
aria-label={`${resources.dataTable.selectRow} ${rowIndex + 1}`}
/>
</td>
)}
{orderedColumns.map((col, colIndex) => {
const cellWidth = colWidths[col.key]
? `${colWidths[col.key]}px`
: col.width;
return (
<td
key={col.key}
className={`data-table__td${col.type === 'checkbox' ? ' data-table__td--checkbox' : ''}`}
style={cellWidth ? { width: cellWidth } : undefined}
>
{colIndex === 0 && (depth > 0 || hasChildren) ? (
<div
className="data-table__cell-tree"
style={{ paddingLeft: `${depth * INDENT_PER_DEPTH_REM}rem` }}
>
{hasChildren ? (
<button
type="button"
className="data-table__expand-btn"
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
{expanded ? '▼' : '▶'}
</button>
) : (
<span className="data-table__expand-placeholder" />
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
{hasChildren && expanded && children && renderRows(children, depth + 1)}
</Fragment>
);
});

const colSpan = (selectable ? 1 : 0) + orderedColumns.length;

const getSortIcon = (key: string) => {
if (!effectiveSortState || effectiveSortState.key !== key) return '↕';
return effectiveSortState.direction === 'asc' ? '↑' : '↓';
};

return (
<>
<div className={`data-table-wrapper ${className}`.trim()}>
<table className="data-table">
{hasHeaders && (
<thead>
<tr>
{selectable && (
<th className="data-table__th data-table__th--checkbox">
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
const thWidth = colWidths[col.key]
? `${colWidths[col.key]}px`
: col.width;
return (
<th
key={col.key}
className={[
'data-table__th',
col.type === 'checkbox' ? 'data-table__th--checkbox' : '',
isSortable ? 'data-table__th--sortable' : '',
isSorted ? 'data-table__th--sorted' : '',
dragOverKey === col.key ? 'data-table__th--drag-over' : '',
]
.filter(Boolean)
.join(' ')}
style={thWidth ? { width: thWidth } : undefined}
draggable
onDragStart={e => handleDragStart(e, col.key)}
onDragOver={e => handleDragOver(e, col.key)}
onDragLeave={handleDragLeave}
onDrop={e => handleDrop(e, col.key)}
onDragEnd={handleDragEnd}
onClick={() => handleSortClick(col.key)}
>
{col.header !== undefined && (
<div className="data-table__th-inner">
<CustomLabel>{col.header}</CustomLabel>
{isSortable && (
<span
className={`data-table__sort-icon${isSorted ? ' data-table__sort-icon--active' : ''}`}
aria-hidden="true"
>
{getSortIcon(col.key)}
</span>
)}
</div>
)}
{resizable && (
<div
className="data-table__resize-handle"
onMouseDown={e => handleResizeMouseDown(e, col.key)}
onClick={e => e.stopPropagation()}
aria-hidden="true"
/>
)}
</th>
);
})}
</tr>
{hasActiveFilter && (
<tr>
{selectable && (
<th className="data-table__th data-table__th--filter" />
)}
{orderedColumns.map(col => (
<th
key={col.key}
className="data-table__th data-table__th--filter"
>
{col.filterable && (
<input
className="data-table__filter-input"
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
)}
</th>
))}
</tr>
)}
</thead>
)}
<tbody>
{processedData.length > 0 ? (
renderRows(processedData, 0)
) : (
<tr>
<td colSpan={colSpan} className="data-table__empty">
{emptyMessage}
</td>
</tr>
)}
</tbody>
</table>
</div>

<style jsx>{`
.data-table-wrapper {
border: 1.5px solid var(--color-base-70-dark);
border-radius: 0.5rem;
overflow: hidden;
overflow-x: auto;
background-color: var(--color-base-70-light);
}

.data-table {
width: 100%;
border-collapse: collapse;
}

.data-table__th {
text-align: left;
padding: 0.5rem 0.875rem;
background-color: color-mix(
in srgb,
var(--color-accent-25) 6%,
var(--color-base-70-light)
);
border-bottom: 1.5px solid var(--color-base-70-dark);
white-space: nowrap;
position: relative;
user-select: none;
}

.data-table__th--checkbox {
width: 2.75rem;
text-align: center;
padding: 0.5rem 0.5rem;
}

.data-table__th--sortable {
cursor: pointer;
}

.data-table__th--sortable:hover {
background-color: color-mix(
in srgb,
var(--color-accent-25) 10%,
var(--color-base-70-light)
);
}

.data-table__th--sorted {
background-color: color-mix(
in srgb,
var(--color-accent-25) 12%,
var(--color-base-70-light)
);
}

.data-table__th--drag-over {
background-color: color-mix(
in srgb,
var(--color-accent-25) 22%,
var(--color-base-70-light)
);
outline: 2px dashed
color-mix(in srgb, var(--color-accent-25) 60%, transparent);
outline-offset: -2px;
}

.data-table__th-inner {
display: flex;
align-items: center;
gap: 0.25rem;
}

.data-table__sort-icon {
font-size: 0.75rem;
opacity: 0.35;
transition: opacity 100ms ease;
flex-shrink: 0;
}

.data-table__sort-icon--active {
opacity: 0.9;
color: var(--color-accent-25-strong);
}

.data-table__resize-handle {
position: absolute;
top: 0;
right: 0;
width: 0.375rem;
height: 100%;
cursor: col-resize;
background-color: transparent;
transition: background-color 100ms ease;
}

.data-table__resize-handle:hover {
background-color: color-mix(
in srgb,
var(--color-accent-25) 40%,
transparent
);
}

.data-table__th--filter {
padding: 0.25rem 0.5rem;
background-color: color-mix(
in srgb,
var(--color-base-70-dark) 15%,
var(--color-base-70-light)
);
border-bottom: 1.5px solid var(--color-base-70-dark);
}

.data-table__filter-input {
width: 100%;
padding: 0.25rem 0.5rem;
border: 1px solid var(--color-base-70-dark);
border-radius: 0.25rem;
font-size: 0.75rem;
background-color: var(--color-base-70-light);
color: var(--color-text-strong);
outline: none;
box-sizing: border-box;
}

.data-table__filter-input:focus {
border-color: var(--color-accent-25);
}

.data-table__row {
font-size: 0.875rem;
color: var(--color-text-strong);
transition: background-color 100ms ease;
}

.data-table__row:not(:last-child) {
border-bottom: 1px solid var(--color-base-70-dark);
}

.data-table__row--clickable {
cursor: pointer;
}

.data-table__row--clickable:hover {
background-color: color-mix(
in srgb,
var(--color-accent-25) 8%,
var(--color-base-70-light)
);
}

.data-table__row--clickable:focus-visible {
outline: none;
background-color: color-mix(
in srgb,
var(--color-accent-25) 12%,
var(--color-base-70-light)
);
}

.data-table__row--selected {
background-color: color-mix(
in srgb,
var(--color-accent-25) 15%,
var(--color-base-70-light)
);
}

.data-table__row--selected:hover {
background-color: color-mix(
in srgb,
var(--color-accent-25) 20%,
var(--color-base-70-light)
);
}

.data-table__row--child {
background-color: color-mix(
in srgb,
var(--color-base-70-dark) 25%,
var(--color-base-70-light)
);
}

.data-table__td {
padding: 0.625rem 0.875rem;
vertical-align: middle;
}

.data-table__td--checkbox {
text-align: center;
padding: 0.625rem 0.5rem;
}

.data-table__empty {
padding: 1.25rem 0.875rem;
text-align: center;
font-size: 0.875rem;
color: color-mix(in srgb, var(--color-text-strong) 50%, transparent);
}

.data-table__cell-tree {
display: flex;
align-items: center;
gap: 0.375rem;
}

.data-table__expand-btn {
flex-shrink: 0;
background: none;
border: none;
cursor: pointer;
padding: 0.125rem 0.25rem;
font-size: 0.625rem;
color: var(--color-text-strong);
opacity: 0.6;
line-height: 1;
border-radius: 0.25rem;
transition: opacity 100ms ease;
}

.data-table__expand-btn:hover {
opacity: 1;
background-color: color-mix(
in srgb,
var(--color-accent-25) 12%,
transparent
);
}

.data-table__expand-placeholder {
display: inline-block;
width: 1.25rem;
flex-shrink: 0;
}
`}</style>
</>
);
}

DataTable.displayName = "DataTable";

export default DataTable;
