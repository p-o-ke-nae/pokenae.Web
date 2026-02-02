/**
 * API設定
 * 複数のAppServiceへのアクセスを管理するための設定
 */

import { getApiBaseUrl } from './env';

export interface ApiServiceConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export type ApiServiceName = 'service1' | 'service2' | 'service3' | 'user-api';

/**
 * 各AppServiceの設定を取得
 * 
 * この関数はサーバーサイド（API Routes）で使用されることを想定しています。
 * クライアントサイドで直接使用しないでください。
 */
export function getApiConfig(serviceName: ApiServiceName): ApiServiceConfig {
  // 環境変数から取得したベースURLを使用
  const apiBaseUrl = getApiBaseUrl();
  
  const configs: Record<ApiServiceName, ApiServiceConfig> = {
    service1: {
      baseUrl: process.env.API_SERVICE_1_BASE_URL || `${apiBaseUrl}/service1`,
      apiKey: process.env.API_SERVICE_1_API_KEY,
      timeout: 30000,
    },
    service2: {
      baseUrl: process.env.API_SERVICE_2_BASE_URL || `${apiBaseUrl}/service2`,
      apiKey: process.env.API_SERVICE_2_API_KEY,
      timeout: 30000,
    },
    service3: {
      baseUrl: process.env.API_SERVICE_3_BASE_URL || `${apiBaseUrl}/service3`,
      apiKey: process.env.API_SERVICE_3_API_KEY,
      timeout: 30000,
    },
    'user-api': {
      baseUrl: process.env.USER_API_BASE_URL || apiBaseUrl,
      timeout: 30000,
    },
  };

  return configs[serviceName];
}

/**
 * 利用可能なサービス名一覧を取得
 */
export function getAvailableServices(): ApiServiceName[] {
  return ['service1', 'service2', 'service3', 'user-api'];
}
