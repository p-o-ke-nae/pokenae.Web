type MessageTemplate = {
  title: string;
  detail?: string;
};

export const gameManagementResources = {
  errors: {
    adminRequired: {
      title: '管理者権限が必要です。',
      detail: '必要であれば管理者に依頼してください。',
    },
    listLoad: {
      title: '一覧を読み込めませんでした。',
      detail: '通信状態を確認して、再読み込みしてください。',
    },
    detailLoad: {
      title: '必要な情報を読み込めませんでした。',
      detail: '再読み込みするか、対象を選び直してください。',
    },
    schemaLoad: {
      title: '項目設定を読み込めませんでした。',
      detail: '再読み込みしても解決しない場合は、対象タイトルの設定を確認してください。',
    },
    save: {
      title: '変更を保存できませんでした。',
      detail: '内容を確認してから、もう一度保存してください。',
    },
    delete: {
      title: '削除できませんでした。',
      detail: '最新の状態を確認してから、もう一度お試しください。',
    },
    reorder: {
      title: '表示順を保存できませんでした。',
      detail: '最新の状態を確認してから、もう一度お試しください。',
    },
    bulkUpdate: {
      title: '一括更新を完了できませんでした。',
      detail: '対象の内容を確認してから、もう一度実行してください。',
    },
    accountMove: {
      title: 'アカウントを移行できませんでした。',
      detail: '内容を確認してから、もう一度お試しください。',
    },
    clone: {
      title: '複写処理を完了できませんでした。',
      detail: '対象の内容を確認してから、もう一度実行してください。',
    },
  } as Record<string, MessageTemplate>,
  validation: {
    selectSourceConsole: '移行元のゲーム機を選択してください。',
    selectTargetConsole: '移行先のゲーム機を選択してください。',
    enableBulkField: '一括変更する項目を1つ以上有効にしてください。',
    schemaLoading: '項目設定を読み込み中です。完了後に、もう一度保存してください。',
    inputIncomplete: '入力が完了していない項目があります。必須項目を入力してから、もう一度保存してください。',
  },
  info: {
    accountMove:
      '移行先には、移行元と同一分類または互換関係にあり、かつこのアカウント種類で許可されたゲーム機のみ表示されます。移行すると、このアカウントに紐づくダウンロード版ゲームソフトのインストール先と、セーブデータの本体が自動的に移行先へ更新されます。',
  },
} as const;
