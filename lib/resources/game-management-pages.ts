export type SupportedLocale = 'ja';

type DashboardCardText = {
  href: string;
  shortLabel: string;
  title: string;
  description: string;
  actionLabel: string;
};

export type GameManagementDashboardTexts = {
  sectionLabel: string;
  sectionTitle: string;
  sectionDescription: string;
  extraCards: DashboardCardText[];
};

export type SaveDataSchemaManagerTexts = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
  };
  common: {
    actionsColumn: string;
    close: string;
    cancel: string;
    save: string;
    update: string;
    edit: string;
    detail: string;
    delete: string;
    clone: string;
    loadingPage: string;
    selectPrompt: string;
    sharedChoiceSetBadge: string;
  };
  columns: {
    id: string;
    fieldKey: string;
    label: string;
    fieldType: string;
    status: string;
    displayOrder: string;
    required: string;
    baseLabel: string;
    overrideLabel: string;
    disabled: string;
    optionKey: string;
  };
  statuses: {
    required: string;
    optional: string;
    deleted: string;
    active: string;
    inherit: string;
    inheritRequired: string;
    inheritOptional: string;
    overrideRequired: string;
    overrideOptional: string;
    disabled: string;
    overrideExists: string;
    baseOnly: string;
  };
  buttons: {
    addGlobalDefinition: string;
    assignSelectedSchemas: string;
    definitionDetail: string;
    definitionEdit: string;
    assign: string;
    assignmentSettings: string;
    manageOptions: string;
    updateAssignmentSettings: string;
    bulkChangeType: string;
    startDefinitionReorder: string;
    saveDefinitionReorder: string;
    startOptionReorder: string;
    saveOptionReorder: string;
    addOption: string;
    createOverride: string;
    enableEdit: string;
    backToReadonly: string;
    createAndContinue: string;
    createAndClose: string;
    executeAssign: string;
  };
  form: {
    targetGameSoftwareCategoryLabel: string;
    gameSoftwareCategoryLabel: string;
    optionTargetLabel: string;
    gameSoftwareMasterLabel: string;
    assignmentTargetLabel: string;
    assignmentRequiredLabel: string;
    assignmentDisplayOrderLabel: string;
    fieldKeyLabel: string;
    definitionLabelLabel: string;
    definitionDescriptionLabel: string;
    definitionTypeLabel: string;
    sharedChoiceSetLabel: string;
    optionKeyLabel: string;
    optionLabelLabel: string;
    optionDescriptionLabel: string;
    optionDisplayOrderEditLabel: string;
    optionDisplayOrderCreateLabel: string;
    bulkDefinitionTypeLabel: string;
    overrideLabelLabel: string;
    overrideDescriptionLabel: string;
    overrideRequiredLabel: string;
    overrideDisableLabel: string;
    overrideBaseLabel: string;
    overrideFieldKeyLabel: string;
    overrideTypeLabel: string;
  };
  placeholders: {
    assignmentDisplayOrderMulti: string;
    assignmentDisplayOrderSingle: string;
    optionDisplayOrderEdit: string;
    optionDisplayOrderCreate: string;
  };
  options: {
    overrideRequiredInherit: string;
    overrideRequiredTrue: string;
    overrideRequiredFalse: string;
  };
  sections: {
    catalog: {
      title: string;
      description: string;
      selectionSummary: string;
      emptyMessage: string;
    };
    assignedDefinitions: {
      title: string;
      description: string;
      selectionSummary: string;
      emptyMessage: string;
      reorderSelectionHelp: string;
    };
    options: {
      title: string;
      description: string;
      selectionSummary: string;
      emptyMessage: string;
      sharedChoiceSetInfo: string;
      selectSingleSelectInfo: string;
    };
    overrides: {
      title: string;
      description: string;
      emptyMessage: string;
      missingGameSoftwareCategoryInfo: string;
    };
    resolvedSchema: {
      title: string;
      description: string;
      emptyMessage: string;
    };
  };
  dialogs: {
    assignment: {
      updateTitle: string;
      createTitle: string;
      unassignTitle: string;
      updateSummary: string;
      createSummary: string;
      unassignSummary: string;
      autoAppendHint: string;
      updateHint: string;
      settingsTargetHint: string;
      unassignHint: string;
      preserveRequiredHint: string;
      pendingHint: string;
      submitUpdate: string;
      submitCreate: string;
      submitUnassign: string;
    };
    definition: {
      viewTitle: string;
      editTitle: string;
      cloneTitle: string;
      createTitle: string;
      cloneSourceSummary: string;
      duplicateFieldKeyHint: string;
      cloneOptionsHint: string;
      assignmentNoticeLine1: string;
      assignmentNoticeLine2: string;
    };
    option: {
      viewTitle: string;
      editTitle: string;
      createTitle: string;
    };
    bulkType: {
      title: string;
      targetCount: string;
      descriptionLine1: string;
      descriptionLine2: string;
    };
    override: {
      editTitle: string;
      targetTitle: string;
      targetDetailTitle: string;
    };
  };
  messages: {
    displayOrderRequired: string;
    displayOrderInvalid: string;
    duplicateFieldKey: string;
    duplicateDisplayOrder: string;
    gameSoftwareCategoryRequired: string;
    assignmentAlreadyExists: string;
    assignmentApiUnavailable: string;
    selectCatalogToAssign: string;
    definitionRequiredFields: string;
    noSchemaToAssign: string;
    selectDefinitionForBulkType: string;
    selectDefinitionForOption: string;
    optionRequiredFields: string;
    selectOverrideTarget: string;
    selectAssignmentSettingsTarget: string;
    deleteDefinitionConfirm: string;
    deleteOptionConfirm: string;
    deleteOverrideConfirm: string;
    saveDefinitionLoading: string;
    cloneDefinitionLoading: string;
    cloneRollbackFailed: string;
    cloneRollbackSucceeded: string;
    deleteDefinitionLoading: string;
    assignLoading: string;
    deleteAssignmentLoading: string;
    bulkChangeTypeLoading: string;
    saveOptionLoading: string;
    deleteOptionLoading: string;
    saveDefinitionReorderLoading: string;
    saveOptionReorderLoading: string;
    saveOverrideLoading: string;
    deleteOverrideLoading: string;
    createDefinitionContinueSuccess: string;
    updateDefinitionSuccess: string;
    cloneDefinitionWithOptionsSuccess: string;
    cloneDefinitionSuccess: string;
    createDefinitionSuccess: string;
    deleteDefinitionSuccess: string;
    updateAssignmentSuccess: string;
    createAssignmentSuccess: string;
    assignmentPartialFailure: string;
    deleteAssignmentSuccess: string;
    assignmentDeletePartialFailure: string;
    bulkChangeTypeSuccess: string;
    createOptionContinueSuccess: string;
    updateOptionSuccess: string;
    createOptionSuccess: string;
    deleteOptionSuccess: string;
    saveDefinitionReorderSuccess: string;
    saveOptionReorderSuccess: string;
    updateOverrideSuccess: string;
    createOverrideSuccess: string;
    deleteOverrideSuccess: string;
  };
};

const jaDashboardTexts: GameManagementDashboardTexts = {
  sectionLabel: '',
  sectionTitle: 'マスタ管理',
  sectionDescription: 'ゲーム機カテゴリ、ゲーム機マスタ、エディションマスタ、ソフト分類、ソフトマスタの管理を行います。この操作には管理者権限が必要です。',
  extraCards: [
    {
      href: '/game-management/compatibility',
      shortLabel: '互換設定',
      title: 'ゲーム機カテゴリ互換設定',
      description: 'ゲーム機分類間の互換性（片方向）を設定します。例: Switch2 が Switch のソフトを受け入れる関係を定義します。',
      actionLabel: '互換設定を開く',
    },
    {
      href: '/game-management/save-data-schema',
      shortLabel: 'スキーマ',
      title: 'セーブデータスキーマ管理',
      description: 'セーブデータスキーマ定義、候補値、作品別設定をまとめて管理します。',
      actionLabel: 'スキーマ管理を開く',
    },
    {
      href: '/game-management/choice-sets',
      shortLabel: '選択肢セット',
      title: '共有選択肢セット管理',
      description: '複数の単一選択項目で共有できる候補値セットを管理します。',
      actionLabel: '選択肢セット管理を開く',
    },
    {
      href: '/game-management/story-progress',
      shortLabel: '進行度',
      title: 'ストーリー進行度管理',
      description: '進行度定義と作品別設定を管理します。',
      actionLabel: '進行度管理を開く',
    },
  ],
};

const jaSaveDataSchemaTexts: SaveDataSchemaManagerTexts = {
  hero: {
    eyebrow: '',
    title: 'セーブデータスキーマ管理',
    description: 'セーブデータスキーマの項目定義、候補値、作品別設定を管理し、セーブデータ入力時に表示される最終的な項目構成も同じ画面で確認できます。共有選択肢セットの管理は専用画面で行います。',
  },
  common: {
    actionsColumn: '操作',
    close: '閉じる',
    cancel: 'キャンセル',
    save: '保存',
    update: '更新',
    edit: '編集',
    detail: '詳細',
    delete: '削除',
    clone: '複写',
    loadingPage: '管理画面を読み込んでいます...',
    selectPrompt: '選択してください',
    sharedChoiceSetBadge: ' [共有: {label}]',
  },
  columns: {
    id: 'ID',
    fieldKey: '項目キー',
    label: '表示名',
    fieldType: '型',
    status: '状態',
    displayOrder: '順序',
    required: '必須',
    baseLabel: '基本の表示名',
    overrideLabel: '上書きする表示名',
    disabled: '無効化',
    optionKey: '候補キー',
  },
  statuses: {
    required: '必須',
    optional: '任意',
    deleted: '削除済み',
    active: '有効',
    inherit: '継承',
    inheritRequired: '継承: 必須',
    inheritOptional: '継承: 任意',
    overrideRequired: '作品別: 必須',
    overrideOptional: '作品別: 任意',
    disabled: '無効',
    overrideExists: '作品別設定あり',
    baseOnly: '基本定義のみ',
  },
  buttons: {
    addGlobalDefinition: 'グローバル定義を追加',
    assignSelectedSchemas: '選択したスキーマを採用',
    definitionDetail: '詳細',
    definitionEdit: '編集',
    assign: '採用',
    assignmentSettings: '採用設定',
    manageOptions: '候補値',
    updateAssignmentSettings: '選択項目の採用設定',
    bulkChangeType: '型を一括変更',
    startDefinitionReorder: '表示順の変更',
    saveDefinitionReorder: '表示順を保存',
    startOptionReorder: '表示順の変更',
    saveOptionReorder: '表示順を保存',
    addOption: '候補値を追加',
    createOverride: '作品別設定を作成',
    enableEdit: '編集を有効化',
    backToReadonly: '読み取り専用に戻す',
    createAndContinue: '作成して続ける',
    createAndClose: '作成して閉じる',
    executeAssign: '採用を実行',
  },
  form: {
    targetGameSoftwareCategoryLabel: '採用先のゲームソフト分類',
    gameSoftwareCategoryLabel: 'ゲームソフト分類',
    optionTargetLabel: '候補値を管理する項目',
    gameSoftwareMasterLabel: 'ゲームソフトマスタ',
    assignmentTargetLabel: '採用対象',
    assignmentRequiredLabel: '採用先では必須項目として扱う',
    assignmentDisplayOrderLabel: '表示順（任意）',
    fieldKeyLabel: '項目キー',
    definitionLabelLabel: '表示名',
    definitionDescriptionLabel: '説明',
    definitionTypeLabel: '型',
    sharedChoiceSetLabel: '共有選択肢セット（任意）',
    optionKeyLabel: '候補キー',
    optionLabelLabel: '表示名',
    optionDescriptionLabel: '説明',
    optionDisplayOrderEditLabel: '表示順',
    optionDisplayOrderCreateLabel: '表示順（任意）',
    bulkDefinitionTypeLabel: '変更後の型',
    overrideLabelLabel: '上書きする表示名',
    overrideDescriptionLabel: '上書きする説明',
    overrideRequiredLabel: '必須指定',
    overrideDisableLabel: 'この作品では項目を無効化する',
    overrideBaseLabel: '基本の表示名',
    overrideFieldKeyLabel: '項目キー',
    overrideTypeLabel: '型',
  },
  placeholders: {
    assignmentDisplayOrderMulti: '複数選択時は未入力で末尾追加',
    assignmentDisplayOrderSingle: '未入力で末尾に追加',
    optionDisplayOrderEdit: '1',
    optionDisplayOrderCreate: '未入力で末尾に追加',
  },
  options: {
    overrideRequiredInherit: '継承',
    overrideRequiredTrue: '必須にする',
    overrideRequiredFalse: '任意にする',
  },
  sections: {
    catalog: {
      title: 'スキーマカタログ',
      description: 'すべてのゲームソフト分類で共通に使えるグローバル定義の一覧です。ここでは項目定義だけを作成・編集し、ゲームソフト分類への採用先は採用ダイアログで選択します。',
      selectionSummary: '採用対象として選択中: {count} 件',
      emptyMessage: 'スキーマカタログがありません。',
    },
    assignedDefinitions: {
      title: '採用項目',
      description: 'ゲームソフト分類ごとに採用している項目定義です。表示順と必須設定は、ゲームソフト分類ごとの採用設定で管理します。',
      selectionSummary: '選択中: {count} 件',
      emptyMessage: '採用項目がありません。',
      reorderSelectionHelp: 'Shift+クリックで範囲選択、表示順変更中は上下移動でまとめて並び替え',
    },
    options: {
      title: '候補値',
      description: '単一選択の採用項目を選んだときだけ候補値の管理を表示します。共有選択肢セットを使う項目では、候補値はセット側で管理します。',
      selectionSummary: '選択中: {count} 件',
      emptyMessage: '候補値がありません。',
      sharedChoiceSetInfo: 'この項目定義は共有選択肢セットを使用しています。候補値は「共有選択肢セット管理」画面で管理してください。',
      selectSingleSelectInfo: '単一選択の採用項目を選択すると候補値の管理を表示します。',
    },
    overrides: {
      title: '作品別設定',
      description: 'ゲームソフトマスタ単位で表示名、説明、必須、無効化を上書きできます。表示順は基本定義を引き継ぎます。',
      emptyMessage: '作品別設定の対象項目がありません。',
      missingGameSoftwareCategoryInfo: 'このゲームソフトマスタにはゲームソフト分類が未設定のため、作品別設定の対象項目がありません。',
    },
    resolvedSchema: {
      title: '最終結果プレビュー',
      description: '作品別設定を反映した、セーブデータ入力時の最終的な項目構成を表示します。',
      emptyMessage: '表示できる項目がありません。',
    },
  },
  dialogs: {
    assignment: {
      updateTitle: '採用設定を更新',
      createTitle: 'スキーマをゲームソフト分類へ採用',
      unassignTitle: 'スキーマの採用を解除',
      updateSummary: '選択したスキーマ {schemaCount} 件の採用設定を、ゲームソフト分類 {contentGroupCount} 件で更新します。',
      createSummary: '選択したスキーマ {schemaCount} 件を、ゲームソフト分類 {contentGroupCount} 件へ採用します。',
      unassignSummary: '選択したスキーマ {schemaCount} 件を、現在のゲームソフト分類から採用解除します。',
      autoAppendHint: 'この画面では必須設定のみを更新します。表示順の変更は「採用項目」一覧で並び替えてから「表示順を保存」を実行してください。',
      updateHint: '既存項目の表示順はここでは変更しません。並び順を変える場合は一覧の並び替え操作を使用してください。',
      settingsTargetHint: '採用設定の変更対象は、現在選択中のゲームソフト分類のみです。チェックを外すと採用解除になります。',
      unassignHint: 'ゲームソフト分類の選択をすべて外した状態で保存すると、現在のゲームソフト分類から採用解除します。',
      preserveRequiredHint: '複数選択した項目で必須設定が混在しているため、未変更のまま保存すると各項目の現在値を維持します。',
      pendingHint: '保存中はダイアログを閉じられません。',
      submitUpdate: '更新',
      submitCreate: '採用を実行',
      submitUnassign: '採用解除',
    },
    definition: {
      viewTitle: 'グローバル定義の詳細',
      editTitle: 'グローバル定義を編集',
      cloneTitle: 'グローバル定義を複写',
      createTitle: 'グローバル定義を追加',
      cloneSourceSummary: '複写元: {label} ({fieldKey})',
      duplicateFieldKeyHint: '項目キーは重複したまま保存できないため、必要に応じて変更してください。',
      cloneOptionsHint: '型を単一選択のまま保存した場合は、候補値も複写します。',
      assignmentNoticeLine1: '表示順と必須設定は、項目定義ではなくゲームソフト分類ごとの採用設定で管理します。',
      assignmentNoticeLine2: 'この画面ではグローバル定義のみを作成・編集します。採用後の並び順や必須設定は「採用項目」一覧の「採用設定」から更新してください。',
    },
    option: {
      viewTitle: '候補値の詳細',
      editTitle: '候補値を編集',
      createTitle: '候補値を追加',
    },
    bulkType: {
      title: '項目定義の型を一括変更',
      targetCount: '対象件数: {count} 件',
      descriptionLine1: '選択した項目定義の型のみをまとめて更新します。項目キー、表示名、必須設定、表示順は維持されます。',
      descriptionLine2: '一括編集で変更できるのは「型」と、型が単一選択の場合の「共有選択肢セット」のみです。その他の項目は個別編集で変更してください。',
    },
    override: {
      editTitle: '作品別設定を編集',
      targetTitle: '{label} の作品別設定',
      targetDetailTitle: '{label} の作品別設定（詳細）',
    },
  },
  messages: {
    displayOrderRequired: '表示順を入力してください。',
    displayOrderInvalid: '表示順は1以上の整数で入力してください。',
    duplicateFieldKey: '項目キーが重複しています。セーブデータスキーマ全体で一意になるよう、別の項目キーを入力してください。',
    duplicateDisplayOrder: '表示順が重複しています。選択中のゲームソフト分類で重複しない表示順にしてください。',
    gameSoftwareCategoryRequired: 'ゲームソフト分類を選択してください。',
    assignmentAlreadyExists: '次のゲームソフト分類では既に採用済みのスキーマが含まれています: {gameSoftwareCategories}。採用設定の更新は「採用項目」一覧から行ってください。',
    assignmentApiUnavailable: '採用設定を更新できませんでした。サーバー側が採用設定の更新・解除に対応しているか確認してください。',
    selectCatalogToAssign: '採用するスキーマカタログを選択してください。',
    definitionRequiredFields: '項目キーと表示名は必須です。',
    noSchemaToAssign: '採用するスキーマがありません。',
    selectDefinitionForBulkType: '型を一括変更する項目定義を選択してください。',
    selectDefinitionForOption: '候補値を紐付ける項目定義を選択してください。',
    optionRequiredFields: '候補キーと表示名は必須です。',
    selectOverrideTarget: '作品別設定の対象を選択してください。',
    selectAssignmentSettingsTarget: '採用設定を変更する項目定義を選択してください。',
    deleteDefinitionConfirm: '項目定義 {label} を削除しますか。関連する採用設定も無効化されます。',
    deleteOptionConfirm: '候補値 {label} を削除しますか。',
    deleteOverrideConfirm: '{label} の作品別設定を削除しますか。',
    saveDefinitionLoading: '項目定義を保存中...',
    cloneDefinitionLoading: '項目定義を複写中...',
    cloneRollbackFailed: '{baseMessage} ロールバックにも失敗しました: {rollbackFailures}',
    cloneRollbackSucceeded: '{baseMessage} 作成した項目定義はロールバックしました。',
    deleteDefinitionLoading: '項目定義を削除中...',
    assignLoading: 'スキーマをゲームソフト分類へ採用中...',
    deleteAssignmentLoading: 'スキーマの採用を解除中...',
    bulkChangeTypeLoading: '項目定義の型を一括更新中...',
    saveOptionLoading: '候補値を保存中...',
    deleteOptionLoading: '候補値を削除中...',
    saveDefinitionReorderLoading: '項目定義の表示順を保存中...',
    saveOptionReorderLoading: '候補値の表示順を保存中...',
    saveOverrideLoading: '作品別設定を保存中...',
    deleteOverrideLoading: '作品別設定を削除中...',
    createDefinitionContinueSuccess: 'グローバル定義を作成しました。続けて入力できます。',
    updateDefinitionSuccess: 'グローバル定義を更新しました。',
    cloneDefinitionWithOptionsSuccess: 'グローバル定義と候補値を複写しました。',
    cloneDefinitionSuccess: 'グローバル定義を複写しました。',
    createDefinitionSuccess: 'グローバル定義を作成しました。ゲームソフト分類へ反映するにはスキーマカタログから採用してください。',
    deleteDefinitionSuccess: '項目定義を削除しました。',
    updateAssignmentSuccess: 'ゲームソフト分類 {contentGroupCount} 件に対する採用設定更新を完了しました。成功 {updatedCount} 件、失敗 {failedCount} 件です。',
    createAssignmentSuccess: 'ゲームソフト分類 {contentGroupCount} 件に対する採用処理を完了しました。追加 {addedCount} 件、スキップ {skippedCount} 件です。',
    assignmentPartialFailure: '{reason} 失敗したゲームソフト分類: {failedContentGroups}',
    deleteAssignmentSuccess: 'スキーマ {schemaCount} 件の採用を解除しました。',
    assignmentDeletePartialFailure: '{reason} 採用解除に失敗したスキーマ: {failedSchemas}',
    bulkChangeTypeSuccess: '項目定義 {count} 件の型を更新しました。',
    createOptionContinueSuccess: '候補値を作成しました。続けて入力できます。',
    updateOptionSuccess: '候補値を更新しました。',
    createOptionSuccess: '候補値を作成しました。',
    deleteOptionSuccess: '候補値を削除しました。',
    saveDefinitionReorderSuccess: '項目定義の表示順を保存しました。',
    saveOptionReorderSuccess: '候補値の表示順を保存しました。',
    updateOverrideSuccess: '作品別設定を更新しました。',
    createOverrideSuccess: '作品別設定を作成しました。',
    deleteOverrideSuccess: '作品別設定を削除しました。',
  },
};

export function getGameManagementDashboardTexts(locale: SupportedLocale = 'ja'): GameManagementDashboardTexts {
  switch (locale) {
    case 'ja':
    default:
      return jaDashboardTexts;
  }
}

export function getSaveDataSchemaManagerTexts(locale: SupportedLocale = 'ja'): SaveDataSchemaManagerTexts {
  switch (locale) {
    case 'ja':
    default:
      return jaSaveDataSchemaTexts;
  }
}
