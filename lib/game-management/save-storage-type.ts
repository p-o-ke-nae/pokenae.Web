import type { SaveStorageType } from '@/lib/game-management/types';

export const SAVE_STORAGE_TYPE_LABELS: Record<SaveStorageType, string> = {
  0: 'ソフト保存',
  1: '本体保存',
  2: '本体＋アカウント保存',
  3: 'メモリーカード保存',
};

export function formatSaveStorageType(value: SaveStorageType | null | undefined): string {
  if (value == null) {
    return '未判定';
  }

  return SAVE_STORAGE_TYPE_LABELS[value] ?? '不明';
}