'use client';

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
  fetchMaintenanceList,
  fetchPublicMasterLookups,
  getGameManagementErrorMessage,
} from '@/lib/game-management/api';
import {
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
import MaintenanceRecordsSection, { type MaintenanceFormState, type MaintenanceResourceKey } from './MaintenanceRecordsSection';
import { PageFrame, PageSection, TrialBanner } from './shared';

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
  latestDate: string;
  edit: string;
  maintenanceSummary: MaintenanceSummaryDto;
};

type LatestMaintenanceRecord = {
  maintenanceDate: string;
  memo: string | null;
};

type LatestMaintenanceRecords = Record<string, LatestMaintenanceRecord>;

type MaintenanceDialogState = {
  targets: MaintenanceTargetRow[];
  index: number;
  autoAdvance: boolean;
  initialFormState?: MaintenanceFormState;
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

export function buildMaintenanceTargets(
  lookups: ManagementLookups,
  filter: MaintenanceHealthFilter,
  latestMaintenanceRecords: LatestMaintenanceRecords = {},
): MaintenanceTargetRow[] {
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
        summary: latestMaintenanceRecords[`game-consoles:${item.id}`]?.memo?.trim() || 'メモなし',
        health: getMaintenanceHealthStatusLabel(item.maintenance.latestHealthStatus),
        nextDate: formatMaintenanceDate(item.maintenance.nextMaintenanceDate),
        latestDate: formatMaintenanceDate(
          latestMaintenanceRecords[`game-consoles:${item.id}`]?.maintenanceDate ?? item.maintenance.lastMaintenanceDate,
        ),
        edit: 'メンテナンス',
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
        summary: latestMaintenanceRecords[`game-softwares:${item.id}`]?.memo?.trim() || 'メモなし',
        health: getMaintenanceHealthStatusLabel(item.maintenance.latestHealthStatus),
        nextDate: formatMaintenanceDate(item.maintenance.nextMaintenanceDate),
        latestDate: formatMaintenanceDate(
          latestMaintenanceRecords[`game-softwares:${item.id}`]?.maintenanceDate ?? item.maintenance.lastMaintenanceDate,
        ),
        edit: 'メンテナンス',
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
        summary: latestMaintenanceRecords[`memory-cards:${item.id}`]?.memo?.trim() || 'メモなし',
        health: getMaintenanceHealthStatusLabel(item.maintenance.latestHealthStatus),
        nextDate: formatMaintenanceDate(item.maintenance.nextMaintenanceDate),
        latestDate: formatMaintenanceDate(
          latestMaintenanceRecords[`memory-cards:${item.id}`]?.maintenanceDate ?? item.maintenance.lastMaintenanceDate,
        ),
        edit: 'メンテナンス',
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

export function getMaintenanceTargetColumns(
  onEdit: (row: MaintenanceTargetRow) => void,
): DataTableColumn<MaintenanceTargetRow>[] {
  return [
    { key: 'resourceLabel', header: '種別', sortable: true, filterable: true, filterMode: 'select', width: '9rem' },
    { key: 'name', header: '対象', sortable: true, filterable: true, width: '14rem' },
    { key: 'health', header: '状態', sortable: true, filterable: true, filterMode: 'select', width: '8rem' },
    { key: 'nextDate', header: '次回目安', sortable: true, filterable: true, filterMode: 'select', width: '8rem' },
    { key: 'summary', header: '最新サマリー', filterable: true, width: '16rem' },
    { key: 'latestDate', header: '最新日', sortable: true, filterable: true, filterMode: 'select', width: '9rem' },
    {
      key: 'edit',
      header: '操作',
      width: '8rem',
      render: (_value, row) => (
        <button
          type="button"
          onClick={() => onEdit(row)}
          className="tool-inline-link"
        >
          メンテナンス
        </button>
      ),
    },
  ];
}

export default function MaintenanceDashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const sessionReady = sessionStatus !== 'loading';
  const isTrial = !session?.user;
  const layoutMode = useResponsiveLayoutMode();
  const [lookups, setLookups] = useState<ManagementLookups | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [maintenanceHealthFilter, setMaintenanceHealthFilter] = useState<MaintenanceHealthFilter>('All');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [dialogState, setDialogState] = useState<MaintenanceDialogState | null>(null);
  const [latestMaintenanceRecords, setLatestMaintenanceRecords] = useState<LatestMaintenanceRecords>({});

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
    if (!sessionReady) return;
    void load();
  }, [load, sessionReady]);

  useEffect(() => {
    if (!lookups || isTrial) {
      setLatestMaintenanceRecords({});
      return;
    }

    let cancelled = false;
    const targets = [
      ...lookups.gameConsoles.filter((item) => item.maintenance.hasRecord)
        .map((item) => ({ key: `game-consoles:${item.id}`, resourceKey: 'game-consoles' as const, id: item.id })),
      ...lookups.gameSoftwares.filter((item) => item.maintenance.hasRecord)
        .map((item) => ({ key: `game-softwares:${item.id}`, resourceKey: 'game-softwares' as const, id: item.id })),
      ...lookups.memoryCards.filter((item) => item.maintenance.hasRecord)
        .map((item) => ({ key: `memory-cards:${item.id}`, resourceKey: 'memory-cards' as const, id: item.id })),
    ];

    const loadLatestMaintenanceRecords = async () => {
      const latestRecords: LatestMaintenanceRecords = {};
      for (let index = 0; index < targets.length; index += 6) {
        const batch = targets.slice(index, index + 6);
        const results = await Promise.allSettled(batch.map(async (target) => {
          const records = await fetchMaintenanceList(target.resourceKey, target.id);
          const latestRecord = records
            .filter((record) => !record.isDeleted)
            .sort((left, right) => (
              right.maintenanceDate.localeCompare(left.maintenanceDate)
              || right.id - left.id
            ))[0];
          return latestRecord ? {
            key: target.key,
            record: { maintenanceDate: latestRecord.maintenanceDate, memo: latestRecord.memo },
          } : null;
        }));
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            latestRecords[result.value.key] = result.value.record;
          }
        });
      }
      if (!cancelled) setLatestMaintenanceRecords(latestRecords);
    };

    void loadLatestMaintenanceRecords();
    return () => {
      cancelled = true;
    };
  }, [isTrial, lookups]);

  const rows = useMemo(
    () => (lookups ? buildMaintenanceTargets(lookups, maintenanceHealthFilter, latestMaintenanceRecords) : []),
    [lookups, maintenanceHealthFilter, latestMaintenanceRecords],
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

  const handleSaved = useCallback((mode: 'create' | 'update', values: MaintenanceFormState) => {
    void load();

    setDialogState((current) => {
      if (!current || !current.autoAdvance || mode !== 'create') {
        return current;
      }

      if (current.index >= current.targets.length - 1) {
        setQueueMessage(`${current.targets.length} 件のメンテナンス記録を保存しました。`);
        return null;
      }

      return {
        ...current,
        index: current.index + 1,
        initialFormState: values,
      };
    });
  }, [load]);

  const columns = useMemo(() => getMaintenanceTargetColumns((row) => (
    setDialogState({ targets: [row], index: 0, autoAdvance: false })
  )), []);

  return (
    <PageFrame
      eyebrowLabel=""
      title="メンテナンス"
      description="ゲーム機・ソフト・メモリーカードのメンテナンスを確認・記録します。"
      layoutMode={layoutMode}
      navigationActiveHref="/game-library/maintenance"
      stickyActions={(
        <CustomButton
          variant="accent"
          disabled={queueTargets.length === 0}
          onClick={() => setDialogState({ targets: queueTargets, index: 0, autoAdvance: true })}
        >
          保存（{queueTargets.length}件）
        </CustomButton>
      )}
      actions={(
        <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={2} align="end">
          <CustomButton onClick={() => void load()}>
            再読込
          </CustomButton>
        </ResponsiveActionGroup>
      )}
    >
      {isTrial || error || queueMessage ? (
        <div className="tool-page__notices">
          {isTrial ? <TrialBanner /> : null}
          {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
          {queueMessage ? <CustomMessageArea variant="success">{queueMessage}</CustomMessageArea> : null}
        </div>
      ) : null}
      {loading ? (
        <p className="tool-muted text-sm" role="status">メンテナンス対象を読み込んでいます...</p>
      ) : (
        <>
          <PageSection title="絞り込み">
            <div className="tool-filter">
              <div className="space-y-2">
                <CustomLabel htmlFor="maintenance-dashboard-filter">メンテナンス状態</CustomLabel>
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
              <p className="m-0 text-sm leading-6 text-[var(--color-text-muted)]">
                一覧から対象を複数選択すると、メンテナンス記録を続けて保存できます。
              </p>
            </div>
          </PageSection>
          <PageSection title="メンテナンス対象">
            <div className="tool-toolbar">
              <div className="tool-toolbar__meta">
                <span>表示件数: {rows.length} 件</span>
                <span>選択中: {queueTargets.length} 件</span>
              </div>
            </div>
            <DataTable
              title="メンテナンス対象一覧"
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
              emptyMessage="メンテナンス対象がありません。"
            />
          </PageSection>
        </>
      )}
      <Dialog
        open={activeTarget != null}
        onClose={() => setDialogState(null)}
        title={activeTarget ? `${activeTarget.resourceLabel}のメンテナンス` : 'メンテナンス'}
        size="lg"
        footer={(
          <DialogFooterLayout
            layoutMode={layoutMode}
            status={dialogState?.autoAdvance && activeTarget ? (
              <span role="status" aria-live="polite" className="text-xs text-[var(--color-text-muted)]">
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
            <div className="notice text-sm text-[var(--color-text-muted)]">
              <p className="m-0 font-semibold text-[var(--color-text-strong)]">{activeTarget.name}</p>
              <p className="m-0">{activeTarget.detail}</p>
              <p className="mt-2 mb-0">{activeTarget.summary}</p>
            </div>
            <MaintenanceRecordsSection
              key={`${activeTarget.tableRowKey}:${dialogState?.index ?? 0}`}
              resourceKey={activeTarget.resourceKey}
              parentId={activeTarget.id}
              summary={activeTarget.maintenanceSummary}
              targetName={activeTarget.name}
              trialMode={isTrial}
              autoOpenCreateOnMount={Boolean(dialogState?.autoAdvance) && !isTrial}
              initialFormState={dialogState?.initialFormState}
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
