'use client';

import { useCallback, useState } from 'react';

/**
 * CRUD ダイアログの開閉・フォーム状態を共通化するフック。
 * SaveDataSchemaManager / StoryProgressManager の definition / option / override
 * ダイアログなど、同一パターンの繰り返しを 1 行のフック呼び出しに集約する。
 */
export function useCrudDialog<TItem, TForm>({
  emptyForm,
  editForm,
}: {
  /** 新規作成時の空フォーム */
  emptyForm: () => TForm;
  /** 編集時のフォーム初期化（アイテムから変換） */
  editForm: (item: TItem) => TForm;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TItem | null>(null);
  const [formState, setFormState] = useState<TForm>(emptyForm());

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormState(emptyForm());
    setOpen(true);
  }, [emptyForm]);

  const openEdit = useCallback(
    (item: TItem) => {
      setEditing(item);
      setFormState(editForm(item));
      setOpen(true);
    },
    [editForm],
  );

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return { open, editing, formState, setFormState, openCreate, openEdit, close };
}
