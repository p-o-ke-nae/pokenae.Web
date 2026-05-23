import { describe, expect, it } from 'vitest';
import { toggleAdminPermission, validateAdminRuleSetForm, validateAdminUserAuthorizationForm } from './validation';

describe('admin validation', () => {
  it('validates rule set forms', () => {
    expect(validateAdminRuleSetForm({
      slug: '',
      generation: '0',
      title: '',
      version: '',
      status: 'Invalid' as never,
      summary: '',
    })).toEqual([
      'RuleSet の slug を入力してください。',
      'generation は 1 以上の整数で入力してください。',
      'RuleSet の title を入力してください。',
      'version を入力してください。',
      'status を選択してください。',
      'summary を入力してください。',
    ]);
  });

  it('validates user authorization forms', () => {
    expect(validateAdminUserAuthorizationForm({
      googleUserId: '',
      role: 'Invalid' as never,
      permissions: ['masters.view', 'masters.view', 'invalid.permission' as never],
    })).toEqual([
      'googleUserId を入力してください。',
      'role を選択してください。',
      'permissions に重複があります。',
      'permissions に許可されていない値が含まれています。',
    ]);
  });

  it('toggles permissions without duplicates', () => {
    expect(toggleAdminPermission(['masters.view'], 'masters.rulesets.manage')).toEqual(['masters.view', 'masters.rulesets.manage']);
    expect(toggleAdminPermission(['masters.view', 'masters.rulesets.manage'], 'masters.view')).toEqual(['masters.rulesets.manage']);
  });
});

