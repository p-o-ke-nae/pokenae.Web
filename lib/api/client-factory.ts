/**
 * APIクライアントファクトリー
 * 各AppServiceのAPIクライアントインスタンスを作成
 */

import { ApiClient } from './api-client';
import { getApiConfig, type ApiServiceName } from '../config/api-config';

/**
 * 指定されたサービスのAPIクライアントを作成
 */
export function createApiClient(serviceName: ApiServiceName): ApiClient {
  const config = getApiConfig(serviceName);
  return new ApiClient(config);
}

/**
 * サービス別のAPIクライアントキャッシュ
 */
const clientCache = new Map<ApiServiceName, ApiClient>();

/**
 * キャッシュされたAPIクライアントを取得（シングルトンパターン）
 */
export function getApiClient(serviceName: ApiServiceName): ApiClient {
  if (!clientCache.has(serviceName)) {
    clientCache.set(serviceName, createApiClient(serviceName));
  }
  return clientCache.get(serviceName)!;
}

/**
 * キャッシュをクリア（テストやリセット時に使用）
 */
export function clearClientCache(): void {
  clientCache.clear();
}
