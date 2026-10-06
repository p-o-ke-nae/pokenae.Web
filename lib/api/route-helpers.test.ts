import { describe, expect, it } from 'vitest';

import { createApiStartingResponse, isApiStartingCode } from './route-helpers';

describe('API starting route helpers', () => {
  it('maps transient backend failures to a retryable 503 response', async () => {
    expect(isApiStartingCode('HTTP_502')).toBe(true);
    expect(isApiStartingCode('TIMEOUT')).toBe(true);

    const response = createApiStartingResponse({ upstream: 'HTTP_502' });

    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe('5');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'API_STARTING',
        message: 'APIを起動しています。しばらくしてから再試行してください。',
      },
    });
  });
});
