/**
 * API Proxy Route Handler
 * /api/services/[service]/[...path] のルートハンドラー
 * 
 * 複数のAppServiceへのリクエストを統一的にプロキシする
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth/auth-options';
import { getApiClient } from '@/lib/api/client-factory';
import { getAvailableServices, type ApiServiceName } from '@/lib/config/api-config';
import { createSuccessResponse, createErrorResponse, parseRequestBody } from '@/lib/api/route-helpers';

interface RouteParams {
  params: Promise<{
    service: string;
    path: string[];
  }>;
}

/**
 * GET リクエスト処理
 */
export async function GET(request: NextRequest, context: RouteParams) {
  return handleRequest(request, context, 'GET');
}

/**
 * POST リクエスト処理
 */
export async function POST(request: NextRequest, context: RouteParams) {
  return handleRequest(request, context, 'POST');
}

/**
 * PUT リクエスト処理
 */
export async function PUT(request: NextRequest, context: RouteParams) {
  return handleRequest(request, context, 'PUT');
}

/**
 * PATCH リクエスト処理
 */
export async function PATCH(request: NextRequest, context: RouteParams) {
  return handleRequest(request, context, 'PATCH');
}

/**
 * DELETE リクエスト処理
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  return handleRequest(request, context, 'DELETE');
}

/**
 * リクエスト処理の共通ロジック
 */
async function handleRequest(
  request: NextRequest,
  context: RouteParams,
  method: string
) {
  try {
    const { service, path } = await context.params;

    // セッションによる認証チェック（ミドルウェアに加えた二重防御）
    const session = await getServerSession(getAuthOptions());
    if (!session) {
      return createErrorResponse('UNAUTHORIZED', '認証が必要です。ログインしてください。', 401);
    }

    // サービス名のバリデーション
    const availableServices = getAvailableServices();
    if (!availableServices.includes(service as ApiServiceName)) {
      return createErrorResponse(
        'INVALID_SERVICE',
        `Invalid service name: ${service}. Available services: ${availableServices.join(', ')}`,
        400
      );
    }

    // APIクライアントを取得
    const client = getApiClient(service as ApiServiceName);

    // エンドポイントパスを構築
    const endpoint = `/${path.join('/')}`;
    
    // クエリパラメータを追加
    const searchParams = request.nextUrl.searchParams.toString();
    const fullEndpoint = searchParams ? `${endpoint}?${searchParams}` : endpoint;

    // リクエストボディを取得（GET/DELETE以外）
    let body;
    if (method !== 'GET' && method !== 'DELETE') {
      body = await parseRequestBody(request);
    }

    // 認証ヘッダーを構築（Googleアクセストークンをバックエンドへ転送）
    const sessionAccessToken = typeof session.accessToken === 'string'
      ? session.accessToken
      : undefined;
    const authorizationHeader = request.headers.get('authorization');
    const requestBearerToken = authorizationHeader?.toLowerCase().startsWith('bearer ')
      ? authorizationHeader.slice(7).trim()
      : undefined;
    const requestGoogleToken = request.headers.get('x-google-access-token') ?? undefined;
    const accessToken = sessionAccessToken || requestBearerToken || requestGoogleToken;

    const proxyHeaders: Record<string, string> = {};
    if (accessToken) {
      proxyHeaders.Authorization = `Bearer ${accessToken}`;
      proxyHeaders['X-Google-Access-Token'] = accessToken;
    }

    // AppServiceにリクエストを転送
    let response;
    switch (method) {
      case 'GET':
        response = await client.get(fullEndpoint, { headers: proxyHeaders });
        break;
      case 'POST':
        response = await client.post(fullEndpoint, body, { headers: proxyHeaders });
        break;
      case 'PUT':
        response = await client.put(fullEndpoint, body, { headers: proxyHeaders });
        break;
      case 'PATCH':
        response = await client.patch(fullEndpoint, body, { headers: proxyHeaders });
        break;
      case 'DELETE':
        response = await client.delete(fullEndpoint, { headers: proxyHeaders });
        break;
      default:
        return createErrorResponse('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
    }

    // レスポンスを返す
    if (response.success) {
      return createSuccessResponse(response.data);
    } else {
      const statusCode = response.error.code.startsWith('HTTP_')
        ? parseInt(response.error.code.replace('HTTP_', ''), 10)
        : 500;
      
      return createErrorResponse(
        response.error.code,
        response.error.message,
        statusCode,
        response.error.details
      );
    }
  } catch (error) {
    console.error('API Route Error:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
