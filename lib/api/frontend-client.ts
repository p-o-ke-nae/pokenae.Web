/**
 * フロントエンド用APIクライアント
 * Next.js API Routes経由でAppServiceにアクセス
 */

import type { ApiResponse, HttpMethod } from '@/lib/types/api';
import type { ApiServiceName } from '@/lib/config/api-config';
import { getSession } from 'next-auth/react';
import resources from '@/lib/resources';

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

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (!value || typeof value !== 'object' || !('success' in value)) {
    return false;
  }

  const candidate = value as { success?: unknown; error?: unknown };
  if (candidate.success === true) {
    return true;
  }

  if (candidate.success !== false || !candidate.error || typeof candidate.error !== 'object') {
    return false;
  }

  const error = candidate.error as { code?: unknown; message?: unknown };
  return typeof error.code === 'string' && typeof error.message === 'string';
}

function createInvalidResponse<T>(response: Response): ApiResponse<T> {
  return {
    success: false,
    error: {
      code: 'INVALID_RESPONSE',
      message: resources.apiError.generic.invalidResponse,
      details: {
        statusCode: response.status,
        contentType: response.headers.get('content-type'),
      },
    },
  };
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
      const contentType = response.headers.get('content-type');

      if (!contentType?.toLowerCase().includes('application/json')) {
        return createInvalidResponse<T>(response);
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        return createInvalidResponse<T>(response);
      }

      if (!isApiResponse(data)) {
        return createInvalidResponse<T>(response);
      }

      return data as ApiResponse<T>;
    } catch (error) {
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
