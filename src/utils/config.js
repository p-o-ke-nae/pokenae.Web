// アプリケーション設定の一元管理
// 環境変数やデフォルト値を管理するにゃん

// API設定
export const API_CONFIG = {
  // APIのベースURL
    // BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:7077',
    BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://collectionassistancetoolapi-geaca2fwetcsgthk.japanwest-01.azurewebsites.net',
  
  // エンドポイント定義
  ENDPOINTS: {
    COLLECTION_TABLE: '/api/CollectionTable',
    COLLECTION: '/api/Collection',
    RECORD: '/api/Record',
    HEALTH_CHECK: '/api/health'
  },
  
  // リクエスト設定
  DEFAULT_OPTIONS: {
    mode: 'cors',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json'
    }
  },
  
  // タイムアウト設定
  TIMEOUT: 30000 // 30秒
};

// アプリケーション設定
export const APP_CONFIG = {
  NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Pokenae Web',
  VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  USE_MOCK_DATA: process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || API_CONFIG.BASE_URL === 'mock',
  DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development'
};

// UI設定
export const UI_CONFIG = {
  // テーブル設定
  TABLE: {
    DEFAULT_ROWS_PER_PAGE: 15,
    ROWS_PER_PAGE_OPTIONS: [10, 15, 25, 50]
  },
  
  // エクスポート設定
  EXPORT: {
    CSV_FILENAME_FORMAT: (name) => `${name}_${new Date().toISOString().split('T')[0]}.csv`
  }
};

// ヘルパー関数
export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export const buildCollectionUrl = (collectionId) => {
  return buildApiUrl(`${API_CONFIG.ENDPOINTS.COLLECTION}/${collectionId}`);
};

export const buildRecordUrl = (tableId) => {
  return buildApiUrl(`${API_CONFIG.ENDPOINTS.RECORD}/table/${tableId}`);
};

export const buildCollectionTableUrl = (tableId = '') => {
  return buildApiUrl(`${API_CONFIG.ENDPOINTS.COLLECTION_TABLE}${tableId ? `/${tableId}` : ''}`);
};

// デバッグ用ログ出力
if (APP_CONFIG.DEBUG_MODE) {
  console.log('🔧 Config loaded:', {
    API_BASE_URL: API_CONFIG.BASE_URL,
    USE_MOCK_DATA: APP_CONFIG.USE_MOCK_DATA,
    APP_NAME: APP_CONFIG.NAME
  });
}
