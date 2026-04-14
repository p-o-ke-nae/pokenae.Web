export const uiResources = {
  common: {
    close: '閉じる',
    loading: 'Loading...',
  },
  loader: {
    label: 'Loading...',
  },
  loadingOverlay: {
    message: 'Loading...',
  },
  dataTable: {
    emptyMessage: 'データがありません',
    selectAll: '全て選択',
    selectRow: '行',
    expand: '展開',
    collapse: '折りたたむ',
    filter: 'フィルタ',
    filterPlaceholder: '絞り込み',
    filterSelectAll: 'すべて',
    filterSelectCount: '件選択',
    filterClearAll: '選択解除',
    addRow: '行を追加',
    resizeColumn: 'の列幅を調整',
    autoSizeColumn: 'ダブルクリックまたは Enter で列幅を自動調整',
    pageSize: '表示件数',
  },
  searchField: {
    dialogTitle: '検索',
    searchPlaceholder: '絞り込み...',
    noResults: '該当する項目がありません',
    searchButtonLabel: '検索ダイアログを開く',
    clearButtonLabel: 'クリア',
    valuePlaceholder: 'IDを入力',
    labelPlaceholder: '名称',
    noMatch: '一致なし',
  },
} as const;
