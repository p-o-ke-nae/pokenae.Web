import { formatSaveStorageType } from '@/lib/game-management/save-storage-type';
import { formatMergedFieldValue, formatSaveDataFieldValueForList, mergeSchemaWithSaveData } from '@/lib/game-management/save-data-fields';
import { getMaintenanceHealthStatusLabel } from '@/lib/game-management/maintenance';
import {
  formatDeletedState,
  getAccountDisplay,
  getAccountTypeMasterName,
  getGameConsoleCategoryName,
  getGameConsoleDisplay,
  getGameConsoleMasterName,
  getGameSoftwareContentGroupName,
  getGameSoftwareDisplay,
  getMemoryCardDisplay,
  getMemoryCardEditionMasterName,
  getSaveDataGameSoftwareMasterId,
  getStoryProgressLabel,
} from './helpers';
import type { DataTableColumn } from '@/components/molecules/DataTable';
import type {
  GameSoftwareMasterDto,
  ManagementLookups,
  ResourceKey,
  SaveDataFieldValueDto,
  SaveDataSchemaDto,
} from '@/lib/game-management/types';
import type { ManagementTableRow, StoryProgressLabelMap } from './view-types';

function createTableRowKey(resourceKey: ResourceKey, id: number): string {
  return `${resourceKey}:${id}`;
}

function buildGameSoftwareMasterChildRows(
  contentGroupId: number,
  lookups: ManagementLookups,
): ManagementTableRow[] {
  return lookups.gameSoftwareMasters
    .filter((item) => item.contentGroupId === contentGroupId)
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id)
    .map((item: GameSoftwareMasterDto) => ({
      tableRowKey: createTableRowKey('game-software-masters', item.id),
      id: item.id,
      displayOrder: item.displayOrder,
      primary: item.name,
      abbreviation: item.abbreviation,
      relation: getGameConsoleCategoryName(item.gameConsoleCategoryId, lookups),
      note: 'ゲームソフトマスタ',
      status: formatDeletedState(item.isDeleted),
      edit: '編集',
      rowResourceKey: 'game-software-masters',
      parentContentGroupId: contentGroupId,
    }));
}

const DEFAULT_TABLE_COLUMNS: DataTableColumn<ManagementTableRow>[] = [
  { key: 'primary', header: '名称', sortable: true, filterable: true, width: '14rem' },
  { key: 'relation', header: '関連', filterable: true, filterMode: 'select', width: '10rem' },
  { key: 'note', header: '詳細', filterable: true },
  { key: 'status', header: '状態', width: '9rem', sortable: true, filterable: true, filterMode: 'select' },
  {
    key: 'edit',
    header: '操作',
    width: '7rem',
  },
];

const GAME_SOFTWARE_CONTENT_GROUP_TABLE_COLUMNS: DataTableColumn<ManagementTableRow>[] = [
  { key: 'primary', header: '名称', sortable: true, filterable: true, filterMode: 'select', width: '18rem' },
  {
    key: 'gameSoftwareCount',
    header: 'ゲームソフト数',
    sortable: true,
    width: '10rem',
    sortValue: (value) => Number(value ?? 0),
    render: (value: unknown) => `${Number(value ?? 0)}件`,
  },
  { key: 'status', header: '状態', width: '9rem', sortable: true, filterable: true, filterMode: 'select' },
  {
    key: 'edit',
    header: '操作',
    width: '7rem',
  },
];

const GAME_CONSOLE_TABLE_COLUMNS: DataTableColumn<ManagementTableRow>[] = [
  { key: 'primary', header: '名称', sortable: true, filterable: true, width: '14rem' },
  { key: 'maintenance', header: 'メンテナンス', sortable: true, filterable: true, filterMode: 'select', width: '9rem' },
  { key: 'memo', header: 'メモ', filterable: true, width: '32rem' },
  { key: 'edit', header: '操作', width: '7rem' },
];

const GAME_SOFTWARE_TABLE_COLUMNS: DataTableColumn<ManagementTableRow>[] = [
  { key: 'primary', header: '名称', sortable: true, filterable: true, width: '14rem' },
  { key: 'maintenance', header: 'メンテナンス', sortable: true, filterable: true, filterMode: 'select', width: '9rem' },
  { key: 'variant', header: '種類', sortable: true, filterable: true, filterMode: 'select', width: '9rem' },
  { key: 'memo', header: 'メモ', filterable: true, width: '32rem' },
  { key: 'edit', header: '操作', width: '7rem' },
];

const ACCOUNT_TABLE_COLUMNS: DataTableColumn<ManagementTableRow>[] = [
  { key: 'primary', header: '名称', sortable: true, filterable: true, width: '14rem' },
  { key: 'relation', header: 'アカウント種類', filterable: true, filterMode: 'select', width: '15rem' },
  { key: 'note', header: 'メモ', filterable: true, width: '32rem' },
  { key: 'edit', header: '操作', width: '7rem' },
];

const MEMORY_CARD_TABLE_COLUMNS: DataTableColumn<ManagementTableRow>[] = [
  { key: 'primary', header: '名称', sortable: true, filterable: true, width: '14rem' },
  { key: 'relation', header: '種類', filterable: true, filterMode: 'select', width: '10rem' },
  { key: 'maintenance', header: 'メンテナンス', sortable: true, filterable: true, filterMode: 'select', width: '9rem' },
  { key: 'memo', header: 'メモ', filterable: true, width: '32rem' },
  { key: 'edit', header: '操作', width: '7rem' },
];

const SAVE_DATA_TABLE_COLUMNS: DataTableColumn<ManagementTableRow>[] = [
  { key: 'title', header: 'タイトル', sortable: true, filterable: true, width: '12rem' },
  { key: 'save', header: '保存先', sortable: true, filterable: true, width: '24rem' },
  { key: 'storyProgress', header: 'ストーリー進行度', sortable: true, filterable: true, filterMode: 'select', width: '12rem' },
  { key: 'memo', header: 'メモ', filterable: true, width: '32rem' },
  { key: 'operation', header: '操作', width: '4.5rem' },
  { key: 'edit', header: '編集', width: '6rem' },
];

const GAME_SOFTWARE_MASTER_CHILD_TABLE_COLUMNS: DataTableColumn<ManagementTableRow>[] = [
  { key: 'primary', header: '名称', sortable: true, filterable: true, width: '16rem' },
  { key: 'abbreviation', header: '略称', sortable: true, filterable: true, filterMode: 'select', width: '10rem' },
  { key: 'relation', header: 'ゲーム機カテゴリ', filterable: true, filterMode: 'select', width: '12rem' },
  { key: 'status', header: '状態', sortable: true, filterable: true, filterMode: 'select', width: '8rem' },
  { key: 'edit', header: '操作', width: '9rem' },
];

function getSaveDataStorageParts(item: ManagementLookups['saveDatas'][number], lookups: ManagementLookups): string[] {
  switch (item.saveStorageType) {
    case 0: {
      const software = item.gameSoftwareId ? lookups.gameSoftwares.find((candidate) => candidate.id === item.gameSoftwareId) : null;
      return [software ? getGameSoftwareDisplay(software, lookups) : item.gameSoftwareId ? `#${item.gameSoftwareId}` : ''].filter(Boolean);
    }
    case 1: {
      const console_ = item.gameConsoleId ? lookups.gameConsoles.find((candidate) => candidate.id === item.gameConsoleId) : null;
      return [console_ ? getGameConsoleDisplay(console_, lookups) : item.gameConsoleId ? `#${item.gameConsoleId}` : ''].filter(Boolean);
    }
    case 2: {
      const console_ = item.gameConsoleId ? lookups.gameConsoles.find((candidate) => candidate.id === item.gameConsoleId) : null;
      const account = item.accountId ? lookups.accounts.find((candidate) => candidate.id === item.accountId) : null;
      return [
        console_ ? getGameConsoleDisplay(console_, lookups) : item.gameConsoleId ? `#${item.gameConsoleId}` : '',
        account ? getAccountDisplay(account, lookups) : item.accountId ? `#${item.accountId}` : '',
      ].filter(Boolean);
    }
    case 3: {
      const memoryCard = item.memoryCardId ? lookups.memoryCards.find((candidate) => candidate.id === item.memoryCardId) : null;
      return [memoryCard ? getMemoryCardDisplay(memoryCard, lookups) : item.memoryCardId ? `MemoryCard #${item.memoryCardId}` : ''].filter(Boolean);
    }
    default:
      return [];
  }
}

function getSaveDataContentGroupId(item: ManagementLookups['saveDatas'][number], lookups: ManagementLookups): number | null {
  const gameSoftwareMasterId = getSaveDataGameSoftwareMasterId(item, lookups);
  if (!gameSoftwareMasterId) {
    return null;
  }

  return lookups.gameSoftwareMasters.find((candidate) => candidate.id === gameSoftwareMasterId)?.contentGroupId ?? null;
}

function formatSaveDataDynamicFieldValue(
  field: SaveDataFieldValueDto,
  schema: SaveDataSchemaDto | null | undefined,
): string {
  if (schema == null) {
    return '';
  }

  const schemaField = schema?.fields.find((candidate) => candidate.fieldKey === field.fieldKey);

  if (!schemaField || schemaField.isDisabled) {
    return '';
  }

  if (field.fieldType === 6 && schemaField && field.selectedOptionKey) {
    return schemaField.options.find((option) => option.optionKey === field.selectedOptionKey)?.label ?? field.selectedOptionKey;
  }

  return formatSaveDataFieldValueForList(field);
}

export function getTableColumns(resourceKey: ResourceKey): DataTableColumn<ManagementTableRow>[] {
  if (resourceKey === 'save-datas') {
    return SAVE_DATA_TABLE_COLUMNS;
  }

  if (resourceKey === 'game-consoles') {
    return GAME_CONSOLE_TABLE_COLUMNS;
  }
  if (resourceKey === 'game-softwares') {
    return GAME_SOFTWARE_TABLE_COLUMNS;
  }
  if (resourceKey === 'accounts') {
    return ACCOUNT_TABLE_COLUMNS;
  }
  if (resourceKey === 'memory-cards') {
    return MEMORY_CARD_TABLE_COLUMNS;
  }

  if (resourceKey === 'game-software-content-groups') {
    return GAME_SOFTWARE_CONTENT_GROUP_TABLE_COLUMNS;
  }

  return DEFAULT_TABLE_COLUMNS;
}

export function getGameSoftwareMasterChildTableColumns(): DataTableColumn<ManagementTableRow>[] {
  return GAME_SOFTWARE_MASTER_CHILD_TABLE_COLUMNS;
}

export function buildTableRows(
  resourceKey: ResourceKey,
  lookups: ManagementLookups,
  _basePath: string,
  storyProgressLabels: StoryProgressLabelMap = {},
  saveDataSchemas: Record<number, SaveDataSchemaDto> = {},
): ManagementTableRow[] {
  switch (resourceKey) {
    case 'account-type-masters':
      return lookups.accountTypeMasters.map((item) => ({
        tableRowKey: createTableRowKey(resourceKey, item.id),
        id: item.id,
        displayOrder: item.displayOrder,
        primary: item.abbreviation ? `${item.abbreviation} / ${item.name}` : item.name,
        relation: item.gameConsoleCategoryIds.map((id) => getGameConsoleCategoryName(id, lookups)).join(', ') || '未設定',
        note: '',
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
      }));
    case 'accounts':
      return lookups.accounts.map((item) => ({
        tableRowKey: createTableRowKey(resourceKey, item.id),
        id: item.id,
        displayOrder: item.displayOrder,
        primary: getAccountDisplay(item, lookups),
        relation: getAccountTypeMasterName(item.accountTypeMasterId, lookups),
        note: item.memo ?? '',
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
      }));
    case 'game-console-categories':
      return lookups.gameConsoleCategories.map((item) => ({
        tableRowKey: createTableRowKey(resourceKey, item.id),
        id: item.id,
        displayOrder: item.displayOrder,
        primary: item.abbreviation ? `${item.abbreviation} / ${item.name}` : item.name,
        relation: `${item.manufacturer || 'メーカー未設定'}`,
        note: `保存方式: ${formatSaveStorageType(item.saveStorageType)}`,
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
      }));
    case 'game-console-masters':
      return lookups.gameConsoleMasters.map((item) => ({
        tableRowKey: createTableRowKey(resourceKey, item.id),
        id: item.id,
        displayOrder: item.displayOrder,
        primary: item.abbreviation ? `${item.abbreviation} / ${item.name}` : item.name,
        relation: `カテゴリ: ${getGameConsoleCategoryName(item.gameConsoleCategoryId, lookups)}`,
        note: '',
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
      }));
    case 'game-consoles':
      return lookups.gameConsoles.map((item) => {
        const master = lookups.gameConsoleMasters.find((candidate) => candidate.id === item.gameConsoleMasterId);
        const edition = item.gameConsoleEditionMasterId
          ? lookups.gameConsoleEditionMasters.find((candidate) => candidate.id === item.gameConsoleEditionMasterId)
          : null;
        return {
          tableRowKey: createTableRowKey(resourceKey, item.id),
          id: item.id,
          displayOrder: item.displayOrder,
          primary: [master?.abbreviation || master?.name, edition?.abbreviation || edition?.name, item.label].filter(Boolean).join(' '),
          maintenance: item.maintenance.hasRecord ? getMaintenanceHealthStatusLabel(item.maintenance.latestHealthStatus) : '記録なし',
          memo: item.memo ?? '',
          edit: '編集',
        };
      });
    case 'game-console-edition-masters':
      return lookups.gameConsoleEditionMasters.map((item) => ({
        tableRowKey: createTableRowKey(resourceKey, item.id),
        id: item.id,
        displayOrder: item.displayOrder,
        primary: item.abbreviation ? `${item.abbreviation} / ${item.name}` : item.name,
        relation: `マスタ: ${getGameConsoleMasterName(item.gameConsoleMasterId, lookups)}`,
        note: '',
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
      }));
    case 'game-software-content-groups':
      return lookups.gameSoftwareContentGroups.map((item) => {
        const children = buildGameSoftwareMasterChildRows(item.id, lookups);
        return {
          tableRowKey: createTableRowKey(resourceKey, item.id),
          id: item.id,
          displayOrder: item.displayOrder,
          primary: item.name,
          gameSoftwareCount: children.length,
          status: formatDeletedState(item.isDeleted),
          edit: '編集',
          rowResourceKey: resourceKey,
          parentContentGroupId: item.id,
          children,
        };
      });
    case 'game-software-masters':
      return lookups.gameSoftwareMasters.map((item) => ({
        tableRowKey: createTableRowKey(resourceKey, item.id),
        id: item.id,
        displayOrder: item.displayOrder,
        primary: item.abbreviation ? `${item.abbreviation} / ${item.name}` : item.name,
        relation: getGameConsoleCategoryName(item.gameConsoleCategoryId, lookups),
        note: `分類: ${getGameSoftwareContentGroupName(item.contentGroupId, lookups)}`,
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
      }));
    case 'game-softwares':
      return lookups.gameSoftwares.map((item) => {
        const master = lookups.gameSoftwareMasters.find((candidate) => candidate.id === item.gameSoftwareMasterId);
        return {
          tableRowKey: createTableRowKey(resourceKey, item.id),
          id: item.id,
          displayOrder: item.displayOrder,
          primary: [master?.abbreviation || master?.name, item.label].filter(Boolean).join(' '),
          maintenance: item.maintenance.hasRecord ? getMaintenanceHealthStatusLabel(item.maintenance.latestHealthStatus) : '記録なし',
          variant: item.variant === 0 ? 'パッケージ' : item.variant === 1 ? 'ダウンロード' : '未設定',
          memo: item.memo ?? '',
          edit: '編集',
        };
      });
    case 'memory-cards':
      return lookups.memoryCards.map((item) => ({
        tableRowKey: createTableRowKey(resourceKey, item.id),
        id: item.id,
        displayOrder: item.displayOrder,
        primary: item.label || `MemoryCard #${item.id}`,
        relation: getMemoryCardEditionMasterName(item.memoryCardEditionMasterId, lookups),
        maintenance: item.maintenance.hasRecord ? getMaintenanceHealthStatusLabel(item.maintenance.latestHealthStatus) : '記録なし',
        memo: item.memo ?? '',
        edit: '詳細',
      }));
    case 'memory-card-edition-masters':
      return lookups.memoryCardEditionMasters.map((item) => ({
        tableRowKey: createTableRowKey(resourceKey, item.id),
        id: item.id,
        displayOrder: item.displayOrder,
        primary: item.name,
        relation: `${item.blockCount} ブロック`,
        note: '',
        status: formatDeletedState(item.isDeleted),
        edit: '編集',
      }));
    case 'save-datas':
      return lookups.saveDatas.map((item) => {
        const masterId = getSaveDataGameSoftwareMasterId(item, lookups);
        const master = masterId ? lookups.gameSoftwareMasters.find((m) => m.id === masterId) : null;
        const schema = masterId ? saveDataSchemas[masterId] : null;
        const storageParts = getSaveDataStorageParts(item, lookups);
        const mergedFields = mergeSchemaWithSaveData(schema, item).filter((field) => !field.isDisabled);
        const dynamicFieldLabels = mergedFields.length > 0
          ? Object.fromEntries(mergedFields.map((field) => [field.fieldKey, field.label]))
          : Object.fromEntries(item.extendedFields.map((field) => [field.fieldKey, field.label]));
        const dynamicFieldValues = mergedFields.length > 0
          ? Object.fromEntries(mergedFields.map((field) => [`dynamic:${field.fieldKey}`, formatMergedFieldValue(field)]))
          : Object.fromEntries(item.extendedFields.map((field) => [`dynamic:${field.fieldKey}`, formatSaveDataDynamicFieldValue(field, schema)]));

        return {
          tableRowKey: createTableRowKey(resourceKey, item.id),
          id: item.id,
          displayOrder: item.displayOrder,
          title: master?.abbreviation || master?.name || '未設定',
          save: storageParts.join(' '),
          storyProgress: item.storyProgressDefinitionId
            ? (getStoryProgressLabel(masterId, item.storyProgressDefinitionId, storyProgressLabels) ?? '')
            : '',
          memo: item.memo ?? '',
          saveDataContentGroupId: getSaveDataContentGroupId(item, lookups),
          saveDataGameSoftwareMasterId: masterId,
          saveDataDynamicFieldLabels: dynamicFieldLabels,
          ...dynamicFieldValues,
          operation: '操作',
          edit: '編集',
        };
      });
  }
}
