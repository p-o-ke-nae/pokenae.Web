import { describe, expect, it } from 'vitest';
import { buildMaintenanceTargets, getMaintenanceTargetColumns } from './MaintenanceDashboardPage';
import type { ManagementLookups } from '@/lib/game-management/types';

describe('maintenance dashboard table', () => {
  const lookups = {
    gameConsoleMasters: [{ id: 1, abbreviation: 'Console' }],
    gameConsoles: [{
      id: 10,
      gameConsoleMasterId: 1,
      gameConsoleEditionMasterId: null,
      ownerGoogleUserId: 'owner',
      displayOrder: 1,
      label: 'My console',
      memo: null,
      isDeleted: false,
      maintenance: {
        hasRecord: true,
        intervalDays: 365,
        lastMaintenanceDate: '2026-10-01T00:00:00Z',
        nextMaintenanceDate: '2027-10-01T00:00:00Z',
        isOverdue: false,
        latestHealthStatus: 1,
      },
    }],
    gameSoftwares: [],
    memoryCards: [],
  } as unknown as ManagementLookups;

  it('shows the latest maintenance memo and date in the target row', () => {
    const rows = buildMaintenanceTargets(lookups, 'All', {
      'game-consoles:10': {
        maintenanceDate: '2026-10-02T00:00:00Z',
        memo: '最新の記録メモ',
      },
    });

    expect(rows[0]).toMatchObject({
      summary: '最新の記録メモ',
      latestDate: '2026/10/02',
    });
  });

  it('places the latest date after the summary and removes the detail column', () => {
    const columns = getMaintenanceTargetColumns(() => {});
    const headers = columns.map((column) => column.header);

    expect(headers.indexOf('最新日')).toBe(headers.indexOf('最新サマリー') + 1);
    expect(headers).not.toContain('詳細');
  });
});
