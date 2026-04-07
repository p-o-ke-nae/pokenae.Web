'use client';

import { useCallback, useState } from 'react';
import CustomButton from '@/components/atoms/CustomButton';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import Dialog from '@/components/molecules/Dialog';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import {
  ApiError,
  getLocalizedErrorMessage,
  moveAccountBetweenConsoles,
} from '@/lib/game-management/api';
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
  const { startLoading } = useLoadingOverlay();
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

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!sourceGameConsoleId) {
      setError('移行元のゲーム機を選択してください。');
      return;
    }
    if (!targetGameConsoleId) {
      setError('移行先のゲーム機を選択してください。');
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
        if (err instanceof ApiError) {
          setError(getLocalizedErrorMessage(err.statusCode, err.details));
        } else {
          setError(err instanceof Error ? err.message : '移行中にエラーが発生しました。');
        }
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
      title="アカウントのゲーム機間移行"
      size="md"
      footer={
        <>
          <CustomButton onClick={handleClose}>
            キャンセル
          </CustomButton>
          <CustomButton variant="accent" onClick={handleSubmit}>
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
          onChange={(value) => setSourceGameConsoleId(value)}
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
          移行先には、移行元と同一分類または互換関係にあり、かつこのアカウント種類で許可されたゲーム機のみ表示されます。移行すると、このアカウントに紐づくダウンロード版ゲームソフトのインストール先と、セーブデータの本体が自動的に移行先へ更新されます。
        </CustomMessageArea>
      </div>
    </Dialog>
  );
}
