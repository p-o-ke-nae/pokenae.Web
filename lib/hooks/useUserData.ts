'use client';

/**
 * useUserData - ユーザー情報取得用のReactフック
 */

import { useState, useCallback } from 'react';
import { fetchRandomUser, type UserData } from '@/lib/services/user-service';

export interface UseUserDataState {
  userData: UserData | null;
  error: string | null;
  loading: boolean;
}

export interface UseUserDataReturn extends UseUserDataState {
  fetchUser: () => Promise<void>;
  reset: () => void;
}

/**
 * ランダムなユーザー情報を取得するフック
 * 
 * @example
 * ```tsx
 * const { userData, error, loading, fetchUser } = useUserData();
 * 
 * // ボタンクリック時などに実行
 * const handleClick = async () => {
 *   await fetchUser();
 * };
 * ```
 */
export function useUserData(): UseUserDataReturn {
  const [state, setState] = useState<UseUserDataState>({
    userData: null,
    error: null,
    loading: false,
  });

  const fetchUser = useCallback(async () => {
    setState({ userData: null, error: null, loading: true });

    const response = await fetchRandomUser();

    if (response.success) {
      setState({ userData: response.data, error: null, loading: false });
    } else {
      setState({
        userData: null,
        error: response.error.message,
        loading: false,
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ userData: null, error: null, loading: false });
  }, []);

  return {
    ...state,
    fetchUser,
    reset,
  };
}
