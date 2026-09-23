import { describe, expect, it } from 'vitest';
import { buildGoogleProxyHeaders } from './service-proxy';

describe('pokemon damage calculator service proxy headers', () => {
  it('returns both auth headers from session token', () => {
    const headers = buildGoogleProxyHeaders('session-token', new Headers());

    expect(headers).toEqual({
      Authorization: 'Bearer session-token',
      'X-Google-Access-Token': 'session-token',
    });
  });

  it('falls back to request headers when session token is absent', () => {
    const headers = buildGoogleProxyHeaders(undefined, new Headers({
      authorization: 'Bearer request-token',
    }));

    expect(headers).toEqual({
      Authorization: 'Bearer request-token',
      'X-Google-Access-Token': 'request-token',
    });
  });

  it('returns empty headers when no token is available', () => {
    expect(buildGoogleProxyHeaders(undefined, new Headers())).toEqual({});
  });
});

