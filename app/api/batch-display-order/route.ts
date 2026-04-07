/**
 * 表示順一括更新 Route Handler
 *
 * 全行の displayOrder 更新を 1 リクエストで受け付け、順次バックエンドに PUT する。
 * 途中で失敗した場合は、既に成功した更新をロールバック（元の displayOrder で再 PUT）し、
 * 全体を失敗として返す。ロールバック自体が失敗した場合もエラー詳細を返す。
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth/auth-options';
import { getApiClient } from '@/lib/api/client-factory';
import type { ApiServiceName } from '@/lib/config/api-config';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/route-helpers';
import { RESOURCE_DEFINITIONS } from '@/lib/game-management/resources';

/** 許可されたバックエンド API パスのセット（ResourceDefinition.apiPath からビルド） */
const ALLOWED_API_PATHS = new Set(Object.values(RESOURCE_DEFINITIONS).map((def) => def.apiPath));

/** 1 リクエストで処理できる最大アイテム数 */
const MAX_BATCH_SIZE = 200;

/** クライアントから送られてくる各行の更新情報 */
type BatchItem = {
  id: number;
  /** 新しい displayOrder を含む更新ペイロード */
  updatePayload: Record<string, unknown>;
  /** ロールバック用: 元の displayOrder を含む更新ペイロード */
  rollbackPayload: Record<string, unknown>;
};

type BatchRequestBody = {
  /** バックエンド API パス (例: "/api/Accounts") */
  apiPath: string;
  items: BatchItem[];
};

type BatchSuccessResult = {
  updatedCount: number;
};

type BatchErrorResult = {
  failedItemId: number;
  failedIndex: number;
  error: string;
  rollbackSuccess: boolean;
  rollbackFailures: { id: number; error: string }[];
};

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(getAuthOptions());
    if (!session) {
      return createErrorResponse('UNAUTHORIZED', '認証が必要です。ログインしてください。', 401);
    }

    // リクエストボディをパース
    const body: BatchRequestBody = await request.json();
    if (!body.apiPath || !Array.isArray(body.items) || body.items.length === 0) {
      return createErrorResponse('BAD_REQUEST', 'apiPath と items（空でない配列）が必要です。', 400);
    }

    // API パスのホワイトリスト検証（パストラバーサル防止）
    if (!ALLOWED_API_PATHS.has(body.apiPath)) {
      return createErrorResponse('BAD_REQUEST', '許可されていない API パスです。', 400);
    }

    // バッチサイズ上限チェック
    if (body.items.length > MAX_BATCH_SIZE) {
      return createErrorResponse('BAD_REQUEST', `一括更新の上限は ${MAX_BATCH_SIZE} 件です。`, 400);
    }

    // 入力バリデーション
    for (const item of body.items) {
      if (typeof item.id !== 'number' || !item.updatePayload || !item.rollbackPayload) {
        return createErrorResponse('BAD_REQUEST', '各 item には id, updatePayload, rollbackPayload が必要です。', 400);
      }
    }

    // バックエンド API クライアントを取得
    const serviceName: ApiServiceName = 'game-library-api';
    const client = getApiClient(serviceName);

    // 認証ヘッダーを構築
    const proxyHeaders: Record<string, string> = {};
    const sessionAccessToken = typeof session.accessToken === 'string'
      ? session.accessToken
      : undefined;
    const authHeader = request.headers.get('authorization');
    const requestBearerToken = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
    const requestGoogleToken = request.headers.get('x-google-access-token') ?? undefined;
    const accessToken = sessionAccessToken || requestBearerToken || requestGoogleToken;
    if (accessToken) {
      proxyHeaders.Authorization = `Bearer ${accessToken}`;
      proxyHeaders['X-Google-Access-Token'] = accessToken;
    }

    // 順次更新: 成功した item のインデックスを記録
    const succeededIndices: number[] = [];

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      const endpoint = `${body.apiPath}/${item.id}`;
      const response = await client.put(endpoint, item.updatePayload, { headers: proxyHeaders });

      if (!response.success) {
        // --- この item で失敗 → ロールバック開始 ---
        const statusCode = response.error.code.startsWith('HTTP_')
          ? parseInt(response.error.code.replace('HTTP_', ''), 10)
          : 500;

        const rollbackFailures: { id: number; error: string }[] = [];

        // 逆順でロールバック（成功した更新を元に戻す）
        for (let j = succeededIndices.length - 1; j >= 0; j--) {
          const rbIdx = succeededIndices[j];
          const rbItem = body.items[rbIdx];
          const rbEndpoint = `${body.apiPath}/${rbItem.id}`;
          try {
            const rbResponse = await client.put(rbEndpoint, rbItem.rollbackPayload, { headers: proxyHeaders });
            if (!rbResponse.success) {
              rollbackFailures.push({
                id: rbItem.id,
                error: rbResponse.error.message,
              });
            }
          } catch (rbError) {
            rollbackFailures.push({
              id: rbItem.id,
              error: rbError instanceof Error ? rbError.message : 'Unknown rollback error',
            });
          }
        }

        if (rollbackFailures.length > 0) {
          console.error('[CRITICAL] Batch display order rollback partially failed:', {
            apiPath: body.apiPath,
            failedItemId: item.id,
            rollbackFailures,
          });
        }

        const errorResult: BatchErrorResult = {
          failedItemId: item.id,
          failedIndex: i,
          error: response.error.message,
          rollbackSuccess: rollbackFailures.length === 0,
          rollbackFailures,
        };

        return createErrorResponse(
          `HTTP_${statusCode}`,
          '表示順の一括更新に失敗しました。',
          statusCode,
          errorResult,
        );
      }

      succeededIndices.push(i);
    }

    // 全件成功
    const successResult: BatchSuccessResult = { updatedCount: body.items.length };
    return createSuccessResponse(successResult);
  } catch (error) {
    console.error('Batch display order update error:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '表示順の一括更新中に予期せぬエラーが発生しました。',
      500,
    );
  }
}
