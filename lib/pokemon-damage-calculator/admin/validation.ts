import { ADMIN_PERMISSIONS, ADMIN_ROLES, ADMIN_RULE_SET_STATUSES } from './constants';
import type { AdminPermission } from './constants';
import type { AdminRuleSetFormState, AdminUserAuthorizationFormState } from './types';

function isPositiveInteger(text: string): boolean {
  return /^([1-9]\d*)$/.test(text);
}

function uniqueValues<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function validateAdminRuleSetForm(form: AdminRuleSetFormState): string[] {
  const errors: string[] = [];

  if (!form.slug.trim()) errors.push('RuleSet の slug を入力してください。');
  if (!isPositiveInteger(form.generation.trim())) errors.push('generation は 1 以上の整数で入力してください。');
  if (!form.title.trim()) errors.push('RuleSet の title を入力してください。');
  if (!form.version.trim()) errors.push('version を入力してください。');
  if (!ADMIN_RULE_SET_STATUSES.includes(form.status)) errors.push('status を選択してください。');
  if (!form.summary.trim()) errors.push('summary を入力してください。');

  return errors;
}

export function validateAdminUserAuthorizationForm(form: AdminUserAuthorizationFormState): string[] {
  const errors: string[] = [];

  if (!form.googleUserId.trim()) errors.push('googleUserId を入力してください。');
  if (!ADMIN_ROLES.includes(form.role)) errors.push('role を選択してください。');

  const uniquePermissions = uniqueValues(form.permissions);
  if (uniquePermissions.length !== form.permissions.length) {
    errors.push('permissions に重複があります。');
  }

  const invalidPermissions = form.permissions.filter((permission) => !ADMIN_PERMISSIONS.includes(permission));
  if (invalidPermissions.length > 0) {
    errors.push('permissions に許可されていない値が含まれています。');
  }

  return errors;
}

export function toggleAdminPermission(current: AdminPermission[], permission: AdminPermission): AdminPermission[] {
  return current.includes(permission)
    ? current.filter((value) => value !== permission)
    : [...current, permission];
}

