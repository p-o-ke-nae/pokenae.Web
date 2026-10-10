/**
 * フロントエンド用APIクライアント
 * Next.js API Routes経由でAppServiceにアクセス
 */

import type { ApiResponse, HttpMethod } from '@/lib/types/api';
import type { ApiServiceName } from '@/lib/config/api-config';
import resources from '@/lib/resources';

const RETRYABLE_CODES = new Set(['API_STARTING', 'HTTP_502', 'HTTP_503', 'HTTP_504']);
// サーバー側（api-client.ts）でも起動待ちリトライを行うため、ブラウザ側は1回だけ再試行する。
// 多段リトライによる起動中 API・Next.js への要求集中を避ける。
const GET_MAX_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 10000;

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(resolve, ms);
    if (!signal) return;
    if (signal.aborted) {
      clearTimeout(timeoutId);
      reject(signal.reason);
      return;
    }
    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(signal.reason);
    }, { once: true });
  });
}

function getRetryDelay(response: Response): number {
  const retryAfter = response.headers.get('retry-after');
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : Number.NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, MAX_RETRY_DELAY_MS);
  }
  return DEFAULT_RETRY_DELAY_MS;
}

export interface FrontendApiClientOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * フロントエンドからNext.js API Routes経由でAppServiceにアクセスするクライアント
 */
export class FrontendApiClient {
  private serviceName: ApiServiceName;

  constructor(serviceName: ApiServiceName) {
    this.serviceName = serviceName;
  }

  /**
   * APIリクエストを実行
   */
  private async request<T>(
    endpoint: string,
    options: FrontendApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    const method = options.method || 'GET';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // 認証トークンはサーバー側（API Route）がサーバーセッションから付与する。
    // ここで getSession() を呼ぶと要求ごとに /api/auth/session が発生し、
    // 他タブへのセッション更新通知で一覧の再読込が連鎖するため呼ばない。

    const maxAttempts = method === 'GET' ? GET_MAX_ATTEMPTS : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: options.signal,
        cache: 'no-store',
      };

      // GET以外のメソッドでbodyを追加
      if (method !== 'GET' && options.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      // Next.js API Routes経由でリクエスト
      const url = `/api/services/${this.serviceName}${endpoint}`;
      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get('content-type') ?? '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : {
          success: false,
          error: {
            code: response.status ? `HTTP_${response.status}` : 'INVALID_RESPONSE',
            message: resources.apiError.generic.invalidResponse,
            details: await response.text(),
          },
        };

      const apiResponse = data as ApiResponse<T>;
      if (
        method === 'GET'
        && attempt < maxAttempts - 1
        && !apiResponse.success
        && RETRYABLE_CODES.has(apiResponse.error.code)
      ) {
        await delay(getRetryDelay(response), options.signal);
        continue;
      }
      return apiResponse;
      } catch (error) {
        if (method === 'GET' && attempt < maxAttempts - 1 && !options.signal?.aborted) {
          await delay(DEFAULT_RETRY_DELAY_MS, options.signal).catch(() => undefined);
          continue;
        }
        return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: resources.apiError.generic.network,
          details: error,
        },
        };
      }
    }

    return {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: resources.apiError.generic.network,
      },
    };
  }

  /**
   * GETリクエスト
   */
  async get<T>(endpoint: string, options?: FrontendApiClientOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POSTリクエスト
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: FrontendApiClientOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUTリクエスト
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: FrontendApiClientOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * PATCHリクエスト
   */
  async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: FrontendApiClientOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETEリクエスト
   */
  async delete<T>(endpoint: string, options?: FrontendApiClientOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

/**
 * フロントエンド用APIクライアントを作成
 */
export function createFrontendApiClient(serviceName: ApiServiceName): FrontendApiClient {
  return new FrontendApiClient(serviceName);
}
