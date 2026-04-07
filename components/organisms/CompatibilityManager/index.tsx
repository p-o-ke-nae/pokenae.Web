'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import CustomButton from '@/components/atoms/CustomButton';
import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import CustomHeader from '@/components/atoms/CustomHeader';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import {
  ApiError,
  fetchCompatibilities,
  setCompatibilities,
  fetchMasterLookups,
} from '@/lib/game-management/api';
import type {
  GameConsoleCategoryCompatibilityDto,
  GameConsoleCategoryDto,
  MasterLookups,
} from '@/lib/game-management/types';

export default function CompatibilityManager() {
  const { startLoading } = useLoadingOverlay();
  const [lookups, setLookups] = useState<MasterLookups | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedHostCategoryId, setSelectedHostCategoryId] = useState<number | null>(null);
  const [currentCompatibilities, setCurrentCompatibilities] = useState<GameConsoleCategoryCompatibilityDto[]>([]);
  const [selectedSupportedIds, setSelectedSupportedIds] = useState<number[]>([]);
  const [compatLoading, setCompatLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ---------------------------------------------------------------------------
  // Initial load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadMasters = async () => {
      setPageLoading(true);
      setError(null);
      try {
        const masters = await fetchMasterLookups();
        if (!cancelled) {
          setLookups(masters);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof ApiError && err.statusCode === 403
            ? '管理者権限が必要です。このリソースへのアクセスにはバックエンドの Admin ロールが必要です。'
            : err instanceof Error ? err.message : 'マスタデータの取得に失敗しました。';
          setError(msg);
        }
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    };

    void loadMasters();
    return () => { cancelled = true; };
  }, []);

  // ---------------------------------------------------------------------------
  // Load compatibility for selected host category
  // ---------------------------------------------------------------------------

  const loadCompatibility = useCallback(async (hostCategoryId: number) => {
    setCompatLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await fetchCompatibilities(hostCategoryId);
      setCurrentCompatibilities(data);
      setSelectedSupportedIds(data.map((c) => c.supportedGameConsoleCategoryId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '互換設定の取得に失敗しました。';
      setError(msg);
      setCurrentCompatibilities([]);
      setSelectedSupportedIds([]);
    } finally {
      setCompatLoading(false);
    }
  }, []);

  const handleSelectHost = useCallback((category: GameConsoleCategoryDto) => {
    setSelectedHostCategoryId(category.id);
    setSuccess(null);
    void loadCompatibility(category.id);
  }, [loadCompatibility]);

  // ---------------------------------------------------------------------------
  // Toggle supported category
  // ---------------------------------------------------------------------------

  const handleToggleSupported = useCallback((categoryId: number, checked: boolean) => {
    setSelectedSupportedIds((prev) => {
      if (checked) {
        return [...prev, categoryId];
      }
      return prev.filter((id) => id !== categoryId);
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (selectedHostCategoryId == null) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await startLoading(async () => {
        const result = await setCompatibilities(selectedHostCategoryId, {
          supportedGameConsoleCategoryIds: selectedSupportedIds,
        });
        setCurrentCompatibilities(result);
        setSelectedSupportedIds(result.map((c) => c.supportedGameConsoleCategoryId));
      }, '互換設定を保存中...');
      setSuccess('互換設定を保存しました。');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '互換設定の保存に失敗しました。';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [selectedHostCategoryId, selectedSupportedIds, startLoading]);

  // ---------------------------------------------------------------------------
  // Dirty check
  // ---------------------------------------------------------------------------

  const isDirty = (() => {
    const currentIds = new Set(currentCompatibilities.map((c) => c.supportedGameConsoleCategoryId));
    const selectedIds = new Set(selectedSupportedIds);
    if (currentIds.size !== selectedIds.size) return true;
    for (const id of currentIds) {
      if (!selectedIds.has(id)) return true;
    }
    return false;
  })();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const categories = lookups?.gameConsoleCategories.filter((c) => !c.isDeleted) ?? [];
  const selectedHostCategory = categories.find((c) => c.id === selectedHostCategoryId) ?? null;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 rounded-3xl bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(241,245,249,0.95))] p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.95),rgba(9,9,11,0.95))] dark:ring-zinc-800">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="select-none text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Compatibility</p>
              <CustomHeader level={1}>ゲーム機カテゴリ互換設定</CustomHeader>
              <p className="select-none max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                互換性は片方向です。host カテゴリが受け入れる supported カテゴリを設定します。例: Switch2（host）が Switch（supported）のソフトを実行できる場合、Switch2 側に Switch を追加します。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/game-management" className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300">
                ダッシュボードへ戻る
              </Link>
            </div>
          </div>
        </div>

        {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
        {success ? <CustomMessageArea variant="success">{success}</CustomMessageArea> : null}

        {pageLoading || !lookups ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500">管理画面を読み込んでいます...</p>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            {/* Left: Category list */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="space-y-4">
                <CustomHeader level={2}>ゲーム機分類</CustomHeader>
                <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  互換設定を編集するカテゴリ（host）を選択してください。
                </p>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleSelectHost(category)}
                      className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                        selectedHostCategoryId === category.id
                          ? 'border-sky-400 bg-sky-50 font-semibold text-sky-800 dark:border-sky-600 dark:bg-sky-950 dark:text-sky-200'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span>{category.name}</span>
                      <span className="ml-2 text-xs text-zinc-400">({category.abbreviation})</span>
                    </button>
                  ))}
                  {categories.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">ゲーム機分類が登録されていません。</p>
                  ) : null}
                </div>
              </div>
            </section>

            {/* Right: Compatibility editor */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              {selectedHostCategory == null ? (
                <div className="space-y-3">
                  <CustomHeader level={2}>互換設定</CustomHeader>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">左のカテゴリを選択すると、互換設定を編集できます。</p>
                </div>
              ) : compatLoading ? (
                <div className="space-y-3">
                  <CustomHeader level={2}>{selectedHostCategory.name} の互換設定</CustomHeader>
                  <p className="text-sm text-zinc-500">互換設定を読み込んでいます...</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <CustomHeader level={2}>{selectedHostCategory.name} の互換設定</CustomHeader>
                    <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                      このカテゴリ（host）が受け入れるカテゴリ（supported）を選択してください。チェックされたカテゴリのソフトを、このカテゴリのゲーム機で実行・保存できるようになります。
                    </p>
                  </div>

                  <div className="space-y-3">
                    <CustomLabel>受け入れ対象カテゴリ (supported)</CustomLabel>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {categories.map((category) => {
                        const isSelf = category.id === selectedHostCategoryId;
                        const checked = selectedSupportedIds.includes(category.id);
                        return (
                          <label
                            key={category.id}
                            className={`flex items-start gap-3 rounded-xl border p-3 ${
                              isSelf
                                ? 'cursor-not-allowed border-zinc-100 bg-zinc-50 opacity-50 dark:border-zinc-900 dark:bg-zinc-900/50'
                                : 'border-zinc-200 dark:border-zinc-800'
                            }`}
                          >
                            <CustomCheckBox
                              checked={isSelf ? false : checked}
                              onChange={(event) => handleToggleSupported(category.id, event.target.checked)}
                              disabled={isSelf}
                            />
                            <div className="flex-1">
                              <span className="text-sm text-zinc-700 dark:text-zinc-200">{category.name}</span>
                              {isSelf ? (
                                <span className="ml-2 text-xs text-zinc-400">（自分自身は選択不可）</span>
                              ) : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                    <CustomButton
                      variant="accent"
                      disabled={!isDirty || saving}
                      onClick={() => void handleSave()}
                    >
                      保存
                    </CustomButton>
                    {isDirty ? (
                      <span className="text-sm text-amber-600 dark:text-amber-400">未保存の変更があります。</span>
                    ) : null}
                  </div>

                  {currentCompatibilities.length > 0 ? (
                    <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">現在の互換設定</p>
                      <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                        {currentCompatibilities.map((compat) => {
                          const supportedCategory = categories.find((c) => c.id === compat.supportedGameConsoleCategoryId);
                          return (
                            <li key={compat.id}>
                              {selectedHostCategory.name} → {supportedCategory?.name ?? `ID:${compat.supportedGameConsoleCategoryId}`}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      互換設定がありません。このカテゴリは他のカテゴリのソフトを受け入れません。
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
