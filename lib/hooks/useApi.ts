'use client';

/**
 * useApi - APIリクエスト用のReactフック
 */

import { useState, useCallback } from 'react';
import { createFrontendApiClient } from '@/lib/api/frontend-client';
import type { ApiServiceName } from '@/lib/config/api-config';
import type { ApiResponse } from '@/lib/types/api';

export interface UseApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface UseApiReturn<T> extends UseApiState<T> {
  execute: () => Promise<ApiResponse<T>>;
  reset: () => void;
}

/**
 * APIリクエストを実行するフック
 * 
 * @example
 * ```tsx
 * const { data, error, loading, execute } = useApi(
 *   'service1',
 *   (client) => client.get('/users')
 * );
 * 
 * // ボタンクリック時などに実行
 * const handleClick = async () => {
 *   await execute();
 * };
 * ```
 */
export function useApi<T>(
  serviceName: ApiServiceName,
  requestFn: (client: ReturnType<typeof createFrontendApiClient>) => Promise<ApiResponse<T>>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const execute = useCallback(async () => {
    setState({ data: null, error: null, loading: true });

    try {
      const client = createFrontendApiClient(serviceName);
      const response = await requestFn(client);

      if (response.success) {
        setState({ data: response.data, error: null, loading: false });
      } else {
        setState({
          data: null,
          error: response.error.message,
          loading: false,
        });
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({ data: null, error: errorMessage, loading: false });

      return {
        success: false,
        error: {
          code: 'HOOK_ERROR',
          message: errorMessage,
          details: error,
        },
      } as ApiResponse<T>;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceName]);

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}
