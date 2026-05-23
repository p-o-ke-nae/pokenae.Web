import { afterEach, describe, expect, it, vi } from 'vitest';
import { canManageRuleSets, canManageUserAuthorizations, probeAdminCapability } from './capability';
import * as mockedApi from './api';

vi.mock('./api', () => ({
  fetchAdminRuleSets: vi.fn(),
  fetchAdminUserAuthorizations: vi.fn(),
  isAdminApiForbidden: (error: { statusCode?: number }) => error.statusCode === 403,
  isAdminApiUnauthorized: (error: { statusCode?: number }) => error.statusCode === 401,
}));

describe('admin capability', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('detects anonymous without session', async () => {
    expect(await probeAdminCapability(false)).toBe('anonymous');
  });

  it('detects member from forbidden rule set access', async () => {
    vi.mocked(mockedApi.fetchAdminRuleSets).mockRejectedValueOnce({ statusCode: 403 });

    expect(await probeAdminCapability(true)).toBe('member');
  });

  it('detects administrator when both calls succeed', async () => {
    vi.mocked(mockedApi.fetchAdminRuleSets).mockResolvedValueOnce([]);
    vi.mocked(mockedApi.fetchAdminUserAuthorizations).mockResolvedValueOnce([]);

    expect(await probeAdminCapability(true)).toBe('administrator');
  });

  it('maps capability checks', () => {
    expect(canManageRuleSets('member')).toBe(false);
    expect(canManageRuleSets('masterEditor')).toBe(true);
    expect(canManageUserAuthorizations('masterEditor')).toBe(false);
    expect(canManageUserAuthorizations('administrator')).toBe(true);
  });
});

