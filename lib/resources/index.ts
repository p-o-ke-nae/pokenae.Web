/**
 * UIコンポーネントで使用するテキストリソース
 * 多言語対応時はこのファイルを言語ごとに分けて切り替えてください。
 */
const resources = {
  common: {
    close: "閉じる",
    loading: "Loading...",
  },
  loader: {
    label: "Loading...",
  },
  loadingOverlay: {
    message: "Loading...",
  },
  dataTable: {
    emptyMessage: "データがありません",
    selectAll: "全て選択",
    selectRow: "行",
    expand: "展開",
    collapse: "折りたたむ",
    filter: "フィルタ",
    filterPlaceholder: "絞り込み",
    filterSelectAll: "すべて",
    filterSelectCount: "件選択",
    filterClearAll: "選択解除",
    addRow: "行を追加",
    resizeColumn: "の列幅を調整",
    autoSizeColumn: "ダブルクリックまたは Enter で列幅を自動調整",
    pageSize: "表示件数",
  },
  searchField: {
    dialogTitle: "検索",
    searchPlaceholder: "絞り込み...",
    noResults: "該当する項目がありません",
    searchButtonLabel: "検索ダイアログを開く",
    clearButtonLabel: "クリア",
    valuePlaceholder: "IDを入力",
    labelPlaceholder: "名称",
    noMatch: "一致なし",
  },
  apiError: {
    /** HTTP ステータスコード別の標準メッセージ */
    status: {
      400: "リクエストの内容に誤りがあります。入力内容を確認してください。",
      401: "認証が必要です。ログインし直してください。",
      403: "この操作を行う権限がありません。",
      404: "指定されたリソースが見つかりません。",
      409: "データが競合しています。最新の状態を確認してください。",
      422: "入力内容に問題があります。",
      429: "リクエストが集中しています。しばらく待ってから再試行してください。",
      500: "サーバーで予期しないエラーが発生しました。",
      502: "サーバーとの通信に失敗しました。",
      503: "サービスが一時的に利用できません。しばらく待ってから再試行してください。",
    } as Record<number, string>,
    /** 操作種別ごとのプレフィックス */
    operation: {
      fetch: "データの取得に失敗しました。",
      create: "データの作成に失敗しました。",
      update: "データの更新に失敗しました。",
      delete: "データの削除に失敗しました。",
    },
    fallback: "エラーが発生しました。",
  },
} as const;

export default resources;
