import { validateDynamicFieldInputs } from '@/lib/game-management/save-data-fields';
import type {
  ManagementLookups,
  ResourceKey,
  SaveDataSchemaDto,
  StoryProgressSchemaDto,
} from '@/lib/game-management/types';
import {
  getSaveStorageTypeForGameSoftwareMaster,
  isConsoleCompatibleWithGameSoftwareMaster,
  numberOrNull,
  validateDisplayOrder,
} from './helpers';
import type { FormState } from './view-types';

export function validateForm(
  resourceKey: ResourceKey,
  formState: FormState,
  isNew: boolean,
  lookups: ManagementLookups,
  saveDataSchema: SaveDataSchemaDto | null,
  storyProgressSchema: StoryProgressSchemaDto | null,
): string[] {
  const displayOrderError = validateDisplayOrder(formState.displayOrder, { required: !isNew });

  switch (resourceKey) {
    case 'account-type-masters':
      return [
        displayOrderError,
        !formState.name.trim() ? '名称を入力してください。' : '',
        !formState.abbreviation.trim() ? '略称を入力してください。' : '',
      ].filter(Boolean);
    case 'accounts':
      return [
        displayOrderError,
        isNew && !formState.accountTypeMasterId ? 'アカウント種類を選択してください。' : '',
      ].filter(Boolean);
    case 'game-console-categories':
      return [
        displayOrderError,
        !formState.name.trim() ? '名称を入力してください。' : '',
        !formState.abbreviation.trim() ? '略称を入力してください。' : '',
      ].filter(Boolean);
    case 'game-console-masters':
      return [
        displayOrderError,
        !formState.name.trim() ? '名称を入力してください。' : '',
        !formState.abbreviation.trim() ? '略称を入力してください。' : '',
        !formState.gameConsoleCategoryId ? 'ゲーム機カテゴリを選択してください。' : '',
      ].filter(Boolean);
    case 'game-console-edition-masters':
      return [
        displayOrderError,
        !formState.name.trim() ? '名称を入力してください。' : '',
        !formState.abbreviation.trim() ? '略称を入力してください。' : '',
        !formState.gameConsoleMasterId ? 'ゲーム機マスタを選択してください。' : '',
      ].filter(Boolean);
    case 'game-consoles':
      return [
        displayOrderError,
        !formState.gameConsoleMasterId ? 'ゲーム機マスタを選択してください。' : '',
      ].filter(Boolean);
    case 'game-software-content-groups':
      return [
        displayOrderError,
        !formState.name.trim() ? '名称を入力してください。' : '',
      ].filter(Boolean);
    case 'game-software-masters':
      return [
        displayOrderError,
        !formState.name.trim() ? '名称を入力してください。' : '',
        !formState.abbreviation.trim() ? '略称を入力してください。' : '',
        !formState.gameConsoleCategoryId ? 'ゲーム機カテゴリを選択してください。' : '',
      ].filter(Boolean);
    case 'game-softwares': {
      const gameSoftwareMasterId = numberOrNull(formState.gameSoftwareMasterId);
      const errors = [
        displayOrderError,
        !formState.gameSoftwareMasterId ? 'ゲームソフトマスタを選択してください。' : '',
      ].filter(Boolean);
      if (formState.variant === '1') {
        const accountId = numberOrNull(formState.accountId);
        const installedGameConsoleId = numberOrNull(formState.installedGameConsoleId);
        if (installedGameConsoleId && !isConsoleCompatibleWithGameSoftwareMaster(gameSoftwareMasterId, installedGameConsoleId, lookups)) {
          errors.push('選択したインストール先ゲーム機は、このゲームソフトの対応分類または互換分類に含まれていません。');
        }
        if (accountId && installedGameConsoleId) {
          const account = lookups.accounts.find((a) => a.id === accountId);
          if (account && !account.linkedGameConsoleIds.includes(installedGameConsoleId)) {
            errors.push('選択したアカウントとゲーム機が紐づけられていません。');
          }
        }
      } else {
        if (formState.accountId) {
          errors.push('ダウンロード版以外ではアカウントを指定できません。');
        }
        if (formState.installedGameConsoleId) {
          errors.push('ダウンロード版以外ではインストール先ゲーム機を指定できません。');
        }
      }
      return errors;
    }
    case 'memory-cards':
      return [
        displayOrderError,
        !formState.memoryCardEditionMasterId ? 'メモリーカード種類を選択してください。' : '',
      ].filter(Boolean);
    case 'memory-card-edition-masters':
      return [
        displayOrderError,
        !formState.name.trim() ? '名称を入力してください。' : '',
        !formState.blockCount.trim() ? 'ブロック数を選択してください。' : '',
        formState.blockCount.trim() && formState.blockCount !== '59' && formState.blockCount !== '251' && formState.blockCount !== '1019' ? 'ブロック数は59、251、1019のいずれかを選択してください。' : '',
      ].filter(Boolean);
    case 'save-datas': {
      const gameSoftwareMasterId = numberOrNull(formState.gameSoftwareMasterId);
      const gameSoftwareId = numberOrNull(formState.gameSoftwareId);
      const saveStorageType = getSaveStorageTypeForGameSoftwareMaster(gameSoftwareMasterId, lookups);
      const storyProgressDefinitionId = numberOrNull(formState.storyProgressDefinitionId);
      const errors = [
        displayOrderError,
        !formState.gameSoftwareMasterId ? 'ゲームソフトマスタを選択してください。' : '',
        formState.gameSoftwareMasterId && saveStorageType == null ? '保存方式を判定できません。ゲームソフトマスタの紐付けを確認してください。' : '',
        saveStorageType === 0 && !formState.gameSoftwareId ? 'このセーブデータではゲームソフトの選択が必須です。' : '',
        saveStorageType === 1 && !formState.gameConsoleId ? 'このセーブデータではゲーム機の選択が必須です。' : '',
        saveStorageType === 2 && !formState.gameConsoleId ? 'このセーブデータではゲーム機の選択が必須です。' : '',
        saveStorageType === 2 && !formState.accountId ? 'このセーブデータではアカウントの選択が必須です。' : '',
        saveStorageType === 3 && !formState.memoryCardId ? 'このセーブデータではメモリーカードの選択が必須です。' : '',
      ].filter(Boolean);

      if (saveStorageType === 0 && gameSoftwareId != null) {
        const selectedSoftware = lookups.gameSoftwares.find((item) => item.id === gameSoftwareId);
        if (!selectedSoftware) {
          errors.push('選択したゲームソフトが見つかりません。');
        } else if (selectedSoftware.gameSoftwareMasterId !== gameSoftwareMasterId) {
          errors.push('選択したゲームソフトがゲームソフトマスタと一致していません。');
        }
      }

      if (saveStorageType === 0 && (formState.gameConsoleId || formState.accountId || formState.memoryCardId)) {
        errors.push('ソフト保存では本体、アカウント、メモリーカードを指定できません。');
      }
      if (saveStorageType !== 0 && formState.gameSoftwareId) {
        errors.push('ソフト保存以外ではゲームソフトを指定できません。');
      }
      if (saveStorageType === 1 && (formState.accountId || formState.memoryCardId)) {
        errors.push('本体保存ではアカウントとメモリーカードを指定できません。');
      }
      if (saveStorageType === 2 && formState.memoryCardId) {
        errors.push('本体＋アカウント保存ではメモリーカードを指定できません。');
      }
      if (saveStorageType === 2 && formState.accountId && formState.gameConsoleId) {
        const accountId = numberOrNull(formState.accountId);
        const gameConsoleId = numberOrNull(formState.gameConsoleId);
        if (accountId && gameConsoleId) {
          const account = lookups.accounts.find((a) => a.id === accountId);
          if (account && !account.linkedGameConsoleIds.includes(gameConsoleId)) {
            errors.push('選択したアカウントとゲーム機が紐づけられていません。アカウント管理から紐づけを設定してください。');
          }
        }
      }
      if ((saveStorageType === 1 || saveStorageType === 2) && formState.gameConsoleId) {
        const gameConsoleId = numberOrNull(formState.gameConsoleId);
        if (gameConsoleId != null && !isConsoleCompatibleWithGameSoftwareMaster(gameSoftwareMasterId, gameConsoleId, lookups)) {
          errors.push('選択したゲーム機は、このセーブデータの作品分類または互換分類に含まれていません。');
        }
      }
      if (saveStorageType === 3 && (formState.gameConsoleId || formState.accountId)) {
        errors.push('メモリーカード保存では本体とアカウントを指定できません。');
      }

      if (storyProgressDefinitionId != null) {
        if (!storyProgressSchema) {
          errors.push('ストーリー進行度候補を取得できていません。');
        } else {
          const selectedStoryProgress = storyProgressSchema.choices.find((choice) => choice.storyProgressDefinitionId === storyProgressDefinitionId);
          if (!selectedStoryProgress) {
            errors.push('選択したストーリー進行度はこの作品では利用できません。');
          } else if (selectedStoryProgress.isDisabled) {
            errors.push('無効化されたストーリー進行度は選択できません。');
          }
        }
      }

      errors.push(...validateDynamicFieldInputs(saveDataSchema, formState.dynamicFieldValues));

      return errors;
    }
    default:
      return [];
  }
}
