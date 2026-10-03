import { describe, expect, it } from 'vitest';

import {
  buildMaintenanceSummaryText,
  getMaintenanceHealthStatusLabel,
  isMaintenanceDateInFuture,
  supportsMaintenance,
} from './maintenance';

describe('game-management maintenance helpers', () => {
  it('detects maintenance-capable resources', () => {
    expect(supportsMaintenance('game-consoles')).toBe(true);
    expect(supportsMaintenance('game-softwares')).toBe(true);
    expect(supportsMaintenance('memory-cards')).toBe(true);
    expect(supportsMaintenance('accounts')).toBe(false);
  });

  it('formats maintenance summaries with status and overdue information', () => {
    expect(buildMaintenanceSummaryText({
      hasRecord: true,
      intervalDays: 365,
      lastMaintenanceDate: '2026-05-01',
      nextMaintenanceDate: '2026-06-01',
      isOverdue: true,
      latestHealthStatus: 2,
    })).toBe('メンテナンス: 起動不調 / 最終: 2026/05/01 / 次回: 2026/06/01 / 期限超過');
  });

  it('shows a clear message when no maintenance exists', () => {
    expect(buildMaintenanceSummaryText({
      hasRecord: false,
      intervalDays: 365,
      lastMaintenanceDate: null,
      nextMaintenanceDate: null,
      isOverdue: false,
      latestHealthStatus: 0,
    })).toBe('メンテナンス: 記録なし');
    expect(getMaintenanceHealthStatusLabel(0)).toBe('未確認');
  });

  it('accepts today and rejects only future maintenance dates', () => {
    expect(isMaintenanceDateInFuture('2026-10-04', '2026-10-04')).toBe(false);
    expect(isMaintenanceDateInFuture('2026-10-05', '2026-10-04')).toBe(true);
  });
});
