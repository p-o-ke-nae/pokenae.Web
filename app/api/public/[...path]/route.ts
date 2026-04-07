/**
 * 公開マスタ API プロキシ
 * /api/public/[...path] のルートハンドラー
 *
 * 認証不要で、バックエンドの /api/public 配下の読み取り専用エンドポイントを
 * フロントエンドへ中継する。許可されたパスプレフィックスへの GET のみ受け付け、
 * それ以外は 404 を返す。
 */

import { NextRequest } from 'next/server';
import { getApiClient } from '@/lib/api/client-factory';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/route-helpers';

/** 許可するパスプレフィックス（先頭スラッシュなし） */
const ALLOWED_PREFIXES = [
  'account-type-masters',
  'game-console-categories',
  'game-console-category-compatibilities',
  'game-console-masters',
  'game-console-edition-masters',
  'game-software-content-groups',
  'game-software-masters',
  'memory-card-edition-masters',
];

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

function isAllowedPath(segments: string[]): boolean {
  if (segments.length === 0) {
    return false;
  }
  const prefix = segments[0];
  if (!ALLOWED_PREFIXES.includes(prefix)) {
    return false;
  }

  if (prefix === 'game-console-category-compatibilities') {
    return segments.length === 1;
  }

  if (prefix !== 'game-software-masters') {
    return segments.length <= 2;
  }

  if (segments.length <= 2) {
    return true;
  }

  return segments.length === 3 && (segments[2] === 'save-data-schema' || segments[2] === 'story-progress-schema');
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { path } = await context.params;

    if (!isAllowedPath(path)) {
      return createErrorResponse('NOT_FOUND', 'The requested public endpoint does not exist.', 404);
    }

    const client = getApiClient('game-library-api');

    const endpoint = `/api/public/${path.join('/')}`;
    const searchParams = request.nextUrl.searchParams.toString();
    const fullEndpoint = searchParams ? `${endpoint}?${searchParams}` : endpoint;

    const response = await client.get(fullEndpoint);

    if (response.success) {
      return createSuccessResponse(response.data);
    }

    const statusCode = response.error.code.startsWith('HTTP_')
      ? parseInt(response.error.code.replace('HTTP_', ''), 10)
      : 500;

    return createErrorResponse(
      response.error.code,
      response.error.message,
      statusCode,
      response.error.details,
    );
  } catch (error) {
    console.error('Public API Route Error:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Internal server error',
      500,
    );
  }
}
