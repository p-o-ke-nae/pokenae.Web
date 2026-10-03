'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import PageModeToggle from '@/components/atoms/PageModeToggle';
import CustomTextArea from '@/components/atoms/CustomTextArea';
import CustomTextBox from '@/components/atoms/CustomTextBox';
import Dialog, { DialogFooterLayout } from '@/components/molecules/Dialog';
import ResponsiveActionGroup from '@/components/molecules/ResponsiveActionGroup';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import type { LayoutMode } from '@/lib/hooks/useResponsiveLayoutMode';
import type { PageMode } from '@/lib/game-management/resources';
import {
  createMaintenanceRecord,
  deleteMaintenanceRecord,
  fetchMaintenanceList,
  getGameManagementErrorMessage,
  updateMaintenanceRecord,
} from '@/lib/game-management/api';
import { extractProblemFieldErrors } from '@/lib/game-management/api/core';
import {
  buildMaintenanceSummaryText,
  formatMaintenanceDate,
  isMaintenanceDateInFuture,
} from '@/lib/game-management/maintenance';
import type {
  CreateGameConsoleMaintenanceRequest,
  CreateGameSoftwareMaintenanceRequest,
  CreateMemoryCardMaintenanceRequest,
  GameConsoleMaintenanceDto,
  GameSoftwareMaintenanceDto,
  MaintenanceSummaryDto,
  UpdateGameConsoleMaintenanceRequest,
  UpdateGameSoftwareMaintenanceRequest,
  UpdateMemoryCardMaintenanceRequest,
  MemoryCardMaintenanceDto,
} from '@/lib/game-management/types';
import resources from '@/lib/resources';

export type MaintenanceResourceKey = 'game-consoles' | 'game-softwares' | 'memory-cards';

type MaintenanceRecord = GameConsoleMaintenanceDto | GameSoftwareMaintenanceDto | MemoryCardMaintenanceDto;

type MaintenancePayload =
  | CreateGameConsoleMaintenanceRequest
  | CreateGameSoftwareMaintenanceRequest
  | CreateMemoryCardMaintenanceRequest
  | UpdateGameConsoleMaintenanceRequest
  | UpdateGameSoftwareMaintenanceRequest
  | UpdateMemoryCardMaintenanceRequest;

export type MaintenanceFormState = {
  maintenanceDate: string;
  isPowerOnPerformed: boolean;
  isStartupConfirmed: boolean;
  memo: string;
};

function getTodayDateString(): string {
  const now = new Date();
  const shifted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 10);
}

function createEmptyFormState(): MaintenanceFormState {
  return {
    maintenanceDate: getTodayDateString(),
    isPowerOnPerformed: true,
    isStartupConfirmed: true,
    memo: '',
  };
}

function buildFormState(record: MaintenanceRecord): MaintenanceFormState {
  return {
    maintenanceDate: record.maintenanceDate.slice(0, 10),
    isPowerOnPerformed: record.isPowerOnPerformed,
    isStartupConfirmed: record.isStartupConfirmed,
    memo: record.memo ?? '',
  };
}

function buildPayload(formState: MaintenanceFormState): MaintenancePayload {
  return {
    maintenanceDate: formState.maintenanceDate,
    isPowerOnPerformed: formState.isPowerOnPerformed,
    isStartupConfirmed: formState.isStartupConfirmed,
    memo: formState.memo.trim() ? formState.memo.trim() : null,
  };
}

function validateFormState(formState: MaintenanceFormState): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const appendError = (field: keyof MaintenanceFormState, message: string) => {
    errors[field] = [...(errors[field] ?? []), message];
  };

  if (!formState.maintenanceDate) {
    appendError('maintenanceDate', '実施日を入力してください。');
  } else if (isMaintenanceDateInFuture(formState.maintenanceDate, getTodayDateString())) {
    appendError('maintenanceDate', '未来日は指定できません。');
  }

  if (!formState.isPowerOnPerformed && !formState.isStartupConfirmed) {
    appendError('isPowerOnPerformed', '通電または起動確認のどちらかは実施してください。');
    appendError('isStartupConfirmed', '通電または起動確認のどちらかは実施してください。');
  }

  if (formState.isStartupConfirmed && !formState.isPowerOnPerformed) {
    appendError('isPowerOnPerformed', '起動確認を行う場合は通電も実施してください。');
  }

  return errors;
}

function getRecordStatusLabel(record: MaintenanceRecord): string {
  if (record.isStartupConfirmed) {
    return '起動確認済み';
  }

  if (record.isPowerOnPerformed) {
    return '通電のみ';
  }

  return '未実施';
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <p className="text-sm text-[var(--color-danger)]">
      {messages.join(' ')}
    </p>
  );
}

export default function MaintenanceRecordsSection({
  resourceKey,
  parentId,
  summary,
  readOnly = false,
  trialMode = false,
  autoOpenCreateOnMount = false,
  layoutMode = 'desktop',
  initialFormState,
  pageMode,
  onPageModeChange,
  onChanged,
  onSaved,
}: {
  resourceKey: MaintenanceResourceKey;
  parentId: number;
  summary?: MaintenanceSummaryDto;
  readOnly?: boolean;
  trialMode?: boolean;
  autoOpenCreateOnMount?: boolean;
  layoutMode?: LayoutMode;
  initialFormState?: MaintenanceFormState;
  pageMode?: PageMode;
  onPageModeChange?: (mode: PageMode) => void;
  onChanged: () => void;
  onSaved?: (mode: 'create' | 'update', values: MaintenanceFormState) => void;
}) {
  const { isPending, startLoading } = useLoadingOverlay();
  const autoOpenedRef = useRef(false);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(!trialMode);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRecord | null>(null);
  const [formState, setFormState] = useState<MaintenanceFormState>(createEmptyFormState());
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    if (trialMode) {
      setRecords([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextRecords = await fetchMaintenanceList(resourceKey, parentId);
      setRecords(nextRecords);
    } catch (loadError) {
      setError(getGameManagementErrorMessage(loadError, {
        fallback: resources.gameManagement.errors.detailLoad,
      }));
    } finally {
      setLoading(false);
    }
  }, [parentId, resourceKey, trialMode]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const openCreateDialog = useCallback(() => {
    setEditingRecord(null);
    setFormState(initialFormState ?? createEmptyFormState());
    setFormErrors({});
    setSubmitError(null);
    setSubmitSuccess(null);
    setEditorOpen(true);
  }, [initialFormState]);

  const openEditDialog = useCallback((record: MaintenanceRecord) => {
    setEditingRecord(record);
    setFormState(buildFormState(record));
    setFormErrors({});
    setSubmitError(null);
    setSubmitSuccess(null);
    setEditorOpen(true);
  }, []);

  const closeEditorDialog = useCallback(() => {
    setEditorOpen(false);
    setEditingRecord(null);
    setFormErrors({});
    setSubmitError(null);
    setSubmitSuccess(null);
  }, []);

  useEffect(() => {
    if (!autoOpenCreateOnMount || readOnly || trialMode || autoOpenedRef.current) {
      return;
    }

    autoOpenedRef.current = true;
    openCreateDialog();
  }, [autoOpenCreateOnMount, openCreateDialog, readOnly, trialMode]);

  const submitLabel = '保存';

  const maintenanceSummaryText = useMemo(
    () => buildMaintenanceSummaryText(summary),
    [summary],
  );

  const handleSave = useCallback(async () => {
    const nextFormErrors = validateFormState(formState);
    if (Object.keys(nextFormErrors).length > 0) {
      setFormErrors(nextFormErrors);
      setSubmitError(resources.gameManagement.validation.inputIncomplete);
      return;
    }

    setFormErrors({});
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await startLoading(async () => {
        const payload = buildPayload(formState);
        if (editingRecord) {
          await updateMaintenanceRecord(resourceKey, parentId, editingRecord.id, payload);
        } else {
          await createMaintenanceRecord(resourceKey, parentId, payload);
        }
      }, 'メンテナンスを保存中...');

      setSubmitSuccess('メンテナンスを保存しました。');
      await loadRecords();
      onChanged();
      onSaved?.(editingRecord ? 'update' : 'create', formState);
      closeEditorDialog();
    } catch (saveError) {
      const details = saveError instanceof Error && 'details' in saveError
        ? (saveError as Error & { details?: unknown }).details
        : undefined;
      const nextServerErrors = extractProblemFieldErrors(details);
      setFormErrors(nextServerErrors);
      setSubmitError(getGameManagementErrorMessage(saveError, {
        fallback: resources.gameManagement.errors.save,
      }));
    }
  }, [closeEditorDialog, editingRecord, formState, loadRecords, onChanged, onSaved, parentId, resourceKey, startLoading]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await startLoading(async () => {
        await deleteMaintenanceRecord(resourceKey, parentId, deleteTarget.id);
      }, 'メンテナンスを削除中...');

      setDeleteTarget(null);
      await loadRecords();
      onChanged();
    } catch (deleteError) {
      setDeleteTarget(null);
      setError(getGameManagementErrorMessage(deleteError, {
        fallback: resources.gameManagement.errors.delete,
      }));
    }
  }, [deleteTarget, loadRecords, onChanged, parentId, resourceKey, startLoading]);

  return (
    <>
      <section className="space-y-4 border-t-4 border-[var(--color-accent-25)] pt-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[var(--color-text-strong)]">メンテナンス記録</h3>
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">{maintenanceSummaryText}</p>
            </div>
            {pageMode && onPageModeChange ? <PageModeToggle mode={pageMode} onChange={onPageModeChange} /> : null}
          </div>
          {!readOnly ? (
            <CustomButton onClick={openCreateDialog} disabled={trialMode}>
              保存
            </CustomButton>
          ) : null}
        </div>

        {trialMode ? (
          <CustomMessageArea variant="info">
            トライアルモードではメンテナンス記録の閲覧と保存は利用できません。ログイン後に管理してください。
          </CustomMessageArea>
        ) : null}
        {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}

        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">メンテナンス記録を読み込んでいます...</p>
        ) : trialMode ? (
          <p className="text-sm text-[var(--color-text-muted)]">トライアルモードではメンテナンス記録は表示されません。</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">メンテナンス記録はまだありません。</p>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <article key={record.id} className="space-y-3 rounded-[0.35rem] border border-[var(--color-base-70)] bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--color-text-strong)]">
                      {formatMaintenanceDate(record.maintenanceDate)} / {getRecordStatusLabel(record)}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      通電: {record.isPowerOnPerformed ? '実施' : '未実施'} / 起動確認: {record.isStartupConfirmed ? '成功' : '未確認'}
                    </p>
                    {record.memo ? (
                      <p className="text-sm leading-6 text-[var(--color-text-muted)]">{record.memo}</p>
                    ) : null}
                  </div>
                  {!readOnly ? (
                    <div className="flex flex-wrap gap-2">
                      <CustomButton variant="neutral" onClick={() => openEditDialog(record)}>
                        編集
                      </CustomButton>
                      <CustomButton variant="ghost" onClick={() => setDeleteTarget(record)}>
                        削除
                      </CustomButton>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog
        open={editorOpen}
        onClose={closeEditorDialog}
        title={editingRecord ? 'メンテナンスを編集' : 'メンテナンスを追加'}
        size="md"
        footer={(
          <DialogFooterLayout
            layoutMode={layoutMode}
            separatePrimary={false}
            status={submitSuccess ? <CustomMessageArea variant="success">{submitSuccess}</CustomMessageArea> : null}
            trailing={(
              <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={2} align="end">
                <CustomButton variant="neutral" onClick={closeEditorDialog} disabled={isPending}>
                  キャンセル
                </CustomButton>
                <CustomButton variant="accent" onClick={() => void handleSave()} disabled={isPending}>
                  {submitLabel}
                </CustomButton>
              </ResponsiveActionGroup>
            )}
          />
        )}
      >
        <div className="space-y-5">
          {submitError ? <CustomMessageArea variant="error">{submitError}</CustomMessageArea> : null}
          <div className="space-y-2">
            <CustomLabel htmlFor="maintenanceDate" required>実施日</CustomLabel>
            <CustomTextBox
              id="maintenanceDate"
              type="date"
              max={getTodayDateString()}
              value={formState.maintenanceDate}
              onChange={(event) => setFormState((current) => ({ ...current, maintenanceDate: event.target.value }))}
              isError={Boolean(formErrors.maintenanceDate?.length)}
            />
            <FieldError messages={formErrors.maintenanceDate} />
          </div>

          <div className="space-y-3">
            <CustomLabel>実施内容</CustomLabel>
            <label className="flex items-start gap-3 rounded-[0.35rem] border border-[var(--color-base-70)] p-3">
              <CustomCheckBox
                checked={formState.isPowerOnPerformed}
                onChange={(event) => setFormState((current) => ({ ...current, isPowerOnPerformed: event.target.checked }))}
              />
              <span className="space-y-1 text-sm text-[var(--foreground)]">
                <span className="block font-medium">通電を実施</span>
                <span className="block text-[var(--color-text-muted)]">電源投入まで行った場合はチェックしてください。</span>
              </span>
            </label>
            <FieldError messages={formErrors.isPowerOnPerformed} />

            <label className="flex items-start gap-3 rounded-[0.35rem] border border-[var(--color-base-70)] p-3">
              <CustomCheckBox
                checked={formState.isStartupConfirmed}
                onChange={(event) => setFormState((current) => ({ ...current, isStartupConfirmed: event.target.checked }))}
              />
              <span className="space-y-1 text-sm text-[var(--foreground)]">
                <span className="block font-medium">起動確認に成功</span>
                <span className="block text-[var(--color-text-muted)]">タイトル画面到達など、正常起動を確認できた場合にチェックしてください。</span>
              </span>
            </label>
            <FieldError messages={formErrors.isStartupConfirmed} />
          </div>

          <div className="space-y-2">
            <CustomLabel htmlFor="maintenanceMemo">メモ</CustomLabel>
            <CustomTextArea
              id="maintenanceMemo"
              value={formState.memo}
              onChange={(event) => setFormState((current) => ({ ...current, memo: event.target.value }))}
              placeholder="症状や作業内容など"
            />
            <FieldError messages={formErrors.memo} />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="メンテナンスを削除"
        size="sm"
        footer={(
          <DialogFooterLayout
            layoutMode={layoutMode}
            separatePrimary={false}
            trailing={(
              <ResponsiveActionGroup layoutMode={layoutMode} mobileColumns={2} align="end">
                <CustomButton variant="neutral" onClick={() => setDeleteTarget(null)} disabled={isPending}>
                  キャンセル
                </CustomButton>
                <CustomButton variant="ghost" onClick={() => void handleDelete()} disabled={isPending}>
                  削除
                </CustomButton>
              </ResponsiveActionGroup>
            )}
          />
        )}
      >
        <p className="text-sm leading-6 text-[var(--color-text-muted)]">
          {deleteTarget
            ? `${formatMaintenanceDate(deleteTarget.maintenanceDate)} のメンテナンス記録を削除します。`
            : 'メンテナンス記録を削除します。'}
        </p>
      </Dialog>
    </>
  );
}
