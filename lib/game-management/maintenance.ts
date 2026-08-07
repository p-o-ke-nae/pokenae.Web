import type {
  MaintenanceHealthFilter,
  MaintenanceHealthStatus,
  MaintenanceSummaryDto,
  ResourceKey,
} from './types';

export const MAINTENANCE_FILTER_OPTIONS: Array<{ value: MaintenanceHealthFilter; label: string }> = [
  { value: 'All', label: 'すべて表示' },
  { value: 'ExcludeUnhealthy', label: '起動不調を除外' },
  { value: 'OnlyUnhealthy', label: '起動不調のみ' },
];

export function supportsMaintenance(resourceKey: ResourceKey): resourceKey is 'game-consoles' | 'game-softwares' | 'memory-cards' {
  return resourceKey === 'game-consoles' || resourceKey === 'game-softwares' || resourceKey === 'memory-cards';
}

export function getMaintenanceHealthStatusLabel(status: MaintenanceHealthStatus): string {
  switch (status) {
    case 1:
      return '正常';
    case 2:
      return '起動不調';
    default:
      return '未確認';
  }
}

export function formatMaintenanceDate(value: string | null): string {
  if (!value) {
    return '未記録';
  }

  return value.slice(0, 10).replace(/-/g, '/');
}

export function buildMaintenanceSummaryText(summary: MaintenanceSummaryDto | null | undefined): string {
  if (!summary || !summary.hasRecord) {
    return '保守: 記録なし';
  }

  const parts = [
    `保守: ${getMaintenanceHealthStatusLabel(summary.latestHealthStatus)}`,
    `最終: ${formatMaintenanceDate(summary.lastMaintenanceDate)}`,
    `次回: ${formatMaintenanceDate(summary.nextMaintenanceDate)}`,
  ];

  if (summary.isOverdue) {
    parts.push('期限超過');
  }

  return parts.join(' / ');
}
