import type { RunOwnership } from './ownership';
import type { RunDto } from './types';

export type RunListScope = 'owned' | 'all';

export type RunListItem = RunDto & {
  ownership: RunOwnership;
};

export function getDefaultRunListScope(googleUserId: string | null | undefined): RunListScope {
  return googleUserId ? 'owned' : 'all';
}

export function filterRunsByScope(runs: RunListItem[], scope: RunListScope): RunListItem[] {
  return scope === 'owned'
    ? runs.filter((run) => run.ownership === 'owner')
    : runs;
}
