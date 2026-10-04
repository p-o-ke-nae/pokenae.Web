'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import CustomButton from '@/components/atoms/CustomButton';
import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import CustomComboBox from '@/components/atoms/CustomComboBox';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import CustomTextBox from '@/components/atoms/CustomTextBox';
import Dialog from '@/components/molecules/Dialog';
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
  getSaveDataSearchFields,
  getSaveDataSearchOperators,
  type SaveDataSearchCriteria,
  type SaveDataSearchFieldOption,
} from '@/lib/game-management/save-data-search';
import {
  buildSaveDataSearchUrl,
  partitionRestoredSaveDataSearchCriteria,
  restoreSaveDataSearchCriteria,
  shouldRunInitialSaveDataSearch,
  type SaveDataSearchLookupsSource,
} from '@/lib/game-management/save-data-search-url';
import { formatSaveStorageType } from '@/lib/game-management/save-storage-type';
import { buildTrialUserData } from '@/lib/game-management/trial';
import type { ManagementLookups, SaveDataSchemaDto, StoryProgressSchemaDto } from '@/lib/game-management/types';
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

function getFieldDefaultOperator(field: SaveDataSearchFieldOption): SaveDataSearchCriteria['operator'] {
  return field.fieldType === 0 || field.fieldType === 1 ? 'contains' : 'equals';
}

export default function SaveDataSearchPage() {
  const { data: session, status: sessionStatus } = useSession();
  const sessionReady = sessionStatus !== 'loading';
  const isTrial = !session?.user;
  const expectedLookupsSource: SaveDataSearchLookupsSource = isTrial ? 'trial' : 'authenticated';
  const layoutMode = useResponsiveLayoutMode();
  const [lookups, setLookups] = useState<ManagementLookups | null>(null);
  const [lookupsSource, setLookupsSource] = useState<SaveDataSearchLookupsSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<SaveDataSearchCriteria[]>([]);
  const [submittedSearch, setSubmittedSearch] = useState<SaveDataSearchCriteria[] | null>(null);
  const [urlInitialized, setUrlInitialized] = useState(false);
  const [initialSearchPending, setInitialSearchPending] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [candidateQuery, setCandidateQuery] = useState('');
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [saveDataSchemas, setSaveDataSchemas] = useState<Record<number, SaveDataSchemaDto>>({});
  const [storyProgressSchemas, setStoryProgressSchemas] = useState<Record<number, StoryProgressSchemaDto>>({});
  const [schemaLoadErrors, setSchemaLoadErrors] = useState<Record<number, string>>({});
  const [schemaLoadingIds, setSchemaLoadingIds] = useState<number[]>([]);
  const [editorRecordId, setEditorRecordId] = useState<number | null>(null);
  const [pageMode, setPageMode] = useState<'view' | 'edit'>('view');
  const schemaRequestGenerationRef = useRef(0);
  const loadRequestRef = useRef(0);
  const saveDataDefinition = useMemo(() => getResourceDefinition('save-datas'), []);

  const load = useCallback(async () => {
    if (!sessionReady) return;
    const source: SaveDataSearchLookupsSource = isTrial ? 'trial' : 'authenticated';
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    schemaRequestGenerationRef.current += 1;
    setLoading(true);
    setError(null);
    setLookupsSource(null);
    setSaveDataSchemas({});
    setStoryProgressSchemas({});
    setSchemaLoadErrors({});
    setSchemaLoadingIds([]);
    try {
      const result = isTrial
        ? { ...await fetchPublicMasterLookups(), ...buildTrialUserData() }
        : await fetchAuthenticatedUserLookups();
      if (requestId !== loadRequestRef.current) return;
      setLookups(result);
      setLookupsSource(source);
    } catch (loadError) {
      if (requestId !== loadRequestRef.current) return;
      setError(getGameManagementErrorMessage(loadError, {
        fallback: resources.gameManagement.errors.listLoad,
      }));
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, [isTrial, sessionReady]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const restoredCriteria = restoreSaveDataSearchCriteria(window.location.search);
    setCriteria(restoredCriteria);
    setInitialSearchPending(restoredCriteria.length > 0);
    setUrlInitialized(true);
  }, []);

  const requestedMasterIds = useMemo(() => Array.from(new Set(
    (lookups?.saveDatas ?? [])
      .map((saveData) => saveData.gameSoftwareMasterId)
      .filter((masterId) => Number.isInteger(masterId) && masterId > 0),
  )), [lookups]);

  useEffect(() => {
    if (loading || !lookups) return;
    const pendingIds = requestedMasterIds.filter((id) => (
      !saveDataSchemas[id] && !schemaLoadingIds.includes(id) && !schemaLoadErrors[id]
    ));
    if (pendingIds.length === 0) return;

    const generation = schemaRequestGenerationRef.current;
    setSchemaLoadingIds((current) => Array.from(new Set([...current, ...pendingIds])));
    const loadSchemas = async () => {
      const results: PromiseSettledResult<{
        masterId: number;
        schema: SaveDataSchemaDto;
        storyProgressSchema: StoryProgressSchemaDto;
      }>[] = [];
      for (let index = 0; index < pendingIds.length; index += 8) {
        const batch = pendingIds.slice(index, index + 8);
        const batchResults = await Promise.allSettled(batch.map(async (masterId) => {
          const [schema, storyProgressSchema] = await Promise.all([
            fetchPublicSaveDataSchema(masterId),
            fetchPublicStoryProgressSchema(masterId),
          ]);
          return { masterId, schema, storyProgressSchema };
        }));
        if (generation !== schemaRequestGenerationRef.current) return;
        results.push(...batchResults);
      }

      const nextSchemas: Record<number, SaveDataSchemaDto> = {};
      const nextStoryProgressSchemas: Record<number, StoryProgressSchemaDto> = {};
      const nextErrors: Record<number, string> = {};
      results.forEach((result, index) => {
        const masterId = pendingIds[index]!;
        if (result.status === 'fulfilled') {
          nextSchemas[masterId] = result.value.schema;
          nextStoryProgressSchemas[masterId] = result.value.storyProgressSchema;
        } else {
          nextErrors[masterId] = getGameManagementErrorMessage(result.reason, {
            fallback: resources.gameManagement.errors.schemaLoad,
          });
        }
      });
      setSaveDataSchemas((current) => ({ ...current, ...nextSchemas }));
      setStoryProgressSchemas((current) => ({ ...current, ...nextStoryProgressSchemas }));
      setSchemaLoadErrors((current) => ({ ...current, ...nextErrors }));
      setSchemaLoadingIds((current) => current.filter((id) => !pendingIds.includes(id)));
    };
    void loadSchemas();
  }, [loading, lookups, requestedMasterIds, saveDataSchemas, schemaLoadErrors, schemaLoadingIds]);

  const searchableFields = useMemo(
    () => lookups ? getSaveDataSearchFields(saveDataSchemas, lookups, storyProgressSchemas) : [],
    [lookups, saveDataSchemas, storyProgressSchemas],
  );
  const fieldMap = useMemo(() => new Map(searchableFields.map((field) => [field.fieldId, field])), [searchableFields]);
  const results = useMemo(() => (
    lookups && submittedSearch
      ? evaluateSaveDataSearch(lookups, saveDataSchemas, submittedSearch, searchableFields, storyProgressSchemas)
      : []
  ), [lookups, saveDataSchemas, searchableFields, storyProgressSchemas, submittedSearch]);
  const resultIds = useMemo(() => results.map((result) => result.saveData.id), [results]);
  const schemasPending = schemaLoadingIds.length > 0 || Object.keys(schemaLoadErrors).length > 0;
  const schemasReady = schemaLoadingIds.length === 0 && requestedMasterIds.every(
    (masterId) => Boolean(saveDataSchemas[masterId] || schemaLoadErrors[masterId]),
  );
  const canSearch = Boolean(
    !loading && lookups && !schemasPending && criteria.length > 0
  );
  const availableFields = searchableFields.filter((field) => !criteria.some((item) => item.fieldId === field.fieldId));
  const visibleCandidates = availableFields.filter((field) => field.label.toLocaleLowerCase('ja').includes(candidateQuery.trim().toLocaleLowerCase('ja')));

  useEffect(() => {
    if (!shouldRunInitialSaveDataSearch({
      pending: urlInitialized && initialSearchPending,
      sessionReady,
      loading,
      hasLookups: Boolean(lookups),
      lookupsSource,
      expectedSource: expectedLookupsSource,
      schemasReady,
      hasSchemaErrors: Object.keys(schemaLoadErrors).length > 0,
    })) return;
    const { valid, invalid } = partitionRestoredSaveDataSearchCriteria(criteria, fieldMap);
    if (invalid.length > 0) {
      setCriteria(valid);
      setSearchError(`URL内の検索条件を確認してください。（使用できない検索項目: ${invalid.map((criterion) => criterion.fieldId).join('、')}）`);
      setInitialSearchPending(false);
      return;
    }
    setSearchError(null);
    setSubmittedSearch(criteria.map((criterion) => ({ ...criterion })));
    setInitialSearchPending(false);
  }, [
    criteria,
    expectedLookupsSource,
    fieldMap,
    initialSearchPending,
    loading,
    lookups,
    lookupsSource,
    schemaLoadErrors,
    schemasReady,
    sessionReady,
    urlInitialized,
  ]);

  useEffect(() => {
    if (!urlInitialized) return;
    window.history.replaceState(
      window.history.state,
      '',
      buildSaveDataSearchUrl(window.location.href, criteria),
    );
  }, [criteria, urlInitialized]);

  const handleSearch = useCallback(() => {
    if (criteria.length === 0) {
      setSearchError('検索項目を指定してください。');
      return;
    }
    if (schemaLoadingIds.length > 0 || Object.keys(schemaLoadErrors).length > 0) {
      setSearchError('すべての検索スキーマを読み込んでから検索してください。');
      return;
    }
    setSearchError(null);
    setSubmittedSearch(criteria.map((criterion) => ({ ...criterion })));
  }, [criteria, schemaLoadErrors, schemaLoadingIds.length]);

  const handleReload = useCallback(() => {
    setSubmittedSearch(null);
    void load();
  }, [load]);

  const updateCriterion = (fieldId: string, update: Partial<SaveDataSearchCriteria>) => {
    setCriteria((current) => current.map((criterion) => criterion.fieldId === fieldId
      ? { ...criterion, ...update }
      : criterion));
    setSubmittedSearch(null);
  };

  const addSearchFields = () => {
    setCriteria((current) => [
      ...current,
      ...selectedFieldIds.flatMap((fieldId) => {
        const field = fieldMap.get(fieldId);
        return field ? [{ fieldId, operator: getFieldDefaultOperator(field), value: '' }] : [];
      }),
    ]);
    setSelectedFieldIds([]);
    setCandidateQuery('');
    setSearchDialogOpen(false);
    setSubmittedSearch(null);
  };

  const handleRetrySchemas = useCallback(() => {
    setSchemaLoadErrors({});
  }, []);

  return (
    <PageFrame
      title="セーブデータ検索"
      description="複数の検索項目を組み合わせ、セーブデータと保存先を検索します。検索条件はURLで共有できます。"
      layoutMode={layoutMode}
      navigationActiveHref="/game-library/save-data-search"
      stickyActions={(
        <CustomButton variant="accent" onClick={handleSearch} disabled={!canSearch}>
          検索
        </CustomButton>
      )}
      actions={(
        <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={2} align="end">
          <CustomButton onClick={handleReload}>再読込</CustomButton>
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
          <PageSection title="検索条件" description="複数の検索項目を追加すると、すべての条件に一致するデータを検索します。">
            {schemaLoadingIds.length > 0 ? (
              <p className="tool-muted text-sm" role="status">{schemaLoadingIds.length} 件のスキーマを読み込んでいます...</p>
            ) : null}
            {Object.keys(schemaLoadErrors).length > 0 ? (
              <CustomMessageArea variant="error">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>一部の検索スキーマを読み込めませんでした。検索するには再試行してください。</span>
                  <CustomButton variant="ghost" onClick={handleRetrySchemas}>再試行</CustomButton>
                </div>
              </CustomMessageArea>
            ) : null}
            <div className="space-y-3">
              {criteria.map((criterion) => {
                const field = fieldMap.get(criterion.fieldId);
                if (!field) return null;
                const operators = getSaveDataSearchOperators(field);
                const usesSelect = field.fieldType === 4 || field.fieldType === 6 || field.fieldType === 'master';
                const valueOptions = field.fieldType === 4
                  ? [{ value: 'true', label: 'はい' }, { value: 'false', label: 'いいえ' }]
                  : field.options;
                return (
                  <div key={criterion.fieldId} className="grid items-end gap-3 rounded-[0.35rem] border border-[var(--color-base-70)] p-3 md:grid-cols-[minmax(10rem,1fr)_minmax(9rem,0.8fr)_minmax(10rem,1fr)_auto]">
                    <div className="space-y-2">
                      <p className="m-0 text-sm font-semibold text-[var(--color-text-strong)]">{field.label}</p>
                    </div>
                    <div className="space-y-2">
                      <CustomLabel htmlFor={`search-operator-${criterion.fieldId}`}>条件</CustomLabel>
                      <CustomComboBox
                        id={`search-operator-${criterion.fieldId}`}
                        value={criterion.operator}
                        onChange={(event) => updateCriterion(criterion.fieldId, { operator: event.target.value as SaveDataSearchCriteria['operator'] })}
                      >
                        {operators.map((operator) => (
                          <option key={operator.value} value={operator.value}>{operator.label}</option>
                        ))}
                      </CustomComboBox>
                    </div>
                    <div className="space-y-2">
                      <CustomLabel htmlFor={`search-value-${criterion.fieldId}`}>値</CustomLabel>
                      {usesSelect ? (
                        <CustomComboBox
                          id={`search-value-${criterion.fieldId}`}
                          value={criterion.value}
                          onChange={(event) => updateCriterion(criterion.fieldId, { value: event.target.value })}
                        >
                          <option value="">選択</option>
                          {valueOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </CustomComboBox>
                      ) : (
                        <CustomTextBox
                          id={`search-value-${criterion.fieldId}`}
                          type={field.fieldType === 2 || field.fieldType === 3 ? 'number' : field.fieldType === 5 ? 'date' : 'text'}
                          value={criterion.value}
                          onChange={(event) => updateCriterion(criterion.fieldId, { value: event.target.value })}
                          step={field.fieldType === 3 ? 'any' : undefined}
                        />
                      )}
                    </div>
                    <CustomButton
                      variant="ghost"
                      onClick={() => {
                        setCriteria((current) => current.filter((item) => item.fieldId !== criterion.fieldId));
                        setSubmittedSearch(null);
                      }}
                    >
                      削除
                    </CustomButton>
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <CustomButton
                variant="neutral"
                onClick={() => setSearchDialogOpen(true)}
                disabled={availableFields.length === 0 || schemaLoadingIds.length > 0}
              >
                検索項目を追加
              </CustomButton>
            </div>
            {searchableFields.length === 0 && schemaLoadingIds.length === 0 && Object.keys(schemaLoadErrors).length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">検索できる項目がありません。</p>
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
                        {getMasterDisplayName(result.saveData.gameSoftwareMasterId, lookups)}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        保存方式: {formatSaveStorageType(result.saveData.saveStorageType)}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        保存先: {getStorageSummary(result.saveData, lookups) || '未設定'}
                      </p>
                      {submittedSearch.map((criterion, index) => (
                        <p key={criterion.fieldId} className="text-sm text-[var(--color-text-muted)]">
                          {fieldMap.get(criterion.fieldId)?.label ?? criterion.fieldId}: {result.matchedValues[index] || '（空欄）'}
                        </p>
                      ))}
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
      <Dialog
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        title="検索項目を選択"
        size="md"
        footer={(
          <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={2} align="end">
            <CustomButton variant="neutral" onClick={() => setSearchDialogOpen(false)}>キャンセル</CustomButton>
            <CustomButton variant="accent" onClick={addSearchFields} disabled={selectedFieldIds.length === 0}>追加</CustomButton>
          </ResponsiveActionGroup>
        )}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <CustomLabel htmlFor="search-field-filter">項目名で検索</CustomLabel>
            <CustomTextBox
              id="search-field-filter"
              value={candidateQuery}
              onChange={(event) => setCandidateQuery(event.target.value)}
            />
          </div>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {visibleCandidates.map((field) => (
              <label key={field.fieldId} className="flex min-h-11 items-center gap-3 rounded-[0.35rem] border border-[var(--color-base-70)] px-3 py-2 text-sm">
                <CustomCheckBox
                  checked={selectedFieldIds.includes(field.fieldId)}
                  onChange={(event) => setSelectedFieldIds((current) => (
                    event.target.checked
                      ? [...current, field.fieldId]
                      : current.filter((id) => id !== field.fieldId)
                  ))}
                />
                <span>{field.label}</span>
              </label>
            ))}
            {visibleCandidates.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">該当する検索項目がありません。</p>
            ) : null}
          </div>
        </div>
      </Dialog>
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
