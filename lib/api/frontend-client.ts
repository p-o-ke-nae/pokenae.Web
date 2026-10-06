/**
 * フロントエンド用APIクライアント
 * Next.js API Routes経由でAppServiceにアクセス
 */

import type { ApiResponse, HttpMethod } from '@/lib/types/api';
import type { ApiServiceName } from '@/lib/config/api-config';
import { getSession } from 'next-auth/react';
import resources from '@/lib/resources';

const RETRYABLE_CODES = new Set(['API_STARTING', 'HTTP_502', 'HTTP_503', 'HTTP_504']);

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

function getRetryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('retry-after');
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : Number.NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }
  return [1000, 2000, 4000][attempt] ?? 4000;
}

export interface FrontendApiClientOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /**
   * Google認証情報を含めるかどうか
   * デフォルト: true（undefined時もtrueとして扱われる）
   * バックエンドAPIでスプレッドシートアクセスが必要な場合はtrueのままにしてください
   */
  includeAuth?: boolean;
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

    // Google認証情報をヘッダーに追加
    if (options.includeAuth !== false) { // デフォルトでtrueとして扱う
      try {
        const session = await getSession();
        if (session?.accessToken) {
          headers['Authorization'] = `Bearer ${session.accessToken}`;
          headers['X-Google-Access-Token'] = session.accessToken;
        }
      } catch (error) {
        console.warn('Failed to get session for API request:', error);
      }
    }

    const maxAttempts = method === 'GET' ? 4 : 1;

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
        await delay(getRetryDelay(response, attempt), options.signal);
        continue;
      }
      return apiResponse;
      } catch (error) {
        if (method === 'GET' && attempt < maxAttempts - 1 && !options.signal?.aborted) {
          await delay([1000, 2000, 4000][attempt] ?? 4000, options.signal).catch(() => undefined);
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
