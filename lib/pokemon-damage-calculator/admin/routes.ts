import { POKEMON_DAMAGE_CALCULATOR_ADMIN_BASE_PATH } from './constants';

export function getAdminHomePath(): string {
  return POKEMON_DAMAGE_CALCULATOR_ADMIN_BASE_PATH;
}

export function getAdminRuleSetsPath(): string {
  return `${POKEMON_DAMAGE_CALCULATOR_ADMIN_BASE_PATH}/rule-sets`;
}

export function getAdminRuleSetNewPath(): string {
  return `${getAdminRuleSetsPath()}/new`;
}

export function getAdminRuleSetPath(id: string): string {
  return `${getAdminRuleSetsPath()}/${encodeURIComponent(id)}`;
}

export function getAdminUserAuthorizationsPath(): string {
  return `${POKEMON_DAMAGE_CALCULATOR_ADMIN_BASE_PATH}/user-authorizations`;
}

export function getAdminUserAuthorizationNewPath(): string {
  return `${getAdminUserAuthorizationsPath()}/new`;
}

export function getAdminUserAuthorizationPath(googleUserId: string): string {
  return `${getAdminUserAuthorizationsPath()}/${encodeURIComponent(googleUserId)}`;
}

