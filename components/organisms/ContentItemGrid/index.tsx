"use client";

import { type ReactNode, useState } from "react";
import CustomButton from "@/components/atoms/CustomButton";
import DataTable, { type DataTableColumn } from "@/components/molecules/DataTable";
import Dialog, { DialogFooterLayout } from "@/components/molecules/Dialog";

export type ContentItemGridRow = Record<string, unknown> & { key: string };

type GridRow = ContentItemGridRow & { __no: number; __status: string };

export type ContentItemGridProps = {
  /** 一覧の見出し（例: バナー一覧） */
  title: string;
  /** 1件分の呼び名（例: バナー） */
  itemLabel: string;
  /** 一覧に表示する行（編集対象の配列と同じ順序） */
  rows: ContentItemGridRow[];
  /** 行番号・確認列を除いた表示列 */
  columns: DataTableColumn<ContentItemGridRow>[];
  /** 検証エラーを含む行のインデックス */
  invalidIndexes?: ReadonlySet<number>;
  disabled?: boolean;
  emptyMessage?: string;
  /** 末尾に1件追加する。追加後はその行のダイアログを開く */
  onAdd: () => void;
  onMove?: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  /** ダイアログ内の編集UI */
  renderEditor: (index: number) => ReactNode;
  /** ダイアログの見出し */
  getDialogTitle?: (index: number) => string;
};

/**
 * 公開コンテンツ設定の一覧をグリッドで表示し、選択した行をダイアログで編集する。
 */
export default function ContentItemGrid({
  title,
  itemLabel,
  rows,
  columns,
  invalidIndexes,
  disabled = false,
  emptyMessage,
  onAdd,
  onMove,
  onRemove,
  renderEditor,
  getDialogTitle,
}: ContentItemGridProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const openIndex = editingIndex !== null && editingIndex < rows.length ? editingIndex : null;

  const gridRows: GridRow[] = rows.map((row, index) => ({
    ...row,
    __no: index + 1,
    __status: invalidIndexes?.has(index) ? "要修正" : "",
  }));
  const gridColumns: DataTableColumn<GridRow>[] = [
    { key: "__no", header: "No.", width: "3.5rem" },
    ...(columns as DataTableColumn<GridRow>[]),
    {
      key: "__status",
      header: "確認",
      width: "5rem",
      render: (value) => value
        ? <span className="content-item-grid__invalid" data-column-measure="true">{String(value)}</span>
        : null,
    },
  ];

  function add() {
    const nextIndex = rows.length;
    onAdd();
    setEditingIndex(nextIndex);
  }

  function move(direction: -1 | 1) {
    if (openIndex === null || !onMove) return;
    const target = openIndex + direction;
    if (target < 0 || target >= rows.length) return;
    onMove(openIndex, direction);
    setEditingIndex(target);
  }

  function remove() {
    if (openIndex === null) return;
    onRemove(openIndex);
    setEditingIndex(null);
  }

  return (
    <section className="content-item-grid stack" aria-label={title}>
      <DataTable<GridRow>
        columns={gridColumns}
        data={gridRows}
        rowKey="key"
        title={title}
        emptyMessage={emptyMessage ?? `${itemLabel}はありません。`}
        onRowClick={(row) => {
          if (disabled) return;
          const index = rows.findIndex((item) => item.key === row.key);
          if (index >= 0) setEditingIndex(index);
        }}
      />
      <p className="content-item-grid__hint">行を選択すると{itemLabel}の設定をダイアログで編集できます。</p>
      <div>
        <CustomButton type="button" variant="neutral" disabled={disabled} onClick={add}>
          {itemLabel}を追加
        </CustomButton>
      </div>
      <Dialog
        open={openIndex !== null}
        onClose={() => setEditingIndex(null)}
        title={openIndex === null ? itemLabel : getDialogTitle?.(openIndex) ?? `${itemLabel} ${openIndex + 1}`}
        size="lg"
        footer={openIndex === null ? null : (
          <DialogFooterLayout
            leading={<>
              {onMove ? <>
                <CustomButton type="button" variant="neutral" disabled={disabled || openIndex === 0} onClick={() => move(-1)}>上へ</CustomButton>
                <CustomButton type="button" variant="neutral" disabled={disabled || openIndex === rows.length - 1} onClick={() => move(1)}>下へ</CustomButton>
              </> : null}
              <CustomButton type="button" variant="ghost" disabled={disabled} onClick={remove}>削除</CustomButton>
            </>}
            trailing={<CustomButton type="button" variant="accent" onClick={() => setEditingIndex(null)}>完了</CustomButton>}
          />
        )}
      >
        {openIndex === null ? null : renderEditor(openIndex)}
      </Dialog>
      <style jsx>{`
        .content-item-grid__hint { margin:0; color:var(--color-base-70-dark); font-size:.875rem; }
        .content-item-grid__invalid { color:#751b16; font-weight:700; }
      `}</style>
    </section>
  );
}
