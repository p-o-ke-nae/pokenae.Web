'use client';

import { useCallback, useMemo, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import CustomTextArea from '@/components/atoms/CustomTextArea';
import Dialog from '@/components/molecules/Dialog';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import { getGameManagementErrorMessage, updateResource } from '@/lib/game-management/api';
import resources from '@/lib/resources';
import type { ResourceDefinition } from '@/lib/game-management/resources';
import type { ManagementLookups, ResourceKey } from '@/lib/game-management/types';
import { selectOptionsFromLookups, optionize, SAVE_STORAGE_TYPE_OPTIONS } from './options';
import { SelectField } from './shared';

type BulkFormState = Record<string, string>;

export type BulkEditorDialogProps = {
  open: boolean;
  onClose: () => void;
  resourceKey: ResourceKey;
  definition: ResourceDefinition;
  lookups: ManagementLookups;
  targetRecordIds: number[];
  bulkEditableFields: string[];
  onDataChanged: () => void;
};

const FIELD_LABELS: Record<string, string> = {
  memo: 'メモ',
  variant: '種類',
  saveStorageType: '保存方式',
  gameConsoleCategoryId: 'ゲーム機カテゴリ',
  gameConsoleMasterId: 'ゲーム機マスタ',
  contentGroupId: '分類',
};

export default function BulkEditorDialog({
  open,
  onClose,
  resourceKey,
  definition,
  lookups,
  targetRecordIds,
  bulkEditableFields,
  onDataChanged,
}: BulkEditorDialogProps) {
  const { isPending, startLoading } = useLoadingOverlay();
  const [formState, setFormState] = useState<BulkFormState>({});
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const options = useMemo(() => selectOptionsFromLookups(lookups), [lookups]);

  const applyPatch = useCallback((field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleField = useCallback((field: string) => {
    setEnabledFields((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const activeFieldCount = bulkEditableFields.filter((field) => enabledFields[field]).length;

  const handleSave = useCallback(async () => {
    const activeFields = bulkEditableFields.filter((f) => enabledFields[f]);
    if (activeFields.length === 0) {
      setError(resources.gameManagement.validation.enableBulkField);
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await startLoading(async () => {
        for (const recordId of targetRecordIds) {
          const patch: Record<string, unknown> = {};
          for (const field of activeFields) {
            const value = formState[field] ?? '';
            if (field === 'memo') {
              patch[field] = value.trim() || null;
            } else if (field === 'variant') {
              patch[field] = value ? Number(value) : null;
            } else if (field === 'saveStorageType') {
              patch[field] = value ? Number(value) : 0;
            } else if (field.endsWith('Id')) {
              patch[field] = value ? Number(value) : null;
            } else {
              patch[field] = value.trim() || null;
            }
          }
          await updateResource(resourceKey, recordId, patch);
        }
      }, `${targetRecordIds.length} 件を一括更新中...`);

      setSuccess(`${targetRecordIds.length} 件を更新しました。`);
      onDataChanged();
      onClose();
    } catch (err) {
      setError(getGameManagementErrorMessage(err, { fallback: resources.gameManagement.errors.bulkUpdate }));
    }
  }, [bulkEditableFields, enabledFields, formState, onClose, onDataChanged, resourceKey, startLoading, targetRecordIds]);

  const renderField = (field: string) => {
    const isEnabled = enabledFields[field] ?? false;
    const label = FIELD_LABELS[field] ?? field;

    switch (field) {
      case 'memo':
        return (
          <div key={field} className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={isEnabled} onChange={() => toggleField(field)} />
              <CustomLabel htmlFor={`bulk-${field}`}>{label}</CustomLabel>
            </div>
            {isEnabled && (
              <CustomTextArea
                id={`bulk-${field}`}
                value={formState[field] ?? ''}
                onChange={(e) => applyPatch(field, e.target.value)}
                placeholder="一括設定する値"
              />
            )}
          </div>
        );
      case 'variant':
        return (
          <div key={field} className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={isEnabled} onChange={() => toggleField(field)} />
              <CustomLabel>{label}</CustomLabel>
            </div>
            {isEnabled && (
              <SelectField
                id={`bulk-${field}`}
                label=""
                value={formState[field] ?? ''}
                options={[{ value: '', label: '未設定' }, { value: '0', label: 'パッケージ版' }, { value: '1', label: 'ダウンロード版' }]}
                onChange={(value) => applyPatch(field, value)}
              />
            )}
          </div>
        );
      case 'saveStorageType':
        return (
          <div key={field} className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={isEnabled} onChange={() => toggleField(field)} />
              <CustomLabel>{label}</CustomLabel>
            </div>
            {isEnabled && (
              <SelectField
                id={`bulk-${field}`}
                label=""
                value={formState[field] ?? ''}
                options={SAVE_STORAGE_TYPE_OPTIONS}
                onChange={(value) => applyPatch(field, value)}
              />
            )}
          </div>
        );
      case 'gameConsoleCategoryId':
        return (
          <div key={field} className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={isEnabled} onChange={() => toggleField(field)} />
              <CustomLabel>{label}</CustomLabel>
            </div>
            {isEnabled && (
              <SelectField
                id={`bulk-${field}`}
                label=""
                value={formState[field] ?? ''}
                options={options.gameConsoleCategories}
                onChange={(value) => applyPatch(field, value)}
              />
            )}
          </div>
        );
      case 'gameConsoleMasterId':
        return (
          <div key={field} className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={isEnabled} onChange={() => toggleField(field)} />
              <CustomLabel>{label}</CustomLabel>
            </div>
            {isEnabled && (
              <SelectField
                id={`bulk-${field}`}
                label=""
                value={formState[field] ?? ''}
                options={options.gameConsoleMasters}
                onChange={(value) => applyPatch(field, value)}
              />
            )}
          </div>
        );
      case 'contentGroupId':
        return (
          <div key={field} className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={isEnabled} onChange={() => toggleField(field)} />
              <CustomLabel>{label}</CustomLabel>
            </div>
            {isEnabled && (
              <SelectField
                id={`bulk-${field}`}
                label=""
                value={formState[field] ?? ''}
                options={optionize(options.gameSoftwareContentGroups, true)}
                onChange={(value) => applyPatch(field, value)}
              />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeDisabled={isPending}
      title={`${definition.shortLabel} 一括編集（${targetRecordIds.length} 件）`}
      size="md"
      footer={
        <>
          {isPending ? <span role="status" aria-live="polite" className="text-xs text-zinc-500 dark:text-zinc-300">更新中はダイアログを閉じられません。</span> : null}
          <CustomButton onClick={onClose} disabled={isPending}>キャンセル</CustomButton>
          <CustomButton variant="accent" disabled={activeFieldCount === 0 || isPending} onClick={() => void handleSave()}>
            一括更新
          </CustomButton>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
        {success ? <CustomMessageArea variant="success">{success}</CustomMessageArea> : null}
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          有効にした項目の値を、選択中の {targetRecordIds.length} 件すべてに適用します。
        </p>
        <div className="space-y-4">
          {bulkEditableFields.map((field) => renderField(field))}
        </div>
      </div>
    </Dialog>
  );
}
