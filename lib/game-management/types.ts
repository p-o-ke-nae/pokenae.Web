export type SaveStorageType = 0 | 1 | 2 | 3;

export type SaveDataFieldType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type GameSoftwareVariant = 0 | 1;

export type MemoryCardBlockCount = 59 | 251 | 1019;

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
// AccountTypeMaster
// ---------------------------------------------------------------------------

export type AccountTypeMasterDto = {
  id: number;
  name: string;
  abbreviation: string;
  gameConsoleCategoryIds: number[];
  displayOrder: number;
  isDeleted: boolean;
};

export type CreateAccountTypeMasterRequest = {
  name: string;
  abbreviation: string;
  gameConsoleCategoryIds: number[] | null;
  displayOrder?: number | null;
};

export type UpdateAccountTypeMasterRequest = {
  name: string;
  abbreviation: string;
  gameConsoleCategoryIds: number[] | null;
  displayOrder: number;
};

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export type AccountDto = {
  id: number;
  ownerGoogleUserId: string;
  accountTypeMasterId: number;
  displayOrder: number;
  label: string | null;
  memo: string | null;
  linkedGameConsoleIds: number[];
  isDeleted: boolean;
};

export type CreateAccountRequest = {
  accountTypeMasterId: number;
  displayOrder?: number | null;
  label: string | null;
  memo: string | null;
  linkedGameConsoleIds: number[] | null;
};

export type UpdateAccountRequest = {
  displayOrder: number;
  label: string | null;
  memo: string | null;
  linkedGameConsoleIds: number[] | null;
};

export type MoveAccountBetweenConsolesRequest = {
  accountId: number;
  sourceGameConsoleId: number;
  targetGameConsoleId: number;
};

// ---------------------------------------------------------------------------
// GameConsoleCategoryCompatibility
// ---------------------------------------------------------------------------

export type GameConsoleCategoryCompatibilityDto = {
  id: number;
  hostGameConsoleCategoryId: number;
  supportedGameConsoleCategoryId: number;
  isDeleted: boolean;
};

export type SetGameConsoleCategoryCompatibilitiesRequest = {
  supportedGameConsoleCategoryIds: number[];
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
  displayOrder: number;
  isDeleted: boolean;
};

export type CreateGameConsoleCategoryRequest = {
  name: string;
  abbreviation: string;
  manufacturer: string | null;
  saveStorageType: SaveStorageType;
  displayOrder?: number | null;
};

export type UpdateGameConsoleCategoryRequest = {
  name: string;
  abbreviation: string;
  manufacturer: string | null;
  saveStorageType: SaveStorageType;
  displayOrder: number;
};

// ---------------------------------------------------------------------------
// GameConsoleMaster (分類配下の具体的な機種)
// ---------------------------------------------------------------------------

export type GameConsoleMasterDto = {
  id: number;
  gameConsoleCategoryId: number;
  name: string;
  abbreviation: string;
  displayOrder: number;
  isDeleted: boolean;
};

export type CreateGameConsoleMasterRequest = {
  gameConsoleCategoryId: number;
  name: string;
  abbreviation: string;
  displayOrder?: number | null;
};

export type UpdateGameConsoleMasterRequest = {
  gameConsoleCategoryId: number;
  name: string;
  abbreviation: string;
  displayOrder: number;
};

// ---------------------------------------------------------------------------
// GameConsoleEditionMaster (マスタ配下の色違い・限定版)
// ---------------------------------------------------------------------------

export type GameConsoleEditionMasterDto = {
  id: number;
  gameConsoleMasterId: number;
  name: string;
  abbreviation: string;
  displayOrder: number;
  isDeleted: boolean;
};

export type CreateGameConsoleEditionMasterRequest = {
  gameConsoleMasterId: number;
  name: string;
  abbreviation: string;
  displayOrder?: number | null;
};

export type UpdateGameConsoleEditionMasterRequest = {
  gameConsoleMasterId: number;
  name: string;
  abbreviation: string;
  displayOrder: number;
};

// ---------------------------------------------------------------------------
// GameConsole (ユーザー所有)
// ---------------------------------------------------------------------------

export type GameConsoleDto = {
  id: number;
  gameConsoleMasterId: number;
  gameConsoleEditionMasterId: number | null;
  ownerGoogleUserId: string;
  displayOrder: number;
  label: string | null;
  memo: string | null;
  isDeleted: boolean;
};

export type CreateGameConsoleRequest = {
  gameConsoleMasterId: number;
  gameConsoleEditionMasterId: number | null;
  displayOrder?: number | null;
  label: string | null;
  memo: string | null;
};

export type UpdateGameConsoleRequest = {
  gameConsoleEditionMasterId?: number | null;
  displayOrder: number;
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
  displayOrder: number;
  isDeleted: boolean;
};

export type CreateGameSoftwareContentGroupRequest = {
  name: string;
  displayOrder?: number | null;
};

export type UpdateGameSoftwareContentGroupRequest = {
  name: string;
  displayOrder: number;
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
  displayOrder: number;
  isDeleted: boolean;
};

export type CreateGameSoftwareMasterRequest = {
  name: string;
  abbreviation: string;
  gameConsoleCategoryId: number;
  contentGroupId: number | null;
  displayOrder?: number | null;
};

export type UpdateGameSoftwareMasterRequest = {
  name: string;
  abbreviation: string;
  gameConsoleCategoryId: number;
  contentGroupId: number | null;
  displayOrder: number;
};

// ---------------------------------------------------------------------------
// GameSoftware (ユーザー所有)
// ---------------------------------------------------------------------------

export type GameSoftwareDto = {
  id: number;
  gameSoftwareMasterId: number;
  variant: GameSoftwareVariant | null;
  accountId: number | null;
  installedGameConsoleId: number | null;
  ownerGoogleUserId: string;
  displayOrder: number;
  label: string | null;
  memo: string | null;
  isDeleted: boolean;
};

export type CreateGameSoftwareRequest = {
  gameSoftwareMasterId: number;
  variant: GameSoftwareVariant | null;
  accountId: number | null;
  installedGameConsoleId: number | null;
  displayOrder?: number | null;
  label: string | null;
  memo: string | null;
};

export type UpdateGameSoftwareRequest = {
  variant: GameSoftwareVariant | null;
  accountId: number | null;
  installedGameConsoleId: number | null;
  displayOrder: number;
  label: string | null;
  memo: string | null;
};

export type GameSoftwareCountByMasterDto = {
  gameSoftwareMasterId: number;
  gameSoftwareMasterName: string | null;
  count: number;
};

// ---------------------------------------------------------------------------
// MemoryCardEditionMaster (メモリーカード種類マスタ)
// ---------------------------------------------------------------------------

export type MemoryCardEditionMasterDto = {
  id: number;
  name: string;
  blockCount: MemoryCardBlockCount;
  displayOrder: number;
  isDeleted: boolean;
};

export type CreateMemoryCardEditionMasterRequest = {
  name: string;
  blockCount: MemoryCardBlockCount;
  displayOrder?: number | null;
};

export type UpdateMemoryCardEditionMasterRequest = {
  name: string;
  blockCount: MemoryCardBlockCount;
  displayOrder: number;
};

// ---------------------------------------------------------------------------
// MemoryCard (ユーザー所有)
// ---------------------------------------------------------------------------

export type MemoryCardDto = {
  id: number;
  memoryCardEditionMasterId: number;
  ownerGoogleUserId: string;
  displayOrder: number;
  label: string | null;
  memo: string | null;
  isDeleted: boolean;
};

export type CreateMemoryCardRequest = {
  memoryCardEditionMasterId: number;
  displayOrder?: number | null;
  label: string | null;
  memo: string | null;
};

export type UpdateMemoryCardRequest = {
  memoryCardEditionMasterId: number;
  displayOrder: number;
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
  displayOrder: number;
  memo: string | null;
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
  memo: string | null;
  displayOrder?: number | null;
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
  memo: string | null;
  displayOrder: number;
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
  sharedChoiceSetId: number | null;
  isDeleted: boolean;
};

export type CreateSaveDataFieldDefinitionRequest = {
  fieldKey: string;
  label: string;
  description: string | null;
  fieldType: string;
  displayOrder?: number | null;
  isRequired: boolean;
  sharedChoiceSetId?: number | null;
};

export type UpdateSaveDataFieldDefinitionRequest = {
  fieldKey: string;
  label: string;
  description: string | null;
  fieldType: string;
  displayOrder: number;
  isRequired: boolean;
  sharedChoiceSetId?: number | null;
};

export type BatchSaveDataFieldDefinitionTypeItem = {
  id: number;
  updatePayload: UpdateSaveDataFieldDefinitionRequest;
  rollbackPayload: UpdateSaveDataFieldDefinitionRequest;
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
  displayOrder?: number | null;
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
// SaveDataFieldChoiceSet / ChoiceOption (共有単一選択肢セット)
// ---------------------------------------------------------------------------

export type SaveDataFieldChoiceSetDto = {
  id: number;
  choiceSetKey: string;
  label: string;
  description: string | null;
  isDeleted: boolean;
};

export type CreateSaveDataFieldChoiceSetRequest = {
  choiceSetKey: string;
  label: string;
  description: string | null;
};

export type UpdateSaveDataFieldChoiceSetRequest = {
  choiceSetKey: string;
  label: string;
  description: string | null;
};

export type SaveDataFieldChoiceOptionDto = {
  id: number;
  choiceSetId: number;
  optionKey: string;
  label: string;
  description: string | null;
  displayOrder: number;
  isDeleted: boolean;
};

export type CreateSaveDataFieldChoiceOptionRequest = {
  optionKey: string;
  label: string;
  description: string | null;
  displayOrder?: number | null;
};

export type UpdateSaveDataFieldChoiceOptionRequest = {
  optionKey: string;
  label: string;
  description: string | null;
  displayOrder: number;
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
  displayOrder?: number | null;
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
// Reorder
// ---------------------------------------------------------------------------

export type ReorderItemRequest = {
  id: number;
  displayOrder: number;
};

// ---------------------------------------------------------------------------
// Resource / Lookup
// ---------------------------------------------------------------------------

export type ResourceKey =
  | 'account-type-masters'
  | 'accounts'
  | 'game-console-categories'
  | 'game-console-masters'
  | 'game-console-edition-masters'
  | 'game-consoles'
  | 'game-software-content-groups'
  | 'game-software-masters'
  | 'game-softwares'
  | 'memory-card-edition-masters'
  | 'memory-cards'
  | 'save-datas';

export type ResourceRecordMap = {
  'account-type-masters': AccountTypeMasterDto;
  accounts: AccountDto;
  'game-console-categories': GameConsoleCategoryDto;
  'game-console-masters': GameConsoleMasterDto;
  'game-console-edition-masters': GameConsoleEditionMasterDto;
  'game-consoles': GameConsoleDto;
  'game-software-content-groups': GameSoftwareContentGroupDto;
  'game-software-masters': GameSoftwareMasterDto;
  'game-softwares': GameSoftwareDto;
  'memory-card-edition-masters': MemoryCardEditionMasterDto;
  'memory-cards': MemoryCardDto;
  'save-datas': SaveDataDto;
};

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type MasterLookups = {
  accountTypeMasters: AccountTypeMasterDto[];
  gameConsoleCategories: GameConsoleCategoryDto[];
  gameConsoleCategoryCompatibilities: GameConsoleCategoryCompatibilityDto[];
  gameConsoleMasters: GameConsoleMasterDto[];
  gameConsoleEditionMasters: GameConsoleEditionMasterDto[];
  gameSoftwareContentGroups: GameSoftwareContentGroupDto[];
  gameSoftwareMasters: GameSoftwareMasterDto[];
  memoryCardEditionMasters: MemoryCardEditionMasterDto[];
};

export type ManagementLookups = MasterLookups & {
  accounts: AccountDto[];
  gameConsoles: GameConsoleDto[];
  gameSoftwares: GameSoftwareDto[];
  memoryCards: MemoryCardDto[];
  saveDatas: SaveDataDto[];
};