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
    addRow: "行を追加",
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
} as const;

export default resources;
