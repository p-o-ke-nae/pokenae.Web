import { afterEach, describe, expect, it } from 'vitest';

import { GET } from './route';

const originalDeploySha = process.env.DEPLOY_SHA;

afterEach(() => {
  if (originalDeploySha === undefined) {
    delete process.env.DEPLOY_SHA;
  } else {
    process.env.DEPLOY_SHA = originalDeploySha;
  }
});

describe('GET /api/health', () => {
  it('returns an uncached health response with the deployment revision', async () => {
    process.env.DEPLOY_SHA = 'test-revision';

    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      revision: 'test-revision',
    });
  });
});
