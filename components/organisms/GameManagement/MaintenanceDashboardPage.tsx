'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import CustomButton from '@/components/atoms/CustomButton';
import CustomComboBox from '@/components/atoms/CustomComboBox';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import DataTable, { DATA_TABLE_DEFAULT_PAGE_HEIGHT, type DataTableColumn } from '@/components/molecules/DataTable';
import Dialog, { DialogFooterLayout } from '@/components/molecules/Dialog';
import ResponsiveActionGroup from '@/components/molecules/ResponsiveActionGroup';
import {
  fetchAuthenticatedUserLookups,
  fetchPublicMasterLookups,
  getGameManagementErrorMessage,
} from '@/lib/game-management/api';
import {
  buildMaintenanceSummaryText,
  formatMaintenanceDate,
  getMaintenanceHealthStatusLabel,
  MAINTENANCE_FILTER_OPTIONS,
} from '@/lib/game-management/maintenance';
import { buildTrialUserData } from '@/lib/game-management/trial';
import type {
  MaintenanceHealthFilter,
  MaintenanceSummaryDto,
  ManagementLookups,
} from '@/lib/game-management/types';
import { useResponsiveLayoutMode } from '@/lib/hooks/useResponsiveLayoutMode';
import resources from '@/lib/resources';
import {
  getGameConsoleDisplay,
  getGameConsoleMasterName,
  getGameSoftwareDisplay,
  getGameSoftwareMasterName,
  getMemoryCardDisplay,
  getMemoryCardEditionMasterName,
} from './helpers';
import MaintenanceRecordsSection, { type MaintenanceResourceKey } from './MaintenanceRecordsSection';
import { PageCard, PageFrame, TrialBanner } from './shared';

type MaintenanceTargetRow = {
  tableRowKey: string;
  id: number;
  resourceKey: MaintenanceResourceKey;
  resourceLabel: string;
  name: string;
  detail: string;
  summary: string;
  health: string;
  nextDate: string;
  edit: string;
  maintenanceSummary: MaintenanceSummaryDto;
};

type MaintenanceDialogState = {
  targets: MaintenanceTargetRow[];
  index: number;
  autoAdvance: boolean;
};

function matchesMaintenanceFilter(summary: MaintenanceSummaryDto, filter: MaintenanceHealthFilter): boolean {
  switch (filter) {
    case 'ExcludeUnhealthy':
      return summary.latestHealthStatus !== 2;
    case 'OnlyUnhealthy':
      return summary.latestHealthStatus === 2;
    default:
      return true;
  }
}

function buildMaintenanceTargets(lookups: ManagementLookups, filter: MaintenanceHealthFilter): MaintenanceTargetRow[] {
  const rows: MaintenanceTargetRow[] = [
    ...lookups.gameConsoles
      .filter((item) => matchesMaintenanceFilter(item.maintenance, filter))
      .map((item) => ({
        tableRowKey: `game-consoles:${item.id}`,
        id: item.id,
        resourceKey: 'game-consoles' as const,
        resourceLabel: 'ゲーム機',
        name: getGameConsoleDisplay(item, lookups),
        detail: getGameConsoleMasterName(item.gameConsoleMasterId, lookups),
        summary: buildMaintenanceSummaryText(item.maintenance),
        health: getMaintenanceHealthStatusLabel(item.maintenance.latestHealthStatus),
        nextDate: formatMaintenanceDate(item.maintenance.nextMaintenanceDate),
        edit: '履歴を見る',
        maintenanceSummary: item.maintenance,
      })),
    ...lookups.gameSoftwares
      .filter((item) => matchesMaintenanceFilter(item.maintenance, filter))
      .map((item) => ({
        tableRowKey: `game-softwares:${item.id}`,
        id: item.id,
        resourceKey: 'game-softwares' as const,
        resourceLabel: 'ゲームソフト',
        name: getGameSoftwareDisplay(item, lookups),
        detail: [
          getGameSoftwareMasterName(item.gameSoftwareMasterId, lookups),
          item.variant == null ? null : item.variant === 0 ? 'パッケージ版' : 'ダウンロード版',
        ].filter(Boolean).join(' / '),
        summary: buildMaintenanceSummaryText(item.maintenance),
        health: getMaintenanceHealthStatusLabel(item.maintenance.latestHealthStatus),
        nextDate: formatMaintenanceDate(item.maintenance.nextMaintenanceDate),
        edit: '履歴を見る',
        maintenanceSummary: item.maintenance,
      })),
    ...lookups.memoryCards
      .filter((item) => matchesMaintenanceFilter(item.maintenance, filter))
      .map((item) => ({
        tableRowKey: `memory-cards:${item.id}`,
        id: item.id,
        resourceKey: 'memory-cards' as const,
        resourceLabel: 'メモリーカード',
        name: getMemoryCardDisplay(item, lookups),
        detail: getMemoryCardEditionMasterName(item.memoryCardEditionMasterId, lookups),
        summary: buildMaintenanceSummaryText(item.maintenance),
        health: getMaintenanceHealthStatusLabel(item.maintenance.latestHealthStatus),
        nextDate: formatMaintenanceDate(item.maintenance.nextMaintenanceDate),
        edit: '履歴を見る',
        maintenanceSummary: item.maintenance,
      })),
  ];

  return rows.sort((left, right) => {
    const overdueDelta = Number(right.maintenanceSummary.isOverdue) - Number(left.maintenanceSummary.isOverdue);
    if (overdueDelta !== 0) {
      return overdueDelta;
    }

    const healthDelta = right.maintenanceSummary.latestHealthStatus - left.maintenanceSummary.latestHealthStatus;
    if (healthDelta !== 0) {
      return healthDelta;
    }

    const leftDate = left.maintenanceSummary.nextMaintenanceDate ?? '9999-12-31';
    const rightDate = right.maintenanceSummary.nextMaintenanceDate ?? '9999-12-31';
    return leftDate.localeCompare(rightDate, 'ja') || left.id - right.id;
  });
}

export default function MaintenanceDashboardPage() {
  const { data: session } = useSession();
  const isTrial = !session?.user;
  const layoutMode = useResponsiveLayoutMode();
  const [lookups, setLookups] = useState<ManagementLookups | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [maintenanceHealthFilter, setMaintenanceHealthFilter] = useState<MaintenanceHealthFilter>('All');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [dialogState, setDialogState] = useState<MaintenanceDialogState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = isTrial
        ? { ...await fetchPublicMasterLookups(), ...buildTrialUserData() }
        : await fetchAuthenticatedUserLookups({ maintenanceHealthFilter });
      setLookups(result);
    } catch (loadError) {
      setError(getGameManagementErrorMessage(loadError, {
        fallback: resources.gameManagement.errors.listLoad,
      }));
    } finally {
      setLoading(false);
    }
  }, [isTrial, maintenanceHealthFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(
    () => (lookups ? buildMaintenanceTargets(lookups, maintenanceHealthFilter) : []),
    [lookups, maintenanceHealthFilter],
  );

  const rowMap = useMemo(
    () => new Map(rows.map((row) => [row.tableRowKey, row])),
    [rows],
  );

  const queueTargets = useMemo(
    () => rows.filter((row) => selectedKeys.includes(row.tableRowKey)),
    [rows, selectedKeys],
  );

  const dialogTargets = useMemo(
    () => dialogState?.targets.map((target) => rowMap.get(target.tableRowKey) ?? target) ?? [],
    [dialogState, rowMap],
  );

  const activeTarget = dialogState ? dialogTargets[dialogState.index] ?? null : null;

  const handleSaved = useCallback((mode: 'create' | 'update') => {
    void load();

    setDialogState((current) => {
      if (!current || !current.autoAdvance || mode !== 'create') {
        return current;
      }

      if (current.index >= current.targets.length - 1) {
        setQueueMessage(`${current.targets.length} 件の保守記録キューを完了しました。`);
        return null;
      }

      return {
        ...current,
        index: current.index + 1,
      };
    });
  }, [load]);

  const columns = useMemo<DataTableColumn<MaintenanceTargetRow>[]>(() => [
    { key: 'resourceLabel', header: '種別', sortable: true, filterable: true, filterMode: 'select', width: '9rem' },
    { key: 'name', header: '対象', sortable: true, filterable: true, width: '14rem' },
    { key: 'detail', header: '詳細', filterable: true, width: '16rem' },
    { key: 'health', header: '状態', sortable: true, filterable: true, filterMode: 'select', width: '8rem' },
    { key: 'nextDate', header: '次回目安', sortable: true, filterable: true, filterMode: 'select', width: '8rem' },
    { key: 'summary', header: '最新サマリー', filterable: true },
    {
      key: 'edit',
      header: '操作',
      width: '8rem',
      render: (_value, row) => (
        <button
          type="button"
          onClick={() => setDialogState({ targets: [row], index: 0, autoAdvance: false })}
          className="text-sm font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
        >
          履歴を見る
        </button>
      ),
    },
  ], []);

  return (
    <PageFrame
      eyebrowLabel="Game Library"
      title="保守履歴"
      description="ゲーム機・ゲームソフト・メモリーカードの最新保守状態を横断表示し、選択した対象を順次記録できます。"
      layoutMode={layoutMode}
      actions={(
        <>
          <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1}>
            <Link href="/game-library" className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300">
              ダッシュボードへ戻る
            </Link>
          </ResponsiveActionGroup>
          <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1} align="end">
            <CustomButton
              variant="accent"
              disabled={queueTargets.length === 0}
              onClick={() => setDialogState({ targets: queueTargets, index: 0, autoAdvance: true })}
            >
              選択した {queueTargets.length} 件を順次記録
            </CustomButton>
            <CustomButton onClick={() => void load()}>
              再読み込み
            </CustomButton>
          </ResponsiveActionGroup>
        </>
      )}
    >
      {isTrial ? <TrialBanner /> : null}
      {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
      {queueMessage ? <CustomMessageArea variant="success">{queueMessage}</CustomMessageArea> : null}
      <PageCard>
        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-300">保守対象を読み込んでいます...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60 md:grid-cols-[minmax(0,20rem)_1fr] md:items-end">
              <div className="space-y-2">
                <CustomLabel htmlFor="maintenance-dashboard-filter">保守状態</CustomLabel>
                <CustomComboBox
                  id="maintenance-dashboard-filter"
                  value={maintenanceHealthFilter}
                  onChange={(event) => setMaintenanceHealthFilter(event.target.value as MaintenanceHealthFilter)}
                >
                  {MAINTENANCE_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </CustomComboBox>
              </div>
              <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-300">
                一覧から対象を複数選択すると、保守記録ダイアログを順番に開いて記録できます。
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
              <span>表示件数: {rows.length} 件</span>
              <span>選択中: {queueTargets.length} 件</span>
            </div>
            <DataTable
              title="保守対象一覧"
              columns={columns}
              data={rows}
              filterOptionsData={rows}
              height={DATA_TABLE_DEFAULT_PAGE_HEIGHT}
              rowKey="tableRowKey"
              selectable
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
              paginated
              resizable
              emptyMessage="保守対象がありません。"
            />
          </div>
        )}
      </PageCard>
      <Dialog
        open={activeTarget != null}
        onClose={() => setDialogState(null)}
        title={activeTarget ? `${activeTarget.resourceLabel}の保守履歴` : '保守履歴'}
        size="lg"
        footer={(
          <DialogFooterLayout
            layoutMode={layoutMode}
            status={dialogState?.autoAdvance && activeTarget ? (
              <span role="status" aria-live="polite" className="text-xs text-zinc-500 dark:text-zinc-300">
                {dialogState.index + 1} / {dialogTargets.length} 件目
              </span>
            ) : null}
            trailing={(
              <CustomButton variant="neutral" onClick={() => setDialogState(null)}>
                閉じる
              </CustomButton>
            )}
          />
        )}
      >
        {activeTarget ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
              <p className="font-semibold text-zinc-800 dark:text-zinc-100">{activeTarget.name}</p>
              <p>{activeTarget.detail}</p>
              <p className="mt-2">{activeTarget.summary}</p>
            </div>
            <MaintenanceRecordsSection
              key={`${activeTarget.tableRowKey}:${dialogState?.index ?? 0}`}
              resourceKey={activeTarget.resourceKey}
              parentId={activeTarget.id}
              summary={activeTarget.maintenanceSummary}
              trialMode={isTrial}
              autoOpenCreateOnMount={Boolean(dialogState?.autoAdvance) && !isTrial}
              layoutMode={layoutMode}
              onChanged={() => { void load(); }}
              onSaved={handleSaved}
            />
          </div>
        ) : null}
      </Dialog>
    </PageFrame>
  );
}
