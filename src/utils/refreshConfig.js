// 自動更新設定の一元管理
export const REFRESH_CONFIG = {
  // デフォルト設定
  DEFAULT_INTERVAL_MS: 5000, // 5秒
  DEFAULT_ENABLED: true,
  
  // 利用可能な更新間隔（ミリ秒）
  AVAILABLE_INTERVALS: [
    { value: 5000, label: '5秒', description: '高頻度更新（テスト用）' },
    { value: 10000, label: '10秒', description: '高頻度更新' },
    { value: 30000, label: '30秒', description: '標準' },
    { value: 60000, label: '1分', description: '低頻度更新' },
    { value: 300000, label: '5分', description: '省電力' },
    { value: 600000, label: '10分', description: '最低頻度' }
  ],
  
  // ページ別設定（必要に応じて個別設定可能）
  PAGE_SETTINGS: {
    'CollectionDetail': {
      defaultInterval: 30000, // 30秒に変更（APIサーバー負荷軽減）
      enabled: false, // 一時的に自動更新を無効化（デバッグ用）
      minInterval: 5000, // 最小間隔（5秒未満は設定不可）
      maxInterval: 600000 // 最大間隔（10分超過は設定不可）
    },
    'DashBoard': {
      defaultInterval: 60000,
      enabled: true,
      minInterval: 10000,
      maxInterval: 300000
    }
  },
  
  // システム設定
  SYSTEM: {
    // ロード中や保存中は自動更新を停止
    PAUSE_DURING_LOADING: true,
    PAUSE_DURING_SAVING: true,
    
    // エラー発生時の動作
    PAUSE_ON_ERROR: false,
    RETRY_FAILED_REQUESTS: true,
    MAX_RETRY_COUNT: 3,
    
    // デバッグ設定
    ENABLE_CONSOLE_LOGS: true,
    LOG_REFRESH_ACTIVITY: true
  }
};

// 設定取得用ヘルパー関数
export const getRefreshConfig = (pageName = 'CollectionDetail') => {
  const pageConfig = REFRESH_CONFIG.PAGE_SETTINGS[pageName];
  
  return {
    defaultInterval: pageConfig?.defaultInterval || REFRESH_CONFIG.DEFAULT_INTERVAL_MS,
    defaultEnabled: pageConfig?.enabled !== undefined ? pageConfig.enabled : REFRESH_CONFIG.DEFAULT_ENABLED,
    availableIntervals: REFRESH_CONFIG.AVAILABLE_INTERVALS,
    minInterval: pageConfig?.minInterval || 5000,
    maxInterval: pageConfig?.maxInterval || 600000,
    systemSettings: REFRESH_CONFIG.SYSTEM
  };
};

// ローカルストレージキー
export const STORAGE_KEYS = {
  REFRESH_INTERVAL: 'pokenae_refresh_interval',
  REFRESH_ENABLED: 'pokenae_refresh_enabled',
  USER_PREFERENCES: 'pokenae_user_preferences'
};

// ユーザー設定の保存・読み込み
export const UserPreferences = {
  save: (key, value) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn('Failed to save user preference:', error);
    }
  },
  
  load: (key, defaultValue = null) => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
      }
    } catch (error) {
      console.warn('Failed to load user preference:', error);
    }
    return defaultValue;
  },
  
  remove: (key) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Failed to remove user preference:', error);
    }
  }
};

// 設定検証用ヘルパー
export const validateRefreshInterval = (interval, pageName = 'CollectionDetail') => {
  const config = getRefreshConfig(pageName);
  
  if (interval < config.minInterval) {
    console.warn(`Refresh interval ${interval}ms is below minimum ${config.minInterval}ms`);
    return config.minInterval;
  }
  
  if (interval > config.maxInterval) {
    console.warn(`Refresh interval ${interval}ms is above maximum ${config.maxInterval}ms`);
    return config.maxInterval;
  }
  
  return interval;
};
