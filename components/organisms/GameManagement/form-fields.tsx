'use client';

import CustomCheckBox from '@/components/atoms/CustomCheckBox';
import CustomHeader from '@/components/atoms/CustomHeader';
import CustomLabel from '@/components/atoms/CustomLabel';
import CustomMessageArea from '@/components/atoms/CustomMessageArea';
import CustomTextArea from '@/components/atoms/CustomTextArea';
import CustomTextBox from '@/components/atoms/CustomTextBox';
import SaveDataDynamicFields from '@/components/organisms/GameManagement/SaveDataDynamicFields';
import { formatSaveStorageType } from '@/lib/game-management/save-storage-type';
import type { ManagementLookups, ResourceKey, SaveDataSchemaDto, StoryProgressSchemaDto } from '@/lib/game-management/types';
import {
  getAccountCandidates,
  getAccountDisplay,
  getAccountTypeMasterName,
  getAllowedConsoleCategoryIdsForAccountType,
  getConsoleCandidates,
  getGameConsoleDisplay,
  getSaveStorageTypeForGameSoftwareMaster,
  numberOrNull,
} from './helpers';
import { optionize, selectOptionsFromLookups, SAVE_STORAGE_TYPE_OPTIONS } from './options';
import { SelectField } from './shared';
import type { FormState } from './view-types';

export function FormFields({
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
  displayOnly = false,
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
  displayOnly?: boolean;
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
  const selectedSaveDataAccount = derivedSaveStorageType === 2 && formState.accountId
    ? lookups.accounts.find((a) => String(a.id) === formState.accountId)
    : null;
  const linkedConsoleCandidates = selectedSaveDataAccount
    ? consoleCandidates.filter((opt) => selectedSaveDataAccount.linkedGameConsoleIds.includes(Number(opt.value)))
    : consoleCandidates;
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
  const displayOrderField = isNew ? (
    <div className="space-y-2">
      <CustomLabel htmlFor="displayOrder">表示順（任意）</CustomLabel>
      <CustomTextBox
        id="displayOrder"
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        value={formState.displayOrder}
        onChange={(event) => onChange({ displayOrder: event.target.value })}
        placeholder={isNew ? '未入力で末尾に追加' : '1'}
        displayOnly={displayOnly}
      />
    </div>
  ) : null;

  switch (resourceKey) {
    case 'account-type-masters': {
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <CustomLabel htmlFor="name" required>名称</CustomLabel>
            <CustomTextBox id="name" value={formState.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Nintendo Account" displayOnly={displayOnly} />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="abbreviation" required>略称</CustomLabel>
            <CustomTextBox id="abbreviation" value={formState.abbreviation} onChange={(event) => onChange({ abbreviation: event.target.value })} placeholder="NA" displayOnly={displayOnly} />
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
                      displayOnly={displayOnly}
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-200">{item.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {displayOrderField}
        </div>
      );
    }
    case 'accounts': {
      const selectedAccountType = formState.accountTypeMasterId
        ? lookups.accountTypeMasters.find((at) => String(at.id) === formState.accountTypeMasterId)
        : null;
      const allowedCategoryIds = getAllowedConsoleCategoryIdsForAccountType(
        selectedAccountType ? selectedAccountType.id : null,
        lookups,
      );
      const eligibleConsoles = lookups.gameConsoles.filter((item) => {
        const consoleMaster = lookups.gameConsoleMasters.find((cm) => cm.id === item.gameConsoleMasterId);
        return consoleMaster ? allowedCategoryIds.has(consoleMaster.gameConsoleCategoryId) : false;
      });
      return (
        <div className="space-y-5">
          {isNew ? (
            <SelectField
              id="accountTypeMasterId"
              label="アカウント種類"
              value={formState.accountTypeMasterId}
              options={options.accountTypeMasters}
              onChange={(value) => onChange({ accountTypeMasterId: value, linkedGameConsoleIds: [] })}
              placeholder="選択してください"
              displayOnly={displayOnly}
            />
          ) : (
            <div className="space-y-2">
              <CustomLabel>アカウント種類</CustomLabel>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {getAccountTypeMasterName(Number(formState.accountTypeMasterId) || null, lookups)}
                <span className="ml-2 text-xs text-zinc-400">（作成後の変更不可）</span>
              </p>
            </div>
          )}
          <div className="space-y-2">
            <CustomLabel htmlFor="label">表示名</CustomLabel>
            <CustomTextBox id="label" value={formState.label} onChange={(event) => onChange({ label: event.target.value })} placeholder="任意の表示名" displayOnly={displayOnly} />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="memo">メモ</CustomLabel>
            <CustomTextArea id="memo" value={formState.memo} onChange={(event) => onChange({ memo: event.target.value })} placeholder="補足メモ" displayOnly={displayOnly} />
          </div>
          <div className="space-y-3">
            <CustomLabel>紐づけるゲーム機</CustomLabel>
            <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              このアカウントに紐づけるゲーム機を選択してください。ダウンロード版ゲームソフトやアカウント＋本体保存のセーブデータで利用します。互換カテゴリのゲーム機も紐づけ可能です。
              {selectedAccountType && ` (${selectedAccountType.name} で利用可能な分類のゲーム機のみ表示)`}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {eligibleConsoles.map((item) => {
                const checked = formState.linkedGameConsoleIds.includes(String(item.id));
                return (
                  <label key={item.id} className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <CustomCheckBox
                      checked={checked}
                      onChange={(event) => {
                        if (event.target.checked) {
                          onChange({ linkedGameConsoleIds: [...formState.linkedGameConsoleIds, String(item.id)] });
                          return;
                        }
                        onChange({ linkedGameConsoleIds: formState.linkedGameConsoleIds.filter((value) => value !== String(item.id)) });
                      }}
                      displayOnly={displayOnly}
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-200">{getGameConsoleDisplay(item, lookups)}</span>
                  </label>
                );
              })}
              {eligibleConsoles.length === 0 && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedAccountType ? '対象ゲーム機分類に紐づくゲーム機が登録されていません。' : 'アカウント種類を選択してください。'}
                </p>
              )}
            </div>
          </div>
          {displayOrderField}
        </div>
      );
    }
    case 'game-console-categories':
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <CustomLabel htmlFor="name">名称</CustomLabel>
            <CustomTextBox id="name" value={formState.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Nintendo Switch" displayOnly={displayOnly} />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="abbreviation">略称</CustomLabel>
            <CustomTextBox id="abbreviation" value={formState.abbreviation} onChange={(event) => onChange({ abbreviation: event.target.value })} placeholder="Switch" displayOnly={displayOnly} />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="manufacturer">メーカー</CustomLabel>
            <CustomTextBox id="manufacturer" value={formState.manufacturer} onChange={(event) => onChange({ manufacturer: event.target.value })} placeholder="任天堂" displayOnly={displayOnly} />
          </div>
          <SelectField
            id="saveStorageType"
            label="保存方式"
            value={formState.saveStorageType}
            options={SAVE_STORAGE_TYPE_OPTIONS}
            onChange={(value) => onChange({ saveStorageType: value })}
            displayOnly={displayOnly}
          />
          {displayOrderField}
        </div>
      );
    case 'game-console-masters':
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <CustomLabel htmlFor="name">名称</CustomLabel>
            <CustomTextBox id="name" value={formState.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Nintendo Switch (有機ELモデル)" displayOnly={displayOnly} />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="abbreviation">略称</CustomLabel>
            <CustomTextBox id="abbreviation" value={formState.abbreviation} onChange={(event) => onChange({ abbreviation: event.target.value })} placeholder="Switch OLED" displayOnly={displayOnly} />
          </div>
          <SelectField
            id="gameConsoleCategoryId"
            label="ゲーム機カテゴリ"
            value={formState.gameConsoleCategoryId}
            options={options.gameConsoleCategories}
            onChange={(value) => onChange({ gameConsoleCategoryId: value })}
            placeholder="選択してください"
            displayOnly={displayOnly}
          />
          {displayOrderField}
        </div>
      );
    case 'game-console-edition-masters':
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <CustomLabel htmlFor="name">名称</CustomLabel>
            <CustomTextBox id="name" value={formState.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="スプラトゥーン3エディション" displayOnly={displayOnly} />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="abbreviation">略称</CustomLabel>
            <CustomTextBox id="abbreviation" value={formState.abbreviation} onChange={(event) => onChange({ abbreviation: event.target.value })} placeholder="S3 Edition" displayOnly={displayOnly} />
          </div>
          <SelectField
            id="gameConsoleMasterId"
            label="ゲーム機マスタ"
            value={formState.gameConsoleMasterId}
            options={options.gameConsoleMasters}
            onChange={(value) => onChange({ gameConsoleMasterId: value })}
            placeholder="選択してください"
            displayOnly={displayOnly}
          />
          {displayOrderField}
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
            displayOnly={displayOnly}
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
            disabled={!formState.gameConsoleMasterId}
            displayOnly={displayOnly}
          />
          <div className="space-y-2">
            <CustomLabel htmlFor="label">表示ラベル</CustomLabel>
            <CustomTextBox id="label" value={formState.label} onChange={(event) => onChange({ label: event.target.value })} placeholder="自宅用 / 予備機 など" displayOnly={displayOnly} />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="memo">メモ</CustomLabel>
            <CustomTextArea id="memo" value={formState.memo} onChange={(event) => onChange({ memo: event.target.value })} placeholder="補足メモ" displayOnly={displayOnly} />
          </div>
          {displayOrderField}
        </div>
      );
    case 'game-software-content-groups':
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <CustomLabel htmlFor="name">名称</CustomLabel>
            <CustomTextBox id="name" value={formState.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="本編 / DLC / 拡張版 など" displayOnly={displayOnly} />
          </div>
          {displayOrderField}
        </div>
      );
    case 'game-software-masters':
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <CustomLabel htmlFor="name">名称</CustomLabel>
            <CustomTextBox id="name" value={formState.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="ゼルダの伝説 ブレス オブ ザ ワイルド" displayOnly={displayOnly} />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="abbreviation">略称</CustomLabel>
            <CustomTextBox id="abbreviation" value={formState.abbreviation} onChange={(event) => onChange({ abbreviation: event.target.value })} placeholder="BotW" displayOnly={displayOnly} />
          </div>
          <SelectField
            id="gameConsoleCategoryId"
            label="ゲーム機カテゴリ"
            value={formState.gameConsoleCategoryId}
            options={options.gameConsoleCategories}
            onChange={(value) => onChange({ gameConsoleCategoryId: value })}
            placeholder="選択してください"
            displayOnly={displayOnly}
          />
          <SelectField
            id="contentGroupId"
            label="分類"
            value={formState.contentGroupId}
            options={optionize(options.gameSoftwareContentGroups, true)}
            onChange={(value) => onChange({ contentGroupId: value })}
            displayOnly={displayOnly}
          />
          {displayOrderField}
        </div>
      );
    case 'game-softwares': {
      const isDigital = formState.variant === '1';
      const digitalAccountOptions = optionize(accountCandidates, true);
      const compatibleConsoleOptions = optionize(consoleCandidates, true);
      const selectedAccountForSoftware = isDigital && formState.accountId
        ? lookups.accounts.find((a) => String(a.id) === formState.accountId)
        : null;
      const linkedConsoleOptions = selectedAccountForSoftware
        ? compatibleConsoleOptions.filter((option) => selectedAccountForSoftware.linkedGameConsoleIds.includes(Number(option.value)))
        : compatibleConsoleOptions;
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
            displayOnly={displayOnly}
          />
          <div className="space-y-2">
            <CustomLabel htmlFor="label">表示ラベル</CustomLabel>
            <CustomTextBox id="label" value={formState.label} onChange={(event) => onChange({ label: event.target.value })} placeholder="パッケージ版 / DL版 など" displayOnly={displayOnly} />
          </div>
          <SelectField
            id="variant"
            label="種類"
            value={formState.variant}
            options={[{ value: '', label: '未設定' }, { value: '0', label: 'パッケージ版' }, { value: '1', label: 'ダウンロード版' }]}
            onChange={(value) => onChange({ variant: value, accountId: '', installedGameConsoleId: '' })}
            displayOnly={displayOnly}
          />
          {isDigital && (
            <>
              <SelectField
                id="accountId"
                label="アカウント"
                value={formState.accountId}
                options={digitalAccountOptions}
                onChange={(value) => onChange({ accountId: value, installedGameConsoleId: '' })}
                displayOnly={displayOnly}
              />
              <SelectField
                id="installedGameConsoleId"
                label="インストール先ゲーム機"
                value={formState.installedGameConsoleId}
                options={optionize(linkedConsoleOptions, true)}
                onChange={(value) => onChange({ installedGameConsoleId: value })}
                displayOnly={displayOnly}
              />
              {formState.accountId && linkedConsoleOptions.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  選択したアカウントに、このゲームソフトをインストール可能な紐づけ済みゲーム機がありません。アカウント管理から紐づけを設定してください。
                </p>
              )}
            </>
          )}
          <div className="space-y-2">
            <CustomLabel htmlFor="memo">メモ</CustomLabel>
            <CustomTextArea id="memo" value={formState.memo} onChange={(event) => onChange({ memo: event.target.value })} placeholder="補足メモ" displayOnly={displayOnly} />
          </div>
          {displayOrderField}
        </div>
      );
    }
    case 'memory-cards':
      return (
        <div className="space-y-5">
          <SelectField
            id="memoryCardEditionMasterId"
            label="メモリーカード種類"
            value={formState.memoryCardEditionMasterId}
            options={options.memoryCardEditionMasters}
            onChange={(value) => onChange({ memoryCardEditionMasterId: value })}
            placeholder="選択してください"
            displayOnly={displayOnly}
          />
          <div className="space-y-2">
            <CustomLabel htmlFor="label">表示ラベル</CustomLabel>
            <CustomTextBox id="label" value={formState.label} onChange={(event) => onChange({ label: event.target.value })} placeholder="メインカード / サブカード など" displayOnly={displayOnly} />
          </div>
          <div className="space-y-2">
            <CustomLabel htmlFor="memo">メモ</CustomLabel>
            <CustomTextArea id="memo" value={formState.memo} onChange={(event) => onChange({ memo: event.target.value })} placeholder="補足メモ" displayOnly={displayOnly} />
          </div>
          {displayOrderField}
        </div>
      );
    case 'memory-card-edition-masters':
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <CustomLabel htmlFor="name">名称</CustomLabel>
            <CustomTextBox id="name" value={formState.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="メモリーカード59 など" displayOnly={displayOnly} />
          </div>
          <SelectField
            id="blockCount"
            label="ブロック数"
            value={formState.blockCount}
            options={[
              { value: '59', label: '59 ブロック' },
              { value: '251', label: '251 ブロック' },
              { value: '1019', label: '1019 ブロック' },
            ]}
            onChange={(value) => onChange({ blockCount: value })}
            placeholder="選択してください"
            displayOnly={displayOnly}
          />
          {displayOrderField}
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
            displayOnly={displayOnly}
          />
          {derivedSaveStorageType === 0 ? (
            <SelectField
              id="gameSoftwareId"
              label="所持ゲームソフト"
              value={formState.gameSoftwareId}
              options={filteredGameSoftwareOptions}
              onChange={(value) => onChange({ gameSoftwareId: value })}
              placeholder="選択してください"
              displayOnly={displayOnly}
            />
          ) : null}
          <div className="select-none rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            保存方式: {formatSaveStorageType(derivedSaveStorageType)}
          </div>
          {derivedSaveStorageType === 1 ? (
            <SelectField
              id="gameConsoleId"
              label="ゲーム機"
              value={formState.gameConsoleId}
              options={consoleCandidates}
              onChange={(value) => onChange({ gameConsoleId: value })}
              placeholder="選択してください"
              displayOnly={displayOnly}
            />
          ) : null}
          {derivedSaveStorageType === 2 ? (
            <>
              <SelectField
                id="accountId"
                label="アカウント"
                value={formState.accountId}
                options={accountCandidates}
                onChange={(value) => onChange({ accountId: value, gameConsoleId: '' })}
                placeholder="選択してください"
                displayOnly={displayOnly}
              />
              <SelectField
                id="gameConsoleId"
                label="ゲーム機"
                value={formState.gameConsoleId}
                options={linkedConsoleCandidates}
                onChange={(value) => onChange({ gameConsoleId: value })}
                placeholder="選択してください"
                displayOnly={displayOnly}
              />
              {selectedSaveDataAccount && linkedConsoleCandidates.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  選択したアカウントに紐づけられたゲーム機がありません。アカウント管理から紐づけを設定してください。
                </p>
              )}
            </>
          ) : null}
          {derivedSaveStorageType === 3 ? (
            <SelectField
              id="memoryCardId"
              label="メモリーカード"
              value={formState.memoryCardId}
              options={optionize(options.memoryCards, true)}
              onChange={(value) => onChange({ memoryCardId: value })}
              placeholder="選択してください"
              displayOnly={displayOnly}
            />
          ) : null}
          <div className="space-y-2">
            <CustomLabel htmlFor="memo">メモ</CustomLabel>
            <CustomTextArea id="memo" value={formState.memo} onChange={(event) => onChange({ memo: event.target.value })} placeholder="補足メモ" displayOnly={displayOnly} />
          </div>
          {displayOrderField}
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
                displayOnly={displayOnly}
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
              displayOnly={displayOnly}
            />
          ) : null}
          <div className="space-y-3">
            <div className="space-y-1">
              <CustomHeader level={3}>チェック項目</CustomHeader>
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
              displayOnly={displayOnly}
            />
          </div>
        </div>
      );
  }
}
