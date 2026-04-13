'use client';

import { useCallback, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import Dialog from '@/components/molecules/Dialog';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import {
  getGameManagementErrorMessage,
  moveAccountBetweenConsoles,
} from '@/lib/game-management/api';
import resources from '@/lib/resources';
import type { AccountDto, ManagementLookups } from '@/lib/game-management/types';
import { getAccountDisplay, getAccountMoveTargetConsoles, getGameConsoleDisplay } from './helpers';
import { SelectField } from './shared';

export type AccountMoveDialogProps = {
  open: boolean;
  onClose: () => void;
  account: AccountDto;
  lookups: ManagementLookups;
  onSuccess: () => void;
};

export default function AccountMoveDialog({
  open,
  onClose,
  account,
  lookups,
  onSuccess,
}: AccountMoveDialogProps) {
  const { isPending, startLoading } = useLoadingOverlay();
  const [sourceGameConsoleId, setSourceGameConsoleId] = useState('');
  const [targetGameConsoleId, setTargetGameConsoleId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const linkedConsoles = lookups.gameConsoles.filter((gc) =>
    account.linkedGameConsoleIds.includes(gc.id),
  );

  const sourceOptions = linkedConsoles.map((gc) => ({
    value: String(gc.id),
    label: getGameConsoleDisplay(gc, lookups),
  }));

  const targetConsoles = getAccountMoveTargetConsoles(account, Number(sourceGameConsoleId) || null, lookups);

  const targetOptions = targetConsoles
    .map((gc) => ({
      value: String(gc.id),
      label: getGameConsoleDisplay(gc, lookups),
    }));
  const canSubmit = !!sourceGameConsoleId && targetOptions.some((option) => option.value === targetGameConsoleId);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!sourceGameConsoleId) {
      setError(resources.gameManagement.validation.selectSourceConsole);
      return;
    }
    if (!targetGameConsoleId) {
      setError(resources.gameManagement.validation.selectTargetConsole);
      return;
    }

    await startLoading(async () => {
      try {
        await moveAccountBetweenConsoles({
          accountId: account.id,
          sourceGameConsoleId: Number(sourceGameConsoleId),
          targetGameConsoleId: Number(targetGameConsoleId),
        });
        onSuccess();
        onClose();
      } catch (err) {
        setError(getGameManagementErrorMessage(err, { fallback: resources.gameManagement.errors.accountMove }));
      }
    }, 'アカウントを移行中...');
  }, [account.id, sourceGameConsoleId, targetGameConsoleId, startLoading, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    setSourceGameConsoleId('');
    setTargetGameConsoleId('');
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      closeDisabled={isPending}
      title="アカウントのゲーム機間移行"
      size="md"
      footer={
        <>
          {isPending ? <span role="status" aria-live="polite" className="text-xs text-zinc-500 dark:text-zinc-300">移行中はダイアログを閉じられません。</span> : null}
          <CustomButton onClick={handleClose} disabled={isPending}>
            キャンセル
          </CustomButton>
          <CustomButton variant="accent" disabled={!canSubmit || isPending} onClick={handleSubmit}>
            移行する
          </CustomButton>
        </>
      }
    >
      <div className="space-y-5 p-1">
        <div className="select-none rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          対象アカウント: {getAccountDisplay(account, lookups)}
        </div>

        {error && <CustomMessageArea variant="error">{error}</CustomMessageArea>}

        <SelectField
          id="sourceGameConsoleId"
          label="移行元ゲーム機"
          value={sourceGameConsoleId}
          options={sourceOptions}
          onChange={(value) => {
            setSourceGameConsoleId(value);
            setTargetGameConsoleId('');
          }}
          placeholder="選択してください"
        />

        <SelectField
          id="targetGameConsoleId"
          label="移行先ゲーム機"
          value={targetGameConsoleId}
          options={targetOptions}
          onChange={(value) => setTargetGameConsoleId(value)}
          placeholder="選択してください"
        />

        <CustomMessageArea variant="info">
          {resources.gameManagement.info.accountMove}
        </CustomMessageArea>
      </div>
    </Dialog>
  );
}
