/**
 * トライアルデータ → サーバ移行サービス
 *
 * trial-storage の localStorage データを読み取り、選択された項目だけを
 * 既存の認証済み API（createAccount, createGameConsole 等）でサーバに送信する。
 * 送信順は依存関係に従い、trial ID → server ID の対応表で外部キーを解決する。
 */

import { createResource } from '@/lib/game-management/api';
import {
  trialListAccounts,
  trialListGameConsoles,
  trialListGameSoftwares,
  trialListMemoryCards,
  trialListSaveDatas,
  trialRemoveByIds,
} from '@/lib/game-management/trial';
import type {
  AccountDto,
  GameConsoleDto,
  GameSoftwareDto,
  MemoryCardDto,
  SaveDataDto,
} from '@/lib/game-management/types';
import { convertValueFieldsToInputs } from '@/lib/game-management/save-data-fields';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export type TrialResourceKey =
  | 'game-consoles'
  | 'game-softwares'
  | 'accounts'
  | 'memory-cards'
  | 'save-datas';

/** インポート順（依存先 → 依存元） */
export const IMPORT_ORDER: TrialResourceKey[] = [
  'game-consoles',
  'game-softwares',
  'accounts',
  'memory-cards',
  'save-datas',
];

export type TrialItemSummary = {
  trialId: number;
  resourceKey: TrialResourceKey;
  label: string;
  isDeleted: boolean;
};

export type ImportItemResult = {
  trialId: number;
  resourceKey: TrialResourceKey;
  status: 'success' | 'skipped' | 'error';
  serverId?: number;
  reason?: string;
};

export type ImportResult = {
  items: ImportItemResult[];
  successCount: number;
  skipCount: number;
  errorCount: number;
};

// ---------------------------------------------------------------------------
// 一覧取得（ダイアログ表示用）
// ---------------------------------------------------------------------------

function accountLabel(item: AccountDto): string {
  return item.label || `アカウント #${item.id}`;
}

function gameConsoleLabel(item: GameConsoleDto): string {
  return item.label || `ゲーム機 #${item.id}`;
}

function gameSoftwareLabel(item: GameSoftwareDto): string {
  return item.label || `ゲームソフト #${item.id}`;
}

function memoryCardLabel(item: MemoryCardDto): string {
  return item.label || `メモリーカード #${item.id}`;
}

function saveDataLabel(item: SaveDataDto): string {
  return `セーブデータ #${item.id}`;
}

export function getTrialSummary(): TrialItemSummary[] {
  const items: TrialItemSummary[] = [];

  for (const item of trialListGameConsoles()) {
    items.push({ trialId: item.id, resourceKey: 'game-consoles', label: gameConsoleLabel(item), isDeleted: item.isDeleted });
  }
  for (const item of trialListGameSoftwares()) {
    items.push({ trialId: item.id, resourceKey: 'game-softwares', label: gameSoftwareLabel(item), isDeleted: item.isDeleted });
  }
  for (const item of trialListAccounts()) {
    items.push({ trialId: item.id, resourceKey: 'accounts', label: accountLabel(item), isDeleted: item.isDeleted });
  }
  for (const item of trialListMemoryCards()) {
    items.push({ trialId: item.id, resourceKey: 'memory-cards', label: memoryCardLabel(item), isDeleted: item.isDeleted });
  }
  for (const item of trialListSaveDatas()) {
    items.push({ trialId: item.id, resourceKey: 'save-datas', label: saveDataLabel(item), isDeleted: item.isDeleted });
  }

  return items;
}

// ---------------------------------------------------------------------------
// リソース別ラベル定義
// ---------------------------------------------------------------------------

export const RESOURCE_LABELS: Record<TrialResourceKey, string> = {
  'game-consoles': 'ゲーム機',
  'game-softwares': 'ゲームソフト',
  'accounts': 'アカウント',
  'memory-cards': 'メモリーカード',
  'save-datas': 'セーブデータ',
};

// ---------------------------------------------------------------------------
// インポート実行
// ---------------------------------------------------------------------------

type IdMap = Map<number, number>;

export async function importSelectedItems(
  selectedIds: Map<TrialResourceKey, Set<number>>,
): Promise<ImportResult> {
  const idMaps: Record<TrialResourceKey, IdMap> = {
    'game-consoles': new Map(),
    'game-softwares': new Map(),
    'accounts': new Map(),
    'memory-cards': new Map(),
    'save-datas': new Map(),
  };

  const results: ImportItemResult[] = [];

  // --- GameConsoles ---
  const gcSelected = selectedIds.get('game-consoles') ?? new Set<number>();
  for (const item of trialListGameConsoles()) {
    if (!gcSelected.has(item.id)) continue;
    try {
      const serverId = await createResource('game-consoles', {
        gameConsoleMasterId: item.gameConsoleMasterId,
        gameConsoleEditionMasterId: item.gameConsoleEditionMasterId,
        displayOrder: item.displayOrder,
        label: item.label,
        memo: item.memo,
      });
      idMaps['game-consoles'].set(item.id, serverId);
      results.push({ trialId: item.id, resourceKey: 'game-consoles', status: 'success', serverId });
    } catch (error) {
      results.push({ trialId: item.id, resourceKey: 'game-consoles', status: 'error', reason: String(error) });
    }
  }

  // --- GameSoftwares ---
  const gsSelected = selectedIds.get('game-softwares') ?? new Set<number>();
  for (const item of trialListGameSoftwares()) {
    if (!gsSelected.has(item.id)) continue;
    try {
      const serverId = await createResource('game-softwares', {
        gameSoftwareMasterId: item.gameSoftwareMasterId,
        variant: item.variant,
        displayOrder: item.displayOrder,
        label: item.label,
        memo: item.memo,
      });
      idMaps['game-softwares'].set(item.id, serverId);
      results.push({ trialId: item.id, resourceKey: 'game-softwares', status: 'success', serverId });
    } catch (error) {
      results.push({ trialId: item.id, resourceKey: 'game-softwares', status: 'error', reason: String(error) });
    }
  }

  // --- Accounts ---
  const acSelected = selectedIds.get('accounts') ?? new Set<number>();
  for (const item of trialListAccounts()) {
    if (!acSelected.has(item.id)) continue;
    try {
      const serverId = await createResource('accounts', {
        accountTypeMasterId: item.accountTypeMasterId,
        displayOrder: item.displayOrder,
        label: item.label,
        memo: item.memo,
      });
      idMaps['accounts'].set(item.id, serverId);
      results.push({ trialId: item.id, resourceKey: 'accounts', status: 'success', serverId });
    } catch (error) {
      results.push({ trialId: item.id, resourceKey: 'accounts', status: 'error', reason: String(error) });
    }
  }

  // --- MemoryCards ---
  const mcSelected = selectedIds.get('memory-cards') ?? new Set<number>();
  for (const item of trialListMemoryCards()) {
    if (!mcSelected.has(item.id)) continue;
    try {
      const serverId = await createResource('memory-cards', {
        memoryCardEditionMasterId: item.memoryCardEditionMasterId,
        displayOrder: item.displayOrder,
        label: item.label,
        memo: item.memo,
      });
      idMaps['memory-cards'].set(item.id, serverId);
      results.push({ trialId: item.id, resourceKey: 'memory-cards', status: 'success', serverId });
    } catch (error) {
      results.push({ trialId: item.id, resourceKey: 'memory-cards', status: 'error', reason: String(error) });
    }
  }

  // --- SaveDatas ---
  const sdSelected = selectedIds.get('save-datas') ?? new Set<number>();
  for (const item of trialListSaveDatas()) {
    if (!sdSelected.has(item.id)) continue;

    // 外部キーをリマッピング
    const gameSoftwareTrialId = item.gameSoftwareId;
    const gameConsoleTrialId = item.gameConsoleId;
    const accountTrialId = item.accountId;
    const memoryCardTrialId = item.memoryCardId;

    const gameSoftwareId = gameSoftwareTrialId != null ? idMaps['game-softwares'].get(gameSoftwareTrialId) : undefined;
    const gameConsoleId = gameConsoleTrialId != null ? idMaps['game-consoles'].get(gameConsoleTrialId) : undefined;
    const accountId = accountTrialId != null ? idMaps['accounts'].get(accountTrialId) : undefined;
    const memoryCardId = memoryCardTrialId != null ? idMaps['memory-cards'].get(memoryCardTrialId) : undefined;

    if (item.saveStorageType === 0 && gameSoftwareId == null) {
      results.push({
        trialId: item.id,
        resourceKey: 'save-datas',
        status: 'skipped',
        reason: '依存先のゲームソフトが未インポートです。',
      });
      continue;
    }

    // saveStorageType に応じた必須依存チェック
    if (item.saveStorageType === 1 && gameConsoleId == null) {
      results.push({ trialId: item.id, resourceKey: 'save-datas', status: 'skipped', reason: '依存先のゲーム機が未インポートです。' });
      continue;
    }
    if (item.saveStorageType === 2 && (gameConsoleId == null || accountId == null)) {
      results.push({ trialId: item.id, resourceKey: 'save-datas', status: 'skipped', reason: '依存先のゲーム機またはアカウントが未インポートです。' });
      continue;
    }
    if (item.saveStorageType === 3 && memoryCardId == null) {
      results.push({ trialId: item.id, resourceKey: 'save-datas', status: 'skipped', reason: '依存先のメモリーカードが未インポートです。' });
      continue;
    }

    try {
      const serverId = await createResource('save-datas', {
        gameSoftwareMasterId: item.gameSoftwareMasterId,
        gameSoftwareId: item.saveStorageType === 0 ? (gameSoftwareId ?? null) : null,
        gameConsoleId: gameConsoleId ?? null,
        accountId: accountId ?? null,
        memoryCardId: memoryCardId ?? null,
        storyProgressDefinitionId: item.storyProgressDefinitionId,
        memo: item.memo,
        displayOrder: item.displayOrder,
        extendedFields: convertValueFieldsToInputs(item.extendedFields),
      });
      idMaps['save-datas'].set(item.id, serverId);
      results.push({ trialId: item.id, resourceKey: 'save-datas', status: 'success', serverId });
    } catch (error) {
      results.push({ trialId: item.id, resourceKey: 'save-datas', status: 'error', reason: String(error) });
    }
  }

  // 成功分を localStorage から削除
  for (const key of IMPORT_ORDER) {
    const successIds = new Set(
      results
        .filter((r) => r.resourceKey === key && r.status === 'success')
        .map((r) => r.trialId),
    );
    if (successIds.size > 0) {
      trialRemoveByIds(key, successIds);
    }
  }

  const successCount = results.filter((r) => r.status === 'success').length;
  const skipCount = results.filter((r) => r.status === 'skipped').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return { items: results, successCount, skipCount, errorCount };
}
