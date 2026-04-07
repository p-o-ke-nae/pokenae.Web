import type { ResourceKey, SelectOption } from '@/lib/game-management/types';

export type ManagementTableRow = {
  tableRowKey: string;
  id: number;
  displayOrder: number;
  primary?: string;
  abbreviation?: string;
  relation?: string;
  note?: string;
  status?: string;
  gameSoftwareCount?: number;
  hard?: string;
  name?: string;
  save?: string;
  gameSoftware?: string;
  storyProgress?: string;
  operation?: string;
  edit: string;
  children?: ManagementTableRow[];
  rowResourceKey?: ResourceKey;
  parentContentGroupId?: number | null;
};

export type FormState = {
  displayOrder: string;
  name: string;
  abbreviation: string;
  manufacturer: string;
  saveStorageType: string;
  label: string;
  memo: string;
  gameConsoleCategoryId: string;
  gameConsoleCategoryIds: string[];
  accountTypeMasterId: string;
  linkedGameConsoleIds: string[];
  gameConsoleMasterId: string;
  gameConsoleEditionMasterId: string;
  contentGroupId: string;
  gameSoftwareMasterId: string;
  variant: string;
  memoryCardEditionMasterId: string;
  blockCount: string;
  gameSoftwareId: string;
  gameConsoleId: string;
  accountId: string;
  installedGameConsoleId: string;
  memoryCardId: string;
  storyProgressDefinitionId: string;
  replacedBySaveDataId: string;
  deleteReason: string;
  dynamicFieldValues: Record<string, string>;
};

export type EditorDialogContext = {
  resourceKey: ResourceKey;
  recordId: number | null;
  initialFormState?: Partial<FormState>;
  parentContentGroupId?: number | null;
};

export type DashboardExtraCard = {
  href: string;
  shortLabel: string;
  title: string;
  description: string;
  actionLabel?: string;
};

export type StoryProgressLabelMap = Record<string, string>;

export type LookupSelectOptions = {
  accountTypeMasters: SelectOption[];
  gameConsoleCategories: SelectOption[];
  gameConsoleMasters: SelectOption[];
  gameConsoleEditionMasters: SelectOption[];
  gameSoftwareContentGroups: SelectOption[];
  gameSoftwareMasters: SelectOption[];
  gameSoftwares: SelectOption[];
  gameConsoles: SelectOption[];
  accounts: SelectOption[];
  memoryCardEditionMasters: SelectOption[];
  memoryCards: SelectOption[];
  saveDatas: SelectOption[];
};
