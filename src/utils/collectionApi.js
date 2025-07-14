// CollectionAssistanceTool API Client
import { demoData } from './demoData.js';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:7077';
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || API_BASE_URL === 'mock';

// モックデータ応答用のヘルパー関数
const mockResponse = (data, delay = 100) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

// モックリクエストハンドラー
const handleMockRequest = async (endpoint, options = {}) => {
  const method = options.method || 'GET';
  
  // コレクション一覧取得
  if (endpoint === '/api/Collection' && method === 'GET') {
    return mockResponse(demoData.collections);
  }
  
  // 特定のコレクション取得
  const collectionMatch = endpoint.match(/^\/api\/Collection\/(.+)$/);
  if (collectionMatch && method === 'GET') {
    const collectionId = collectionMatch[1];
    const collection = demoData.collections.find(c => c.id === collectionId);
    if (collection) {
      return mockResponse(collection);
    } else {
      throw new Error('Collection not found');
    }
  }
  
  // レコード取得（コレクション内のアイテム）
  const recordsMatch = endpoint.match(/^\/api\/Record\/table\/(.+)$/);
  if (recordsMatch && method === 'GET') {
    const tableId = recordsMatch[1];
    const items = demoData.collectionItems[tableId] || [];
    return mockResponse(items);
  }
  
  // その他のエンドポイントはモックデータなしでエラー
  console.warn('Mock data not available for:', endpoint);
  return mockResponse({ message: 'Mock endpoint not implemented' });
};

// 簡単なリクエストキャッシュ（開発時のデバッグ用）
const requestCache = new Map();
const CACHE_DURATION = 5000; // 5秒間キャッシュ

// APIリクエストのベース関数
const apiRequest = async (endpoint, options = {}) => {
  // モックモードの場合は、実際のAPIを呼ばずにモックデータを返す
  if (USE_MOCK_DATA) {
    console.log('Using mock data for:', endpoint);
    return handleMockRequest(endpoint, options);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const requestMethod = options.method || 'GET';
  const cacheKey = `${requestMethod}:${url}`;
  
  // キャッシュチェック（GETリクエストのみ）
  if (requestMethod === 'GET') {
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Using cached response for:', url);
      return cached.data;
    }
  }
  
  const defaultOptions = {
    method: 'GET', // デフォルトはGETメソッド（明示的に指定）
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // CORSのためのヘッダー追加
      'Access-Control-Allow-Origin': '*',
    },
    // 開発環境でのSSL証明書チェックを無効化（Node.js環境）
    mode: 'cors',
    credentials: 'omit', // 認証情報は送信しない
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  console.log('API Request:', { url, config });

  try {
    const response = await fetch(url, config);
    
    console.log('API Response:', {
      url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      ok: response.ok
    });
    
    if (!response.ok) {
      // レスポンスの詳細情報を取得
      let errorDetails = '';
      try {
        const errorText = await response.text();
        errorDetails = errorText;
        console.error('API Error Response Body:', errorText);
      } catch (textError) {
        console.error('Failed to read error response:', textError);
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorDetails ? ' - ' + errorDetails : ''}`);
    }
    
    const data = await response.json();
    console.log('API Response Data:', data);
    
    // 成功したGETリクエストをキャッシュに保存（デフォルトもGET）
    if (config.method === 'GET') {
      requestCache.set(cacheKey, { data, timestamp: Date.now() });
    }
    
    return data;
  } catch (error) {
    // エラーの詳細分析
    const errorInfo = {
      url,
      endpoint,
      error: error.message,
      stack: error.stack,
      name: error.name,
      options: config
    };

    // 具体的なエラーパターンの判定
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('Fetch API Error - ネットワーク接続またはCORSの問題:', errorInfo);
      if (error.message.includes('Failed to fetch')) {
        console.warn('CORS または SSL証明書の問題の可能性があります。APIサーバーの設定を確認してください。');
      }
    } else if (error.message.includes('certificate') || error.message.includes('SSL') || error.message.includes('TLS')) {
      console.error('SSL Certificate Error:', errorInfo);
      console.warn('開発環境の場合、APIサーバーでHTTPS証明書の設定を確認してください。');
    } else if (error.message.includes('CORS')) {
      console.error('CORS Error:', errorInfo);
      console.warn('APIサーバーでCORSの設定を確認してください。');
    } else {
      console.error('API Request failed:', errorInfo);
    }
    
    throw error;
  }
};

// コレクション関連のAPI関数
export const collectionApi = {
  // コレクションテーブル一覧取得（実際のエンドポイントは要確認）
  getCollections: async () => {
    return await apiRequest('/api/CollectionTable', { method: 'GET' });
  },

  // コレクションテーブル詳細取得
  getCollectionById: async (tableId) => {
    return await apiRequest(`/api/CollectionTable/${tableId}`, { method: 'GET' });
  },

  // レコード一覧取得
  getRecords: async (tableId) => {
    return await apiRequest(`/api/Record/table/${tableId}`, { method: 'GET' });
  },

  // カラム情報取得
  getColumns: async (tableId) => {
    return await apiRequest(`/api/CollectionTable/${tableId}/columns`, { method: 'GET' });
  },

  // コレクション新規作成
  createCollection: async (collectionData) => {
    return await apiRequest('/api/CollectionTable', {
      method: 'POST',
      body: JSON.stringify(collectionData),
    });
  },

  // コレクション更新
  updateCollection: async (tableId, collectionData) => {
    return await apiRequest(`/api/CollectionTable/${tableId}`, {
      method: 'PUT',
      body: JSON.stringify(collectionData),
    });
  },

  // コレクション削除
  deleteCollection: async (tableId) => {
    return await apiRequest(`/api/CollectionTable/${tableId}`, {
      method: 'DELETE',
    });
  },

  // レコード新規作成
  createRecord: async (tableId, recordData) => {
    return await apiRequest(`/api/Record/table/${tableId}`, {
      method: 'POST',
      body: JSON.stringify(recordData),
    });
  },

  // レコード更新
  updateRecord: async (recordId, recordData) => {
    return await apiRequest(`/api/Record/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(recordData),
    });
  },

  // レコード削除
  deleteRecord: async (recordId) => {
    return await apiRequest(`/api/Record/${recordId}`, {
      method: 'DELETE',
    });
  },
};

// エラーハンドリング用のヘルパー関数
export const handleApiError = (error, showError) => {
  let errorMessage = 'APIエラーが発生しました';
  
  if (error.message.includes('404')) {
    errorMessage = 'データが見つかりませんでした';
  } else if (error.message.includes('403')) {
    errorMessage = 'アクセス権限がありません';
  } else if (error.message.includes('500')) {
    errorMessage = 'サーバーエラーが発生しました';
  } else if (error.message.includes('Network')) {
    errorMessage = 'ネットワークエラーが発生しました';
  } else if (error.message.includes('CORS')) {
    errorMessage = 'CORS設定エラーが発生しました。APIサーバーの設定を確認してください。';
  }
  
  if (showError) {
    showError(errorMessage);
  }
  
  return errorMessage;
};

// 個別関数としてもエクスポート（互換性のため）
export const getCollections = collectionApi.getCollections;
export const getCollectionById = collectionApi.getCollectionById;
export const getRecords = collectionApi.getRecords;
export const getColumns = collectionApi.getColumns;
export const createCollection = collectionApi.createCollection;
export const updateCollection = collectionApi.updateCollection;
export const deleteCollection = collectionApi.deleteCollection;
export const createRecord = collectionApi.createRecord;
export const updateRecord = collectionApi.updateRecord;
export const deleteRecord = collectionApi.deleteRecord;
