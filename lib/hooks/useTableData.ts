'use client';

import { useCallback, useMemo, useState } from 'react';

/**
 * 行の変更状態を表す型
 *
 * - `'added'`   : 新規追加された行（まだ保存されていない）
 * - `'modified'`: 既存行が編集された
 */
export type RowChangeStatus = 'added' | 'modified';

/**
 * 変更追跡情報を付与した行型
 * オリジナルデータには一切影響しません。
 */
export type TrackedRow<T extends Record<string, unknown>> = T & {
	/** 変更状態 */
	_changeStatus?: RowChangeStatus;
	/** 新規行の一時 ID（`_new_<timestamp>_<seq>` 形式） */
	_tempId?: string;
};

export interface UseTableDataReturn<T extends Record<string, unknown>> {
	/**
	 * 表示データ（元データ＋新規追加行）
	 * DataTable の `data` prop にそのまま渡してください。
	 */
	rows: TrackedRow<T>[];

	/** 新規追加された行の一覧（まだ保存されていないもの） */
	addedRows: TrackedRow<T>[];

	/** 変更された既存行の一覧 */
	modifiedRows: TrackedRow<T>[];

	/**
	 * 行を更新します。
	 * - 新規行（`_tempId` が存在する行）は `addedRows` を更新します。
	 * - 既存行（`rowKey` が一致する行）は `modifiedRows` へ追跡します。
	 *
	 * @param rowKeyValue 更新対象行の `rowKey` 値（新規行の場合は `_tempId` を渡してください）
	 * @param patch 変更するフィールドのみの部分オブジェクト
	 */
	updateRow: (rowKeyValue: string, patch: Partial<T>) => void;

	/**
	 * テーブルに新規行を追加します。
	 * 追加した行は `addedRows` に含まれます。
	 *
	 * @param template 新規行の初期値（省略時はすべて空）。`rowKey` は一時 ID で自動補完されます。
	 */
	addRow: (template?: Partial<T>) => void;

	/**
	 * 行の変更を取り消します（元の値に戻します）。
	 * - 新規行を指定した場合はテーブルから削除します。
	 * - 既存行を指定した場合は変更前の値に戻します。
	 *
	 * @param rowKeyValue `rowKey` 値（新規行は `_tempId`）
	 */
	resetRow: (rowKeyValue: string) => void;

	/**
	 * すべての変更を破棄し、元のデータに戻します。
	 */
	resetAll: () => void;
}

let _seq = 0;
const genTempId = () => `_new_${Date.now()}_${++_seq}`;

/**
 * DataTable 向けの変更追跡カスタムフック
 *
 * DataTable はあくまで「表示と編集の責務」を持ち、
 * データ状態の管理・変更追跡は本フックが担います。
 *
 * ## アーキテクチャの考え方
 *
 * Next.js (React) の推奨パターンに従い、状態管理をカスタムフックに集約することで：
 *
 * - テーブル以外（検索フォーム・バリデーション・API 送信など）からも同じデータを参照・操作できる
 * - DataTable は props を受け取るだけの純粋なコンポーネントとして保たれる
 * - 変更追跡ロジックをテストしやすい
 *
 * ## 使い方
 *
 * ```tsx
 * // 1. フックを呼び出す
 * const { rows, addedRows, modifiedRows, addRow, updateRow, resetAll } = useTableData({
 *   data: originalPokemons,    // API から取得した元データ
 *   rowKey: 'id',              // 行の一意キー
 *   newRowTemplate: { active: false, score: '0' },  // 新規行の初期値
 * });
 *
 * // 2. DataTable に渡す（DataTable は表示のみ担当）
 * <DataTable
 *   data={rows}
 *   rowKey="id"
 *   columns={columns}
 *   onAddRow={addRow}
 * />
 *
 * // 3. 変更内容を取得して API 送信
 * const handleSave = async () => {
 *   await api.patch('/pokemons', { modified: modifiedRows, added: addedRows });
 * };
 * ```
 *
 * @param options.data 元となる初期データ（変更しない）
 * @param options.rowKey 行を識別するフィールド名
 * @param options.newRowTemplate 新規追加時の初期値（省略可）
 */
export function useTableData<T extends Record<string, unknown>>({
	data,
	rowKey,
	newRowTemplate = {} as Partial<T>,
}: {
	data: T[];
	rowKey: keyof T & string;
	newRowTemplate?: Partial<T>;
}): UseTableDataReturn<T> {
	// 新規追加行（_tempId で管理）
	const [addedRows, setAddedRows] = useState<TrackedRow<T>[]>([]);

	// 変更された既存行（rowKey → patch のマップ）
	const [modifiedPatches, setModifiedPatches] = useState<Map<string, Partial<T>>>(new Map());

	// 表示データ = 変更を適用した既存行 + 新規追加行
	const rows = useMemo<TrackedRow<T>[]>(() => {
		const existing = data.map(row => {
			const key = String(row[rowKey]);
			const patch = modifiedPatches.get(key);
			if (!patch) return row as TrackedRow<T>;
			return { ...row, ...patch, _changeStatus: 'modified' as RowChangeStatus } as TrackedRow<T>;
		});
		return [...existing, ...addedRows];
	}, [data, rowKey, modifiedPatches, addedRows]);

	// 変更された既存行の一覧
	const modifiedRows = useMemo<TrackedRow<T>[]>(() => {
		return data
			.filter(row => modifiedPatches.has(String(row[rowKey])))
			.map(row => {
				const key = String(row[rowKey]);
				const patch = modifiedPatches.get(key)!;
				return { ...row, ...patch, _changeStatus: 'modified' as RowChangeStatus } as TrackedRow<T>;
			});
	}, [data, rowKey, modifiedPatches]);

	const addRow = useCallback(
		(template?: Partial<T>) => {
			const tempId = genTempId();
			const newRow = {
				...newRowTemplate,
				...template,
				[rowKey]: tempId,
				_tempId: tempId,
				_changeStatus: 'added',
			} as TrackedRow<T>;
			setAddedRows(prev => [...prev, newRow]);
		},
		[newRowTemplate, rowKey]
	);

	const updateRow = useCallback(
		(rowKeyValue: string, patch: Partial<T>) => {
			// 新規行の更新
			const isAdded = addedRows.some(r => r._tempId === rowKeyValue);
			if (isAdded) {
				setAddedRows(prev =>
					prev.map(r =>
						r._tempId === rowKeyValue
							? ({ ...r, ...patch } as TrackedRow<T>)
							: r
					)
				);
				return;
			}

			// 既存行の変更追跡
			setModifiedPatches(prev => {
				const next = new Map(prev);
				const existing = next.get(rowKeyValue) ?? {};
				next.set(rowKeyValue, { ...existing, ...patch });
				return next;
			});
		},
		[addedRows]
	);

	const resetRow = useCallback(
		(rowKeyValue: string) => {
			// 新規行の削除
			const isAdded = addedRows.some(r => r._tempId === rowKeyValue);
			if (isAdded) {
				setAddedRows(prev => prev.filter(r => r._tempId !== rowKeyValue));
				return;
			}
			// 既存行の変更取り消し
			setModifiedPatches(prev => {
				const next = new Map(prev);
				next.delete(rowKeyValue);
				return next;
			});
		},
		[addedRows]
	);

	const resetAll = useCallback(() => {
		setAddedRows([]);
		setModifiedPatches(new Map());
	}, []);

	return {
		rows,
		addedRows,
		modifiedRows,
		addRow,
		updateRow,
		resetRow,
		resetAll,
	};
}

/**
 * 行から内部追跡フィールド（`_changeStatus`, `_tempId`）を除去したオブジェクトを返すヘルパー
 *
 * 追加行・変更行の JSON を API 送信用に整形する際に使用します。
 *
 * @example
 * ```ts
 * const payload = tableData.addedRows.map(omitTrackedFields);
 * await api.post('/pokemons', payload);
 * ```
 */
export function omitTrackedFields<T extends Record<string, unknown>>(
row: TrackedRow<T>
): T {
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { _changeStatus, _tempId, ...rest } = row;
return rest as T;
}
