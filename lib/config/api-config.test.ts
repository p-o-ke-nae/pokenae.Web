import { afterEach, describe, expect, it } from 'vitest';

import { ApiServiceConfigurationError, getApiConfig } from './api-config';

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe('getApiConfig', () => {
  it('requires an explicit base URL for an additional service', () => {
    delete process.env.API_SERVICE_GAME_LIBRARY_API_BASE_URL;

    expect(() => getApiConfig('game-library-api')).toThrow(ApiServiceConfigurationError);
  });

  it('rejects a non-HTTP base URL', () => {
    process.env.API_SERVICE_GAME_LIBRARY_API_BASE_URL = 'file:///tmp/game-library';

    expect(() => getApiConfig('game-library-api')).toThrow(ApiServiceConfigurationError);
  });

  it('returns a configured HTTPS base URL', () => {
    process.env.API_SERVICE_GAME_LIBRARY_API_BASE_URL = 'https://host.docker.internal:10081';

    expect(getApiConfig('game-library-api')).toMatchObject({
      baseUrl: 'https://host.docker.internal:10081',
    });
  });
});
