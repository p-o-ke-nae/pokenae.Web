import { describe, expect, it } from 'vitest';
import {
  getAdminRuleSetPath,
  getAdminUserAuthorizationPath,
} from './routes';

describe('admin routes', () => {
  it('encodes route params', () => {
    expect(getAdminRuleSetPath('rule/1')).toBe('/pokemon-damage-calculator/admin/rule-sets/rule%2F1');
    expect(getAdminUserAuthorizationPath('user@example.com')).toBe('/pokemon-damage-calculator/admin/user-authorizations/user%40example.com');
  });
});

