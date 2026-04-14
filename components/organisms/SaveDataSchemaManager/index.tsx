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
import DataTable, { DATA_TABLE_DEFAULT_PAGE_HEIGHT, type DataTableColumn, type SortState } from '@/components/molecules/DataTable';
import { moveSelectedItemsByOne, moveSelectedItemsToTarget } from '@/components/molecules/DataTable/selection-utils';
import Dialog from '@/components/molecules/Dialog';
import RowMoveButtons from '@/components/organisms/GameManagement/RowMoveButtons';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import {
  buildCatalogAssignmentPlan,
  buildAssignmentRequest,
  createAssignmentFormStateFromAssignments,
  createEmptyAssignmentFormState,
  getEffectiveAssignmentContentGroupIds,
  isAssignmentUnassignMode,
  resolveAssignmentRequiredValue,
  type AssignmentFormState,
} from './assignment';
import { buildBulkDefinitionTypeUpdateItems } from './bulk-definition-type';
import { createDefinitionCreateRequest, createDefinitionUpdateRequestFromForm, parseDefinitionFieldType, parseDefinitionSharedChoiceSetId } from './definition-payloads';
import {
  ApiError,
  fetchMasterLookups,
  getGameManagementErrorMessage,
} from '@/lib/game-management/api';
import type { SaveDataSchemaManagerTexts } from '@/lib/resources/game-management-pages';
import resources from '@/lib/resources';
import {
  fetchPublicSaveDataSchema,
} from '@/lib/game-management/api/public';
import {
  createSaveDataFieldDefinition,
  createSaveDataFieldOption,
  batchUpdateSaveDataFieldDefinitionTypes,
  deleteSaveDataFieldDefinitionAssignment,
  deleteSaveDataFieldDefinition,
  deleteSaveDataFieldOption,
  deleteSaveDataFieldOverride,
  fetchSaveDataFieldDefinitionCatalog,
  fetchSaveDataFieldChoiceSets,
  fetchSaveDataFieldDefinitions,
  fetchSaveDataFieldOptions,
  fetchSaveDataFieldOverrides,
  reorderSaveDataFieldDefinitions,
  reorderSaveDataFieldOptions,
  updateSaveDataFieldDefinition,
  updateSaveDataFieldOption,
  upsertSaveDataFieldDefinitionAssignment,
  upsertSaveDataFieldOverride,
} from '@/lib/game-management/api/schema';
import {
  SAVE_DATA_FIELD_TYPE_LABELS,
} from '@/lib/game-management/save-data-fields';
import type { PageMode } from '@/lib/game-management/resources';
import type {
  CreateSaveDataFieldOptionRequest,
  GameSoftwareMasterDto,
  MasterLookups,
  ReorderItemRequest,
  SaveDataFieldChoiceSetDto,
  SaveDataFieldDefinitionAssignmentDto,
  SaveDataFieldDefinitionDto,
  SaveDataFieldOptionDto,
  SaveDataFieldOverrideDto,
  SaveDataFieldType,
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

function formatText(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function mergeOrderedRows<T extends { id: number }>(
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

function validateDisplayOrderInput(
  value: string,
  required: boolean,
  texts: Pick<SaveDataSchemaManagerTexts['messages'], 'displayOrderRequired' | 'displayOrderInvalid'>,
): string {
  if (!value.trim()) {
    return required ? texts.displayOrderRequired : '';
  }

  return parsePositiveDisplayOrder(value) == null ? texts.displayOrderInvalid : '';
}

function getValidationErrors(details: unknown): Record<string, string[]> {
  if (!details || typeof details !== 'object') {
    return {};
  }

  const candidate = details as { errors?: Record<string, unknown> };
  if (!candidate.errors || typeof candidate.errors !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(candidate.errors).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [],
    ]),
  );
}

function hasValidationError(details: unknown, fieldPattern: RegExp, messagePattern: RegExp): boolean {
  return Object.entries(getValidationErrors(details)).some(([key, messages]) => (
    fieldPattern.test(key)
    || messages.some((message) => messagePattern.test(message))
  ));
}

function getSchemaManagerErrorMessage(
  error: unknown,
  fallback: { title: string; detail?: string },
  messages: Pick<SaveDataSchemaManagerTexts['messages'], 'duplicateFieldKey' | 'duplicateDisplayOrder'>,
): string {
  if (error instanceof ApiError) {
    if (hasValidationError(error.details, /fieldkey/i, /field.?key|duplicate|already exists|unique|重複/i)) {
      return messages.duplicateFieldKey;
    }

    if (hasValidationError(error.details, /displayorder/i, /display.?order|duplicate|重複/i)) {
      return messages.duplicateDisplayOrder;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return getGameManagementErrorMessage(error, { fallback });
}

function getAssignmentOperationErrorMessage(
  error: unknown,
  fallback: { title: string; detail?: string },
  messages: Pick<SaveDataSchemaManagerTexts['messages'], 'duplicateFieldKey' | 'duplicateDisplayOrder' | 'assignmentApiUnavailable'>,
): string {
  if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 405)) {
    return messages.assignmentApiUnavailable;
  }

  return getSchemaManagerErrorMessage(error, fallback, messages);
}

function normalizeFieldKeyForComparison(fieldKey: string): string {
  return fieldKey.trim().toLocaleLowerCase();
}

function toDefinitionDto(definition: SaveDataFieldDefinitionDto | SaveDataFieldDefinitionAssignmentDto): SaveDataFieldDefinitionDto {
  if ('id' in definition) {
    return definition;
  }

  return {
    id: definition.fieldDefinitionId,
    fieldKey: definition.fieldKey,
    label: definition.label,
    description: definition.description,
    fieldType: definition.fieldType,
    sharedChoiceSetId: definition.sharedChoiceSetId,
    isDeleted: definition.isDeleted,
  };
}

type CatalogRow = {
  id: number;
  fieldKey: string;
  label: string;
  fieldType: string;
  status: string;
  actions: string;
};

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

type AssignmentDialogSource = 'catalog' | 'settings';

const FIELD_TYPE_OPTIONS = (Object.entries(SAVE_DATA_FIELD_TYPE_LABELS) as Array<[string, string]>).map(([value, label]) => ({
  value,
  label,
}));

function buildCatalogColumns(texts: SaveDataSchemaManagerTexts): DataTableColumn<CatalogRow>[] {
  return [
    { key: 'id', header: texts.columns.id, width: '5rem', sortable: true, sortValue: (value) => Number(value ?? 0) },
    { key: 'fieldKey', header: texts.columns.fieldKey, sortable: true, filterable: true },
    { key: 'label', header: texts.columns.label, sortable: true, filterable: true },
    { key: 'fieldType', header: texts.columns.fieldType, sortable: true },
    { key: 'status', header: texts.columns.status },
  ];
}

function buildDefinitionColumns(texts: SaveDataSchemaManagerTexts): DataTableColumn<DefinitionRow>[] {
  return [
    { key: 'id', header: texts.columns.id, width: '5rem', sortable: true, sortValue: (value) => Number(value ?? 0) },
    { key: 'fieldKey', header: texts.columns.fieldKey, sortable: true, filterable: true },
    { key: 'label', header: texts.columns.label, sortable: true, filterable: true },
    { key: 'fieldType', header: texts.columns.fieldType, sortable: true },
    { key: 'displayOrder', header: texts.columns.displayOrder, sortable: true, sortValue: (value) => Number(value ?? 0) },
    { key: 'required', header: texts.columns.required },
    { key: 'status', header: texts.columns.status },
  ];
}

function buildOptionColumns(texts: SaveDataSchemaManagerTexts): DataTableColumn<OptionRow>[] {
  return [
    { key: 'id', header: texts.columns.id, width: '5rem', sortable: true, sortValue: (value) => Number(value ?? 0) },
    { key: 'optionKey', header: texts.columns.optionKey, sortable: true, filterable: true },
    { key: 'label', header: texts.columns.label, sortable: true, filterable: true },
    { key: 'displayOrder', header: texts.columns.displayOrder, sortable: true, sortValue: (value) => Number(value ?? 0) },
    { key: 'status', header: texts.columns.status },
  ];
}

function buildOverrideColumns(texts: SaveDataSchemaManagerTexts): DataTableColumn<OverrideRow>[] {
  return [
    { key: 'fieldKey', header: texts.columns.fieldKey, sortable: true, filterable: true },
    { key: 'baseLabel', header: texts.columns.baseLabel, sortable: true, filterable: true },
    { key: 'fieldType', header: texts.columns.fieldType, sortable: true },
    { key: 'overrideLabel', header: texts.columns.overrideLabel, filterable: true },
    { key: 'required', header: texts.columns.required },
    { key: 'disabled', header: texts.columns.disabled },
    { key: 'status', header: texts.columns.status },
  ];
}

function buildSchemaPreviewColumns(texts: SaveDataSchemaManagerTexts): DataTableColumn<SchemaPreviewRow>[] {
  return [
    { key: 'label', header: texts.columns.label, sortable: true, filterable: true },
    { key: 'fieldKey', header: texts.columns.fieldKey, sortable: true, filterable: true },
    { key: 'fieldType', header: texts.columns.fieldType, sortable: true },
    { key: 'required', header: texts.columns.required },
    { key: 'disabled', header: texts.columns.disabled },
  ];
}

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
    sharedChoiceSetId: '',
  };
}

function createDefinitionFormState(definition: SaveDataFieldDefinitionDto): DefinitionFormState {
  return {
    fieldKey: definition.fieldKey,
    label: definition.label,
    description: definition.description ?? '',
    fieldType: String(definition.fieldType),
    sharedChoiceSetId: definition.sharedChoiceSetId != null ? String(definition.sharedChoiceSetId) : '',
  };
}

function createContinueDefinitionFormState(current: DefinitionFormState): DefinitionFormState {
  return {
    ...createEmptyDefinitionFormState(),
    fieldType: current.fieldType,
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
  placeholder = '',
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  displayOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <CustomLabel htmlFor={id}>{label}</CustomLabel>
      <CustomComboBox id={id} value={value} onChange={(event) => onChange(event.target.value)} displayOnly={displayOnly}>
        <option value="">{placeholder}</option>
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

function createOptionUpdateRequest(formState: OptionFormState): UpdateSaveDataFieldOptionRequest {
  return {
    optionKey: formState.optionKey.trim(),
    label: formState.label.trim(),
    description: nullIfBlank(formState.description),
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

export default function SaveDataSchemaManager({ texts }: { texts: SaveDataSchemaManagerTexts }) {
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
  const [selectedCatalogDefinitionKeys, setSelectedCatalogDefinitionKeys] = useState<string[]>([]);
  const [selectedDefinitionKeys, setSelectedDefinitionKeys] = useState<string[]>([]);
  const [selectedOptionKeys, setSelectedOptionKeys] = useState<string[]>([]);

  const [catalogDefinitions, setCatalogDefinitions] = useState<SaveDataFieldDefinitionDto[]>([]);
  const [definitions, setDefinitions] = useState<SaveDataFieldDefinitionAssignmentDto[]>([]);
  const [options, setOptions] = useState<SaveDataFieldOptionDto[]>([]);
  const [choiceSets, setChoiceSets] = useState<SaveDataFieldChoiceSetDto[]>([]);
  const [overrideDefinitions, setOverrideDefinitions] = useState<SaveDataFieldDefinitionAssignmentDto[]>([]);
  const [overrides, setOverrides] = useState<SaveDataFieldOverrideDto[]>([]);
  const [resolvedSchema, setResolvedSchema] = useState<SaveDataSchemaDto | null>(null);

  const [definitionDialogOpen, setDefinitionDialogOpen] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<SaveDataFieldDefinitionDto | null>(null);
  const [cloneSourceDefinition, setCloneSourceDefinition] = useState<SaveDataFieldDefinitionDto | null>(null);
  const [definitionFormState, setDefinitionFormState] = useState<DefinitionFormState>(createEmptyDefinitionFormState());
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignDialogError, setAssignDialogError] = useState<string | null>(null);
  const [assignDialogSuccess, setAssignDialogSuccess] = useState<string | null>(null);
  const [assignmentDialogSource, setAssignmentDialogSource] = useState<AssignmentDialogSource>('catalog');
  const [assignmentTargetIds, setAssignmentTargetIds] = useState<number[]>([]);
  const [assignmentInitialContentGroupIds, setAssignmentInitialContentGroupIds] = useState<string[]>([]);
  const [selectedAssignmentContentGroupIds, setSelectedAssignmentContentGroupIds] = useState<string[]>([]);
  const [assignmentFormState, setAssignmentFormState] = useState<AssignmentFormState>(createEmptyAssignmentFormState());
  const [bulkDefinitionTypeDialogOpen, setBulkDefinitionTypeDialogOpen] = useState(false);
  const [bulkDefinitionTypeDialogError, setBulkDefinitionTypeDialogError] = useState<string | null>(null);
  const [bulkDefinitionTypeDialogSuccess, setBulkDefinitionTypeDialogSuccess] = useState<string | null>(null);
  const [bulkDefinitionTypeFormState, setBulkDefinitionTypeFormState] = useState<BulkDefinitionTypeFormState>(createEmptyBulkDefinitionTypeFormState());
  const [bulkDefinitionTargetIds, setBulkDefinitionTargetIds] = useState<number[]>([]);

  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<SaveDataFieldOptionDto | null>(null);
  const [optionFormState, setOptionFormState] = useState<OptionFormState>(createEmptyOptionFormState());

  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideDialogError, setOverrideDialogError] = useState<string | null>(null);
  const [overrideDialogSuccess, setOverrideDialogSuccess] = useState<string | null>(null);
  const [editingOverride, setEditingOverride] = useState<SaveDataFieldOverrideDto | null>(null);
  const [overrideTargetField, setOverrideTargetField] = useState<SaveDataFieldDefinitionAssignmentDto | null>(null);
  const [overrideFormState, setOverrideFormState] = useState<OverrideFormState>(createOverrideFormState(null));

  // Reorder state for definitions
  const [defRowOrder, setDefRowOrder] = useState<number[] | null>(null);
  const [defReorderDirty, setDefReorderDirty] = useState(false);
  const [defReorderSaving, setDefReorderSaving] = useState(false);

  // Reorder state for options
  const [optRowOrder, setOptRowOrder] = useState<number[] | null>(null);
  const [optReorderDirty, setOptReorderDirty] = useState(false);
  const [optReorderSaving, setOptReorderSaving] = useState(false);

  // Sort/filter state tracking for definition table
  const [defSortState, setDefSortState] = useState<SortState | null>(null);
  const [defFilteredCount, setDefFilteredCount] = useState<number | null>(null);

  // Sort/filter state tracking for option table
  const [optSortState, setOptSortState] = useState<SortState | null>(null);
  const [optFilteredCount, setOptFilteredCount] = useState<number | null>(null);

  const isCloningDefinition = cloneSourceDefinition != null;

  const catalogColumns = useMemo(() => buildCatalogColumns(texts), [texts]);
  const definitionColumns = useMemo(() => buildDefinitionColumns(texts), [texts]);
  const optionColumns = useMemo(() => buildOptionColumns(texts), [texts]);
  const overrideColumns = useMemo(() => buildOverrideColumns(texts), [texts]);
  const schemaPreviewColumns = useMemo(() => buildSchemaPreviewColumns(texts), [texts]);

  const inlineDialogMessageVisible = assignDialogOpen || definitionDialogOpen || optionDialogOpen || bulkDefinitionTypeDialogOpen || overrideDialogOpen;

  const loadCatalogDefinitions = useCallback(async () => {
    const nextCatalogDefinitions = await fetchSaveDataFieldDefinitionCatalog();
    setCatalogDefinitions(nextCatalogDefinitions);
    setSelectedCatalogDefinitionKeys([]);
  }, []);

  const loadMasters = useCallback(async () => {
    setPageLoading(true);
    setError(null);
    try {
      const [nextLookups, nextChoiceSets, nextCatalogDefinitions] = await Promise.all([
        fetchMasterLookups(),
        fetchSaveDataFieldChoiceSets(),
        fetchSaveDataFieldDefinitionCatalog(),
      ]);
      setLookups(nextLookups);
      setChoiceSets(nextChoiceSets);
      setCatalogDefinitions(nextCatalogDefinitions);
      setSelectedCatalogDefinitionKeys([]);
      setSelectedContentGroupId((current) => {
        if (current) {
          return current;
        }

        const firstAvailableContentGroup = nextLookups.gameSoftwareContentGroups.find((item) => !item.isDeleted);
        return firstAvailableContentGroup ? String(firstAvailableContentGroup.id) : '';
      });
    } catch (loadError) {
      setError(getGameManagementErrorMessage(loadError, {
        fallback: resources.gameManagement.errors.listLoad,
        adminFallback: resources.gameManagement.errors.adminRequired,
      }));
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMasters();
  }, [loadMasters]);

  const loadDefinitions = useCallback(async () => {
    if (!selectedContentGroupId) {
      setDefinitions([]);
      setSelectedDefinitionKeys([]);
      setSelectedFieldDefinitionId('');
      setDefRowOrder([]);
      setDefReorderDirty(false);
      return;
    }
    const nextDefinitions = await fetchSaveDataFieldDefinitions(Number(selectedContentGroupId));
    setDefinitions(nextDefinitions);
    setSelectedDefinitionKeys([]);
    setDefRowOrder(nextDefinitions.filter((item) => !item.isDeleted).map((item) => item.fieldDefinitionId));
    setDefReorderDirty(false);
    setSelectedFieldDefinitionId((current) => {
      const currentSelectedDefinition = nextDefinitions.find((item) => item.fieldDefinitionId === Number(current));
      const isCurrentOptionTarget = currentSelectedDefinition?.fieldType === 6 && currentSelectedDefinition.sharedChoiceSetId == null;
      if (current && isCurrentOptionTarget) {
        return current;
      }

      const firstSelectable = nextDefinitions.find((item) => item.fieldType === 6 && item.sharedChoiceSetId == null);
      return firstSelectable ? String(firstSelectable.fieldDefinitionId) : '';
    });
  }, [selectedContentGroupId]);

  useEffect(() => {
    void loadDefinitions().catch((loadError) => {
      setError(getGameManagementErrorMessage(loadError, { fallback: resources.gameManagement.errors.detailLoad }));
    });
  }, [loadDefinitions]);

  const selectedDefinition = useMemo(
    () => definitions.find((item) => item.fieldDefinitionId === Number(selectedFieldDefinitionId)) ?? null,
    [definitions, selectedFieldDefinitionId],
  );

  const selectedCatalogDefinitions = useMemo(
    () => catalogDefinitions.filter((item) => !item.isDeleted && selectedCatalogDefinitionKeys.includes(String(item.id))),
    [catalogDefinitions, selectedCatalogDefinitionKeys],
  );

  const availableGameSoftwareCategories = useMemo(
    () => lookups?.gameSoftwareContentGroups.filter((item) => !item.isDeleted) ?? [],
    [lookups],
  );

  const selectedDefinitions = useMemo(() => (
    definitions.filter((item) => selectedDefinitionKeys.includes(String(item.fieldDefinitionId)))
  ), [definitions, selectedDefinitionKeys]);

  const assignmentTargets = useMemo(() => (
    catalogDefinitions.filter((item) => assignmentTargetIds.includes(item.id) && !item.isDeleted)
  ), [assignmentTargetIds, catalogDefinitions]);

  const assignmentTargetsAreAlreadyAssigned = useMemo(() => (
    assignmentTargets.length > 0 && assignmentTargets.every((item) => definitions.some((definition) => definition.fieldDefinitionId === item.id))
  ), [assignmentTargets, definitions]);

  const effectiveSelectedAssignmentContentGroupIds = useMemo(() => (
    getEffectiveAssignmentContentGroupIds(
      assignmentDialogSource,
      selectedAssignmentContentGroupIds,
      assignmentInitialContentGroupIds,
    )
  ), [assignmentDialogSource, assignmentInitialContentGroupIds, selectedAssignmentContentGroupIds]);

  const assignmentSelectableGameSoftwareCategories = useMemo(() => (
    assignmentDialogSource === 'settings'
      ? availableGameSoftwareCategories.filter((item) => assignmentInitialContentGroupIds.includes(String(item.id)))
      : availableGameSoftwareCategories
  ), [assignmentDialogSource, assignmentInitialContentGroupIds, availableGameSoftwareCategories]);

  const assignmentDialogIsUpdateMode = useMemo(() => (
    assignmentDialogSource === 'settings'
    && effectiveSelectedAssignmentContentGroupIds.length === 1
    && effectiveSelectedAssignmentContentGroupIds[0] === selectedContentGroupId
    && assignmentTargetsAreAlreadyAssigned
  ), [assignmentDialogSource, assignmentTargetsAreAlreadyAssigned, effectiveSelectedAssignmentContentGroupIds, selectedContentGroupId]);

  const assignmentDialogIsUnassignMode = useMemo(() => (
    isAssignmentUnassignMode(assignmentDialogSource, effectiveSelectedAssignmentContentGroupIds.length)
  ), [assignmentDialogSource, effectiveSelectedAssignmentContentGroupIds.length]);

  const bulkDefinitionTargets = useMemo(() => (
    definitions.filter((item) => bulkDefinitionTargetIds.includes(item.fieldDefinitionId) && !item.isDeleted)
  ), [bulkDefinitionTargetIds, definitions]);

  const filteredGameSoftwareMasters = useMemo<GameSoftwareMasterDto[]>(() => {
    if (!lookups || !selectedContentGroupId) {
      return [];
    }

    const selectedCategoryId = Number(selectedContentGroupId);
    return lookups.gameSoftwareMasters.filter((item) => !item.isDeleted && item.contentGroupId === selectedCategoryId);
  }, [lookups, selectedContentGroupId]);

  const filteredGameSoftwareMasterOptions = useMemo(
    () => filteredGameSoftwareMasters.map((item) => ({ value: String(item.id), label: item.name })),
    [filteredGameSoftwareMasters],
  );

  useEffect(() => {
    setSelectedGameSoftwareMasterId((current) => {
      if (filteredGameSoftwareMasters.some((item) => String(item.id) === current)) {
        return current;
      }

      return filteredGameSoftwareMasters[0] ? String(filteredGameSoftwareMasters[0].id) : '';
    });
  }, [filteredGameSoftwareMasters]);

  const loadOptions = useCallback(async () => {
    if (!selectedDefinition || selectedDefinition.fieldType !== 6 || selectedDefinition.sharedChoiceSetId != null) {
      setOptions([]);
      setSelectedOptionKeys([]);
      setOptRowOrder([]);
      setOptReorderDirty(false);
      return;
    }
    const nextOptions = await fetchSaveDataFieldOptions(selectedDefinition.fieldDefinitionId);
    setOptions(nextOptions);
    setSelectedOptionKeys([]);
    setOptRowOrder(nextOptions.filter((item) => !item.isDeleted).map((item) => item.id));
    setOptReorderDirty(false);
  }, [selectedDefinition]);

  const selectedOptions = useMemo(() => (
    options.filter((item) => selectedOptionKeys.includes(String(item.id)))
  ), [options, selectedOptionKeys]);

  useEffect(() => {
    void loadOptions().catch((loadError) => {
      setError(getGameManagementErrorMessage(loadError, { fallback: resources.gameManagement.errors.detailLoad }));
    });
  }, [loadOptions]);

  const loadOverrides = useCallback(async () => {
    if (!selectedGameSoftwareMasterId) {
      setOverrideDefinitions([]);
      setOverrides([]);
      setResolvedSchema(null);
      return;
    }

    const gameSoftwareMaster = filteredGameSoftwareMasters.find((item) => item.id === Number(selectedGameSoftwareMasterId));
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
  }, [filteredGameSoftwareMasters, selectedGameSoftwareMasterId]);

  useEffect(() => {
    void loadOverrides().catch((loadError) => {
      setError(getGameManagementErrorMessage(loadError, { fallback: resources.gameManagement.errors.detailLoad }));
    });
  }, [loadOverrides]);

  const formatFieldTypeLabel = useCallback((fieldType: SaveDataFieldType, sharedChoiceSetId: number | null | undefined) => {
    const choiceSetLabel = sharedChoiceSetId != null
      ? choiceSets.find((cs) => cs.id === sharedChoiceSetId)?.label ?? `ID:${sharedChoiceSetId}`
      : null;

    return SAVE_DATA_FIELD_TYPE_LABELS[fieldType] + (choiceSetLabel ? formatText(texts.common.sharedChoiceSetBadge, { label: choiceSetLabel }) : '');
  }, [choiceSets, texts.common.sharedChoiceSetBadge]);

  const definitionRows = useMemo<DefinitionRow[]>(() => definitions.map((item) => {
    return {
      id: item.fieldDefinitionId,
      fieldKey: item.fieldKey,
      label: item.label,
      fieldType: formatFieldTypeLabel(item.fieldType, item.sharedChoiceSetId),
      displayOrder: item.displayOrder,
      required: item.isRequired ? texts.statuses.required : texts.statuses.optional,
      status: item.isDeleted ? texts.statuses.deleted : texts.statuses.active,
      actions: '',
    };
  }), [definitions, formatFieldTypeLabel, texts.statuses.active, texts.statuses.deleted, texts.statuses.optional, texts.statuses.required]);

  const catalogRows = useMemo<CatalogRow[]>(() => {
    return [...catalogDefinitions].sort((left, right) => {
      const compareResult = normalizeFieldKeyForComparison(left.fieldKey).localeCompare(normalizeFieldKeyForComparison(right.fieldKey), 'ja');
      if (compareResult !== 0) {
        return compareResult;
      }

      return left.id - right.id;
    }).map((item) => {
      return {
        id: item.id,
        fieldKey: item.fieldKey,
        label: item.label,
        fieldType: formatFieldTypeLabel(item.fieldType, item.sharedChoiceSetId),
        status: item.isDeleted ? texts.statuses.deleted : texts.statuses.active,
        actions: '',
      };
    });
  }, [catalogDefinitions, formatFieldTypeLabel, texts.statuses.active, texts.statuses.deleted]);

  const optionRows = useMemo<OptionRow[]>(() => options.map((item) => ({
    id: item.id,
    optionKey: item.optionKey,
    label: item.label,
    displayOrder: item.displayOrder,
    status: item.isDeleted ? texts.statuses.deleted : texts.statuses.active,
    actions: '',
  })), [options, texts.statuses.active, texts.statuses.deleted]);

  const overrideRows = useMemo<OverrideRow[]>(() => overrideDefinitions.map((field) => {
    const override = overrides.find((candidate) => candidate.fieldDefinitionId === field.fieldDefinitionId) ?? null;
    return {
      id: field.fieldDefinitionId,
      fieldKey: field.fieldKey,
      baseLabel: field.label,
      fieldType: SAVE_DATA_FIELD_TYPE_LABELS[field.fieldType],
      overrideLabel: override?.overrideLabel ?? texts.statuses.inherit,
      required: override?.overrideIsRequired == null ? (field.isRequired ? texts.statuses.inheritRequired : texts.statuses.inheritOptional) : override.overrideIsRequired ? texts.statuses.overrideRequired : texts.statuses.overrideOptional,
      disabled: override?.isDisabled ? texts.statuses.disabled : texts.statuses.active,
      status: override ? texts.statuses.overrideExists : texts.statuses.baseOnly,
      actions: '',
    };
  }), [overrideDefinitions, overrides, texts.statuses.active, texts.statuses.baseOnly, texts.statuses.disabled, texts.statuses.inherit, texts.statuses.inheritOptional, texts.statuses.inheritRequired, texts.statuses.overrideExists, texts.statuses.overrideOptional, texts.statuses.overrideRequired]);

  const schemaPreviewRows = useMemo<SchemaPreviewRow[]>(() => (resolvedSchema?.fields ?? []).map((field, index) => ({
    id: index,
    label: field.label,
    fieldKey: field.fieldKey,
    fieldType: SAVE_DATA_FIELD_TYPE_LABELS[field.fieldType],
    required: field.isRequired ? texts.statuses.required : texts.statuses.optional,
    disabled: field.isDisabled ? texts.statuses.disabled : texts.statuses.active,
  })), [resolvedSchema, texts.statuses.active, texts.statuses.disabled, texts.statuses.optional, texts.statuses.required]);

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

  const closeAssignDialog = useCallback(() => {
    setAssignDialogOpen(false);
    setAssignDialogError(null);
    setAssignDialogSuccess(null);
    setAssignmentDialogSource('catalog');
    setAssignmentTargetIds([]);
    setAssignmentInitialContentGroupIds([]);
    setSelectedAssignmentContentGroupIds([]);
    setAssignmentFormState(createEmptyAssignmentFormState());
  }, []);

  const openAssignDialog = useCallback((targetIds?: number[], initialState?: AssignmentFormState, initialContentGroupIds?: string[], source: AssignmentDialogSource = 'catalog') => {
    const nextContentGroupIds = initialContentGroupIds && initialContentGroupIds.length > 0
      ? [...new Set(initialContentGroupIds)]
      : [];

    const nextTargetIds = targetIds ?? selectedCatalogDefinitions.map((definition) => definition.id);
    if (nextTargetIds.length === 0) {
      setError(texts.messages.selectCatalogToAssign);
      return;
    }

    setError(null);
    setAssignDialogError(null);
    setAssignDialogSuccess(null);
    setAssignmentDialogSource(source);
    setAssignmentTargetIds(nextTargetIds);
    setAssignmentInitialContentGroupIds(nextContentGroupIds);
    setSelectedAssignmentContentGroupIds(nextContentGroupIds);
    setAssignmentFormState(initialState ?? createEmptyAssignmentFormState());
    setAssignDialogOpen(true);
  }, [selectedCatalogDefinitions, texts.messages.selectCatalogToAssign]);

  const openAssignmentSettingsDialog = useCallback((definition: SaveDataFieldDefinitionAssignmentDto) => {
    openAssignDialog([definition.fieldDefinitionId], {
      isRequired: definition.isRequired,
      preserveExistingIsRequired: false,
    }, [String(definition.contentGroupId)], 'settings');
  }, [openAssignDialog]);

  const reloadAssignmentRelatedData = useCallback(async (targetContentGroupIds: number[]) => {
    const currentOverrideContentGroupId = lookups?.gameSoftwareMasters.find((item) => item.id === Number(selectedGameSoftwareMasterId))?.contentGroupId ?? null;
    const reloadTasks: Array<Promise<void>> = [];

    if (targetContentGroupIds.includes(Number(selectedContentGroupId))) {
      reloadTasks.push(loadDefinitions());
    }

    if (currentOverrideContentGroupId != null && targetContentGroupIds.includes(currentOverrideContentGroupId)) {
      reloadTasks.push(loadOverrides());
    }

    await Promise.all(reloadTasks);
  }, [loadDefinitions, loadOverrides, lookups, selectedContentGroupId, selectedGameSoftwareMasterId]);

  const openCreateDefinitionDialog = useCallback(() => {
    setEditingDefinition(null);
    setCloneSourceDefinition(null);
    setDefinitionFormState(createEmptyDefinitionFormState());
    setDefinitionDialogOpen(true);
  }, []);

  const openEditDefinitionDialog = useCallback((definition: SaveDataFieldDefinitionDto | SaveDataFieldDefinitionAssignmentDto) => {
    setEditingDefinition(toDefinitionDto(definition));
    setCloneSourceDefinition(null);
    setDefinitionFormState(createDefinitionFormState(toDefinitionDto(definition)));
    setDefinitionDialogOpen(true);
  }, []);

  const openCloneDefinitionDialog = useCallback((definition: SaveDataFieldDefinitionDto) => {
    setEditingDefinition(null);
    setCloneSourceDefinition(definition);
    setDefinitionFormState(createDefinitionFormState(definition));
    setDefinitionDialogOpen(true);
  }, []);

  const closeBulkDefinitionTypeDialog = useCallback(() => {
    setBulkDefinitionTypeDialogOpen(false);
    setBulkDefinitionTypeDialogError(null);
    setBulkDefinitionTypeDialogSuccess(null);
    setBulkDefinitionTypeFormState(createEmptyBulkDefinitionTypeFormState());
    setBulkDefinitionTargetIds([]);
  }, []);

  const openBulkDefinitionTypeDialog = useCallback(() => {
    const targetDefinitions = selectedDefinitions.filter((item) => !item.isDeleted);
    const firstDefinition = targetDefinitions[0] ?? null;
    setBulkDefinitionTypeDialogError(null);
    setBulkDefinitionTypeDialogSuccess(null);
    setBulkDefinitionTargetIds(targetDefinitions.map((item) => item.fieldDefinitionId));
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

  const openOverrideDialog = useCallback((field: SaveDataFieldDefinitionAssignmentDto) => {
    const override = overrides.find((candidate) => candidate.fieldDefinitionId === field.fieldDefinitionId) ?? null;
    setOverrideDialogError(null);
    setOverrideDialogSuccess(null);
    setOverrideTargetField(field);
    setEditingOverride(override);
    setOverrideFormState(createOverrideFormState(override));
    setOverrideDialogOpen(true);
  }, [overrides]);

  const handleSaveDefinition = useCallback(async (afterSave: 'close' | 'continue' = 'close') => {
    setSuccess(null);

    if (!definitionFormState.fieldKey.trim() || !definitionFormState.label.trim()) {
      setError(texts.messages.definitionRequiredFields);
      return;
    }

    const normalizedFieldKey = normalizeFieldKeyForComparison(definitionFormState.fieldKey);
    const duplicatedDefinition = catalogDefinitions.find((item) => (
      normalizeFieldKeyForComparison(item.fieldKey) === normalizedFieldKey
      && item.id !== editingDefinition?.id
    ));
    if (duplicatedDefinition) {
      setError(texts.messages.duplicateFieldKey);
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
          await updateSaveDataFieldDefinition(
            editingDefinition.id,
            createDefinitionUpdateRequestFromForm(definitionFormState),
          );
        } else {
          createdDefinitionId = await createSaveDataFieldDefinition(createDefinitionCreateRequest(definitionFormState));
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

              const baseMessage = getGameManagementErrorMessage(cloneError, { fallback: resources.gameManagement.errors.clone });
              if (rollbackFailures.length > 0) {
                throw new Error(formatText(texts.messages.cloneRollbackFailed, { baseMessage, rollbackFailures: rollbackFailures.join(', ') }));
              }
              throw new Error(formatText(texts.messages.cloneRollbackSucceeded, { baseMessage }));
            }
          }
        }
      }, editingDefinition ? texts.messages.saveDefinitionLoading : isCloningDefinition ? texts.messages.cloneDefinitionLoading : texts.messages.saveDefinitionLoading);

      await Promise.all([loadDefinitions(), loadCatalogDefinitions(), loadOverrides()]);

      if (continueCreating) {
        setEditingDefinition(null);
        setCloneSourceDefinition(null);
        setDefinitionFormState(createContinueDefinitionFormState(definitionFormState));
        setSuccess(texts.messages.createDefinitionContinueSuccess);
        focusFirstField(definitionDialogBodyRef.current);
      } else if (editingDefinition) {
        closeDefinitionDialog();
        setSuccess(texts.messages.updateDefinitionSuccess);
      } else if (isCloningDefinition) {
        closeDefinitionDialog();
        if (shouldCloneOptions) {
          setSuccess(texts.messages.cloneDefinitionWithOptionsSuccess);
        } else {
          setSuccess(texts.messages.cloneDefinitionSuccess);
        }
      } else {
        closeDefinitionDialog();
        setSuccess(texts.messages.createDefinitionSuccess);
      }
    } catch (saveError) {
      setError(getSchemaManagerErrorMessage(saveError, resources.gameManagement.errors.save, texts.messages));
    }
  }, [catalogDefinitions, cloneSourceDefinition, closeDefinitionDialog, definitionFormState, editingDefinition, focusFirstField, isCloningDefinition, loadCatalogDefinitions, loadDefinitions, loadOverrides, startLoading, texts.messages]);

  const handleDeleteDefinition = useCallback(async (definition: SaveDataFieldDefinitionDto) => {
    if (!window.confirm(formatText(texts.messages.deleteDefinitionConfirm, { label: definition.label }))) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await startLoading(async () => {
        await deleteSaveDataFieldDefinition(definition.id);
      }, texts.messages.deleteDefinitionLoading);
      setSuccess(texts.messages.deleteDefinitionSuccess);
      await Promise.all([loadDefinitions(), loadCatalogDefinitions(), loadOverrides()]);
    } catch (deleteError) {
      setError(getGameManagementErrorMessage(deleteError, { fallback: resources.gameManagement.errors.delete }));
    }
  }, [loadCatalogDefinitions, loadDefinitions, loadOverrides, startLoading, texts.messages]);

  const handleSaveAssignment = useCallback(async () => {
    setAssignDialogSuccess(null);

    const unassignMode = isAssignmentUnassignMode(assignmentDialogSource, effectiveSelectedAssignmentContentGroupIds.length);

    if (!unassignMode && effectiveSelectedAssignmentContentGroupIds.length === 0) {
      setAssignDialogError(texts.messages.gameSoftwareCategoryRequired);
      return;
    }

    if (assignmentTargets.length === 0) {
      setAssignDialogError(texts.messages.noSchemaToAssign);
      return;
    }

    try {
      if (unassignMode) {
        const targetContentGroupId = Number(selectedContentGroupId);
        if (!targetContentGroupId) {
          setAssignDialogError(texts.messages.gameSoftwareCategoryRequired);
          return;
        }

        const failedDefinitions: string[] = [];
        let firstDeleteError: unknown = null;
        setAssignDialogError(null);
        setAssignDialogSuccess(null);

        await startLoading(async () => {
          for (const definition of assignmentTargets) {
            try {
              await deleteSaveDataFieldDefinitionAssignment(targetContentGroupId, definition.id);
            } catch (deleteError) {
              firstDeleteError ??= deleteError;
              failedDefinitions.push(`${definition.label} (${definition.fieldKey})`);
            }
          }
        }, texts.messages.deleteAssignmentLoading);

        await reloadAssignmentRelatedData([targetContentGroupId]);

        const deletedCount = assignmentTargets.length - failedDefinitions.length;
        if (deletedCount > 0) {
          setAssignDialogSuccess(formatText(texts.messages.deleteAssignmentSuccess, { schemaCount: deletedCount }));
        }

        if (failedDefinitions.length > 0) {
          const reason = getAssignmentOperationErrorMessage(firstDeleteError, resources.gameManagement.errors.delete, texts.messages);
          setAssignDialogError(formatText(texts.messages.assignmentDeletePartialFailure, {
            reason,
            failedSchemas: failedDefinitions.join('、'),
          }));
        }

        return;
      }

      const payload = buildAssignmentRequest({
        ...assignmentFormState,
        isRequired: resolveAssignmentRequiredValue(assignmentFormState, assignmentFormState.isRequired),
        preserveExistingIsRequired: false,
      });
      const targetContentGroupIds = effectiveSelectedAssignmentContentGroupIds.map(Number);

      if (assignmentDialogSource === 'catalog') {
        const categoryAssignments = await Promise.all(targetContentGroupIds.map(async (contentGroupId) => ({
          contentGroupId,
          definitions: await fetchSaveDataFieldDefinitions(contentGroupId),
        })));
        const assignmentPlan = buildCatalogAssignmentPlan(
          targetContentGroupIds,
          assignmentTargets.map((definition) => definition.id),
          new Map(categoryAssignments.map(({ contentGroupId, definitions }) => [
            contentGroupId,
            definitions.map((definition) => definition.fieldDefinitionId),
          ])),
        );

        if (assignmentPlan.addedAssignmentCount === 0) {
          setAssignDialogError(null);
          setAssignDialogSuccess(formatText(texts.messages.createAssignmentSuccess, {
            addedCount: 0,
            skippedCount: assignmentPlan.skippedAssignmentCount,
            contentGroupCount: targetContentGroupIds.length,
          }));
          return;
        }

        let firstSaveError: unknown = null;
        const failedContentGroups = new Set<string>();
        let successfulAssignmentCount = 0;
        setAssignDialogError(null);
        setAssignDialogSuccess(null);
        await startLoading(async () => {
          for (const group of assignmentPlan.groups) {
            for (const definitionId of group.definitionIdsToAssign) {
              try {
                await upsertSaveDataFieldDefinitionAssignment(group.contentGroupId, definitionId, payload);
                successfulAssignmentCount += 1;
              } catch (groupSaveError) {
                firstSaveError ??= groupSaveError;
                const contentGroupName = lookups?.gameSoftwareContentGroups.find((item) => item.id === group.contentGroupId)?.name ?? `ID:${group.contentGroupId}`;
                failedContentGroups.add(contentGroupName);
              }
            }
          }
        }, texts.messages.assignLoading);

        await reloadAssignmentRelatedData(targetContentGroupIds);

        if (successfulAssignmentCount > 0 || assignmentPlan.skippedAssignmentCount > 0) {
          setAssignDialogSuccess(formatText(texts.messages.createAssignmentSuccess, {
            addedCount: successfulAssignmentCount,
            skippedCount: assignmentPlan.skippedAssignmentCount,
            contentGroupCount: targetContentGroupIds.length,
          }));
        }

        if (failedContentGroups.size > 0) {
          const reason = getAssignmentOperationErrorMessage(firstSaveError, resources.gameManagement.errors.save, texts.messages);
          setAssignDialogError(formatText(texts.messages.assignmentPartialFailure, {
            reason,
            failedContentGroups: [...failedContentGroups].join('、'),
          }));
        }

        return;
      }

      const failedContentGroups = new Set<string>();
      let successfulAssignmentCount = 0;
      let failedAssignmentCount = 0;
      let firstSaveError: unknown = null;
      setAssignDialogError(null);
      setAssignDialogSuccess(null);
      await startLoading(async () => {
        for (const contentGroupId of targetContentGroupIds) {
          for (const definition of assignmentTargets) {
            try {
              const currentAssignment = definitions.find((item) => item.contentGroupId === contentGroupId && item.fieldDefinitionId === definition.id);
              const nextPayload = buildAssignmentRequest({
                ...assignmentFormState,
                isRequired: resolveAssignmentRequiredValue(assignmentFormState, currentAssignment?.isRequired ?? assignmentFormState.isRequired),
                preserveExistingIsRequired: false,
              });
              await upsertSaveDataFieldDefinitionAssignment(contentGroupId, definition.id, nextPayload);
              successfulAssignmentCount += 1;
            } catch (groupSaveError) {
              failedAssignmentCount += 1;
              firstSaveError ??= groupSaveError;
              const contentGroupName = lookups?.gameSoftwareContentGroups.find((item) => item.id === contentGroupId)?.name ?? `ID:${contentGroupId}`;
              failedContentGroups.add(contentGroupName);
            }
          }
        }
      }, texts.messages.assignLoading);
      await reloadAssignmentRelatedData(targetContentGroupIds);

      if (successfulAssignmentCount > 0) {
        setAssignDialogSuccess(
          formatText(texts.messages.updateAssignmentSuccess, {
            updatedCount: successfulAssignmentCount,
            failedCount: failedAssignmentCount,
            contentGroupCount: targetContentGroupIds.length,
          }),
        );
      }

      if (failedContentGroups.size > 0) {
        const reason = getAssignmentOperationErrorMessage(firstSaveError, resources.gameManagement.errors.save, texts.messages);
        setAssignDialogError(formatText(texts.messages.assignmentPartialFailure, {
          reason,
          failedContentGroups: [...failedContentGroups].join('、'),
        }));
      }
    } catch (saveError) {
      setAssignDialogError(getAssignmentOperationErrorMessage(saveError, resources.gameManagement.errors.save, texts.messages));
    }
  }, [assignmentDialogSource, assignmentFormState, assignmentTargets, definitions, effectiveSelectedAssignmentContentGroupIds, lookups, reloadAssignmentRelatedData, selectedContentGroupId, startLoading, texts.messages]);

  const handleBulkUpdateDefinitionType = useCallback(async () => {
    const nextFieldType = parseDefinitionFieldType(bulkDefinitionTypeFormState.fieldType);
    const nextSharedChoiceSetId = nextFieldType === 6
      ? parseDefinitionSharedChoiceSetId(bulkDefinitionTypeFormState.sharedChoiceSetId)
      : null;
    const batchItems = buildBulkDefinitionTypeUpdateItems(bulkDefinitionTargets, nextFieldType, nextSharedChoiceSetId);

    if (batchItems.length === 0) {
      setBulkDefinitionTypeDialogError(texts.messages.selectDefinitionForBulkType);
      return;
    }

    try {
      setBulkDefinitionTypeDialogError(null);
      setBulkDefinitionTypeDialogSuccess(null);
      await startLoading(async () => {
        await batchUpdateSaveDataFieldDefinitionTypes(batchItems);
      }, texts.messages.bulkChangeTypeLoading);

      setBulkDefinitionTypeDialogSuccess(formatText(texts.messages.bulkChangeTypeSuccess, { count: batchItems.length }));
      await Promise.all([loadDefinitions(), loadCatalogDefinitions(), loadOverrides()]);
    } catch (saveError) {
      setBulkDefinitionTypeDialogError(getGameManagementErrorMessage(saveError, { fallback: resources.gameManagement.errors.bulkUpdate }));
    }
  }, [bulkDefinitionTargets, bulkDefinitionTypeFormState.fieldType, bulkDefinitionTypeFormState.sharedChoiceSetId, loadCatalogDefinitions, loadDefinitions, loadOverrides, startLoading, texts.messages]);

  const handleSaveOption = useCallback(async (afterSave: 'close' | 'continue' = 'close') => {
    setSuccess(null);

    if (!selectedDefinition) {
      setError(texts.messages.selectDefinitionForOption);
      return;
    }

    if (!optionFormState.optionKey.trim() || !optionFormState.label.trim()) {
      setError(texts.messages.optionRequiredFields);
      return;
    }

    if (!editingOption) {
      const displayOrderError = validateDisplayOrderInput(optionFormState.displayOrder, false, texts.messages);
      if (displayOrderError) {
        setError(displayOrderError);
        return;
      }
    }

    try {
      setError(null);
      const continueCreating = afterSave === 'continue' && !editingOption;
      await startLoading(async () => {
        if (editingOption) {
          await updateSaveDataFieldOption(editingOption.id, createOptionUpdateRequest(optionFormState));
        } else {
          await createSaveDataFieldOption(selectedDefinition.fieldDefinitionId, createOptionRequest(optionFormState));
        }
      }, texts.messages.saveOptionLoading);

      await Promise.all([loadOptions(), loadOverrides()]);
      if (continueCreating) {
        setEditingOption(null);
        setOptionFormState(createEmptyOptionFormState());
        setSuccess(texts.messages.createOptionContinueSuccess);
        focusFirstField(optionDialogBodyRef.current);
      } else {
        setOptionDialogOpen(false);
        setSuccess(editingOption ? texts.messages.updateOptionSuccess : texts.messages.createOptionSuccess);
      }
    } catch (saveError) {
      setError(getGameManagementErrorMessage(saveError, { fallback: resources.gameManagement.errors.save }));
    }
  }, [editingOption, focusFirstField, loadOptions, loadOverrides, optionFormState, selectedDefinition, startLoading, texts.messages]);

  const handleDeleteOption = useCallback(async (option: SaveDataFieldOptionDto) => {
    if (!window.confirm(formatText(texts.messages.deleteOptionConfirm, { label: option.label }))) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await startLoading(async () => {
        await deleteSaveDataFieldOption(option.id);
      }, texts.messages.deleteOptionLoading);
      setSuccess(texts.messages.deleteOptionSuccess);
      await Promise.all([loadOptions(), loadOverrides()]);
    } catch (deleteError) {
      setError(getGameManagementErrorMessage(deleteError, { fallback: resources.gameManagement.errors.delete }));
    }
  }, [loadOptions, loadOverrides, startLoading, texts.messages]);

  // -----------------------------------------------------------------------
  // Definition reorder
  // -----------------------------------------------------------------------

  const defIsSortActive = defSortState !== null;
  const defIsFilterActive = defFilteredCount !== null && defFilteredCount !== definitionRows.length;
  const defReorderEnabled = pageMode === 'edit' && !defIsSortActive && !defIsFilterActive;
  const defReorderDisabledReason = pageMode === 'view'
    ? '編集モードを有効にすると並び替えできます'
    : defIsSortActive
      ? 'ソートを解除すると並び替えできます'
      : defIsFilterActive
        ? 'フィルタを解除すると並び替えできます'
        : undefined;

  const handleDefFilteredDataChange = useCallback((data: Record<string, unknown>[]) => {
    setDefFilteredCount(data.length);
  }, []);

  const handleMoveDefinition = useCallback((id: number, direction: 'up' | 'down') => {
    setDefRowOrder((prev) => {
      if (!prev) return prev;
      const selectedIds = selectedDefinitions
        .filter((item) => !item.isDeleted)
        .map((item) => item.fieldDefinitionId)
        .filter((selectedId) => prev.includes(selectedId));
      const moveIds = selectedDefinitionKeys.includes(String(id)) && selectedIds.length > 0
        ? selectedIds
        : [id];
      const next = moveSelectedItemsByOne(prev, moveIds, direction);
      if (next.every((value, index) => value === prev[index])) {
        return prev;
      }
      setDefReorderDirty(true);
      return next;
    });
  }, [selectedDefinitionKeys, selectedDefinitions]);

  const handleSaveDefReorder = useCallback(async () => {
    if (!defRowOrder || !defReorderDirty || !selectedContentGroupId) return;
    setDefReorderSaving(true);
    try {
      const defMap = new Map(definitions.map((d) => [d.fieldDefinitionId, d]));
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
        }, texts.messages.saveDefinitionReorderLoading);
      }
      setDefReorderDirty(false);
      setSuccess(texts.messages.saveDefinitionReorderSuccess);
      await Promise.all([loadDefinitions(), loadOverrides()]);
    } catch (saveError) {
      await Promise.all([loadDefinitions(), loadOverrides()]);
      setError(getSchemaManagerErrorMessage(saveError, resources.gameManagement.errors.reorder, texts.messages));
    } finally {
      setDefReorderSaving(false);
    }
  }, [defRowOrder, defReorderDirty, selectedContentGroupId, definitions, startLoading, loadDefinitions, loadOverrides, texts.messages]);

  const handleDefRowMove = useCallback((fromIndex: number, toIndex: number) => {
    setDefRowOrder((prev) => {
      if (!prev) return prev;
      const selectedIds = selectedDefinitions
        .filter((item) => !item.isDeleted)
        .map((item) => item.fieldDefinitionId)
        .filter((selectedId) => prev.includes(selectedId));
      const draggedId = prev[fromIndex];
      const moveIds = draggedId !== undefined && selectedDefinitionKeys.includes(String(draggedId)) && selectedIds.length > 1
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
      setDefReorderDirty(true);
      return next;
    });
  }, [selectedDefinitionKeys, selectedDefinitions]);

  // -----------------------------------------------------------------------
  // Option reorder
  // -----------------------------------------------------------------------

  const optIsSortActive = optSortState !== null;
  const optIsFilterActive = optFilteredCount !== null && optFilteredCount !== optionRows.length;
  const optReorderEnabled = pageMode === 'edit' && !optIsSortActive && !optIsFilterActive;
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
      setOptReorderDirty(true);
      return next;
    });
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
          await reorderSaveDataFieldOptions(selectedDefinition.fieldDefinitionId, items);
        }, texts.messages.saveOptionReorderLoading);
      }
      setOptReorderDirty(false);
      setSuccess(texts.messages.saveOptionReorderSuccess);
      await Promise.all([loadOptions(), loadOverrides()]);
    } catch (saveError) {
      setError(getGameManagementErrorMessage(saveError, { fallback: resources.gameManagement.errors.reorder }));
    } finally {
      setOptReorderSaving(false);
    }
  }, [optRowOrder, optReorderDirty, selectedDefinition, options, startLoading, loadOptions, loadOverrides, texts.messages]);

  const handleOptRowMove = useCallback((fromIndex: number, toIndex: number) => {
    setOptRowOrder((prev) => {
      if (!prev) return prev;
      const selectedIds = selectedOptions
        .filter((item) => !item.isDeleted)
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
  }, [selectedOptionKeys, selectedOptions]);

  const handleSaveOverride = useCallback(async () => {
    if (!overrideTargetField || !selectedGameSoftwareMasterId) {
      setOverrideDialogError(texts.messages.selectOverrideTarget);
      return;
    }

    try {
      setOverrideDialogError(null);
      setOverrideDialogSuccess(null);
      await startLoading(async () => {
        await upsertSaveDataFieldOverride(
          Number(selectedGameSoftwareMasterId),
          overrideTargetField.fieldDefinitionId,
          createOverrideRequest(overrideFormState),
        );
      }, texts.messages.saveOverrideLoading);
      setOverrideDialogSuccess(editingOverride ? texts.messages.updateOverrideSuccess : texts.messages.createOverrideSuccess);
      await loadOverrides();
    } catch (saveError) {
      setOverrideDialogError(getGameManagementErrorMessage(saveError, { fallback: resources.gameManagement.errors.save }));
    }
  }, [editingOverride, loadOverrides, overrideFormState, overrideTargetField, selectedGameSoftwareMasterId, startLoading, texts.messages]);

  const handleDeleteOverride = useCallback(async (field: SaveDataFieldDefinitionAssignmentDto) => {
    if (!selectedGameSoftwareMasterId) {
      return;
    }

    const override = overrides.find((candidate) => candidate.fieldDefinitionId === field.fieldDefinitionId);
    if (!override) {
      return;
    }

    if (!window.confirm(formatText(texts.messages.deleteOverrideConfirm, { label: field.label }))) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await startLoading(async () => {
        await deleteSaveDataFieldOverride(Number(selectedGameSoftwareMasterId), field.fieldDefinitionId);
      }, texts.messages.deleteOverrideLoading);
      setSuccess(texts.messages.deleteOverrideSuccess);
      await loadOverrides();
    } catch (deleteError) {
      setError(getGameManagementErrorMessage(deleteError, { fallback: resources.gameManagement.errors.delete }));
    }
  }, [loadOverrides, overrides, selectedGameSoftwareMasterId, startLoading, texts.messages]);

  const openCopyDialog = useCallback(() => {
    const targetDefinitions = selectedDefinitions.filter((item) => !item.isDeleted);
    if (targetDefinitions.length === 0) {
      setError(texts.messages.selectAssignmentSettingsTarget);
      return;
    }

    openAssignDialog(
      targetDefinitions.map((item) => item.fieldDefinitionId),
      targetDefinitions.length === 1
        ? {
          isRequired: targetDefinitions[0].isRequired,
          preserveExistingIsRequired: false,
        }
        : createAssignmentFormStateFromAssignments(targetDefinitions),
      selectedContentGroupId ? [selectedContentGroupId] : undefined,
      'settings',
    );
  }, [openAssignDialog, selectedContentGroupId, selectedDefinitions, texts.messages.selectAssignmentSettingsTarget]);

  const catalogRowsWithActions = useMemo(() => catalogRows.map((row) => {
    const definition = catalogDefinitions.find((item) => item.id === row.id)!;
    return {
      ...row,
      actions: '',
      actionContent: definition,
    };
  }), [catalogDefinitions, catalogRows]);

  const catalogTableColumns = useMemo<DataTableColumn<typeof catalogRowsWithActions[number]>[]>(() => [
    ...catalogColumns,
    {
      key: 'actions',
      header: texts.common.actionsColumn,
      render: (_, row) => {
        const definition = catalogDefinitions.find((item) => item.id === row.id)!;

        if (definition.isDeleted) {
          return <span className="text-xs text-zinc-400">{texts.statuses.deleted}</span>;
        }

        return (
          <div className="flex flex-wrap gap-2">
            <CustomButton onClick={() => openEditDefinitionDialog(definition)}>
              {pageMode === 'view' ? texts.common.detail : texts.common.edit}
            </CustomButton>
            {pageMode === 'edit' ? (
              <>
                <CustomButton onClick={() => openAssignDialog([definition.id])}>{texts.buttons.assign}</CustomButton>
                <CustomButton onClick={() => openCloneDefinitionDialog(definition)}>{texts.common.clone}</CustomButton>
                <CustomButton variant="ghost" onClick={() => void handleDeleteDefinition(definition)}>{texts.common.delete}</CustomButton>
              </>
            ) : null}
          </div>
        );
      },
    },
  ], [catalogDefinitions, catalogColumns, handleDeleteDefinition, openAssignDialog, openCloneDefinitionDialog, openEditDefinitionDialog, pageMode, texts.buttons.assign, texts.common.actionsColumn, texts.common.clone, texts.common.delete, texts.common.detail, texts.common.edit, texts.statuses.deleted]);

  const definitionRowsWithActions = useMemo(() => definitionRows.map((row) => {
    const definition = definitions.find((item) => item.fieldDefinitionId === row.id)!;
    return {
      ...row,
      actions: '',
      actionContent: definition,
    };
  }), [definitionRows, definitions]);

  const sortedDefinitionRows = useMemo(() => {
    return mergeOrderedRows(definitionRowsWithActions, defRowOrder, (row) => {
      const definition = definitions.find((item) => item.fieldDefinitionId === row.id);
      return definition?.isDeleted ?? false;
    });
  }, [definitionRowsWithActions, defRowOrder, definitions]);

  const optionRowsWithActions = useMemo(() => optionRows.map((row) => {
    const option = options.find((item) => item.id === row.id)!;
    return {
      ...row,
      actions: '',
      actionContent: option,
    };
  }), [optionRows, options]);

  const sortedOptionRows = useMemo(() => {
    return mergeOrderedRows(optionRowsWithActions, optRowOrder, (row) => {
      const option = options.find((item) => item.id === row.id);
      return option?.isDeleted ?? false;
    });
  }, [optionRowsWithActions, optRowOrder, options]);

  const definitionTableColumns = useMemo<DataTableColumn<typeof sortedDefinitionRows[number]>[]>(() => [
    ...definitionColumns,
    {
      key: 'actions',
      header: texts.common.actionsColumn,
      render: (_, row) => {
        const definition = definitions.find((item) => item.fieldDefinitionId === row.id)!;
        const idx = defRowOrder?.indexOf(row.id) ?? -1;
        return (
          <div className="flex flex-wrap gap-2">
            <RowMoveButtons
              isFirst={idx <= 0}
              isLast={idx === (defRowOrder?.length ?? 0) - 1}
              disabled={!defReorderEnabled || defReorderSaving}
              onMoveUp={() => handleMoveDefinition(row.id, 'up')}
              onMoveDown={() => handleMoveDefinition(row.id, 'down')}
            />
            <CustomButton onClick={() => openEditDefinitionDialog(definition)}>
              {pageMode === 'view' ? texts.buttons.definitionDetail : texts.buttons.definitionEdit}
            </CustomButton>
            {!definition.isDeleted && pageMode === 'edit' ? (
              <CustomButton onClick={() => openAssignmentSettingsDialog(definition)}>{texts.buttons.assignmentSettings}</CustomButton>
            ) : null}
            {definition.fieldType === 6 && definition.sharedChoiceSetId == null ? (
              <CustomButton onClick={() => setSelectedFieldDefinitionId(String(definition.fieldDefinitionId))}>{texts.buttons.manageOptions}</CustomButton>
            ) : null}
          </div>
        );
      },
    },
  ], [defReorderEnabled, defReorderSaving, defRowOrder, definitionColumns, definitions, handleMoveDefinition, openAssignmentSettingsDialog, openEditDefinitionDialog, pageMode, texts.buttons.assignmentSettings, texts.buttons.definitionDetail, texts.buttons.definitionEdit, texts.buttons.manageOptions, texts.common.actionsColumn]);

  const optionTableColumns = useMemo<DataTableColumn<typeof sortedOptionRows[number]>[]>(() => [
    ...optionColumns,
    {
      key: 'actions',
      header: texts.common.actionsColumn,
      render: (_, row) => {
        const option = options.find((item) => item.id === row.id)!;
        const idx = optRowOrder?.indexOf(row.id) ?? -1;
        return (
          <div className="flex flex-wrap gap-2">
            <RowMoveButtons
              isFirst={idx <= 0}
              isLast={idx === (optRowOrder?.length ?? 0) - 1}
              disabled={!optReorderEnabled || optReorderSaving}
              onMoveUp={() => handleMoveOption(row.id, 'up')}
              onMoveDown={() => handleMoveOption(row.id, 'down')}
            />
            <CustomButton onClick={() => openEditOptionDialog(option)}>
              {pageMode === 'view' ? texts.common.detail : texts.common.edit}
            </CustomButton>
            {pageMode === 'edit' ? (
              <CustomButton variant="ghost" onClick={() => void handleDeleteOption(option)}>{texts.common.delete}</CustomButton>
            ) : null}
          </div>
        );
      },
    },
  ], [handleDeleteOption, handleMoveOption, openEditOptionDialog, optReorderEnabled, optReorderSaving, optRowOrder, optionColumns, options, pageMode, texts.common.actionsColumn, texts.common.delete, texts.common.detail, texts.common.edit]);

  const overrideRowsWithActions = useMemo(() => overrideRows.map((row) => {
    const field = overrideDefinitions.find((item) => item.fieldDefinitionId === row.id)!;
    const override = overrides.find((item) => item.fieldDefinitionId === row.id) ?? null;
    return {
      ...row,
      actions: '',
      actionContent: { field, override },
    };
  }), [overrideDefinitions, overrideRows, overrides]);

  const selectedGameSoftwareMaster = useMemo(
    () => filteredGameSoftwareMasters.find((item) => item.id === Number(selectedGameSoftwareMasterId)) ?? null,
    [filteredGameSoftwareMasters, selectedGameSoftwareMasterId],
  );

  const canManageOptions = selectedDefinition?.fieldType === 6 && selectedDefinition.sharedChoiceSetId == null;
  const hasCatalogSelection = selectedCatalogDefinitions.length > 0;
  const selectedAssignedDefinitionCount = selectedDefinitions.filter((item) => !item.isDeleted).length;
  const activeDefinitionCount = definitions.filter((item) => !item.isDeleted).length;
  const activeOptionCount = options.filter((item) => !item.isDeleted).length;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(241,245,249,0.95))] p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.95),rgba(9,9,11,0.95))] dark:ring-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{texts.hero.eyebrow}</p>
              <CustomHeader level={1}>{texts.hero.title}</CustomHeader>
              <p className="max-w-4xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {texts.hero.description}
              </p>
            </div>
            <PageModeToggle mode={pageMode} onChange={setPageMode} />
          </div>
        </div>

        {error && !inlineDialogMessageVisible ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
        {success && !inlineDialogMessageVisible ? <CustomMessageArea variant="success">{success}</CustomMessageArea> : null}

        {pageLoading || !lookups ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500">{texts.common.loadingPage}</p>
          </section>
        ) : (
          <>
            <SectionCard
              title={texts.sections.catalog.title}
              description={texts.sections.catalog.description}
              actions={
                <>
                  {pageMode === 'edit' ? (
                    <CustomButton variant="accent" onClick={openCreateDefinitionDialog}>{texts.buttons.addGlobalDefinition}</CustomButton>
                  ) : null}
                  {pageMode === 'edit' ? (
                    <CustomButton variant="accent" disabled={!hasCatalogSelection} onClick={() => openAssignDialog()}>
                      {texts.buttons.assignSelectedSchemas}
                    </CustomButton>
                  ) : null}
                </>
              }
            >
              <div className="space-y-4">
                {selectedCatalogDefinitions.length > 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-300">
                    {formatText(texts.sections.catalog.selectionSummary, { count: selectedCatalogDefinitions.length })}
                  </p>
                ) : null}
                <DataTable
                  columns={catalogTableColumns}
                  data={catalogRowsWithActions}
                  height={DATA_TABLE_DEFAULT_PAGE_HEIGHT}
                  rowKey="id"
                  selectable
                  selectedKeys={selectedCatalogDefinitionKeys}
                  onSelectionChange={setSelectedCatalogDefinitionKeys}
                  emptyMessage={texts.sections.catalog.emptyMessage}
                  paginated
                />
              </div>
            </SectionCard>

            <SectionCard
              title={texts.sections.assignedDefinitions.title}
              description={texts.sections.assignedDefinitions.description}
              actions={
                <>
                  <SelectField
                    id="content-group"
                    label={texts.form.gameSoftwareCategoryLabel}
                    value={selectedContentGroupId}
                    placeholder={texts.common.selectPrompt}
                    options={availableGameSoftwareCategories.map((item) => ({ value: String(item.id), label: item.name }))}
                    onChange={setSelectedContentGroupId}
                  />
                  {pageMode === 'edit' ? (
                    <>
                      <CustomButton disabled={selectedAssignedDefinitionCount === 0} onClick={openCopyDialog}>{texts.buttons.updateAssignmentSettings}</CustomButton>
                      <CustomButton disabled={selectedAssignedDefinitionCount === 0} onClick={openBulkDefinitionTypeDialog}>{texts.buttons.bulkChangeType}</CustomButton>
                    </>
                  ) : null}
                  <CustomButton variant="accent" disabled={!defReorderDirty || defReorderSaving || pageMode === 'view' || activeDefinitionCount <= 1} onClick={() => void handleSaveDefReorder()}>{texts.buttons.saveDefinitionReorder}</CustomButton>
                </>
              }
            >
              <div className="space-y-4">
                <div className="flex items-center justify-end gap-3 text-sm">
                  {selectedDefinitions.length > 0 && defReorderEnabled ? (
                    <span className="text-xs text-zinc-500 dark:text-zinc-300">
                      {formatText(texts.sections.assignedDefinitions.selectionSummary, { count: selectedDefinitions.length })}（{texts.sections.assignedDefinitions.reorderSelectionHelp}）
                    </span>
                  ) : null}
                  {!defReorderEnabled && defReorderDisabledReason && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">{defReorderDisabledReason}</span>
                  )}
                </div>
                <DataTable
                  columns={definitionTableColumns}
                  data={sortedDefinitionRows}
                  height={DATA_TABLE_DEFAULT_PAGE_HEIGHT}
                  rowKey="id"
                  selectable
                  selectedKeys={selectedDefinitionKeys}
                  onSelectionChange={setSelectedDefinitionKeys}
                  emptyMessage={texts.sections.assignedDefinitions.emptyMessage}
                  paginated
                  rowReorderEnabled={defReorderEnabled}
                  rowReorderDisabledReason={defReorderDisabledReason}
                  onRowMove={handleDefRowMove}
                  sortState={defSortState}
                  onSortChange={setDefSortState}
                  onFilteredDataChange={handleDefFilteredDataChange}
                />
                {definitions.length > 0 ? (
                  <SelectField
                    id="field-definition"
                    label={texts.form.optionTargetLabel}
                    value={selectedFieldDefinitionId}
                    placeholder={texts.common.selectPrompt}
                    options={definitions
                      .filter((item) => item.fieldType === 6 && item.sharedChoiceSetId == null)
                      .map((item) => ({ value: String(item.fieldDefinitionId), label: `${item.label} (${item.fieldKey})` }))}
                    onChange={setSelectedFieldDefinitionId}
                  />
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title={texts.sections.options.title}
              description={texts.sections.options.description}
              actions={canManageOptions ? (
                <>
                  {pageMode === 'edit' ? (
                    <CustomButton variant="accent" onClick={openCreateOptionDialog}>{texts.buttons.addOption}</CustomButton>
                  ) : null}
                  <CustomButton variant="accent" disabled={!optReorderDirty || optReorderSaving || pageMode === 'view' || activeOptionCount <= 1} onClick={() => void handleSaveOptReorder()}>{texts.buttons.saveOptionReorder}</CustomButton>
                </>
              ) : null}
            >
              {canManageOptions ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-end gap-3 text-sm">
                    {selectedOptions.length > 0 && optReorderEnabled ? (
                      <span className="text-xs text-zinc-500 dark:text-zinc-300">
                        {formatText(texts.sections.options.selectionSummary, { count: selectedOptions.length })}（{texts.sections.assignedDefinitions.reorderSelectionHelp}）
                      </span>
                    ) : null}
                    {!optReorderEnabled && optReorderDisabledReason && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">{optReorderDisabledReason}</span>
                    )}
                  </div>
                  <DataTable
                    key={`options:${selectedDefinition?.fieldDefinitionId ?? 'none'}`}
                    columns={optionTableColumns}
                    data={sortedOptionRows}
                    height={DATA_TABLE_DEFAULT_PAGE_HEIGHT}
                    rowKey="id"
                    selectable
                    selectedKeys={selectedOptionKeys}
                    onSelectionChange={setSelectedOptionKeys}
                    emptyMessage={texts.sections.options.emptyMessage}
                    paginated
                    rowReorderEnabled={optReorderEnabled}
                    rowReorderDisabledReason={optReorderDisabledReason}
                    onRowMove={handleOptRowMove}
                    sortState={optSortState}
                    onSortChange={setOptSortState}
                    onFilteredDataChange={handleOptFilteredDataChange}
                  />
                </div>
              ) : selectedDefinition?.fieldType === 6 && selectedDefinition.sharedChoiceSetId != null ? (
                <p className="text-sm text-zinc-500">{texts.sections.options.sharedChoiceSetInfo}</p>
              ) : (
                <p className="text-sm text-zinc-500">{texts.sections.options.selectSingleSelectInfo}</p>
              )}
            </SectionCard>

            <SectionCard
              title={texts.sections.overrides.title}
              description={texts.sections.overrides.description}
              actions={
                <SelectField
                  id="game-software-master"
                  label={texts.form.gameSoftwareMasterLabel}
                  value={selectedGameSoftwareMasterId}
                  placeholder={texts.common.selectPrompt}
                  options={filteredGameSoftwareMasterOptions}
                  onChange={setSelectedGameSoftwareMasterId}
                />
              }
            >
              {selectedGameSoftwareMaster && !selectedGameSoftwareMaster.contentGroupId ? (
                <p className="text-sm text-zinc-500">{texts.sections.overrides.missingGameSoftwareCategoryInfo}</p>
              ) : (
                <DataTable
                  columns={[
                    ...overrideColumns,
                    {
                      key: 'actions',
                      header: texts.common.actionsColumn,
                      render: (_, row) => {
                        const field = overrideDefinitions.find((item) => item.fieldDefinitionId === row.id)!;
                        const hasOverride = overrides.some((item) => item.fieldDefinitionId === row.id);
                        return (
                          <div className="flex flex-wrap gap-2">
                            <CustomButton onClick={() => openOverrideDialog(field)}>{hasOverride ? texts.common.edit : texts.buttons.createOverride}</CustomButton>
                            {hasOverride ? (
                              <CustomButton variant="ghost" onClick={() => void handleDeleteOverride(field)}>{texts.common.delete}</CustomButton>
                            ) : null}
                          </div>
                        );
                      },
                    },
                  ]}
                  data={overrideRowsWithActions}
                  height={DATA_TABLE_DEFAULT_PAGE_HEIGHT}
                  rowKey="id"
                  emptyMessage={texts.sections.overrides.emptyMessage}
                />
              )}
            </SectionCard>

            <SectionCard
              title={texts.sections.resolvedSchema.title}
              description={texts.sections.resolvedSchema.description}
            >
              <DataTable
                columns={schemaPreviewColumns}
                data={schemaPreviewRows}
                height={DATA_TABLE_DEFAULT_PAGE_HEIGHT}
                rowKey="id"
                emptyMessage={texts.sections.resolvedSchema.emptyMessage}
              />
            </SectionCard>
          </>
        )}

        <Dialog
          open={assignDialogOpen}
          onClose={closeAssignDialog}
          closeDisabled={isPending}
          title={assignmentDialogIsUnassignMode ? texts.dialogs.assignment.unassignTitle : assignmentDialogIsUpdateMode ? texts.dialogs.assignment.updateTitle : texts.dialogs.assignment.createTitle}
          footer={
            <>
              {isPending ? <span role="status" aria-live="polite" className="text-xs text-zinc-500 dark:text-zinc-300">{texts.dialogs.assignment.pendingHint}</span> : null}
              <CustomButton onClick={closeAssignDialog} disabled={isPending}>{texts.common.cancel}</CustomButton>
              <CustomButton variant="accent" disabled={isPending || assignmentTargets.length === 0 || (!assignmentDialogIsUnassignMode && effectiveSelectedAssignmentContentGroupIds.length === 0)} onClick={() => void handleSaveAssignment()}>
                {assignmentDialogIsUnassignMode ? texts.dialogs.assignment.submitUnassign : assignmentDialogIsUpdateMode ? texts.dialogs.assignment.submitUpdate : texts.dialogs.assignment.submitCreate}
              </CustomButton>
            </>
          }
        >
          <div className="space-y-4">
            {assignDialogError ? <CustomMessageArea variant="error">{assignDialogError}</CustomMessageArea> : null}
            {assignDialogSuccess ? <CustomMessageArea variant="success">{assignDialogSuccess}</CustomMessageArea> : null}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <p>
                {assignmentDialogIsUnassignMode
                  ? formatText(texts.dialogs.assignment.unassignSummary, { schemaCount: assignmentTargets.length })
                  : assignmentDialogIsUpdateMode
                  ? formatText(texts.dialogs.assignment.updateSummary, { schemaCount: assignmentTargets.length, contentGroupCount: effectiveSelectedAssignmentContentGroupIds.length })
                  : formatText(texts.dialogs.assignment.createSummary, { schemaCount: assignmentTargets.length, contentGroupCount: effectiveSelectedAssignmentContentGroupIds.length })}
              </p>
              <p>{assignmentDialogIsUnassignMode ? texts.dialogs.assignment.unassignHint : texts.dialogs.assignment.autoAppendHint}</p>
              {assignmentDialogIsUpdateMode && !assignmentDialogIsUnassignMode ? (
                <p>{texts.dialogs.assignment.updateHint}</p>
              ) : null}
              {assignmentDialogSource === 'settings' ? (
                <p>{texts.dialogs.assignment.settingsTargetHint}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <CustomLabel>{texts.form.targetGameSoftwareCategoryLabel}</CustomLabel>
              <div className="grid max-h-52 gap-3 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900 sm:grid-cols-2">
                {assignmentSelectableGameSoftwareCategories.map((item) => {
                  const checked = effectiveSelectedAssignmentContentGroupIds.includes(String(item.id));
                  return (
                    <label key={item.id} className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
                      <CustomCheckBox
                        checked={checked}
                        onChange={(event) => {
                          const nextId = String(item.id);
                          setSelectedAssignmentContentGroupIds((current) => (
                            event.target.checked
                              ? [...current, nextId]
                              : current.filter((value) => value !== nextId)
                          ));
                        }}
                      />
                      <span>{item.name}</span>
                    </label>
                  );
                })}
              </div>
              {!assignmentDialogIsUnassignMode && effectiveSelectedAssignmentContentGroupIds.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">{texts.messages.gameSoftwareCategoryRequired}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <CustomLabel>{texts.form.assignmentTargetLabel}</CustomLabel>
              <ul className="max-h-52 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                {assignmentTargets.map((definition) => (
                  <li key={definition.id} className="py-1 text-zinc-700 dark:text-zinc-200">
                    {definition.label} ({definition.fieldKey})
                  </li>
                ))}
              </ul>
            </div>
            <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-200">
              <CustomCheckBox
                checked={assignmentFormState.isRequired}
                onChange={(event) => setAssignmentFormState((current) => ({
                  ...current,
                  isRequired: event.target.checked,
                  preserveExistingIsRequired: false,
                }))}
              />
              {texts.form.assignmentRequiredLabel}
            </label>
            {assignmentFormState.preserveExistingIsRequired ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-300">{texts.dialogs.assignment.preserveRequiredHint}</p>
            ) : null}
          </div>
        </Dialog>

        <Dialog
          open={definitionDialogOpen}
          onClose={closeDefinitionDialog}
          closeDisabled={isPending}
          title={editingDefinition ? (pageMode === 'view' ? texts.dialogs.definition.viewTitle : texts.dialogs.definition.editTitle) : isCloningDefinition ? texts.dialogs.definition.cloneTitle : texts.dialogs.definition.createTitle}
          footer={
            pageMode === 'view' && editingDefinition ? (
              <>
                <CustomButton onClick={closeDefinitionDialog}>{texts.common.close}</CustomButton>
                <CustomButton variant="accent" onClick={() => setPageMode('edit')}>{texts.buttons.enableEdit}</CustomButton>
              </>
            ) : (
              <>
                {pageMode === 'edit' && editingDefinition ? (
                  <CustomButton onClick={() => setPageMode('view')}>{texts.buttons.backToReadonly}</CustomButton>
                ) : null}
                <CustomButton onClick={closeDefinitionDialog} disabled={isPending}>{texts.common.cancel}</CustomButton>
                {!editingDefinition && !isCloningDefinition ? (
                  <>
                    <CustomButton onClick={() => void handleSaveDefinition('continue')} disabled={isPending}>{texts.buttons.createAndContinue}</CustomButton>
                    <CustomButton variant="accent" onClick={() => void handleSaveDefinition('close')} disabled={isPending}>{texts.buttons.createAndClose}</CustomButton>
                  </>
                ) : (
                  <CustomButton variant="accent" onClick={() => void handleSaveDefinition('close')} disabled={isPending}>{texts.common.save}</CustomButton>
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
                <p>{formatText(texts.dialogs.definition.cloneSourceSummary, { label: cloneSourceDefinition.label, fieldKey: cloneSourceDefinition.fieldKey })}</p>
                <p>{texts.dialogs.definition.duplicateFieldKeyHint}</p>
                {cloneSourceDefinition.fieldType === 6 ? (
                  <p>{texts.dialogs.definition.cloneOptionsHint}</p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2">
              <CustomLabel htmlFor="definition-field-key">{texts.form.fieldKeyLabel}</CustomLabel>
              <CustomTextBox id="definition-field-key" value={definitionFormState.fieldKey} onChange={(event) => setDefinitionFormState((current) => ({ ...current, fieldKey: event.target.value }))} displayOnly={pageMode === 'view' && !!editingDefinition} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="definition-label">{texts.form.definitionLabelLabel}</CustomLabel>
              <CustomTextBox id="definition-label" value={definitionFormState.label} onChange={(event) => setDefinitionFormState((current) => ({ ...current, label: event.target.value }))} displayOnly={pageMode === 'view' && !!editingDefinition} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="definition-description">{texts.form.definitionDescriptionLabel}</CustomLabel>
              <CustomTextArea id="definition-description" value={definitionFormState.description} onChange={(event) => setDefinitionFormState((current) => ({ ...current, description: event.target.value }))} displayOnly={pageMode === 'view' && !!editingDefinition} />
            </div>
            <SelectField id="definition-type" label={texts.form.definitionTypeLabel} value={definitionFormState.fieldType} placeholder={texts.common.selectPrompt} options={FIELD_TYPE_OPTIONS} onChange={(value) => setDefinitionFormState((current) => ({ ...current, fieldType: value, sharedChoiceSetId: value !== '6' ? '' : current.sharedChoiceSetId }))} displayOnly={pageMode === 'view' && !!editingDefinition} />
            {definitionFormState.fieldType === '6' ? (
              <SelectField
                id="definition-shared-choice-set"
                label={texts.form.sharedChoiceSetLabel}
                value={definitionFormState.sharedChoiceSetId}
                placeholder={texts.common.selectPrompt}
                options={choiceSets.filter((cs) => !cs.isDeleted).map((cs) => ({ value: String(cs.id), label: `${cs.label} (${cs.choiceSetKey})` }))}
                onChange={(value) => setDefinitionFormState((current) => ({ ...current, sharedChoiceSetId: value }))}
                displayOnly={pageMode === 'view' && !!editingDefinition}
              />
            ) : null}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <p>{texts.dialogs.definition.assignmentNoticeLine1}</p>
              <p>{texts.dialogs.definition.assignmentNoticeLine2}</p>
            </div>
          </div>
        </Dialog>

        <Dialog
          open={optionDialogOpen}
          onClose={() => setOptionDialogOpen(false)}
          closeDisabled={isPending}
          title={editingOption ? (pageMode === 'view' ? texts.dialogs.option.viewTitle : texts.dialogs.option.editTitle) : texts.dialogs.option.createTitle}
          footer={
            pageMode === 'view' && editingOption ? (
              <>
                <CustomButton onClick={() => setOptionDialogOpen(false)}>{texts.common.close}</CustomButton>
                <CustomButton variant="accent" onClick={() => setPageMode('edit')}>{texts.buttons.enableEdit}</CustomButton>
              </>
            ) : (
              <>
                {pageMode === 'edit' && editingOption ? (
                  <CustomButton onClick={() => setPageMode('view')}>{texts.buttons.backToReadonly}</CustomButton>
                ) : null}
                <CustomButton onClick={() => setOptionDialogOpen(false)} disabled={isPending}>{texts.common.cancel}</CustomButton>
                {!editingOption ? (
                  <>
                    <CustomButton onClick={() => void handleSaveOption('continue')} disabled={isPending}>{texts.buttons.createAndContinue}</CustomButton>
                    <CustomButton variant="accent" onClick={() => void handleSaveOption('close')} disabled={isPending}>{texts.buttons.createAndClose}</CustomButton>
                  </>
                ) : (
                  <CustomButton variant="accent" onClick={() => void handleSaveOption('close')} disabled={isPending}>{texts.common.save}</CustomButton>
                )}
              </>
            )
          }
        >
          <div ref={optionDialogBodyRef} className="space-y-4">
            {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
            {success ? <CustomMessageArea variant="success">{success}</CustomMessageArea> : null}
            <div className="space-y-2">
              <CustomLabel htmlFor="option-key">{texts.form.optionKeyLabel}</CustomLabel>
              <CustomTextBox id="option-key" value={optionFormState.optionKey} onChange={(event) => setOptionFormState((current) => ({ ...current, optionKey: event.target.value }))} displayOnly={pageMode === 'view' && !!editingOption} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="option-label">{texts.form.optionLabelLabel}</CustomLabel>
              <CustomTextBox id="option-label" value={optionFormState.label} onChange={(event) => setOptionFormState((current) => ({ ...current, label: event.target.value }))} displayOnly={pageMode === 'view' && !!editingOption} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="option-description">{texts.form.optionDescriptionLabel}</CustomLabel>
              <CustomTextArea id="option-description" value={optionFormState.description} onChange={(event) => setOptionFormState((current) => ({ ...current, description: event.target.value }))} displayOnly={pageMode === 'view' && !!editingOption} />
            </div>
            {!editingOption ? (
              <div className="space-y-2">
                <CustomLabel htmlFor="option-order">{texts.form.optionDisplayOrderCreateLabel}</CustomLabel>
                <CustomTextBox id="option-order" type="number" min={1} step="1" value={optionFormState.displayOrder} placeholder={texts.placeholders.optionDisplayOrderCreate} onChange={(event) => setOptionFormState((current) => ({ ...current, displayOrder: event.target.value }))} displayOnly={false} />
              </div>
            ) : null}
          </div>
        </Dialog>

        <Dialog
          open={bulkDefinitionTypeDialogOpen}
          onClose={closeBulkDefinitionTypeDialog}
          closeDisabled={isPending}
          title={texts.dialogs.bulkType.title}
          footer={
            <>
              <CustomButton onClick={closeBulkDefinitionTypeDialog} disabled={isPending}>{texts.common.cancel}</CustomButton>
              <CustomButton variant="accent" disabled={isPending} onClick={() => void handleBulkUpdateDefinitionType()}>{texts.common.update}</CustomButton>
            </>
          }
        >
          <div className="space-y-4">
            {bulkDefinitionTypeDialogError ? <CustomMessageArea variant="error">{bulkDefinitionTypeDialogError}</CustomMessageArea> : null}
            {bulkDefinitionTypeDialogSuccess ? <CustomMessageArea variant="success">{bulkDefinitionTypeDialogSuccess}</CustomMessageArea> : null}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <p>{formatText(texts.dialogs.bulkType.targetCount, { count: bulkDefinitionTargets.length })}</p>
              <p>{texts.dialogs.bulkType.descriptionLine1}</p>
              <p>{texts.dialogs.bulkType.descriptionLine2}</p>
            </div>
            <SelectField
              id="bulk-definition-type"
              label={texts.form.bulkDefinitionTypeLabel}
              value={bulkDefinitionTypeFormState.fieldType}
              placeholder={texts.common.selectPrompt}
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
                label={texts.form.sharedChoiceSetLabel}
                value={bulkDefinitionTypeFormState.sharedChoiceSetId}
                placeholder={texts.common.selectPrompt}
                options={choiceSets.filter((cs) => !cs.isDeleted).map((cs) => ({ value: String(cs.id), label: `${cs.label} (${cs.choiceSetKey})` }))}
                onChange={(value) => setBulkDefinitionTypeFormState((current) => ({ ...current, sharedChoiceSetId: value }))}
              />
            ) : null}
          </div>
        </Dialog>

        <Dialog
          open={overrideDialogOpen}
          onClose={() => setOverrideDialogOpen(false)}
          closeDisabled={isPending}
          title={overrideTargetField
            ? formatText(
              pageMode === 'view' ? texts.dialogs.override.targetDetailTitle : texts.dialogs.override.targetTitle,
              { label: overrideTargetField.label },
            )
            : texts.dialogs.override.editTitle}
          footer={
            pageMode === 'view' ? (
              <>
                <CustomButton onClick={() => setOverrideDialogOpen(false)}>{texts.common.close}</CustomButton>
                <CustomButton variant="accent" onClick={() => setPageMode('edit')}>{texts.buttons.enableEdit}</CustomButton>
              </>
            ) : (
              <>
                <CustomButton onClick={() => setPageMode('view')}>{texts.buttons.backToReadonly}</CustomButton>
                <CustomButton onClick={() => setOverrideDialogOpen(false)} disabled={isPending}>{texts.common.cancel}</CustomButton>
                <CustomButton variant="accent" disabled={isPending} onClick={() => void handleSaveOverride()}>{texts.common.save}</CustomButton>
              </>
            )
          }
        >
          <div className="space-y-4">
            {overrideDialogError ? <CustomMessageArea variant="error">{overrideDialogError}</CustomMessageArea> : null}
            {overrideDialogSuccess ? <CustomMessageArea variant="success">{overrideDialogSuccess}</CustomMessageArea> : null}
            {overrideTargetField ? (
              <div className="select-none rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                <p>{texts.form.overrideBaseLabel}: {overrideTargetField.label}</p>
                <p>{texts.form.overrideFieldKeyLabel}: {overrideTargetField.fieldKey}</p>
                <p>{texts.form.overrideTypeLabel}: {SAVE_DATA_FIELD_TYPE_LABELS[overrideTargetField.fieldType]}</p>
              </div>
            ) : null}
            <div className="space-y-2">
              <CustomLabel htmlFor="override-label">{texts.form.overrideLabelLabel}</CustomLabel>
              <CustomTextBox id="override-label" value={overrideFormState.overrideLabel} onChange={(event) => setOverrideFormState((current) => ({ ...current, overrideLabel: event.target.value }))} displayOnly={pageMode === 'view'} />
            </div>
            <div className="space-y-2">
              <CustomLabel htmlFor="override-description">{texts.form.overrideDescriptionLabel}</CustomLabel>
              <CustomTextArea id="override-description" value={overrideFormState.overrideDescription} onChange={(event) => setOverrideFormState((current) => ({ ...current, overrideDescription: event.target.value }))} displayOnly={pageMode === 'view'} />
            </div>
            <SelectField
              id="override-required"
              label={texts.form.overrideRequiredLabel}
              value={overrideFormState.overrideIsRequired}
              placeholder={texts.common.selectPrompt}
              options={[
                { value: 'inherit', label: texts.options.overrideRequiredInherit },
                { value: 'true', label: texts.options.overrideRequiredTrue },
                { value: 'false', label: texts.options.overrideRequiredFalse },
              ]}
              onChange={(value) => setOverrideFormState((current) => ({ ...current, overrideIsRequired: value as OverrideFormState['overrideIsRequired'] }))}
              displayOnly={pageMode === 'view'}
            />
            <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-200">
              <CustomCheckBox checked={overrideFormState.isDisabled} onChange={(event) => setOverrideFormState((current) => ({ ...current, isDisabled: event.target.checked }))} displayOnly={pageMode === 'view'} />
              {texts.form.overrideDisableLabel}
            </label>
          </div>
        </Dialog>

      </div>
    </main>
  );
}