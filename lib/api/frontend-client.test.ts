import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FrontendApiClient } from './frontend-client';

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(async () => null),
}));

const originalFetch = global.fetch;

describe('FrontendApiClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('handles non-JSON transient responses and retries GET', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('<html>bad gateway</html>', { status: 502, headers: { 'content-type': 'text/html' } }))
      .mockResolvedValueOnce(Response.json({ success: true, data: { ok: true } }));
    global.fetch = fetchMock as typeof fetch;

    const client = new FrontendApiClient('game-library-api');
    const promise = client.get('/api/SaveDatas');
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toEqual({ success: true, data: { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-GET requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502, headers: { 'content-type': 'text/html' } }));
    global.fetch = fetchMock as typeof fetch;

    const client = new FrontendApiClient('game-library-api');
    await expect(client.post('/api/SaveDatas', {})).resolves.toMatchObject({
      success: false,
      error: { code: 'HTTP_502' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
