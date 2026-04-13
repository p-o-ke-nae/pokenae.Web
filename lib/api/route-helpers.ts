/**
 * API Routes 用のヘルパー関数
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types/api';
import resources from '@/lib/resources';

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
  const error = {
    code,
    message,
    ...(details !== undefined && { details }),
  };

  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

export function getSafeRouteErrorMessage(code: string, status: number = 500): string {
  const serverMessages = resources.apiError.server;

  switch (code) {
    case 'UNAUTHORIZED':
      return serverMessages.unauthorized;
    case 'INVALID_SERVICE':
      return serverMessages.invalidService;
    case 'METHOD_NOT_ALLOWED':
      return serverMessages.methodNotAllowed;
    case 'NOT_FOUND':
      return serverMessages.publicEndpointNotFound;
    case 'TIMEOUT':
      return serverMessages.timeout;
    case 'NETWORK_ERROR':
      return serverMessages.network;
    case 'UNKNOWN_ERROR':
      return serverMessages.unknown;
    case 'INTERNAL_ERROR':
      return serverMessages.internalError;
    default:
      return resources.apiError.status[status] ?? serverMessages.internalError;
  }
}

export function createSafeErrorResponse(
  code: string,
  status: number = 500,
  details?: unknown,
): NextResponse<ApiResponse> {
  return createErrorResponse(code, getSafeRouteErrorMessage(code, status), status, details);
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
