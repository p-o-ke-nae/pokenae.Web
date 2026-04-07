'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import PageModeToggle from '@/components/atoms/PageModeToggle';
import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import CustomComboBox from '@/components/atoms/CustomComboBox';
import CustomHeader from '@/components/atoms/CustomHeader';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import CustomTextArea from '@/components/atoms/CustomTextArea';
import CustomTextBox from '@/components/atoms/CustomTextBox';
import DataTable, { DATA_TABLE_DEFAULT_PAGE_HEIGHT, type DataTableColumn } from '@/components/molecules/DataTable';
import { moveSelectedItemsByOne, moveSelectedItemsToTarget } from '@/components/molecules/DataTable/selection-utils';
import Dialog from '@/components/molecules/Dialog';
import RowMoveButtons from '@/components/organisms/GameManagement/RowMoveButtons';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import { buildBulkDefinitionTypeUpdateItems } from './bulk-definition-type';
import {
  buildCopyPlan,
  buildCopySummaryMessage,
  buildCreateRequestFromSource,
  buildOptionCreatePayloads,
  computeNextDisplayOrder,
  normalizeFieldKeyForComparison,
  shouldCopyOptions,
  summarizeCopyResults,
  type CopyPlanItem,
  type CopyResultItem,
} from './copy-definitions';
import { createDefinitionCreateRequest, createDefinitionUpdateRequestFromForm, parseDefinitionFieldType, parseDefinitionSharedChoiceSetId } from './definition-payloads';
import {
  ApiError,
  fetchMasterLookups,
} from '@/lib/game-management/api';
import {
  fetchPublicSaveDataSchema,
} from '@/lib/game-management/api/public';
import {
  createSaveDataFieldDefinition,
  createSaveDataFieldOption,
  batchUpdateSaveDataFieldDefinitionTypes,
  deleteSaveDataFieldDefinition,
  deleteSaveDataFieldOption,
  deleteSaveDataFieldOverride,
  fetchSaveDataFieldChoiceSets,
  fetchSaveDataFieldDefinitions,
  fetchSaveDataFieldOptions,
  fetchSaveDataFieldOverrides,
  reorderSaveDataFieldDefinitions,
  reorderSaveDataFieldOptions,
  updateSaveDataFieldDefinition,
  updateSaveDataFieldOption,
  upsertSaveDataFieldOverride,
} from '@/lib/game-management/api/schema';
import {
  SAVE_DATA_FIELD_TYPE_LABELS,
} from '@/lib/game-management/save-data-fields';
import type { PageMode } from '@/lib/game-management/resources';
import type {
  CreateSaveDataFieldOptionRequest,
  MasterLookups,
  ReorderItemRequest,
  SaveDataFieldChoiceSetDto,
  SaveDataFieldDefinitionDto,
  SaveDataFieldOptionDto,
  SaveDataFieldOverrideDto,
  SaveDataSchemaDto,
  UpdateSaveDataFieldOptionRequest,
  UpsertSaveDataFieldOverrideRequest,
} from '@/lib/game-management/types';

function parsePositiveDisplayOrder(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

function validateDisplayOrderInput(value: string, required: boolean): string {
  if (!value.trim()) {
    return required ? '表示順を入力してください。' : '';
  }

  return parsePositiveDisplayOrder(value) == null ? '表示順は1以上の整数で入力してください。' : '';
}

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
  sharedChoiceSetId: string;
};

type BulkDefinitionTypeFormState = {
  fieldType: string;
  sharedChoiceSetId: string;
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
    displayOrder: '',
    isRequired: false,
    sharedChoiceSetId: '',
  };
}

function createDefinitionFormState(
  definition: SaveDataFieldDefinitionDto,
  options?: { resetDisplayOrder?: boolean },
): DefinitionFormState {
  return {
    fieldKey: definition.fieldKey,
    label: definition.label,
    description: definition.description ?? '',
    fieldType: String(definition.fieldType),
    displayOrder: options?.resetDisplayOrder ? '' : String(definition.displayOrder),
    isRequired: definition.isRequired,
    sharedChoiceSetId: definition.sharedChoiceSetId != null ? String(definition.sharedChoiceSetId) : '',
  };
}

function createEmptyOptionFormState(): OptionFormState {
  return {
    optionKey: '',
    label: '',
    description: '',
    displayOrder: '',
  };
}

function createEmptyBulkDefinitionTypeFormState(): BulkDefinitionTypeFormState {
  return {
    fieldType: '0',
    sharedChoiceSetId: '',
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
  displayOnly = false,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  displayOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <CustomLabel htmlFor={id}>{label}</CustomLabel>
      <CustomComboBox id={id} value={value} onChange={(event) => onChange(event.target.value)} displayOnly={displayOnly}>
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
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function createOptionRequest(formState: OptionFormState): CreateSaveDataFieldOptionRequest {
  const displayOrder = parsePositiveDisplayOrder(formState.displayOrder);
  return {
    optionKey: formState.optionKey.trim(),
    label: formState.label.trim(),
    description: nullIfBlank(formState.description),
    ...(displayOrder != null ? { displayOrder } : {}),
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
  const { isPending, startLoading } = useLoadingOverlay();
  const definitionDialogBodyRef = useRef<HTMLDivElement | null>(null);
  const optionDialogBodyRef = useRef<HTMLDivElement | null>(null);
  const [lookups, setLookups] = useState<MasterLookups | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pageMode, setPageMode] = useState<PageMode>('view');

  const [selectedContentGroupId, setSelectedContentGroupId] = useState('');
  const [selectedFieldDefinitionId, setSelectedFieldDefinitionId] = useState('');
  const [selectedGameSoftwareMasterId, setSelectedGameSoftwareMasterId] = useState('');
  const [selectedDefinitionKeys, setSelectedDefinitionKeys] = useState<string[]>([]);
  const [selectedOptionKeys, setSelectedOptionKeys] = useState<string[]>([]);

  const [definitions, setDefinitions] = useState<SaveDataFieldDefinitionDto[]>([]);
  const [options, setOptions] = useState<SaveDataFieldOptionDto[]>([]);
  const [choiceSets, setChoiceSets] = useState<SaveDataFieldChoiceSetDto[]>([]);
  const [overrideDefinitions, setOverrideDefinitions] = useState<SaveDataFieldDefinitionDto[]>([]);
  const [overrides, setOverrides] = useState<SaveDataFieldOverrideDto[]>([]);
  const [resolvedSchema, setResolvedSchema] = useState<SaveDataSchemaDto | null>(null);

  const [definitionDialogOpen, setDefinitionDialogOpen] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<SaveDataFieldDefinitionDto | null>(null);
  const [cloneSourceDefinition, setCloneSourceDefinition] = useState<SaveDataFieldDefinitionDto | null>(null);
  const [definitionFormState, setDefinitionFormState] = useState<DefinitionFormState>(createEmptyDefinitionFormState());
  const [bulkDefinitionTypeDialogOpen, setBulkDefinitionTypeDialogOpen] = useState(false);
  const [bulkDefinitionTypeFormState, setBulkDefinitionTypeFormState] = useState<BulkDefinitionTypeFormState>(createEmptyBulkDefinitionTypeFormState());
  const [bulkDefinitionTargetIds, setBulkDefinitionTargetIds] = useState<number[]>([]);

  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<SaveDataFieldOptionDto | null>(null);
  const [optionFormState, setOptionFormState] = useState<OptionFormState>(createEmptyOptionFormState());

  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<SaveDataFieldOverrideDto | null>(null);
  const [overrideTargetField, setOverrideTargetField] = useState<SaveDataFieldDefinitionDto | null>(null);
  const [overrideFormState, setOverrideFormState] = useState<OverrideFormState>(createOverrideFormState(null));

  // Reorder state for definitions
  const [defRowOrder, setDefRowOrder] = useState<number[] | null>(null);
  const [defReorderDirty, setDefReorderDirty] = useState(false);
  const [defReorderSaving, setDefReorderSaving] = useState(false);

  // Reorder state for options
  const [optRowOrder, setOptRowOrder] = useState<number[] | null>(null);
  const [optReorderDirty, setOptReorderDirty] = useState(false);
  const [optReorderSaving, setOptReorderSaving] = useState(false);

  const isCloningDefinition = cloneSourceDefinition != null;

  // Copy-to-another-content-group state
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyTargetContentGroupId, setCopyTargetContentGroupId] = useState('');
  const [copyPlan, setCopyPlan] = useState<CopyPlanItem[] | null>(null);
  const [copyPlanLoading, setCopyPlanLoading] = useState(false);

  const inlineDialogMessageVisible = definitionDialogOpen || optionDialogOpen;

  const loadMasters = useCallback(async () => {
    setPageLoading(true);
    setError(null);
    try {
      const [nextLookups, nextChoiceSets] = await Promise.all([
        fetchMasterLookups(),
        fetchSaveDataFieldChoiceSets(),
      ]);
      setLookups(nextLookups);
      setChoiceSets(nextChoiceSets);
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
      setSelectedDefinitionKeys([]);
      return;
    }
    const nextDefinitions = await fetchSaveDataFieldDefinitions(Number(selectedContentGroupId));
    setDefinitions(nextDefinitions);
    setSelectedDefinitionKeys([]);
    setDefRowOrder(null);
    setDefReorderDirty(false);
    const currentSelectedDefinition = nextDefinitions.find((item) => item.id === Number(selectedFieldDefinitionId));
    const isCurrentOptionTarget = currentSelectedDefinition?.fieldType === 6 && currentSelectedDefinition.sharedChoiceSetId == null;
    if (!selectedFieldDefinitionId || !isCurrentOptionTarget) {
      const firstSelectable = nextDefinitions.find((item) => item.fieldType === 6 && item.sharedChoiceSetId == null);
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

  const selectedDefinitions = useMemo(() => (
    definitions.filter((item) => selectedDefinitionKeys.includes(String(item.id)))
  ), [definitions, selectedDefinitionKeys]);

  const bulkDefinitionTargets = useMemo(() => (
    definitions.filter((item) => bulkDefinitionTargetIds.includes(item.id) && !item.isDeleted)
  ), [bulkDefinitionTargetIds, definitions]);

  const loadOptions = useCallback(async () => {
    if (!selectedDefinition || selectedDefinition.fieldType !== 6 || selectedDefinition.sharedChoiceSetId != null) {
      setOptions([]);
      setSelectedOptionKeys([]);
      return;
    }
    const nextOptions = await fetchSaveDataFieldOptions(selectedDefinition.id);
    setOptions(nextOptions);
    setSelectedOptionKeys([]);
    setOptRowOrder(null);
    setOptReorderDirty(false);
  }, [selectedDefinition]);

  const selectedOptions = useMemo(() => (
    options.filter((item) => selectedOptionKeys.includes(String(item.id)))
  ), [options, selectedOptionKeys]);

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

  const definitionRows = useMemo<DefinitionRow[]>(() => definitions.map((item) => {
    const choiceSetLabel = item.sharedChoiceSetId != null
      ? choiceSets.find((cs) => cs.id === item.sharedChoiceSetId)?.label ?? `ID:${item.sharedChoiceSetId}`
      : null;
    return {
      id: item.id,
      fieldKey: item.fieldKey,
      label: item.label,
      fieldType: SAVE_DATA_FIELD_TYPE_LABELS[item.fieldType] + (choiceSetLabel ? ` [共有: ${choiceSetLabel}]` : ''),
      displayOrder: item.displayOrder,
      required: item.isRequired ? '必須' : '任意',
      status: item.isDeleted ? '削除済み' : '有効',
      actions: '',
    };
  }), [definitions, choiceSets]);

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

  const focusFirstField = useCallback((container: HTMLDivElement | null) => {
    requestAnimationFrame(() => {
      const firstField = container?.querySelector<HTMLElement>(
        'input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([readonly]):not([disabled])',
      );
      firstField?.focus();
    });
  }, []);

  const closeDefinitionDialog = useCallback(() => {
    setDefinitionDialogOpen(false);
    setEditingDefinition(null);
    setCloneSourceDefinition(null);
    setDefinitionFormState(createEmptyDefinitionFormState());
  }, []);

  const openCreateDefinitionDialog = useCallback(() => {
    setEditingDefinition(null);
    setCloneSourceDefinition(null);
    setDefinitionFormState(createEmptyDefinitionFormState());
    setDefinitionDialogOpen(true);
  }, []);

  const openEditDefinitionDialog = useCallback((definition: SaveDataFieldDefinitionDto) => {
    setEditingDefinition(definition);
    setCloneSourceDefinition(null);
    setDefinitionFormState(createDefinitionFormState(definition));
    setDefinitionDialogOpen(true);
  }, []);

  const openCloneDefinitionDialog = useCallback((definition: SaveDataFieldDefinitionDto) => {
    setEditingDefinition(null);
    setCloneSourceDefinition(definition);
    setDefinitionFormState(createDefinitionFormState(definition, { resetDisplayOrder: true }));
    setDefinitionDialogOpen(true);
  }, []);

  const closeBulkDefinitionTypeDialog = useCallback(() => {
    setBulkDefinitionTypeDialogOpen(false);
    setBulkDefinitionTypeFormState(createEmptyBulkDefinitionTypeFormState());
    setBulkDefinitionTargetIds([]);
  }, []);

  const openBulkDefinitionTypeDialog = useCallback(() => {
    const targetDefinitions = selectedDefinitions.filter((item) => !item.isDeleted);
    const firstDefinition = targetDefinitions[0] ?? null;
    setBulkDefinitionTargetIds(targetDefinitions.map((item) => item.id));
    setBulkDefinitionTypeFormState(firstDefinition
      ? {
        fieldType: String(firstDefinition.fieldType),
        sharedChoiceSetId: firstDefinition.sharedChoiceSetId != null ? String(firstDefinition.sharedChoiceSetId) : '',
      }
      : createEmptyBulkDefinitionTypeFormState());
    setBulkDefinitionTypeDialogOpen(true);
  }, [selectedDefinitions]);

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

  const handleSaveDefinition = useCallback(async (afterSave: 'close' | 'continue' = 'close') => {
    setSuccess(null);

    if (!selectedContentGroupId) {
      setError('内容分類を選択してください。');
      return;
    }

    if (!definitionFormState.fieldKey.trim() || !definitionFormState.label.trim()) {
      setError('fieldKey と表示名は必須です。');
      return;
    }

    const displayOrderError = validateDisplayOrderInput(definitionFormState.displayOrder, editingDefinition != null);
    if (displayOrderError) {
      setError(displayOrderError);
      return;
    }

    const normalizedFieldKey = normalizeFieldKeyForComparison(definitionFormState.fieldKey);
    const duplicatedDefinition = definitions.find((item) => (
      normalizeFieldKeyForComparison(item.fieldKey) === normalizedFieldKey
      && item.id !== editingDefinition?.id
    ));
    if (duplicatedDefinition) {
      setError('fieldKey が重複しています。大文字小文字は区別されないため、別の fieldKey を入力してください。');
      return;
    }

    try {
      setError(null);
      let createdDefinitionId: number | null = null;
      const continueCreating = afterSave === 'continue' && !editingDefinition && !isCloningDefinition;
      const shouldCloneOptions = cloneSourceDefinition?.fieldType === 6
        && cloneSourceDefinition.sharedChoiceSetId == null
        && Number(definitionFormState.fieldType) === 6
        && !definitionFormState.sharedChoiceSetId;
      await startLoading(async () => {
        if (editingDefinition) {
          const displayOrder = parsePositiveDisplayOrder(definitionFormState.displayOrder);
          if (displayOrder == null) {
            throw new Error('表示順を入力してください。');
          }

          await updateSaveDataFieldDefinition(
            editingDefinition.id,
            createDefinitionUpdateRequestFromForm(definitionFormState, displayOrder),
          );
        } else {
          const displayOrder = parsePositiveDisplayOrder(definitionFormState.displayOrder);
          createdDefinitionId = await createSaveDataFieldDefinition(
            Number(selectedContentGroupId),
            createDefinitionCreateRequest(definitionFormState, displayOrder),
          );
          if (shouldCloneOptions && createdDefinitionId != null && cloneSourceDefinition) {
            const createdOptionIds: number[] = [];
            try {
              const sourceOptions = await fetchSaveDataFieldOptions(cloneSourceDefinition.id);
              const sortedSourceOptions = [...sourceOptions].sort((left, right) => left.displayOrder - right.displayOrder);
              for (const sourceOption of sortedSourceOptions) {
                const createdOptionId = await createSaveDataFieldOption(createdDefinitionId, {
                  optionKey: sourceOption.optionKey,
                  label: sourceOption.label,
                  description: sourceOption.description,
                });
                createdOptionIds.push(createdOptionId);
              }
            } catch (cloneError) {
              const rollbackFailures: string[] = [];

              for (const createdOptionId of [...createdOptionIds].reverse()) {
                try {
                  await deleteSaveDataFieldOption(createdOptionId);
                } catch {
                  rollbackFailures.push(`option:${createdOptionId}`);
                }
              }

              try {
                await deleteSaveDataFieldDefinition(createdDefinitionId);
              } catch {
                rollbackFailures.push(`definition:${createdDefinitionId}`);
              }

              const baseMessage = cloneError instanceof Error ? cloneError.message : '候補値の複写に失敗しました。';
              if (rollbackFailures.length > 0) {
                throw new Error(`${baseMessage} ロールバックにも失敗しました: ${rollbackFailures.join(', ')}`);
              }
              throw new Error(`${baseMessage} 作成した項目定義はロールバックしました。`);
            }
          }
        }
      }, editingDefinition ? '項目定義を保存中...' : isCloningDefinition ? '項目定義を複写中...' : '項目定義を保存中...');

      await loadDefinitions();
      if (createdDefinitionId != null && Number(definitionFormState.fieldType) === 6) {
        setSelectedFieldDefinitionId(String(createdDefinitionId));
      }

      if (continueCreating) {
        setEditingDefinition(null);
        setCloneSourceDefinition(null);
        setDefinitionFormState(createEmptyDefinitionFormState());
        setSuccess('項目定義を作成しました。続けて入力できます。');
        focusFirstField(definitionDialogBodyRef.current);
      } else if (editingDefinition) {
        closeDefinitionDialog();
        setSuccess('項目定義を更新しました。');
      } else if (isCloningDefinition) {
        closeDefinitionDialog();
        if (shouldCloneOptions) {
          setSuccess('項目定義と候補値を複写しました。');
        } else {
          setSuccess('項目定義を複写しました。');
        }
      } else {
        closeDefinitionDialog();
        setSuccess('項目定義を作成しました。');
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '項目定義の保存に失敗しました。');
    }
  }, [cloneSourceDefinition, closeDefinitionDialog, definitionFormState, definitions, editingDefinition, focusFirstField, isCloningDefinition, loadDefinitions, selectedContentGroupId, startLoading]);

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

  const handleBulkUpdateDefinitionType = useCallback(async () => {
    const nextFieldType = parseDefinitionFieldType(bulkDefinitionTypeFormState.fieldType);
    const nextSharedChoiceSetId = nextFieldType === 6
      ? parseDefinitionSharedChoiceSetId(bulkDefinitionTypeFormState.sharedChoiceSetId)
      : null;
    const batchItems = buildBulkDefinitionTypeUpdateItems(bulkDefinitionTargets, nextFieldType, nextSharedChoiceSetId);

    if (batchItems.length === 0) {
      setError('型を一括変更する項目定義を選択してください。');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await startLoading(async () => {
        await batchUpdateSaveDataFieldDefinitionTypes(batchItems);
      }, '項目定義の型を一括更新中...');

      closeBulkDefinitionTypeDialog();
      setSuccess(`項目定義 ${batchItems.length} 件の型を更新しました。`);
      await loadDefinitions();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '項目定義の一括型変更に失敗しました。');
    }
  }, [bulkDefinitionTargets, bulkDefinitionTypeFormState.fieldType, bulkDefinitionTypeFormState.sharedChoiceSetId, closeBulkDefinitionTypeDialog, loadDefinitions, startLoading]);

  const handleSaveOption = useCallback(async (afterSave: 'close' | 'continue' = 'close') => {
    setSuccess(null);

    if (!selectedDefinition) {
      setError('候補値を紐付ける項目定義を選択してください。');
      return;
    }

    if (!optionFormState.optionKey.trim() || !optionFormState.label.trim()) {
      setError('optionKey と表示名は必須です。');
      return;
    }

    const displayOrderError = validateDisplayOrderInput(optionFormState.displayOrder, editingOption != null);
    if (displayOrderError) {
      setError(displayOrderError);
      return;
    }

    try {
      setError(null);
      const continueCreating = afterSave === 'continue' && !editingOption;
      await startLoading(async () => {
        const payload = createOptionRequest(optionFormState);
        if (editingOption) {
          await updateSaveDataFieldOption(editingOption.id, payload as UpdateSaveDataFieldOptionRequest);
        } else {
          await createSaveDataFieldOption(selectedDefinition.id, payload);
        }
      }, '候補値を保存中...');

      await loadOptions();
      if (continueCreating) {
        setEditingOption(null);
        setOptionFormState(createEmptyOptionFormState());
        setSuccess('候補値を作成しました。続けて入力できます。');
        focusFirstField(optionDialogBodyRef.current);
      } else {
        setOptionDialogOpen(false);
        setSuccess(editingOption ? '候補値を更新しました。' : '候補値を作成しました。');
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '候補値の保存に失敗しました。');
    }
  }, [editingOption, focusFirstField, loadOptions, optionFormState, selectedDefinition, startLoading]);

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

  // -----------------------------------------------------------------------
  // Definition reorder
  // -----------------------------------------------------------------------

  const defReorderEnabled = defRowOrder !== null;

  const handleEnterDefReorder = useCallback(() => {
    setDefRowOrder(definitions.filter((d) => !d.isDeleted).map((d) => d.id));
    setDefReorderDirty(false);
  }, [definitions]);

  const handleCancelDefReorder = useCallback(() => {
    setDefRowOrder(null);
    setDefReorderDirty(false);
  }, []);

  const handleMoveDefinition = useCallback((id: number, direction: 'up' | 'down') => {
    setDefRowOrder((prev) => {
      if (!prev) return prev;
      const selectedIds = selectedDefinitions
        .filter((item) => !item.isDeleted)
        .map((item) => item.id)
        .filter((selectedId) => prev.includes(selectedId));
      const moveIds = selectedDefinitionKeys.includes(String(id)) && selectedIds.length > 0
        ? selectedIds
        : [id];
      const next = moveSelectedItemsByOne(prev, moveIds, direction);
      if (next.every((value, index) => value === prev[index])) {
        return prev;
      }
      return next;
    });
    setDefReorderDirty(true);
  }, [selectedDefinitionKeys, selectedDefinitions]);

  const handleSaveDefReorder = useCallback(async () => {
    if (!defRowOrder || !defReorderDirty || !selectedContentGroupId) return;
    setDefReorderSaving(true);
    try {
      const defMap = new Map(definitions.map((d) => [d.id, d]));
      const items: ReorderItemRequest[] = defRowOrder
        .map((id, index) => {
          const newOrder = index + 1;
          const dto = defMap.get(id);
          if (dto?.displayOrder === newOrder) return null;
          return { id, displayOrder: newOrder };
        })
        .filter((item): item is ReorderItemRequest => item !== null);

      if (items.length > 0) {
        await startLoading(async () => {
          await reorderSaveDataFieldDefinitions(Number(selectedContentGroupId), items);
        }, '項目定義の表示順を保存中...');
      }
      setDefRowOrder(null);
      setDefReorderDirty(false);
      setSuccess('項目定義の表示順を保存しました。');
      await loadDefinitions();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '項目定義の表示順保存に失敗しました。');
    } finally {
      setDefReorderSaving(false);
    }
  }, [defRowOrder, defReorderDirty, selectedContentGroupId, definitions, startLoading, loadDefinitions]);

  const handleDefRowMove = useCallback((fromIndex: number, toIndex: number) => {
    setDefRowOrder((prev) => {
      if (!prev) return prev;
      const draggedId = prev[fromIndex];
      if (draggedId == null) return prev;
      const selectedIds = selectedDefinitions
        .filter((item) => !item.isDeleted)
        .map((item) => item.id)
        .filter((id) => prev.includes(id));
      if (selectedDefinitionKeys.includes(String(draggedId)) && selectedIds.length > 1) {
        return moveSelectedItemsToTarget(prev, selectedIds, fromIndex, toIndex);
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDefReorderDirty(true);
  }, [selectedDefinitionKeys, selectedDefinitions]);

  // -----------------------------------------------------------------------
  // Option reorder
  // -----------------------------------------------------------------------

  const optReorderEnabled = optRowOrder !== null;

  const handleEnterOptReorder = useCallback(() => {
    setOptRowOrder(options.filter((o) => !o.isDeleted).map((o) => o.id));
    setOptReorderDirty(false);
  }, [options]);

  const handleCancelOptReorder = useCallback(() => {
    setOptRowOrder(null);
    setOptReorderDirty(false);
  }, []);

  const handleMoveOption = useCallback((id: number, direction: 'up' | 'down') => {
    setOptRowOrder((prev) => {
      if (!prev) return prev;
      const selectedIds = selectedOptions
        .filter((item) => !item.isDeleted)
        .map((item) => item.id)
        .filter((selectedId) => prev.includes(selectedId));
      const moveIds = selectedOptionKeys.includes(String(id)) && selectedIds.length > 0
        ? selectedIds
        : [id];
      const next = moveSelectedItemsByOne(prev, moveIds, direction);
      if (next.every((value, index) => value === prev[index])) {
        return prev;
      }
      return next;
    });
    setOptReorderDirty(true);
  }, [selectedOptionKeys, selectedOptions]);

  const handleOptRowMove = useCallback((fromIndex: number, toIndex: number) => {
    setOptRowOrder((prev) => {
      if (!prev) return prev;
      const draggedId = prev[fromIndex];
      if (draggedId == null) return prev;
      const selectedIds = selectedOptions
        .filter((item) => !item.isDeleted)
        .map((item) => item.id)
        .filter((id) => prev.includes(id));
      if (selectedOptionKeys.includes(String(draggedId)) && selectedIds.length > 1) {
        return moveSelectedItemsToTarget(prev, selectedIds, fromIndex, toIndex);
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setOptReorderDirty(true);
  }, [selectedOptionKeys, selectedOptions]);

  const handleSaveOptReorder = useCallback(async () => {
    if (!optRowOrder || !optReorderDirty || !selectedDefinition) return;
    setOptReorderSaving(true);
    try {
      const optMap = new Map(options.map((o) => [o.id, o]));
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
          await reorderSaveDataFieldOptions(selectedDefinition.id, items);
        }, '候補値の表示順を保存中...');
      }
      setOptRowOrder(null);
      setOptReorderDirty(false);
      setSuccess('候補値の表示順を保存しました。');
      await loadOptions();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '候補値の表示順保存に失敗しました。');
    } finally {
      setOptReorderSaving(false);
    }
  }, [optRowOrder, optReorderDirty, selectedDefinition, options, startLoading, loadOptions]);

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

  // -----------------------------------------------------------------------
  // Copy definitions to another content group
  // -----------------------------------------------------------------------

  const copyTargetOptions = useMemo(() => {
    if (!lookups) return [];
    return lookups.gameSoftwareContentGroups
      .filter((item) => String(item.id) !== selectedContentGroupId)
      .map((item) => ({ value: String(item.id), label: item.name }));
  }, [lookups, selectedContentGroupId]);

  const openCopyDialog = useCallback(() => {
    setCopyTargetContentGroupId('');
    setCopyPlan(null);
    setCopyDialogOpen(true);
  }, []);

  const closeCopyDialog = useCallback(() => {
    setCopyDialogOpen(false);
    setCopyTargetContentGroupId('');
    setCopyPlan(null);
    setCopyPlanLoading(false);
  }, []);

  const handleCopyTargetChange = useCallback(async (targetId: string) => {
    setCopyTargetContentGroupId(targetId);
    setCopyPlan(null);

    if (!targetId) return;

    setCopyPlanLoading(true);
    try {
      const targetDefs = await fetchSaveDataFieldDefinitions(Number(targetId));
      const plan = buildCopyPlan(
        selectedDefinitions.filter((d) => !d.isDeleted),
        targetDefs,
      );
      setCopyPlan(plan);
    } catch (planError) {
      setError(planError instanceof Error ? planError.message : '複写先の項目定義取得に失敗しました。');
      setCopyPlan(null);
    } finally {
      setCopyPlanLoading(false);
    }
  }, [selectedDefinitions]);

  const handleExecuteCopy = useCallback(async () => {
    if (!copyPlan || !copyTargetContentGroupId) return;

    const targetGroupId = Number(copyTargetContentGroupId);
    if (!Number.isFinite(targetGroupId) || targetGroupId <= 0) return;

    const copyItems = copyPlan.filter((item) => item.action === 'copy');
    if (copyItems.length === 0) {
      setError('複写できる項目がありません。対象がすべてスキップされました。');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const results: CopyResultItem[] = [];

      await startLoading(async () => {
        // 実行時に最新の target 定義を取得し、プランを再計算する（TOCTOU 対策）
        const targetDefs = await fetchSaveDataFieldDefinitions(targetGroupId);
        const freshPlan = buildCopyPlan(
          selectedDefinitions.filter((d) => !d.isDeleted),
          targetDefs,
        );
        let nextOrder = computeNextDisplayOrder(targetDefs);

        for (const planItem of freshPlan) {
          if (planItem.action === 'skip') {
            results.push({ definition: planItem.definition, outcome: 'skipped' });
            continue;
          }

          try {
            const createRequest = buildCreateRequestFromSource(planItem.definition, nextOrder);
            const createdId = await createSaveDataFieldDefinition(targetGroupId, createRequest);
            nextOrder++;

            if (shouldCopyOptions(planItem.definition)) {
              const sourceOptions = await fetchSaveDataFieldOptions(planItem.definition.id);
              const payloads = buildOptionCreatePayloads(sourceOptions);
              await Promise.all(payloads.map((payload) => createSaveDataFieldOption(createdId, payload)));
            }

            results.push({ definition: planItem.definition, outcome: 'created' });
          } catch (copyError) {
            results.push({
              definition: planItem.definition,
              outcome: 'failed',
              error: copyError instanceof Error ? copyError.message : '不明なエラー',
            });
          }
        }
      }, '項目定義を別分類へ複写中...');

      const summary = summarizeCopyResults(results);
      closeCopyDialog();

      if (summary.failed > 0) {
        const failedDetails = summary.results
          .filter((r) => r.outcome === 'failed')
          .map((r) => `${r.definition.label}: ${r.error}`)
          .join('; ');
        setError(`${buildCopySummaryMessage(summary)} 失敗: ${failedDetails}`);
      } else {
        setSuccess(buildCopySummaryMessage(summary));
      }
    } catch (executeError) {
      setError(executeError instanceof Error ? executeError.message : '複写処理に失敗しました。');
    }
  }, [copyPlan, copyTargetContentGroupId, closeCopyDialog, selectedDefinitions, startLoading]);

  const definitionRowsWithActions = useMemo(() => definitionRows.map((row) => {
    const definition = definitions.find((item) => item.id === row.id)!;
    return {
      ...row,
      actions: '',
      actionContent: definition,
    };
  }), [definitionRows, definitions]);

  const sortedDefinitionRows = useMemo(() => {
    if (!defRowOrder) return definitionRowsWithActions;
    const rowMap = new Map(definitionRowsWithActions.map((r) => [r.id, r]));
    return defRowOrder.map((id) => rowMap.get(id)).filter((r): r is typeof definitionRowsWithActions[number] => r !== undefined);
  }, [definitionRowsWithActions, defRowOrder]);

  const optionRowsWithActions = useMemo(() => optionRows.map((row) => {
    const option = options.find((item) => item.id === row.id)!;
    return {
      ...row,
      actions: '',
      actionContent: option,
    };
  }), [optionRows, options]);

  const sortedOptionRows = useMemo(() => {
    if (!optRowOrder) return optionRowsWithActions;
    const rowMap = new Map(optionRowsWithActions.map((r) => [r.id, r]));
    return optRowOrder.map((id) => rowMap.get(id)).filter((r): r is typeof optionRowsWithActions[number] => r !== undefined);
  }, [optionRowsWithActions, optRowOrder]);

  const definitionTableColumns = useMemo<DataTableColumn<typeof sortedDefinitionRows[number]>[]>(() => [
    ...definitionColumns.map((column) => (
      defReorderEnabled
        ? { ...column, sortable: false, filterable: false }
        : column
    )),
    {
      key: 'actions',
      header: '操作',
      render: (_, row) => {
        const definition = definitions.find((item) => item.id === row.id)!;
        if (defReorderEnabled) {
          const idx = defRowOrder?.indexOf(row.id) ?? -1;
          return (
            <RowMoveButtons
              isFirst={idx <= 0}
              isLast={idx === (defRowOrder?.length ?? 0) - 1}
              disabled={defReorderSaving}
              onMoveUp={() => handleMoveDefinition(row.id, 'up')}
              onMoveDown={() => handleMoveDefinition(row.id, 'down')}
            />
          );
        }
        return (
          <div className="flex flex-wrap gap-2">
            <CustomButton onClick={() => openEditDefinitionDialog(definition)}>
              {pageMode === 'view' ? '詳細' : '編集'}
            </CustomButton>
            {!definition.isDeleted && pageMode === 'edit' ? (
              <CustomButton onClick={() => openCloneDefinitionDialog(definition)}>複写</CustomButton>
            ) : null}
            {definition.fieldType === 6 && definition.sharedChoiceSetId == null ? (
              <CustomButton onClick={() => setSelectedFieldDefinitionId(String(definition.id))}>候補値</CustomButton>
            ) : null}
            {pageMode === 'edit' ? (
              <CustomButton variant="ghost" onClick={() => void handleDeleteDefinition(definition)}>削除</CustomButton>
            ) : null}
          </div>
        );
      },
    },
  ], [defReorderEnabled, defReorderSaving, defRowOrder, definitions, handleDeleteDefinition, handleMoveDefinition, openCloneDefinitionDialog, openEditDefinitionDialog, pageMode]);

  const optionTableColumns = useMemo<DataTableColumn<typeof sortedOptionRows[number]>[]>(() => [
    ...optionColumns.map((column) => (
      optReorderEnabled
        ? { ...column, sortable: false, filterable: false }
        : column
    )),
    {
      key: 'actions',
      header: '操作',
      render: (_, row) => {
        const option = options.find((item) => item.id === row.id)!;
        if (optReorderEnabled) {
          const idx = optRowOrder?.indexOf(row.id) ?? -1;
          return (
            <RowMoveButtons
              isFirst={idx <= 0}
              isLast={idx === (optRowOrder?.length ?? 0) - 1}
              disabled={optReorderSaving}
              onMoveUp={() => handleMoveOption(row.id, 'up')}
              onMoveDown={() => handleMoveOption(row.id, 'down')}
            />
          );
        }
        return (
          <div className="flex flex-wrap gap-2">
            <CustomButton onClick={() => openEditOptionDialog(option)}>
              {pageMode === 'view' ? '詳細' : '編集'}
            </CustomButton>
            {pageMode === 'edit' ? (
              <CustomButton variant="ghost" onClick={() => void handleDeleteOption(option)}>削除</CustomButton>
            ) : null}
          </div>
        );
      },
    },
  ], [handleDeleteOption, handleMoveOption, openEditOptionDialog, optReorderEnabled, optReorderSaving, optRowOrder, options, pageMode]);

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

  const canManageOptions = selectedDefinition?.fieldType === 6 && selectedDefinition.sharedChoiceSetId == null;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(241,245,249,0.95))] p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.95),rgba(9,9,11,0.95))] dark:ring-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Schema Management</p>
              <CustomHeader level={1}>SaveData スキーマ管理</CustomHeader>
              <p className="max-w-4xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                SaveDataFieldDefinitions、SaveDataFieldOptions、SaveDataFieldOverrides を管理し、公開 schema API で解決される最終形も同画面で確認できます。共有選択肢セットの管理は専用画面で行います。
              </p>
            </div>
            <PageModeToggle mode={pageMode} onChange={setPageMode} />
          </div>
        </div>

        {error && !inlineDialogMessageVisible ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
        {success && !inlineDialogMessageVisible ? <CustomMessageArea variant="success">{success}</CustomMessageArea> : null}

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
                  {defReorderEnabled ? (
                    <>
                      <CustomButton variant="accent" disabled={!defReorderDirty || defReorderSaving} onClick={() => void handleSaveDefReorder()}>表示順を保存</CustomButton>
                      <CustomButton onClick={handleCancelDefReorder}>キャンセル</CustomButton>
                    </>
                  ) : pageMode === 'edit' ? (
                    <>
                      <CustomButton variant="accent" onClick={openCreateDefinitionDialog}>項目定義を追加</CustomButton>
                      {selectedDefinitions.filter((item) => !item.isDeleted).length > 0 ? (
                        <>
                          <CustomButton onClick={openBulkDefinitionTypeDialog}>型を一括変更</CustomButton>
                          <CustomButton onClick={openCopyDialog}>別分類へ複写</CustomButton>
                        </>
                      ) : null}
                      {definitions.filter((d) => !d.isDeleted).length > 1 ? (
                        <CustomButton onClick={handleEnterDefReorder}>表示順の変更</CustomButton>
                      ) : null}
                    </>
                  ) : null}
                </>
              }
            >
              <div className="space-y-4">
                {selectedDefinitions.length > 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-300">
                    選択中: {selectedDefinitions.length} 件（Shift+クリックで範囲選択、表示順変更中は上下移動でまとめて並び替え）
                  </p>
                ) : null}
                <DataTable
                  key={`definitions:${defReorderEnabled ? 'reorder' : 'default'}`}
                  columns={definitionTableColumns}
                  data={sortedDefinitionRows}
                  height={DATA_TABLE_DEFAULT_PAGE_HEIGHT}
                  rowKey="id"
                  selectable
                  selectedKeys={selectedDefinitionKeys}
                  onSelectionChange={setSelectedDefinitionKeys}
                  emptyMessage="項目定義がありません。"
                  paginated
                  rowReorderEnabled={defReorderEnabled}
                  onRowMove={handleDefRowMove}
                />
                {definitions.length > 0 ? (
                  <SelectField
                    id="field-definition"
                    label="候補値を管理する項目"
                    value={selectedFieldDefinitionId}
                    options={definitions
                      .filter((item) => item.fieldType === 6 && item.sharedChoiceSetId == null)
                      .map((item) => ({ value: String(item.id), label: `${item.label} (${item.fieldKey})` }))}
                    onChange={setSelectedFieldDefinitionId}
                  />
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="候補値"
              description="SingleSelect の項目定義を選んだときだけ候補値管理 UI を表示します。共有選択肢セットを使用中の項目定義では、候補値はセット側で管理されます。"
              actions={canManageOptions ? (
                <>
                  {optReorderEnabled ? (
                    <>
                      <CustomButton variant="accent" disabled={!optReorderDirty || optReorderSaving} onClick={() => void handleSaveOptReorder()}>表示順を保存</CustomButton>
                      <CustomButton onClick={handleCancelOptReorder}>キャンセル</CustomButton>
                    </>
                  ) : pageMode === 'edit' ? (
                    <>
                      <CustomButton variant="accent" onClick={openCreateOptionDialog}>候補値を追加</CustomButton>
                      {options.filter((o) => !o.isDeleted).length > 1 ? (
                        <CustomButton onClick={handleEnterOptReorder}>表示順の変更</CustomButton>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : null}
            >
              {canManageOptions ? (
                <div className="space-y-4">
                  {selectedOptions.length > 0 ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-300">
                      選択中: {selectedOptions.length} 件（Shift+クリックで範囲選択、表示順変更中は上下移動でまとめて並び替え）
                    </p>
                  ) : null}
                  <DataTable
                    key={`options:${selectedDefinition?.id ?? 'none'}:${optReorderEnabled ? 'reorder' : 'default'}`}
                    columns={optionTableColumns}
                    data={sortedOptionRows}
                    height={DATA_TABLE_DEFAULT_PAGE_HEIGHT}
                    rowKey="id"
                    selectable
                    selectedKeys={selectedOptionKeys}
                    onSelectionChange={setSelectedOptionKeys}
                    emptyMessage="候補値がありません。"
                    paginated
                    rowReorderEnabled={optReorderEnabled}
                    onRowMove={handleOptRowMove}
                  />
                </div>
              ) : selectedDefinition?.fieldType === 6 && selectedDefinition.sharedChoiceSetId != null ? (
                <p className="text-sm text-zinc-500">この項目定義は共有選択肢セットを使用しています。候補値は「共有選択肢セット管理」画面で管理してください。</p>
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
                  height={DATA_TABLE_DEFAULT_PAGE_HEIGHT}
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
                height={DATA_TABLE_DEFAULT_PAGE_HEIGHT}
                rowKey="id"
                emptyMessage="resolved schema がありません。"
              />
            </SectionCard>
          </>
        )}

        <Dialog
          open={definitionDialogOpen}
          onClose={closeDefinitionDialog}
          title={editingDefinition ? (pageMode === 'view' ? '項目定義の詳細' : '項目定義を編集') : isCloningDefinition ? '項目定義を複写' : '項目定義を追加'}
          footer={
            pageMode === 'view' && editingDefinition ? (
              <>
                <CustomButton onClick={closeDefinitionDialog}>閉じる</CustomButton>
                <CustomButton variant="accent" onClick={() => setPageMode('edit')}>編集を有効化</CustomButton>
              </>
            ) : (
              <>
                {pageMode === 'edit' && editingDefinition ? (
                  <CustomButton onClick={() => setPageMode('view')}>読み取り専用に戻す</CustomButton>
                ) : null}
                <CustomButton onClick={closeDefinitionDialog} disabled={isPending}>キャンセル</CustomButton>
                {!editingDefinition && !isCloningDefinition ? (
                  <>
                    <CustomButton onClick={() => void handleSaveDefinition('continue')} disabled={isPending}>作成して続ける</CustomButton>
                    <CustomButton variant="accent" onClick={() => void handleSaveDefinition('close')} disabled={isPending}>作成して閉じる</CustomButton>
                  </>
                ) : (
                  <CustomButton variant="accent" onClick={() => void handleSaveDefinition('close')} disabled={isPending}>保存</CustomButton>
                )}
              </>
            )
          }
        >
          <div ref={definitionDialogBodyRef} className="space-y-4">
            {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
            {success ? <CustomMessageArea variant="success">{success}</CustomMessageArea> : null}
            {cloneSourceDefinition ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                <p>複写元: {cloneSourceDefinition.label} ({cloneSourceDefinition.fieldKey})</p>
                <p>fieldKey は重複したまま保存できないため、必要に応じて変更してください。</p>
                {cloneSourceDefinition.fieldType === 6 ? (
                  <p>型を SingleSelect のまま保存した場合は、候補値も複写します。</p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2">
              <CustomLabel htmlFor="definition-field-key">fieldKey</CustomLabel>
              <CustomTextBox id="definition-field-key" value={definitionFormState.fieldKey} onChange={(event) => setDefinitionFormState((current) => ({ ...current, fieldKey: event.target.value }))} displayOnly={pageMode === 'view' && !!editingDefinition} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="definition-label">表示名</CustomLabel>
              <CustomTextBox id="definition-label" value={definitionFormState.label} onChange={(event) => setDefinitionFormState((current) => ({ ...current, label: event.target.value }))} displayOnly={pageMode === 'view' && !!editingDefinition} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="definition-description">説明</CustomLabel>
              <CustomTextArea id="definition-description" value={definitionFormState.description} onChange={(event) => setDefinitionFormState((current) => ({ ...current, description: event.target.value }))} displayOnly={pageMode === 'view' && !!editingDefinition} />
            </div>
            <SelectField id="definition-type" label="型" value={definitionFormState.fieldType} options={FIELD_TYPE_OPTIONS} onChange={(value) => setDefinitionFormState((current) => ({ ...current, fieldType: value, sharedChoiceSetId: value !== '6' ? '' : current.sharedChoiceSetId }))} displayOnly={pageMode === 'view' && !!editingDefinition} />
            {definitionFormState.fieldType === '6' ? (
              <SelectField
                id="definition-shared-choice-set"
                label="共有選択肢セット（任意）"
                value={definitionFormState.sharedChoiceSetId}
                options={choiceSets.filter((cs) => !cs.isDeleted).map((cs) => ({ value: String(cs.id), label: `${cs.label} (${cs.choiceSetKey})` }))}
                onChange={(value) => setDefinitionFormState((current) => ({ ...current, sharedChoiceSetId: value }))}
                displayOnly={pageMode === 'view' && !!editingDefinition}
              />
            ) : null}
            <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-200">
              <CustomCheckBox checked={definitionFormState.isRequired} onChange={(event) => setDefinitionFormState((current) => ({ ...current, isRequired: event.target.checked }))} displayOnly={pageMode === 'view' && !!editingDefinition} />
              必須項目にする
            </label>
            <div className="space-y-2">
              <CustomLabel htmlFor="definition-order">{editingDefinition ? '表示順' : '表示順（任意）'}</CustomLabel>
              <CustomTextBox id="definition-order" type="number" min={1} step="1" value={definitionFormState.displayOrder} placeholder={editingDefinition ? '1' : '未入力で末尾に追加'} onChange={(event) => setDefinitionFormState((current) => ({ ...current, displayOrder: event.target.value }))} displayOnly={pageMode === 'view' && !!editingDefinition} />
            </div>
          </div>
        </Dialog>

        <Dialog
          open={optionDialogOpen}
          onClose={() => setOptionDialogOpen(false)}
          title={editingOption ? (pageMode === 'view' ? '候補値の詳細' : '候補値を編集') : '候補値を追加'}
          footer={
            pageMode === 'view' && editingOption ? (
              <>
                <CustomButton onClick={() => setOptionDialogOpen(false)}>閉じる</CustomButton>
                <CustomButton variant="accent" onClick={() => setPageMode('edit')}>編集を有効化</CustomButton>
              </>
            ) : (
              <>
                {pageMode === 'edit' && editingOption ? (
                  <CustomButton onClick={() => setPageMode('view')}>読み取り専用に戻す</CustomButton>
                ) : null}
                <CustomButton onClick={() => setOptionDialogOpen(false)} disabled={isPending}>キャンセル</CustomButton>
                {!editingOption ? (
                  <>
                    <CustomButton onClick={() => void handleSaveOption('continue')} disabled={isPending}>作成して続ける</CustomButton>
                    <CustomButton variant="accent" onClick={() => void handleSaveOption('close')} disabled={isPending}>作成して閉じる</CustomButton>
                  </>
                ) : (
                  <CustomButton variant="accent" onClick={() => void handleSaveOption('close')} disabled={isPending}>保存</CustomButton>
                )}
              </>
            )
          }
        >
          <div ref={optionDialogBodyRef} className="space-y-4">
            {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
            {success ? <CustomMessageArea variant="success">{success}</CustomMessageArea> : null}
            <div className="space-y-2">
              <CustomLabel htmlFor="option-key">optionKey</CustomLabel>
              <CustomTextBox id="option-key" value={optionFormState.optionKey} onChange={(event) => setOptionFormState((current) => ({ ...current, optionKey: event.target.value }))} displayOnly={pageMode === 'view' && !!editingOption} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="option-label">表示名</CustomLabel>
              <CustomTextBox id="option-label" value={optionFormState.label} onChange={(event) => setOptionFormState((current) => ({ ...current, label: event.target.value }))} displayOnly={pageMode === 'view' && !!editingOption} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="option-description">説明</CustomLabel>
              <CustomTextArea id="option-description" value={optionFormState.description} onChange={(event) => setOptionFormState((current) => ({ ...current, description: event.target.value }))} displayOnly={pageMode === 'view' && !!editingOption} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="option-order">{editingOption ? '表示順' : '表示順（任意）'}</CustomLabel>
              <CustomTextBox id="option-order" type="number" min={1} step="1" value={optionFormState.displayOrder} placeholder={editingOption ? '1' : '未入力で末尾に追加'} onChange={(event) => setOptionFormState((current) => ({ ...current, displayOrder: event.target.value }))} displayOnly={pageMode === 'view' && !!editingOption} />
            </div>
          </div>
        </Dialog>

        <Dialog
          open={bulkDefinitionTypeDialogOpen}
          onClose={closeBulkDefinitionTypeDialog}
          title="項目定義の型を一括変更"
          footer={
            <>
              <CustomButton onClick={closeBulkDefinitionTypeDialog}>キャンセル</CustomButton>
              <CustomButton variant="accent" onClick={() => void handleBulkUpdateDefinitionType()}>更新</CustomButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <p>対象件数: {bulkDefinitionTargets.length} 件</p>
              <p>選択した項目定義の型のみをまとめて更新します。fieldKey、表示名、必須設定、表示順は維持されます。</p>
              <p>一括編集で変更できるのは「型」と、型が SingleSelect の場合の「共有選択肢セット」のみです。その他の項目は個別編集で変更してください。</p>
            </div>
            <SelectField
              id="bulk-definition-type"
              label="変更後の型"
              value={bulkDefinitionTypeFormState.fieldType}
              options={FIELD_TYPE_OPTIONS}
              onChange={(value) => setBulkDefinitionTypeFormState((current) => ({
                ...current,
                fieldType: value,
                sharedChoiceSetId: value !== '6' ? '' : current.sharedChoiceSetId,
              }))}
            />
            {bulkDefinitionTypeFormState.fieldType === '6' ? (
              <SelectField
                id="bulk-definition-shared-choice-set"
                label="共有選択肢セット（任意）"
                value={bulkDefinitionTypeFormState.sharedChoiceSetId}
                options={choiceSets.filter((cs) => !cs.isDeleted).map((cs) => ({ value: String(cs.id), label: `${cs.label} (${cs.choiceSetKey})` }))}
                onChange={(value) => setBulkDefinitionTypeFormState((current) => ({ ...current, sharedChoiceSetId: value }))}
              />
            ) : null}
          </div>
        </Dialog>

        <Dialog
          open={overrideDialogOpen}
          onClose={() => setOverrideDialogOpen(false)}
          title={overrideTargetField ? `${overrideTargetField.label} の override${pageMode === 'view' ? '（詳細）' : ''}` : 'override を編集'}
          footer={
            pageMode === 'view' ? (
              <>
                <CustomButton onClick={() => setOverrideDialogOpen(false)}>閉じる</CustomButton>
                <CustomButton variant="accent" onClick={() => setPageMode('edit')}>編集を有効化</CustomButton>
              </>
            ) : (
              <>
                <CustomButton onClick={() => setPageMode('view')}>読み取り専用に戻す</CustomButton>
                <CustomButton onClick={() => setOverrideDialogOpen(false)}>キャンセル</CustomButton>
                <CustomButton variant="accent" onClick={() => void handleSaveOverride()}>保存</CustomButton>
              </>
            )
          }
        >
          <div className="space-y-4">
            {overrideTargetField ? (
              <div className="select-none rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                <p>基本ラベル: {overrideTargetField.label}</p>
                <p>fieldKey: {overrideTargetField.fieldKey}</p>
                <p>型: {SAVE_DATA_FIELD_TYPE_LABELS[overrideTargetField.fieldType]}</p>
              </div>
            ) : null}
            <div className="space-y-2">
              <CustomLabel htmlFor="override-label">override ラベル</CustomLabel>
              <CustomTextBox id="override-label" value={overrideFormState.overrideLabel} onChange={(event) => setOverrideFormState((current) => ({ ...current, overrideLabel: event.target.value }))} displayOnly={pageMode === 'view'} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="override-description">override 説明</CustomLabel>
              <CustomTextArea id="override-description" value={overrideFormState.overrideDescription} onChange={(event) => setOverrideFormState((current) => ({ ...current, overrideDescription: event.target.value }))} displayOnly={pageMode === 'view'} />
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
              displayOnly={pageMode === 'view'}
            />
            <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-200">
              <CustomCheckBox checked={overrideFormState.isDisabled} onChange={(event) => setOverrideFormState((current) => ({ ...current, isDisabled: event.target.checked }))} displayOnly={pageMode === 'view'} />
              この作品では項目を無効化する
            </label>
          </div>
        </Dialog>

        <Dialog
          open={copyDialogOpen}
          onClose={closeCopyDialog}
          title="項目定義を別分類へ複写"
          footer={
            <>
              <CustomButton onClick={closeCopyDialog}>キャンセル</CustomButton>
              <CustomButton
                variant="accent"
                disabled={!copyPlan || copyPlan.filter((p) => p.action === 'copy').length === 0 || copyPlanLoading}
                onClick={() => void handleExecuteCopy()}
              >
                複写を実行
              </CustomButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <p>選択した項目定義 {selectedDefinitions.filter((d) => !d.isDeleted).length} 件を別のソフト分類へ複写します。</p>
              <p>SingleSelect 型の候補値も一緒に複写されます。共有選択肢セットは元の参照を維持します。</p>
              <p>複写先に同じ fieldKey がある項目はスキップされます。</p>
              <p>部分的に失敗した場合、成功した分はそのまま残ります。</p>
            </div>
            <SelectField
              id="copy-target-content-group"
              label="複写先の内容分類"
              value={copyTargetContentGroupId}
              options={copyTargetOptions}
              onChange={(value) => void handleCopyTargetChange(value)}
            />
            {copyPlanLoading ? (
              <p className="text-sm text-zinc-500">複写先の項目定義を取得中...</p>
            ) : null}
            {copyPlan ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  複写: {copyPlan.filter((p) => p.action === 'copy').length} 件　スキップ: {copyPlan.filter((p) => p.action === 'skip').length} 件
                </p>
                <ul className="max-h-52 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                  {copyPlan.map((item) => (
                    <li
                      key={item.definition.id}
                      className={`flex items-center gap-2 py-1 ${item.action === 'skip' ? 'text-zinc-400 line-through' : 'text-zinc-700 dark:text-zinc-200'}`}
                    >
                      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${item.action === 'copy' ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                      <span>{item.definition.label} ({item.definition.fieldKey})</span>
                      {item.skipReason ? <span className="text-xs text-zinc-400">— {item.skipReason}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Dialog>
      </div>
    </main>
  );
}