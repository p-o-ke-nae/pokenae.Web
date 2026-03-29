'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import CustomButton from '@/components/atoms/CustomButton';
import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import CustomComboBox from '@/components/atoms/CustomComboBox';
import CustomHeader from '@/components/atoms/CustomHeader';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import CustomTextArea from '@/components/atoms/CustomTextArea';
import CustomTextBox from '@/components/atoms/CustomTextBox';
import DataTable, { type DataTableColumn } from '@/components/molecules/DataTable';
import Dialog from '@/components/molecules/Dialog';
import { useLoadingOverlay } from '@/contexts/LoadingOverlayContext';
import {
  ApiError,
  createAccount,
  createGameConsole,
  createGameConsoleCategory,
  createGameConsoleMaster,
  createGameConsoleEditionMaster,
  createGameSoftware,
  createGameSoftwareContentGroup,
  createGameSoftwareMaster,
  createMemoryCard,
  createSaveData,
  deleteAccount,
  deleteGameConsole,
  deleteGameConsoleCategory,
  deleteGameConsoleMaster,
  deleteGameConsoleEditionMaster,
  deleteGameSoftware,
  deleteGameSoftwareContentGroup,
  deleteGameSoftwareMaster,
  deleteMemoryCard,
  deleteSaveData,
  fetchMasterLookups,
  fetchPublicSaveDataSchema,
  fetchPublicStoryProgressSchema,
  fetchPublicMasterLookups,
  fetchAuthenticatedUserLookups,
  fetchResourceById,
  updateAccount,
  updateGameConsole,
  updateGameConsoleCategory,
  updateGameConsoleMaster,
  updateGameConsoleEditionMaster,
  updateGameSoftware,
  updateGameSoftwareContentGroup,
  updateGameSoftwareMaster,
  updateMemoryCard,
  updateSaveData,
} from '@/lib/game-management/api';
import {
  getResourceDefinition,
  RESOURCE_DEFINITIONS,
  ADMIN_RESOURCE_ORDER,
  type ResourceDefinition,
} from '@/lib/game-management/resources';
import { formatSaveStorageType, SAVE_STORAGE_TYPE_LABELS } from '@/lib/game-management/save-storage-type';
import SaveDataDynamicFields from '@/components/organisms/GameManagement/SaveDataDynamicFields';
import {
  buildExtendedFieldInputs,
  createDynamicFieldValueMapFromSaveData,
  formatMergedFieldValue,
  formatSaveDataFieldValueForList,
  mergeSchemaWithSaveData,
  validateDynamicFieldInputs,
} from '@/lib/game-management/save-data-fields';
import {
  buildTrialUserData,
  trialCreateAccount,
  trialCreateGameConsole,
  trialCreateGameSoftware,
  trialCreateMemoryCard,
  trialCreateSaveData,
  trialDeleteAccount,
  trialDeleteGameConsole,
  trialDeleteGameSoftware,
  trialDeleteMemoryCard,
  trialDeleteSaveData,
  trialGetResourceById,
  trialUpdateAccount,
  trialUpdateGameConsole,
  trialUpdateGameSoftware,
  trialUpdateMemoryCard,
  trialUpdateSaveData,
} from '@/lib/game-management/trial-storage';
import type {
  AccountDto,
  CreateSaveDataRequest,
  GameConsoleCategoryDto,
  GameConsoleDto,
  GameConsoleEditionMasterDto,
  GameConsoleMasterDto,
  GameSoftwareContentGroupDto,
  GameSoftwareDto,
  GameSoftwareMasterDto,
  GameSoftwareVariant,
  ManagementLookups,
  MemoryCardCapacity,
  MemoryCardDto,
  ResourceKey,
  SaveDataDto,
  SaveDataSchemaDto,
  SaveStorageType,
  SelectOption,
  StoryProgressSchemaDto,
} from '@/lib/game-management/types';

type ManagementTableRow = {
  id: number;
  primary: string;
  relation: string;
  note: string;
  status: string;
  edit: string;
  href: string;
};

type FormState = {
  name: string;
  abbreviation: string;
  manufacturer: string;
  saveStorageType: string;
  label: string;
  memo: string;
  gameConsoleCategoryId: string;
  gameConsoleCategoryIds: string[];
  gameConsoleMasterId: string;
  gameConsoleEditionMasterId: string;
  contentGroupId: string;
  gameSoftwareMasterId: string;
  variant: string;
  capacity: string;
  gameSoftwareId: string;
  gameConsoleId: string;
  accountId: string;
  memoryCardId: string;
  storyProgressDefinitionId: string;
  replacedBySaveDataId: string;
  deleteReason: string;
  dynamicFieldValues: Record<string, string>;
};

type DashboardExtraCard = {
  href: string;
  shortLabel: string;
  title: string;
  description: string;
  actionLabel?: string;
};

type StoryProgressLabelMap = Record<string, string>;

const SAVE_STORAGE_TYPE_OPTIONS: SelectOption[] = [0, 1, 2, 3].map((value) => ({
  value: String(value),
  label: SAVE_STORAGE_TYPE_LABELS[value as SaveStorageType],
}));

const TABLE_COLUMNS: DataTableColumn<ManagementTableRow>[] = [
  {
    key: 'id',
    header: 'ID',
    width: '5rem',
    sortable: true,
    sortValue: (value) => Number(value ?? 0),
  },
  { key: 'primary', header: '名称', sortable: true, filterable: true },
  { key: 'relation', header: '関連', filterable: true },
  { key: 'note', header: '詳細', filterable: true },
  { key: 'status', header: '状態', width: '9rem', sortable: true },
  {
    key: 'edit',
    header: '操作',
    width: '7rem',
    render: (_, row) => (
      <Link
        href={String(row.href)}
        className="text-sm font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
      >
        編集
      </Link>
    ),
  },
];

function createEmptyFormState(): FormState {
  return {
    name: '',
    abbreviation: '',
    manufacturer: '',
    saveStorageType: '0',
    label: '',
    memo: '',
    gameConsoleCategoryId: '',
    gameConsoleCategoryIds: [],
    gameConsoleMasterId: '',
    gameConsoleEditionMasterId: '',
    contentGroupId: '',
    gameSoftwareMasterId: '',
    variant: '',
    capacity: '59',
    gameSoftwareId: '',
    gameConsoleId: '',
    accountId: '',
    memoryCardId: '',
    storyProgressDefinitionId: '',
    replacedBySaveDataId: '',
    deleteReason: '',
    dynamicFieldValues: {},
  };
}

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberOrNull(value: string): number | null {
  if (!value) {
    return null;
  }
  return Number(value);
}

function numberOrZero(value: string): number {
  return Number(value);
}

function formatDeletedState(isDeleted: boolean): string {
  return isDeleted ? '削除済み' : '有効';
}

function getGameConsoleCategoryName(id: number | null | undefined, lookups: ManagementLookups): string {
  if (!id) {
    return '未設定';
  }
  return lookups.gameConsoleCategories.find((item) => item.id === id)?.name ?? `#${id}`;
}

function getGameConsoleMasterName(id: number | null | undefined, lookups: ManagementLookups): string {
  if (!id) {
    return '未設定';
  }
  return lookups.gameConsoleMasters.find((item) => item.id === id)?.name ?? `#${id}`;
}

function getGameSoftwareContentGroupName(id: number | null | undefined, lookups: ManagementLookups): string {
  if (!id) {
    return '未設定';
  }
  return lookups.gameSoftwareContentGroups.find((item) => item.id === id)?.name ?? `#${id}`;
}

function getGameSoftwareMasterName(id: number | null | undefined, lookups: ManagementLookups): string {
  if (!id) {
    return '未設定';
  }
  return lookups.gameSoftwareMasters.find((item) => item.id === id)?.name ?? `#${id}`;
}

function getGameSoftwareDisplay(item: GameSoftwareDto, lookups: ManagementLookups): string {
  const masterName = getGameSoftwareMasterName(item.gameSoftwareMasterId, lookups);
  return item.label ? `${masterName} / ${item.label}` : masterName;
}

function getGameConsoleDisplay(item: GameConsoleDto, lookups: ManagementLookups): string {
  const masterName = getGameConsoleMasterName(item.gameConsoleMasterId, lookups);
  return item.label ? `${masterName} / ${item.label}` : masterName;
}

function getAccountDisplay(item: AccountDto, lookups: ManagementLookups): string {
  if (item.label) {
    return item.label;
  }
  const categories = item.gameConsoleCategoryIds.map((id) => getGameConsoleCategoryName(id, lookups));
  return categories.length > 0 ? categories.join(', ') : `Account #${item.id}`;
}

function getSaveStorageTypeForGameSoftwareMaster(gameSoftwareMasterId: number | null, lookups: ManagementLookups): SaveStorageType | null {
  if (!gameSoftwareMasterId) {
    return null;
  }

  const master = lookups.gameSoftwareMasters.find((item) => item.id === gameSoftwareMasterId);
  if (!master) {
    return null;
  }

  const category = lookups.gameConsoleCategories.find((item) => item.id === master.gameConsoleCategoryId);
  return category?.saveStorageType ?? null;
}

function getConsoleCandidates(gameSoftwareMasterId: number | null, lookups: ManagementLookups): GameConsoleDto[] {
  if (!gameSoftwareMasterId) {
    return [];
  }
  const master = lookups.gameSoftwareMasters.find((item) => item.id === gameSoftwareMasterId);
  if (!master) {
    return [];
  }
  // GameSoftwareMaster.gameConsoleCategoryId → 同カテゴリに属する GameConsoleMaster の ID 群 → その ID を持つ GameConsole
  const masterIdsInCategory = new Set(
    lookups.gameConsoleMasters.filter((cm) => cm.gameConsoleCategoryId === master.gameConsoleCategoryId).map((cm) => cm.id),
  );
  return lookups.gameConsoles.filter((item) => masterIdsInCategory.has(item.gameConsoleMasterId));
}

function getAccountCandidates(gameSoftwareMasterId: number | null, lookups: ManagementLookups): AccountDto[] {
  if (!gameSoftwareMasterId) {
    return [];
  }
  const master = lookups.gameSoftwareMasters.find((item) => item.id === gameSoftwareMasterId);
  if (!master) {
    return [];
  }
  return lookups.accounts.filter((item) => item.gameConsoleCategoryIds.includes(master.gameConsoleCategoryId));
}

function getSaveDataGameSoftwareMasterId(
  saveData: Pick<SaveDataDto, 'gameSoftwareMasterId' | 'gameSoftwareId'>,
  lookups: ManagementLookups,
): number | null {
  if (saveData.gameSoftwareMasterId) {
    return saveData.gameSoftwareMasterId;
  }

  if (!saveData.gameSoftwareId) {
    return null;
  }

  return lookups.gameSoftwares.find((item) => item.id === saveData.gameSoftwareId)?.gameSoftwareMasterId ?? null;
}

function getSaveDataGameSoftwareDisplay(
  saveData: Pick<SaveDataDto, 'gameSoftwareMasterId' | 'gameSoftwareId' | 'saveStorageType'>,
  lookups: ManagementLookups,
): string {
  const software = saveData.saveStorageType === 0 && saveData.gameSoftwareId
    ? lookups.gameSoftwares.find((candidate) => candidate.id === saveData.gameSoftwareId)
    : null;

  if (software) {
    return getGameSoftwareDisplay(software, lookups);
  }

  return getGameSoftwareMasterName(getSaveDataGameSoftwareMasterId(saveData, lookups), lookups);
}

function getStoryProgressLabel(
  gameSoftwareMasterId: number | null | undefined,
  storyProgressDefinitionId: number | null | undefined,
  labelMap: StoryProgressLabelMap,
): string | null {
  if (!gameSoftwareMasterId || !storyProgressDefinitionId) {
    return null;
  }

  return labelMap[`${gameSoftwareMasterId}:${storyProgressDefinitionId}`] ?? `#${storyProgressDefinitionId}`;
}

function buildSaveDataPayload(
  formState: FormState,
  lookups: ManagementLookups,
  saveDataSchema: SaveDataSchemaDto | null,
): CreateSaveDataRequest {
  const payload: CreateSaveDataRequest = {
    gameSoftwareMasterId: numberOrZero(formState.gameSoftwareMasterId),
    gameSoftwareId: null,
    gameConsoleId: null,
    accountId: null,
    memoryCardId: null,
    storyProgressDefinitionId: numberOrNull(formState.storyProgressDefinitionId),
    extendedFields: buildExtendedFieldInputs(saveDataSchema, formState.dynamicFieldValues),
  };
  const saveStorageType = getSaveStorageTypeForGameSoftwareMaster(payload.gameSoftwareMasterId, lookups);

  if (saveStorageType === 0) {
    payload.gameSoftwareId = numberOrNull(formState.gameSoftwareId);
  }

  if (saveStorageType === 1 || saveStorageType === 2) {
    const gameConsoleId = numberOrNull(formState.gameConsoleId);
    if (gameConsoleId) {
      payload.gameConsoleId = gameConsoleId;
    }
  }

  if (saveStorageType === 2) {
    const accountId = numberOrNull(formState.accountId);
    if (accountId) {
      payload.accountId = accountId;
    }
  }

  if (saveStorageType === 3) {
    const memoryCardId = numberOrNull(formState.memoryCardId);
    if (memoryCardId) {
      payload.memoryCardId = memoryCardId;
    }
  }

  return payload;
}

function buildTableRows(resourceKey: ResourceKey, lookups: ManagementLookups, basePath: string, storyProgressLabels: StoryProgressLabelMap = {}): ManagementTableRow[] {
  switch (resourceKey) {
    case 'accounts':
      return lookups.accounts.map((item) => ({
        id: item.id,
        primary: getAccountDisplay(item, lookups),
        relation: item.gameConsoleCategoryIds.map((id) => getGameConsoleCategoryName(id, lookups)).join(', ') || '未設定',
        note: item.memo ?? '',
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
        href: `${basePath}/accounts/${item.id}`,
      }));
    case 'game-console-categories':
      return lookups.gameConsoleCategories.map((item) => ({
        id: item.id,
        primary: item.name,
        relation: `${item.abbreviation} / ${item.manufacturer || 'メーカー未設定'}`,
        note: `保存方式: ${formatSaveStorageType(item.saveStorageType)}`,
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
        href: `${basePath}/game-console-categories/${item.id}`,
      }));
    case 'game-console-masters':
      return lookups.gameConsoleMasters.map((item) => ({
        id: item.id,
        primary: item.name,
        relation: `略称: ${item.abbreviation}`,
        note: `カテゴリ: ${getGameConsoleCategoryName(item.gameConsoleCategoryId, lookups)}`,
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
        href: `${basePath}/game-console-masters/${item.id}`,
      }));
    case 'game-consoles':
      return lookups.gameConsoles.map((item) => ({
        id: item.id,
        primary: getGameConsoleDisplay(item, lookups),
        relation: getGameConsoleMasterName(item.gameConsoleMasterId, lookups),
        note: item.memo ?? '',
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
        href: `${basePath}/game-consoles/${item.id}`,
      }));
    case 'game-console-edition-masters':
      return lookups.gameConsoleEditionMasters.map((item) => ({
        id: item.id,
        primary: item.name,
        relation: `略称: ${item.abbreviation}`,
        note: `マスタ: ${getGameConsoleMasterName(item.gameConsoleMasterId, lookups)}`,
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
        href: `${basePath}/game-console-edition-masters/${item.id}`,
      }));
    case 'game-software-content-groups':
      return lookups.gameSoftwareContentGroups.map((item) => ({
        id: item.id,
        primary: item.name,
        relation: '分類',
        note: 'ゲームソフト分類',
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
        href: `${basePath}/game-software-content-groups/${item.id}`,
      }));
    case 'game-software-masters':
      return lookups.gameSoftwareMasters.map((item) => ({
        id: item.id,
        primary: item.name,
        relation: getGameConsoleCategoryName(item.gameConsoleCategoryId, lookups),
        note: `略称: ${item.abbreviation} / 分類: ${getGameSoftwareContentGroupName(item.contentGroupId, lookups)}`,
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
        href: `${basePath}/game-software-masters/${item.id}`,
      }));
    case 'game-softwares':
      return lookups.gameSoftwares.map((item) => ({
        id: item.id,
        primary: getGameSoftwareDisplay(item, lookups),
        relation: getGameSoftwareMasterName(item.gameSoftwareMasterId, lookups),
        note: [item.variant != null ? `種類: ${item.variant === 0 ? 'パッケージ版' : 'ダウンロード版'}` : '', item.memo ?? ''].filter(Boolean).join(' / '),
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
        href: `${basePath}/game-softwares/${item.id}`,
      }));
    case 'memory-cards':
      return lookups.memoryCards.map((item) => ({
        id: item.id,
        primary: item.label || `MemoryCard #${item.id}`,
        relation: `容量: ${item.capacity} ブロック`,
        note: item.memo ?? '',
        status: formatDeletedState(item.isDeleted),
        edit: '詳細',
        href: `${basePath}/memory-cards/${item.id}`,
      }));
    case 'save-datas':
      return lookups.saveDatas.map((item) => ({
        id: item.id,
        primary: `SaveData #${item.id}`,
        relation: getSaveDataGameSoftwareDisplay(item, lookups),
        note: [
          `方式: ${formatSaveStorageType(item.saveStorageType)}`,
          item.storyProgressDefinitionId ? `進行度: ${getStoryProgressLabel(getSaveDataGameSoftwareMasterId(item, lookups), item.storyProgressDefinitionId, storyProgressLabels)}` : '',
          item.gameConsoleId
            ? `本体: ${(() => {
                const consoleItem = lookups.gameConsoles.find((candidate) => candidate.id === item.gameConsoleId);
                return consoleItem ? getGameConsoleDisplay(consoleItem, lookups) : `#${item.gameConsoleId}`;
              })()}`
            : '',
          item.accountId
            ? `アカウント: ${(() => {
                const account = lookups.accounts.find((candidate) => candidate.id === item.accountId);
                return account ? getAccountDisplay(account, lookups) : `#${item.accountId}`;
              })()}`
            : '',
          item.memoryCardId ? `メモリーカード: #${item.memoryCardId}` : '',
          item.extendedFields.length > 0
            ? `項目: ${item.extendedFields
                .slice(0, 3)
                .map((field) => `${field.label}=${formatSaveDataFieldValueForList(field)}`)
                .join(' / ')}`
            : '',
        ].filter(Boolean).join(' / '),
        status: item.isDeleted ? `削除済み${item.deleteReason ? `: ${item.deleteReason}` : ''}` : '有効',
        edit: '編集',
        href: `${basePath}/save-datas/${item.id}`,
      }));
  }
}

function buildInitialFormState(resourceKey: ResourceKey, record: unknown): FormState {
  const base = createEmptyFormState();

  switch (resourceKey) {
    case 'accounts': {
      const item = record as AccountDto;
      return {
        ...base,
        label: item.label ?? '',
        memo: item.memo ?? '',
        gameConsoleCategoryIds: item.gameConsoleCategoryIds.map(String),
      };
    }
    case 'game-console-categories': {
      const item = record as GameConsoleCategoryDto;
      return {
        ...base,
        name: item.name,
        abbreviation: item.abbreviation,
        manufacturer: item.manufacturer ?? '',
        saveStorageType: String(item.saveStorageType),
      };
    }
    case 'game-console-masters': {
      const item = record as GameConsoleMasterDto;
      return {
        ...base,
        name: item.name,
        abbreviation: item.abbreviation,
        gameConsoleCategoryId: String(item.gameConsoleCategoryId),
      };
    }
    case 'game-console-edition-masters': {
      const item = record as GameConsoleEditionMasterDto;
      return {
        ...base,
        name: item.name,
        abbreviation: item.abbreviation,
        gameConsoleMasterId: String(item.gameConsoleMasterId),
      };
    }
    case 'game-consoles': {
      const item = record as GameConsoleDto;
      return {
        ...base,
        label: item.label ?? '',
        memo: item.memo ?? '',
        gameConsoleMasterId: String(item.gameConsoleMasterId),
        gameConsoleEditionMasterId: item.gameConsoleEditionMasterId ? String(item.gameConsoleEditionMasterId) : '',
      };
    }
    case 'game-software-content-groups': {
      const item = record as GameSoftwareContentGroupDto;
      return {
        ...base,
        name: item.name,
      };
    }
    case 'game-software-masters': {
      const item = record as GameSoftwareMasterDto;
      return {
        ...base,
        name: item.name,
        abbreviation: item.abbreviation,
        gameConsoleCategoryId: String(item.gameConsoleCategoryId),
        contentGroupId: item.contentGroupId ? String(item.contentGroupId) : '',
      };
    }
    case 'game-softwares': {
      const item = record as GameSoftwareDto;
      return {
        ...base,
        label: item.label ?? '',
        memo: item.memo ?? '',
        gameSoftwareMasterId: String(item.gameSoftwareMasterId),
        variant: item.variant != null ? String(item.variant) : '',
      };
    }
    case 'memory-cards': {
      const item = record as MemoryCardDto;
      return {
        ...base,
        capacity: String(item.capacity),
        label: item.label ?? '',
        memo: item.memo ?? '',
      };
    }
    case 'save-datas': {
      const item = record as SaveDataDto;
      return {
        ...base,
        gameSoftwareMasterId: item.gameSoftwareMasterId ? String(item.gameSoftwareMasterId) : '',
        gameSoftwareId: item.saveStorageType === 0 && item.gameSoftwareId ? String(item.gameSoftwareId) : '',
        gameConsoleId: item.gameConsoleId ? String(item.gameConsoleId) : '',
        accountId: item.accountId ? String(item.accountId) : '',
        memoryCardId: item.memoryCardId ? String(item.memoryCardId) : '',
        storyProgressDefinitionId: item.storyProgressDefinitionId ? String(item.storyProgressDefinitionId) : '',
        replacedBySaveDataId: item.replacedBySaveDataId ? String(item.replacedBySaveDataId) : '',
        deleteReason: item.deleteReason ?? '',
        dynamicFieldValues: createDynamicFieldValueMapFromSaveData(item),
      };
    }
  }
}

function validateForm(
  resourceKey: ResourceKey,
  formState: FormState,
  lookups: ManagementLookups,
  saveDataSchema: SaveDataSchemaDto | null,
  storyProgressSchema: StoryProgressSchemaDto | null,
): string[] {
  switch (resourceKey) {
    case 'game-console-categories':
      return [
        !formState.name.trim() ? '名称を入力してください。' : '',
        !formState.abbreviation.trim() ? '略称を入力してください。' : '',
      ].filter(Boolean);
    case 'game-console-masters':
      return [
        !formState.name.trim() ? '名称を入力してください。' : '',
        !formState.abbreviation.trim() ? '略称を入力してください。' : '',
        !formState.gameConsoleCategoryId ? 'ゲーム機カテゴリを選択してください。' : '',
      ].filter(Boolean);
    case 'game-console-edition-masters':
      return [
        !formState.name.trim() ? '名称を入力してください。' : '',
        !formState.abbreviation.trim() ? '略称を入力してください。' : '',
        !formState.gameConsoleMasterId ? 'ゲーム機マスタを選択してください。' : '',
      ].filter(Boolean);
    case 'game-consoles':
      return [
        !formState.gameConsoleMasterId ? 'ゲーム機マスタを選択してください。' : '',
      ].filter(Boolean);
    case 'game-software-content-groups':
      return [
        !formState.name.trim() ? '名称を入力してください。' : '',
      ].filter(Boolean);
    case 'game-software-masters':
      return [
        !formState.name.trim() ? '名称を入力してください。' : '',
        !formState.abbreviation.trim() ? '略称を入力してください。' : '',
        !formState.gameConsoleCategoryId ? 'ゲーム機カテゴリを選択してください。' : '',
      ].filter(Boolean);
    case 'game-softwares':
      return [
        !formState.gameSoftwareMasterId ? 'ゲームソフトマスタを選択してください。' : '',
      ].filter(Boolean);
    case 'save-datas': {
      const gameSoftwareMasterId = numberOrNull(formState.gameSoftwareMasterId);
      const gameSoftwareId = numberOrNull(formState.gameSoftwareId);
      const saveStorageType = getSaveStorageTypeForGameSoftwareMaster(gameSoftwareMasterId, lookups);
      const storyProgressDefinitionId = numberOrNull(formState.storyProgressDefinitionId);
      const errors = [
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

function optionize(items: SelectOption[], includeEmpty = true): SelectOption[] {
  if (!includeEmpty) {
    return items;
  }
  return [{ value: '', label: '未選択' }, ...items];
}

function actionLinkClasses(variant: 'default' | 'accent' = 'default'): string {
  if (variant === 'accent') {
    return 'inline-flex items-center justify-center rounded-lg border border-[var(--color-accent-25-strong)] bg-[var(--color-accent-25)] px-6 py-2.5 text-sm font-semibold text-[var(--color-text-inverse)] shadow-sm transition hover:opacity-90';
  }

  return 'text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300';
}

function selectOptionsFromLookups(lookups: ManagementLookups) {
  return {
    gameConsoleCategories: lookups.gameConsoleCategories.map((item) => ({ value: String(item.id), label: item.name })),
    gameConsoleMasters: lookups.gameConsoleMasters.map((item) => ({ value: String(item.id), label: item.name })),
    gameConsoleEditionMasters: lookups.gameConsoleEditionMasters.map((item) => ({ value: String(item.id), label: item.name })),
    gameSoftwareContentGroups: lookups.gameSoftwareContentGroups.map((item) => ({ value: String(item.id), label: item.name })),
    gameSoftwareMasters: lookups.gameSoftwareMasters.map((item) => ({ value: String(item.id), label: `${item.name} / ${getGameConsoleCategoryName(item.gameConsoleCategoryId, lookups)}` })),
    gameSoftwares: lookups.gameSoftwares.map((item) => ({ value: String(item.id), label: getGameSoftwareDisplay(item, lookups) })),
    gameConsoles: lookups.gameConsoles.map((item) => ({ value: String(item.id), label: getGameConsoleDisplay(item, lookups) })),
    accounts: lookups.accounts.map((item) => ({ value: String(item.id), label: getAccountDisplay(item, lookups) })),
    memoryCards: lookups.memoryCards.map((item) => ({ value: String(item.id), label: item.label || `MemoryCard #${item.id}` })),
    saveDatas: lookups.saveDatas.map((item) => ({ value: String(item.id), label: `SaveData #${item.id}` })),
  };
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <CustomLabel htmlFor={id}>{label}</CustomLabel>
      <CustomComboBox id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </CustomComboBox>
    </div>
  );
}

function TrialBanner() {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      <p className="font-semibold">トライアルモード</p>
      <p>データはこのブラウザの localStorage に保存されます。ログインするとサーバーに保存できます。</p>
    </div>
  );
}

function PageCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">{children}</div>;
}

function PageFrame({
  eyebrowLabel = 'Game Management',
  title,
  description,
  actions,
  children,
}: {
  eyebrowLabel?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(241,245,249,0.95))] p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.95),rgba(9,9,11,0.95))] dark:ring-zinc-800">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{eyebrowLabel}</p>
              <CustomHeader level={1}>{title}</CustomHeader>
              <p className="max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

export function GameManagementDashboard({
  basePath = '/game-management',
  resourceKeys,
  sectionLabel = 'Game Management',
  sectionTitle = 'ゲーム管理ダッシュボード',
  sectionDescription = '各マスタ、所有ゲーム機、ゲームソフト、アカウント、メモリーカード、セーブデータの一覧確認と編集画面への遷移をここから行えます。',
  extraCards = [],
}: {
  basePath?: string;
  resourceKeys?: ResourceKey[];
  sectionLabel?: string;
  sectionTitle?: string;
  sectionDescription?: string;
  extraCards?: DashboardExtraCard[];
}) {
  const { data: session } = useSession();
  const isTrial = !session?.user;
  const displayKeys = resourceKeys ?? ADMIN_RESOURCE_ORDER;
  return (
    <PageFrame
      eyebrowLabel={sectionLabel}
      title={sectionTitle}
      description={sectionDescription}
    >
      {isTrial && (
        <TrialBanner />
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {displayKeys.map((resourceKey) => {
          const definition = RESOURCE_DEFINITIONS[resourceKey];

          return (
            <Link
              key={resourceKey}
              href={`${basePath}/${resourceKey}`}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            >
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{definition.shortLabel}</p>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{definition.label}</h2>
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{definition.description}</p>
                <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">一覧を開く</p>
              </div>
            </Link>
          );
        })}
        {extraCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{card.shortLabel}</p>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{card.title}</h2>
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{card.description}</p>
              <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">{card.actionLabel ?? '画面を開く'}</p>
            </div>
          </Link>
        ))}
      </div>
    </PageFrame>
  );
}

export function GameManagementResourceListPage({
  resourceKey,
  basePath = '/game-management',
  scope = 'admin',
}: {
  resourceKey: ResourceKey;
  basePath?: string;
  scope?: 'admin' | 'user';
}) {
  const { data: session } = useSession();
  const isTrial = scope === 'user' && !session?.user;
  const definition = getResourceDefinition(resourceKey);
  const [lookups, setLookups] = useState<ManagementLookups | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [storyProgressLabels, setStoryProgressLabels] = useState<StoryProgressLabelMap>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let result: ManagementLookups;
      if (scope === 'admin') {
        const masters = await fetchMasterLookups();
        result = { ...masters, accounts: [], gameConsoles: [], gameSoftwares: [], memoryCards: [], saveDatas: [] };
      } else if (isTrial) {
        const masters = await fetchPublicMasterLookups();
        const userData = buildTrialUserData();
        result = { ...masters, ...userData };
      } else {
        result = await fetchAuthenticatedUserLookups();
      }
      setLookups(result);
    } catch (loadError) {
      const msg = loadError instanceof ApiError && loadError.statusCode === 403
        ? '管理者権限が必要です。このリソースへのアクセスにはバックエンドの Admin ロールが必要です。'
        : loadError instanceof Error ? loadError.message : '一覧の取得に失敗しました。';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [scope, isTrial]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (resourceKey !== 'save-datas' || !lookups) {
      setStoryProgressLabels({});
      return;
    }

    const masterIds = Array.from(new Set(
      lookups.saveDatas
        .map((saveData) => getSaveDataGameSoftwareMasterId(saveData, lookups))
        .filter((value): value is number => value != null),
    ));

    if (masterIds.length === 0) {
      setStoryProgressLabels({});
      return;
    }

    let cancelled = false;

    const loadStoryProgressLabels = async () => {
      const entries = await Promise.allSettled(masterIds.map(async (gameSoftwareMasterId) => {
        const schema = await fetchPublicStoryProgressSchema(gameSoftwareMasterId);
        return schema.choices.map((choice) => [`${gameSoftwareMasterId}:${choice.storyProgressDefinitionId}`, choice.label] as const);
      }));

      if (cancelled) {
        return;
      }

      const nextLabels: StoryProgressLabelMap = {};
      for (const entry of entries) {
        if (entry.status !== 'fulfilled') {
          continue;
        }
        for (const [key, label] of entry.value) {
          nextLabels[key] = label;
        }
      }
      setStoryProgressLabels(nextLabels);
    };

    void loadStoryProgressLabels();

    return () => {
      cancelled = true;
    };
  }, [lookups, resourceKey]);

  const rows = useMemo(() => (lookups ? buildTableRows(resourceKey, lookups, basePath, storyProgressLabels) : []), [lookups, resourceKey, basePath, storyProgressLabels]);

  return (
    <PageFrame
      title={definition.label}
      description={definition.description}
      actions={
        <>
          <Link href={basePath} className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300">
            ダッシュボードへ戻る
          </Link>
          {definition.canCreate ? (
            <Link href={`${basePath}/${resourceKey}/new`} className={actionLinkClasses('accent')}>
              新規作成
            </Link>
          ) : null}
          <CustomButton onClick={() => void load()}>再読み込み</CustomButton>
        </>
      }
    >
      {error ? <CustomMessageArea variant="error">{error}</CustomMessageArea> : null}
      {isTrial && <TrialBanner />}
      <PageCard>
        {loading ? (
          <p className="text-sm text-zinc-500">一覧を読み込んでいます...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span>表示件数: {rows.length} 件</span>
              <span>行の編集リンクから単票画面へ移動できます。</span>
            </div>
            <DataTable columns={TABLE_COLUMNS} data={rows} rowKey="id" emptyMessage="データがありません。" />
          </div>
        )}
      </PageCard>
    </PageFrame>
  );
}

function ResourceSummary({ resourceKey, record, lookups, storyProgressLabel }: { resourceKey: ResourceKey; record: unknown; lookups: ManagementLookups; storyProgressLabel?: string | null }) {
  switch (resourceKey) {
    case 'accounts': {
      const item = record as AccountDto;
      return <p className="text-sm text-zinc-600 dark:text-zinc-300">所属カテゴリ: {item.gameConsoleCategoryIds.map((id) => getGameConsoleCategoryName(id, lookups)).join(', ') || '未設定'}</p>;
    }
    case 'game-console-categories': {
      const item = record as GameConsoleCategoryDto;
      return <p className="text-sm text-zinc-600 dark:text-zinc-300">略称: {item.abbreviation} / 保存方式: {formatSaveStorageType(item.saveStorageType)}</p>;
    }
    case 'game-console-masters': {
      const item = record as GameConsoleMasterDto;
      return <p className="text-sm text-zinc-600 dark:text-zinc-300">略称: {item.abbreviation} / カテゴリ: {getGameConsoleCategoryName(item.gameConsoleCategoryId, lookups)}</p>;
    }
    case 'game-console-edition-masters': {
      const item = record as GameConsoleEditionMasterDto;
      return <p className="text-sm text-zinc-600 dark:text-zinc-300">略称: {item.abbreviation} / マスタ: {getGameConsoleMasterName(item.gameConsoleMasterId, lookups)}</p>;
    }
    case 'game-consoles': {
      const item = record as GameConsoleDto;
      return <p className="text-sm text-zinc-600 dark:text-zinc-300">対応マスタ: {getGameConsoleMasterName(item.gameConsoleMasterId, lookups)}</p>;
    }
    case 'game-software-masters': {
      const item = record as GameSoftwareMasterDto;
      return <p className="text-sm text-zinc-600 dark:text-zinc-300">略称: {item.abbreviation} / カテゴリ: {getGameConsoleCategoryName(item.gameConsoleCategoryId, lookups)}</p>;
    }
    case 'game-softwares': {
      const item = record as GameSoftwareDto;
      return <p className="text-sm text-zinc-600 dark:text-zinc-300">ソフトマスタ: {getGameSoftwareMasterName(item.gameSoftwareMasterId, lookups)}</p>;
    }
    case 'memory-cards': {
      const item = record as MemoryCardDto;
      return <p className="text-sm text-zinc-600 dark:text-zinc-300">所有者: {item.ownerGoogleUserId}</p>;
    }
    case 'save-datas': {
      const item = record as SaveDataDto;
      return <p className="text-sm text-zinc-600 dark:text-zinc-300">保存方式: {formatSaveStorageType(item.saveStorageType)}{storyProgressLabel ? ` / 進行度: ${storyProgressLabel}` : ''}</p>;
    }
    default:
      return null;
  }
}

function FormFields({
  resourceKey,
  formState,
  onChange,
  lookups,
  isNew,
  saveDataSchema,
  saveDataSchemaLoading,
  saveDataSchemaError,
  storyProgressSchema,
  storyProgressSchemaLoading,
  storyProgressSchemaError,
}: {
  resourceKey: ResourceKey;
  formState: FormState;
  onChange: (patch: Partial<FormState>) => void;
  lookups: ManagementLookups;
  isNew: boolean;
  saveDataSchema: SaveDataSchemaDto | null;
  saveDataSchemaLoading: boolean;
  saveDataSchemaError: string | null;
  storyProgressSchema: StoryProgressSchemaDto | null;
  storyProgressSchemaLoading: boolean;
  storyProgressSchemaError: string | null;
}) {
  const options = selectOptionsFromLookups(lookups);
  const selectedGameSoftwareMasterId = numberOrNull(formState.gameSoftwareMasterId);
  const derivedSaveStorageType = getSaveStorageTypeForGameSoftwareMaster(selectedGameSoftwareMasterId, lookups);
  const filteredGameSoftwareOptions = options.gameSoftwares.filter((option) => {
    const gameSoftware = lookups.gameSoftwares.find((item) => String(item.id) === option.value);
    return gameSoftware?.gameSoftwareMasterId === selectedGameSoftwareMasterId;
  });
  const consoleCandidates = getConsoleCandidates(selectedGameSoftwareMasterId, lookups).map((item) => ({ value: String(item.id), label: getGameConsoleDisplay(item, lookups) }));
  const accountCandidates = getAccountCandidates(selectedGameSoftwareMasterId, lookups).map((item) => ({ value: String(item.id), label: getAccountDisplay(item, lookups) }));
  const storyProgressOptions = optionize([
    ...((storyProgressSchema?.choices ?? []).map((choice) => ({
      value: String(choice.storyProgressDefinitionId),
      label: choice.isDisabled ? `${choice.label}（選択不可）` : choice.label,
      disabled: choice.isDisabled,
    }))),
    ...((formState.storyProgressDefinitionId && !(storyProgressSchema?.choices ?? []).some((choice) => String(choice.storyProgressDefinitionId) === formState.storyProgressDefinitionId))
      ? [{ value: formState.storyProgressDefinitionId, label: `現在の値 #${formState.storyProgressDefinitionId}（利用不可）`, disabled: true }]
      : []),
  ], true);

  switch (resourceKey) {
    case 'accounts':
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <CustomLabel htmlFor="label">表示名</CustomLabel>
            <CustomTextBox id="label" value={formState.label} onChange={(event) => onChange({ label: event.target.value })} placeholder="任意の表示名" />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="memo">メモ</CustomLabel>
            <CustomTextArea id="memo" value={formState.memo} onChange={(event) => onChange({ memo: event.target.value })} placeholder="補足メモ" />
          </div>
          <div className="space-y-3">
            <CustomLabel>対象ゲーム機カテゴリ</CustomLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              {lookups.gameConsoleCategories.map((item) => {
                const checked = formState.gameConsoleCategoryIds.includes(String(item.id));
                return (
                  <label key={item.id} className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <CustomCheckBox
                      checked={checked}
                      onChange={(event) => {
                        if (event.target.checked) {
                          onChange({ gameConsoleCategoryIds: [...formState.gameConsoleCategoryIds, String(item.id)] });
                          return;
                        }
                        onChange({ gameConsoleCategoryIds: formState.gameConsoleCategoryIds.filter((value) => value !== String(item.id)) });
                      }}
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-200">{item.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      );
    case 'game-console-categories':
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <CustomLabel htmlFor="name">名称</CustomLabel>
            <CustomTextBox id="name" value={formState.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Nintendo Switch" />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="abbreviation">略称</CustomLabel>
            <CustomTextBox id="abbreviation" value={formState.abbreviation} onChange={(event) => onChange({ abbreviation: event.target.value })} placeholder="Switch" />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="manufacturer">メーカー</CustomLabel>
            <CustomTextBox id="manufacturer" value={formState.manufacturer} onChange={(event) => onChange({ manufacturer: event.target.value })} placeholder="任天堂" />
          </div>
          <SelectField
            id="saveStorageType"
            label="保存方式"
            value={formState.saveStorageType}
            options={SAVE_STORAGE_TYPE_OPTIONS}
            onChange={(value) => onChange({ saveStorageType: value })}
          />
        </div>
      );
    case 'game-console-masters':
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <CustomLabel htmlFor="name">名称</CustomLabel>
            <CustomTextBox id="name" value={formState.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Nintendo Switch (有機ELモデル)" />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="abbreviation">略称</CustomLabel>
            <CustomTextBox id="abbreviation" value={formState.abbreviation} onChange={(event) => onChange({ abbreviation: event.target.value })} placeholder="Switch OLED" />
          </div>
          <SelectField
            id="gameConsoleCategoryId"
            label="ゲーム機カテゴリ"
            value={formState.gameConsoleCategoryId}
            options={options.gameConsoleCategories}
            onChange={(value) => onChange({ gameConsoleCategoryId: value })}
            placeholder="選択してください"
          />
        </div>
      );
    case 'game-console-edition-masters':
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <CustomLabel htmlFor="name">名称</CustomLabel>
            <CustomTextBox id="name" value={formState.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="スプラトゥーン3エディション" />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="abbreviation">略称</CustomLabel>
            <CustomTextBox id="abbreviation" value={formState.abbreviation} onChange={(event) => onChange({ abbreviation: event.target.value })} placeholder="S3 Edition" />
          </div>
          <SelectField
            id="gameConsoleMasterId"
            label="ゲーム機マスタ"
            value={formState.gameConsoleMasterId}
            options={options.gameConsoleMasters}
            onChange={(value) => onChange({ gameConsoleMasterId: value })}
            placeholder="選択してください"
          />
        </div>
      );
    case 'game-consoles':
      return (
        <div className="space-y-5">
          <SelectField
            id="gameConsoleMasterId"
            label="ゲーム機マスタ"
            value={formState.gameConsoleMasterId}
            options={options.gameConsoleMasters}
            onChange={(value) => onChange({ gameConsoleMasterId: value, gameConsoleEditionMasterId: '' })}
            placeholder="選択してください"
            disabled={!isNew}
          />
          <SelectField
            id="gameConsoleEditionMasterId"
            label="エディション（任意）"
            value={formState.gameConsoleEditionMasterId}
            options={optionize(options.gameConsoleEditionMasters.filter((opt) => {
              const edition = lookups.gameConsoleEditionMasters.find((e) => String(e.id) === opt.value);
              return edition && String(edition.gameConsoleMasterId) === formState.gameConsoleMasterId;
            }), true)}
            onChange={(value) => onChange({ gameConsoleEditionMasterId: value })}
            disabled={!isNew}
          />
          <div className="space-y-2">
            <CustomLabel htmlFor="label">表示ラベル</CustomLabel>
            <CustomTextBox id="label" value={formState.label} onChange={(event) => onChange({ label: event.target.value })} placeholder="自宅用 / 予備機 など" />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="memo">メモ</CustomLabel>
            <CustomTextArea id="memo" value={formState.memo} onChange={(event) => onChange({ memo: event.target.value })} placeholder="補足メモ" />
          </div>
        </div>
      );
    case 'game-software-content-groups':
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <CustomLabel htmlFor="name">名称</CustomLabel>
            <CustomTextBox id="name" value={formState.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="本編 / DLC / 拡張版 など" />
          </div>
        </div>
      );
    case 'game-software-masters':
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <CustomLabel htmlFor="name">名称</CustomLabel>
            <CustomTextBox id="name" value={formState.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="ゼルダの伝説 ブレス オブ ザ ワイルド" />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="abbreviation">略称</CustomLabel>
            <CustomTextBox id="abbreviation" value={formState.abbreviation} onChange={(event) => onChange({ abbreviation: event.target.value })} placeholder="BotW" />
          </div>
          <SelectField
            id="gameConsoleCategoryId"
            label="ゲーム機カテゴリ"
            value={formState.gameConsoleCategoryId}
            options={options.gameConsoleCategories}
            onChange={(value) => onChange({ gameConsoleCategoryId: value })}
            placeholder="選択してください"
          />
          <SelectField
            id="contentGroupId"
            label="分類"
            value={formState.contentGroupId}
            options={optionize(options.gameSoftwareContentGroups, true)}
            onChange={(value) => onChange({ contentGroupId: value })}
          />
        </div>
      );
    case 'game-softwares':
      return (
        <div className="space-y-5">
          <SelectField
            id="gameSoftwareMasterId"
            label="ゲームソフトマスタ"
            value={formState.gameSoftwareMasterId}
            options={options.gameSoftwareMasters}
            onChange={(value) => onChange({ gameSoftwareMasterId: value })}
            placeholder="選択してください"
            disabled={!isNew}
          />
          <div className="space-y-2">
            <CustomLabel htmlFor="label">表示ラベル</CustomLabel>
            <CustomTextBox id="label" value={formState.label} onChange={(event) => onChange({ label: event.target.value })} placeholder="パッケージ版 / DL版 など" />
          </div>
          <SelectField
            id="variant"
            label="種類"
            value={formState.variant}
            options={[{ value: '', label: '未設定' }, { value: '0', label: 'パッケージ版' }, { value: '1', label: 'ダウンロード版' }]}
            onChange={(value) => onChange({ variant: value })}
          />
          <div className="space-y-2">
            <CustomLabel htmlFor="memo">メモ</CustomLabel>
            <CustomTextArea id="memo" value={formState.memo} onChange={(event) => onChange({ memo: event.target.value })} placeholder="補足メモ" />
          </div>
        </div>
      );
    case 'memory-cards':
      return (
        <div className="space-y-5">
          <SelectField
            id="capacity"
            label="容量（ブロック数）"
            value={formState.capacity}
            options={[{ value: '59', label: '59 ブロック' }, { value: '251', label: '251 ブロック' }]}
            onChange={(value) => onChange({ capacity: value })}
            disabled={!isNew}
          />
          <div className="space-y-2">
            <CustomLabel htmlFor="label">表示ラベル</CustomLabel>
            <CustomTextBox id="label" value={formState.label} onChange={(event) => onChange({ label: event.target.value })} placeholder="メインカード / サブカード など" />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="memo">メモ</CustomLabel>
            <CustomTextArea id="memo" value={formState.memo} onChange={(event) => onChange({ memo: event.target.value })} placeholder="補足メモ" />
          </div>
        </div>
      );
    case 'save-datas':
      return (
        <div className="space-y-5">
          <SelectField
            id="gameSoftwareMasterId"
            label="ゲームソフトマスタ"
            value={formState.gameSoftwareMasterId}
            options={options.gameSoftwareMasters}
            onChange={(value) => onChange({
              gameSoftwareMasterId: value,
              gameSoftwareId: '',
              gameConsoleId: '',
              accountId: '',
              memoryCardId: '',
              storyProgressDefinitionId: '',
              dynamicFieldValues: {},
            })}
            placeholder="選択してください"
          />
          {derivedSaveStorageType === 0 ? (
            <SelectField
              id="gameSoftwareId"
              label="所持ゲームソフト"
              value={formState.gameSoftwareId}
              options={filteredGameSoftwareOptions}
              onChange={(value) => onChange({ gameSoftwareId: value })}
              placeholder="選択してください"
            />
          ) : null}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            保存方式: {formatSaveStorageType(derivedSaveStorageType)}
          </div>
          {derivedSaveStorageType === 1 || derivedSaveStorageType === 2 ? (
            <SelectField
              id="gameConsoleId"
              label="ゲーム機"
              value={formState.gameConsoleId}
              options={consoleCandidates}
              onChange={(value) => onChange({ gameConsoleId: value })}
              placeholder="選択してください"
            />
          ) : null}
          {derivedSaveStorageType === 2 ? (
            <SelectField
              id="accountId"
              label="アカウント"
              value={formState.accountId}
              options={accountCandidates}
              onChange={(value) => onChange({ accountId: value })}
              placeholder="選択してください"
            />
          ) : null}
          {derivedSaveStorageType === 3 ? (
            <SelectField
              id="memoryCardId"
              label="メモリーカード"
              value={formState.memoryCardId}
              options={optionize(options.memoryCards, true)}
              onChange={(value) => onChange({ memoryCardId: value })}
              placeholder="選択してください"
            />
          ) : null}
          <div className="space-y-3">
            <div className="space-y-1">
              <CustomHeader level={3}>ストーリー進行度</CustomHeader>
              <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                公開 story-progress-schema API をもとに、この作品で有効な進行度候補を表示します。未設定に戻すこともできます。
              </p>
            </div>
            {!formState.gameSoftwareMasterId ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">ゲームソフトマスタを選択すると候補が表示されます。</p>
            ) : storyProgressSchemaLoading ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">ストーリー進行度候補を読み込み中です...</p>
            ) : storyProgressSchemaError ? (
              <CustomMessageArea variant="error">{storyProgressSchemaError}</CustomMessageArea>
            ) : (
              <SelectField
                id="storyProgressDefinitionId"
                label="進行度"
                value={formState.storyProgressDefinitionId}
                options={storyProgressOptions}
                onChange={(value) => onChange({ storyProgressDefinitionId: value })}
              />
            )}
          </div>
          {!isNew ? (
            <SelectField
              id="replacedBySaveDataId"
              label="置換先 SaveData"
              value={formState.replacedBySaveDataId}
              options={optionize(options.saveDatas.filter((option) => option.value !== formState.replacedBySaveDataId), true)}
              onChange={(value) => onChange({ replacedBySaveDataId: value })}
            />
          ) : null}
          <div className="space-y-3">
            <div className="space-y-1">
              <CustomHeader level={3}>可変項目</CustomHeader>
              <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                公開 schema API をもとに、このゲームソフト固有の入力項目を表示します。
              </p>
            </div>
            <SaveDataDynamicFields
              schema={saveDataSchema}
              values={formState.dynamicFieldValues}
              onChange={(fieldKey, value) => onChange({
                dynamicFieldValues: {
                  ...formState.dynamicFieldValues,
                  [fieldKey]: value,
                },
              })}
              loading={saveDataSchemaLoading}
              error={saveDataSchemaError}
            />
          </div>
        </div>
      );
  }
}

export function GameManagementResourceEditorPage({
  resourceKey,
  recordId,
  basePath = '/game-management',
  scope = 'admin',
}: {
  resourceKey: ResourceKey;
  recordId?: string;
  basePath?: string;
  scope?: 'admin' | 'user';
}) {
  const router = useRouter();
  const { startLoading } = useLoadingOverlay();
  const { data: session } = useSession();
  const isTrial = scope === 'user' && !session?.user;
  const definition: ResourceDefinition = getResourceDefinition(resourceKey);
  const isNew = !recordId;
  const [lookups, setLookups] = useState<ManagementLookups | null>(null);
  const [formState, setFormState] = useState<FormState>(createEmptyFormState());
  const [record, setRecord] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saveDataSchema, setSaveDataSchema] = useState<SaveDataSchemaDto | null>(null);
  const [saveDataSchemaLoading, setSaveDataSchemaLoading] = useState(false);
  const [saveDataSchemaError, setSaveDataSchemaError] = useState<string | null>(null);
  const [storyProgressSchema, setStoryProgressSchema] = useState<StoryProgressSchemaDto | null>(null);
  const [storyProgressSchemaLoading, setStoryProgressSchemaLoading] = useState(false);
  const [storyProgressSchemaError, setStoryProgressSchemaError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let nextLookups: ManagementLookups;
      if (scope === 'admin') {
        const masters = await fetchMasterLookups();
        nextLookups = { ...masters, accounts: [], gameConsoles: [], gameSoftwares: [], memoryCards: [], saveDatas: [] };
      } else if (isTrial) {
        const masters = await fetchPublicMasterLookups();
        const userData = buildTrialUserData();
        nextLookups = { ...masters, ...userData };
      } else {
        nextLookups = await fetchAuthenticatedUserLookups();
      }
      setLookups(nextLookups);

      if (!isNew && recordId) {
        let nextRecord: unknown;
        if (isTrial) {
          nextRecord = trialGetResourceById(resourceKey, Number(recordId));
          if (!nextRecord) throw new Error(`レコード #${recordId} が見つかりません。`);
        } else {
          nextRecord = await fetchResourceById(resourceKey, recordId);
        }
        setRecord(nextRecord);
        setFormState(buildInitialFormState(resourceKey, nextRecord));
      } else {
        setRecord(null);
        setFormState(createEmptyFormState());
      }
    } catch (loadError) {
      const msg = loadError instanceof ApiError && loadError.statusCode === 403
        ? '管理者権限が必要です。この操作にはバックエンドの Admin ロールが必要です。'
        : loadError instanceof Error ? loadError.message : 'データの取得に失敗しました。';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isNew, recordId, resourceKey, scope, isTrial]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (resourceKey !== 'save-datas' || !lookups) {
      setSaveDataSchema(null);
      setSaveDataSchemaLoading(false);
      setSaveDataSchemaError(null);
      setStoryProgressSchema(null);
      setStoryProgressSchemaLoading(false);
      setStoryProgressSchemaError(null);
      return;
    }

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

      const [saveDataResult, storyProgressResult] = await Promise.allSettled([
        fetchPublicSaveDataSchema(gameSoftwareMasterId),
        fetchPublicStoryProgressSchema(gameSoftwareMasterId),
      ]);

      if (cancelled) {
        return;
      }

      if (saveDataResult.status === 'fulfilled') {
        setSaveDataSchema(saveDataResult.value);
      } else {
        setSaveDataSchema(null);
        setSaveDataSchemaError(saveDataResult.reason instanceof Error ? saveDataResult.reason.message : '可変項目 schema の取得に失敗しました。');
      }
      setSaveDataSchemaLoading(false);

      if (storyProgressResult.status === 'fulfilled') {
        setStoryProgressSchema(storyProgressResult.value);
      } else {
        setStoryProgressSchema(null);
        setStoryProgressSchemaError(storyProgressResult.reason instanceof Error ? storyProgressResult.reason.message : 'ストーリー進行度 schema の取得に失敗しました。');
      }
      setStoryProgressSchemaLoading(false);
    };

    void loadSchema();

    return () => {
      cancelled = true;
    };
  }, [formState.gameSoftwareMasterId, lookups, resourceKey]);

  const applyPatch = useCallback((patch: Partial<FormState>) => {
    setFormState((current) => ({ ...current, ...patch }));
  }, []);

  const selectedStoryProgressLabel = useMemo(() => {
    if (!lookups || resourceKey !== 'save-datas') {
      return null;
    }
    const gameSoftwareMasterId = numberOrNull(formState.gameSoftwareMasterId);
    const storyProgressDefinitionId = numberOrNull(formState.storyProgressDefinitionId);
    if (!gameSoftwareMasterId || !storyProgressDefinitionId) {
      return null;
    }
    const fallbackMap = storyProgressSchema
      ? Object.fromEntries(storyProgressSchema.choices.map((choice) => [`${storyProgressSchema.gameSoftwareMasterId}:${choice.storyProgressDefinitionId}`, choice.label]))
      : {};
    return getStoryProgressLabel(gameSoftwareMasterId, storyProgressDefinitionId, fallbackMap) ?? null;
  }, [formState.gameSoftwareMasterId, formState.storyProgressDefinitionId, lookups, resourceKey, storyProgressSchema]);

  const handleSave = useCallback(async () => {
    if (!lookups) {
      return;
    }

    if (resourceKey === 'save-datas' && formState.gameSoftwareMasterId && (saveDataSchemaLoading || storyProgressSchemaLoading)) {
      setError('SaveData 用 schema を読み込み中です。読み込み完了後に再度保存してください。');
      return;
    }

    if (resourceKey === 'save-datas' && formState.gameSoftwareMasterId && (saveDataSchemaError || storyProgressSchemaError)) {
      setError([saveDataSchemaError, storyProgressSchemaError].filter(Boolean).join('\n'));
      return;
    }

    const validationErrors = validateForm(resourceKey, formState, lookups, saveDataSchema, storyProgressSchema);
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await startLoading(async () => {
        if (isTrial) {
          // --- トライアルモード: localStorage ---
          switch (resourceKey) {
            case 'accounts': {
              const payload = {
                label: nullIfBlank(formState.label),
                memo: nullIfBlank(formState.memo),
                gameConsoleCategoryIds: formState.gameConsoleCategoryIds.length > 0 ? formState.gameConsoleCategoryIds.map(Number) : null,
              };
              if (isNew) {
                const id = trialCreateAccount(payload);
                router.push(`${basePath}/accounts/${id}`);
                return;
              }
              trialUpdateAccount(Number(recordId), payload);
              break;
            }
            case 'game-consoles': {
              if (isNew) {
                const id = trialCreateGameConsole({
                  gameConsoleMasterId: numberOrZero(formState.gameConsoleMasterId),
                  gameConsoleEditionMasterId: numberOrNull(formState.gameConsoleEditionMasterId),
                  label: nullIfBlank(formState.label),
                  memo: nullIfBlank(formState.memo),
                });
                router.push(`${basePath}/game-consoles/${id}`);
                return;
              }
              trialUpdateGameConsole(Number(recordId), {
                label: nullIfBlank(formState.label),
                memo: nullIfBlank(formState.memo),
              });
              break;
            }
            case 'game-softwares': {
              const variantValue: GameSoftwareVariant | null = formState.variant ? (Number(formState.variant) as GameSoftwareVariant) : null;
              if (isNew) {
                const id = trialCreateGameSoftware({
                  gameSoftwareMasterId: numberOrZero(formState.gameSoftwareMasterId),
                  variant: variantValue,
                  label: nullIfBlank(formState.label),
                  memo: nullIfBlank(formState.memo),
                });
                router.push(`${basePath}/game-softwares/${id}`);
                return;
              }
              trialUpdateGameSoftware(Number(recordId), {
                variant: variantValue,
                label: nullIfBlank(formState.label),
                memo: nullIfBlank(formState.memo),
              });
              break;
            }
            case 'memory-cards': {
              const capacityValue = Number(formState.capacity) as MemoryCardCapacity;
              if (isNew) {
                const id = trialCreateMemoryCard({
                  capacity: capacityValue,
                  label: nullIfBlank(formState.label),
                  memo: nullIfBlank(formState.memo),
                });
                router.push(`${basePath}/memory-cards/${id}`);
                return;
              }
              trialUpdateMemoryCard(Number(recordId), {
                capacity: capacityValue,
                label: nullIfBlank(formState.label),
                memo: nullIfBlank(formState.memo),
              });
              break;
            }
            case 'save-datas': {
              const savePayloadBase = buildSaveDataPayload(formState, lookups, saveDataSchema);
              const derivedType = getSaveStorageTypeForGameSoftwareMaster(savePayloadBase.gameSoftwareMasterId, lookups);
              if (isNew) {
                const id = trialCreateSaveData(savePayloadBase, derivedType ?? 0, saveDataSchema);
                router.push(`${basePath}/save-datas/${id}`);
                return;
              }
              trialUpdateSaveData(Number(recordId), {
                ...savePayloadBase,
                replacedBySaveDataId: numberOrNull(formState.replacedBySaveDataId),
              }, derivedType ?? 0, saveDataSchema);
              break;
            }
          }
        } else {
          // --- 認証モード: API ---
          switch (resourceKey) {
            case 'accounts': {
              const payload = {
                label: nullIfBlank(formState.label),
                memo: nullIfBlank(formState.memo),
                gameConsoleCategoryIds: formState.gameConsoleCategoryIds.length > 0 ? formState.gameConsoleCategoryIds.map(Number) : null,
              };
              if (isNew) {
                const id = await createAccount(payload);
                router.push(`${basePath}/accounts/${id}`);
                return;
              }
              await updateAccount(Number(recordId), payload);
              break;
            }
            case 'game-console-categories': {
              const payload = {
                name: formState.name.trim(),
                abbreviation: formState.abbreviation.trim(),
                manufacturer: nullIfBlank(formState.manufacturer),
                saveStorageType: numberOrZero(formState.saveStorageType) as SaveStorageType,
              };
              if (isNew) {
                const id = await createGameConsoleCategory(payload);
                router.push(`${basePath}/game-console-categories/${id}`);
                return;
              }
              await updateGameConsoleCategory(Number(recordId), payload);
              break;
            }
            case 'game-console-masters': {
              const payload = {
                gameConsoleCategoryId: numberOrZero(formState.gameConsoleCategoryId),
                name: formState.name.trim(),
                abbreviation: formState.abbreviation.trim(),
              };
              if (isNew) {
                const id = await createGameConsoleMaster(payload);
                router.push(`${basePath}/game-console-masters/${id}`);
                return;
              }
              await updateGameConsoleMaster(Number(recordId), payload);
              break;
            }
            case 'game-console-edition-masters': {
              const payload = {
                gameConsoleMasterId: numberOrZero(formState.gameConsoleMasterId),
                name: formState.name.trim(),
                abbreviation: formState.abbreviation.trim(),
              };
              if (isNew) {
                const id = await createGameConsoleEditionMaster(payload);
                router.push(`${basePath}/game-console-edition-masters/${id}`);
                return;
              }
              await updateGameConsoleEditionMaster(Number(recordId), payload);
              break;
            }
            case 'game-consoles': {
              if (isNew) {
                const id = await createGameConsole({
                  gameConsoleMasterId: numberOrZero(formState.gameConsoleMasterId),
                  gameConsoleEditionMasterId: numberOrNull(formState.gameConsoleEditionMasterId),
                  label: nullIfBlank(formState.label),
                  memo: nullIfBlank(formState.memo),
                });
                router.push(`${basePath}/game-consoles/${id}`);
                return;
              }
              await updateGameConsole(Number(recordId), {
                label: nullIfBlank(formState.label),
                memo: nullIfBlank(formState.memo),
              });
              break;
            }
            case 'game-software-content-groups': {
              const payload = { name: formState.name.trim() };
              if (isNew) {
                const id = await createGameSoftwareContentGroup(payload);
                router.push(`${basePath}/game-software-content-groups/${id}`);
                return;
              }
              await updateGameSoftwareContentGroup(Number(recordId), payload);
              break;
            }
            case 'game-software-masters': {
              const payload = {
                name: formState.name.trim(),
                abbreviation: formState.abbreviation.trim(),
                gameConsoleCategoryId: numberOrZero(formState.gameConsoleCategoryId),
                contentGroupId: numberOrNull(formState.contentGroupId),
              };
              if (isNew) {
                const id = await createGameSoftwareMaster(payload);
                router.push(`${basePath}/game-software-masters/${id}`);
                return;
              }
              await updateGameSoftwareMaster(Number(recordId), payload);
              break;
            }
            case 'game-softwares': {
              const variantValue: GameSoftwareVariant | null = formState.variant ? (Number(formState.variant) as GameSoftwareVariant) : null;
              if (isNew) {
                const id = await createGameSoftware({
                  gameSoftwareMasterId: numberOrZero(formState.gameSoftwareMasterId),
                  variant: variantValue,
                  label: nullIfBlank(formState.label),
                  memo: nullIfBlank(formState.memo),
                });
                router.push(`${basePath}/game-softwares/${id}`);
                return;
              }
              await updateGameSoftware(Number(recordId), {
                variant: variantValue,
                label: nullIfBlank(formState.label),
                memo: nullIfBlank(formState.memo),
              });
              break;
            }
            case 'memory-cards': {
              const capacityValue = Number(formState.capacity) as MemoryCardCapacity;
              if (isNew) {
                const id = await createMemoryCard({
                  capacity: capacityValue,
                  label: nullIfBlank(formState.label),
                  memo: nullIfBlank(formState.memo),
                });
                router.push(`${basePath}/memory-cards/${id}`);
                return;
              }
              await updateMemoryCard(Number(recordId), {
                capacity: capacityValue,
                label: nullIfBlank(formState.label),
                memo: nullIfBlank(formState.memo),
              });
              break;
            }
            case 'save-datas': {
              const savePayloadBase = buildSaveDataPayload(formState, lookups, saveDataSchema);
              if (isNew) {
                const id = await createSaveData(savePayloadBase);
                router.push(`${basePath}/save-datas/${id}`);
                return;
              }
              await updateSaveData(Number(recordId), {
                ...savePayloadBase,
                replacedBySaveDataId: numberOrNull(formState.replacedBySaveDataId),
              });
              break;
            }
          }
        }
      }, '保存中...');

      setSuccess(isNew ? '作成しました。' : '更新しました。');
      await load();
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存に失敗しました。');
    }
  }, [
    basePath,
    formState,
    isNew,
    isTrial,
    load,
    lookups,
    recordId,
    resourceKey,
    router,
    saveDataSchema,
    saveDataSchemaError,
    saveDataSchemaLoading,
    storyProgressSchema,
    storyProgressSchemaError,
    storyProgressSchemaLoading,
    startLoading,
  ]);

  const handleDelete = useCallback(async () => {
    try {
      await startLoading(async () => {
        if (isTrial) {
          switch (resourceKey) {
            case 'accounts':
              trialDeleteAccount(Number(recordId));
              break;
            case 'game-consoles':
              trialDeleteGameConsole(Number(recordId));
              break;
            case 'game-softwares':
              trialDeleteGameSoftware(Number(recordId));
              break;
            case 'memory-cards':
              trialDeleteMemoryCard(Number(recordId));
              break;
            case 'save-datas':
              trialDeleteSaveData(Number(recordId), {
                deleteReason: nullIfBlank(formState.deleteReason),
                replacedBySaveDataId: numberOrNull(formState.replacedBySaveDataId),
              });
              break;
          }
        } else {
          switch (resourceKey) {
            case 'accounts':
              await deleteAccount(Number(recordId));
              break;
            case 'game-console-categories':
              await deleteGameConsoleCategory(Number(recordId));
              break;
            case 'game-console-masters':
              await deleteGameConsoleMaster(Number(recordId));
              break;
            case 'game-console-edition-masters':
              await deleteGameConsoleEditionMaster(Number(recordId));
              break;
            case 'game-consoles':
              await deleteGameConsole(Number(recordId));
              break;
            case 'game-software-content-groups':
              await deleteGameSoftwareContentGroup(Number(recordId));
              break;
            case 'game-software-masters':
              await deleteGameSoftwareMaster(Number(recordId));
              break;
            case 'game-softwares':
              await deleteGameSoftware(Number(recordId));
              break;
            case 'memory-cards':
              await deleteMemoryCard(Number(recordId));
              break;
            case 'save-datas':
              await deleteSaveData(Number(recordId), {
                deleteReason: nullIfBlank(formState.deleteReason),
                replacedBySaveDataId: numberOrNull(formState.replacedBySaveDataId),
              });
              break;
          }
        }
      }, '削除中...');

      router.push(`${basePath}/${resourceKey}`);
      router.refresh();
    } catch (deleteError) {
      setDeleteDialogOpen(false);
      setError(deleteError instanceof Error ? deleteError.message : '削除に失敗しました。');
    }
  }, [basePath, formState.deleteReason, formState.replacedBySaveDataId, isTrial, recordId, resourceKey, router, startLoading]);

  const options = useMemo(() => (lookups ? selectOptionsFromLookups(lookups) : null), [lookups]);

  return (
    <PageFrame
      title={`${definition.shortLabel}${isNew ? '作成' : '編集'}`}
      description={definition.description}
      actions={
        <>
          <Link href={`${basePath}/${resourceKey}`} className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300">
            一覧へ戻る
          </Link>
          {!isNew && definition.canDelete ? (
            <CustomButton variant="ghost" onClick={() => setDeleteDialogOpen(true)}>
              削除
            </CustomButton>
          ) : null}
          {(definition.canEdit || isNew) ? (
            <CustomButton variant="accent" onClick={() => void handleSave()}>
              {isNew ? '作成する' : '保存する'}
            </CustomButton>
          ) : null}
        </>
      }
    >
      {error ? <CustomMessageArea variant="error" className="whitespace-pre-line">{error}</CustomMessageArea> : null}
      {success ? <CustomMessageArea variant="success">{success}</CustomMessageArea> : null}
      {isTrial && <TrialBanner />}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <PageCard>
          {loading || !lookups ? (
            <p className="text-sm text-zinc-500">画面を読み込んでいます...</p>
          ) : (
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
            />
          )}
        </PageCard>
        <PageCard>
          <div className="space-y-4">
            <CustomHeader level={3}>レコード情報</CustomHeader>
            <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              <p>ID: {recordId ?? '新規作成'}</p>
              {!isNew && record && lookups ? <ResourceSummary resourceKey={resourceKey} record={record} lookups={lookups} storyProgressLabel={selectedStoryProgressLabel} /> : <p>新規作成では保存後に ID が採番されます。</p>}
              {resourceKey === 'memory-cards' ? <p>メモリーカードはラベル・メモの編集が可能です。容量は作成時のみ指定できます。</p> : null}
              {resourceKey === 'save-datas' ? <p>保存方式は選択したゲームソフトマスタから自動判定され、ストーリー進行度は公開 story-progress-schema の候補から選択します。</p> : null}
            </div>
            {resourceKey === 'save-datas' && record && !isNew ? (() => {
              const saveData = record as SaveDataDto;
              const mergedFields = mergeSchemaWithSaveData(saveDataSchema, saveData);
              if (mergedFields.length > 0) {
                return (
                  <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
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
                  <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
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
            {options && resourceKey === 'save-datas' ? (
              <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                <p className="font-semibold text-zinc-800 dark:text-zinc-100">削除時入力</p>
                <p>削除確認ダイアログでも同じ内容を送信します。</p>
                <SelectField
                  id="replacedBySaveDataId-panel"
                  label="置換先 SaveData"
                  value={formState.replacedBySaveDataId}
                  options={optionize(options.saveDatas.filter((option) => option.value !== recordId), true)}
                  onChange={(value) => applyPatch({ replacedBySaveDataId: value })}
                />
                <div className="space-y-2">
                  <CustomLabel htmlFor="deleteReason-panel">削除理由</CustomLabel>
                  <CustomTextArea id="deleteReason-panel" value={formState.deleteReason} onChange={(event) => applyPatch({ deleteReason: event.target.value })} placeholder="任意の削除理由" />
                </div>
              </div>
            ) : null}
          </div>
        </PageCard>
      </div>
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title={`${definition.shortLabel}を削除`}
        footer={
          <>
            <CustomButton onClick={() => setDeleteDialogOpen(false)}>キャンセル</CustomButton>
            <CustomButton variant="accent" onClick={() => void handleDelete()}>
              削除する
            </CustomButton>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">このレコードを削除します。操作は元に戻せない場合があります。</p>
          {resourceKey === 'save-datas' && options ? (
            <div className="space-y-4">
              <SelectField
                id="replacedBySaveDataId-dialog"
                label="置換先 SaveData"
                value={formState.replacedBySaveDataId}
                options={optionize(options.saveDatas.filter((option) => option.value !== recordId), true)}
                onChange={(value) => applyPatch({ replacedBySaveDataId: value })}
              />
              <div className="space-y-2">
                <CustomLabel htmlFor="deleteReason-dialog">削除理由</CustomLabel>
                <CustomTextArea id="deleteReason-dialog" value={formState.deleteReason} onChange={(event) => applyPatch({ deleteReason: event.target.value })} placeholder="任意の削除理由" />
              </div>
            </div>
          ) : null}
        </div>
      </Dialog>
    </PageFrame>
  );
}