import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FrontendApiClient } from './frontend-client';

const getSessionMock = vi.hoisted(() => vi.fn(async () => null));

vi.mock('next-auth/react', () => ({
  getSession: getSessionMock,
}));

const originalFetch = global.fetch;

describe('FrontendApiClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    getSessionMock.mockClear();
    global.fetch = originalFetch;
  });

  it('handles non-JSON transient responses and retries GET', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('<html>bad gateway</html>', { status: 502, headers: { 'content-type': 'text/html' } }))
      .mockResolvedValueOnce(Response.json({ success: true, data: { ok: true } }));
    global.fetch = fetchMock as typeof fetch;

    const client = new FrontendApiClient('game-library-api');
    const promise = client.get('/api/SaveDatas');
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).resolves.toEqual({ success: true, data: { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries GET only once to avoid piling requests onto a starting API', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json(
      { success: false, error: { code: 'API_STARTING', message: 'starting' } },
      { status: 503 },
    ));
    global.fetch = fetchMock as typeof fetch;

    const client = new FrontendApiClient('game-library-api');
    const promise = client.get('/api/SaveDatas');
    await vi.advanceTimersByTimeAsync(30000);

    await expect(promise).resolves.toMatchObject({ success: false, error: { code: 'API_STARTING' } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not fetch the client session for each request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, data: [] }));
    global.fetch = fetchMock as typeof fetch;

    const client = new FrontendApiClient('game-library-api');
    await client.get('/api/SaveDatas');

    expect(getSessionMock).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).not.toHaveProperty('Authorization');
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