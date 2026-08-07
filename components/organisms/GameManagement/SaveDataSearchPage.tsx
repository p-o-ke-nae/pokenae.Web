'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import CustomButton from '@/components/atoms/CustomButton';
import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import CustomComboBox from '@/components/atoms/CustomComboBox';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import CustomTextBox from '@/components/atoms/CustomTextBox';
import ResponsiveActionGroup from '@/components/molecules/ResponsiveActionGroup';
import {
  fetchAuthenticatedUserLookups,
  fetchPublicMasterLookups,
  fetchPublicSaveDataSchema,
  fetchPublicStoryProgressSchema,
  getGameManagementErrorMessage,
} from '@/lib/game-management/api';
import {
  evaluateSaveDataSearch,
  GAME_SOFTWARE_VARIANT_OPTIONS,
  type SaveDataSearchFieldCondition,
  type SaveDataSearchGroup,
} from '@/lib/game-management/save-data-search';
import { formatSaveStorageType } from '@/lib/game-management/save-storage-type';
import { buildTrialUserData } from '@/lib/game-management/trial';
import type {
  ManagementLookups,
  SaveDataSchemaDto,
  StoryProgressSchemaDto,
} from '@/lib/game-management/types';
import { useResponsiveLayoutMode } from '@/lib/hooks/useResponsiveLayoutMode';
import resources from '@/lib/resources';
import { getResourceDefinition } from '@/lib/game-management/resources';
import EditorDialog from './EditorDialog';
import {
  getAccountDisplay,
  getGameConsoleDisplay,
  getGameSoftwareDisplay,
  getGameSoftwareMasterName,
  getMemoryCardDisplay,
} from './helpers';
import { PageCard, PageFrame, TrialBanner } from './shared';

type SearchGroupFormState = {
  id: string;
  gameSoftwareMasterId: string;
  storyProgressDefinitionId: string;
  fieldConditions: Array<SaveDataSearchFieldCondition & { id: string }>;
};

type SubmittedSearchState = {
  variant: string;
  groups: SearchGroupFormState[];
};

function createFieldCondition(): SaveDataSearchFieldCondition & { id: string } {
  return {
    id: `condition-${Math.random().toString(36).slice(2, 10)}`,
    fieldKey: '',
    value: '',
  };
}

function createSearchGroup(): SearchGroupFormState {
  return {
    id: `group-${Math.random().toString(36).slice(2, 10)}`,
    gameSoftwareMasterId: '',
    storyProgressDefinitionId: '',
    fieldConditions: [],
  };
}

function cloneGroups(groups: SearchGroupFormState[]): SearchGroupFormState[] {
  return groups.map((group) => ({
    ...group,
    fieldConditions: group.fieldConditions.map((condition) => ({ ...condition })),
  }));
}

function getStorageSummary(saveData: ManagementLookups['saveDatas'][number], lookups: ManagementLookups): string {
  switch (saveData.saveStorageType) {
    case 0: {
      const software = saveData.gameSoftwareId ? lookups.gameSoftwares.find((item) => item.id === saveData.gameSoftwareId) : null;
      return software ? getGameSoftwareDisplay(software, lookups) : 'ゲームソフト';
    }
    case 1: {
      const gameConsole = saveData.gameConsoleId ? lookups.gameConsoles.find((item) => item.id === saveData.gameConsoleId) : null;
      return gameConsole ? getGameConsoleDisplay(gameConsole, lookups) : 'ゲーム機本体';
    }
    case 2: {
      const account = saveData.accountId ? lookups.accounts.find((item) => item.id === saveData.accountId) : null;
      const gameConsole = saveData.gameConsoleId ? lookups.gameConsoles.find((item) => item.id === saveData.gameConsoleId) : null;
      return [account ? getAccountDisplay(account, lookups) : null, gameConsole ? getGameConsoleDisplay(gameConsole, lookups) : null]
        .filter(Boolean)
        .join(' / ');
    }
    case 3: {
      const memoryCard = saveData.memoryCardId ? lookups.memoryCards.find((item) => item.id === saveData.memoryCardId) : null;
      return memoryCard ? getMemoryCardDisplay(memoryCard, lookups) : 'メモリーカード';
    }
    default:
      return '';
  }
}

function buildSubmittedGroupSummary(
  group: SearchGroupFormState,
  schema: SaveDataSchemaDto | null | undefined,
  storyProgressSchema: StoryProgressSchemaDto | null | undefined,
  lookups: ManagementLookups,
): string {
  const parts = [
    getGameSoftwareMasterName(Number(group.gameSoftwareMasterId), lookups),
  ];

  if (group.storyProgressDefinitionId) {
    const storyProgress = storyProgressSchema?.choices.find((choice) => String(choice.storyProgressDefinitionId) === group.storyProgressDefinitionId);
    parts.push(`進行度: ${storyProgress?.label ?? `#${group.storyProgressDefinitionId}`}`);
  }

  for (const condition of group.fieldConditions) {
    const field = schema?.fields.find((item) => item.fieldKey === condition.fieldKey);
    parts.push(`${field?.label ?? condition.fieldKey}: ${condition.value}`);
  }

  return parts.join(' / ');
}

export default function SaveDataSearchPage() {
  const { data: session } = useSession();
  const isTrial = !session?.user;
  const layoutMode = useResponsiveLayoutMode();
  const [lookups, setLookups] = useState<ManagementLookups | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [variant, setVariant] = useState('');
  const [groups, setGroups] = useState<SearchGroupFormState[]>([createSearchGroup()]);
  const [submittedSearch, setSubmittedSearch] = useState<SubmittedSearchState | null>(null);
  const [saveDataSchemas, setSaveDataSchemas] = useState<Record<number, SaveDataSchemaDto>>({});
  const [storyProgressSchemas, setStoryProgressSchemas] = useState<Record<number, StoryProgressSchemaDto>>({});
  const [schemaLoadErrors, setSchemaLoadErrors] = useState<Record<number, string>>({});
  const [schemaLoadingIds, setSchemaLoadingIds] = useState<number[]>([]);
  const [editorRecordId, setEditorRecordId] = useState<number | null>(null);
  const [pageMode, setPageMode] = useState<'view' | 'edit'>('view');

  const saveDataDefinition = useMemo(() => getResourceDefinition('save-datas'), []);

  const resetSchemaState = useCallback((gameSoftwareMasterId?: number) => {
    setSaveDataSchemas((current) => {
      if (gameSoftwareMasterId == null) {
        return {};
      }

      const rest = { ...current };
      delete rest[gameSoftwareMasterId];
      return rest;
    });
    setStoryProgressSchemas((current) => {
      if (gameSoftwareMasterId == null) {
        return {};
      }

      const rest = { ...current };
      delete rest[gameSoftwareMasterId];
      return rest;
    });
    setSchemaLoadErrors((current) => {
      if (gameSoftwareMasterId == null) {
        return {};
      }

      const rest = { ...current };
      delete rest[gameSoftwareMasterId];
      return rest;
    });
    setSchemaLoadingIds((current) => (
      gameSoftwareMasterId == null
        ? []
        : current.filter((id) => id !== gameSoftwareMasterId)
    ));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = isTrial
        ? { ...await fetchPublicMasterLookups(), ...buildTrialUserData() }
        : await fetchAuthenticatedUserLookups();
      setLookups(result);
    } catch (loadError) {
      setError(getGameManagementErrorMessage(loadError, {
        fallback: resources.gameManagement.errors.listLoad,
      }));
    } finally {
      setLoading(false);
    }
  }, [isTrial]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReload = useCallback(() => {
    resetSchemaState();
    void load();
  }, [load, resetSchemaState]);

  const requestedMasterIds = useMemo(() => Array.from(new Set(
    groups
      .map((group) => Number(group.gameSoftwareMasterId))
      .filter((value) => Number.isInteger(value) && value > 0),
  )), [groups]);

  useEffect(() => {
    const pendingIds = requestedMasterIds.filter((id) => !saveDataSchemas[id] && !schemaLoadingIds.includes(id) && !schemaLoadErrors[id]);
    if (pendingIds.length === 0) {
      return;
    }

    let cancelled = false;

    const loadSchemas = async () => {
      setSchemaLoadingIds((current) => Array.from(new Set([...current, ...pendingIds])));

      const results = await Promise.allSettled(pendingIds.map(async (gameSoftwareMasterId) => ({
        gameSoftwareMasterId,
        saveDataSchema: await fetchPublicSaveDataSchema(gameSoftwareMasterId),
        storyProgressSchema: await fetchPublicStoryProgressSchema(gameSoftwareMasterId),
      })));

      if (cancelled) {
        return;
      }

      const nextSchemaErrors: Record<number, string> = {};
      const nextSaveDataSchemas: Record<number, SaveDataSchemaDto> = {};
      const nextStoryProgressSchemas: Record<number, StoryProgressSchemaDto> = {};

      for (const result of results) {
        if (result.status === 'fulfilled') {
          nextSaveDataSchemas[result.value.gameSoftwareMasterId] = result.value.saveDataSchema;
          nextStoryProgressSchemas[result.value.gameSoftwareMasterId] = result.value.storyProgressSchema;
          continue;
        }

        const rejectedId = pendingIds[results.indexOf(result)];
        nextSchemaErrors[rejectedId] = getGameManagementErrorMessage(result.reason, {
          fallback: resources.gameManagement.errors.schemaLoad,
        });
      }

      setSaveDataSchemas((current) => ({ ...current, ...nextSaveDataSchemas }));
      setStoryProgressSchemas((current) => ({ ...current, ...nextStoryProgressSchemas }));
      setSchemaLoadErrors((current) => ({ ...current, ...nextSchemaErrors }));
      setSchemaLoadingIds((current) => current.filter((id) => !pendingIds.includes(id)));
    };

    void loadSchemas();

    return () => {
      cancelled = true;
    };
  }, [requestedMasterIds, saveDataSchemas, schemaLoadErrors, schemaLoadingIds]);

  const submittedCriteria = useMemo(() => {
    if (!submittedSearch) {
      return null;
    }

    const criteriaGroups: SaveDataSearchGroup[] = submittedSearch.groups.map((group) => ({
      gameSoftwareMasterId: Number(group.gameSoftwareMasterId),
      storyProgressDefinitionId: group.storyProgressDefinitionId ? Number(group.storyProgressDefinitionId) : null,
      fieldConditions: group.fieldConditions.map((condition) => ({
        fieldKey: condition.fieldKey,
        value: condition.value,
      })),
    }));

    return {
      variant: submittedSearch.variant === '' ? null : Number(submittedSearch.variant) as 0 | 1,
      groups: criteriaGroups,
    };
  }, [submittedSearch]);

  const results = useMemo(() => {
    if (!lookups || !submittedCriteria) {
      return [];
    }

    return evaluateSaveDataSearch(lookups, saveDataSchemas, submittedCriteria);
  }, [lookups, saveDataSchemas, submittedCriteria]);

  const resultIds = useMemo(() => results.map((result) => result.saveData.id), [results]);

  const validateSearch = useCallback(() => {
    const errors: string[] = [];

    groups.forEach((group, index) => {
      if (!group.gameSoftwareMasterId) {
        errors.push(`条件グループ ${index + 1}: ゲームソフトマスタを選択してください。`);
      }

      if (group.gameSoftwareMasterId) {
        const masterId = Number(group.gameSoftwareMasterId);
        if (schemaLoadingIds.includes(masterId)) {
          errors.push(`条件グループ ${index + 1}: スキーマ読込が完了してから検索してください。`);
        }
        if (schemaLoadErrors[masterId]) {
          errors.push(`条件グループ ${index + 1}: ${schemaLoadErrors[masterId]}`);
        }
      }

      group.fieldConditions.forEach((condition) => {
        if (!condition.fieldKey) {
          errors.push(`条件グループ ${index + 1}: schema 項目を選択してください。`);
          return;
        }

        if (!condition.value.trim()) {
          errors.push(`条件グループ ${index + 1}: schema 条件の値を入力してください。`);
        }
      });
    });

    return errors;
  }, [groups, schemaLoadErrors, schemaLoadingIds]);

  const handleSearch = useCallback(() => {
    const validationErrors = validateSearch();
    if (validationErrors.length > 0) {
      setSearchError(validationErrors.join('\n'));
      return;
    }

    setSearchError(null);
    setSubmittedSearch({
      variant,
      groups: cloneGroups(groups),
    });
  }, [groups, validateSearch, variant]);

  const updateGroup = useCallback((groupId: string, updater: (group: SearchGroupFormState) => SearchGroupFormState) => {
    setGroups((current) => current.map((group) => (group.id === groupId ? updater(group) : group)));
  }, []);

  return (
    <PageFrame
      eyebrowLabel="Game Library"
      title="横断セーブデータ検索"
      description="共通 variant と複数の schema 条件グループを組み合わせ、セーブデータを作品横断で検索します。"
      layoutMode={layoutMode}
      actions={(
        <>
          <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1}>
            <Link href="/game-library" className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300">
              ダッシュボードへ戻る
            </Link>
          </ResponsiveActionGroup>
          <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1} align="end">
            <CustomButton variant="accent" onClick={handleSearch}>
              検索する
            </CustomButton>
            <CustomButton onClick={handleReload}>
              再読み込み
            </CustomButton>
          </ResponsiveActionGroup>
        </>
      )}
    >
      {isTrial ? <TrialBanner /> : null}
      {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
      {searchError ? <CustomMessageArea variant="error" className="whitespace-pre-line">{searchError}</CustomMessageArea> : null}
      <PageCard>
        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-300">検索対象を読み込んでいます...</p>
        ) : !lookups ? null : (
          <div className="space-y-6">
            <section className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="space-y-2">
                <CustomLabel htmlFor="save-data-search-variant">共通フィルタ: variant</CustomLabel>
                <CustomComboBox
                  id="save-data-search-variant"
                  value={variant}
                  onChange={(event) => setVariant(event.target.value)}
                >
                  {GAME_SOFTWARE_VARIANT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </CustomComboBox>
              </div>
              <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-300">
                variant は全条件グループへ AND で適用されます。条件グループ同士は OR、各グループ内はゲームソフトマスタ / 進行度 / schema 項目を AND で評価します。
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">条件グループ</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-300">異なるゲームソフトマスタをまたいだ OR 検索を定義できます。</p>
                </div>
                <CustomButton onClick={() => setGroups((current) => [...current, createSearchGroup()])}>
                  条件グループを追加
                </CustomButton>
              </div>

              {groups.map((group, index) => {
                const selectedMasterId = Number(group.gameSoftwareMasterId);
                const schema = Number.isInteger(selectedMasterId) && selectedMasterId > 0 ? saveDataSchemas[selectedMasterId] : undefined;
                const storyProgressSchema = Number.isInteger(selectedMasterId) && selectedMasterId > 0 ? storyProgressSchemas[selectedMasterId] : undefined;
                const schemaError = Number.isInteger(selectedMasterId) && selectedMasterId > 0 ? schemaLoadErrors[selectedMasterId] : undefined;
                const schemaLoading = Number.isInteger(selectedMasterId) && selectedMasterId > 0 ? schemaLoadingIds.includes(selectedMasterId) : false;

                return (
                  <article key={group.id} className="space-y-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">条件グループ {index + 1}</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-300">このグループ内の条件はすべて AND で評価されます。</p>
                      </div>
                      {groups.length > 1 ? (
                        <CustomButton
                          variant="ghost"
                          onClick={() => setGroups((current) => current.filter((item) => item.id !== group.id))}
                        >
                          このグループを削除
                        </CustomButton>
                      ) : null}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <CustomLabel htmlFor={`${group.id}-master`}>ゲームソフトマスタ</CustomLabel>
                        <CustomComboBox
                          id={`${group.id}-master`}
                          value={group.gameSoftwareMasterId}
                          onChange={(event) => updateGroup(group.id, () => ({
                            ...group,
                            gameSoftwareMasterId: event.target.value,
                            storyProgressDefinitionId: '',
                            fieldConditions: [],
                          }))}
                        >
                          <option value="">選択してください</option>
                          {lookups.gameSoftwareMasters.map((master) => (
                            <option key={master.id} value={String(master.id)}>
                              {master.name}
                            </option>
                          ))}
                        </CustomComboBox>
                      </div>
                      <div className="space-y-2">
                        <CustomLabel htmlFor={`${group.id}-story-progress`}>ストーリー進行度（任意）</CustomLabel>
                        <CustomComboBox
                          id={`${group.id}-story-progress`}
                          value={group.storyProgressDefinitionId}
                          onChange={(event) => updateGroup(group.id, (current) => ({ ...current, storyProgressDefinitionId: event.target.value }))}
                          disabled={!group.gameSoftwareMasterId || schemaLoading || Boolean(schemaError)}
                        >
                          <option value="">すべて</option>
                          {(storyProgressSchema?.choices ?? []).map((choice) => (
                            <option key={choice.storyProgressDefinitionId} value={String(choice.storyProgressDefinitionId)} disabled={choice.isDisabled}>
                              {choice.label}
                            </option>
                          ))}
                        </CustomComboBox>
                      </div>
                    </div>

                    {schemaLoading ? <CustomMessageArea variant="info">スキーマを読み込んでいます...</CustomMessageArea> : null}
                    {schemaError ? (
                      <CustomMessageArea variant="error">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <span>{schemaError}</span>
                          <CustomButton
                            variant="ghost"
                            onClick={() => resetSchemaState(selectedMasterId)}
                          >
                            スキーマを再試行
                          </CustomButton>
                        </div>
                      </CustomMessageArea>
                    ) : null}

                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">schema 条件</p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-300">0 件以上追加できます。</p>
                        </div>
                        <CustomButton
                          disabled={!schema || schema.fields.filter((field) => !field.isDisabled).length === 0}
                          onClick={() => updateGroup(group.id, (current) => ({
                            ...current,
                            fieldConditions: [...current.fieldConditions, createFieldCondition()],
                          }))}
                        >
                          条件を追加
                        </CustomButton>
                      </div>

                      {group.fieldConditions.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-300">schema 条件なしでも検索できます。</p>
                      ) : group.fieldConditions.map((condition) => {
                        const selectedField = schema?.fields.find((field) => field.fieldKey === condition.fieldKey && !field.isDisabled);

                        return (
                          <div key={condition.id} className="grid gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] lg:items-end">
                            <div className="space-y-2">
                              <CustomLabel htmlFor={`${condition.id}-field`}>項目</CustomLabel>
                              <CustomComboBox
                                id={`${condition.id}-field`}
                                value={condition.fieldKey}
                                onChange={(event) => updateGroup(group.id, (current) => ({
                                  ...current,
                                  fieldConditions: current.fieldConditions.map((item) => (
                                    item.id === condition.id
                                      ? { ...item, fieldKey: event.target.value, value: '' }
                                      : item
                                  )),
                                }))}
                              >
                                <option value="">選択してください</option>
                                {(schema?.fields ?? []).filter((field) => !field.isDisabled).map((field) => (
                                  <option key={field.fieldKey} value={field.fieldKey}>{field.label}</option>
                                ))}
                              </CustomComboBox>
                            </div>
                            <div className="space-y-2">
                              <CustomLabel htmlFor={`${condition.id}-value`}>値</CustomLabel>
                              {selectedField?.fieldType === 4 ? (
                                <div className="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                                  <CustomCheckBox
                                    checked={condition.value === 'true'}
                                    onChange={(event) => updateGroup(group.id, (current) => ({
                                      ...current,
                                      fieldConditions: current.fieldConditions.map((item) => (
                                        item.id === condition.id
                                          ? { ...item, value: String(event.target.checked) }
                                          : item
                                      )),
                                    }))}
                                  />
                                  <span className="text-sm text-zinc-700 dark:text-zinc-200">はい</span>
                                </div>
                              ) : selectedField?.fieldType === 6 ? (
                                <CustomComboBox
                                  id={`${condition.id}-value`}
                                  value={condition.value}
                                  onChange={(event) => updateGroup(group.id, (current) => ({
                                    ...current,
                                    fieldConditions: current.fieldConditions.map((item) => (
                                      item.id === condition.id
                                        ? { ...item, value: event.target.value }
                                        : item
                                    )),
                                  }))}
                                >
                                  <option value="">選択してください</option>
                                  {selectedField.options.map((option) => (
                                    <option key={option.optionKey} value={option.optionKey}>{option.label}</option>
                                  ))}
                                </CustomComboBox>
                              ) : (
                                <CustomTextBox
                                  id={`${condition.id}-value`}
                                  type={selectedField?.fieldType === 5 ? 'date' : selectedField?.fieldType === 2 || selectedField?.fieldType === 3 ? 'number' : 'text'}
                                  step={selectedField?.fieldType === 3 ? 'any' : undefined}
                                  value={condition.value}
                                  onChange={(event) => updateGroup(group.id, (current) => ({
                                    ...current,
                                    fieldConditions: current.fieldConditions.map((item) => (
                                      item.id === condition.id
                                        ? { ...item, value: event.target.value }
                                        : item
                                    )),
                                  }))}
                                  placeholder={selectedField?.fieldType === 0 || selectedField?.fieldType === 1 ? '部分一致' : '一致条件'}
                                />
                              )}
                            </div>
                            <CustomButton
                              variant="ghost"
                              onClick={() => updateGroup(group.id, (current) => ({
                                ...current,
                                fieldConditions: current.fieldConditions.filter((item) => item.id !== condition.id),
                              }))}
                            >
                              条件を削除
                            </CustomButton>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">検索結果</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-300">
                    {submittedSearch ? `${results.length} 件ヒットしました。` : '条件を入力して検索してください。'}
                  </p>
                </div>
                {submittedSearch ? (
                  <span className="text-sm text-zinc-500 dark:text-zinc-300">
                    共通 variant: {GAME_SOFTWARE_VARIANT_OPTIONS.find((option) => option.value === submittedSearch.variant)?.label ?? 'すべて'}
                  </span>
                ) : null}
              </div>

              {submittedSearch && results.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-300">一致するセーブデータはありませんでした。</p>
              ) : null}

              <div className="space-y-3">
                {submittedSearch ? results.map((result) => {
                  const schema = saveDataSchemas[result.saveData.gameSoftwareMasterId];
                  const storyProgressSchema = storyProgressSchemas[result.saveData.gameSoftwareMasterId];
                  const matchedSummary = result.matchedGroupIndexes.map((groupIndex) => buildSubmittedGroupSummary(
                    submittedSearch.groups[groupIndex]!,
                    schema,
                    storyProgressSchema,
                    lookups,
                  ));

                  return (
                    <article key={result.saveData.id} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            SaveData #{result.saveData.id} / {getGameSoftwareMasterName(result.saveData.gameSoftwareMasterId, lookups)}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-300">
                            保存方式: {formatSaveStorageType(result.saveData.saveStorageType)} / 保存先: {getStorageSummary(result.saveData, lookups) || '未設定'}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-300">
                            進行度: {result.saveData.storyProgressDefinitionId
                              ? storyProgressSchema?.choices.find((choice) => choice.storyProgressDefinitionId === result.saveData.storyProgressDefinitionId)?.label ?? `#${result.saveData.storyProgressDefinitionId}`
                              : '未設定'}
                          </p>
                          {result.saveData.memo ? (
                            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-200">{result.saveData.memo}</p>
                          ) : null}
                        </div>
                        <CustomButton
                          variant="neutral"
                          onClick={() => {
                            setPageMode('view');
                            setEditorRecordId(result.saveData.id);
                          }}
                        >
                          詳細を見る
                        </CustomButton>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                        <p className="font-semibold text-zinc-800 dark:text-zinc-100">一致条件</p>
                        <ul className="mt-2 space-y-1">
                          {matchedSummary.map((summary, index) => (
                            <li key={`${result.saveData.id}-${index}`}>- {summary}</li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  );
                }) : null}
              </div>
            </section>
          </div>
        )}
      </PageCard>
      {lookups && editorRecordId != null ? (
        <EditorDialog
          open
          onClose={() => setEditorRecordId(null)}
          resourceKey="save-datas"
          definition={saveDataDefinition}
          lookups={lookups}
          isTrial={isTrial}
          recordId={editorRecordId}
          onRecordIdChange={setEditorRecordId}
          rowIds={resultIds}
          onDataChanged={() => { void load(); }}
          pageMode={pageMode}
          onPageModeChange={setPageMode}
          layoutMode={layoutMode}
        />
      ) : null}
    </PageFrame>
  );
}
