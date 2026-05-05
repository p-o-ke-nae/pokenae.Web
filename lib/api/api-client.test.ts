import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from './api-client';
import { BACKEND_API_DEFAULT_TIMEOUT_MS } from '../config/api-config';

const originalFetch = global.fetch;

function createAbortableFetchMock() {
  return vi.fn((_: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
    const signal = init?.signal;
    if (!signal) {
      return;
    }

    signal.addEventListener('abort', () => {
      const error = new Error('Request aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  }));
}

describe('ApiClient timeout behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('falls back to the ACA-aware backend default timeout when config timeout is omitted', async () => {
    const fetchMock = createAbortableFetchMock();
    global.fetch = fetchMock as typeof fetch;

    const client = new ApiClient({
      baseUrl: 'https://example.com',
    });

    const responsePromise = client.get('/slow-endpoint');

    await vi.advanceTimersByTimeAsync(BACKEND_API_DEFAULT_TIMEOUT_MS);

    await expect(responsePromise).resolves.toEqual({
      success: false,
      error: {
        code: 'TIMEOUT',
        message: 'バックエンドサービスの応答がタイムアウトしました。',
        details: { timeout: BACKEND_API_DEFAULT_TIMEOUT_MS },
      },
    });

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/slow-endpoint', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('prefers a request-specific timeout over the default timeout', async () => {
    const fetchMock = createAbortableFetchMock();
    global.fetch = fetchMock as typeof fetch;

    const client = new ApiClient({
      baseUrl: 'https://example.com',
      timeout: BACKEND_API_DEFAULT_TIMEOUT_MS,
    });

    const responsePromise = client.get('/slow-endpoint', { timeout: 1500 });

    await vi.advanceTimersByTimeAsync(1500);

    await expect(responsePromise).resolves.toEqual({
      success: false,
      error: {
        code: 'TIMEOUT',
        message: 'バックエンドサービスの応答がタイムアウトしました。',
        details: { timeout: 1500 },
      },
    });
  });

  it('keeps the timeout active even when a caller-provided signal is supplied', async () => {
    const fetchMock = createAbortableFetchMock();
    global.fetch = fetchMock as typeof fetch;

    const client = new ApiClient({
      baseUrl: 'https://example.com',
    });
    const externalController = new AbortController();

    const responsePromise = client.get('/slow-endpoint', {
      signal: externalController.signal,
      timeout: 2500,
    });

    await vi.advanceTimersByTimeAsync(2500);

    await expect(responsePromise).resolves.toEqual({
      success: false,
      error: {
        code: 'TIMEOUT',
        message: 'バックエンドサービスの応答がタイムアウトしました。',
        details: { timeout: 2500 },
      },
    });
  });
});