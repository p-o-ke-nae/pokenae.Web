'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import CustomComboBox from '@/components/atoms/CustomComboBox';
import CustomHeader from '@/components/atoms/CustomHeader';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import CustomTextArea from '@/components/atoms/CustomTextArea';
import CustomTextBox from '@/components/atoms/CustomTextBox';
import DataTable, { type DataTableColumn } from '@/components/molecules/DataTable';
import Dialog from '@/components/molecules/Dialog';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import {
  ApiError,
  createStoryProgressDefinition,
  deleteStoryProgressDefinition,
  deleteStoryProgressOverride,
  fetchMasterLookups,
  fetchPublicStoryProgressSchema,
  fetchStoryProgressDefinitions,
  fetchStoryProgressOverrides,
  updateStoryProgressDefinition,
  upsertStoryProgressOverride,
} from '@/lib/game-management/api';
import type {
  CreateStoryProgressDefinitionRequest,
  MasterLookups,
  StoryProgressDefinitionDto,
  StoryProgressOverrideDto,
  StoryProgressSchemaDto,
  UpdateStoryProgressDefinitionRequest,
  UpsertStoryProgressOverrideRequest,
} from '@/lib/game-management/types';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

type DefinitionRow = {
  id: number;
  progressKey: string;
  label: string;
  displayOrder: number;
  status: string;
  actions: string;
};

type OverrideRow = {
  id: number;
  progressKey: string;
  baseLabel: string;
  overrideLabel: string;
  disabled: string;
  status: string;
  actions: string;
};

type PreviewRow = {
  id: number;
  progressKey: string;
  label: string;
  displayOrder: number;
  disabled: string;
};

// ---------------------------------------------------------------------------
// Form states
// ---------------------------------------------------------------------------

type DefinitionFormState = {
  progressKey: string;
  label: string;
  description: string;
  displayOrder: string;
};

type OverrideFormState = {
  overrideLabel: string;
  overrideDescription: string;
  isDisabled: boolean;
};

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const definitionColumns: DataTableColumn<DefinitionRow>[] = [
  { key: 'id', header: 'ID', width: '5rem', sortable: true, sortValue: (value) => Number(value ?? 0) },
  { key: 'progressKey', header: 'progressKey', sortable: true, filterable: true },
  { key: 'label', header: '表示名', sortable: true, filterable: true },
  { key: 'displayOrder', header: '順序', sortable: true, sortValue: (value) => Number(value ?? 0) },
  { key: 'status', header: '状態' },
];

const overrideColumns: DataTableColumn<OverrideRow>[] = [
  { key: 'progressKey', header: 'progressKey', sortable: true, filterable: true },
  { key: 'baseLabel', header: '基本ラベル', sortable: true, filterable: true },
  { key: 'overrideLabel', header: 'override ラベル', filterable: true },
  { key: 'disabled', header: '無効化' },
  { key: 'status', header: '状態' },
];

const previewColumns: DataTableColumn<PreviewRow>[] = [
  { key: 'progressKey', header: 'progressKey', sortable: true, filterable: true },
  { key: 'label', header: '表示名', sortable: true, filterable: true },
  { key: 'displayOrder', header: '順序', sortable: true, sortValue: (value) => Number(value ?? 0) },
  { key: 'disabled', header: '無効化' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function createEmptyDefinitionFormState(): DefinitionFormState {
  return { progressKey: '', label: '', description: '', displayOrder: '0' };
}

function createEmptyOverrideFormState(): OverrideFormState {
  return { overrideLabel: '', overrideDescription: '', isDisabled: false };
}

function createOverrideFormStateFromDto(override: StoryProgressOverrideDto | null): OverrideFormState {
  return {
    overrideLabel: override?.overrideLabel ?? '',
    overrideDescription: override?.overrideDescription ?? '',
    isDisabled: override?.isDisabled ?? false,
  };
}

function createDefinitionRequest(formState: DefinitionFormState): CreateStoryProgressDefinitionRequest {
  return {
    progressKey: formState.progressKey.trim(),
    label: formState.label.trim(),
    description: nullIfBlank(formState.description),
    displayOrder: Number(formState.displayOrder),
  };
}

function createOverrideRequest(formState: OverrideFormState): UpsertStoryProgressOverrideRequest {
  return {
    overrideLabel: nullIfBlank(formState.overrideLabel),
    overrideDescription: nullIfBlank(formState.overrideDescription),
    isDisabled: formState.isDisabled,
  };
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <CustomLabel htmlFor={id}>{label}</CustomLabel>
      <CustomComboBox id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">選択してください</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </CustomComboBox>
    </div>
  );
}

function SectionCard({ title, description, actions, children }: { title: string; description: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <CustomHeader level={2}>{title}</CustomHeader>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoryProgressManager() {
  const { startLoading } = useLoadingOverlay();

  const [lookups, setLookups] = useState<MasterLookups | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedContentGroupId, setSelectedContentGroupId] = useState('');
  const [selectedGameSoftwareMasterId, setSelectedGameSoftwareMasterId] = useState('');

  const [definitions, setDefinitions] = useState<StoryProgressDefinitionDto[]>([]);
  const [overrideDefinitions, setOverrideDefinitions] = useState<StoryProgressDefinitionDto[]>([]);
  const [overrides, setOverrides] = useState<StoryProgressOverrideDto[]>([]);
  const [resolvedSchema, setResolvedSchema] = useState<StoryProgressSchemaDto | null>(null);

  const [definitionDialogOpen, setDefinitionDialogOpen] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<StoryProgressDefinitionDto | null>(null);
  const [definitionFormState, setDefinitionFormState] = useState<DefinitionFormState>(createEmptyDefinitionFormState());

  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<StoryProgressOverrideDto | null>(null);
  const [overrideTargetDefinition, setOverrideTargetDefinition] = useState<StoryProgressDefinitionDto | null>(null);
  const [overrideFormState, setOverrideFormState] = useState<OverrideFormState>(createEmptyOverrideFormState());

  // -----------------------------------------------------------------------
  // Load master lookups
  // -----------------------------------------------------------------------

  const loadMasters = useCallback(async () => {
    setPageLoading(true);
    setError(null);
    try {
      const nextLookups = await fetchMasterLookups();
      setLookups(nextLookups);
      if (!selectedContentGroupId && nextLookups.gameSoftwareContentGroups.length > 0) {
        setSelectedContentGroupId(String(nextLookups.gameSoftwareContentGroups[0].id));
      }
      if (!selectedGameSoftwareMasterId && nextLookups.gameSoftwareMasters.length > 0) {
        setSelectedGameSoftwareMasterId(String(nextLookups.gameSoftwareMasters[0].id));
      }
    } catch (loadError) {
      const message = loadError instanceof ApiError && loadError.statusCode === 403
        ? '管理者権限が必要です。'
        : loadError instanceof Error
          ? loadError.message
          : 'ストーリー進行度管理画面の初期化に失敗しました。';
      setError(message);
    } finally {
      setPageLoading(false);
    }
  }, [selectedContentGroupId, selectedGameSoftwareMasterId]);

  useEffect(() => {
    void loadMasters();
  }, [loadMasters]);

  // -----------------------------------------------------------------------
  // Load definitions for selected content group
  // -----------------------------------------------------------------------

  const loadDefinitions = useCallback(async () => {
    if (!selectedContentGroupId) {
      setDefinitions([]);
      return;
    }
    const items = await fetchStoryProgressDefinitions(Number(selectedContentGroupId));
    setDefinitions(items);
  }, [selectedContentGroupId]);

  useEffect(() => {
    void loadDefinitions().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : '進行度定義の取得に失敗しました。');
    });
  }, [loadDefinitions]);

  // -----------------------------------------------------------------------
  // Load overrides for selected software master
  // -----------------------------------------------------------------------

  const selectedSoftwareMaster = useMemo(
    () => lookups?.gameSoftwareMasters.find((item) => item.id === Number(selectedGameSoftwareMasterId)) ?? null,
    [lookups, selectedGameSoftwareMasterId],
  );

  const loadOverrides = useCallback(async () => {
    if (!selectedGameSoftwareMasterId || !selectedSoftwareMaster) {
      setOverrides([]);
      setOverrideDefinitions([]);
      setResolvedSchema(null);
      return;
    }
    const contentGroupId = selectedSoftwareMaster.contentGroupId;
    const [nextOverrides, nextDefinitions, nextSchema] = await Promise.all([
      fetchStoryProgressOverrides(Number(selectedGameSoftwareMasterId)),
      contentGroupId != null ? fetchStoryProgressDefinitions(contentGroupId) : Promise.resolve([]),
      fetchPublicStoryProgressSchema(Number(selectedGameSoftwareMasterId)),
    ]);
    setOverrides(nextOverrides);
    setOverrideDefinitions(nextDefinitions);
    setResolvedSchema(nextSchema);
  }, [selectedGameSoftwareMasterId, selectedSoftwareMaster]);

  useEffect(() => {
    void loadOverrides().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'override の取得に失敗しました。');
    });
  }, [loadOverrides]);

  // -----------------------------------------------------------------------
  // Combobox options
  // -----------------------------------------------------------------------

  const contentGroupOptions = useMemo(
    () => (lookups?.gameSoftwareContentGroups ?? []).filter((item) => !item.isDeleted).map((item) => ({ value: String(item.id), label: item.name })),
    [lookups],
  );

  const softwareMasterOptions = useMemo(
    () => (lookups?.gameSoftwareMasters ?? []).filter((item) => !item.isDeleted).map((item) => ({ value: String(item.id), label: item.name })),
    [lookups],
  );

  // -----------------------------------------------------------------------
  // Definition table rows
  // -----------------------------------------------------------------------

  const definitionRows: DefinitionRow[] = useMemo(
    () => definitions.map((item) => ({
      id: item.id,
      progressKey: item.progressKey,
      label: item.label,
      displayOrder: item.displayOrder,
      status: item.isDeleted ? '🗑 削除済' : '有効',
      actions: '',
    })),
    [definitions],
  );

  // -----------------------------------------------------------------------
  // Override table rows
  // -----------------------------------------------------------------------

  const overrideRows: OverrideRow[] = useMemo(() => {
    return overrideDefinitions.filter((def) => !def.isDeleted).map((def) => {
      const existing = overrides.find((o) => o.storyProgressDefinitionId === def.id);
      return {
        id: def.id,
        progressKey: def.progressKey,
        baseLabel: def.label,
        overrideLabel: existing?.overrideLabel ?? '',
        disabled: existing?.isDisabled ? 'はい' : 'いいえ',
        status: existing ? (existing.isDeleted ? '🗑 削除済' : '設定済') : '未設定',
        actions: '',
      };
    });
  }, [overrideDefinitions, overrides]);

  // -----------------------------------------------------------------------
  // Preview rows
  // -----------------------------------------------------------------------

  const previewRows: PreviewRow[] = useMemo(
    () => (resolvedSchema?.choices ?? []).map((choice, idx) => ({
      id: choice.storyProgressDefinitionId ?? idx,
      progressKey: choice.progressKey,
      label: choice.label,
      displayOrder: choice.displayOrder,
      disabled: choice.isDisabled ? 'はい' : 'いいえ',
    })),
    [resolvedSchema],
  );

  // -----------------------------------------------------------------------
  // Definition CRUD handlers
  // -----------------------------------------------------------------------

  function openDefinitionDialog(def: StoryProgressDefinitionDto | null) {
    setEditingDefinition(def);
    if (def) {
      setDefinitionFormState({
        progressKey: def.progressKey,
        label: def.label,
        description: def.description ?? '',
        displayOrder: String(def.displayOrder),
      });
    } else {
      setDefinitionFormState(createEmptyDefinitionFormState());
    }
    setDefinitionDialogOpen(true);
  }

  async function handleSaveDefinition() {
    if (!selectedContentGroupId) return;
    setError(null);
    setSuccess(null);
    try {
      await startLoading(async () => {
        const request = createDefinitionRequest(definitionFormState);
        if (editingDefinition) {
          await updateStoryProgressDefinition(editingDefinition.id, request as UpdateStoryProgressDefinitionRequest);
          setSuccess('進行度定義を更新しました。');
        } else {
          await createStoryProgressDefinition(Number(selectedContentGroupId), request);
          setSuccess('進行度定義を作成しました。');
        }
        setDefinitionDialogOpen(false);
        await loadDefinitions();
      }, '保存中...');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '進行度定義の保存に失敗しました。');
    }
  }

  async function handleDeleteDefinition(id: number) {
    setError(null);
    setSuccess(null);
    try {
      await startLoading(async () => {
        await deleteStoryProgressDefinition(id);
        setSuccess('進行度定義を削除しました。');
        await loadDefinitions();
      }, '削除中...');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '進行度定義の削除に失敗しました。');
    }
  }

  // -----------------------------------------------------------------------
  // Override CRUD handlers
  // -----------------------------------------------------------------------

  function openOverrideDialog(def: StoryProgressDefinitionDto) {
    const existing = overrides.find((o) => o.storyProgressDefinitionId === def.id) ?? null;
    setOverrideTargetDefinition(def);
    setEditingOverride(existing);
    setOverrideFormState(createOverrideFormStateFromDto(existing));
    setOverrideDialogOpen(true);
  }

  async function handleSaveOverride() {
    if (!selectedGameSoftwareMasterId || !overrideTargetDefinition) return;
    setError(null);
    setSuccess(null);
    try {
      await startLoading(async () => {
        await upsertStoryProgressOverride(
          Number(selectedGameSoftwareMasterId),
          overrideTargetDefinition.id,
          createOverrideRequest(overrideFormState),
        );
        setSuccess('override を保存しました。');
        setOverrideDialogOpen(false);
        await loadOverrides();
      }, '保存中...');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'override の保存に失敗しました。');
    }
  }

  async function handleDeleteOverride(definitionId: number) {
    if (!selectedGameSoftwareMasterId) return;
    setError(null);
    setSuccess(null);
    try {
      await startLoading(async () => {
        await deleteStoryProgressOverride(Number(selectedGameSoftwareMasterId), definitionId);
        setSuccess('override を削除しました。');
        await loadOverrides();
      }, '削除中...');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'override の削除に失敗しました。');
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500">管理画面を読み込んでいます...</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(241,245,249,0.95))] p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.95),rgba(9,9,11,0.95))] dark:ring-zinc-800">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Story Progress Management</p>
            <CustomHeader level={1}>ストーリー進行度管理</CustomHeader>
            <p className="max-w-4xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              StoryProgressDefinitions、StoryProgressOverrides、公開 story-progress-schema の resolved 結果を 1 画面で管理します。
            </p>
          </div>
        </div>

        {error && <CustomMessageArea variant="error">{error}</CustomMessageArea>}
        {success && <CustomMessageArea variant="success">{success}</CustomMessageArea>}

        <SectionCard
          title="進行度定義"
          description="コンテンツグループごとのストーリー進行度定義を管理します。表示順と表示名を定義し、SaveData の候補元になります。"
          actions={
            <>
              <SelectField
                id="def-content-group"
                label="コンテンツグループ"
                value={selectedContentGroupId}
                options={contentGroupOptions}
                onChange={setSelectedContentGroupId}
              />
              <CustomButton variant="accent" disabled={!selectedContentGroupId} onClick={() => openDefinitionDialog(null)}>
                進行度定義を追加
              </CustomButton>
            </>
          }
        >
          <DataTable<DefinitionRow>
            columns={[
              ...definitionColumns,
              {
                key: 'actions',
                header: '操作',
                render: (_value, row) => (
                  <span className="flex flex-wrap gap-2">
                    <CustomButton variant="neutral" onClick={() => {
                      const def = definitions.find((item) => item.id === row.id);
                      if (def) openDefinitionDialog(def);
                    }}>
                      編集
                    </CustomButton>
                    <CustomButton variant="ghost" onClick={() => void handleDeleteDefinition(row.id)}>
                      削除
                    </CustomButton>
                  </span>
                ),
              },
            ]}
            data={definitionRows}
            rowKey="id"
            emptyMessage="進行度定義がありません。"
          />
        </SectionCard>

        <SectionCard
          title="作品別 override"
          description="ゲームソフトマスタ単位で、ラベルの上書きや無効化を設定します。"
          actions={
            <SelectField
              id="ovr-software-master"
              label="ゲームソフトマスタ"
              value={selectedGameSoftwareMasterId}
              options={softwareMasterOptions}
              onChange={setSelectedGameSoftwareMasterId}
            />
          }
        >
          <DataTable<OverrideRow>
            columns={[
              ...overrideColumns,
              {
                key: 'actions',
                header: '操作',
                render: (_value, row) => {
                  const def = overrideDefinitions.find((item) => item.id === row.id);
                  const hasOverride = overrides.some((o) => o.storyProgressDefinitionId === row.id);
                  return (
                    <span className="flex flex-wrap gap-2">
                      <CustomButton variant="neutral" onClick={() => { if (def) openOverrideDialog(def); }}>
                        {hasOverride ? '編集' : '設定'}
                      </CustomButton>
                      {hasOverride && (
                        <CustomButton variant="ghost" onClick={() => void handleDeleteOverride(row.id)}>
                          削除
                        </CustomButton>
                      )}
                    </span>
                  );
                },
              },
            ]}
            data={overrideRows}
            rowKey="id"
            emptyMessage="override 対象がありません。"
          />
        </SectionCard>

        <SectionCard
          title="resolved プレビュー"
          description="公開 story-progress-schema API から取得した、作品ごとの最終的な進行度候補を確認します。"
        >
          {resolvedSchema ? (
            <DataTable<PreviewRow> columns={previewColumns} data={previewRows} rowKey="id" emptyMessage="候補がありません。" />
          ) : (
            <p className="text-sm text-zinc-500">ゲームソフトマスタを選択するとプレビューが表示されます。</p>
          )}
        </SectionCard>

      {/* ================================================================
          Definition dialog
          ================================================================ */}
      <Dialog
        open={definitionDialogOpen}
        onClose={() => setDefinitionDialogOpen(false)}
        title={editingDefinition ? '進行度定義の編集' : '進行度定義の新規作成'}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <CustomLabel htmlFor="def-key">progressKey</CustomLabel>
            <CustomTextBox id="def-key" value={definitionFormState.progressKey} onChange={(event) => setDefinitionFormState((current) => ({ ...current, progressKey: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="def-label">表示名</CustomLabel>
            <CustomTextBox id="def-label" value={definitionFormState.label} onChange={(event) => setDefinitionFormState((current) => ({ ...current, label: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="def-description">説明</CustomLabel>
            <CustomTextArea id="def-description" value={definitionFormState.description} onChange={(event) => setDefinitionFormState((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="def-order">表示順</CustomLabel>
            <CustomTextBox id="def-order" type="number" step="1" value={definitionFormState.displayOrder} onChange={(event) => setDefinitionFormState((current) => ({ ...current, displayOrder: event.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <CustomButton variant="neutral" onClick={() => setDefinitionDialogOpen(false)}>キャンセル</CustomButton>
            <CustomButton variant="accent" onClick={() => void handleSaveDefinition()}>保存</CustomButton>
          </div>
        </div>
      </Dialog>

      {/* ================================================================
          Override dialog
          ================================================================ */}
      <Dialog
        open={overrideDialogOpen}
        onClose={() => setOverrideDialogOpen(false)}
        title={editingOverride ? 'override の編集' : 'override の新規設定'}
      >
        <div className="space-y-4">
          {overrideTargetDefinition ? (
            <div className="rounded bg-zinc-50 p-3 text-sm dark:bg-zinc-800">
              <p>progressKey: {overrideTargetDefinition.progressKey}</p>
              <p>基本ラベル: {overrideTargetDefinition.label}</p>
            </div>
          ) : null}
          <div className="space-y-2">
            <CustomLabel htmlFor="ovr-label">override ラベル</CustomLabel>
            <CustomTextBox id="ovr-label" value={overrideFormState.overrideLabel} onChange={(event) => setOverrideFormState((current) => ({ ...current, overrideLabel: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="ovr-description">override 説明</CustomLabel>
            <CustomTextArea id="ovr-description" value={overrideFormState.overrideDescription} onChange={(event) => setOverrideFormState((current) => ({ ...current, overrideDescription: event.target.value }))} />
          </div>
          <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-200">
            <CustomCheckBox checked={overrideFormState.isDisabled} onChange={(event) => setOverrideFormState((current) => ({ ...current, isDisabled: event.target.checked }))} />
            この作品では項目を無効化する
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <CustomButton variant="neutral" onClick={() => setOverrideDialogOpen(false)}>キャンセル</CustomButton>
            <CustomButton variant="accent" onClick={() => void handleSaveOverride()}>保存</CustomButton>
          </div>
        </div>
      </Dialog>
      </div>
    </main>
  );
}
