/**
 * フロントエンド用APIクライアント
 * Next.js API Routes経由でAppServiceにアクセス
 */

import type { ApiResponse, HttpMethod } from '@/lib/types/api';
import type { ApiServiceName } from '@/lib/config/api-config';

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

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: options.signal,
      };

      // GET以外のメソッドでbodyを追加
      if (method !== 'GET' && options.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      // Next.js API Routes経由でリクエスト
      const url = `/api/services/${this.serviceName}${endpoint}`;
      const response = await fetch(url, fetchOptions);

      const data = await response.json();

      return data as ApiResponse<T>;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch',
          details: error,
        },
      };
    }
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
