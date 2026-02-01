/**
 * API設定
 * 複数のAppServiceへのアクセスを管理するための設定
 */

export interface ApiServiceConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export type ApiServiceName = 'service1' | 'service2' | 'service3';

/**
 * 各AppServiceの設定を取得
 */
export function getApiConfig(serviceName: ApiServiceName): ApiServiceConfig {
  const configs: Record<ApiServiceName, ApiServiceConfig> = {
    service1: {
      baseUrl: process.env.API_SERVICE_1_BASE_URL || 'http://localhost:8001',
      apiKey: process.env.API_SERVICE_1_API_KEY,
      timeout: 30000,
    },
    service2: {
      baseUrl: process.env.API_SERVICE_2_BASE_URL || 'http://localhost:8002',
      apiKey: process.env.API_SERVICE_2_API_KEY,
      timeout: 30000,
    },
    service3: {
      baseUrl: process.env.API_SERVICE_3_BASE_URL || 'http://localhost:8003',
      apiKey: process.env.API_SERVICE_3_API_KEY,
      timeout: 30000,
    },
  };

  return configs[serviceName];
}

/**
 * 利用可能なサービス名一覧を取得
 */
export function getAvailableServices(): ApiServiceName[] {
  return ['service1', 'service2', 'service3'];
}
