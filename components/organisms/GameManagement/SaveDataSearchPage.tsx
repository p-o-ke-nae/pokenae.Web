'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import CustomButton from '@/components/atoms/CustomButton';
import CustomComboBox from '@/components/atoms/CustomComboBox';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import CustomTextBox from '@/components/atoms/CustomTextBox';
import ResponsiveActionGroup from '@/components/molecules/ResponsiveActionGroup';
import {
  fetchAuthenticatedUserLookups,
  fetchPublicMasterLookups,
  fetchPublicSaveDataSchema,
  getGameManagementErrorMessage,
} from '@/lib/game-management/api';
import {
  evaluateSaveDataSearch,
  getSaveDataSearchFields,
  type SaveDataSearchCriteria,
} from '@/lib/game-management/save-data-search';
import { formatSaveStorageType } from '@/lib/game-management/save-storage-type';
import { buildTrialUserData } from '@/lib/game-management/trial';
import type {
  ManagementLookups,
  SaveDataSchemaDto,
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
import { PageFrame, PageSection, TrialBanner } from './shared';

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
        .join(' ');
    }
    case 3: {
      const memoryCard = saveData.memoryCardId ? lookups.memoryCards.find((item) => item.id === saveData.memoryCardId) : null;
      return memoryCard ? getMemoryCardDisplay(memoryCard, lookups) : 'メモリーカード';
    }
    default:
      return '';
  }
}

function getMasterDisplayName(masterId: number, lookups: ManagementLookups): string {
  const master = lookups.gameSoftwareMasters.find((item) => item.id === masterId);
  return master ? `${master.abbreviation || master.name} — ${master.name}` : getGameSoftwareMasterName(masterId, lookups);
}

export default function SaveDataSearchPage() {
  const { data: session } = useSession();
  const isTrial = !session?.user;
  const layoutMode = useResponsiveLayoutMode();
  const [lookups, setLookups] = useState<ManagementLookups | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [gameSoftwareMasterId, setGameSoftwareMasterId] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [value, setValue] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState<SaveDataSearchCriteria | null>(null);
  const [saveDataSchemas, setSaveDataSchemas] = useState<Record<number, SaveDataSchemaDto>>({});
  const [schemaLoadErrors, setSchemaLoadErrors] = useState<Record<number, string>>({});
  const [schemaLoadingIds, setSchemaLoadingIds] = useState<number[]>([]);
  const [editorRecordId, setEditorRecordId] = useState<number | null>(null);
  const [pageMode, setPageMode] = useState<'view' | 'edit'>('view');
  const schemaRequestGenerationRef = useRef(0);

  const saveDataDefinition = useMemo(() => getResourceDefinition('save-datas'), []);

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

  const requestedMasterIds = useMemo(() => Array.from(new Set(
    (lookups?.saveDatas ?? [])
      .map((saveData) => saveData.gameSoftwareMasterId)
      .filter((masterId) => Number.isInteger(masterId) && masterId > 0),
  )), [lookups]);

  useEffect(() => {
    if (loading || !lookups) {
      return;
    }

    const pendingIds = requestedMasterIds.filter((id) => (
      !saveDataSchemas[id] && !schemaLoadingIds.includes(id) && !schemaLoadErrors[id]
    ));
    if (pendingIds.length === 0) {
      return;
    }

    const generation = schemaRequestGenerationRef.current;
    setSchemaLoadingIds((current) => Array.from(new Set([...current, ...pendingIds])));

    const loadSchemas = async () => {
      const results: PromiseSettledResult<{ masterId: number; schema: SaveDataSchemaDto }>[] = [];
      for (let index = 0; index < pendingIds.length; index += 8) {
        const batch = pendingIds.slice(index, index + 8);
        const batchResults = await Promise.allSettled(batch.map(async (masterId) => ({
          masterId,
          schema: await fetchPublicSaveDataSchema(masterId),
        })));
        if (generation !== schemaRequestGenerationRef.current) {
          return;
        }
        results.push(...batchResults);
      }

      const nextSchemas: Record<number, SaveDataSchemaDto> = {};
      const nextErrors: Record<number, string> = {};
      results.forEach((result, index) => {
        const masterId = pendingIds[index]!;
        if (result.status === 'fulfilled') {
          nextSchemas[masterId] = result.value.schema;
        } else {
          nextErrors[masterId] = getGameManagementErrorMessage(result.reason, {
            fallback: resources.gameManagement.errors.schemaLoad,
          });
        }
      });
      setSaveDataSchemas((current) => ({ ...current, ...nextSchemas }));
      setSchemaLoadErrors((current) => ({ ...current, ...nextErrors }));
      setSchemaLoadingIds((current) => current.filter((id) => !pendingIds.includes(id)));
    };

    void loadSchemas();
  }, [loading, lookups, requestedMasterIds, saveDataSchemas, schemaLoadErrors, schemaLoadingIds]);

  const searchableFields = useMemo(() => getSaveDataSearchFields(saveDataSchemas), [saveDataSchemas]);
  const results = useMemo(() => (
    lookups && submittedSearch
      ? evaluateSaveDataSearch(lookups, saveDataSchemas, submittedSearch)
      : []
  ), [lookups, saveDataSchemas, submittedSearch]);
  const resultIds = useMemo(() => results.map((result) => result.saveData.id), [results]);
  const schemasPending = schemaLoadingIds.length > 0 || Object.keys(schemaLoadErrors).length > 0;
  const canSearch = Boolean(
    !loading
    && lookups
    && !schemasPending
    && fieldKey
    && value.trim(),
  );

  const handleSearch = useCallback(() => {
    if (!fieldKey || !value.trim()) {
      setSearchError('検索項目と値を指定してください。');
      return;
    }
    if (schemaLoadingIds.length > 0 || Object.keys(schemaLoadErrors).length > 0) {
      setSearchError('すべての検索スキーマを読み込んでから検索してください。');
      return;
    }

    setSearchError(null);
    setSubmittedSearch({
      gameSoftwareMasterId: gameSoftwareMasterId ? Number(gameSoftwareMasterId) : null,
      fieldKey,
      value: value.trim(),
    });
  }, [fieldKey, gameSoftwareMasterId, schemaLoadErrors, schemaLoadingIds.length, value]);

  const handleReload = useCallback(() => {
    schemaRequestGenerationRef.current += 1;
    setSaveDataSchemas({});
    setSchemaLoadErrors({});
    setSchemaLoadingIds([]);
    setSubmittedSearch(null);
    void load();
  }, [load]);

  const handleRetrySchemas = useCallback(() => {
    setSchemaLoadErrors({});
  }, []);

  return (
    <PageFrame
      eyebrowLabel=""
      title="セーブデータ検索"
      description="セーブデータのカスタム項目を1つ選び、所有データを横断して検索します。"
      layoutMode={layoutMode}
      navigationActiveHref="/game-library/save-data-search"
      stickyActions={(
        <CustomButton variant="accent" onClick={handleSearch} disabled={!canSearch}>
          検索
        </CustomButton>
      )}
      actions={(
        <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={2} align="end">
          <Link href="/game-library" className="button-link button-link--secondary">
            戻る
          </Link>
          <CustomButton onClick={handleReload}>
            再読込
          </CustomButton>
        </ResponsiveActionGroup>
      )}
    >
      {isTrial || error || searchError ? (
        <div className="tool-page__notices">
          {isTrial ? <TrialBanner /> : null}
          {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
          {searchError ? <CustomMessageArea variant="error">{searchError}</CustomMessageArea> : null}
        </div>
      ) : null}
      {loading ? (
        <p className="tool-muted text-sm" role="status">検索対象を読み込んでいます...</p>
      ) : !lookups ? null : (
        <>
          <PageSection title="検索条件" description="テキスト項目は部分一致、数値・日付・選択肢は値で照合します。">
            {schemaLoadingIds.length > 0 ? (
              <p className="tool-muted text-sm" role="status">
                {schemaLoadingIds.length} 件のスキーマを読み込んでいます...
              </p>
            ) : null}
            {Object.keys(schemaLoadErrors).length > 0 ? (
              <CustomMessageArea variant="error">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>一部のセーブデータスキーマを読み込めませんでした。完全な横断検索のため、再試行してください。</span>
                  <CustomButton variant="ghost" onClick={handleRetrySchemas}>再試行</CustomButton>
                </div>
              </CustomMessageArea>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                <CustomLabel htmlFor="save-data-search-master">ゲームソフトマスタ（任意）</CustomLabel>
                <CustomComboBox
                  id="save-data-search-master"
                  value={gameSoftwareMasterId}
                  onChange={(event) => setGameSoftwareMasterId(event.target.value)}
                >
                  <option value="">すべて</option>
                  {lookups.gameSoftwareMasters.map((master) => (
                    <option key={master.id} value={String(master.id)}>{master.abbreviation || master.name}</option>
                  ))}
                </CustomComboBox>
              </div>
              <div className="space-y-2">
                <CustomLabel htmlFor="save-data-search-field">カスタム項目</CustomLabel>
                <CustomComboBox
                  id="save-data-search-field"
                  value={fieldKey}
                  onChange={(event) => {
                    setFieldKey(event.target.value);
                    setSubmittedSearch(null);
                  }}
                  disabled={searchableFields.length === 0 || schemaLoadingIds.length > 0}
                >
                  <option value="">項目を選択</option>
                  {searchableFields.map((field) => (
                    <option key={field.fieldKey} value={field.fieldKey}>
                      {field.label}（{field.availableIn}作品）
                    </option>
                  ))}
                </CustomComboBox>
              </div>
              <div className="space-y-2">
                <CustomLabel htmlFor="save-data-search-value">値</CustomLabel>
                <CustomTextBox
                  id="save-data-search-value"
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value);
                    setSubmittedSearch(null);
                  }}
                  placeholder="例: oza"
                  disabled={!fieldKey || schemaLoadingIds.length > 0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && canSearch) {
                      handleSearch();
                    }
                  }}
                />
              </div>
            </div>
            {searchableFields.length === 0 && schemaLoadingIds.length === 0 && Object.keys(schemaLoadErrors).length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">検索できるカスタム項目がありません。</p>
            ) : null}
          </PageSection>

          <PageSection
            title="検索結果"
            description={submittedSearch ? `${results.length} 件ヒットしました。` : '条件を入力して検索してください。'}
          >
            {submittedSearch && results.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">一致するセーブデータはありませんでした。</p>
            ) : null}
            <div className="space-y-3">
              {submittedSearch ? results.map((result) => (
                <article key={result.saveData.id} className="space-y-3 rounded-[0.35rem] border border-[var(--color-base-70)] bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-[var(--color-text-strong)]">
                        セーブデータ #{result.saveData.id} — {getMasterDisplayName(result.saveData.gameSoftwareMasterId, lookups)}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        保存方式: {formatSaveStorageType(result.saveData.saveStorageType)}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        保存先: {getStorageSummary(result.saveData, lookups) || '未設定'}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {searchableFields.find((field) => field.fieldKey === submittedSearch.fieldKey)?.label ?? submittedSearch.fieldKey}: {result.matchedFieldValue}
                      </p>
                    </div>
                    <CustomButton
                      variant="neutral"
                      onClick={() => {
                        setPageMode('view');
                        setEditorRecordId(result.saveData.id);
                      }}
                    >
                      詳細
                    </CustomButton>
                  </div>
                </article>
              )) : null}
            </div>
          </PageSection>
        </>
      )}
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
