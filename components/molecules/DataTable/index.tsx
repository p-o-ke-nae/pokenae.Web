'use client';

import { useCallback } from "react";
import CustomCheckBox from "@/components/atoms/CustomCheckBox";
import CustomLabel from "@/components/atoms/CustomLabel";
import resources from "@/lib/resources";

export type DataTableColumnType = 'text' | 'checkbox';

export type DataTableColumn<T extends Record<string, unknown> = Record<string, unknown>> = {
	/** データのどのキーを表示するか */
	key: keyof T & string;
	/** ヘッダーに表示する名称（省略時はヘッダーなし） */
	header?: string;
	/** 列幅（CSS 値、省略時は auto） */
	width?: string;
	/** セルの表示タイプ（デフォルト: 'text'） */
	type?: DataTableColumnType;
	/** カスタムセルレンダラー（指定時は type より優先） */
	render?: (value: unknown, row: T, rowIndex: number) => React.ReactNode;
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
	className?: string;
};

function DataTable<T extends Record<string, unknown> = Record<string, unknown>>({
	columns,
	data,
	rowKey,
	selectable = false,
	selectedKeys = [],
	onSelectionChange,
	onRowClick,
	emptyMessage = resources.dataTable.emptyMessage,
	className = "",
}: DataTableProps<T>) {
	const getRowKey = useCallback(
		(row: T, index: number): string => {
			if (rowKey && row[rowKey] !== undefined) {
				return String(row[rowKey]);
			}
			return String(index);
		},
		[rowKey]
	);

	const isSelected = (row: T, index: number): boolean =>
		selectedKeys.includes(getRowKey(row, index));

	const handleCheckboxChange = (row: T, index: number, checked: boolean) => {
		if (!onSelectionChange) return;
		const key = getRowKey(row, index);
		if (checked) {
			onSelectionChange([...selectedKeys, key]);
		} else {
			onSelectionChange(selectedKeys.filter((k) => k !== key));
		}
	};

	const handleSelectAll = (checked: boolean) => {
		if (!onSelectionChange) return;
		if (checked) {
			onSelectionChange(data.map((row, index) => getRowKey(row, index)));
		} else {
			onSelectionChange([]);
		}
	};

	const allSelected = data.length > 0 && data.every((row, index) => isSelected(row, index));
	const someSelected = selectedKeys.length > 0 && !allSelected;
	const hasHeaders = columns.some((col) => col.header !== undefined) || selectable;

	const renderCell = (col: DataTableColumn<T>, row: T, rowIndex: number) => {
		const value = row[col.key];

		if (col.render) {
			return col.render(value, row, rowIndex);
		}

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

	const colSpan = (selectable ? 1 : 0) + columns.length;

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
											ref={(el) => {
												if (el) el.indeterminate = someSelected;
											}}
											onChange={(e) => handleSelectAll(e.target.checked)}
											aria-label={resources.dataTable.selectAll}
										/>
									</th>
								)}
								{columns.map((col) => (
									<th
										key={col.key}
										className={`data-table__th${col.type === 'checkbox' ? ' data-table__th--checkbox' : ''}`}
										style={col.width ? { width: col.width } : undefined}
									>
										{col.header !== undefined && (
											<CustomLabel>{col.header}</CustomLabel>
										)}
									</th>
								))}
							</tr>
						</thead>
					)}
					<tbody>
						{data.length > 0 ? (
							data.map((row, rowIndex) => {
								const key = getRowKey(row, rowIndex);
								const selected = isSelected(row, rowIndex);
								return (
									<tr
										key={key}
										className={[
											'data-table__row',
											selected ? 'data-table__row--selected' : '',
											onRowClick ? 'data-table__row--clickable' : '',
										]
											.filter(Boolean)
											.join(' ')}
										onClick={() => onRowClick?.(row, rowIndex)}
										onKeyDown={(e) => {
											if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
												e.preventDefault();
												onRowClick(row, rowIndex);
											}
										}}
										tabIndex={onRowClick ? 0 : undefined}
										aria-selected={selectable ? selected : undefined}
									>
										{selectable && (
											<td className="data-table__td data-table__td--checkbox">
												<CustomCheckBox
													checked={selected}
													onChange={(e) => {
														e.stopPropagation();
														handleCheckboxChange(row, rowIndex, e.target.checked);
													}}
													aria-label={`${resources.dataTable.selectRow} ${rowIndex + 1}`}
												/>
											</td>
										)}
										{columns.map((col) => (
											<td
												key={col.key}
												className={`data-table__td${col.type === 'checkbox' ? ' data-table__td--checkbox' : ''}`}
												style={col.width ? { width: col.width } : undefined}
											>
												{renderCell(col, row, rowIndex)}
											</td>
										))}
									</tr>
								);
							})
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
					position: sticky;
					top: 0;
				}

				.data-table__th--checkbox {
					width: 2.75rem;
					text-align: center;
					padding: 0.5rem 0.5rem;
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
			`}</style>
		</>
	);
}

DataTable.displayName = "DataTable";

export default DataTable;
