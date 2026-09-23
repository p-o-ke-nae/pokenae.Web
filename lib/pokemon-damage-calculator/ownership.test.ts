import { describe, expect, it } from 'vitest';
import { canEditRun, getRunOwnership, getRunReadOnlyReason } from './ownership';

describe('pokemon damage calculator ownership helpers', () => {
  it('treats matching google user id as owner', () => {
    expect(getRunOwnership('google-user-1', 'google-user-1')).toBe('owner');
    expect(canEditRun('google-user-1', 'google-user-1')).toBe(true);
    expect(getRunReadOnlyReason('google-user-1', 'google-user-1')).toBeNull();
  });

  it('treats logged-in different user as viewer', () => {
    expect(getRunOwnership('google-user-1', 'google-user-2')).toBe('viewer');
    expect(canEditRun('google-user-1', 'google-user-2')).toBe(false);
    expect(getRunReadOnlyReason('google-user-1', 'google-user-2')).toContain('他ユーザー');
  });

  it('treats anonymous user as guest', () => {
    expect(getRunOwnership('google-user-1', null)).toBe('guest');
    expect(canEditRun('google-user-1', undefined)).toBe(false);
    expect(getRunReadOnlyReason('google-user-1', undefined)).toContain('ログイン');
  });
});

