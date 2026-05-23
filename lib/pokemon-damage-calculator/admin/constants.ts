export const POKEMON_DAMAGE_CALCULATOR_ADMIN_BASE_PATH = '/pokemon-damage-calculator/admin' as const;

export const ADMIN_RULE_SET_STATUSES = ['Active', 'Draft', 'Archived'] as const;
export type AdminRuleSetStatus = (typeof ADMIN_RULE_SET_STATUSES)[number];

export const ADMIN_ROLES = ['Administrator', 'MasterEditor', 'Member'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_PERMISSIONS = [
  'masters.view',
  'masters.rulesets.manage',
  'masters.user-authorizations.manage',
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ADMIN_CAPABILITIES = ['anonymous', 'member', 'masterEditor', 'administrator'] as const;
export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number];

