'use client';

/**
 * TrialImportDialog - ログイン後に trial データの移行を促す複合ダイアログ
 *
 * フェーズ:
 *  1. confirm  — trial データ一覧を表示し、サーバ反映するか確認
 *  2. result   — インポート結果を表示
 *  3. discard  — 「いいえ」時に localStorage を破棄するか確認
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Dialog from '@/components/molecules/Dialog';
import CustomButton from '@/components/atoms/CustomButton';
import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import {
  hasTrialData,
  trialClearAll,
} from '@/lib/game-management/trial-storage';
import {
  getTrialSummary,
  importSelectedItems,
  IMPORT_ORDER,
  RESOURCE_LABELS,
  type ImportResult,
  type TrialItemSummary,
  type TrialResourceKey,
} from '@/lib/game-management/import-trial';

type Phase = 'idle' | 'confirm' | 'result' | 'discard';

export default function TrialImportDialog() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { startLoading } = useLoadingOverlay();

  const [phase, setPhase] = useState<Phase>('idle');
  const [summaryItems, setSummaryItems] = useState<TrialItemSummary[]>([]);
  const [selected, setSelected] = useState<Map<TrialResourceKey, Set<number>>>(new Map());
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // 同一セッション中に 2 度自動表示しないためのフラグ
  const prompted = useRef(false);

  // --- ログイン検出 ---
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    if (prompted.current) return;
    if (!hasTrialData()) return;

    prompted.current = true;

    const items = getTrialSummary();

    // 初期選択: isDeleted でない active 項目を全選択
    const initialSelected = new Map<TrialResourceKey, Set<number>>();
    for (const item of items) {
      if (item.isDeleted) continue;
      if (!initialSelected.has(item.resourceKey)) {
        initialSelected.set(item.resourceKey, new Set());
      }
      initialSelected.get(item.resourceKey)!.add(item.trialId);
    }

    // ログイン検出時の一回限りの初期化 (prompted ref で再実行を防止)
    /* eslint-disable react-hooks/set-state-in-effect */
    setSummaryItems(items);
    setSelected(initialSelected);
    setPhase('confirm');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [status, session?.user]);

  // --- 選択操作 ---
  const toggleItem = useCallback((resourceKey: TrialResourceKey, trialId: number) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const ids = new Set(next.get(resourceKey) ?? []);
      if (ids.has(trialId)) {
        ids.delete(trialId);
      } else {
        ids.add(trialId);
      }
      next.set(resourceKey, ids);
      return next;
    });
  }, []);

  const toggleAllInResource = useCallback((resourceKey: TrialResourceKey, items: TrialItemSummary[]) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const activeItems = items.filter((i) => !i.isDeleted);
      const current = next.get(resourceKey) ?? new Set<number>();
      const allSelected = activeItems.every((i) => current.has(i.trialId));
      if (allSelected) {
        next.set(resourceKey, new Set());
      } else {
        next.set(resourceKey, new Set(activeItems.map((i) => i.trialId)));
      }
      return next;
    });
  }, []);

  // --- リソース別にグルーピング ---
  const groupedItems = useMemo(() => {
    const map = new Map<TrialResourceKey, TrialItemSummary[]>();
    for (const item of summaryItems) {
      if (!map.has(item.resourceKey)) {
        map.set(item.resourceKey, []);
      }
      map.get(item.resourceKey)!.push(item);
    }
    return map;
  }, [summaryItems]);

  const selectedCount = useMemo(() => {
    let count = 0;
    for (const ids of selected.values()) {
      count += ids.size;
    }
    return count;
  }, [selected]);

  // --- インポート実行 ---
  const handleImport = useCallback(async () => {
    try {
      await startLoading(async () => {
        const r = await importSelectedItems(selected);
        setImportResult(r);
      }, 'サーバへ反映中...');
      setPhase('result');
    } catch {
      // 予期しないエラー時は confirm に戻して再試行可能にする
      setPhase('confirm');
    }
  }, [selected, startLoading]);

  // --- 確認ダイアログ: はい ---
  const handleConfirmYes = useCallback(() => {
    void handleImport();
  }, [handleImport]);

  // --- 確認ダイアログ: いいえ ---
  const handleConfirmNo = useCallback(() => {
    setPhase('discard');
  }, []);

  // --- 破棄確認: はい ---
  const handleDiscardYes = useCallback(() => {
    trialClearAll();
    setPhase('idle');
  }, []);

  // --- 破棄確認: いいえ ---
  const handleDiscardNo = useCallback(() => {
    setPhase('idle');
  }, []);

  // --- 結果ダイアログ: 閉じる ---
  const handleResultClose = useCallback(() => {
    setPhase('idle');
    router.refresh();
  }, [router]);

  // --- レンダー ---
  if (phase === 'idle') return null;

  // ========== 確認フェーズ ==========
  if (phase === 'confirm') {
    return (
      <Dialog
        open
        onClose={handleConfirmNo}
        title="トライアルデータの反映"
        style={{ width: 'min(90vw, 36rem)', maxHeight: '80vh' }}
        footer={
          <>
            <CustomButton onClick={handleConfirmNo}>いいえ</CustomButton>
            <CustomButton variant="accent" onClick={handleConfirmYes} disabled={selectedCount === 0}>
              サーバへ反映する ({selectedCount}件)
            </CustomButton>
          </>
        }
      >
        <div className="space-y-4 max-h-[50vh] overflow-y-auto">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            ブラウザに保存されているトライアルデータが見つかりました。サーバへ反映するデータを選択してください。
          </p>

          {IMPORT_ORDER.map((resourceKey) => {
            const items = groupedItems.get(resourceKey);
            if (!items || items.length === 0) return null;

            const activeItems = items.filter((i) => !i.isDeleted);
            const resourceSelected = selected.get(resourceKey) ?? new Set<number>();
            const allActive = activeItems.length > 0 && activeItems.every((i) => resourceSelected.has(i.trialId));

            return (
              <details key={resourceKey} open>
                <summary className="cursor-pointer select-none text-sm font-semibold text-zinc-800 dark:text-zinc-200 py-1">
                  {RESOURCE_LABELS[resourceKey]} ({items.length}件)
                </summary>
                <div className="pl-2 pt-1 space-y-1">
                  {activeItems.length > 1 && (
                    <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer pb-1">
                      <CustomCheckBox
                        checked={allActive}
                        onChange={() => toggleAllInResource(resourceKey, items)}
                      />
                      すべて選択
                    </label>
                  )}
                  {items.map((item) => (
                    <label
                      key={item.trialId}
                      className={`flex items-center gap-2 text-sm ${item.isDeleted ? 'text-zinc-400 line-through' : 'text-zinc-700 dark:text-zinc-300'}`}
                    >
                      <CustomCheckBox
                        checked={resourceSelected.has(item.trialId)}
                        onChange={() => toggleItem(item.resourceKey, item.trialId)}
                        disabled={item.isDeleted}
                      />
                      {item.label}
                      {item.isDeleted && <span className="text-xs text-red-400 ml-1">(削除済み)</span>}
                    </label>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </Dialog>
    );
  }

  // ========== 結果フェーズ ==========
  if (phase === 'result' && importResult) {
    return (
      <Dialog
        open
        onClose={handleResultClose}
        title="インポート結果"
        footer={
          <CustomButton variant="accent" onClick={handleResultClose}>閉じる</CustomButton>
        }
      >
        <div className="space-y-3">
          <div className="flex gap-4 text-sm">
            <span className="text-green-600 dark:text-green-400">成功: {importResult.successCount}件</span>
            <span className="text-yellow-600 dark:text-yellow-400">スキップ: {importResult.skipCount}件</span>
            <span className="text-red-600 dark:text-red-400">失敗: {importResult.errorCount}件</span>
          </div>

          {importResult.items.filter((i) => i.status !== 'success').length > 0 && (
            <div className="space-y-1 max-h-[30vh] overflow-y-auto">
              {importResult.items
                .filter((i) => i.status !== 'success')
                .map((item) => (
                  <p key={`${item.resourceKey}-${item.trialId}`} className="text-xs text-zinc-600 dark:text-zinc-400">
                    <span className={item.status === 'skipped' ? 'text-yellow-600' : 'text-red-600'}>
                      [{item.status === 'skipped' ? 'スキップ' : '失敗'}]
                    </span>{' '}
                    {RESOURCE_LABELS[item.resourceKey]} #{item.trialId}
                    {item.reason && ` — ${item.reason}`}
                  </p>
                ))}
            </div>
          )}

          {importResult.errorCount > 0 && (
            <p className="text-xs text-zinc-500">
              失敗したデータはブラウザに残っています。次回ログイン時に再度反映を試みることができます。
            </p>
          )}
        </div>
      </Dialog>
    );
  }

  // ========== 破棄確認フェーズ ==========
  if (phase === 'discard') {
    return (
      <Dialog
        open
        onClose={handleDiscardNo}
        title="トライアルデータの破棄"
        footer={
          <>
            <CustomButton onClick={handleDiscardNo}>いいえ（保持する）</CustomButton>
            <CustomButton variant="accent" onClick={handleDiscardYes}>はい（破棄する）</CustomButton>
          </>
        }
      >
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          ブラウザに保存されているトライアルデータを破棄しますか？この操作は元に戻せません。
        </p>
      </Dialog>
    );
  }

  return null;
}
