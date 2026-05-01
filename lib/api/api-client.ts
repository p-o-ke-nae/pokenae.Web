/**
 * APIクライアント
 * 複数のAppServiceへのアクセスを統一的に扱うための基盤クラス
 */

import type { ApiServiceConfig } from '../config/api-config';
import { BACKEND_API_DEFAULT_TIMEOUT_MS } from '../config/api-config';
import type { ApiResponse, ApiRequestOptions } from '../types/api';
import resources from '../resources';

function mergeAbortSignals(signals: Array<AbortSignal | undefined>): {
  signal: AbortSignal | undefined;
  cleanup: () => void;
} {
  const activeSignals = signals.filter((signal): signal is AbortSignal => signal != null);

  if (activeSignals.length === 0) {
    return { signal: undefined, cleanup: () => undefined };
  }

  if (activeSignals.length === 1) {
    return { signal: activeSignals[0], cleanup: () => undefined };
  }

  const controller = new AbortController();
  const listeners = new Map<AbortSignal, () => void>();

  const cleanup = () => {
    for (const [signal, listener] of listeners) {
      signal.removeEventListener('abort', listener);
    }
    listeners.clear();
  };

  const abortFrom = (sourceSignal: AbortSignal) => {
    cleanup();
    controller.abort(sourceSignal.reason);
  };

  for (const signal of activeSignals) {
    if (signal.aborted) {
      abortFrom(signal);
      return { signal: controller.signal, cleanup };
    }

    const listener = () => abortFrom(signal);
    listeners.set(signal, listener);
    signal.addEventListener('abort', listener, { once: true });
  }

  return { signal: controller.signal, cleanup };
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(config: ApiServiceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // 末尾のスラッシュを除去
    // ACA の scale-to-zero 復帰時に発生するコールドスタートを吸収できる既定値を使う
    this.timeout = config.timeout ?? BACKEND_API_DEFAULT_TIMEOUT_MS;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };

    // API Keyが設定されている場合は追加
    if (config.apiKey) {
      this.defaultHeaders['Authorization'] = `Bearer ${config.apiKey}`;
    }
  }

  /**
   * HTTPリクエストを実行
   */
  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || 'GET';
    const headers = { ...this.defaultHeaders, ...options.headers };
    const timeout = options.timeout || this.timeout;

    // タイムアウト用のAbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const { signal, cleanup } = mergeAbortSignals([options.signal, controller.signal]);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal,
      };

      // GET以外のメソッドでbodyを追加
      if (method !== 'GET' && options.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);
      cleanup();

      // レスポンスをJSON形式でパース
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // ステータスコードに基づいてレスポンスを返す
      if (response.ok) {
        return {
          success: true,
          data: data as T,
        };
      } else {
        const safeMessage = resources.apiError.status[response.status] ?? resources.apiError.server.internalError;
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: safeMessage,
            details: data,
          },
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      cleanup();

      // エラーハンドリング
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: {
              code: 'TIMEOUT',
              message: resources.apiError.server.timeout,
              details: { timeout },
            },
          };
        }

        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: resources.apiError.server.network,
            details: error,
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: resources.apiError.server.unknown,
          details: error,
        },
      };
    }
  }

  /**
   * GETリクエスト
   */
  async get<T>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POSTリクエスト
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUTリクエスト
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * PATCHリクエスト
   */
  async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETEリクエスト
   */
  async delete<T>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}
