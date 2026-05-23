import type { AdminRuleSetDto, AdminUserAuthorizationDto } from './types';

export function sortAdminRuleSets(ruleSets: AdminRuleSetDto[]): AdminRuleSetDto[] {
  return [...ruleSets].sort((left, right) => (
    left.generation - right.generation
    || left.slug.localeCompare(right.slug, 'ja')
    || left.title.localeCompare(right.title, 'ja')
  ));
}

export function sortAdminUserAuthorizations(items: AdminUserAuthorizationDto[]): AdminUserAuthorizationDto[] {
  return [...items].sort((left, right) => left.googleUserId.localeCompare(right.googleUserId, 'ja'));
}

export function formatAdminRuleSetLabel(ruleSet: AdminRuleSetDto): string {
  return `${ruleSet.title} / ${ruleSet.slug} (${ruleSet.version})`;
}

