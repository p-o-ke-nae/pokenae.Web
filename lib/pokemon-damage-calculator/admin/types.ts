import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  ADMIN_RULE_SET_STATUSES,
} from './constants';
import type {
  AdminPermission,
  AdminRole,
  AdminRuleSetStatus,
} from './constants';

export type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
};

export type AdminRuleSetDto = {
  id: string;
  slug: string;
  generation: number;
  title: string;
  version: string;
  status: AdminRuleSetStatus;
  summary: string;
  isReferencedByRuns: boolean;
};

export type AdminUserAuthorizationDto = {
  googleUserId: string;
  role: AdminRole;
  permissions: AdminPermission[];
  isLastAdministrator: boolean;
};

export type AdminRuleSetUpsertRequest = {
  slug: string;
  generation: number;
  title: string;
  version: string;
  status: AdminRuleSetStatus;
  summary: string;
};

export type AdminUserAuthorizationUpsertRequest = {
  googleUserId: string;
  role: AdminRole;
  permissions: AdminPermission[];
};

export type AdminRuleSetFormState = {
  slug: string;
  generation: string;
  title: string;
  version: string;
  status: AdminRuleSetStatus;
  summary: string;
};

export type AdminUserAuthorizationFormState = {
  googleUserId: string;
  role: AdminRole;
  permissions: AdminPermission[];
};

export type AdminCatalog = {
  roles: typeof ADMIN_ROLES;
  permissions: typeof ADMIN_PERMISSIONS;
  ruleSetStatuses: typeof ADMIN_RULE_SET_STATUSES;
};

