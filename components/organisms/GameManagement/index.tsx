'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import CustomButton from '@/components/atoms/CustomButton';
import PageModeToggle from '@/components/atoms/PageModeToggle';
import CustomComboBox from '@/components/atoms/CustomComboBox';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import DataTable, { DATA_TABLE_DEFAULT_PAGE_HEIGHT, type DataTableColumn, type SortState } from '@/components/molecules/DataTable';
import ResponsiveActionGroup from '@/components/molecules/ResponsiveActionGroup';
import {
  moveSelectedItemsByOne,
  moveSelectedItemsToTarget,
} from '@/components/molecules/DataTable/selection-utils';
import RowMoveButtons from '@/components/organisms/GameManagement/RowMoveButtons';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import {
  fetchCurrentUser,
  fetchMasterLookups,
  fetchPublicMasterLookups,
  fetchAuthenticatedUserLookups,
  getGameManagementErrorMessage,
  reorderResource,
} from '@/lib/game-management/api';
import { MAINTENANCE_FILTER_OPTIONS, supportsMaintenance } from '@/lib/game-management/maintenance';
import resources from '@/lib/resources';
import {
  fetchPublicSaveDataSchema,
  fetchPublicStoryProgressSchema,
} from '@/lib/game-management/api/public';
import {
  getResourceDefinition,
  RESOURCE_DEFINITIONS,
  ADMIN_RESOURCE_ORDER,
} from '@/lib/game-management/resources';
import type { PageMode } from '@/lib/game-management/resources';
import {
  buildTrialUserData,
  trialBatchUpdateDisplayOrder,
} from '@/lib/game-management/trial';
import { useResponsiveLayoutMode } from '@/lib/hooks/useResponsiveLayoutMode';
import type {
  MaintenanceHealthFilter,
  ManagementLookups,
  ResourceKey,
  SaveDataSchemaDto,
} from '@/lib/game-management/types';
import { getSaveDataGameSoftwareMasterId } from './helpers';
import {
  buildTableRows,
  getGameSoftwareMasterChildTableColumns,
  getTableColumns,
} from './table-rows';
import AccountMoveDialog from './AccountMoveDialog';
import EditorDialog from './EditorDialog';
import BulkEditorDialog from './BulkEditorDialog';
import { TrialBanner, PageCard, PageFrame } from './shared';
import type { DashboardExtraCard, EditorDialogContext, ManagementTableRow, StoryProgressLabelMap } from './view-types';
import type { AccountDto } from '@/lib/game-management/types';

type SaveDataListFieldHeader = {
  id: number;
  fieldKey: string;
  label: string;
  displayOrder: number;
};

type SaveDataListRow = ManagementTableRow & {
  [key: string]: unknown;
  saveDataContentGroupId?: number | null;
  saveDataGameSoftwareMasterId?: number | null;
  saveDataDynamicFieldLabels?: Record<string, string>;
};

type OpenEditorDialogOptions = {
  resourceKey?: ResourceKey;
  recordId?: number | null;
  initialFormState?: EditorDialogContext['initialFormState'];
  parentContentGroupId?: number | null;
};

function sortSaveDataFieldHeaders(headers: SaveDataListFieldHeader[]): SaveDataListFieldHeader[] {
  return [...headers].sort((left, right) => (
    left.displayOrder - right.displayOrder
    || left.id - right.id
  ));
}

function buildSaveDataFieldHeadersFromSchemas(schemas: SaveDataSchemaDto[]): SaveDataListFieldHeader[] {
  let syntheticId = 1;
  const fieldMap = new Map<string, SaveDataListFieldHeader>();

  for (const schema of schemas) {
    for (const field of schema.fields) {
      if (field.isDisabled) {
        continue;
      }

      const current = fieldMap.get(field.fieldKey);
      if (!current || field.displayOrder < current.displayOrder || (field.displayOrder === current.displayOrder && field.fieldKey.localeCompare(current.fieldKey, 'ja') < 0)) {
        fieldMap.set(field.fieldKey, {
          id: current?.id ?? syntheticId++,
          fieldKey: field.fieldKey,
          label: field.label,
          displayOrder: field.displayOrder,
        });
      }
    }
  }

  return sortSaveDataFieldHeaders(Array.from(fieldMap.values()));
}

function mergeVisibleRowIdsIntoOrder(
  previousOrder: number[] | null,
  visibleRowIds: number[],
  nextVisibleRowIds: number[],
): number[] | null {
  if (!previousOrder) {
    return previousOrder;
  }

  const visibleRowIdSet = new Set(visibleRowIds);
  const nextOrder = [...previousOrder];
  let visibleCursor = 0;

  for (let index = 0; index < nextOrder.length; index += 1) {
    if (!visibleRowIdSet.has(nextOrder[index])) {
      continue;
    }

    nextOrder[index] = nextVisibleRowIds[visibleCursor];
    visibleCursor += 1;
  }

  return nextOrder;
}

function ordersEqual(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

// ---------------------------------------------------------------------------
// Child table (game-software-masters inside expanded content groups)
// ---------------------------------------------------------------------------

type ContentGroupChildTableProps = {
  contentGroupId: number;
  childRows: SaveDataListRow[];
  parentReorderEnabled: boolean;
  parentReorderDisabledReason: string | undefined;
  canCreateSoftware: boolean;
  openEditorDialog: (options: OpenEditorDialogOptions) => void;
  onDataChanged: () => void;
};

function ContentGroupChildTable({
  contentGroupId,
  childRows,
  parentReorderEnabled,
  parentReorderDisabledReason,
  canCreateSoftware,
  openEditorDialog,
  onDataChanged,
}: ContentGroupChildTableProps) {
  const { startLoading } = useLoadingOverlay();

  const [localRowOrder, setLocalRowOrder] = useState<number[]>(() => childRows.map((r) => r.id));
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isDirty) {
      setLocalRowOrder(childRows.map((r) => r.id));
    }
  }, [childRows, isDirty]);

  const orderedChildRows = useMemo<SaveDataListRow[]>(() => {
    const rowMap = new Map(childRows.map((r) => [r.id, r]));
    return localRowOrder.map((id) => rowMap.get(id)).filter((r): r is SaveDataListRow => r !== undefined);
  }, [childRows, localRowOrder]);

  const isSortActive = sortState !== null;
  const isFilterActive = filteredCount !== null && filteredCount !== childRows.length;
  const effectiveReorderEnabled = parentReorderEnabled && !isSortActive && !isFilterActive;
  const reorderDisabledReason = !parentReorderEnabled
    ? parentReorderDisabledReason
    : isSortActive
      ? 'ソートを解除すると並び替えできます'
      : isFilterActive
        ? 'フィルタを解除すると並び替えできます'
        : undefined;

  const handleFilteredDataChange = useCallback((data: Record<string, unknown>[]) => {
    setFilteredCount(data.length);
  }, []);

  const selectedVisibleCount = useMemo(
    () => orderedChildRows.filter((row) => selectedKeys.includes(row.tableRowKey)).length,
    [orderedChildRows, selectedKeys],
  );

  const handleSelectionAwareMove = useCallback((rowKey: string, rowId: number, direction: 'up' | 'down') => {
    setLocalRowOrder((prev) => {
      const selectedVisibleIds = orderedChildRows
        .filter((row) => selectedKeys.includes(row.tableRowKey))
        .map((row) => row.id);
      const moveIds = selectedKeys.includes(rowKey) && selectedVisibleIds.length > 0
        ? selectedVisibleIds
        : [rowId];
      const next = moveSelectedItemsByOne(prev, moveIds, direction);
      if (ordersEqual(prev, next)) return prev;
      setIsDirty(true);
      return next;
    });
  }, [orderedChildRows, selectedKeys]);

  const handleRowMove = useCallback((fromIndex: number, toIndex: number) => {
    setLocalRowOrder((prev) => {
      const draggedRow = orderedChildRows[fromIndex];
      if (!draggedRow) return prev;
      const selectedVisibleIds = orderedChildRows
        .filter((row) => selectedKeys.includes(row.tableRowKey))
        .map((row) => row.id);
      const next = selectedKeys.includes(draggedRow.tableRowKey) && selectedVisibleIds.length > 1
        ? moveSelectedItemsToTarget(prev, selectedVisibleIds, fromIndex, toIndex)
        : (() => {
            const arr = [...prev];
            const [moved] = arr.splice(fromIndex, 1);
            if (moved == null) return prev;
            arr.splice(toIndex, 0, moved);
            return arr;
          })();
      if (ordersEqual(prev, next)) return prev;
      setIsDirty(true);
      return next;
    });
  }, [orderedChildRows, selectedKeys]);

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      const dtoMap = new Map(childRows.map((r) => [r.id, r]));
      const items = localRowOrder
        .map((id, index) => {
          const newDisplayOrder = index + 1;
          const dto = dtoMap.get(id);
          if ((dto as { displayOrder?: number } | undefined)?.displayOrder === newDisplayOrder) return null;
          return { id, displayOrder: newDisplayOrder };
        })
        .filter((item): item is { id: number; displayOrder: number } => item !== null);

      if (items.length > 0) {
        await startLoading(async () => {
          await reorderResource('game-software-masters', items);
        }, 'ゲームソフトマスタの表示順を保存中...');
      }
      setIsDirty(false);
      onDataChanged();
    } catch {
      // Error handled by parent via reload
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, childRows, localRowOrder, startLoading, onDataChanged]);

  const columns = useMemo<DataTableColumn<SaveDataListRow>[]>(() => {
    return getGameSoftwareMasterChildTableColumns().map((column) => {
      if (column.key !== 'edit') {
        return column as DataTableColumn<SaveDataListRow>;
      }

      return {
        ...column,
        width: '11rem',
        render: (_: unknown, row: SaveDataListRow, rowIndex: number) => (
          <span className="inline-flex items-center gap-2">
            <RowMoveButtons
              isFirst={rowIndex === 0}
              isLast={rowIndex === orderedChildRows.length - 1}
              disabled={!effectiveReorderEnabled}
              onMoveUp={() => handleSelectionAwareMove(row.tableRowKey, row.id, 'up')}
              onMoveDown={() => handleSelectionAwareMove(row.tableRowKey, row.id, 'down')}
            />
            <button
              type="button"
              onClick={() => openEditorDialog({
                resourceKey: 'game-software-masters',
                recordId: row.id,
                parentContentGroupId: row.parentContentGroupId ?? null,
              })}
              className="text-sm font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
            >
              編集
            </button>
          </span>
        ),
      } satisfies DataTableColumn<SaveDataListRow>;
    });
  }, [effectiveReorderEnabled, handleSelectionAwareMove, openEditorDialog, orderedChildRows.length]);

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white/85 p-3 dark:border-zinc-800/80 dark:bg-zinc-950/70">
      <DataTable
        title="ゲームソフトマスタ"
        titleActions={
          <span className="inline-flex items-center gap-2">
            {canCreateSoftware ? (
              <CustomButton
                variant="neutral"
                onClick={() => openEditorDialog({
                  resourceKey: 'game-software-masters',
                  initialFormState: { contentGroupId: String(contentGroupId) },
                  parentContentGroupId: contentGroupId,
                })}
              >
                ソフト追加
              </CustomButton>
            ) : null}
            <CustomButton
              onClick={() => void handleSave()}
              disabled={!isDirty || saving}
            >
              表示順を保存
            </CustomButton>
          </span>
        }
        columns={columns}
        data={orderedChildRows}
        height={DATA_TABLE_DEFAULT_PAGE_HEIGHT}
        rowKey="tableRowKey"
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        resizable
        emptyMessage="子データがありません。"
        className="game-management__child-table"
        rowReorderEnabled={effectiveReorderEnabled}
        rowReorderDisabledReason={reorderDisabledReason}
        onRowMove={handleRowMove}
        sortState={sortState}
        onSortChange={setSortState}
        onFilteredDataChange={handleFilteredDataChange}
      />
      <div className="flex items-center justify-end gap-3 text-sm">
        {selectedVisibleCount > 0 && effectiveReorderEnabled ? (
          <span className="text-xs text-zinc-500 dark:text-zinc-300">
            選択中: {selectedVisibleCount} 件（Shift+クリックで範囲選択、上下移動でまとめて並び替え）
          </span>
        ) : null}
        {!effectiveReorderEnabled && reorderDisabledReason && (
          <span className="text-xs text-amber-600 dark:text-amber-400">{reorderDisabledReason}</span>
        )}
      </div>
    </div>
  );
}

export function GameManagementDashboard({
    basePath = '/game-management',
    resourceKeys,
    requiresAdmin = false,
    sectionLabel = 'Game Management',
    sectionTitle = 'ゲーム管理ダッシュボード',
    sectionDescription = '各マスタ、所有ゲーム機、ゲームソフト、アカウント、メモリーカード、セーブデータの一覧確認と編集画面への遷移をここから行えます。',
    extraCards = [],
  }: {
    basePath?: string;
    resourceKeys?: ResourceKey[];
    requiresAdmin?: boolean;
    sectionLabel?: string;
    sectionTitle?: string;
    sectionDescription?: string;
    extraCards?: DashboardExtraCard[];
  }) {
    const { data: session } = useSession();
    const isTrial = !session?.user;
    const [authError, setAuthError] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(requiresAdmin && Boolean(session?.user));
    const displayKeys = resourceKeys ?? ADMIN_RESOURCE_ORDER;
    const effectiveAuthError = requiresAdmin && session?.user ? authError : null;
    const effectiveAuthLoading = requiresAdmin && session?.user ? authLoading : false;

    useEffect(() => {
      if (!requiresAdmin || !session?.user) {
        return;
      }

      let cancelled = false;

      void fetchCurrentUser()
        .then((user) => {
          if (cancelled) {
            return;
          }

          if (!user.isAdmin && !user.effectiveRoles.includes('Admin')) {
            setAuthError(getGameManagementErrorMessage(new Error('FORBIDDEN'), {
              fallback: resources.gameManagement.errors.adminRequired,
              adminFallback: resources.gameManagement.errors.adminRequired,
            }));
            return;
          }

          setAuthError(null);
        })
        .catch((error) => {
          if (!cancelled) {
            setAuthError(getGameManagementErrorMessage(error, {
              fallback: resources.gameManagement.errors.detailLoad,
              adminFallback: resources.gameManagement.errors.adminRequired,
            }));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setAuthLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [requiresAdmin, session?.user]);

    return (
      <PageFrame
        eyebrowLabel={sectionLabel}
        title={sectionTitle}
        description={sectionDescription}
      >
        {isTrial && (
          <TrialBanner />
        )}
        {effectiveAuthError ? <CustomMessageArea variant="error">{effectiveAuthError}</CustomMessageArea> : null}
        {effectiveAuthLoading ? (
          <PageCard>
            <p className="text-sm text-zinc-500 dark:text-zinc-300">権限を確認しています...</p>
          </PageCard>
        ) : effectiveAuthError ? null : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayKeys.map((resourceKey) => {
              const definition = RESOURCE_DEFINITIONS[resourceKey];

              return (
                <Link
                  key={resourceKey}
                  href={`${basePath}/${resourceKey}`}
                  className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                >
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{definition.shortLabel}</p>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{definition.label}</h2>
                    <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{definition.description}</p>
                    <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">一覧を開く</p>
                  </div>
                </Link>
              );
            })}
            {extraCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{card.shortLabel}</p>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{card.title}</h2>
                  <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{card.description}</p>
                  <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">{card.actionLabel ?? '画面を開く'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageFrame>
    );
  }

  export function GameManagementResourceListPage({
    resourceKey,
    basePath = '/game-management',
    scope = 'admin',
  }: {
    resourceKey: ResourceKey;
    basePath?: string;
    scope?: 'admin' | 'user';
  }) {
    const { data: session } = useSession();
    const isTrial = scope === 'user' && !session?.user;
    const definition = getResourceDefinition(resourceKey);
    const [lookups, setLookups] = useState<ManagementLookups | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(scope === 'admin' && Boolean(session?.user));
    const [storyProgressLabels, setStoryProgressLabels] = useState<StoryProgressLabelMap>({});
    const [selectedContentGroupId, setSelectedContentGroupId] = useState('');
    const [saveDataSchemas, setSaveDataSchemas] = useState<Record<number, SaveDataSchemaDto>>({});
    const [saveDataFieldHeaders, setSaveDataFieldHeaders] = useState<SaveDataListFieldHeader[]>([]);
    const [saveDataSchemaLoading, setSaveDataSchemaLoading] = useState(false);
    const [saveDataSchemaError, setSaveDataSchemaError] = useState<string | null>(null);

    const [localRowOrder, setLocalRowOrder] = useState<number[] | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [sortState, setSortState] = useState<SortState | null>(null);
    const [filteredCount, setFilteredCount] = useState<number | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const { startLoading } = useLoadingOverlay();

    const [editorContext, setEditorContext] = useState<EditorDialogContext | null>(null);
    const [displayedRowIds, setDisplayedRowIds] = useState<number[]>([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [pageMode, setPageMode] = useState<PageMode>('view');
    const [maintenanceHealthFilter, setMaintenanceHealthFilter] = useState<MaintenanceHealthFilter>('All');
    const layoutMode = useResponsiveLayoutMode();
    const [bulkEditorOpen, setBulkEditorOpen] = useState(false);
    const [bulkEditorTargetIds, setBulkEditorTargetIds] = useState<number[]>([]);
    const [accountMoveTarget, setAccountMoveTarget] = useState<AccountDto | null>(null);

    const softwareMasterDefinition = useMemo(() => getResourceDefinition('game-software-masters'), []);

  const load = useCallback(async () => {
    setLoading(true);
    setAuthLoading(scope === 'admin' && Boolean(session?.user));
    setError(null);
    setSaveError(null);
    setIsDirty(false);
    setLocalRowOrder(null);
    setSortState(null);
    setSelectedRowKeys([]);

    try {
      let result: ManagementLookups;
      if (scope === 'admin') {
        const user = await fetchCurrentUser();
        if (!user.isAdmin && !user.effectiveRoles.includes('Admin')) {
          throw new Error('ADMIN_REQUIRED');
        }
        const masters = await fetchMasterLookups();
        result = { ...masters, accounts: [], gameConsoles: [], gameSoftwares: [], memoryCards: [], saveDatas: [] };
      } else if (isTrial) {
        const masters = await fetchPublicMasterLookups();
        const userData = buildTrialUserData();
        result = { ...masters, ...userData };
      } else {
        result = await fetchAuthenticatedUserLookups({
          maintenanceHealthFilter: supportsMaintenance(resourceKey) ? maintenanceHealthFilter : 'All',
        });
      }
      setLookups(result);
    } catch (loadError) {
      setError(getGameManagementErrorMessage(loadError, {
        fallback: resources.gameManagement.errors.listLoad,
        adminFallback: resources.gameManagement.errors.adminRequired,
      }));
    } finally {
      setLoading(false);
      setAuthLoading(false);
    }
  }, [isTrial, maintenanceHealthFilter, resourceKey, scope, session?.user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (resourceKey !== 'game-software-content-groups') {
      setExpandedRowKeys([]);
    }
  }, [resourceKey]);

  const saveDataContentGroupOptions = useMemo(() => {
    if (resourceKey !== 'save-datas' || !lookups) {
      return [] as Array<{ value: string; label: string }>;
    }

    const availableContentGroupIds = new Set(
      lookups.saveDatas
        .map((saveData) => getSaveDataGameSoftwareMasterId(saveData, lookups))
        .filter((value): value is number => value != null)
        .map((gameSoftwareMasterId) => lookups.gameSoftwareMasters.find((master) => master.id === gameSoftwareMasterId)?.contentGroupId)
        .filter((value): value is number => value != null),
    );

    return lookups.gameSoftwareContentGroups
      .filter((group) => availableContentGroupIds.has(group.id))
      .sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id)
      .map((group) => ({ value: String(group.id), label: group.name }));
  }, [lookups, resourceKey]);

  useEffect(() => {
    if (resourceKey !== 'save-datas') {
      setSelectedContentGroupId('');
      return;
    }

    if (selectedContentGroupId && !saveDataContentGroupOptions.some((option) => option.value === selectedContentGroupId)) {
      setSelectedContentGroupId('');
    }
  }, [resourceKey, saveDataContentGroupOptions, selectedContentGroupId]);

  const selectedContentGroupIdNumber = useMemo(() => {
    if (resourceKey !== 'save-datas' || !selectedContentGroupId) {
      return null;
    }

    return Number(selectedContentGroupId);
  }, [resourceKey, selectedContentGroupId]);

  const dynamicColumnSignature = useMemo(() => (
    saveDataFieldHeaders.map((field) => field.fieldKey).join(',')
  ), [saveDataFieldHeaders]);

  useEffect(() => {
    setSelectedRowKeys([]);
  }, [dynamicColumnSignature, resourceKey, selectedContentGroupId]);

  useEffect(() => {
    if (resourceKey !== 'save-datas' || !lookups) {
      setStoryProgressLabels({});
      return;
    }

    const masterIds = Array.from(new Set(
      lookups.saveDatas
        .map((saveData) => getSaveDataGameSoftwareMasterId(saveData, lookups))
        .filter((value): value is number => value != null),
    ));

    if (masterIds.length === 0) {
      setStoryProgressLabels({});
      return;
    }

    let cancelled = false;

    const loadStoryProgressLabels = async () => {
      const entries = await Promise.allSettled(masterIds.map(async (gameSoftwareMasterId) => {
        const schema = await fetchPublicStoryProgressSchema(gameSoftwareMasterId);
        return schema.choices.map((choice) => [`${gameSoftwareMasterId}:${choice.storyProgressDefinitionId}`, choice.label] as const);
      }));

      if (cancelled) {
        return;
      }

      const nextLabels: StoryProgressLabelMap = {};
      for (const entry of entries) {
        if (entry.status !== 'fulfilled') {
          continue;
        }
        for (const [key, label] of entry.value) {
          nextLabels[key] = label;
        }
      }
      setStoryProgressLabels(nextLabels);
    };

    void loadStoryProgressLabels();

    return () => {
      cancelled = true;
    };
  }, [lookups, resourceKey]);

  useEffect(() => {
    if (resourceKey !== 'save-datas' || !lookups || selectedContentGroupIdNumber == null) {
      setSaveDataSchemas({});
      setSaveDataFieldHeaders([]);
      setSaveDataSchemaLoading(false);
      setSaveDataSchemaError(null);
      return;
    }

    const targetSaveDatas = lookups.saveDatas.filter((saveData) => {
      const gameSoftwareMasterId = getSaveDataGameSoftwareMasterId(saveData, lookups);
      if (!gameSoftwareMasterId) {
        return false;
      }

      const master = lookups.gameSoftwareMasters.find((item) => item.id === gameSoftwareMasterId);
      return master?.contentGroupId === selectedContentGroupIdNumber;
    });

    const masterIds = Array.from(new Set(
      targetSaveDatas
        .map((saveData) => getSaveDataGameSoftwareMasterId(saveData, lookups))
        .filter((value): value is number => value != null),
    ));

    if (masterIds.length === 0) {
      setSaveDataSchemas({});
      setSaveDataFieldHeaders([]);
      setSaveDataSchemaLoading(false);
      setSaveDataSchemaError(null);
      return;
    }

    if (isTrial) {
      setSaveDataSchemas({});
      setSaveDataFieldHeaders([]);
      setSaveDataSchemaLoading(false);
      setSaveDataSchemaError('トライアルモードではセーブデータスキーマ定義を取得できないため、セーブデータスキーマ列は表示されません。');
      return;
    }

    let cancelled = false;

    const loadSaveDataSchemas = async () => {
      setSaveDataSchemas({});
      setSaveDataFieldHeaders([]);
      setSaveDataSchemaLoading(true);
      setSaveDataSchemaError(null);

      const schemaEntries = await Promise.allSettled(masterIds.map(async (gameSoftwareMasterId) => (
        [gameSoftwareMasterId, await fetchPublicSaveDataSchema(gameSoftwareMasterId)] as const
      )));

      if (cancelled) {
        return;
      }

      const nextSchemas: Record<number, SaveDataSchemaDto> = {};
      let failedSchemaCount = 0;

      for (const entry of schemaEntries) {
        if (entry.status !== 'fulfilled') {
          failedSchemaCount += 1;
          continue;
        }

        const [gameSoftwareMasterId, schema] = entry.value;
        nextSchemas[gameSoftwareMasterId] = schema;
      }

      const schemaList = Object.values(nextSchemas);
      const nextHeaders = schemaList.length > 0
        ? buildSaveDataFieldHeadersFromSchemas(schemaList)
        : [];

      setSaveDataSchemas(nextSchemas);
      setSaveDataFieldHeaders(nextHeaders);
      setSaveDataSchemaLoading(false);
      setSaveDataSchemaError(
        failedSchemaCount === 0
          ? null
          : failedSchemaCount === masterIds.length
            ? 'セーブデータスキーマの取得に失敗したため、セーブデータスキーマ列は表示されません。'
            : '一部のセーブデータスキーマの取得に失敗したため、該当レコードは空欄表示になります。',
      );
    };

    void loadSaveDataSchemas();

    return () => {
      cancelled = true;
    };
  }, [isTrial, lookups, resourceKey, selectedContentGroupIdNumber]);

  // 元テーブル行
  const baseRows = useMemo<SaveDataListRow[]>(() => (
    lookups ? buildTableRows(resourceKey, lookups, basePath, storyProgressLabels, saveDataSchemas) as SaveDataListRow[] : []
  ), [lookups, resourceKey, basePath, storyProgressLabels, saveDataSchemas]);

  // localRowOrder を baseRows の ID 集合へ追従させる
  useEffect(() => {
    const nextRowIds = baseRows.map((row) => row.id);

    if (localRowOrder === null) {
      if (nextRowIds.length > 0) {
        setLocalRowOrder(nextRowIds);
      }
      return;
    }

    const nextRowIdSet = new Set(nextRowIds);
    const currentVisibleRowIds = localRowOrder.filter((rowId) => nextRowIdSet.has(rowId));
    const currentVisibleRowIdSet = new Set(currentVisibleRowIds);
    const missingRowIds = nextRowIds.filter((rowId) => !currentVisibleRowIdSet.has(rowId));
    const synchronizedRowOrder = isDirty ? [...currentVisibleRowIds, ...missingRowIds] : nextRowIds;

    const isSameOrder = synchronizedRowOrder.length === localRowOrder.length
      && synchronizedRowOrder.every((rowId, index) => rowId === localRowOrder[index]);

    if (!isSameOrder) {
      setLocalRowOrder(synchronizedRowOrder);
    }
  }, [baseRows, isDirty, localRowOrder]);

  // ローカル順序が反映された表示行
  const orderedRows = useMemo<SaveDataListRow[]>(() => {
    if (!localRowOrder) return baseRows;
    const rowMap = new Map(baseRows.map((row) => [row.id, row]));
    return localRowOrder.map((id) => rowMap.get(id)).filter((row): row is SaveDataListRow => row !== undefined);
  }, [baseRows, localRowOrder]);

  const rows = useMemo<SaveDataListRow[]>(() => {
    if (resourceKey !== 'save-datas' || selectedContentGroupIdNumber == null) {
      return orderedRows;
    }

    return orderedRows.filter((row) => row.saveDataContentGroupId === selectedContentGroupIdNumber);
  }, [orderedRows, resourceKey, selectedContentGroupIdNumber]);

  useEffect(() => {
    setFilteredCount(rows.length);
    setDisplayedRowIds(rows.map((row) => row.id));
  }, [rows]);

  useEffect(() => {
    if (resourceKey !== 'save-datas') {
      return;
    }

    setSortState(null);
    setFilteredCount(null);
    setDisplayedRowIds([]);
  }, [resourceKey, selectedContentGroupId, dynamicColumnSignature]);

  // 並び替え有効判定: 編集モード＋ソートなし＋フィルタなし
  const isContentGroupFilterActive = resourceKey === 'save-datas' && selectedContentGroupIdNumber != null;
  const isFilterActive = filteredCount !== null && filteredCount !== rows.length;
  const isSortActive = sortState !== null;
  const isPageViewMode = pageMode === 'view';
  const reorderEnabled = !isPageViewMode && !isSortActive && !isFilterActive && !isContentGroupFilterActive;
  const reorderDisabledReason = isPageViewMode
    ? '編集モードを有効にすると並び替えできます'
    : isSortActive
    ? 'ソートを解除すると並び替えできます'
    : isContentGroupFilterActive
      ? 'ゲームソフト分類の絞り込みを解除すると並び替えできます'
    : isFilterActive
      ? 'フィルタを解除すると並び替えできます'
      : undefined;

  // フィルタ後データ count の追跡
  const handleFilteredDataChange = useCallback((data: SaveDataListRow[]) => {
    setFilteredCount(data.length);
    setDisplayedRowIds(data.map((row) => row.id));
  }, []);

  // ====== Editor dialog handlers ======

  const openEditorDialog = useCallback((options?: OpenEditorDialogOptions) => {
    setEditorContext({
      resourceKey: options?.resourceKey ?? resourceKey,
      recordId: options?.recordId ?? null,
      initialFormState: options?.initialFormState,
      parentContentGroupId: options?.parentContentGroupId ?? null,
    });
  }, [resourceKey]);

  const closeEditorDialog = useCallback(() => {
    setEditorContext(null);
  }, []);

  const handleEditorRecordIdChange = useCallback((recordId: number | null) => {
    setEditorContext((current) => (current ? { ...current, recordId } : current));
  }, []);

  const handleEditorDataChanged = useCallback(() => {
    void load();
  }, [load]);

  const effectiveDisplayedRowIds = useMemo(() => (
    displayedRowIds.length > 0 ? displayedRowIds : rows.map((r) => r.id)
  ), [displayedRowIds, rows]);

  const selectedVisibleRowCount = useMemo(() => (
    rows.filter((row) => selectedRowKeys.includes(row.tableRowKey)).length
  ), [rows, selectedRowKeys]);
  const bulkEditAvailable = pageMode === 'edit' && !!definition.bulkEditableFields && definition.bulkEditableFields.length > 0;

  const editorRowIds = useMemo(() => {
    if (!editorContext || !lookups) {
      return [] as number[];
    }

    if (editorContext.resourceKey === 'game-software-masters' && editorContext.parentContentGroupId != null) {
      return editorContext.recordId != null ? [editorContext.recordId] : [];
    }

    return effectiveDisplayedRowIds;
  }, [editorContext, effectiveDisplayedRowIds, lookups]);

  const editorDefinition = useMemo(() => (
    editorContext ? getResourceDefinition(editorContext.resourceKey) : null
  ), [editorContext]);

  const editorIsTrial = useMemo(() => {
    if (!editorDefinition) {
      return false;
    }

    return editorDefinition.scope === 'user' && !session?.user;
  }, [editorDefinition, session?.user]);

  // 行移動ハンドラ
  const handleRowMove = useCallback((fromIndex: number, toIndex: number) => {
    setLocalRowOrder((prev) => {
      if (!prev) return prev;

      const visibleRowIds = rows.map((row) => row.id);
      const draggedRow = rows[fromIndex];
      if (!draggedRow) {
        return prev;
      }

      const selectedVisibleRowIds = rows
        .filter((row) => selectedRowKeys.includes(row.tableRowKey))
        .map((row) => row.id);
      const nextVisibleRowIds = selectedRowKeys.includes(draggedRow.tableRowKey) && selectedVisibleRowIds.length > 1
        ? moveSelectedItemsToTarget(visibleRowIds, selectedVisibleRowIds, fromIndex, toIndex)
        : (() => {
          const next = [...visibleRowIds];
          const [movedRowId] = next.splice(fromIndex, 1);

          if (movedRowId == null) {
            return visibleRowIds;
          }

          next.splice(toIndex, 0, movedRowId);
          return next;
        })();

      if (ordersEqual(visibleRowIds, nextVisibleRowIds)) {
        return prev;
      }

      setIsDirty(true);
      return mergeVisibleRowIdsIntoOrder(prev, visibleRowIds, nextVisibleRowIds);
    });
  }, [rows, selectedRowKeys]);

  const handleSelectionAwareRowMove = useCallback((rowKey: string, rowId: number, direction: 'up' | 'down') => {
    setLocalRowOrder((prev) => {
      if (!prev) {
        return prev;
      }

      const visibleRowIds = rows.map((row) => row.id);
      const selectedVisibleRowIds = rows
        .filter((row) => selectedRowKeys.includes(row.tableRowKey))
        .map((row) => row.id);
      const moveIds = selectedRowKeys.includes(rowKey) && selectedVisibleRowIds.length > 0
        ? selectedVisibleRowIds
        : [rowId];
      const nextVisibleRowIds = moveSelectedItemsByOne(visibleRowIds, moveIds, direction);

      if (ordersEqual(visibleRowIds, nextVisibleRowIds)) {
        return prev;
      }

      setIsDirty(true);
      return mergeVisibleRowIdsIntoOrder(prev, visibleRowIds, nextVisibleRowIds);
    });
  }, [rows, selectedRowKeys]);

  // lookups 内のリソース DTO 配列を取得
  const getDtoListFromLookups = useCallback((key: ResourceKey, lk: ManagementLookups): Array<{ id: number } & Record<string, unknown>> => {
    switch (key) {
      case 'accounts': return lk.accounts as Array<{ id: number } & Record<string, unknown>>;
      case 'game-console-categories': return lk.gameConsoleCategories as Array<{ id: number } & Record<string, unknown>>;
      case 'game-console-masters': return lk.gameConsoleMasters as Array<{ id: number } & Record<string, unknown>>;
      case 'game-console-edition-masters': return lk.gameConsoleEditionMasters as Array<{ id: number } & Record<string, unknown>>;
      case 'game-consoles': return lk.gameConsoles as Array<{ id: number } & Record<string, unknown>>;
      case 'game-software-content-groups': return lk.gameSoftwareContentGroups as Array<{ id: number } & Record<string, unknown>>;
      case 'game-software-masters': return lk.gameSoftwareMasters as Array<{ id: number } & Record<string, unknown>>;
      case 'game-softwares': return lk.gameSoftwares as Array<{ id: number } & Record<string, unknown>>;
      case 'memory-cards': return lk.memoryCards as Array<{ id: number } & Record<string, unknown>>;
      case 'memory-card-edition-masters': return lk.memoryCardEditionMasters as Array<{ id: number } & Record<string, unknown>>;
      case 'save-datas': return lk.saveDatas as Array<{ id: number } & Record<string, unknown>>;
      default: return [];
    }
  }, []);

  // 表示順保存
  const handleSaveDisplayOrder = useCallback(async () => {
    if (!localRowOrder || !lookups || !isDirty) return;
    setSaving(true);
    setSaveError(null);

    await startLoading(async () => {
      try {
        const dtoList = getDtoListFromLookups(resourceKey, lookups);
        const dtoMap = new Map(dtoList.map((dto) => [dto.id, dto]));

        // 差分のみ抽出: 新しい並び順で displayOrder が変わる行だけを送信
        const reorderItems = localRowOrder
          .map((id, index) => {
            const newDisplayOrder = index + 1;
            const dto = dtoMap.get(id);
            const currentDisplayOrder = (dto as { displayOrder?: number } | undefined)?.displayOrder;
            if (currentDisplayOrder === newDisplayOrder) return null;
            return { id, displayOrder: newDisplayOrder };
          })
          .filter((item): item is { id: number; displayOrder: number } => item !== null);

        if (reorderItems.length === 0) {
          setIsDirty(false);
          setLocalRowOrder(null);
          setSaving(false);
          return;
        }

        if (isTrial) {
          trialBatchUpdateDisplayOrder(resourceKey, localRowOrder);
        } else {
          await reorderResource(resourceKey, reorderItems);
        }

        // 保存成功: 再読み込み
        setIsDirty(false);
        setLocalRowOrder(null);
        await load();
      } catch (saveErr) {
        setSaveError(getGameManagementErrorMessage(saveErr, { fallback: resources.gameManagement.errors.reorder }));
      } finally {
        setSaving(false);
      }
    }, '表示順を保存中...');
  }, [localRowOrder, lookups, isDirty, isTrial, resourceKey, load, getDtoListFromLookups, startLoading]);

  // 操作列に上下ボタンを含めた columns を構築
  const listColumns = useMemo((): DataTableColumn<SaveDataListRow>[] => {
    const baseColumns = getTableColumns(resourceKey) as DataTableColumn<SaveDataListRow>[];
    const dynamicColumns = resourceKey === 'save-datas' && selectedContentGroupIdNumber != null
      ? saveDataFieldHeaders.map((field) => ({
        key: `dynamic:${field.fieldKey}`,
        header: field.label,
        sortable: true,
        filterable: true,
        filterMode: 'select',
        width: '12rem',
      } satisfies DataTableColumn<SaveDataListRow>))
      : [];

    const columns = resourceKey === 'save-datas' && dynamicColumns.length > 0
      ? (() => {
        const storyProgressIndex = baseColumns.findIndex((column) => column.key === 'storyProgress');
        if (storyProgressIndex === -1) {
          return [...baseColumns, ...dynamicColumns];
        }

        return [
          ...baseColumns.slice(0, storyProgressIndex + 1),
          ...dynamicColumns,
          ...baseColumns.slice(storyProgressIndex + 1),
        ];
      })()
      : baseColumns;

    return columns.map((col) => {
      if (col.key === 'operation') {
        return {
          ...col,
          render: (_: unknown, row: SaveDataListRow, rowIndex: number) => (
            <RowMoveButtons
              isFirst={rowIndex === 0}
              isLast={rowIndex === rows.length - 1}
              disabled={!reorderEnabled}
              onMoveUp={() => handleSelectionAwareRowMove(row.tableRowKey, row.id, 'up')}
              onMoveDown={() => handleSelectionAwareRowMove(row.tableRowKey, row.id, 'down')}
            />
          ),
        };
      }

      if (col.key === 'edit') {
        if (resourceKey === 'save-datas') {
          return {
            ...col,
            render: (_: unknown, row: SaveDataListRow) => (
              <button
                type="button"
                onClick={() => openEditorDialog({ recordId: row.id })}
                title={`セーブデータ #${row.id} を編集`}
                className="text-sm font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
              >
                {`編集 (#${row.id})`}
              </button>
            ),
          };
        }

        if (resourceKey === 'game-software-content-groups') {
          return {
            ...col,
            width: '18rem',
            render: (_: unknown, row: SaveDataListRow, rowIndex: number) => {
              const isExpanded = expandedRowKeys.includes(row.tableRowKey);

              return (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <RowMoveButtons
                    isFirst={rowIndex === 0}
                    isLast={rowIndex === rows.length - 1}
                    disabled={!reorderEnabled}
                    onMoveUp={() => handleSelectionAwareRowMove(row.tableRowKey, row.id, 'up')}
                    onMoveDown={() => handleSelectionAwareRowMove(row.tableRowKey, row.id, 'down')}
                  />
                  <button
                    type="button"
                    onClick={() => openEditorDialog({ recordId: row.id })}
                    className="text-sm font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
                  >
                    分類編集
                  </button>
                  {(isExpanded || !(row.children && row.children.length > 0)) && softwareMasterDefinition.canCreate ? (
                    <button
                      type="button"
                      onClick={() => openEditorDialog({
                        resourceKey: 'game-software-masters',
                        initialFormState: { contentGroupId: String(row.id) },
                        parentContentGroupId: row.id,
                      })}
                      className="text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                    >
                      ソフト追加
                    </button>
                  ) : null}
                </span>
              );
            },
          };
        }

        if (resourceKey === 'accounts' && !isTrial) {
          return {
            ...col,
            width: '14rem',
            render: (_: unknown, row: SaveDataListRow, rowIndex: number) => (
              <span className="inline-flex items-center gap-2">
                <RowMoveButtons
                  isFirst={rowIndex === 0}
                  isLast={rowIndex === rows.length - 1}
                  disabled={!reorderEnabled}
                  onMoveUp={() => handleSelectionAwareRowMove(row.tableRowKey, row.id, 'up')}
                  onMoveDown={() => handleSelectionAwareRowMove(row.tableRowKey, row.id, 'down')}
                />
                <button
                  type="button"
                  onClick={() => openEditorDialog({ recordId: row.id })}
                  className="text-sm font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const account = lookups?.accounts.find((a) => a.id === row.id);
                    if (account) setAccountMoveTarget(account);
                  }}
                  className="text-sm font-semibold text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
                >
                  移行
                </button>
              </span>
            ),
          };
        }

        return {
          ...col,
          width: '11rem',
          render: (_: unknown, row: SaveDataListRow, rowIndex: number) => (
            <span className="inline-flex items-center gap-2">
              <RowMoveButtons
                isFirst={rowIndex === 0}
                isLast={rowIndex === rows.length - 1}
                disabled={!reorderEnabled}
                onMoveUp={() => handleSelectionAwareRowMove(row.tableRowKey, row.id, 'up')}
                onMoveDown={() => handleSelectionAwareRowMove(row.tableRowKey, row.id, 'down')}
              />
              <button
                type="button"
                onClick={() => openEditorDialog({ recordId: row.id })}
                className="text-sm font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
              >
                編集
              </button>
            </span>
          ),
        };
      }

      return col;
    });
  }, [expandedRowKeys, handleSelectionAwareRowMove, isTrial, lookups, openEditorDialog, reorderEnabled, resourceKey, rows.length, saveDataFieldHeaders, selectedContentGroupIdNumber, softwareMasterDefinition.canCreate]);



  const dataTableKey = resourceKey === 'save-datas'
    ? `${resourceKey}:${selectedContentGroupId || 'all'}:${dynamicColumnSignature}`
    : resourceKey;

  return (
    <PageFrame
      title={definition.label}
      description={definition.description}
      layoutMode={layoutMode}
      actions={
        <>
          <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1}>
            <Link href={basePath} className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300">
              ダッシュボードへ戻る
            </Link>
            <PageModeToggle mode={pageMode} onChange={setPageMode} />
          </ResponsiveActionGroup>
          <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={2} align="end">
            {definition.canCreate ? (
              <CustomButton variant="accent" onClick={() => { setPageMode('edit'); openEditorDialog(); }}>
                新規作成
              </CustomButton>
            ) : null}
            <CustomButton onClick={() => void load()}>再読み込み</CustomButton>
          </ResponsiveActionGroup>
        </>
      }
    >
      {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
      {saveError ? <CustomMessageArea variant="error">{saveError}</CustomMessageArea> : null}
      {isTrial && <TrialBanner />}
      <PageCard>
        {loading || authLoading ? (
          <p className="text-sm text-zinc-500">{authLoading ? '権限を確認しています...' : '一覧を読み込んでいます...'}</p>
        ) : (
          <div className="space-y-4">
            {supportsMaintenance(resourceKey) ? (
              <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="grid gap-3 md:grid-cols-[minmax(0,20rem)_1fr] md:items-end">
                  <div className="space-y-2">
                    <CustomLabel htmlFor="maintenance-health-filter">保守状態</CustomLabel>
                    <CustomComboBox
                      id="maintenance-health-filter"
                      value={maintenanceHealthFilter}
                      onChange={(event) => setMaintenanceHealthFilter(event.target.value as MaintenanceHealthFilter)}
                    >
                      {MAINTENANCE_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </CustomComboBox>
                  </div>
                  <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-300">
                    最新の保守記録に基づいて一覧を絞り込みます。未確認は「起動不調を除外」に含まれ、期限超過は一覧の詳細表示で確認できます。
                  </p>
                </div>
              </div>
            ) : null}
            {resourceKey === 'save-datas' ? (
              <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="grid gap-3 md:grid-cols-[minmax(0,20rem)_1fr] md:items-end">
                  <div className="space-y-2">
                    <CustomLabel htmlFor="save-data-content-group-filter">ゲームソフト分類</CustomLabel>
                    <CustomComboBox
                      id="save-data-content-group-filter"
                      value={selectedContentGroupId}
                      onChange={(event) => setSelectedContentGroupId(event.target.value)}
                    >
                      <option value="">すべての分類</option>
                      {saveDataContentGroupOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </CustomComboBox>
                  </div>
                  <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-300">
                    {isTrial
                      ? '分類指定による一覧絞り込みは利用できます。セーブデータスキーマ列はログイン済み環境でのみ表示されます。'
                      : '分類を指定すると、その分類のセーブデータのみを表示し、ストーリー進行度の右側にセーブデータスキーマ列を展開します。'}
                  </p>
                </div>
                {selectedContentGroupIdNumber != null && saveDataSchemaLoading ? (
                  <p className="text-sm text-zinc-500">セーブデータスキーマ列を読み込んでいます...</p>
                ) : null}
                {selectedContentGroupIdNumber != null && saveDataSchemaError ? (
                  <CustomMessageArea variant="error">{saveDataSchemaError}</CustomMessageArea>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-col gap-3 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
              <span>表示件数: {rows.length} 件</span>
              <div className="space-y-2 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
                {selectedVisibleRowCount > 0 && reorderEnabled ? (
                  <span className="text-xs text-zinc-500 dark:text-zinc-300">
                    選択中: {selectedVisibleRowCount} 件（Shift+クリックで範囲選択、上下移動でまとめて並び替え）
                  </span>
                ) : null}
                {!reorderEnabled && reorderDisabledReason && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">{reorderDisabledReason}</span>
                )}
                <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1} align="end">
                  {bulkEditAvailable ? (
                    <CustomButton
                      disabled={selectedVisibleRowCount < 2}
                      onClick={() => {
                        const ids = rows
                          .filter((row) => selectedRowKeys.includes(row.tableRowKey))
                          .map((row) => row.id);
                        setBulkEditorTargetIds(ids);
                        setBulkEditorOpen(true);
                      }}
                    >
                      一括編集（{selectedVisibleRowCount} 件）
                    </CustomButton>
                  ) : null}
                  <CustomButton
                    onClick={() => void handleSaveDisplayOrder()}
                    disabled={!isDirty || saving || pageMode === 'view'}
                  >
                    表示順を保存
                  </CustomButton>
                </ResponsiveActionGroup>
              </div>
            </div>
            <DataTable
              key={dataTableKey}
              title={definition.label}
              columns={listColumns}
              data={rows}
              filterOptionsData={rows}
              height={DATA_TABLE_DEFAULT_PAGE_HEIGHT}
              rowKey="tableRowKey"
              selectable
              selectedKeys={selectedRowKeys}
              onSelectionChange={setSelectedRowKeys}
              resizable
              paginated
              isRowExpandable={resourceKey === 'game-software-content-groups'
                ? (row) => Array.isArray(row.children) && row.children.length > 0
                : undefined}
              renderExpandedContent={resourceKey === 'game-software-content-groups'
                ? (row) => {
                  const childRows = (row.children ?? []) as SaveDataListRow[];
                  return (
                    <ContentGroupChildTable
                      contentGroupId={row.id}
                      childRows={childRows}
                      parentReorderEnabled={reorderEnabled}
                      parentReorderDisabledReason={reorderDisabledReason}
                      canCreateSoftware={softwareMasterDefinition.canCreate}
                      openEditorDialog={openEditorDialog}
                      onDataChanged={load}
                    />
                  );
                }
                : undefined}
              expandedKeys={resourceKey === 'game-software-content-groups' ? expandedRowKeys : undefined}
              onExpandChange={resourceKey === 'game-software-content-groups' ? setExpandedRowKeys : undefined}
              emptyMessage="データがありません。"
              rowReorderEnabled={reorderEnabled}
              rowReorderDisabledReason={reorderDisabledReason}
              onRowMove={handleRowMove}
              sortState={sortState}
              onSortChange={setSortState}
              onFilteredDataChange={handleFilteredDataChange}
            />
          </div>
        )}
      </PageCard>
      {lookups && editorContext && editorDefinition ? (
        <EditorDialog
          open
          onClose={closeEditorDialog}
          resourceKey={editorContext.resourceKey}
          definition={editorDefinition}
          lookups={lookups}
          isTrial={editorIsTrial}
          recordId={editorContext.recordId}
          initialFormState={editorContext.initialFormState}
          onRecordIdChange={handleEditorRecordIdChange}
          rowIds={editorRowIds}
          onDataChanged={handleEditorDataChanged}
          pageMode={pageMode}
          onPageModeChange={setPageMode}
          layoutMode={layoutMode}
        />
      ) : null}
      {lookups && bulkEditorOpen && definition.bulkEditableFields ? (
        <BulkEditorDialog
          open
          onClose={() => { setBulkEditorOpen(false); setBulkEditorTargetIds([]); }}
          resourceKey={resourceKey}
          definition={definition}
          lookups={lookups}
          targetRecordIds={bulkEditorTargetIds}
          bulkEditableFields={definition.bulkEditableFields}
          onDataChanged={handleEditorDataChanged}
          layoutMode={layoutMode}
        />
      ) : null}
      {lookups && accountMoveTarget ? (
        <AccountMoveDialog
          open
          onClose={() => setAccountMoveTarget(null)}
          account={accountMoveTarget}
          lookups={lookups}
          onSuccess={() => { setAccountMoveTarget(null); void load(); }}
          layoutMode={layoutMode}
        />
      ) : null}
    </PageFrame>
  );
}
