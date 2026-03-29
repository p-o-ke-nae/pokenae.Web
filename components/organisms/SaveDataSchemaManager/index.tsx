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
  createSaveDataFieldDefinition,
  createSaveDataFieldOption,
  deleteSaveDataFieldDefinition,
  deleteSaveDataFieldOption,
  deleteSaveDataFieldOverride,
  fetchMasterLookups,
  fetchPublicSaveDataSchema,
  fetchSaveDataFieldDefinitions,
  fetchSaveDataFieldOptions,
  fetchSaveDataFieldOverrides,
  updateSaveDataFieldDefinition,
  updateSaveDataFieldOption,
  upsertSaveDataFieldOverride,
} from '@/lib/game-management/api';
import {
  SAVE_DATA_FIELD_TYPE_LABELS,
  SAVE_DATA_FIELD_TYPE_NAMES,
} from '@/lib/game-management/save-data-fields';
import type {
  CreateSaveDataFieldDefinitionRequest,
  CreateSaveDataFieldOptionRequest,
  MasterLookups,
  SaveDataFieldDefinitionDto,
  SaveDataFieldOptionDto,
  SaveDataFieldOverrideDto,
  SaveDataFieldType,
  SaveDataSchemaDto,
  UpdateSaveDataFieldDefinitionRequest,
  UpdateSaveDataFieldOptionRequest,
  UpsertSaveDataFieldOverrideRequest,
} from '@/lib/game-management/types';

type DefinitionRow = {
  id: number;
  fieldKey: string;
  label: string;
  fieldType: string;
  displayOrder: number;
  required: string;
  status: string;
  actions: string;
};

type OptionRow = {
  id: number;
  optionKey: string;
  label: string;
  displayOrder: number;
  status: string;
  actions: string;
};

type OverrideRow = {
  id: number;
  fieldKey: string;
  baseLabel: string;
  fieldType: string;
  overrideLabel: string;
  required: string;
  disabled: string;
  status: string;
  actions: string;
};

type SchemaPreviewRow = {
  id: number;
  label: string;
  fieldKey: string;
  fieldType: string;
  required: string;
  disabled: string;
};

type DefinitionFormState = {
  fieldKey: string;
  label: string;
  description: string;
  fieldType: string;
  displayOrder: string;
  isRequired: boolean;
};

type OptionFormState = {
  optionKey: string;
  label: string;
  description: string;
  displayOrder: string;
};

type OverrideFormState = {
  overrideLabel: string;
  overrideDescription: string;
  overrideIsRequired: 'inherit' | 'true' | 'false';
  isDisabled: boolean;
};

const FIELD_TYPE_OPTIONS = (Object.entries(SAVE_DATA_FIELD_TYPE_LABELS) as Array<[string, string]>).map(([value, label]) => ({
  value,
  label,
}));

const definitionColumns: DataTableColumn<DefinitionRow>[] = [
  { key: 'id', header: 'ID', width: '5rem', sortable: true, sortValue: (value) => Number(value ?? 0) },
  { key: 'fieldKey', header: 'fieldKey', sortable: true, filterable: true },
  { key: 'label', header: '表示名', sortable: true, filterable: true },
  { key: 'fieldType', header: '型', sortable: true },
  { key: 'displayOrder', header: '順序', sortable: true, sortValue: (value) => Number(value ?? 0) },
  { key: 'required', header: '必須' },
  { key: 'status', header: '状態' },
];

const optionColumns: DataTableColumn<OptionRow>[] = [
  { key: 'id', header: 'ID', width: '5rem', sortable: true, sortValue: (value) => Number(value ?? 0) },
  { key: 'optionKey', header: 'optionKey', sortable: true, filterable: true },
  { key: 'label', header: '表示名', sortable: true, filterable: true },
  { key: 'displayOrder', header: '順序', sortable: true, sortValue: (value) => Number(value ?? 0) },
  { key: 'status', header: '状態' },
];

const overrideColumns: DataTableColumn<OverrideRow>[] = [
  { key: 'fieldKey', header: 'fieldKey', sortable: true, filterable: true },
  { key: 'baseLabel', header: '基本ラベル', sortable: true, filterable: true },
  { key: 'fieldType', header: '型', sortable: true },
  { key: 'overrideLabel', header: 'override ラベル', filterable: true },
  { key: 'required', header: '必須' },
  { key: 'disabled', header: '無効化' },
  { key: 'status', header: '状態' },
];

const schemaPreviewColumns: DataTableColumn<SchemaPreviewRow>[] = [
  { key: 'label', header: '表示名', sortable: true, filterable: true },
  { key: 'fieldKey', header: 'fieldKey', sortable: true, filterable: true },
  { key: 'fieldType', header: '型', sortable: true },
  { key: 'required', header: '必須' },
  { key: 'disabled', header: '無効化' },
];

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function createEmptyDefinitionFormState(): DefinitionFormState {
  return {
    fieldKey: '',
    label: '',
    description: '',
    fieldType: '0',
    displayOrder: '0',
    isRequired: false,
  };
}

function createEmptyOptionFormState(): OptionFormState {
  return {
    optionKey: '',
    label: '',
    description: '',
    displayOrder: '0',
  };
}

function createOverrideFormState(override: SaveDataFieldOverrideDto | null): OverrideFormState {
  return {
    overrideLabel: override?.overrideLabel ?? '',
    overrideDescription: override?.overrideDescription ?? '',
    overrideIsRequired: override?.overrideIsRequired == null ? 'inherit' : override.overrideIsRequired ? 'true' : 'false',
    isDisabled: override?.isDisabled ?? false,
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

function createDefinitionRequest(formState: DefinitionFormState): CreateSaveDataFieldDefinitionRequest {
  const fieldType = Number(formState.fieldType) as SaveDataFieldType;
  return {
    fieldKey: formState.fieldKey.trim(),
    label: formState.label.trim(),
    description: nullIfBlank(formState.description),
    fieldType: SAVE_DATA_FIELD_TYPE_NAMES[fieldType],
    displayOrder: Number(formState.displayOrder),
    isRequired: formState.isRequired,
  };
}

function createOptionRequest(formState: OptionFormState): CreateSaveDataFieldOptionRequest {
  return {
    optionKey: formState.optionKey.trim(),
    label: formState.label.trim(),
    description: nullIfBlank(formState.description),
    displayOrder: Number(formState.displayOrder),
  };
}

function createOverrideRequest(formState: OverrideFormState): UpsertSaveDataFieldOverrideRequest {
  return {
    overrideLabel: nullIfBlank(formState.overrideLabel),
    overrideDescription: nullIfBlank(formState.overrideDescription),
    overrideIsRequired: formState.overrideIsRequired === 'inherit'
      ? null
      : formState.overrideIsRequired === 'true',
    isDisabled: formState.isDisabled,
  };
}

export default function SaveDataSchemaManager() {
  const { startLoading } = useLoadingOverlay();
  const [lookups, setLookups] = useState<MasterLookups | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedContentGroupId, setSelectedContentGroupId] = useState('');
  const [selectedFieldDefinitionId, setSelectedFieldDefinitionId] = useState('');
  const [selectedGameSoftwareMasterId, setSelectedGameSoftwareMasterId] = useState('');

  const [definitions, setDefinitions] = useState<SaveDataFieldDefinitionDto[]>([]);
  const [options, setOptions] = useState<SaveDataFieldOptionDto[]>([]);
  const [overrideDefinitions, setOverrideDefinitions] = useState<SaveDataFieldDefinitionDto[]>([]);
  const [overrides, setOverrides] = useState<SaveDataFieldOverrideDto[]>([]);
  const [resolvedSchema, setResolvedSchema] = useState<SaveDataSchemaDto | null>(null);

  const [definitionDialogOpen, setDefinitionDialogOpen] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<SaveDataFieldDefinitionDto | null>(null);
  const [definitionFormState, setDefinitionFormState] = useState<DefinitionFormState>(createEmptyDefinitionFormState());

  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<SaveDataFieldOptionDto | null>(null);
  const [optionFormState, setOptionFormState] = useState<OptionFormState>(createEmptyOptionFormState());

  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<SaveDataFieldOverrideDto | null>(null);
  const [overrideTargetField, setOverrideTargetField] = useState<SaveDataFieldDefinitionDto | null>(null);
  const [overrideFormState, setOverrideFormState] = useState<OverrideFormState>(createOverrideFormState(null));

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
        ? '管理者権限が必要です。バックエンドの AdminOnly ポリシーを確認してください。'
        : loadError instanceof Error
          ? loadError.message
          : 'schema 管理画面の初期化に失敗しました。';
      setError(message);
    } finally {
      setPageLoading(false);
    }
  }, [selectedContentGroupId, selectedGameSoftwareMasterId]);

  useEffect(() => {
    void loadMasters();
  }, [loadMasters]);

  const loadDefinitions = useCallback(async () => {
    if (!selectedContentGroupId) {
      setDefinitions([]);
      return;
    }
    const nextDefinitions = await fetchSaveDataFieldDefinitions(Number(selectedContentGroupId));
    setDefinitions(nextDefinitions);
    if (!selectedFieldDefinitionId || !nextDefinitions.some((item) => item.id === Number(selectedFieldDefinitionId))) {
      const firstSelectable = nextDefinitions.find((item) => item.fieldType === 6);
      setSelectedFieldDefinitionId(firstSelectable ? String(firstSelectable.id) : '');
    }
  }, [selectedContentGroupId, selectedFieldDefinitionId]);

  useEffect(() => {
    void loadDefinitions().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : '項目定義の取得に失敗しました。');
    });
  }, [loadDefinitions]);

  const selectedDefinition = useMemo(
    () => definitions.find((item) => item.id === Number(selectedFieldDefinitionId)) ?? null,
    [definitions, selectedFieldDefinitionId],
  );

  const loadOptions = useCallback(async () => {
    if (!selectedDefinition || selectedDefinition.fieldType !== 6) {
      setOptions([]);
      return;
    }
    const nextOptions = await fetchSaveDataFieldOptions(selectedDefinition.id);
    setOptions(nextOptions);
  }, [selectedDefinition]);

  useEffect(() => {
    void loadOptions().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : '候補値の取得に失敗しました。');
    });
  }, [loadOptions]);

  const loadOverrides = useCallback(async () => {
    if (!lookups || !selectedGameSoftwareMasterId) {
      setOverrideDefinitions([]);
      setOverrides([]);
      setResolvedSchema(null);
      return;
    }

    const gameSoftwareMaster = lookups.gameSoftwareMasters.find((item) => item.id === Number(selectedGameSoftwareMasterId));
    if (!gameSoftwareMaster?.contentGroupId) {
      setOverrideDefinitions([]);
      setOverrides([]);
      setResolvedSchema({ gameSoftwareMasterId: Number(selectedGameSoftwareMasterId), contentGroupId: null, fields: [] });
      return;
    }

    const [nextDefinitions, nextOverrides, nextSchema] = await Promise.all([
      fetchSaveDataFieldDefinitions(gameSoftwareMaster.contentGroupId),
      fetchSaveDataFieldOverrides(gameSoftwareMaster.id),
      fetchPublicSaveDataSchema(gameSoftwareMaster.id),
    ]);

    setOverrideDefinitions(nextDefinitions);
    setOverrides(nextOverrides);
    setResolvedSchema(nextSchema);
  }, [lookups, selectedGameSoftwareMasterId]);

  useEffect(() => {
    void loadOverrides().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'override の取得に失敗しました。');
    });
  }, [loadOverrides]);

  const definitionRows = useMemo<DefinitionRow[]>(() => definitions.map((item) => ({
    id: item.id,
    fieldKey: item.fieldKey,
    label: item.label,
    fieldType: SAVE_DATA_FIELD_TYPE_LABELS[item.fieldType],
    displayOrder: item.displayOrder,
    required: item.isRequired ? '必須' : '任意',
    status: item.isDeleted ? '削除済み' : '有効',
    actions: '',
  })), [definitions]);

  const optionRows = useMemo<OptionRow[]>(() => options.map((item) => ({
    id: item.id,
    optionKey: item.optionKey,
    label: item.label,
    displayOrder: item.displayOrder,
    status: item.isDeleted ? '削除済み' : '有効',
    actions: '',
  })), [options]);

  const overrideRows = useMemo<OverrideRow[]>(() => overrideDefinitions.map((field) => {
    const override = overrides.find((candidate) => candidate.fieldDefinitionId === field.id) ?? null;
    return {
      id: field.id,
      fieldKey: field.fieldKey,
      baseLabel: field.label,
      fieldType: SAVE_DATA_FIELD_TYPE_LABELS[field.fieldType],
      overrideLabel: override?.overrideLabel ?? '継承',
      required: override?.overrideIsRequired == null ? (field.isRequired ? '継承: 必須' : '継承: 任意') : override.overrideIsRequired ? 'override: 必須' : 'override: 任意',
      disabled: override?.isDisabled ? '無効' : '有効',
      status: override ? 'override あり' : '基本定義のみ',
      actions: '',
    };
  }), [overrideDefinitions, overrides]);

  const schemaPreviewRows = useMemo<SchemaPreviewRow[]>(() => (resolvedSchema?.fields ?? []).map((field, index) => ({
    id: index,
    label: field.label,
    fieldKey: field.fieldKey,
    fieldType: SAVE_DATA_FIELD_TYPE_LABELS[field.fieldType],
    required: field.isRequired ? '必須' : '任意',
    disabled: field.isDisabled ? '無効' : '有効',
  })), [resolvedSchema]);

  const openCreateDefinitionDialog = useCallback(() => {
    setEditingDefinition(null);
    setDefinitionFormState(createEmptyDefinitionFormState());
    setDefinitionDialogOpen(true);
  }, []);

  const openEditDefinitionDialog = useCallback((definition: SaveDataFieldDefinitionDto) => {
    setEditingDefinition(definition);
    setDefinitionFormState({
      fieldKey: definition.fieldKey,
      label: definition.label,
      description: definition.description ?? '',
      fieldType: String(definition.fieldType),
      displayOrder: String(definition.displayOrder),
      isRequired: definition.isRequired,
    });
    setDefinitionDialogOpen(true);
  }, []);

  const openCreateOptionDialog = useCallback(() => {
    setEditingOption(null);
    setOptionFormState(createEmptyOptionFormState());
    setOptionDialogOpen(true);
  }, []);

  const openEditOptionDialog = useCallback((option: SaveDataFieldOptionDto) => {
    setEditingOption(option);
    setOptionFormState({
      optionKey: option.optionKey,
      label: option.label,
      description: option.description ?? '',
      displayOrder: String(option.displayOrder),
    });
    setOptionDialogOpen(true);
  }, []);

  const openOverrideDialog = useCallback((field: SaveDataFieldDefinitionDto) => {
    const override = overrides.find((candidate) => candidate.fieldDefinitionId === field.id) ?? null;
    setOverrideTargetField(field);
    setEditingOverride(override);
    setOverrideFormState(createOverrideFormState(override));
    setOverrideDialogOpen(true);
  }, [overrides]);

  const handleSaveDefinition = useCallback(async () => {
    if (!selectedContentGroupId) {
      setError('内容分類を選択してください。');
      return;
    }

    if (!definitionFormState.fieldKey.trim() || !definitionFormState.label.trim()) {
      setError('fieldKey と表示名は必須です。');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await startLoading(async () => {
        const payload = createDefinitionRequest(definitionFormState);
        if (editingDefinition) {
          await updateSaveDataFieldDefinition(editingDefinition.id, payload as UpdateSaveDataFieldDefinitionRequest);
        } else {
          await createSaveDataFieldDefinition(Number(selectedContentGroupId), payload);
        }
      }, '項目定義を保存中...');

      setDefinitionDialogOpen(false);
      setSuccess(editingDefinition ? '項目定義を更新しました。' : '項目定義を作成しました。');
      await loadDefinitions();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '項目定義の保存に失敗しました。');
    }
  }, [definitionFormState, editingDefinition, loadDefinitions, selectedContentGroupId, startLoading]);

  const handleDeleteDefinition = useCallback(async (definition: SaveDataFieldDefinitionDto) => {
    if (!window.confirm(`項目定義 ${definition.label} を削除しますか。`)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await startLoading(async () => {
        await deleteSaveDataFieldDefinition(definition.id);
      }, '項目定義を削除中...');
      setSuccess('項目定義を削除しました。');
      await loadDefinitions();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '項目定義の削除に失敗しました。');
    }
  }, [loadDefinitions, startLoading]);

  const handleSaveOption = useCallback(async () => {
    if (!selectedDefinition) {
      setError('候補値を紐付ける項目定義を選択してください。');
      return;
    }

    if (!optionFormState.optionKey.trim() || !optionFormState.label.trim()) {
      setError('optionKey と表示名は必須です。');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await startLoading(async () => {
        const payload = createOptionRequest(optionFormState);
        if (editingOption) {
          await updateSaveDataFieldOption(editingOption.id, payload as UpdateSaveDataFieldOptionRequest);
        } else {
          await createSaveDataFieldOption(selectedDefinition.id, payload);
        }
      }, '候補値を保存中...');

      setOptionDialogOpen(false);
      setSuccess(editingOption ? '候補値を更新しました。' : '候補値を作成しました。');
      await loadOptions();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '候補値の保存に失敗しました。');
    }
  }, [editingOption, loadOptions, optionFormState, selectedDefinition, startLoading]);

  const handleDeleteOption = useCallback(async (option: SaveDataFieldOptionDto) => {
    if (!window.confirm(`候補値 ${option.label} を削除しますか。`)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await startLoading(async () => {
        await deleteSaveDataFieldOption(option.id);
      }, '候補値を削除中...');
      setSuccess('候補値を削除しました。');
      await loadOptions();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '候補値の削除に失敗しました。');
    }
  }, [loadOptions, startLoading]);

  const handleSaveOverride = useCallback(async () => {
    if (!overrideTargetField || !selectedGameSoftwareMasterId) {
      setError('override 対象を選択してください。');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await startLoading(async () => {
        await upsertSaveDataFieldOverride(
          Number(selectedGameSoftwareMasterId),
          overrideTargetField.id,
          createOverrideRequest(overrideFormState),
        );
      }, 'override を保存中...');
      setOverrideDialogOpen(false);
      setSuccess(editingOverride ? 'override を更新しました。' : 'override を作成しました。');
      await loadOverrides();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'override の保存に失敗しました。');
    }
  }, [editingOverride, loadOverrides, overrideFormState, overrideTargetField, selectedGameSoftwareMasterId, startLoading]);

  const handleDeleteOverride = useCallback(async (field: SaveDataFieldDefinitionDto) => {
    if (!selectedGameSoftwareMasterId) {
      return;
    }

    const override = overrides.find((candidate) => candidate.fieldDefinitionId === field.id);
    if (!override) {
      return;
    }

    if (!window.confirm(`override ${field.label} を削除しますか。`)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await startLoading(async () => {
        await deleteSaveDataFieldOverride(Number(selectedGameSoftwareMasterId), field.id);
      }, 'override を削除中...');
      setSuccess('override を削除しました。');
      await loadOverrides();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'override の削除に失敗しました。');
    }
  }, [loadOverrides, overrides, selectedGameSoftwareMasterId, startLoading]);

  const definitionRowsWithActions = useMemo(() => definitionRows.map((row) => {
    const definition = definitions.find((item) => item.id === row.id)!;
    return {
      ...row,
      actions: '',
      actionContent: definition,
    };
  }), [definitionRows, definitions]);

  const optionRowsWithActions = useMemo(() => optionRows.map((row) => {
    const option = options.find((item) => item.id === row.id)!;
    return {
      ...row,
      actions: '',
      actionContent: option,
    };
  }), [optionRows, options]);

  const overrideRowsWithActions = useMemo(() => overrideRows.map((row) => {
    const field = overrideDefinitions.find((item) => item.id === row.id)!;
    const override = overrides.find((item) => item.fieldDefinitionId === row.id) ?? null;
    return {
      ...row,
      actions: '',
      actionContent: { field, override },
    };
  }), [overrideDefinitions, overrideRows, overrides]);

  const selectedGameSoftwareMaster = useMemo(
    () => lookups?.gameSoftwareMasters.find((item) => item.id === Number(selectedGameSoftwareMasterId)) ?? null,
    [lookups, selectedGameSoftwareMasterId],
  );

  const canManageOptions = selectedDefinition?.fieldType === 6;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(241,245,249,0.95))] p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.95),rgba(9,9,11,0.95))] dark:ring-zinc-800">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Schema Management</p>
            <CustomHeader level={1}>SaveData スキーマ管理</CustomHeader>
            <p className="max-w-4xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              SaveDataFieldDefinitions、SaveDataFieldOptions、SaveDataFieldOverrides を管理し、公開 schema API で解決される最終形も同画面で確認できます。
            </p>
          </div>
        </div>

        {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
        {success ? <CustomMessageArea variant="success">{success}</CustomMessageArea> : null}

        {pageLoading || !lookups ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500">管理画面を読み込んでいます...</p>
          </section>
        ) : (
          <>
            <SectionCard
              title="項目定義"
              description="内容分類ごとの SaveDataFieldDefinitions を管理します。SingleSelect の項目を選ぶと候補値管理も有効になります。"
              actions={
                <>
                  <SelectField
                    id="content-group"
                    label="内容分類"
                    value={selectedContentGroupId}
                    options={lookups.gameSoftwareContentGroups.map((item) => ({ value: String(item.id), label: item.name }))}
                    onChange={setSelectedContentGroupId}
                  />
                  <CustomButton variant="accent" onClick={openCreateDefinitionDialog}>項目定義を追加</CustomButton>
                </>
              }
            >
              <div className="space-y-4">
                <DataTable
                  columns={[
                    ...definitionColumns,
                    {
                      key: 'actions',
                      header: '操作',
                      render: (_, row) => {
                        const definition = definitions.find((item) => item.id === row.id)!;
                        return (
                          <div className="flex flex-wrap gap-2">
                            <CustomButton onClick={() => openEditDefinitionDialog(definition)}>編集</CustomButton>
                            {definition.fieldType === 6 ? (
                              <CustomButton onClick={() => setSelectedFieldDefinitionId(String(definition.id))}>候補値</CustomButton>
                            ) : null}
                            <CustomButton variant="ghost" onClick={() => void handleDeleteDefinition(definition)}>削除</CustomButton>
                          </div>
                        );
                      },
                    },
                  ]}
                  data={definitionRowsWithActions}
                  rowKey="id"
                  emptyMessage="項目定義がありません。"
                />
                {definitions.length > 0 ? (
                  <SelectField
                    id="field-definition"
                    label="候補値を管理する項目"
                    value={selectedFieldDefinitionId}
                    options={definitions
                      .filter((item) => item.fieldType === 6)
                      .map((item) => ({ value: String(item.id), label: `${item.label} (${item.fieldKey})` }))}
                    onChange={setSelectedFieldDefinitionId}
                  />
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="候補値"
              description="SingleSelect の項目定義を選んだときだけ候補値管理 UI を表示します。"
              actions={canManageOptions ? <CustomButton variant="accent" onClick={openCreateOptionDialog}>候補値を追加</CustomButton> : null}
            >
              {canManageOptions ? (
                <DataTable
                  columns={[
                    ...optionColumns,
                    {
                      key: 'actions',
                      header: '操作',
                      render: (_, row) => {
                        const option = options.find((item) => item.id === row.id)!;
                        return (
                          <div className="flex flex-wrap gap-2">
                            <CustomButton onClick={() => openEditOptionDialog(option)}>編集</CustomButton>
                            <CustomButton variant="ghost" onClick={() => void handleDeleteOption(option)}>削除</CustomButton>
                          </div>
                        );
                      },
                    },
                  ]}
                  data={optionRowsWithActions}
                  rowKey="id"
                  emptyMessage="候補値がありません。"
                />
              ) : (
                <p className="text-sm text-zinc-500">SingleSelect の項目定義を選択すると候補値管理を表示します。</p>
              )}
            </SectionCard>

            <SectionCard
              title="作品別 override"
              description="ゲームソフトマスタ単位でラベル、説明、表示順、必須、無効化を override できます。"
              actions={
                <SelectField
                  id="game-software-master"
                  label="ゲームソフトマスタ"
                  value={selectedGameSoftwareMasterId}
                  options={lookups.gameSoftwareMasters.map((item) => ({ value: String(item.id), label: item.name }))}
                  onChange={setSelectedGameSoftwareMasterId}
                />
              }
            >
              {selectedGameSoftwareMaster && !selectedGameSoftwareMaster.contentGroupId ? (
                <p className="text-sm text-zinc-500">このゲームソフトマスタには内容分類が未設定のため、override 対象項目がありません。</p>
              ) : (
                <DataTable
                  columns={[
                    ...overrideColumns,
                    {
                      key: 'actions',
                      header: '操作',
                      render: (_, row) => {
                        const field = overrideDefinitions.find((item) => item.id === row.id)!;
                        const hasOverride = overrides.some((item) => item.fieldDefinitionId === row.id);
                        return (
                          <div className="flex flex-wrap gap-2">
                            <CustomButton onClick={() => openOverrideDialog(field)}>{hasOverride ? '編集' : 'override 作成'}</CustomButton>
                            {hasOverride ? (
                              <CustomButton variant="ghost" onClick={() => void handleDeleteOverride(field)}>削除</CustomButton>
                            ) : null}
                          </div>
                        );
                      },
                    },
                  ]}
                  data={overrideRowsWithActions}
                  rowKey="id"
                  emptyMessage="override 対象項目がありません。"
                />
              )}
            </SectionCard>

            <SectionCard
              title="resolved schema 確認"
              description="公開 schema API の解決結果をそのまま表示します。override 適用結果の確認に使えます。"
            >
              <DataTable
                columns={schemaPreviewColumns}
                data={schemaPreviewRows}
                rowKey="id"
                emptyMessage="resolved schema がありません。"
              />
            </SectionCard>
          </>
        )}

        <Dialog
          open={definitionDialogOpen}
          onClose={() => setDefinitionDialogOpen(false)}
          title={editingDefinition ? '項目定義を編集' : '項目定義を追加'}
          footer={
            <>
              <CustomButton onClick={() => setDefinitionDialogOpen(false)}>キャンセル</CustomButton>
              <CustomButton variant="accent" onClick={() => void handleSaveDefinition()}>保存</CustomButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <CustomLabel htmlFor="definition-field-key">fieldKey</CustomLabel>
              <CustomTextBox id="definition-field-key" value={definitionFormState.fieldKey} onChange={(event) => setDefinitionFormState((current) => ({ ...current, fieldKey: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="definition-label">表示名</CustomLabel>
              <CustomTextBox id="definition-label" value={definitionFormState.label} onChange={(event) => setDefinitionFormState((current) => ({ ...current, label: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="definition-description">説明</CustomLabel>
              <CustomTextArea id="definition-description" value={definitionFormState.description} onChange={(event) => setDefinitionFormState((current) => ({ ...current, description: event.target.value }))} />
            </div>
            <SelectField id="definition-type" label="型" value={definitionFormState.fieldType} options={FIELD_TYPE_OPTIONS} onChange={(value) => setDefinitionFormState((current) => ({ ...current, fieldType: value }))} />
            <div className="space-y-2">
              <CustomLabel htmlFor="definition-order">表示順</CustomLabel>
              <CustomTextBox id="definition-order" type="number" step="1" value={definitionFormState.displayOrder} onChange={(event) => setDefinitionFormState((current) => ({ ...current, displayOrder: event.target.value }))} />
            </div>
            <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-200">
              <CustomCheckBox checked={definitionFormState.isRequired} onChange={(event) => setDefinitionFormState((current) => ({ ...current, isRequired: event.target.checked }))} />
              必須項目にする
            </label>
          </div>
        </Dialog>

        <Dialog
          open={optionDialogOpen}
          onClose={() => setOptionDialogOpen(false)}
          title={editingOption ? '候補値を編集' : '候補値を追加'}
          footer={
            <>
              <CustomButton onClick={() => setOptionDialogOpen(false)}>キャンセル</CustomButton>
              <CustomButton variant="accent" onClick={() => void handleSaveOption()}>保存</CustomButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <CustomLabel htmlFor="option-key">optionKey</CustomLabel>
              <CustomTextBox id="option-key" value={optionFormState.optionKey} onChange={(event) => setOptionFormState((current) => ({ ...current, optionKey: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="option-label">表示名</CustomLabel>
              <CustomTextBox id="option-label" value={optionFormState.label} onChange={(event) => setOptionFormState((current) => ({ ...current, label: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="option-description">説明</CustomLabel>
              <CustomTextArea id="option-description" value={optionFormState.description} onChange={(event) => setOptionFormState((current) => ({ ...current, description: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="option-order">表示順</CustomLabel>
              <CustomTextBox id="option-order" type="number" step="1" value={optionFormState.displayOrder} onChange={(event) => setOptionFormState((current) => ({ ...current, displayOrder: event.target.value }))} />
            </div>
          </div>
        </Dialog>

        <Dialog
          open={overrideDialogOpen}
          onClose={() => setOverrideDialogOpen(false)}
          title={overrideTargetField ? `${overrideTargetField.label} の override` : 'override を編集'}
          footer={
            <>
              <CustomButton onClick={() => setOverrideDialogOpen(false)}>キャンセル</CustomButton>
              <CustomButton variant="accent" onClick={() => void handleSaveOverride()}>保存</CustomButton>
            </>
          }
        >
          <div className="space-y-4">
            {overrideTargetField ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                <p>基本ラベル: {overrideTargetField.label}</p>
                <p>fieldKey: {overrideTargetField.fieldKey}</p>
                <p>型: {SAVE_DATA_FIELD_TYPE_LABELS[overrideTargetField.fieldType]}</p>
              </div>
            ) : null}
            <div className="space-y-2">
              <CustomLabel htmlFor="override-label">override ラベル</CustomLabel>
              <CustomTextBox id="override-label" value={overrideFormState.overrideLabel} onChange={(event) => setOverrideFormState((current) => ({ ...current, overrideLabel: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="override-description">override 説明</CustomLabel>
              <CustomTextArea id="override-description" value={overrideFormState.overrideDescription} onChange={(event) => setOverrideFormState((current) => ({ ...current, overrideDescription: event.target.value }))} />
            </div>
            <SelectField
              id="override-required"
              label="必須指定"
              value={overrideFormState.overrideIsRequired}
              options={[
                { value: 'inherit', label: '継承' },
                { value: 'true', label: '必須にする' },
                { value: 'false', label: '任意にする' },
              ]}
              onChange={(value) => setOverrideFormState((current) => ({ ...current, overrideIsRequired: value as OverrideFormState['overrideIsRequired'] }))}
            />
            <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-200">
              <CustomCheckBox checked={overrideFormState.isDisabled} onChange={(event) => setOverrideFormState((current) => ({ ...current, isDisabled: event.target.checked }))} />
              この作品では項目を無効化する
            </label>
          </div>
        </Dialog>
      </div>
    </main>
  );
}