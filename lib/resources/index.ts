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
} as const;

export default resources;
