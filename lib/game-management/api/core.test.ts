import { describe, expect, it } from 'vitest';

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
});
