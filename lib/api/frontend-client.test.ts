import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/react', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

import { FrontendApiClient } from './frontend-client';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('FrontendApiClient response handling', () => {
  it('returns a valid API response envelope', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ success: true, data: [{ id: 1 }] }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    ));

    const client = new FrontendApiClient('game-library-api');

    await expect(client.get<Array<{ id: number }>>('/api/GameConsoles')).resolves.toEqual({
      success: true,
      data: [{ id: 1 }],
    });
  });

  it('classifies an HTML error page as an invalid response without returning its body', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(
      '<!DOCTYPE html><html><body>internal details</body></html>',
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    ));

    const client = new FrontendApiClient('game-library-api');

    await expect(client.get('/api/GameConsoles')).resolves.toEqual({
      success: false,
      error: {
        code: 'INVALID_RESPONSE',
        message: 'サーバーからの応答を確認できませんでした。',
        details: {
          statusCode: 500,
          contentType: 'text/html; charset=utf-8',
        },
      },
    });
  });

  it('classifies malformed JSON as an invalid response', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(
      '{"success":',
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    ));

    const client = new FrontendApiClient('game-library-api');

    const response = await client.get('/api/GameConsoles');

    expect(response).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_RESPONSE',
        details: { statusCode: 502 },
      },
    });
  });
});
