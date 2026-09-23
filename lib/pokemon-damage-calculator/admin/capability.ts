import { isAdminApiForbidden, fetchAdminRuleSets, fetchAdminUserAuthorizations } from './api';
import type { AdminCapability } from './constants';

export async function probeAdminCapability(isAuthenticated: boolean): Promise<AdminCapability> {
  if (!isAuthenticated) {
    return 'anonymous';
  }

  try {
    await fetchAdminRuleSets();
  } catch (error) {
    if (isAdminApiForbidden(error)) {
      return 'member';
    }
    throw error;
  }

  try {
    await fetchAdminUserAuthorizations();
    return 'administrator';
  } catch (error) {
    if (isAdminApiForbidden(error)) {
      return 'masterEditor';
    }
    throw error;
  }
}

export function canManageRuleSets(capability: AdminCapability): boolean {
  return capability === 'masterEditor' || capability === 'administrator';
}

export function canManageUserAuthorizations(capability: AdminCapability): boolean {
  return capability === 'administrator';
}

