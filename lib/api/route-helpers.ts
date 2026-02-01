/**
 * API Routes 用のヘルパー関数
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types/api';

/**
 * 成功レスポンスを作成
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  message?: string
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * エラーレスポンスを作成
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 500,
  details?: unknown
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  );
}

/**
 * リクエストボディをパース
 */
export async function parseRequestBody(request: NextRequest): Promise<unknown> {
  try {
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await request.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * クエリパラメータを取得
 */
export function getQueryParams(request: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = request.nextUrl.searchParams;
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}
