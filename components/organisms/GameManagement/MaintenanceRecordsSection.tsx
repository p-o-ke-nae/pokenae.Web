'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import CustomTextArea from '@/components/atoms/CustomTextArea';
import CustomTextBox from '@/components/atoms/CustomTextBox';
import Dialog, { DialogFooterLayout } from '@/components/molecules/Dialog';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import type { LayoutMode } from '@/lib/hooks/useResponsiveLayoutMode';
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

type MaintenanceFormState = {
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
  } else if (formState.maintenanceDate > getTodayDateString()) {
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
    <p className="text-sm text-red-600 dark:text-red-400">
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
  onChanged: () => void;
  onSaved?: (mode: 'create' | 'update') => void;
}) {
  const { startLoading } = useLoadingOverlay();
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
    setFormState(createEmptyFormState());
    setFormErrors({});
    setSubmitError(null);
    setSubmitSuccess(null);
    setEditorOpen(true);
  }, []);

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

  const submitLabel = editingRecord ? '更新する' : '記録を追加';

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
      }, editingRecord ? '保守記録を更新中...' : '保守記録を保存中...');

      setSubmitSuccess(editingRecord ? '保守記録を更新しました。' : '保守記録を追加しました。');
      await loadRecords();
      onChanged();
      onSaved?.(editingRecord ? 'update' : 'create');
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
      }, '保守記録を削除中...');

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
      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">保守記録</h3>
            <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-300">{maintenanceSummaryText}</p>
          </div>
          {!readOnly ? (
            <CustomButton onClick={openCreateDialog} disabled={trialMode}>
              記録を追加
            </CustomButton>
          ) : null}
        </div>

        {trialMode ? (
          <CustomMessageArea variant="info">
            トライアルモードでは保守履歴の閲覧と保存は利用できません。ログイン後に保守記録を管理してください。
          </CustomMessageArea>
        ) : null}
        {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}

        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-300">保守記録を読み込んでいます...</p>
        ) : trialMode ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-300">トライアルモードでは保守記録はまだ表示されません。</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-300">保守記録はまだありません。</p>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <article key={record.id} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatMaintenanceDate(record.maintenanceDate)} / {getRecordStatusLabel(record)}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-300">
                      通電: {record.isPowerOnPerformed ? '実施' : '未実施'} / 起動確認: {record.isStartupConfirmed ? '成功' : '未確認'}
                    </p>
                    {record.memo ? (
                      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-200">{record.memo}</p>
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
        title={editingRecord ? '保守記録を編集' : '保守記録を追加'}
        size="md"
        footer={(
          <DialogFooterLayout
            layoutMode={layoutMode}
            status={submitSuccess ? <CustomMessageArea variant="success">{submitSuccess}</CustomMessageArea> : null}
            trailing={(
              <>
                <CustomButton variant="neutral" onClick={closeEditorDialog}>
                  キャンセル
                </CustomButton>
                <CustomButton onClick={() => void handleSave()}>
                  {submitLabel}
                </CustomButton>
              </>
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
              value={formState.maintenanceDate}
              onChange={(event) => setFormState((current) => ({ ...current, maintenanceDate: event.target.value }))}
              isError={Boolean(formErrors.maintenanceDate?.length)}
            />
            <FieldError messages={formErrors.maintenanceDate} />
          </div>

          <div className="space-y-3">
            <CustomLabel>実施内容</CustomLabel>
            <label className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              <CustomCheckBox
                checked={formState.isPowerOnPerformed}
                onChange={(event) => setFormState((current) => ({ ...current, isPowerOnPerformed: event.target.checked }))}
              />
              <span className="space-y-1 text-sm text-zinc-700 dark:text-zinc-200">
                <span className="block font-medium">通電を実施</span>
                <span className="block text-zinc-500 dark:text-zinc-300">電源投入まで行った場合はチェックしてください。</span>
              </span>
            </label>
            <FieldError messages={formErrors.isPowerOnPerformed} />

            <label className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              <CustomCheckBox
                checked={formState.isStartupConfirmed}
                onChange={(event) => setFormState((current) => ({ ...current, isStartupConfirmed: event.target.checked }))}
              />
              <span className="space-y-1 text-sm text-zinc-700 dark:text-zinc-200">
                <span className="block font-medium">起動確認に成功</span>
                <span className="block text-zinc-500 dark:text-zinc-300">タイトル画面到達など、正常起動を確認できた場合にチェックしてください。</span>
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
        title="保守記録を削除"
        size="sm"
        footer={(
          <DialogFooterLayout
            layoutMode={layoutMode}
            trailing={(
              <>
                <CustomButton variant="neutral" onClick={() => setDeleteTarget(null)}>
                  キャンセル
                </CustomButton>
                <CustomButton variant="ghost" onClick={() => void handleDelete()}>
                  削除する
                </CustomButton>
              </>
            )}
          />
        )}
      >
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {deleteTarget
            ? `${formatMaintenanceDate(deleteTarget.maintenanceDate)} の保守記録を削除します。`
            : '保守記録を削除します。'}
        </p>
      </Dialog>
    </>
  );
}
