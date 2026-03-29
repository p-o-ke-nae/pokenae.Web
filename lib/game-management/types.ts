export type SaveStorageType = 0 | 1 | 2 | 3;

export type SaveDataFieldType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type GameSoftwareVariant = 0 | 1;

export type MemoryCardCapacity = 59 | 251;

export type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
};

export type ValidationProblemDetails = ProblemDetails & {
  errors?: Record<string, string[]>;
};

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export type AccountDto = {
  id: number;
  ownerGoogleUserId: string;
  label: string | null;
  memo: string | null;
  gameConsoleCategoryIds: number[];
  isDeleted: boolean;
};

export type CreateAccountRequest = {
  label: string | null;
  memo: string | null;
  gameConsoleCategoryIds: number[] | null;
};

export type UpdateAccountRequest = {
  label: string | null;
  memo: string | null;
  gameConsoleCategoryIds: number[] | null;
};

// ---------------------------------------------------------------------------
// GameConsoleCategory (旧 GameConsoleMaster の「分類」に相当)
// ---------------------------------------------------------------------------

export type GameConsoleCategoryDto = {
  id: number;
  name: string;
  abbreviation: string;
  manufacturer: string | null;
  saveStorageType: SaveStorageType;
  isDeleted: boolean;
};

export type CreateGameConsoleCategoryRequest = {
  name: string;
  abbreviation: string;
  manufacturer: string | null;
  saveStorageType: SaveStorageType;
};

export type UpdateGameConsoleCategoryRequest = {
  name: string;
  abbreviation: string;
  manufacturer: string | null;
  saveStorageType: SaveStorageType;
};

// ---------------------------------------------------------------------------
// GameConsoleMaster (分類配下の具体的な機種)
// ---------------------------------------------------------------------------

export type GameConsoleMasterDto = {
  id: number;
  gameConsoleCategoryId: number;
  name: string;
  abbreviation: string;
  isDeleted: boolean;
};

export type CreateGameConsoleMasterRequest = {
  gameConsoleCategoryId: number;
  name: string;
  abbreviation: string;
};

export type UpdateGameConsoleMasterRequest = {
  gameConsoleCategoryId: number;
  name: string;
  abbreviation: string;
};

// ---------------------------------------------------------------------------
// GameConsoleEditionMaster (マスタ配下の色違い・限定版)
// ---------------------------------------------------------------------------

export type GameConsoleEditionMasterDto = {
  id: number;
  gameConsoleMasterId: number;
  name: string;
  abbreviation: string;
  isDeleted: boolean;
};

export type CreateGameConsoleEditionMasterRequest = {
  gameConsoleMasterId: number;
  name: string;
  abbreviation: string;
};

export type UpdateGameConsoleEditionMasterRequest = {
  gameConsoleMasterId: number;
  name: string;
  abbreviation: string;
};

// ---------------------------------------------------------------------------
// GameConsole (ユーザー所有)
// ---------------------------------------------------------------------------

export type GameConsoleDto = {
  id: number;
  gameConsoleMasterId: number;
  gameConsoleEditionMasterId: number | null;
  ownerGoogleUserId: string;
  label: string | null;
  memo: string | null;
  isDeleted: boolean;
};

export type CreateGameConsoleRequest = {
  gameConsoleMasterId: number;
  gameConsoleEditionMasterId: number | null;
  label: string | null;
  memo: string | null;
};

export type UpdateGameConsoleRequest = {
  label: string | null;
  memo: string | null;
};

export type GameConsoleCountByMasterDto = {
  gameConsoleMasterId: number;
  gameConsoleMasterName: string | null;
  count: number;
};

// ---------------------------------------------------------------------------
// GameSoftwareContentGroup
// ---------------------------------------------------------------------------

export type GameSoftwareContentGroupDto = {
  id: number;
  name: string;
  isDeleted: boolean;
};

export type CreateGameSoftwareContentGroupRequest = {
  name: string;
};

export type UpdateGameSoftwareContentGroupRequest = {
  name: string;
};

// ---------------------------------------------------------------------------
// GameSoftwareMaster
// ---------------------------------------------------------------------------

export type GameSoftwareMasterDto = {
  id: number;
  name: string;
  abbreviation: string;
  gameConsoleCategoryId: number;
  contentGroupId: number | null;
  isDeleted: boolean;
};

export type CreateGameSoftwareMasterRequest = {
  name: string;
  abbreviation: string;
  gameConsoleCategoryId: number;
  contentGroupId: number | null;
};

export type UpdateGameSoftwareMasterRequest = {
  name: string;
  abbreviation: string;
  gameConsoleCategoryId: number;
  contentGroupId: number | null;
};

// ---------------------------------------------------------------------------
// GameSoftware (ユーザー所有)
// ---------------------------------------------------------------------------

export type GameSoftwareDto = {
  id: number;
  gameSoftwareMasterId: number;
  variant: GameSoftwareVariant | null;
  ownerGoogleUserId: string;
  label: string | null;
  memo: string | null;
  isDeleted: boolean;
};

export type CreateGameSoftwareRequest = {
  gameSoftwareMasterId: number;
  variant: GameSoftwareVariant | null;
  label: string | null;
  memo: string | null;
};

export type UpdateGameSoftwareRequest = {
  variant: GameSoftwareVariant | null;
  label: string | null;
  memo: string | null;
};

export type GameSoftwareCountByMasterDto = {
  gameSoftwareMasterId: number;
  gameSoftwareMasterName: string | null;
  count: number;
};

// ---------------------------------------------------------------------------
// MemoryCard (ユーザー所有)
// ---------------------------------------------------------------------------

export type MemoryCardDto = {
  id: number;
  capacity: MemoryCardCapacity;
  ownerGoogleUserId: string;
  label: string | null;
  memo: string | null;
  isDeleted: boolean;
};

export type CreateMemoryCardRequest = {
  capacity: MemoryCardCapacity;
  label: string | null;
  memo: string | null;
};

export type UpdateMemoryCardRequest = {
  capacity: MemoryCardCapacity;
  label: string | null;
  memo: string | null;
};

// ---------------------------------------------------------------------------
// SaveData
// ---------------------------------------------------------------------------

export type SaveDataFieldInputDto = {
  fieldKey: string;
  stringValue: string | null;
  intValue: number | null;
  decimalValue: number | null;
  boolValue: boolean | null;
  dateValue: string | null;
  optionKey: string | null;
};

export type SaveDataFieldValueDto = {
  fieldKey: string;
  label: string;
  fieldType: SaveDataFieldType;
  isRequired: boolean;
  displayOrder: number;
  stringValue: string | null;
  intValue: number | null;
  decimalValue: number | null;
  boolValue: boolean | null;
  dateValue: string | null;
  selectedOptionKey: string | null;
};

export type SaveDataDto = {
  id: number;
  ownerGoogleUserId: string;
  replacedBySaveDataId: number | null;
  saveStorageType: SaveStorageType;
  gameSoftwareMasterId: number;
  gameSoftwareId: number | null;
  gameConsoleId: number | null;
  accountId: number | null;
  memoryCardId: number | null;
  storyProgressDefinitionId: number | null;
  extendedFields: SaveDataFieldValueDto[];
  isDeleted: boolean;
  deleteReason: string | null;
};

export type CreateSaveDataRequest = {
  gameSoftwareMasterId: number;
  gameSoftwareId: number | null;
  gameConsoleId: number | null;
  accountId: number | null;
  memoryCardId: number | null;
  storyProgressDefinitionId: number | null;
  extendedFields: SaveDataFieldInputDto[] | null;
};

export type UpdateSaveDataRequest = {
  gameSoftwareMasterId: number;
  gameSoftwareId: number | null;
  gameConsoleId: number | null;
  accountId: number | null;
  memoryCardId: number | null;
  storyProgressDefinitionId: number | null;
  replacedBySaveDataId: number | null;
  extendedFields: SaveDataFieldInputDto[] | null;
};

export type DeleteSaveDataRequest = {
  deleteReason: string | null;
  replacedBySaveDataId: number | null;
};

// ---------------------------------------------------------------------------
// SaveDataFieldDefinition / Option / Override
// ---------------------------------------------------------------------------

export type SaveDataFieldDefinitionDto = {
  id: number;
  contentGroupId: number;
  fieldKey: string;
  label: string;
  description: string | null;
  fieldType: SaveDataFieldType;
  displayOrder: number;
  isRequired: boolean;
  isDeleted: boolean;
};

export type CreateSaveDataFieldDefinitionRequest = {
  fieldKey: string;
  label: string;
  description: string | null;
  fieldType: string;
  displayOrder: number;
  isRequired: boolean;
};

export type UpdateSaveDataFieldDefinitionRequest = {
  fieldKey: string;
  label: string;
  description: string | null;
  fieldType: string;
  displayOrder: number;
  isRequired: boolean;
};

export type SaveDataFieldOptionDto = {
  id: number;
  fieldDefinitionId: number;
  optionKey: string;
  label: string;
  description: string | null;
  displayOrder: number;
  isDeleted: boolean;
};

export type CreateSaveDataFieldOptionRequest = {
  optionKey: string;
  label: string;
  description: string | null;
  displayOrder: number;
};

export type UpdateSaveDataFieldOptionRequest = {
  optionKey: string;
  label: string;
  description: string | null;
  displayOrder: number;
};

export type SaveDataFieldOverrideDto = {
  id: number;
  gameSoftwareMasterId: number;
  fieldDefinitionId: number;
  overrideLabel: string | null;
  overrideDescription: string | null;
  overrideIsRequired: boolean | null;
  isDisabled: boolean;
  isDeleted: boolean;
};

export type UpsertSaveDataFieldOverrideRequest = {
  overrideLabel: string | null;
  overrideDescription: string | null;
  overrideIsRequired: boolean | null;
  isDisabled: boolean;
};

// ---------------------------------------------------------------------------
// SaveData Schema (公開 resolved)
// ---------------------------------------------------------------------------

export type ResolvedSaveDataFieldOptionDto = {
  optionKey: string;
  label: string;
  description: string | null;
  displayOrder: number;
};

export type ResolvedSaveDataFieldSchemaDto = {
  fieldKey: string;
  label: string;
  description: string | null;
  fieldType: SaveDataFieldType;
  displayOrder: number;
  isRequired: boolean;
  isDisabled: boolean;
  options: ResolvedSaveDataFieldOptionDto[];
};

export type SaveDataSchemaDto = {
  gameSoftwareMasterId: number;
  contentGroupId: number | null;
  fields: ResolvedSaveDataFieldSchemaDto[];
};

// ---------------------------------------------------------------------------
// StoryProgressDefinition / Override
// ---------------------------------------------------------------------------

export type StoryProgressDefinitionDto = {
  id: number;
  contentGroupId: number;
  progressKey: string;
  label: string;
  description: string | null;
  displayOrder: number;
  isDeleted: boolean;
};

export type CreateStoryProgressDefinitionRequest = {
  progressKey: string;
  label: string;
  description: string | null;
  displayOrder: number;
};

export type UpdateStoryProgressDefinitionRequest = {
  progressKey: string;
  label: string;
  description: string | null;
  displayOrder: number;
};

export type StoryProgressOverrideDto = {
  id: number;
  gameSoftwareMasterId: number;
  storyProgressDefinitionId: number;
  overrideLabel: string | null;
  overrideDescription: string | null;
  isDisabled: boolean;
  isDeleted: boolean;
};

export type UpsertStoryProgressOverrideRequest = {
  overrideLabel: string | null;
  overrideDescription: string | null;
  isDisabled: boolean;
};

// ---------------------------------------------------------------------------
// StoryProgress Schema (公開 resolved)
// ---------------------------------------------------------------------------

export type ResolvedStoryProgressDto = {
  storyProgressDefinitionId: number;
  progressKey: string;
  label: string;
  description: string | null;
  displayOrder: number;
  isDisabled: boolean;
};

export type StoryProgressSchemaDto = {
  gameSoftwareMasterId: number;
  contentGroupId: number | null;
  choices: ResolvedStoryProgressDto[];
};

// ---------------------------------------------------------------------------
// Resource / Lookup
// ---------------------------------------------------------------------------

export type ResourceKey =
  | 'accounts'
  | 'game-console-categories'
  | 'game-console-masters'
  | 'game-console-edition-masters'
  | 'game-consoles'
  | 'game-software-content-groups'
  | 'game-software-masters'
  | 'game-softwares'
  | 'memory-cards'
  | 'save-datas';

export type ResourceRecordMap = {
  accounts: AccountDto;
  'game-console-categories': GameConsoleCategoryDto;
  'game-console-masters': GameConsoleMasterDto;
  'game-console-edition-masters': GameConsoleEditionMasterDto;
  'game-consoles': GameConsoleDto;
  'game-software-content-groups': GameSoftwareContentGroupDto;
  'game-software-masters': GameSoftwareMasterDto;
  'game-softwares': GameSoftwareDto;
  'memory-cards': MemoryCardDto;
  'save-datas': SaveDataDto;
};

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type MasterLookups = {
  gameConsoleCategories: GameConsoleCategoryDto[];
  gameConsoleMasters: GameConsoleMasterDto[];
  gameConsoleEditionMasters: GameConsoleEditionMasterDto[];
  gameSoftwareContentGroups: GameSoftwareContentGroupDto[];
  gameSoftwareMasters: GameSoftwareMasterDto[];
};

export type ManagementLookups = MasterLookups & {
  accounts: AccountDto[];
  gameConsoles: GameConsoleDto[];
  gameSoftwares: GameSoftwareDto[];
  memoryCards: MemoryCardDto[];
  saveDatas: SaveDataDto[];
};