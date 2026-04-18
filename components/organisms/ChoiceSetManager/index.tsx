'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import PageModeToggle from '@/components/atoms/PageModeToggle';
import CustomHeader from '@/components/atoms/CustomHeader';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import CustomTextArea from '@/components/atoms/CustomTextArea';
import CustomTextBox from '@/components/atoms/CustomTextBox';
import DataTable, { DATA_TABLE_DEFAULT_PAGE_HEIGHT, type DataTableColumn, type SortState } from '@/components/molecules/DataTable';
import ResponsiveActionGroup from '@/components/molecules/ResponsiveActionGroup';
import Dialog, { DialogFooterLayout } from '@/components/molecules/Dialog';
import { moveSelectedItemsByOne, moveSelectedItemsToTarget } from '@/components/molecules/DataTable/selection-utils';
import RowMoveButtons from '@/components/organisms/GameManagement/RowMoveButtons';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import { getGameManagementErrorMessage } from '@/lib/game-management/api';
import { useResponsiveLayoutMode, type LayoutMode } from '@/lib/hooks/useResponsiveLayoutMode';
import resources from '@/lib/resources';
import {
  createSaveDataFieldChoiceOption,
  createSaveDataFieldChoiceSet,
  deleteSaveDataFieldChoiceOption,
  deleteSaveDataFieldChoiceSet,
  fetchSaveDataFieldChoiceOptions,
  fetchSaveDataFieldChoiceSets,
  reorderSaveDataFieldChoiceOptions,
  updateSaveDataFieldChoiceOption,
  updateSaveDataFieldChoiceSet,
} from '@/lib/game-management/api/schema';
import type {
  CreateSaveDataFieldChoiceOptionRequest,
  CreateSaveDataFieldChoiceSetRequest,
  ReorderItemRequest,
  SaveDataFieldChoiceOptionDto,
  SaveDataFieldChoiceSetDto,
  UpdateSaveDataFieldChoiceOptionRequest,
  UpdateSaveDataFieldChoiceSetRequest,
} from '@/lib/game-management/types';
import type { PageMode } from '@/lib/game-management/resources';

function parsePositiveDisplayOrder(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

function validateDisplayOrderInput(value: string, required: boolean): string {
  if (!value.trim()) {
    return required ? '表示順を入力してください。' : '';
  }
  return parsePositiveDisplayOrder(value) == null ? '表示順は1以上の整数で入力してください。' : '';
}

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mergeOrderedOptionRows<T extends { id: number }>(
  rows: T[],
  orderedIds: number[] | null,
  isDeleted: (row: T) => boolean,
): T[] {
  if (!orderedIds) {
    return rows;
  }

  const rowMap = new Map(rows.map((row) => [row.id, row]));
  const orderedActiveRows = orderedIds
    .map((id) => rowMap.get(id))
    .filter((row): row is T => row !== undefined && !isDeleted(row));
  const orderedActiveIds = new Set(orderedActiveRows.map((row) => row.id));
  const remainingRows = rows.filter((row) => isDeleted(row) || !orderedActiveIds.has(row.id));

  return [...orderedActiveRows, ...remainingRows];
}

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

type ChoiceSetRow = {
  id: number;
  choiceSetKey: string;
  label: string;
  description: string;
  status: string;
  actions: string;
};

type ChoiceOptionRow = {
  id: number;
  optionKey: string;
  label: string;
  displayOrder: number;
  status: string;
  actions: string;
};

// ---------------------------------------------------------------------------
// Form state types
// ---------------------------------------------------------------------------

type ChoiceSetFormState = {
  choiceSetKey: string;
  label: string;
  description: string;
};

type ChoiceOptionFormState = {
  optionKey: string;
  label: string;
  description: string;
  displayOrder: string;
};

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const choiceSetColumns: DataTableColumn<ChoiceSetRow>[] = [
  { key: 'id', header: 'ID', width: '5rem', sortable: true, sortValue: (value) => Number(value ?? 0) },
  { key: 'choiceSetKey', header: 'choiceSetKey', sortable: true, filterable: true },
  { key: 'label', header: '表示名', sortable: true, filterable: true },
  { key: 'description', header: '説明', filterable: true },
  { key: 'status', header: '状態' },
];

const choiceOptionColumns: DataTableColumn<ChoiceOptionRow>[] = [
  { key: 'id', header: 'ID', width: '5rem', sortable: true, sortValue: (value) => Number(value ?? 0) },
  { key: 'optionKey', header: 'optionKey', sortable: true, filterable: true },
  { key: 'label', header: '表示名', sortable: true, filterable: true },
  { key: 'displayOrder', header: '順序', sortable: true, sortValue: (value) => Number(value ?? 0) },
  { key: 'status', header: '状態' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEmptyChoiceSetFormState(): ChoiceSetFormState {
  return { choiceSetKey: '', label: '', description: '' };
}

function createChoiceSetFormState(dto: SaveDataFieldChoiceSetDto): ChoiceSetFormState {
  return { choiceSetKey: dto.choiceSetKey, label: dto.label, description: dto.description ?? '' };
}

function createEmptyChoiceOptionFormState(): ChoiceOptionFormState {
  return { optionKey: '', label: '', description: '', displayOrder: '' };
}

function buildChoiceSetRequest(form: ChoiceSetFormState): CreateSaveDataFieldChoiceSetRequest {
  return {
    choiceSetKey: form.choiceSetKey.trim(),
    label: form.label.trim(),
    description: nullIfBlank(form.description),
  };
}

function buildChoiceOptionRequest(form: ChoiceOptionFormState): CreateSaveDataFieldChoiceOptionRequest {
  const displayOrder = parsePositiveDisplayOrder(form.displayOrder);
  return {
    optionKey: form.optionKey.trim(),
    label: form.label.trim(),
    description: nullIfBlank(form.description),
    ...(displayOrder != null ? { displayOrder } : {}),
  };
}

function buildChoiceOptionUpdateRequest(form: ChoiceOptionFormState): UpdateSaveDataFieldChoiceOptionRequest {
  return {
    optionKey: form.optionKey.trim(),
    label: form.label.trim(),
    description: nullIfBlank(form.description),
  };
}

// ---------------------------------------------------------------------------
// SectionCard (local, same pattern as SaveDataSchemaManager)
// ---------------------------------------------------------------------------

function SectionCard({ title, description, actions, layoutMode, children }: { title: string; description: string; actions?: React.ReactNode; layoutMode: LayoutMode; children: React.ReactNode }) {
  const headerLayoutClasses = 'mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between';

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className={headerLayoutClasses}>
        <div className="space-y-2">
          <CustomHeader level={2}>{title}</CustomHeader>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{description}</p>
        </div>
        {actions ? (
          <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1} align="end" className="w-full sm:w-auto">
            {actions}
          </ResponsiveActionGroup>
        ) : null}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChoiceSetManager() {
  const { isPending, startLoading } = useLoadingOverlay();
  const layoutMode = useResponsiveLayoutMode();
  const choiceSetDialogBodyRef = useRef<HTMLDivElement | null>(null);
  const choiceOptionDialogBodyRef = useRef<HTMLDivElement | null>(null);
  const [pageMode, setPageMode] = useState<PageMode>('view');
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [choiceSets, setChoiceSets] = useState<SaveDataFieldChoiceSetDto[]>([]);
  const [selectedChoiceSetId, setSelectedChoiceSetId] = useState('');
  const [choiceOptions, setChoiceOptions] = useState<SaveDataFieldChoiceOptionDto[]>([]);

  // ChoiceSet dialog
  const [choiceSetDialogOpen, setChoiceSetDialogOpen] = useState(false);
  const [editingChoiceSet, setEditingChoiceSet] = useState<SaveDataFieldChoiceSetDto | null>(null);
  const [choiceSetForm, setChoiceSetForm] = useState<ChoiceSetFormState>(createEmptyChoiceSetFormState());

  // ChoiceOption dialog
  const [choiceOptionDialogOpen, setChoiceOptionDialogOpen] = useState(false);
  const [editingChoiceOption, setEditingChoiceOption] = useState<SaveDataFieldChoiceOptionDto | null>(null);
  const [choiceOptionForm, setChoiceOptionForm] = useState<ChoiceOptionFormState>(createEmptyChoiceOptionFormState());
  const inlineDialogMessageVisible = choiceSetDialogOpen || choiceOptionDialogOpen;

  // Reorder state for choice options
  const [optRowOrder, setOptRowOrder] = useState<number[] | null>(null);
  const [optReorderDirty, setOptReorderDirty] = useState(false);
  const [optReorderSaving, setOptReorderSaving] = useState(false);

  // Selection state for choice options
  const [selectedOptionKeys, setSelectedOptionKeys] = useState<string[]>([]);

  // Sort/filter state tracking for option table
  const [optSortState, setOptSortState] = useState<SortState | null>(null);
  const [optFilteredCount, setOptFilteredCount] = useState<number | null>(null);

  const selectedChoiceSet = useMemo(
    () => choiceSets.find((cs) => cs.id === Number(selectedChoiceSetId)) ?? null,
    [choiceSets, selectedChoiceSetId],
  );

  // -----------------------------------------------------------------------
  // Load choice sets
  // -----------------------------------------------------------------------

  const loadChoiceSets = useCallback(async () => {
    setPageLoading(true);
    setError(null);
    try {
      const nextSets = await fetchSaveDataFieldChoiceSets();
      setChoiceSets(nextSets);
      if (!selectedChoiceSetId && nextSets.length > 0) {
        setSelectedChoiceSetId(String(nextSets[0].id));
      }
    } catch (loadError) {
      setError(getGameManagementErrorMessage(loadError, {
        fallback: resources.gameManagement.errors.listLoad,
        adminFallback: resources.gameManagement.errors.adminRequired,
      }));
    } finally {
      setPageLoading(false);
    }
  }, [selectedChoiceSetId]);

  useEffect(() => {
    void loadChoiceSets();
  }, [loadChoiceSets]);

  // -----------------------------------------------------------------------
  // Load choice options
  // -----------------------------------------------------------------------

  const loadChoiceOptions = useCallback(async () => {
    if (!selectedChoiceSetId) {
      setChoiceOptions([]);
      setOptRowOrder([]);
      setOptReorderDirty(false);
      return;
    }
    const nextOptions = await fetchSaveDataFieldChoiceOptions(Number(selectedChoiceSetId));
    setChoiceOptions(nextOptions);
    setOptRowOrder(nextOptions.filter((item) => !item.isDeleted).map((item) => item.id));
    setOptReorderDirty(false);
    setSelectedOptionKeys([]);
  }, [selectedChoiceSetId]);

  useEffect(() => {
    void loadChoiceOptions().catch((loadError) => {
      setError(getGameManagementErrorMessage(loadError, { fallback: resources.gameManagement.errors.detailLoad }));
    });
  }, [loadChoiceOptions]);

  // -----------------------------------------------------------------------
  // Table rows
  // -----------------------------------------------------------------------

  const choiceSetRows = useMemo<ChoiceSetRow[]>(() => choiceSets.map((cs) => ({
    id: cs.id,
    choiceSetKey: cs.choiceSetKey,
    label: cs.label,
    description: cs.description ?? '',
    status: cs.isDeleted ? '削除済み' : '有効',
    actions: '',
  })), [choiceSets]);

  const choiceOptionRows = useMemo<ChoiceOptionRow[]>(() => choiceOptions.map((opt) => ({
    id: opt.id,
    optionKey: opt.optionKey,
    label: opt.label,
    displayOrder: opt.displayOrder,
    status: opt.isDeleted ? '削除済み' : '有効',
    actions: '',
  })), [choiceOptions]);

  // -----------------------------------------------------------------------
  // ChoiceSet CRUD
  // -----------------------------------------------------------------------

  const openCreateChoiceSetDialog = useCallback(() => {
    setEditingChoiceSet(null);
    setChoiceSetForm(createEmptyChoiceSetFormState());
    setChoiceSetDialogOpen(true);
  }, []);

  const openEditChoiceSetDialog = useCallback((cs: SaveDataFieldChoiceSetDto) => {
    setEditingChoiceSet(cs);
    setChoiceSetForm(createChoiceSetFormState(cs));
    setChoiceSetDialogOpen(true);
  }, []);

  const closeChoiceSetDialog = useCallback(() => {
    setChoiceSetDialogOpen(false);
    setEditingChoiceSet(null);
    setChoiceSetForm(createEmptyChoiceSetFormState());
  }, []);

  const focusFirstField = useCallback((container: HTMLDivElement | null) => {
    requestAnimationFrame(() => {
      const firstField = container?.querySelector<HTMLElement>(
        'input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([readonly]):not([disabled])',
      );
      firstField?.focus();
    });
  }, []);

  const handleSaveChoiceSet = useCallback(async (afterSave: 'close' | 'continue' = 'close') => {
    setSuccess(null);

    if (!choiceSetForm.choiceSetKey.trim() || !choiceSetForm.label.trim()) {
      setError('choiceSetKey と表示名は必須です。');
      return;
    }

    try {
      setError(null);
      const continueCreating = afterSave === 'continue' && !editingChoiceSet;
      await startLoading(async () => {
        const payload = buildChoiceSetRequest(choiceSetForm);
        if (editingChoiceSet) {
          await updateSaveDataFieldChoiceSet(editingChoiceSet.id, payload as UpdateSaveDataFieldChoiceSetRequest);
        } else {
          await createSaveDataFieldChoiceSet(payload);
        }
      }, editingChoiceSet ? '選択肢セットを保存中...' : '選択肢セットを作成中...');

      await loadChoiceSets();
      if (continueCreating) {
        setEditingChoiceSet(null);
        setChoiceSetForm(createEmptyChoiceSetFormState());
        setSuccess('選択肢セットを作成しました。続けて入力できます。');
        focusFirstField(choiceSetDialogBodyRef.current);
      } else {
        closeChoiceSetDialog();
        setSuccess(editingChoiceSet ? '選択肢セットを更新しました。' : '選択肢セットを作成しました。');
      }
    } catch (saveError) {
      setError(getGameManagementErrorMessage(saveError, { fallback: resources.gameManagement.errors.save }));
    }
  }, [choiceSetForm, closeChoiceSetDialog, editingChoiceSet, focusFirstField, loadChoiceSets, startLoading]);

  const handleDeleteChoiceSet = useCallback(async (cs: SaveDataFieldChoiceSetDto) => {
    if (!window.confirm(`選択肢セット「${cs.label}」を削除しますか。`)) return;

    try {
      setError(null);
      setSuccess(null);
      await startLoading(async () => {
        await deleteSaveDataFieldChoiceSet(cs.id);
      }, '選択肢セットを削除中...');
      setSuccess('選択肢セットを削除しました。');
      if (selectedChoiceSetId === String(cs.id)) {
        setSelectedChoiceSetId('');
      }
      await loadChoiceSets();
    } catch (deleteError) {
      setError(getGameManagementErrorMessage(deleteError, { fallback: resources.gameManagement.errors.delete }));
    }
  }, [loadChoiceSets, selectedChoiceSetId, startLoading]);

  // -----------------------------------------------------------------------
  // ChoiceOption CRUD
  // -----------------------------------------------------------------------

  const openCreateChoiceOptionDialog = useCallback(() => {
    setEditingChoiceOption(null);
    setChoiceOptionForm(createEmptyChoiceOptionFormState());
    setChoiceOptionDialogOpen(true);
  }, []);

  const openEditChoiceOptionDialog = useCallback((opt: SaveDataFieldChoiceOptionDto) => {
    setEditingChoiceOption(opt);
    setChoiceOptionForm({
      optionKey: opt.optionKey,
      label: opt.label,
      description: opt.description ?? '',
      displayOrder: String(opt.displayOrder),
    });
    setChoiceOptionDialogOpen(true);
  }, []);

  const handleSaveChoiceOption = useCallback(async (afterSave: 'close' | 'continue' = 'close') => {
    setSuccess(null);

    if (!selectedChoiceSetId) {
      setError('選択肢セットを選択してください。');
      return;
    }
    if (!choiceOptionForm.optionKey.trim() || !choiceOptionForm.label.trim()) {
      setError('optionKey と表示名は必須です。');
      return;
    }
    if (!editingChoiceOption) {
      const displayOrderError = validateDisplayOrderInput(choiceOptionForm.displayOrder, false);
      if (displayOrderError) {
        setError(displayOrderError);
        return;
      }
    }

    try {
      setError(null);
      const continueCreating = afterSave === 'continue' && !editingChoiceOption;
      await startLoading(async () => {
        if (editingChoiceOption) {
          await updateSaveDataFieldChoiceOption(editingChoiceOption.id, buildChoiceOptionUpdateRequest(choiceOptionForm));
        } else {
          await createSaveDataFieldChoiceOption(Number(selectedChoiceSetId), buildChoiceOptionRequest(choiceOptionForm));
        }
      }, editingChoiceOption ? '候補値を保存中...' : '候補値を作成中...');

      await loadChoiceOptions();
      if (continueCreating) {
        setEditingChoiceOption(null);
        setChoiceOptionForm(createEmptyChoiceOptionFormState());
        setSuccess('候補値を作成しました。続けて入力できます。');
        focusFirstField(choiceOptionDialogBodyRef.current);
      } else {
        setChoiceOptionDialogOpen(false);
        setSuccess(editingChoiceOption ? '候補値を更新しました。' : '候補値を作成しました。');
      }
    } catch (saveError) {
      setError(getGameManagementErrorMessage(saveError, { fallback: resources.gameManagement.errors.save }));
    }
  }, [choiceOptionForm, editingChoiceOption, focusFirstField, loadChoiceOptions, selectedChoiceSetId, startLoading]);

  const handleDeleteChoiceOption = useCallback(async (opt: SaveDataFieldChoiceOptionDto) => {
    if (!window.confirm(`候補値「${opt.label}」を削除しますか。`)) return;

    try {
      setError(null);
      setSuccess(null);
      await startLoading(async () => {
        await deleteSaveDataFieldChoiceOption(opt.id);
      }, '候補値を削除中...');
      setSuccess('候補値を削除しました。');
      await loadChoiceOptions();
    } catch (deleteError) {
      setError(getGameManagementErrorMessage(deleteError, { fallback: resources.gameManagement.errors.delete }));
    }
  }, [loadChoiceOptions, startLoading]);

  // -----------------------------------------------------------------------
  // ChoiceOption reorder
  // -----------------------------------------------------------------------

  const optReorderEnabled = pageMode === 'edit';
  const activeChoiceOptionCount = choiceOptions.filter((o) => !o.isDeleted).length;

  const optIsSortActive = optSortState !== null;
  const optIsFilterActive = optFilteredCount !== null && optFilteredCount !== choiceOptionRows.length;
  const effectiveOptReorderEnabled = optReorderEnabled && !optIsSortActive && !optIsFilterActive;
  const optReorderDisabledReason = pageMode === 'view'
    ? '編集モードを有効にすると並び替えできます'
    : optIsSortActive
      ? 'ソートを解除すると並び替えできます'
      : optIsFilterActive
        ? 'フィルタを解除すると並び替えできます'
        : undefined;

  const handleOptFilteredDataChange = useCallback((data: Record<string, unknown>[]) => {
    setOptFilteredCount(data.length);
  }, []);

  const selectedVisibleOptions = useMemo(() => {
    return choiceOptions.filter((o) => !o.isDeleted && selectedOptionKeys.includes(String(o.id)));
  }, [choiceOptions, selectedOptionKeys]);

  const handleMoveOption = useCallback((id: number, direction: 'up' | 'down') => {
    setOptRowOrder((prev) => {
      if (!prev) return prev;
      const selectedIds = selectedVisibleOptions
        .map((item) => item.id)
        .filter((selectedId) => prev.includes(selectedId));
      const moveIds = selectedOptionKeys.includes(String(id)) && selectedIds.length > 0
        ? selectedIds
        : [id];
      const next = moveSelectedItemsByOne(prev, moveIds, direction);
      if (next.every((value, index) => value === prev[index])) {
        return prev;
      }
      setOptReorderDirty(true);
      return next;
    });
  }, [selectedOptionKeys, selectedVisibleOptions]);

  const handleOptRowMove = useCallback((fromIndex: number, toIndex: number) => {
    setOptRowOrder((prev) => {
      if (!prev) return prev;
      const selectedIds = selectedVisibleOptions
        .map((item) => item.id)
        .filter((selectedId) => prev.includes(selectedId));
      const draggedId = prev[fromIndex];
      const moveIds = draggedId !== undefined && selectedOptionKeys.includes(String(draggedId)) && selectedIds.length > 1
        ? selectedIds
        : [];
      const next = moveIds.length > 1
        ? moveSelectedItemsToTarget(prev, moveIds, fromIndex, toIndex)
        : (() => {
            const arr = [...prev];
            const [moved] = arr.splice(fromIndex, 1);
            if (moved == null) return prev;
            arr.splice(toIndex, 0, moved);
            return arr;
          })();
      if (next.every((value, index) => value === prev[index])) {
        return prev;
      }
      setOptReorderDirty(true);
      return next;
    });
  }, [selectedOptionKeys, selectedVisibleOptions]);

  const handleSaveOptReorder = useCallback(async () => {
    if (!optRowOrder || !optReorderDirty || !selectedChoiceSetId) return;
    setOptReorderSaving(true);
    try {
      const optMap = new Map(choiceOptions.map((o) => [o.id, o]));
      const items: ReorderItemRequest[] = optRowOrder
        .map((id, index) => {
          const newOrder = index + 1;
          const dto = optMap.get(id);
          if (dto?.displayOrder === newOrder) return null;
          return { id, displayOrder: newOrder };
        })
        .filter((item): item is ReorderItemRequest => item !== null);

      if (items.length > 0) {
        await startLoading(async () => {
          await reorderSaveDataFieldChoiceOptions(Number(selectedChoiceSetId), items);
        }, '候補値の表示順を保存中...');
      }
      setOptReorderDirty(false);
      setSuccess('候補値の表示順を保存しました。');
      await loadChoiceOptions();
    } catch (saveError) {
      setError(getGameManagementErrorMessage(saveError, { fallback: resources.gameManagement.errors.reorder }));
    } finally {
      setOptReorderSaving(false);
    }
  }, [optRowOrder, optReorderDirty, selectedChoiceSetId, choiceOptions, startLoading, loadChoiceOptions]);

  // -----------------------------------------------------------------------
  // Sorted rows
  // -----------------------------------------------------------------------

  const choiceSetRowsWithActions = useMemo(() => choiceSetRows.map((row) => {
    const cs = choiceSets.find((item) => item.id === row.id)!;
    return { ...row, actionContent: cs };
  }), [choiceSetRows, choiceSets]);

  const choiceOptionRowsWithActions = useMemo(() => choiceOptionRows.map((row) => {
    const opt = choiceOptions.find((item) => item.id === row.id)!;
    return { ...row, actionContent: opt };
  }), [choiceOptionRows, choiceOptions]);

  const sortedOptionRows = useMemo(() => {
    return mergeOrderedOptionRows(choiceOptionRowsWithActions, optRowOrder, (row) => {
      const option = choiceOptions.find((item) => item.id === row.id);
      return option?.isDeleted ?? false;
    });
  }, [choiceOptionRowsWithActions, optRowOrder, choiceOptions]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(241,245,249,0.95))] p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.95),rgba(9,9,11,0.95))] dark:ring-zinc-800">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Choice Set Management</p>
            <CustomHeader level={1}>共有選択肢セット管理</CustomHeader>
            <p className="max-w-4xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              複数の SaveDataFieldDefinition（SingleSelect）で共有できる候補値セットを管理します。
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <PageModeToggle mode={pageMode} onChange={setPageMode} />
          </div>
        </div>

        {error && !inlineDialogMessageVisible ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
        {success && !inlineDialogMessageVisible ? <CustomMessageArea variant="success">{success}</CustomMessageArea> : null}

        {pageLoading ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500">管理画面を読み込んでいます...</p>
          </section>
        ) : (
          <>
            <SectionCard
              layoutMode={layoutMode}
              title="選択肢セット一覧"
              description="共有選択肢セットの一覧です。セットを選択すると配下の候補値を管理できます。"
              actions={
                pageMode === 'edit' ? (
                  <CustomButton variant="accent" onClick={openCreateChoiceSetDialog}>選択肢セットを追加</CustomButton>
                ) : null
              }
            >
              <DataTable
                columns={[
                  ...choiceSetColumns,
                  {
                    key: 'actions',
                    header: '操作',
                    render: (_, row) => {
                      const cs = choiceSets.find((item) => item.id === row.id)!;
                      return (
                        <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={2}>
                          <CustomButton onClick={() => openEditChoiceSetDialog(cs)}>{pageMode === 'view' ? '詳細' : '編集'}</CustomButton>
                          <CustomButton onClick={() => setSelectedChoiceSetId(String(cs.id))}>候補値</CustomButton>
                          {pageMode === 'edit' && (
                            <CustomButton variant="ghost" onClick={() => void handleDeleteChoiceSet(cs)}>削除</CustomButton>
                          )}
                        </ResponsiveActionGroup>
                      );
                    },
                  },
                ]}
                data={choiceSetRowsWithActions}
                height={DATA_TABLE_DEFAULT_PAGE_HEIGHT}
                rowKey="id"
                emptyMessage="選択肢セットがありません。"
                paginated
              />
            </SectionCard>

            <SectionCard
              layoutMode={layoutMode}
              title="候補値"
              description={selectedChoiceSet ? `「${selectedChoiceSet.label}」の候補値を管理します。` : '選択肢セットを選択してください。'}
              actions={selectedChoiceSet ? (
                <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1} align="end">
                  {pageMode === 'edit' ? (
                    <CustomButton variant="accent" onClick={openCreateChoiceOptionDialog}>候補値を追加</CustomButton>
                  ) : null}
                  <CustomButton variant="accent" disabled={!optReorderDirty || optReorderSaving || pageMode === 'view' || activeChoiceOptionCount <= 1} onClick={() => void handleSaveOptReorder()}>表示順を保存</CustomButton>
                </ResponsiveActionGroup>
              ) : null}
            >
              {selectedChoiceSet ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-end gap-3 text-sm">
                    {selectedVisibleOptions.length > 0 && effectiveOptReorderEnabled ? (
                      <span className="text-xs text-zinc-500 dark:text-zinc-300">
                        選択中: {selectedVisibleOptions.length} 件（Shift+クリックで範囲選択、上下移動でまとめて並び替え）
                      </span>
                    ) : null}
                    {!effectiveOptReorderEnabled && optReorderDisabledReason && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">{optReorderDisabledReason}</span>
                    )}
                  </div>
                  <DataTable
                    key={`options:${selectedChoiceSet?.id ?? 'none'}`}
                    columns={[
                      ...choiceOptionColumns,
                      {
                        key: 'actions',
                        header: '操作',
                        render: (_, row) => {
                          const opt = choiceOptions.find((item) => item.id === row.id)!;
                          const idx = optRowOrder?.indexOf(row.id) ?? -1;
                          return (
                            <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={2}>
                              <RowMoveButtons
                                isFirst={idx <= 0}
                                isLast={idx === (optRowOrder?.length ?? 0) - 1}
                                disabled={!effectiveOptReorderEnabled || optReorderSaving}
                                onMoveUp={() => handleMoveOption(row.id, 'up')}
                                onMoveDown={() => handleMoveOption(row.id, 'down')}
                              />
                              <CustomButton onClick={() => openEditChoiceOptionDialog(opt)}>{pageMode === 'view' ? '詳細' : '編集'}</CustomButton>
                              {pageMode === 'edit' && (
                                <CustomButton variant="ghost" onClick={() => void handleDeleteChoiceOption(opt)}>削除</CustomButton>
                              )}
                            </ResponsiveActionGroup>
                          );
                        },
                      },
                    ]}
                    data={sortedOptionRows}
                    height={DATA_TABLE_DEFAULT_PAGE_HEIGHT}
                    rowKey="id"
                    selectable
                    selectedKeys={selectedOptionKeys}
                    onSelectionChange={setSelectedOptionKeys}
                    emptyMessage="候補値がありません。"
                    paginated
                    rowReorderEnabled={effectiveOptReorderEnabled}
                    rowReorderDisabledReason={optReorderDisabledReason}
                    onRowMove={handleOptRowMove}
                    sortState={optSortState}
                    onSortChange={setOptSortState}
                    onFilteredDataChange={handleOptFilteredDataChange}
                  />
                </div>
              ) : (
                <p className="text-sm text-zinc-500">上の一覧から選択肢セットを選んでください。</p>
              )}
            </SectionCard>
          </>
        )}

        {/* ChoiceSet dialog */}
        <Dialog
          open={choiceSetDialogOpen}
          onClose={closeChoiceSetDialog}
          closeDisabled={isPending}
          title={editingChoiceSet ? (pageMode === 'view' ? '選択肢セットの詳細' : '選択肢セットを編集') : '選択肢セットを追加'}
          footer={
            pageMode === 'view' && editingChoiceSet ? (
              <DialogFooterLayout
                layoutMode={layoutMode}
                trailing={
                  <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1} align="end">
                    <CustomButton onClick={closeChoiceSetDialog}>閉じる</CustomButton>
                    <CustomButton variant="accent" onClick={() => setPageMode('edit')}>編集を有効化</CustomButton>
                  </ResponsiveActionGroup>
                }
              />
            ) : (
              <DialogFooterLayout
                layoutMode={layoutMode}
                status={isPending ? <span role="status" aria-live="polite" className="text-xs text-zinc-500 dark:text-zinc-300">保存中はダイアログを閉じられません。</span> : null}
                trailing={
                  <>
                    {editingChoiceSet ? (
                      <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1}>
                        <CustomButton onClick={() => setPageMode('view')}>読み取り専用に戻す</CustomButton>
                      </ResponsiveActionGroup>
                    ) : null}
                    <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1} align="end">
                      <CustomButton onClick={closeChoiceSetDialog} disabled={isPending}>キャンセル</CustomButton>
                      {!editingChoiceSet ? (
                        <>
                          <CustomButton onClick={() => void handleSaveChoiceSet('continue')} disabled={isPending}>作成して続ける</CustomButton>
                          <CustomButton variant="accent" onClick={() => void handleSaveChoiceSet('close')} disabled={isPending}>作成して閉じる</CustomButton>
                        </>
                      ) : (
                        <CustomButton variant="accent" onClick={() => void handleSaveChoiceSet('close')} disabled={isPending}>保存</CustomButton>
                      )}
                    </ResponsiveActionGroup>
                  </>
                }
              />
            )
          }
        >
            <div ref={choiceSetDialogBodyRef} className="space-y-4">
            {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
            {success ? <CustomMessageArea variant="success">{success}</CustomMessageArea> : null}
            <div className="space-y-2">
              <CustomLabel htmlFor="choice-set-key">choiceSetKey</CustomLabel>
              <CustomTextBox id="choice-set-key" value={choiceSetForm.choiceSetKey} onChange={(event) => setChoiceSetForm((current) => ({ ...current, choiceSetKey: event.target.value }))} displayOnly={pageMode === 'view' && !!editingChoiceSet} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="choice-set-label">表示名</CustomLabel>
              <CustomTextBox id="choice-set-label" value={choiceSetForm.label} onChange={(event) => setChoiceSetForm((current) => ({ ...current, label: event.target.value }))} displayOnly={pageMode === 'view' && !!editingChoiceSet} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="choice-set-description">説明</CustomLabel>
              <CustomTextArea id="choice-set-description" value={choiceSetForm.description} onChange={(event) => setChoiceSetForm((current) => ({ ...current, description: event.target.value }))} displayOnly={pageMode === 'view' && !!editingChoiceSet} />
            </div>
          </div>
        </Dialog>

        {/* ChoiceOption dialog */}
        <Dialog
          open={choiceOptionDialogOpen}
          onClose={() => setChoiceOptionDialogOpen(false)}
          closeDisabled={isPending}
          title={editingChoiceOption ? (pageMode === 'view' ? '候補値の詳細' : '候補値を編集') : '候補値を追加'}
          footer={
            pageMode === 'view' && editingChoiceOption ? (
              <DialogFooterLayout
                layoutMode={layoutMode}
                trailing={
                  <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1} align="end">
                    <CustomButton onClick={() => setChoiceOptionDialogOpen(false)}>閉じる</CustomButton>
                    <CustomButton variant="accent" onClick={() => setPageMode('edit')}>編集を有効化</CustomButton>
                  </ResponsiveActionGroup>
                }
              />
            ) : (
              <DialogFooterLayout
                layoutMode={layoutMode}
                status={isPending ? <span role="status" aria-live="polite" className="text-xs text-zinc-500 dark:text-zinc-300">保存中はダイアログを閉じられません。</span> : null}
                trailing={
                  <>
                    {editingChoiceOption ? (
                      <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1}>
                        <CustomButton onClick={() => setPageMode('view')}>読み取り専用に戻す</CustomButton>
                      </ResponsiveActionGroup>
                    ) : null}
                    <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1} align="end">
                      <CustomButton onClick={() => setChoiceOptionDialogOpen(false)} disabled={isPending}>キャンセル</CustomButton>
                      {!editingChoiceOption ? (
                        <>
                          <CustomButton onClick={() => void handleSaveChoiceOption('continue')} disabled={isPending}>作成して続ける</CustomButton>
                          <CustomButton variant="accent" onClick={() => void handleSaveChoiceOption('close')} disabled={isPending}>作成して閉じる</CustomButton>
                        </>
                      ) : (
                        <CustomButton variant="accent" onClick={() => void handleSaveChoiceOption('close')} disabled={isPending}>保存</CustomButton>
                      )}
                    </ResponsiveActionGroup>
                  </>
                }
              />
            )
          }
        >
            <div ref={choiceOptionDialogBodyRef} className="space-y-4">
            {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
            {success ? <CustomMessageArea variant="success">{success}</CustomMessageArea> : null}
            <div className="space-y-2">
              <CustomLabel htmlFor="choice-option-key">optionKey</CustomLabel>
              <CustomTextBox id="choice-option-key" value={choiceOptionForm.optionKey} onChange={(event) => setChoiceOptionForm((current) => ({ ...current, optionKey: event.target.value }))} displayOnly={pageMode === 'view' && !!editingChoiceOption} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="choice-option-label">表示名</CustomLabel>
              <CustomTextBox id="choice-option-label" value={choiceOptionForm.label} onChange={(event) => setChoiceOptionForm((current) => ({ ...current, label: event.target.value }))} displayOnly={pageMode === 'view' && !!editingChoiceOption} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="choice-option-description">説明</CustomLabel>
              <CustomTextArea id="choice-option-description" value={choiceOptionForm.description} onChange={(event) => setChoiceOptionForm((current) => ({ ...current, description: event.target.value }))} displayOnly={pageMode === 'view' && !!editingChoiceOption} />
            </div>
            {!editingChoiceOption ? (
              <div className="space-y-2">
                <CustomLabel htmlFor="choice-option-order">表示順（任意）</CustomLabel>
                <CustomTextBox id="choice-option-order" type="number" min={1} step="1" value={choiceOptionForm.displayOrder} placeholder="未入力で末尾に追加" onChange={(event) => setChoiceOptionForm((current) => ({ ...current, displayOrder: event.target.value }))} displayOnly={false} />
              </div>
            ) : null}
          </div>
        </Dialog>
      </div>
    </main>
  );
}
