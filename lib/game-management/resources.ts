import type { ResourceKey } from '@/lib/game-management/types';

export type ResourceScope = 'admin' | 'user';

export type PageMode = 'view' | 'edit';

export type ResourceDefinition = {
  key: ResourceKey;
  label: string;
  shortLabel: string;
  description: string;
  apiPath: string;
  scope: ResourceScope;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** 一括編集で変更可能なフィールド名の配列。未指定の場合は一括編集不可。 */
  bulkEditableFields?: string[];
};

export const RESOURCE_DEFINITIONS: Record<ResourceKey, ResourceDefinition> = {
  'account-type-masters': {
    key: 'account-type-masters',
    label: 'アカウント種類管理',
    shortLabel: 'アカウント種類',
    description: 'アカウントの種類（Nintendo Account、PlayStation Networkなど）を管理します。',
    apiPath: '/api/AccountTypeMasters',
    scope: 'admin',
    canCreate: true,
    canEdit: true,
    canDelete: true,
    bulkEditableFields: ['gameConsoleCategoryIds'],
  },
  accounts: {
    key: 'accounts',
    label: 'アカウント管理',
    shortLabel: 'アカウント',
    description: 'アカウント種類に紐づくアカウント情報を管理します。',
    apiPath: '/api/Accounts',
    scope: 'user',
    canCreate: true,
    canEdit: true,
    canDelete: true,
    bulkEditableFields: ['memo'],
  },
  'game-console-categories': {
    key: 'game-console-categories',
    label: 'ゲーム機分類管理',
    shortLabel: 'ゲーム機分類',
    description: '保存方式を含むゲーム機分類を管理します。',
    apiPath: '/api/GameConsoleCategories',
    scope: 'admin',
    canCreate: true,
    canEdit: true,
    canDelete: true,
    bulkEditableFields: ['saveStorageType'],
  },
  'game-console-masters': {
    key: 'game-console-masters',
    label: 'ゲーム機マスタ管理',
    shortLabel: 'ゲーム機マスタ',
    description: 'ゲーム機分類配下の具体的な機種を管理します。',
    apiPath: '/api/GameConsoleMasters',
    scope: 'admin',
    canCreate: true,
    canEdit: true,
    canDelete: true,
    bulkEditableFields: ['gameConsoleCategoryId'],
  },
  'game-console-edition-masters': {
    key: 'game-console-edition-masters',
    label: 'ゲーム機エディション管理',
    shortLabel: 'エディション',
    description: 'ゲーム機マスタ配下の色違い・限定版を管理します。',
    apiPath: '/api/GameConsoleEditionMasters',
    scope: 'admin',
    canCreate: true,
    canEdit: true,
    canDelete: true,
    bulkEditableFields: ['gameConsoleMasterId'],
  },
  'game-consoles': {
    key: 'game-consoles',
    label: 'ゲーム機管理',
    shortLabel: 'ゲーム機',
    description: '所有しているゲーム機を管理します。',
    apiPath: '/api/GameConsoles',
    scope: 'user',
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  'game-software-content-groups': {
    key: 'game-software-content-groups',
    label: 'ゲームソフト分類管理',
    shortLabel: 'ソフト分類',
    description: 'ゲームソフトのコンテンツ分類を管理します。',
    apiPath: '/api/GameSoftwareContentGroups',
    scope: 'admin',
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  'game-software-masters': {
    key: 'game-software-masters',
    label: 'ゲームソフトマスタ管理',
    shortLabel: 'ソフトマスタ',
    description: 'ゲームソフト名と対応機種分類を管理します。',
    apiPath: '/api/GameSoftwareMasters',
    scope: 'admin',
    canCreate: true,
    canEdit: true,
    canDelete: true,
    bulkEditableFields: ['gameConsoleCategoryId', 'contentGroupId'],
  },
  'game-softwares': {
    key: 'game-softwares',
    label: 'ゲームソフト管理',
    shortLabel: 'ゲームソフト',
    description: '所有しているゲームソフトを管理します。',
    apiPath: '/api/GameSoftwares',
    scope: 'user',
    canCreate: true,
    canEdit: true,
    canDelete: true,
    bulkEditableFields: ['variant', 'memo'],
  },
  'memory-cards': {
    key: 'memory-cards',
    label: 'メモリーカード管理',
    shortLabel: 'メモリーカード',
    description: 'メモリーカードの管理を行います。',
    apiPath: '/api/MemoryCards',
    scope: 'user',
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  'memory-card-edition-masters': {
    key: 'memory-card-edition-masters',
    label: 'メモリーカードエディション管理',
    shortLabel: 'MCエディション',
    description: 'メモリーカードの種類（ブロック数の違い等）を管理します。',
    apiPath: '/api/MemoryCardEditionMasters',
    scope: 'admin',
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  'save-datas': {
    key: 'save-datas',
    label: 'セーブデータ管理',
    shortLabel: 'セーブデータ',
    description: '保存方式に応じた関連先を選択してセーブデータを管理します。',
    apiPath: '/api/SaveDatas',
    scope: 'user',
    canCreate: true,
    canEdit: true,
    canDelete: true,
    bulkEditableFields: ['memo'],
  },
};

export const ADMIN_RESOURCE_ORDER: ResourceKey[] = [
  'account-type-masters',
  'game-console-categories',
  'game-console-masters',
  'game-console-edition-masters',
  'game-software-content-groups',
  'game-software-masters',
  'memory-card-edition-masters',
];

export const USER_RESOURCE_ORDER: ResourceKey[] = [
  'game-consoles',
  'game-softwares',
  'accounts',
  'memory-cards',
  'save-datas',
];

export const RESOURCE_ORDER: ResourceKey[] = [...ADMIN_RESOURCE_ORDER, ...USER_RESOURCE_ORDER];

export function isResourceKey(value: string): value is ResourceKey {
  return value in RESOURCE_DEFINITIONS;
}

export function getResourceDefinition(resourceKey: ResourceKey): ResourceDefinition {
  return RESOURCE_DEFINITIONS[resourceKey];
}