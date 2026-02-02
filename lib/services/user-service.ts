/**
 * ユーザーAPIクライアント
 * ユーザー情報の取得を管理
 */

import type { ApiResponse } from '@/lib/types/api';

export interface UserData {
  id: number;
  name: string;
  email: string;
  phone: string;
  website: string;
}

// 利用可能なユーザーIDの最大値
const MAX_USER_ID = 5;

/**
 * ランダムなユーザー情報を取得
 */
export async function fetchRandomUser(): Promise<ApiResponse<UserData>> {
  try {
    const randomId = Math.floor(Math.random() * MAX_USER_ID) + 1;
    const response = await fetch(`/api/fetch-user?id=${randomId}`);
    
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'APIリクエストに失敗しました',
        },
      };
    }
    
    const data: UserData = await response.json();
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : '不明なエラーが発生しました',
        details: error,
      },
    };
  }
}

/**
 * 特定のユーザー情報を取得
 */
export async function fetchUserById(id: number): Promise<ApiResponse<UserData>> {
  try {
    const response = await fetch(`/api/fetch-user?id=${id}`);
    
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'APIリクエストに失敗しました',
        },
      };
    }
    
    const data: UserData = await response.json();
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : '不明なエラーが発生しました',
        details: error,
      },
    };
  }
}
