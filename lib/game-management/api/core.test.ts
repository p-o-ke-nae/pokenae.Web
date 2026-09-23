import { describe, expect, it } from 'vitest';

import { ApiError, addApiErrorResourceContext, getGameManagementErrorMessage } from './core';
import { extractProblemFieldErrors, extractServerDetail } from './problem-details';

describe('game-management api error helpers', () => {
  it('extracts field errors from validation problem details and structured error details', () => {
    expect(extractProblemFieldErrors({
      errors: {
        MaintenanceDate: ['メンテナンス実施日は必須です。'],
      },
      errorDetails: [
        {
          code: 'INVALID_STARTUP',
          field: 'IsPowerOnPerformed',
          fieldLabel: '通電',
          message: '起動確認を行う場合は通電も必要です。',
          userMessage: '起動確認を行う場合は通電も必要です。',
          suggestedAction: '通電を実施するか、起動確認を外してください。',
        },
      ],
    })).toEqual({
      maintenanceDate: ['メンテナンス実施日は必須です。'],
      isPowerOnPerformed: ['起動確認を行う場合は通電も必要です。'],
    });
  });

  it('prefers structured error details when building a user-facing error message', () => {
    expect(extractServerDetail({
      title: 'Validation Failed',
      traceId: '00-abc-xyz-00',
      errorDetails: [
        {
          code: 'INVALID_STARTUP',
          fieldLabel: '起動確認',
          message: '起動確認に失敗しました。',
          userMessage: '起動確認に失敗しました。',
          suggestedAction: '電源や接続状況を確認してください。',
        },
      ],
    })).toBe([
      '起動確認: 起動確認に失敗しました。',
      '対応: 電源や接続状況を確認してください。',
      'Trace ID: 00-abc-xyz-00',
    ].join('\n'));
  });

  it('uses the authentication action instead of the generic list fallback for an unauthorized BFF response', () => {
    const message = getGameManagementErrorMessage(
      new ApiError(null, 'Unauthorized', undefined, 'UNAUTHORIZED'),
      {
        fallback: {
          title: '一覧を読み込めませんでした。',
          detail: '通信状態を確認して、再読み込みしてください。',
        },
      },
    );

    expect(message).toBe([
      '一覧を読み込めませんでした。',
      'もう一度ログインしてから操作をやり直してください。',
    ].join('\n'));
  });

  it('includes the failed lookup label without exposing endpoint details', () => {
    const error = new ApiError(null, 'Network error', undefined, 'NETWORK_ERROR');
    addApiErrorResourceContext(error, 'ゲーム機');

    const message = getGameManagementErrorMessage(error, {
      fallback: {
        title: '一覧を読み込めませんでした。',
        detail: '通信状態を確認して、再読み込みしてください。',
      },
    });

    expect(message).toBe([
      '一覧を読み込めませんでした。',
      'ゲーム機の取得に失敗しました。',
      'しばらく待ってから再試行してください。',
    ].join('\n'));
  });

  it('provides Docker configuration guidance for a service configuration error', () => {
    const message = getGameManagementErrorMessage(
      new ApiError(null, 'Invalid service configuration', undefined, 'SERVICE_CONFIGURATION_ERROR'),
      {
        fallback: {
          title: '一覧を読み込めませんでした。',
          detail: '通信状態を確認して、再読み込みしてください。',
        },
      },
    );

    expect(message).toBe([
      '一覧を読み込めませんでした。',
      'Docker の環境設定を確認してから、アプリを再起動してください。',
    ].join('\n'));
  });
});
