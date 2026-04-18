'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import CustomTextArea from '@/components/atoms/CustomTextArea';
import ResponsiveActionGroup from '@/components/molecules/ResponsiveActionGroup';
import Dialog, { DialogFooterLayout } from '@/components/molecules/Dialog';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import type { LayoutMode } from '@/lib/hooks/useResponsiveLayoutMode';
import {
  fetchResourceById,
  getGameManagementErrorMessage,
} from '@/lib/game-management/api';
import resources from '@/lib/resources';
import {
  fetchPublicSaveDataSchema,
  fetchPublicStoryProgressSchema,
} from '@/lib/game-management/api/public';
import type { ResourceDefinition } from '@/lib/game-management/resources';
import type { PageMode } from '@/lib/game-management/resources';
import {
  formatMergedFieldValue,
  formatSaveDataFieldValueForList,
  mergeSchemaWithSaveData,
} from '@/lib/game-management/save-data-fields';
import { trialGetResourceById } from '@/lib/game-management/trial';
import type {
  ManagementLookups,
  ResourceKey,
  SaveDataDto,
  SaveDataSchemaDto,
  StoryProgressSchemaDto,
} from '@/lib/game-management/types';
import { numberOrNull, getStoryProgressLabel } from './helpers';
import { createContinueFormState, createSeededFormState, buildInitialFormState } from './form-state';
import { validateForm } from './validation';
import { selectOptionsFromLookups, optionize } from './options';
import { FormFields } from './form-fields';
import { dispatchSave, dispatchDelete } from './repository';
import { SelectField, ResourceSummary } from './shared';
import type { FormState } from './view-types';

export type EditorDialogProps = {
  open: boolean;
  onClose: () => void;
  resourceKey: ResourceKey;
  definition: ResourceDefinition;
  lookups: ManagementLookups;
  isTrial: boolean;
  /** Record ID to edit, or null for new */
  recordId: number | null;
  /** Initial values applied only when creating a new record */
  initialFormState?: Partial<FormState>;
  /** Called when the active record changes (prev/next or after create) */
  onRecordIdChange: (id: number | null) => void;
  /** Available row IDs in display order for prev/next navigation */
  rowIds: number[];
  /** Called after data mutation (save/delete) to trigger list reload */
  onDataChanged: () => void;
  /** Page-level view/edit mode */
  pageMode?: PageMode;
  /** Callback to change page mode (e.g. when user enables editing from dialog) */
  onPageModeChange?: (mode: PageMode) => void;
  layoutMode?: LayoutMode;
};

export default function EditorDialog({
  open,
  onClose,
  resourceKey,
  definition,
  lookups,
  isTrial,
  recordId,
  initialFormState,
  onRecordIdChange,
  rowIds,
  onDataChanged,
  pageMode = 'edit',
  onPageModeChange,
  layoutMode = 'desktop',
}: EditorDialogProps) {
  const { isPending, startLoading } = useLoadingOverlay();
  const isNew = recordId === null;
  const isViewMode = pageMode === 'view' && !isNew;
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const [formState, setFormState] = useState<FormState>(createSeededFormState(initialFormState));
  const [record, setRecord] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [saveDataSchema, setSaveDataSchema] = useState<SaveDataSchemaDto | null>(null);
  const [saveDataSchemaLoading, setSaveDataSchemaLoading] = useState(false);
  const [saveDataSchemaError, setSaveDataSchemaError] = useState<string | null>(null);
  const [storyProgressSchema, setStoryProgressSchema] = useState<StoryProgressSchemaDto | null>(null);
  const [storyProgressSchemaLoading, setStoryProgressSchemaLoading] = useState(false);
  const [storyProgressSchemaError, setStoryProgressSchemaError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Record loading
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const doLoad = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        if (recordId === null) {
          setRecord(null);
          setFormState(createSeededFormState(initialFormState));
        } else {
          let nextRecord: unknown;
          if (isTrial) {
            nextRecord = trialGetResourceById(resourceKey, recordId);
            if (!nextRecord) throw new Error(`レコード #${recordId} が見つかりません。`);
          } else {
            nextRecord = await fetchResourceById(resourceKey, String(recordId));
          }
          if (cancelled) return;
          setRecord(nextRecord);
          setFormState(buildInitialFormState(resourceKey, nextRecord));
        }
      } catch (err) {
        if (cancelled) return;
        setError(getGameManagementErrorMessage(err, {
          fallback: resources.gameManagement.errors.detailLoad,
          adminFallback: resources.gameManagement.errors.adminRequired,
        }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void doLoad();
    return () => { cancelled = true; };
  }, [initialFormState, open, recordId, isTrial, resourceKey]);

  // Reset on close
  useEffect(() => {
    if (open) return;
    setRecord(null);
    setFormState(createSeededFormState(initialFormState));
    setSaveDataSchema(null);
    setSaveDataSchemaLoading(false);
    setSaveDataSchemaError(null);
    setStoryProgressSchema(null);
    setStoryProgressSchemaLoading(false);
    setStoryProgressSchemaError(null);
    setError(null);
    setSuccess(null);
    setDeleteDialogOpen(false);
  }, [initialFormState, open]);

  // ---------------------------------------------------------------------------
  // Schema loading (save-datas only)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open || resourceKey !== 'save-datas') return;

    const gameSoftwareMasterId = numberOrNull(formState.gameSoftwareMasterId);

    if (!gameSoftwareMasterId) {
      setSaveDataSchema(null);
      setSaveDataSchemaLoading(false);
      setSaveDataSchemaError(null);
      setStoryProgressSchema(null);
      setStoryProgressSchemaLoading(false);
      setStoryProgressSchemaError(null);
      return;
    }

    let cancelled = false;

    const loadSchema = async () => {
      setSaveDataSchema(null);
      setSaveDataSchemaLoading(true);
      setSaveDataSchemaError(null);
      setStoryProgressSchema(null);
      setStoryProgressSchemaLoading(true);
      setStoryProgressSchemaError(null);

      const [sdResult, spResult] = await Promise.allSettled([
        fetchPublicSaveDataSchema(gameSoftwareMasterId),
        fetchPublicStoryProgressSchema(gameSoftwareMasterId),
      ]);

      if (cancelled) return;

      if (sdResult.status === 'fulfilled') {
        setSaveDataSchema(sdResult.value);
      } else {
        setSaveDataSchema(null);
        setSaveDataSchemaError(getGameManagementErrorMessage(sdResult.reason, { fallback: resources.gameManagement.errors.schemaLoad }));
      }
      setSaveDataSchemaLoading(false);

      if (spResult.status === 'fulfilled') {
        setStoryProgressSchema(spResult.value);
      } else {
        setStoryProgressSchema(null);
        setStoryProgressSchemaError(getGameManagementErrorMessage(spResult.reason, { fallback: resources.gameManagement.errors.schemaLoad }));
      }
      setStoryProgressSchemaLoading(false);
    };

    void loadSchema();
    return () => { cancelled = true; };
  }, [formState.gameSoftwareMasterId, open, resourceKey]);

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  const applyPatch = useCallback((patch: Partial<FormState>) => {
    setFormState((current) => ({ ...current, ...patch }));
  }, []);

  const options = useMemo(() => selectOptionsFromLookups(lookups), [lookups]);

  const focusFirstField = useCallback(() => {
    requestAnimationFrame(() => {
      const firstField = bodyRef.current?.querySelector<HTMLElement>(
        'input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([readonly]):not([disabled])',
      );
      firstField?.focus();
    });
  }, []);

  const selectedStoryProgressLabel = useMemo(() => {
    if (resourceKey !== 'save-datas') return null;
    const gsmId = numberOrNull(formState.gameSoftwareMasterId);
    const spdId = numberOrNull(formState.storyProgressDefinitionId);
    if (!gsmId || !spdId) return null;
    const fallbackMap = storyProgressSchema
      ? Object.fromEntries(storyProgressSchema.choices.map((c) => [`${storyProgressSchema.gameSoftwareMasterId}:${c.storyProgressDefinitionId}`, c.label]))
      : {};
    return getStoryProgressLabel(gsmId, spdId, fallbackMap) ?? null;
  }, [formState.gameSoftwareMasterId, formState.storyProgressDefinitionId, resourceKey, storyProgressSchema]);

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(async (afterSave: 'close' | 'continue' = 'close') => {
    setSuccess(null);

    if (resourceKey === 'save-datas' && formState.gameSoftwareMasterId && (saveDataSchemaLoading || storyProgressSchemaLoading)) {
      setError(resources.gameManagement.validation.schemaLoading);
      return;
    }
    if (resourceKey === 'save-datas' && formState.gameSoftwareMasterId && (saveDataSchemaError || storyProgressSchemaError)) {
      setError([saveDataSchemaError, storyProgressSchemaError].filter(Boolean).join('\n'));
      return;
    }

    const validationErrors = validateForm(resourceKey, formState, isNew, lookups, saveDataSchema, storyProgressSchema);
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      return;
    }

    setError(null);

    try {
      let savedId = recordId;
      const continueCreating = afterSave === 'continue' && isNew;
      await startLoading(async () => {
        const newId = await dispatchSave(resourceKey, formState, lookups, isTrial, isNew, recordId != null ? String(recordId) : undefined, saveDataSchema);
        if (newId != null) {
          savedId = newId;
        }
      }, '保存中...');

      if (continueCreating) {
        setRecord(null);
        setFormState(createContinueFormState(resourceKey, formState, initialFormState));
        setSaveDataSchema(null);
        setSaveDataSchemaLoading(false);
        setSaveDataSchemaError(null);
        setStoryProgressSchema(null);
        setStoryProgressSchemaLoading(false);
        setStoryProgressSchemaError(null);
        setSuccess('作成しました。続けて入力できます。');
        onDataChanged();
        focusFirstField();
        return;
      }

      setSuccess(isNew ? '作成しました。' : '更新しました。');

      if (isNew && savedId != null) {
        onRecordIdChange(savedId);
      }

      if (savedId != null) {
        try {
          let nextRecord: unknown;
          if (isTrial) {
            nextRecord = trialGetResourceById(resourceKey, savedId);
          } else {
            nextRecord = await fetchResourceById(resourceKey, String(savedId));
          }
          if (nextRecord) {
            setRecord(nextRecord);
            setFormState(buildInitialFormState(resourceKey, nextRecord));
          }
        } catch {
          // Save succeeded; ignore reload error
        }
      }

      onDataChanged();
    } catch (err) {
      setError(getGameManagementErrorMessage(err, { fallback: resources.gameManagement.errors.save }));
    }
  }, [
    focusFirstField,
    formState, isNew, isTrial, lookups, onDataChanged, onRecordIdChange,
    initialFormState, recordId, resourceKey, saveDataSchema, saveDataSchemaError,
    saveDataSchemaLoading, startLoading, storyProgressSchema,
    storyProgressSchemaError, storyProgressSchemaLoading,
  ]);

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const handleDelete = useCallback(async () => {
    if (recordId == null) return;
    try {
      await startLoading(async () => {
        await dispatchDelete(resourceKey, String(recordId), formState, isTrial);
      }, '削除中...');

      setDeleteDialogOpen(false);
      onDataChanged();
      onClose();
    } catch (err) {
      setDeleteDialogOpen(false);
      setError(getGameManagementErrorMessage(err, { fallback: resources.gameManagement.errors.delete }));
    }
  }, [formState, isTrial, onClose, onDataChanged, recordId, resourceKey, startLoading]);

  // ---------------------------------------------------------------------------
  // Prev / Next navigation
  // ---------------------------------------------------------------------------

  const currentIndex = useMemo(() => {
    if (recordId == null) return -1;
    return rowIds.indexOf(recordId);
  }, [recordId, rowIds]);

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < rowIds.length - 1;

  const navigate = useCallback((direction: 'prev' | 'next') => {
    const idx = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    const targetId = rowIds[idx];
    if (targetId == null) return;
    onRecordIdChange(targetId);
  }, [currentIndex, rowIds, onRecordIdChange]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        closeDisabled={isPending}
        title={`${definition.shortLabel}${isNew ? '作成' : isViewMode ? '詳細' : '編集'}`}
        size={resourceKey === 'save-datas' ? 'lg' : 'md'}
        footer={
          <DialogFooterLayout
            layoutMode={layoutMode}
            status={isPending ? (
              <span role="status" aria-live="polite" className="text-xs text-zinc-500 dark:text-zinc-300">
                保存中はダイアログを閉じられません。
              </span>
            ) : null}
            leading={
              !isNew ? (
                <div className="space-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:space-y-0">
                  <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={2}>
                    <CustomButton
                      disabled={!canGoPrev || loading}
                      onClick={() => navigate('prev')}
                    >
                      ← 前へ
                    </CustomButton>
                    <CustomButton
                      disabled={!canGoNext || loading}
                      onClick={() => navigate('next')}
                    >
                      次へ →
                    </CustomButton>
                  </ResponsiveActionGroup>
                  {currentIndex >= 0 ? (
                    <span className="text-xs text-zinc-500">
                      {currentIndex + 1} / {rowIds.length}
                    </span>
                  ) : null}
                </div>
              ) : null
            }
            trailing={
              isViewMode && onPageModeChange ? (
                <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1} align="end">
                  <CustomButton onClick={onClose} disabled={isPending}>閉じる</CustomButton>
                  <CustomButton variant="accent" disabled={isPending} onClick={() => onPageModeChange('edit')}>
                    編集を有効化
                  </CustomButton>
                </ResponsiveActionGroup>
              ) : (
                <>
                  {!isNew && (definition.canDelete || (!isViewMode && onPageModeChange)) ? (
                    <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1}>
                      {definition.canDelete ? (
                        <CustomButton variant="ghost" onClick={() => setDeleteDialogOpen(true)}>
                          削除
                        </CustomButton>
                      ) : null}
                      {!isViewMode && onPageModeChange ? (
                        <CustomButton onClick={() => onPageModeChange('view')}>
                          読み取り専用に戻す
                        </CustomButton>
                      ) : null}
                    </ResponsiveActionGroup>
                  ) : null}
                  <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={1} align="end">
                    <CustomButton onClick={onClose} disabled={isPending}>キャンセル</CustomButton>
                    {isNew ? (
                      <>
                        <CustomButton onClick={() => void handleSave('continue')} disabled={isPending || loading}>
                          作成して続ける
                        </CustomButton>
                        <CustomButton variant="accent" onClick={() => void handleSave('close')} disabled={isPending || loading}>
                          作成して閉じる
                        </CustomButton>
                      </>
                    ) : definition.canEdit ? (
                      <CustomButton variant="accent" onClick={() => void handleSave('close')} disabled={isPending || loading}>
                        保存する
                      </CustomButton>
                    ) : null}
                  </ResponsiveActionGroup>
                </>
              )
            }
          />
        }
      >
        <div ref={bodyRef} className="space-y-4">
          {error ? <CustomMessageArea variant="error" className="whitespace-pre-line">{error}</CustomMessageArea> : null}
          {success ? <CustomMessageArea variant="success">{success}</CustomMessageArea> : null}
          {loading ? (
            <p className="text-sm text-zinc-500">読み込んでいます...</p>
          ) : (
            <>
              <FormFields
                resourceKey={resourceKey}
                formState={formState}
                onChange={applyPatch}
                lookups={lookups}
                isNew={isNew}
                saveDataSchema={saveDataSchema}
                saveDataSchemaLoading={saveDataSchemaLoading}
                saveDataSchemaError={saveDataSchemaError}
                storyProgressSchema={storyProgressSchema}
                storyProgressSchemaLoading={storyProgressSchemaLoading}
                storyProgressSchemaError={storyProgressSchemaError}
                displayOnly={isViewMode}
              />
              {!isNew && recordId != null && (
                <div className="select-none space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-100">レコード情報</p>
                  <p>ID: {recordId}</p>
                  {record ? <ResourceSummary resourceKey={resourceKey} record={record} lookups={lookups} storyProgressLabel={selectedStoryProgressLabel} /> : null}
                </div>
              )}
              {resourceKey === 'save-datas' && record && !isNew ? (() => {
                const saveData = record as SaveDataDto;
                const mergedFields = mergeSchemaWithSaveData(saveDataSchema, saveData);
                if (mergedFields.length > 0) {
                  return (
                    <div className="select-none space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-100">可変項目の現在値</p>
                      <div className="space-y-2">
                        {mergedFields.filter((field) => !field.isDisabled).map((field) => (
                          <p key={field.fieldKey}>
                            <span className="font-medium text-zinc-800 dark:text-zinc-100">{field.label}</span>: {formatMergedFieldValue(field)}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                }
                if (saveData.extendedFields.length > 0) {
                  return (
                    <div className="select-none space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-100">可変項目の現在値</p>
                      <div className="space-y-2">
                        {saveData.extendedFields.map((field) => (
                          <p key={field.fieldKey}>
                            <span className="font-medium text-zinc-800 dark:text-zinc-100">{field.label}</span>: {formatSaveDataFieldValueForList(field)}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })() : null}
            </>
          )}
        </div>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        closeDisabled={isPending}
        title={`${definition.shortLabel}を削除`}
        footer={
          <DialogFooterLayout
            layoutMode={layoutMode}
            trailing={
              <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={2} align="end">
                <CustomButton onClick={() => setDeleteDialogOpen(false)} disabled={isPending}>キャンセル</CustomButton>
                <CustomButton variant="accent" disabled={isPending} onClick={() => void handleDelete()}>
                  削除する
                </CustomButton>
              </ResponsiveActionGroup>
            }
          />
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">このレコードを削除します。操作は元に戻せない場合があります。</p>
          {resourceKey === 'save-datas' ? (
            <div className="space-y-4">
              <SelectField
                id="replacedBySaveDataId-delete-dialog"
                label="置換先 SaveData"
                value={formState.replacedBySaveDataId}
                options={optionize(options.saveDatas.filter((option) => option.value !== String(recordId)), true)}
                onChange={(value) => applyPatch({ replacedBySaveDataId: value })}
              />
              <div className="space-y-2">
                <CustomLabel htmlFor="deleteReason-delete-dialog">削除理由</CustomLabel>
                <CustomTextArea id="deleteReason-delete-dialog" value={formState.deleteReason} onChange={(event) => applyPatch({ deleteReason: event.target.value })} placeholder="任意の削除理由" />
              </div>
            </div>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
