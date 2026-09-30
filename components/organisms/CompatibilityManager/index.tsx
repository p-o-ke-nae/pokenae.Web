'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import CustomButton from '@/components/atoms/CustomButton';
import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import CustomHeader from '@/components/atoms/CustomHeader';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import { PageFrame } from '@/components/organisms/GameManagement/shared';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import {
  fetchCompatibilities,
  setCompatibilities,
  fetchMasterLookups,
  getGameManagementErrorMessage,
} from '@/lib/game-management/api';
import resources from '@/lib/resources';
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
          setError(getGameManagementErrorMessage(err, {
            fallback: resources.gameManagement.errors.listLoad,
            adminFallback: resources.gameManagement.errors.adminRequired,
          }));
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
      setError(getGameManagementErrorMessage(err, { fallback: resources.gameManagement.errors.detailLoad }));
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
      setError(getGameManagementErrorMessage(err, { fallback: resources.gameManagement.errors.save }));
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
    <PageFrame
      eyebrowLabel="Compatibility"
      title="ゲーム機カテゴリ互換設定"
      description="互換性は片方向です。host カテゴリが受け入れる supported カテゴリを設定します。例: Switch2（host）が Switch（supported）のソフトを実行できる場合、Switch2 側に Switch を追加します。"
      actions={(
        <Link href="/game-management" className="button-link button-link--secondary">
          ダッシュボードへ戻る
        </Link>
      )}
    >
        {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
        {success ? <CustomMessageArea variant="success">{success}</CustomMessageArea> : null}

        {pageLoading || !lookups ? (
          <p className="tool-muted text-sm" role="status">管理画面を読み込んでいます...</p>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-8">
            {/* Left: Category list */}
            <section className="tool-section">
              <div className="space-y-4">
                <CustomHeader level={2}>ゲーム機分類</CustomHeader>
                <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                  互換設定を編集するカテゴリ（host）を選択してください。
                </p>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleSelectHost(category)}
                      className={`w-full rounded-[0.35rem] border p-3 text-left text-sm transition ${
                        selectedHostCategoryId === category.id
                          ? 'border-[var(--color-accent-25-strong)] bg-[var(--color-accent-25-light)] font-semibold text-[var(--color-link)]'
                          : 'border-[var(--color-base-70)] bg-[var(--color-base-70-light)] text-[var(--foreground)] hover:border-[var(--color-accent-25-strong)] hover:bg-[var(--color-base-70)]'
                      }`}
                    >
                      <span>{category.name}</span>
                      <span className="ml-2 text-xs text-[var(--color-text-muted)]">({category.abbreviation})</span>
                    </button>
                  ))}
                  {categories.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)]">ゲーム機分類が登録されていません。</p>
                  ) : null}
                </div>
              </div>
            </section>

            {/* Right: Compatibility editor */}
            <section className="tool-section">
              {selectedHostCategory == null ? (
                <div className="space-y-3">
                  <CustomHeader level={2}>互換設定</CustomHeader>
                  <p className="text-sm text-[var(--color-text-muted)]">左のカテゴリを選択すると、互換設定を編集できます。</p>
                </div>
              ) : compatLoading ? (
                <div className="space-y-3">
                  <CustomHeader level={2}>{selectedHostCategory.name} の互換設定</CustomHeader>
                  <p className="text-sm text-[var(--color-text-muted)]">互換設定を読み込んでいます...</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <CustomHeader level={2}>{selectedHostCategory.name} の互換設定</CustomHeader>
                    <p className="text-sm leading-6 text-[var(--color-text-muted)]">
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
                            className={`flex items-start gap-3 rounded-[0.35rem] border p-3 ${
                              isSelf
                                ? 'cursor-not-allowed border-[var(--color-base-70)] bg-[var(--color-base-70-light)] opacity-50'
                                : 'border-[var(--color-base-70)]'
                            }`}
                          >
                            <CustomCheckBox
                              checked={isSelf ? false : checked}
                              onChange={(event) => handleToggleSupported(category.id, event.target.checked)}
                              disabled={isSelf}
                            />
                            <div className="flex-1">
                              <span className="text-sm text-[var(--foreground)]">{category.name}</span>
                              {isSelf ? (
                                <span className="ml-2 text-xs text-[var(--color-text-muted)]">（自分自身は選択不可）</span>
                              ) : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t border-[var(--color-base-70)] pt-4">
                    <CustomButton
                      variant="accent"
                      disabled={!isDirty || saving}
                      onClick={() => void handleSave()}
                    >
                      保存
                    </CustomButton>
                    {isDirty ? (
                      <span className="text-sm text-[var(--color-warning)]">未保存の変更があります。</span>
                    ) : null}
                  </div>

                  {currentCompatibilities.length > 0 ? (
                    <div className="space-y-2 rounded-[0.35rem] border border-[var(--color-base-70)] bg-[var(--color-base-70-light)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">現在の互換設定</p>
                      <ul className="list-inside list-disc space-y-1 text-sm text-[var(--color-text-muted)]">
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
                    <p className="text-sm text-[var(--color-text-muted)]">
                      互換設定がありません。このカテゴリは他のカテゴリのソフトを受け入れません。
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
    </PageFrame>
  );
}
