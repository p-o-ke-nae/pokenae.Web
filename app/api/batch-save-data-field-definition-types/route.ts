import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth/auth-options';
import { getApiClient } from '@/lib/api/client-factory';
import { createErrorResponse, createSafeErrorResponse, createSuccessResponse, getSafeRouteErrorMessage } from '@/lib/api/route-helpers';
import type { ApiServiceName } from '@/lib/config/api-config';
import type { UpdateSaveDataFieldDefinitionRequest } from '@/lib/game-management/types';

const MAX_BATCH_SIZE = 200;
const SAVE_DATA_FIELD_DEFINITIONS_API_PATH = '/api/SaveDataFieldDefinitions';

type BatchItem = {
  id: number;
  updatePayload: UpdateSaveDataFieldDefinitionRequest;
  rollbackPayload: UpdateSaveDataFieldDefinitionRequest;
};

type BatchRequestBody = {
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

function isValidSharedChoiceSetId(value: unknown): boolean {
  return value == null || (typeof value === 'number' && Number.isInteger(value) && value > 0);
}

function isValidUpdatePayload(payload: unknown): payload is UpdateSaveDataFieldDefinitionRequest {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as Record<string, unknown>;
  return typeof candidate.fieldKey === 'string'
    && typeof candidate.label === 'string'
    && (typeof candidate.description === 'string' || candidate.description == null)
    && typeof candidate.fieldType === 'string'
    && candidate.fieldType.length > 0
    && isValidSharedChoiceSetId(candidate.sharedChoiceSetId);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());
    const authHeader = request.headers.get('authorization');
    const requestBearerToken = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
    const requestGoogleToken = request.headers.get('x-google-access-token') ?? undefined;
    const sessionAccessToken = typeof session?.accessToken === 'string'
      ? session.accessToken
      : undefined;
    const accessToken = sessionAccessToken || requestBearerToken || requestGoogleToken;

    if (!session && !accessToken) {
      return createErrorResponse('UNAUTHORIZED', '認証が必要です。ログインしてください。', 401);
    }

    const body: BatchRequestBody = await request.json();
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return createErrorResponse('BAD_REQUEST', 'items（空でない配列）が必要です。', 400);
    }

    if (body.items.length > MAX_BATCH_SIZE) {
      return createErrorResponse('BAD_REQUEST', `一括更新の上限は ${MAX_BATCH_SIZE} 件です。`, 400);
    }

    for (const item of body.items) {
      if (typeof item.id !== 'number'
        || !Number.isInteger(item.id)
        || item.id < 1
        || !isValidUpdatePayload(item.updatePayload)
        || !isValidUpdatePayload(item.rollbackPayload)) {
        return createErrorResponse('BAD_REQUEST', '各 item には id, updatePayload, rollbackPayload が必要です。', 400);
      }
    }

    const serviceName: ApiServiceName = 'game-library-api';
    const client = getApiClient(serviceName);

    const proxyHeaders: Record<string, string> = {};
    if (accessToken) {
      proxyHeaders.Authorization = `Bearer ${accessToken}`;
      proxyHeaders['X-Google-Access-Token'] = accessToken;
    }

    const succeededIndices: number[] = [];

    for (let index = 0; index < body.items.length; index += 1) {
      const item = body.items[index];
      const endpoint = `${SAVE_DATA_FIELD_DEFINITIONS_API_PATH}/${item.id}`;
      const response = await client.put(endpoint, item.updatePayload, { headers: proxyHeaders });

      if (!response.success) {
        const statusCode = response.error.code.startsWith('HTTP_')
          ? parseInt(response.error.code.replace('HTTP_', ''), 10)
          : 500;

        const rollbackFailures: { id: number; error: string }[] = [];

        for (let rollbackIndex = succeededIndices.length - 1; rollbackIndex >= 0; rollbackIndex -= 1) {
          const succeededItemIndex = succeededIndices[rollbackIndex];
          const rollbackItem = body.items[succeededItemIndex];
          const rollbackEndpoint = `${SAVE_DATA_FIELD_DEFINITIONS_API_PATH}/${rollbackItem.id}`;
          try {
            const rollbackResponse = await client.put(rollbackEndpoint, rollbackItem.rollbackPayload, { headers: proxyHeaders });
            if (!rollbackResponse.success) {
              rollbackFailures.push({
                id: rollbackItem.id,
                error: getSafeRouteErrorMessage(rollbackResponse.error.code),
              });
            }
          } catch {
            rollbackFailures.push({
              id: rollbackItem.id,
              error: getSafeRouteErrorMessage('INTERNAL_ERROR', 500),
            });
          }
        }

        const errorResult: BatchErrorResult = {
          failedItemId: item.id,
          failedIndex: index,
          error: getSafeRouteErrorMessage(response.error.code, statusCode),
          rollbackSuccess: rollbackFailures.length === 0,
          rollbackFailures,
        };

        return createErrorResponse(
          `HTTP_${statusCode}`,
          '項目定義の一括型変更に失敗しました。',
          statusCode,
          errorResult,
        );
      }

      succeededIndices.push(index);
    }

    const successResult: BatchSuccessResult = { updatedCount: body.items.length };
    return createSuccessResponse(successResult);
  } catch (error) {
    console.error('Batch save data field definition type update error:', error);
    return createSafeErrorResponse('INTERNAL_ERROR', 500);
  }
}