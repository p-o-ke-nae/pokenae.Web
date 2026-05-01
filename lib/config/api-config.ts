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

export type ApiServiceName = 'user-api' | 'service1' | 'service2' | 'service3' | (string & {});

export const BACKEND_API_DEFAULT_TIMEOUT_MS = 60000;

const BUILTIN_SERVICE_CONFIG: Record<string, { baseUrlEnv: string; apiKeyEnv?: string; defaultPath?: string }> = {
  service1: {
    baseUrlEnv: 'API_SERVICE_1_BASE_URL',
    apiKeyEnv: 'API_SERVICE_1_API_KEY',
    defaultPath: '/service1',
  },
  service2: {
    baseUrlEnv: 'API_SERVICE_2_BASE_URL',
    apiKeyEnv: 'API_SERVICE_2_API_KEY',
    defaultPath: '/service2',
  },
  service3: {
    baseUrlEnv: 'API_SERVICE_3_BASE_URL',
    apiKeyEnv: 'API_SERVICE_3_API_KEY',
    defaultPath: '/service3',
  },
  'user-api': {
    baseUrlEnv: 'USER_API_BASE_URL',
    apiKeyEnv: 'USER_API_API_KEY',
    defaultPath: '',
  },
};

function joinBaseUrl(baseUrl: string, path: string): string {
  const trimmedBaseUrl = baseUrl.replace(/\/$/, '');
  if (!path) {
    return trimmedBaseUrl;
  }

  return `${trimmedBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function normalizeServiceNameForEnv(serviceName: string): string {
  return serviceName
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();
}

function getAdditionalServices(): string[] {
  const raw = process.env.API_SERVICES;
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((serviceName) => serviceName.trim())
    .filter(Boolean);
}

/**
 * 各AppServiceの設定を取得
 * 
 * この関数はサーバーサイド（API Routes）で使用されることを想定しています。
 * クライアントサイドで直接使用しないでください。
 */
export function getApiConfig(serviceName: ApiServiceName): ApiServiceConfig {
  // 環境変数から取得したベースURLを使用
  const apiBaseUrl = getApiBaseUrl();

  const builtinConfig = BUILTIN_SERVICE_CONFIG[serviceName];
  if (builtinConfig) {
    return {
      baseUrl: process.env[builtinConfig.baseUrlEnv] || joinBaseUrl(apiBaseUrl, builtinConfig.defaultPath || ''),
      apiKey: builtinConfig.apiKeyEnv ? process.env[builtinConfig.apiKeyEnv] : undefined,
      timeout: BACKEND_API_DEFAULT_TIMEOUT_MS,
    };
  }

  const normalizedServiceName = normalizeServiceNameForEnv(serviceName);
  const dynamicBaseUrlEnvName = `API_SERVICE_${normalizedServiceName}_BASE_URL`;
  const dynamicApiKeyEnvName = `API_SERVICE_${normalizedServiceName}_API_KEY`;

  return {
    baseUrl: process.env[dynamicBaseUrlEnvName] || joinBaseUrl(apiBaseUrl, serviceName),
    apiKey: process.env[dynamicApiKeyEnvName],
    timeout: BACKEND_API_DEFAULT_TIMEOUT_MS,
  };
}

/**
 * 利用可能なサービス名一覧を取得
 */
export function getAvailableServices(): ApiServiceName[] {
  return [...new Set<ApiServiceName>(['service1', 'service2', 'service3', 'user-api', ...getAdditionalServices()])];
}
